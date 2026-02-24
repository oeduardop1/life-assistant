"""Unit tests for finance tools (mocked repositories — no DB required)."""

from __future__ import annotations

import json
import uuid
from datetime import date, datetime
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.db.models.enums import (
    BillCategory,
    BillStatus,
    DebtStatus,
    ExpenseCategory,
    ExpenseStatus,
    IncomeFrequency,
    IncomeStatus,
    IncomeType,
    InvestmentType,
)
from app.db.models.finance import (
    Bill,
    Debt,
    DebtPayment,
    Income,
    Investment,
    VariableExpense,
)
from app.tools.finance.create_expense import create_expense
from app.tools.finance.get_bills import get_bills
from app.tools.finance.get_debt_payment_history import get_debt_payment_history
from app.tools.finance.get_debt_progress import get_debt_progress
from app.tools.finance.get_expenses import get_expenses
from app.tools.finance.get_finance_summary import get_finance_summary
from app.tools.finance.get_incomes import get_incomes
from app.tools.finance.get_investments import get_investments
from app.tools.finance.get_pending_bills import get_pending_bills
from app.tools.finance.get_upcoming_installments import get_upcoming_installments
from app.tools.finance.mark_bill_paid import mark_bill_paid

# ---------------------------------------------------------------------------
# Test helpers
# ---------------------------------------------------------------------------

TEST_USER_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"


def _make_config(user_id: str = TEST_USER_ID) -> dict[str, Any]:
    mock_session = AsyncMock()
    mock_session_cm = AsyncMock()
    mock_session_cm.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session_cm.__aexit__ = AsyncMock(return_value=None)
    mock_factory = MagicMock(return_value=mock_session_cm)

    return {
        "configurable": {
            "session_factory": mock_factory,
            "user_id": user_id,
            "user_timezone": "America/Sao_Paulo",
        }
    }


def _make_investment(
    inv_id: str = "11111111-1111-1111-1111-111111111111",
    name: str = "Fundo de Emergência",
    current: float = 5000.0,
    goal: float | None = 10000.0,
    monthly: float | None = 500.0,
) -> MagicMock:
    inv = MagicMock(spec=Investment)
    inv.id = uuid.UUID(inv_id)
    inv.user_id = uuid.UUID(TEST_USER_ID)
    inv.name = name
    inv.type = InvestmentType.EMERGENCY_FUND
    inv.current_amount = current
    inv.goal_amount = goal
    inv.monthly_contribution = monthly
    inv.currency = "BRL"
    inv.deadline = None
    return inv


def _make_income(
    inc_id: str = "22222222-2222-2222-2222-222222222222",
    name: str = "Salário",
    expected: float = 5000.0,
    actual: float | None = 5000.0,
) -> MagicMock:
    inc = MagicMock(spec=Income)
    inc.id = uuid.UUID(inc_id)
    inc.user_id = uuid.UUID(TEST_USER_ID)
    inc.name = name
    inc.type = IncomeType.SALARY
    inc.frequency = IncomeFrequency.MONTHLY
    inc.expected_amount = expected
    inc.actual_amount = actual
    inc.currency = "BRL"
    inc.is_recurring = True
    inc.status = IncomeStatus.ACTIVE
    inc.month_year = "2026-02"
    return inc


def _make_expense(
    exp_id: str = "33333333-3333-3333-3333-333333333333",
    name: str = "Alimentação",
    expected: float = 800.0,
    actual: float = 600.0,
    is_recurring: bool = True,
) -> MagicMock:
    exp = MagicMock(spec=VariableExpense)
    exp.id = uuid.UUID(exp_id)
    exp.user_id = uuid.UUID(TEST_USER_ID)
    exp.name = name
    exp.category = ExpenseCategory.FOOD
    exp.expected_amount = expected
    exp.actual_amount = actual
    exp.currency = "BRL"
    exp.is_recurring = is_recurring
    exp.status = ExpenseStatus.ACTIVE
    exp.month_year = "2026-02"
    return exp


def _make_bill(
    bill_id: str = "44444444-4444-4444-4444-444444444444",
    name: str = "Aluguel",
    amount: float = 1500.0,
    due_day: int = 10,
    status: str = "pending",
) -> MagicMock:
    bill = MagicMock(spec=Bill)
    bill.id = uuid.UUID(bill_id)
    bill.user_id = uuid.UUID(TEST_USER_ID)
    bill.name = name
    bill.category = BillCategory.HOUSING
    bill.amount = amount
    bill.due_day = due_day
    bill.status = BillStatus(status)
    bill.paid_at = datetime(2026, 2, 10) if status == "paid" else None
    bill.currency = "BRL"
    bill.is_recurring = True
    bill.month_year = "2026-02"
    return bill


