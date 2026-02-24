"""get_finance_summary — READ tool that aggregates all financial data into a summary."""

from __future__ import annotations

import json
import logging
import uuid

from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool
from sqlalchemy import func, select

from app.db.models.finance import Bill, Income, VariableExpense
from app.db.repositories.finance import FinanceRepository
from app.db.session import get_user_session
from app.tools.finance._helpers import (
    ensure_recurring_for_month,
    get_current_month_tz,
    get_previous_month,
)

logger = logging.getLogger(__name__)


@tool(parse_docstring=True)
async def get_finance_summary(
    period: str = "current_month",
    *,
    config: RunnableConfig,
) -> str:
    """Retorna o resumo financeiro do usuário para um período (mês atual, mês passado ou ano).

    Args:
        period: Período: "current_month", "last_month" ou "year". Default: "current_month".
    """
    session_factory = config["configurable"]["session_factory"]
    user_id: str = config["configurable"]["user_id"]
    user_tz: str = config["configurable"].get("user_timezone", "America/Sao_Paulo")

    current_month = get_current_month_tz(user_tz)

    # Resolve period → month_year
    if period == "last_month":
        month_year = get_previous_month(current_month)
    elif period == "year":
        month_year = None  # aggregate across all months
    else:
        month_year = current_month

    uid = uuid.UUID(user_id)

    async with get_user_session(session_factory, user_id) as session:
        # Ensure recurring items (only for specific month, not year)
        if month_year:
            await ensure_recurring_for_month(session, uid, month_year, Bill)
            await ensure_recurring_for_month(session, uid, month_year, VariableExpense)
            await ensure_recurring_for_month(session, uid, month_year, Income)

        # --- Incomes ---
        income_stmt = select(
            func.coalesce(func.sum(Income.expected_amount), 0),
            func.coalesce(func.sum(Income.actual_amount), 0),
        ).where(Income.user_id == uid, Income.status != "excluded")
        if month_year:
            income_stmt = income_stmt.where(Income.month_year == month_year)
        income_row = (await session.execute(income_stmt)).one()
        income_expected = float(income_row[0])
        income_actual = float(income_row[1])

        # --- Bills ---
        bills_where = [Bill.user_id == uid, Bill.status != "canceled"]
        if month_year:
            bills_where.append(Bill.month_year == month_year)

        # Total bills
        bills_total = float(
            await session.scalar(
                select(func.coalesce(func.sum(Bill.amount), 0)).where(*bills_where)
            )
        )
        # Paid bills amount
        paid_where = [*bills_where, Bill.status == "paid"]
        paid_bills_amount = float(
            await session.scalar(select(func.coalesce(func.sum(Bill.amount), 0)).where(*paid_where))
        )
        # Bills count by status
        count_where = [Bill.user_id == uid]
        if month_year:
            count_where.append(Bill.month_year == month_year)
        bill_status_rows = (
            await session.execute(
                select(Bill.status, func.count()).where(*count_where).group_by(Bill.status)
            )
        ).all()
        bills_count: dict[str, int] = {}
        for row in bill_status_rows:
            key = row[0].value if hasattr(row[0], "value") else row[0]
            bills_count[key] = row[1]

        # --- Variable Expenses ---
        exp_where = [VariableExpense.user_id == uid, VariableExpense.status != "excluded"]
        if month_year:
            exp_where.append(VariableExpense.month_year == month_year)

        exp_stmt = select(
            func.coalesce(func.sum(VariableExpense.expected_amount), 0),
            func.coalesce(func.sum(VariableExpense.actual_amount), 0),
        ).where(*exp_where)
        exp_row = (await session.execute(exp_stmt)).one()
        expenses_expected = float(exp_row[0])
        expenses_actual = float(exp_row[1])

        # --- Debts ---
        all_debts = await FinanceRepository.get_debts(session, uid)

        total_debt_amount = 0.0
        total_debt_paid = 0.0
        monthly_installment_sum = 0.0
        negotiated_count = 0
        pending_negotiation_count = 0

        for debt in all_debts:
            status_val = debt.status.value if hasattr(debt.status, "value") else debt.status
            amount = debt.total_amount or 0.0

            if status_val not in ("paid_off", "settled"):
                total_debt_amount += amount

            paid_inst = (debt.current_installment or 1) - 1
            inst_amount = debt.installment_amount or 0.0
            total_debt_paid += inst_amount * paid_inst

            if debt.is_negotiated and status_val in ("active", "overdue"):
                monthly_installment_sum += inst_amount
                negotiated_count += 1
            elif not debt.is_negotiated:
                pending_negotiation_count += 1

        # --- Debt payments this month ---
        if month_year:
            debt_payments_this_month = await FinanceRepository.sum_payments_by_month_year(
                session, uid, month_year
            )
        else:
            # Year: sum all payments (no month filter)
            from app.db.models.finance import DebtPayment

            year_total = await session.scalar(
                select(func.coalesce(func.sum(DebtPayment.amount), 0)).where(
                    DebtPayment.user_id == uid
                )
            )
            debt_payments_this_month = float(year_total)  # type: ignore[arg-type]

        # --- Investments ---
        investments = await FinanceRepository.get_investments(session, uid)

    total_current = 0.0
    total_goal = 0.0
    total_monthly_contribution = 0.0
    progress_sum = 0.0
    progress_count = 0

    for inv in investments:
        current = inv.current_amount or 0.0
        total_current += current
        goal = inv.goal_amount
        monthly = inv.monthly_contribution
        if goal and goal > 0:
            total_goal += goal
            progress_sum += current / goal * 100
            progress_count += 1
        if monthly:
            total_monthly_contribution += monthly

    avg_inv_progress = round(progress_sum / progress_count, 1) if progress_count > 0 else None

    # --- KPIs ---
    budgeted = bills_total + expenses_expected + monthly_installment_sum
    spent = paid_bills_amount + expenses_actual + debt_payments_this_month
    balance = income_actual - spent

    display_month = month_year or f"{current_month[:4]} (ano)"

    logger.info("get_finance_summary computed for period=%s month=%s", period, display_month)

    return json.dumps(
        {
            "period": period,
            "monthYear": display_month,
            "kpis": {
                "income": income_actual,
                "budgeted": budgeted,
                "spent": spent,
                "balance": balance,
                "invested": total_current,
            },
            "income": {
                "expected": income_expected,
                "actual": income_actual,
            },
            "breakdown": {
                "bills": {
                    "total": bills_total,
                    "paidAmount": paid_bills_amount,
                    "pendingAmount": bills_total - paid_bills_amount,
                },
                "expenses": {
                    "expected": expenses_expected,
                    "actual": expenses_actual,
                },
                "debts": {
                    "paymentsThisMonth": debt_payments_this_month,
                },
            },
            "billsCount": {
                "pending": bills_count.get("pending", 0),
                "paid": bills_count.get("paid", 0),
                "overdue": bills_count.get("overdue", 0),
                "canceled": bills_count.get("canceled", 0),
            },
            "debts": {
                "totalDebts": len(all_debts),
                "totalAmount": total_debt_amount,
                "monthlyInstallment": monthly_installment_sum,
                "totalPaid": total_debt_paid,
                "totalRemaining": total_debt_amount - total_debt_paid,
                "negotiatedCount": negotiated_count,
                "pendingNegotiationCount": pending_negotiation_count,
            },
            "investments": {
                "count": len(investments),
                "totalCurrent": total_current,
                "totalGoal": total_goal,
                "monthlyContribution": total_monthly_contribution,
                "averageProgress": avg_inv_progress,
            },
        }
    )
