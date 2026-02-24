"""Unit tests for finance tool helpers — TZ utils + ensure_recurring."""

from __future__ import annotations

import uuid
from datetime import date
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.db.models.enums import BillCategory, BillStatus
from app.db.models.finance import Bill
from app.tools.finance._helpers import (
    ensure_recurring_for_month,
    get_current_month_tz,
    get_days_until_due_day,
    get_previous_month,
    get_today_tz,
    months_diff,
    resolve_month_year,
)

# ---------------------------------------------------------------------------
# Timezone helpers
# ---------------------------------------------------------------------------


class TestGetCurrentMonthTz:
    def test_returns_yyyy_mm_format(self) -> None:
        result = get_current_month_tz("America/Sao_Paulo")
        assert len(result) == 7
        assert result[4] == "-"

    def test_fallback_on_invalid_tz(self) -> None:
        result = get_current_month_tz("Invalid/Zone")
        assert len(result) == 7  # still returns valid format


class TestGetTodayTz:
    def test_returns_date(self) -> None:
        result = get_today_tz("America/Sao_Paulo")
        assert isinstance(result, date)

    def test_fallback_on_invalid_tz(self) -> None:
        result = get_today_tz("Invalid/Zone")
        assert isinstance(result, date)


class TestGetDaysUntilDueDay:
    @patch("app.tools.finance._helpers.get_today_tz")
    def test_due_day_in_future(self, mock_today: MagicMock) -> None:
        mock_today.return_value = date(2026, 2, 10)
        result = get_days_until_due_day(20, "America/Sao_Paulo")
        assert result == 10

    @patch("app.tools.finance._helpers.get_today_tz")
    def test_due_day_in_past(self, mock_today: MagicMock) -> None:
        mock_today.return_value = date(2026, 2, 25)
        result = get_days_until_due_day(10, "America/Sao_Paulo")
        assert result == -15

    @patch("app.tools.finance._helpers.get_today_tz")
    def test_due_day_today(self, mock_today: MagicMock) -> None:
        mock_today.return_value = date(2026, 2, 15)
        result = get_days_until_due_day(15, "America/Sao_Paulo")
        assert result == 0

    @patch("app.tools.finance._helpers.get_today_tz")
    def test_clamps_to_month_end(self, mock_today: MagicMock) -> None:
        mock_today.return_value = date(2026, 2, 20)
        # Feb has 28 days, due_day=31 should clamp to 28
        result = get_days_until_due_day(31, "America/Sao_Paulo")
        assert result == 8  # 28 - 20


class TestResolveMonthYear:
    def test_both_provided(self) -> None:
        result = resolve_month_year(3, 2026, "America/Sao_Paulo")
        assert result == "2026-03"

    def test_only_month(self) -> None:
        result = resolve_month_year(5, None, "America/Sao_Paulo")
        current = get_current_month_tz("America/Sao_Paulo")
        assert result == f"{current[:4]}-05"

    def test_only_year(self) -> None:
        result = resolve_month_year(None, 2025, "America/Sao_Paulo")
        current = get_current_month_tz("America/Sao_Paulo")
        assert result == f"2025-{current[5:]}"

    def test_neither(self) -> None:
        result = resolve_month_year(None, None, "America/Sao_Paulo")
        assert result == get_current_month_tz("America/Sao_Paulo")


class TestGetPreviousMonth:
    def test_mid_year(self) -> None:
        assert get_previous_month("2026-06") == "2026-05"

    def test_january(self) -> None:
        assert get_previous_month("2026-01") == "2025-12"

    def test_march(self) -> None:
        assert get_previous_month("2026-03") == "2026-02"


class TestMonthsDiff:
    def test_same_month(self) -> None:
        assert months_diff("2026-02", "2026-02") == 0

    def test_one_month(self) -> None:
        assert months_diff("2026-01", "2026-02") == 1

    def test_cross_year(self) -> None:
        assert months_diff("2025-11", "2026-02") == 3

    def test_full_year(self) -> None:
        assert months_diff("2025-02", "2026-02") == 12

    def test_negative(self) -> None:
        assert months_diff("2026-05", "2026-02") == -3