def _make_debt(
    debt_id: str = "55555555-5555-5555-5555-555555555555",
    name: str = "Empréstimo Pessoal",
    total: float = 10000.0,
    installments: int = 12,
    installment_amt: float = 900.0,
    current_inst: int = 4,
    status: str = "active",
    is_negotiated: bool = True,
    start_my: str = "2025-11",
    due_day: int = 15,
) -> MagicMock:
    debt = MagicMock(spec=Debt)
    debt.id = uuid.UUID(debt_id)
    debt.user_id = uuid.UUID(TEST_USER_ID)
    debt.name = name
    debt.creditor = "Banco XYZ"
    debt.total_amount = total
    debt.is_negotiated = is_negotiated
    debt.total_installments = installments
    debt.installment_amount = installment_amt
    debt.current_installment = current_inst
    debt.due_day = due_day
    debt.start_month_year = start_my
    debt.status = DebtStatus(status)
    debt.notes = None
    debt.currency = "BRL"
    return debt


def _make_payment(
    debt_id: str = "55555555-5555-5555-5555-555555555555",
    inst_num: int = 1,
    amount: float = 900.0,
    month_year: str = "2025-11",
    paid_at_str: str = "2025-11-15",
) -> MagicMock:
    p = MagicMock(spec=DebtPayment)
    p.id = uuid.uuid4()
    p.user_id = uuid.UUID(TEST_USER_ID)
    p.debt_id = uuid.UUID(debt_id)
    p.installment_number = inst_num
    p.amount = amount
    p.month_year = month_year
    p.paid_at = datetime.fromisoformat(paid_at_str)
    return p


# ---------------------------------------------------------------------------
# get_investments
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
@patch("app.tools.finance.get_investments.get_user_session")
@patch("app.tools.finance.get_investments.FinanceRepository")
async def test_get_investments_with_goal(mock_repo: MagicMock, mock_session: MagicMock) -> None:
    inv = _make_investment(current=5000.0, goal=10000.0, monthly=500.0)
    mock_repo.get_investments = AsyncMock(return_value=[inv])
    mock_session.return_value = AsyncMock()
    mock_session.return_value.__aenter__ = AsyncMock()
    mock_session.return_value.__aexit__ = AsyncMock(return_value=None)

    result = await get_investments.ainvoke({}, _make_config())
    parsed = json.loads(result)

    assert parsed["summary"]["count"] == 1
    assert parsed["summary"]["totalCurrentAmount"] == 5000.0
    assert parsed["summary"]["totalGoalAmount"] == 10000.0
    assert parsed["investments"][0]["progress"] == 50.0
    assert parsed["investments"][0]["monthsToGoal"] == 10  # ceil(5000/500)


@pytest.mark.asyncio
@patch("app.tools.finance.get_investments.get_user_session")
@patch("app.tools.finance.get_investments.FinanceRepository")
async def test_get_investments_no_goal(mock_repo: MagicMock, mock_session: MagicMock) -> None:
    inv = _make_investment(current=3000.0, goal=None, monthly=None)
    mock_repo.get_investments = AsyncMock(return_value=[inv])
    mock_session.return_value = AsyncMock()
    mock_session.return_value.__aenter__ = AsyncMock()
    mock_session.return_value.__aexit__ = AsyncMock(return_value=None)

    result = await get_investments.ainvoke({}, _make_config())
    parsed = json.loads(result)

    assert parsed["investments"][0]["progress"] is None
    assert parsed["investments"][0]["monthsToGoal"] is None
    assert parsed["summary"]["averageProgress"] is None


# ---------------------------------------------------------------------------
# get_incomes
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
@patch("app.tools.finance.get_incomes.ensure_recurring_for_month")
@patch("app.tools.finance.get_incomes.get_user_session")
@patch("app.tools.finance.get_incomes.FinanceRepository")
async def test_get_incomes_with_actual(
    mock_repo: MagicMock,
    mock_session: MagicMock,
    mock_ensure: AsyncMock,
) -> None:
    inc = _make_income(expected=5000.0, actual=5200.0)
    mock_repo.get_incomes = AsyncMock(return_value=[inc])
    mock_session.return_value = AsyncMock()
    mock_session.return_value.__aenter__ = AsyncMock()
    mock_session.return_value.__aexit__ = AsyncMock(return_value=None)
    mock_ensure.return_value = 0

    result = await get_incomes.ainvoke({"month": 2, "year": 2026}, _make_config())
    parsed = json.loads(result)

    assert parsed["monthYear"] == "2026-02"
    assert parsed["summary"]["totalExpected"] == 5000.0
    assert parsed["summary"]["totalActual"] == 5200.0
    assert parsed["summary"]["receivedCount"] == 1
    assert parsed["summary"]["pendingCount"] == 0
    assert parsed["incomes"][0]["variance"] == 200.0


