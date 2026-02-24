"""Shared helpers for finance tools — timezone utilities and recurring-item generation."""

from __future__ import annotations

import calendar
import logging
import uuid as _uuid
from datetime import date, datetime
from typing import TYPE_CHECKING, Any
from zoneinfo import ZoneInfo

from sqlalchemy import select

from app.db.models.finance import Bill, Income, VariableExpense

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Timezone helpers (mirror packages/shared/src/utils/timezone.ts)
# ---------------------------------------------------------------------------

type FinanceModel = type[Bill] | type[Income] | type[VariableExpense]


def _safe_tz(timezone: str) -> ZoneInfo:
    """Return a ZoneInfo, falling back to America/Sao_Paulo on error."""
    try:
        return ZoneInfo(timezone)
    except (KeyError, ValueError):
        return ZoneInfo("America/Sao_Paulo")


def get_current_month_tz(timezone: str) -> str:
    """Return the current month as 'YYYY-MM' in the given timezone."""
    return datetime.now(_safe_tz(timezone)).strftime("%Y-%m")


def get_today_tz(timezone: str) -> date:
    """Return today's date in the given timezone."""
    return datetime.now(_safe_tz(timezone)).date()


def get_days_until_due_day(due_day: int, timezone: str) -> int:
    """Compute days from today until the due_day in the current month.

    Positive = future, negative = overdue.  Clamps due_day to max days in month.
    """
    today = get_today_tz(timezone)
    max_day = calendar.monthrange(today.year, today.month)[1]
    clamped = min(due_day, max_day)
    due_date = today.replace(day=clamped)
    return (due_date - today).days


def resolve_month_year(
    month: int | None,
    year: int | None,
    timezone: str,
) -> str:
    """Resolve optional month/year to 'YYYY-MM', defaulting to current month in TZ."""
    if month is not None and year is not None:
        return f"{year:04d}-{month:02d}"
    current = get_current_month_tz(timezone)
    if month is not None:
        # Use current year
        return f"{current[:4]}-{month:02d}"
    if year is not None:
        # Use year + current month
        return f"{year:04d}-{current[5:]}"
    return current


def get_previous_month(month_year: str) -> str:
    """Return 'YYYY-MM' for the month before the given month_year."""
    year, month = int(month_year[:4]), int(month_year[5:])
    if month == 1:
        return f"{year - 1:04d}-12"
    return f"{year:04d}-{month - 1:02d}"


def months_diff(start_my: str, end_my: str) -> int:
    """Return the number of months between two 'YYYY-MM' strings (inclusive of both)."""
    sy, sm = int(start_my[:4]), int(start_my[5:])
    ey, em = int(end_my[:4]), int(end_my[5:])
    return (ey - sy) * 12 + (em - sm)


# ---------------------------------------------------------------------------
# Copy/reset field definitions per entity
# ---------------------------------------------------------------------------

_BILL_COPY_FIELDS = ["name", "category", "amount", "due_day", "currency", "recurring_group_id"]
_BILL_RESET_FIELDS: dict[str, Any] = {"status": "pending", "paid_at": None, "is_recurring": True}

_EXPENSE_COPY_FIELDS = [
    "name",
    "category",
    "expected_amount",
    "currency",
    "recurring_group_id",
]
_EXPENSE_RESET_FIELDS: dict[str, Any] = {"actual_amount": 0, "is_recurring": True}

_INCOME_COPY_FIELDS = [
    "name",
    "type",
    "frequency",
    "expected_amount",
    "currency",
    "recurring_group_id",
]
_INCOME_RESET_FIELDS: dict[str, Any] = {"actual_amount": None, "is_recurring": True}

_ENTITY_CONFIG: dict[FinanceModel, tuple[list[str], dict[str, Any]]] = {
    Bill: (_BILL_COPY_FIELDS, _BILL_RESET_FIELDS),
    VariableExpense: (_EXPENSE_COPY_FIELDS, _EXPENSE_RESET_FIELDS),
    Income: (_INCOME_COPY_FIELDS, _INCOME_RESET_FIELDS),
}


# ---------------------------------------------------------------------------
# ensure_recurring_for_month — lazy recurring-item generation
# ---------------------------------------------------------------------------


async def ensure_recurring_for_month(
    session: AsyncSession,
    user_id: _uuid.UUID,
    month_year: str,
    model_class: FinanceModel,
) -> int:
    """Lazy-generate recurring items for *month_year* from the previous month.

    Algorithm:
    1. Load recurring items from the previous month
       (is_recurring=True AND recurring_group_id NOT NULL)
       — do NOT filter by status (canceled items still propagate)
    2. Load existing recurring_group_ids in the target month
    3. For each missing group_id, copy fields + reset fields into a new row
    4. Bulk insert via session.add_all() — UNIQUE constraint handles races

    Returns the count of items created.
    """
    copy_fields, reset_fields = _ENTITY_CONFIG[model_class]

    prev_month = get_previous_month(month_year)

    # 1. Recurring items from previous month
    # Use Any to satisfy mypy — all 3 models share user_id, month_year, is_recurring,
    # recurring_group_id but have no common Protocol
    m: Any = model_class
    prev_stmt = select(m).where(
        m.user_id == user_id,
        m.month_year == prev_month,
        m.is_recurring.is_(True),
        m.recurring_group_id.is_not(None),
    )
    prev_items = list((await session.execute(prev_stmt)).scalars().all())

    if not prev_items:
        return 0

    # 2. Existing group IDs in target month
    existing_stmt = select(m.recurring_group_id).where(
        m.user_id == user_id,
        m.month_year == month_year,
        m.recurring_group_id.is_not(None),
    )
    existing_ids = set((await session.execute(existing_stmt)).scalars().all())

    # 3. Build new items for missing group_ids
    new_items: list[Any] = []
    for item in prev_items:
        gid = item.recurring_group_id
        if gid in existing_ids:
            continue

        data: dict[str, Any] = {
            "id": _uuid.uuid4(),
            "user_id": user_id,
            "month_year": month_year,
        }
        for field in copy_fields:
            val = getattr(item, field)
            # Enum → store its .value string
            data[field] = val.value if hasattr(val, "value") and isinstance(val.value, str) else val
        data.update(reset_fields)

        new_items.append(model_class(**data))
        existing_ids.add(gid)  # prevent duplicates within same batch

    if not new_items:
        return 0

    # 4. Bulk insert
    session.add_all(new_items)
    await session.flush()

    logger.info(
        "ensure_recurring created %d %s items for %s",
        len(new_items),
        model_class.__tablename__,
        month_year,
    )
    return len(new_items)