# ---------------------------------------------------------------------------
# ensure_recurring_for_month
# ---------------------------------------------------------------------------


def _make_bill(
    bill_id: str,
    group_id: str,
    month_year: str,
    *,
    is_recurring: bool = True,
    status: str = "paid",
) -> MagicMock:
    bill = MagicMock(spec=Bill)
    bill.id = uuid.UUID(bill_id)
    bill.user_id = uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
    bill.name = "Test Bill"
    bill.category = BillCategory.UTILITIES
    bill.amount = 100.0
    bill.due_day = 10
    bill.currency = "BRL"
    bill.recurring_group_id = uuid.UUID(group_id) if group_id else None
    bill.is_recurring = is_recurring
    bill.status = BillStatus(status)
    bill.paid_at = None
    bill.month_year = month_year
    return bill


class TestEnsureRecurringForMonth:
    @pytest.mark.asyncio
    async def test_creates_items_from_previous_month(self) -> None:
        session = AsyncMock()
        user_id = uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
        group_id = "11111111-1111-1111-1111-111111111111"

        prev_bill = _make_bill("22222222-2222-2222-2222-222222222222", group_id, "2026-01")

        # Mock: prev month has 1 recurring bill
        prev_result = MagicMock()
        prev_result.scalars.return_value.all.return_value = [prev_bill]
        # Mock: target month has no existing items
        existing_result = MagicMock()
        existing_result.scalars.return_value.all.return_value = []

        session.execute = AsyncMock(side_effect=[prev_result, existing_result])
        session.add_all = MagicMock()
        session.flush = AsyncMock()

        count = await ensure_recurring_for_month(session, user_id, "2026-02", Bill)

        assert count == 1
        session.add_all.assert_called_once()
        added_items = session.add_all.call_args[0][0]
        assert len(added_items) == 1
        assert added_items[0].month_year == "2026-02"

    @pytest.mark.asyncio
    async def test_idempotent_skips_existing(self) -> None:
        session = AsyncMock()
        user_id = uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
        group_id = "11111111-1111-1111-1111-111111111111"

        prev_bill = _make_bill("22222222-2222-2222-2222-222222222222", group_id, "2026-01")

        prev_result = MagicMock()
        prev_result.scalars.return_value.all.return_value = [prev_bill]
        # Target month already has this group_id
        existing_result = MagicMock()
        existing_result.scalars.return_value.all.return_value = [uuid.UUID(group_id)]

        session.execute = AsyncMock(side_effect=[prev_result, existing_result])

        count = await ensure_recurring_for_month(session, user_id, "2026-02", Bill)

        assert count == 0
        session.add_all.assert_not_called()

    @pytest.mark.asyncio
    async def test_no_previous_month_items(self) -> None:
        session = AsyncMock()
        user_id = uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")

        prev_result = MagicMock()
        prev_result.scalars.return_value.all.return_value = []

        session.execute = AsyncMock(return_value=prev_result)

        count = await ensure_recurring_for_month(session, user_id, "2026-02", Bill)

        assert count == 0

    @pytest.mark.asyncio
    async def test_propagates_canceled_items(self) -> None:
        """Canceled recurring items should still propagate to future months."""
        session = AsyncMock()
        user_id = uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
        group_id = "11111111-1111-1111-1111-111111111111"

        # Canceled bill from prev month should still be picked up
        canceled_bill = _make_bill(
            "22222222-2222-2222-2222-222222222222", group_id, "2026-01", status="canceled"
        )

        prev_result = MagicMock()
        prev_result.scalars.return_value.all.return_value = [canceled_bill]
        existing_result = MagicMock()
        existing_result.scalars.return_value.all.return_value = []

        session.execute = AsyncMock(side_effect=[prev_result, existing_result])
        session.add_all = MagicMock()
        session.flush = AsyncMock()

        count = await ensure_recurring_for_month(session, user_id, "2026-02", Bill)

        # Canceled items still propagate
        assert count == 1
        added = session.add_all.call_args[0][0][0]
        # Reset field: new item should have status="pending" (not "canceled")
        assert added.status == "pending"