@pytest.mark.asyncio
@patch("app.tools.finance.get_incomes.ensure_recurring_for_month")
@patch("app.tools.finance.get_incomes.get_user_session")
@patch("app.tools.finance.get_incomes.FinanceRepository")
async def test_get_incomes_pending(
    mock_repo: MagicMock,
    mock_session: MagicMock,
    mock_ensure: AsyncMock,
) -> None:
    inc = _make_income(expected=3000.0, actual=None)
    mock_repo.get_incomes = AsyncMock(return_value=[inc])
    mock_session.return_value = AsyncMock()
    mock_session.return_value.__aenter__ = AsyncMock()
    mock_session.return_value.__aexit__ = AsyncMock(return_value=None)
    mock_ensure.return_value = 0

    result = await get_incomes.ainvoke({}, _make_config())
    parsed = json.loads(result)

    assert parsed["summary"]["pendingCount"] == 1
    assert parsed["summary"]["receivedCount"] == 0
    assert parsed["incomes"][0]["variance"] is None


# ---------------------------------------------------------------------------
# get_expenses
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
@patch("app.tools.finance.get_expenses.ensure_recurring_for_month")
@patch("app.tools.finance.get_expenses.get_user_session")
@patch("app.tools.finance.get_expenses.FinanceRepository")
async def test_get_expenses_variance_and_percent(
    mock_repo: MagicMock,
    mock_session: MagicMock,
    mock_ensure: AsyncMock,
) -> None:
    exp = _make_expense(expected=800.0, actual=600.0)
    mock_repo.get_expenses = AsyncMock(return_value=[exp])
    mock_session.return_value = AsyncMock()
    mock_session.return_value.__aenter__ = AsyncMock()
    mock_session.return_value.__aexit__ = AsyncMock(return_value=None)
    mock_ensure.return_value = 0

    result = await get_expenses.ainvoke({"month": 2, "year": 2026}, _make_config())
    parsed = json.loads(result)

    assert parsed["expenses"][0]["variance"] == -200.0
    assert parsed["expenses"][0]["percentUsed"] == 75.0
    assert parsed["summary"]["overBudgetCount"] == 0


@pytest.mark.asyncio
@patch("app.tools.finance.get_expenses.ensure_recurring_for_month")
@patch("app.tools.finance.get_expenses.get_user_session")
@patch("app.tools.finance.get_expenses.FinanceRepository")
async def test_get_expenses_div_by_zero(
    mock_repo: MagicMock,
    mock_session: MagicMock,
    mock_ensure: AsyncMock,
) -> None:
    exp = _make_expense(expected=0.0, actual=100.0)
    mock_repo.get_expenses = AsyncMock(return_value=[exp])
    mock_session.return_value = AsyncMock()
    mock_session.return_value.__aenter__ = AsyncMock()
    mock_session.return_value.__aexit__ = AsyncMock(return_value=None)
    mock_ensure.return_value = 0

    result = await get_expenses.ainvoke({}, _make_config())
    parsed = json.loads(result)

    assert parsed["expenses"][0]["percentUsed"] == 0.0  # guarded


# ---------------------------------------------------------------------------
# get_bills
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
@patch("app.tools.finance.get_bills.get_days_until_due_day")
@patch("app.tools.finance.get_bills.ensure_recurring_for_month")
@patch("app.tools.finance.get_bills.get_user_session")
@patch("app.tools.finance.get_bills.FinanceRepository")
async def test_get_bills_with_overdue_reclassification(
    mock_repo: MagicMock,
    mock_session: MagicMock,
    mock_ensure: AsyncMock,
    mock_days: MagicMock,
) -> None:
    pending_bill = _make_bill(status="pending", due_day=5)
    paid_bill = _make_bill(
        bill_id="66666666-6666-6666-6666-666666666666",
        name="Internet",
        amount=100.0,
        status="paid",
        due_day=15,
    )
    mock_repo.get_bills = AsyncMock(return_value=[pending_bill, paid_bill])
    mock_session.return_value = AsyncMock()
    mock_session.return_value.__aenter__ = AsyncMock()
    mock_session.return_value.__aexit__ = AsyncMock(return_value=None)
    mock_ensure.return_value = 0

    # Due day 5 is overdue, due day 15 is paid
    mock_days.side_effect = [-20, 5]

    result = await get_bills.ainvoke({"month": 2, "year": 2026}, _make_config())
    parsed = json.loads(result)

    assert parsed["summary"]["overdueCount"] == 1
    assert parsed["summary"]["paidCount"] == 1
    assert parsed["bills"][0]["status"] == "overdue"


