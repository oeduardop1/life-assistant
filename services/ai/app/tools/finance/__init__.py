"""Finance tools — 9 READ + 2 WRITE tools for the finance domain."""

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

FINANCE_TOOLS = [
    get_finance_summary,
    get_pending_bills,
    get_bills,
    get_expenses,
    get_incomes,
    get_investments,
    get_debt_progress,
    get_debt_payment_history,
    get_upcoming_installments,
    mark_bill_paid,
    create_expense,
]

FINANCE_WRITE_TOOLS: set[str] = {"mark_bill_paid", "create_expense"}

__all__ = [
    "FINANCE_TOOLS",
    "FINANCE_WRITE_TOOLS",
    "get_finance_summary",
    "get_pending_bills",
    "get_bills",
    "get_expenses",
    "get_incomes",
    "get_investments",
    "get_debt_progress",
    "get_debt_payment_history",
    "get_upcoming_installments",
    "mark_bill_paid",
    "create_expense",
]
