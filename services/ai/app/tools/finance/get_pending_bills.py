"""get_pending_bills — READ tool that retrieves pending/overdue bills for a given month."""

from __future__ import annotations

import json
import logging
import uuid

from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool

from app.db.models.finance import Bill
from app.db.repositories.finance import FinanceRepository
from app.db.session import get_user_session
from app.tools.finance._helpers import (
    ensure_recurring_for_month,
    get_days_until_due_day,
    resolve_month_year,
)

logger = logging.getLogger(__name__)


@tool(parse_docstring=True)
async def get_pending_bills(
    month: int | None = None,
    year: int | None = None,
    *,
    config: RunnableConfig,
) -> str:
    """Consulta as contas pendentes e vencidas do usuário em um mês.

    Args:
        month: Mês (1-12). Usa o mês atual se omitido.
        year: Ano (ex: 2026). Usa o ano atual se omitido.
    """
    session_factory = config["configurable"]["session_factory"]
    user_id: str = config["configurable"]["user_id"]
    user_tz: str = config["configurable"].get("user_timezone", "America/Sao_Paulo")

    month_year = resolve_month_year(month, year, user_tz)
    uid = uuid.UUID(user_id)

    async with get_user_session(session_factory, user_id) as session:
        await ensure_recurring_for_month(session, uid, month_year, Bill)
        bills = await FinanceRepository.get_bills(session, uid, month_year, status="pending")

    total_pending = 0.0
    total_overdue = 0.0
    pending_count = 0
    overdue_count = 0
    items = []

    for bill in bills:
        amount = bill.amount or 0.0
        days_until = get_days_until_due_day(bill.due_day, user_tz)

        if days_until < 0:
            # Overdue
            total_overdue += amount
            overdue_count += 1
            effective_status = "overdue"
        else:
            total_pending += amount
            pending_count += 1
            effective_status = "pending"

        items.append(
            {
                "id": str(bill.id),
                "name": bill.name,
                "category": bill.category.value
                if hasattr(bill.category, "value")
                else bill.category,
                "amount": amount,
                "dueDay": bill.due_day,
                "status": effective_status,
                "currency": bill.currency,
                "isRecurring": bill.is_recurring,
                "daysUntilDue": days_until,
            }
        )

    logger.info("get_pending_bills returned %d pending bills for %s", len(items), month_year)

    return json.dumps(
        {
            "monthYear": month_year,
            "bills": items,
            "summary": {
                "totalPending": total_pending,
                "totalOverdue": total_overdue,
                "countPending": pending_count,
                "countOverdue": overdue_count,
            },
        }
    )