# ---------------------------------------------------------------------------
# get_pending_bills
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
@patch("app.tools.finance.get_pending_bills.get_days_until_due_day")
@patch("app.tools.finance.get_pending_bills.ensure_recurring_for_month")
@patch("app.tools.finance.get_pending_bills.get_user_session")
@patch("app.tools.finance.get_pending_bills.FinanceRepository")
async def test_get_pending_bills_classifies_overdue(
    mock_repo: MagicMock,
    mock_session: MagicMock,
    mock_ensure: AsyncMock,
    mock_days: MagicMock,
) -> None:
    bill1 = _make_bill(name="Aluguel", due_day=5, amount=1500.0)
    bill2 = _make_bill(
        bill_id="77777777-7777-7777-7777-777777777777",
        name="Luz",
        due_day=25,
        amount=200.0,
    )
    mock_repo.get_bills = AsyncMock(return_value=[bill1, bill2])
    mock_session.return_value = AsyncMock()
    mock_session.return_value.__aenter__ = AsyncMock()
    mock_session.return_value.__aexit__ = AsyncMock(return_value=None)
    mock_ensure.return_value = 0

    mock_days.side_effect = [-10, 15]

    result = await get_pending_bills.ainvoke({}, _make_config())
    parsed = json.loads(result)

    assert parsed["summary"]["countOverdue"] == 1
    assert parsed["summary"]["countPending"] == 1
    assert parsed["summary"]["totalOverdue"] == 1500.0
    assert parsed["summary"]["totalPending"] == 200.0


# ---------------------------------------------------------------------------
# get_debt_payment_history
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
@patch("app.tools.finance.get_debt_payment_history.get_user_session")
@patch("app.tools.finance.get_debt_payment_history.FinanceRepository")
async def test_get_debt_payment_history_success(
    mock_repo: MagicMock, mock_session: MagicMock
) -> None:
    debt = _make_debt()
    p1 = _make_payment(inst_num=1, month_year="2025-11", paid_at_str="2025-11-15")
    p2 = _make_payment(inst_num=2, month_year="2025-12", paid_at_str="2025-11-28")  # paid early

    mock_repo.get_debt_by_id = AsyncMock(return_value=debt)
    mock_repo.get_debt_payments = AsyncMock(return_value=[p1, p2])
    mock_session.return_value = AsyncMock()
    mock_session.return_value.__aenter__ = AsyncMock()
    mock_session.return_value.__aexit__ = AsyncMock(return_value=None)

    result = await get_debt_payment_history.ainvoke(
        {"debt_id": "55555555-5555-5555-5555-555555555555"}, _make_config()
    )
    parsed = json.loads(result)

    assert parsed["debt"]["name"] == "Empréstimo Pessoal"
    assert parsed["debt"]["paidInstallments"] == 3  # current_installment=4 → 4-1=3
    assert len(parsed["payments"]) == 2
    assert parsed["payments"][0]["paidEarly"] is False
    assert parsed["payments"][1]["paidEarly"] is True
    assert parsed["summary"]["paidEarlyCount"] == 1


@pytest.mark.asyncio
@patch("app.tools.finance.get_debt_payment_history.get_user_session")
@patch("app.tools.finance.get_debt_payment_history.FinanceRepository")
async def test_get_debt_payment_history_not_found(
    mock_repo: MagicMock, mock_session: MagicMock
) -> None:
    mock_repo.get_debt_by_id = AsyncMock(return_value=None)
    mock_session.return_value = AsyncMock()
    mock_session.return_value.__aenter__ = AsyncMock()
    mock_session.return_value.__aexit__ = AsyncMock(return_value=None)

    result = await get_debt_payment_history.ainvoke(
        {"debt_id": "55555555-5555-5555-5555-555555555555"}, _make_config()
    )
    parsed = json.loads(result)
    assert "error" in parsed


@pytest.mark.asyncio
async def test_get_debt_payment_history_invalid_uuid() -> None:
    result = await get_debt_payment_history.ainvoke({"debt_id": "not-a-uuid"}, _make_config())
    parsed = json.loads(result)
    assert "error" in parsed
    assert "inválido" in parsed["error"]


# ---------------------------------------------------------------------------
# get_debt_progress
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
@patch("app.tools.finance.get_debt_progress.get_days_until_due_day")
@patch("app.tools.finance.get_debt_progress.get_today_tz")
@patch("app.tools.finance.get_debt_progress.get_current_month_tz")
@patch("app.tools.finance.get_debt_progress.get_user_session")
@patch("app.tools.finance.get_debt_progress.FinanceRepository")
async def test_get_debt_progress_with_projection(
    mock_repo: MagicMock,
    mock_session: MagicMock,
    mock_current_month: MagicMock,
    mock_today: MagicMock,
    mock_days: MagicMock,
) -> None:
    debt = _make_debt(total=10000.0, installments=12, installment_amt=900.0, current_inst=4)
    payments = [
        _make_payment(inst_num=1, month_year="2025-11", paid_at_str="2025-11-15"),
        _make_payment(inst_num=2, month_year="2025-12", paid_at_str="2025-12-15"),
        _make_payment(inst_num=3, month_year="2026-01", paid_at_str="2026-01-15"),
    ]

    mock_repo.get_debts = AsyncMock(return_value=[debt])
    mock_repo.get_debt_payments_for_debts = AsyncMock(return_value=payments)
    mock_session.return_value = AsyncMock()
    mock_session.return_value.__aenter__ = AsyncMock()
    mock_session.return_value.__aexit__ = AsyncMock(return_value=None)
    mock_current_month.return_value = "2026-02"
    mock_today.return_value = date(2026, 2, 23)
    mock_days.return_value = -8

    result = await get_debt_progress.ainvoke({}, _make_config())
    parsed = json.loads(result)

    assert len(parsed["debts"]) == 1
    d = parsed["debts"][0]
    assert d["paidInstallments"] == 3
    assert d["percentComplete"] > 0
    assert d["projection"] is not None
    assert "quita em" in d["projection"]["message"]


@pytest.mark.asyncio
@patch("app.tools.finance.get_debt_progress.get_days_until_due_day")
@patch("app.tools.finance.get_debt_progress.get_today_tz")
@patch("app.tools.finance.get_debt_progress.get_current_month_tz")
@patch("app.tools.finance.get_debt_progress.get_user_session")
@patch("app.tools.finance.get_debt_progress.FinanceRepository")
async def test_get_debt_progress_paid_off_no_projection(
    mock_repo: MagicMock,
    mock_session: MagicMock,
    mock_current_month: MagicMock,
    mock_today: MagicMock,
    mock_days: MagicMock,
) -> None:
    debt = _make_debt(status="paid_off", current_inst=13)

    mock_repo.get_debts = AsyncMock(return_value=[debt])
    mock_repo.get_debt_payments_for_debts = AsyncMock(return_value=[])
    mock_session.return_value = AsyncMock()
    mock_session.return_value.__aenter__ = AsyncMock()
    mock_session.return_value.__aexit__ = AsyncMock(return_value=None)
    mock_current_month.return_value = "2026-02"
    mock_today.return_value = date(2026, 2, 23)
    mock_days.return_value = 0

    result = await get_debt_progress.ainvoke({}, _make_config())
    parsed = json.loads(result)

    # paid_off visible because not negotiated visibility filtered here
    assert parsed["debts"][0]["projection"] is None


# ---------------------------------------------------------------------------
# get_upcoming_installments
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
@patch("app.tools.finance.get_upcoming_installments.get_today_tz")
@patch("app.tools.finance.get_upcoming_installments.get_current_month_tz")
@patch("app.tools.finance.get_upcoming_installments.get_user_session")
@patch("app.tools.finance.get_upcoming_installments.FinanceRepository")
async def test_get_upcoming_installments_status_logic(
    mock_repo: MagicMock,
    mock_session: MagicMock,
    mock_current_month: MagicMock,
    mock_today: MagicMock,
) -> None:
    debt = _make_debt(start_my="2025-11", installments=12, installment_amt=900.0, due_day=15)
    # Installment 4 for 2026-02 (months_diff("2025-11", "2026-02") + 1 = 4)
    # Not paid → should be pending or overdue depending on today
    mock_repo.get_debts = AsyncMock(return_value=[debt])
    mock_repo.get_debt_payments_for_debts = AsyncMock(return_value=[])
    mock_session.return_value = AsyncMock()
    mock_session.return_value.__aenter__ = AsyncMock()
    mock_session.return_value.__aexit__ = AsyncMock(return_value=None)
    mock_current_month.return_value = "2026-02"
    mock_today.return_value = date(2026, 2, 23)  # past due_day=15

    result = await get_upcoming_installments.ainvoke({"month_year": "2026-02"}, _make_config())
    parsed = json.loads(result)

    assert len(parsed["installments"]) == 1
    inst = parsed["installments"][0]
    assert inst["installmentNumber"] == 4
    assert inst["status"] == "overdue"  # today.day (23) > due_day (15)
    assert parsed["summary"]["overdueCount"] == 1


@pytest.mark.asyncio
@patch("app.tools.finance.get_upcoming_installments.get_today_tz")
@patch("app.tools.finance.get_upcoming_installments.get_current_month_tz")
@patch("app.tools.finance.get_upcoming_installments.get_user_session")
@patch("app.tools.finance.get_upcoming_installments.FinanceRepository")
async def test_get_upcoming_installments_paid_early(
    mock_repo: MagicMock,
    mock_session: MagicMock,
    mock_current_month: MagicMock,
    mock_today: MagicMock,
) -> None:
    debt = _make_debt(start_my="2025-11", installments=12, installment_amt=900.0)
    # Payment for installment 4 paid early (in January for February installment)
    payment = _make_payment(inst_num=4, month_year="2026-02", paid_at_str="2026-01-28")

    mock_repo.get_debts = AsyncMock(return_value=[debt])
    mock_repo.get_debt_payments_for_debts = AsyncMock(return_value=[payment])
    mock_session.return_value = AsyncMock()
    mock_session.return_value.__aenter__ = AsyncMock()
    mock_session.return_value.__aexit__ = AsyncMock(return_value=None)
    mock_current_month.return_value = "2026-02"
    mock_today.return_value = date(2026, 2, 10)

    result = await get_upcoming_installments.ainvoke({"month_year": "2026-02"}, _make_config())
    parsed = json.loads(result)

    assert len(parsed["installments"]) == 1
    assert parsed["installments"][0]["status"] == "paid_early"
    assert parsed["summary"]["paidEarlyCount"] == 1


# ---------------------------------------------------------------------------
# get_finance_summary
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
@patch("app.tools.finance.get_finance_summary.ensure_recurring_for_month")
@patch("app.tools.finance.get_finance_summary.get_user_session")
@patch("app.tools.finance.get_finance_summary.FinanceRepository")
async def test_get_finance_summary_current_month(
    mock_repo: MagicMock,
    mock_session: MagicMock,
    mock_ensure: AsyncMock,
) -> None:
    mock_ensure.return_value = 0
    mock_session_obj = AsyncMock()

    # Income sums
    income_row = MagicMock()
    income_row.__getitem__ = lambda self, i: [5000.0, 5200.0][i]

    # Bills total
    bills_total = 2000.0
    paid_bills = 1500.0

    # Bill status counts
    bill_status_rows = [
        (BillStatus.PENDING, 2),
        (BillStatus.PAID, 3),
    ]

    # Expenses
    exp_row = MagicMock()
    exp_row.__getitem__ = lambda self, i: [1000.0, 800.0][i]

    # Build a list of return values for sequential session.execute calls
    income_result = MagicMock()
    income_result.one.return_value = income_row

    bill_status_result = MagicMock()
    bill_status_result.all.return_value = bill_status_rows

    exp_result = MagicMock()
    exp_result.one.return_value = exp_row

    mock_session_obj.execute = AsyncMock(
        side_effect=[
            income_result,  # income sums
            bill_status_result,  # bill status counts
            exp_result,  # expense sums
        ]
    )
    mock_session_obj.scalar = AsyncMock(
        side_effect=[
            bills_total,  # bills total
            paid_bills,  # paid bills
            100.0,  # debt payments this month
        ]
    )

    # Debts
    debt = _make_debt(installment_amt=900.0, current_inst=4)
    mock_repo.get_debts = AsyncMock(return_value=[debt])
    mock_repo.sum_payments_by_month_year = AsyncMock(return_value=100.0)

    # Investments
    inv = _make_investment(current=5000.0, goal=10000.0, monthly=500.0)
    mock_repo.get_investments = AsyncMock(return_value=[inv])

    mock_session_cm = AsyncMock()
    mock_session_cm.__aenter__ = AsyncMock(return_value=mock_session_obj)
    mock_session_cm.__aexit__ = AsyncMock(return_value=None)
    mock_session.return_value = mock_session_cm

    result = await get_finance_summary.ainvoke({"period": "current_month"}, _make_config())
    parsed = json.loads(result)

    assert parsed["period"] == "current_month"
    assert "kpis" in parsed
    assert "breakdown" in parsed
    assert "debts" in parsed
    assert "investments" in parsed

    # KPI: spent = paid_bills + expenses_actual + debt_payments = 1500 + 800 + 100
    assert parsed["kpis"]["spent"] == 2400.0
    # KPI: balance = income_actual - spent = 5200 - 2400
    assert parsed["kpis"]["balance"] == 2800.0


# ---------------------------------------------------------------------------
# mark_bill_paid (WRITE)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
@patch("app.tools.finance.mark_bill_paid.get_user_session")
@patch("app.tools.finance.mark_bill_paid.FinanceRepository")
async def test_mark_bill_paid_success(mock_repo: MagicMock, mock_session: MagicMock) -> None:
    bill = _make_bill(name="Internet", amount=100.0, status="pending")
    updated_bill = _make_bill(name="Internet", amount=100.0, status="paid")

    mock_repo.get_bill_by_id = AsyncMock(return_value=bill)
    mock_repo.mark_bill_paid = AsyncMock(return_value=updated_bill)
    mock_session.return_value = AsyncMock()
    mock_session.return_value.__aenter__ = AsyncMock()
    mock_session.return_value.__aexit__ = AsyncMock(return_value=None)

    result = await mark_bill_paid.ainvoke(
        {"bill_id": "44444444-4444-4444-4444-444444444444"}, _make_config()
    )
    parsed = json.loads(result)

    assert parsed["success"] is True
    assert parsed["bill"]["name"] == "Internet"
    assert parsed["bill"]["amount"] == 100.0
    assert "paidAt" in parsed
    assert "Internet" in parsed["message"]


@pytest.mark.asyncio
@patch("app.tools.finance.mark_bill_paid.get_user_session")
@patch("app.tools.finance.mark_bill_paid.FinanceRepository")
async def test_mark_bill_paid_not_found(mock_repo: MagicMock, mock_session: MagicMock) -> None:
    mock_repo.get_bill_by_id = AsyncMock(return_value=None)
    mock_session.return_value = AsyncMock()
    mock_session.return_value.__aenter__ = AsyncMock()
    mock_session.return_value.__aexit__ = AsyncMock(return_value=None)

    result = await mark_bill_paid.ainvoke(
        {"bill_id": "44444444-4444-4444-4444-444444444444"}, _make_config()
    )
    parsed = json.loads(result)

    assert "error" in parsed
    assert "não encontrada" in parsed["error"]


@pytest.mark.asyncio
@patch("app.tools.finance.mark_bill_paid.get_user_session")
@patch("app.tools.finance.mark_bill_paid.FinanceRepository")
async def test_mark_bill_paid_already_paid(mock_repo: MagicMock, mock_session: MagicMock) -> None:
    bill = _make_bill(name="Internet", status="paid")

    mock_repo.get_bill_by_id = AsyncMock(return_value=bill)
    mock_session.return_value = AsyncMock()
    mock_session.return_value.__aenter__ = AsyncMock()
    mock_session.return_value.__aexit__ = AsyncMock(return_value=None)

    result = await mark_bill_paid.ainvoke(
        {"bill_id": "44444444-4444-4444-4444-444444444444"}, _make_config()
    )
    parsed = json.loads(result)

    assert "error" in parsed
    assert "já está" in parsed["error"]


@pytest.mark.asyncio
@patch("app.tools.finance.mark_bill_paid.get_user_session")
@patch("app.tools.finance.mark_bill_paid.FinanceRepository")
async def test_mark_bill_paid_overdue_success(
    mock_repo: MagicMock, mock_session: MagicMock
) -> None:
    bill = _make_bill(name="Aluguel", amount=1500.0, status="overdue")
    updated = _make_bill(name="Aluguel", amount=1500.0, status="paid")

    mock_repo.get_bill_by_id = AsyncMock(return_value=bill)
    mock_repo.mark_bill_paid = AsyncMock(return_value=updated)
    mock_session.return_value = AsyncMock()
    mock_session.return_value.__aenter__ = AsyncMock()
    mock_session.return_value.__aexit__ = AsyncMock(return_value=None)

    result = await mark_bill_paid.ainvoke(
        {"bill_id": "44444444-4444-4444-4444-444444444444"}, _make_config()
    )
    parsed = json.loads(result)

    assert parsed["success"] is True
    assert parsed["bill"]["name"] == "Aluguel"


@pytest.mark.asyncio
async def test_mark_bill_paid_invalid_uuid() -> None:
    result = await mark_bill_paid.ainvoke({"bill_id": "not-a-uuid"}, _make_config())
    parsed = json.loads(result)

    assert "error" in parsed
    assert "inválido" in parsed["error"]


# ---------------------------------------------------------------------------
# create_expense (WRITE)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
@patch("app.tools.finance.create_expense.get_user_session")
@patch("app.tools.finance.create_expense.FinanceRepository")
async def test_create_expense_success(mock_repo: MagicMock, mock_session: MagicMock) -> None:
    expense = _make_expense(name="Almoço", actual=50.0)

    mock_repo.create_expense = AsyncMock(return_value=expense)
    mock_session.return_value = AsyncMock()
    mock_session.return_value.__aenter__ = AsyncMock()
    mock_session.return_value.__aexit__ = AsyncMock(return_value=None)

    result = await create_expense.ainvoke(
        {"name": "Almoço", "category": "alimentacao", "actual_amount": 50.0},
        _make_config(),
    )
    parsed = json.loads(result)

    assert parsed["success"] is True
    assert parsed["expense"]["name"] == "Almoço"
    assert parsed["expense"]["category"] == "food"
    assert "Alimentação" in parsed["message"]


@pytest.mark.asyncio
@patch("app.tools.finance.create_expense.get_user_session")
@patch("app.tools.finance.create_expense.FinanceRepository")
async def test_create_expense_category_mapping(
    mock_repo: MagicMock, mock_session: MagicMock
) -> None:
    """Test all 7 PT→EN category mappings."""
    mappings = {
        "alimentacao": "food",
        "transporte": "transport",
        "lazer": "entertainment",
        "saude": "health",
        "educacao": "education",
        "vestuario": "shopping",
        "outros": "other",
    }

    expense = _make_expense()
    mock_repo.create_expense = AsyncMock(return_value=expense)
    mock_session.return_value = AsyncMock()
    mock_session.return_value.__aenter__ = AsyncMock()
    mock_session.return_value.__aexit__ = AsyncMock(return_value=None)

    for pt_cat, en_cat in mappings.items():
        result = await create_expense.ainvoke(
            {"name": "Test", "category": pt_cat, "actual_amount": 10.0},
            _make_config(),
        )
        parsed = json.loads(result)

        assert parsed["success"] is True
        # Verify the repo was called with the EN category
        call_data = mock_repo.create_expense.call_args[0][1]
        assert call_data["category"] == en_cat, f"{pt_cat} should map to {en_cat}"


@pytest.mark.asyncio
@patch("app.tools.finance.create_expense.get_user_session")
@patch("app.tools.finance.create_expense.FinanceRepository")
async def test_create_expense_defaults(mock_repo: MagicMock, mock_session: MagicMock) -> None:
    """No budgeted or actual amount → both default to 0."""
    expense = _make_expense()
    mock_repo.create_expense = AsyncMock(return_value=expense)
    mock_session.return_value = AsyncMock()
    mock_session.return_value.__aenter__ = AsyncMock()
    mock_session.return_value.__aexit__ = AsyncMock(return_value=None)

    result = await create_expense.ainvoke(
        {"name": "Test", "category": "outros"},
        _make_config(),
    )
    parsed = json.loads(result)

    assert parsed["success"] is True
    call_data = mock_repo.create_expense.call_args[0][1]
    assert call_data["expected_amount"] == 0.0
    assert call_data["actual_amount"] == 0.0


@pytest.mark.asyncio
async def test_create_expense_invalid_category() -> None:
    result = await create_expense.ainvoke(
        {"name": "Test", "category": "invalido"},
        _make_config(),
    )
    parsed = json.loads(result)

    assert "error" in parsed
    assert "inválida" in parsed["error"]


@pytest.mark.asyncio
@patch("app.tools.finance.create_expense.get_user_session")
@patch("app.tools.finance.create_expense.FinanceRepository")
async def test_create_expense_budgeted_fallback(
    mock_repo: MagicMock, mock_session: MagicMock
) -> None:
    """Only budgeted_amount provided → expected_amount = budgeted_amount."""
    expense = _make_expense()
    mock_repo.create_expense = AsyncMock(return_value=expense)
    mock_session.return_value = AsyncMock()
    mock_session.return_value.__aenter__ = AsyncMock()
    mock_session.return_value.__aexit__ = AsyncMock(return_value=None)

    result = await create_expense.ainvoke(
        {"name": "Test", "category": "alimentacao", "budgeted_amount": 200.0},
        _make_config(),
    )
    parsed = json.loads(result)

    assert parsed["success"] is True
    call_data = mock_repo.create_expense.call_args[0][1]
    assert call_data["expected_amount"] == 200.0
    assert call_data["actual_amount"] == 0.0


# ---------------------------------------------------------------------------
# Graph integration
# ---------------------------------------------------------------------------


def test_registry_includes_finance_tools() -> None:
    from app.agents.registry import build_domain_registry

    registry = build_domain_registry()
    finance_tools = {t.name for t in registry["finance"].tools}
    assert "get_finance_summary" in finance_tools
    assert "get_pending_bills" in finance_tools
    assert "get_bills" in finance_tools
    assert "get_expenses" in finance_tools
    assert "get_incomes" in finance_tools
    assert "get_investments" in finance_tools
    assert "get_debt_progress" in finance_tools
    assert "get_debt_payment_history" in finance_tools
    assert "get_upcoming_installments" in finance_tools
    assert "mark_bill_paid" in finance_tools
    assert "create_expense" in finance_tools

    # Tracking tools are in a separate domain
    tracking_tools = {t.name for t in registry["tracking"].tools}
    assert "record_metric" in tracking_tools
    assert "get_history" in tracking_tools


def test_registry_write_tools_include_finance() -> None:
    from app.agents.registry import build_domain_registry

    registry = build_domain_registry()
    assert "mark_bill_paid" in registry["finance"].write_tools
    assert "create_expense" in registry["finance"].write_tools
