"""get_debt_progress — READ tool for debt progress with projection and visibility rules."""

from __future__ import annotations

import json
import logging
import math
import uuid
from collections import defaultdict
from typing import TYPE_CHECKING

from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool

from app.db.repositories.finance import FinanceRepository
from app.db.session import get_user_session

if TYPE_CHECKING:
    from app.db.models.finance import Debt, DebtPayment
from app.tools.finance._helpers import (
    get_current_month_tz,
    get_days_until_due_day,
    get_today_tz,
    months_diff,
)

logger = logging.getLogger(__name__)

# Month names in Portuguese for projection messages
_MONTH_NAMES_PT = [
    "",
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
]


def _is_visible_in_month(debt: Debt, target_month: str) -> bool:
    """Apply §3.6 visibility rules."""
    if not debt.is_negotiated:
        return True

    status_val = debt.status.value if hasattr(debt.status, "value") else str(debt.status)

    if status_val == "defaulted":
        return True

    start_my = debt.start_month_year
    total_inst = debt.total_installments

    if not start_my or not total_inst:
        return True

    # Compute end month
    end_diff = total_inst - 1
    sy, sm = int(start_my[:4]), int(start_my[5:])
    end_m = sm + end_diff
    end_year = sy + (end_m - 1) // 12
    end_month = ((end_m - 1) % 12) + 1
    end_my = f"{end_year:04d}-{end_month:02d}"

    if status_val in ("paid_off", "settled"):
        return target_month <= end_my

    return start_my <= target_month <= end_my


def _calculate_projection(
    debt: Debt,
    payments: list[DebtPayment],
    now_month: str,
) -> dict[str, object] | None:
    """Calculate payoff projection for a negotiated active debt."""
    status_str = debt.status.value if hasattr(debt.status, "value") else str(debt.status)

    if status_str == "paid_off":
        return None

    total_inst = debt.total_installments
    if not debt.is_negotiated or not total_inst:
        return None

    paid_installments = (debt.current_installment or 1) - 1
    remaining_installments = total_inst - paid_installments

    if remaining_installments <= 0:
        return None

    # No payment history — estimate using 1 payment/month
    if paid_installments == 0 or not payments:
        start_my = debt.start_month_year or now_month
        sy, sm = int(start_my[:4]), int(start_my[5:])
        payoff_m = sm + remaining_installments - 1
        payoff_year = sy + (payoff_m - 1) // 12
        payoff_month = ((payoff_m - 1) % 12) + 1
        payoff_my = f"{payoff_year:04d}-{payoff_month:02d}"
        month_name = _MONTH_NAMES_PT[payoff_month]
        return {
            "estimatedPayoffMonthYear": payoff_my,
            "remainingMonths": remaining_installments,
            "paymentVelocity": {"avgPaymentsPerMonth": 1.0, "isRegular": True},
            "message": (
                f"No ritmo atual, você quita em {month_name}/{payoff_year} "
                f"({remaining_installments} meses)."
            ),
        }

    # Group payments by actual payment month (paid_at)
    payments_by_month: dict[str, int] = defaultdict(int)
    for p in payments:
        paid_at = p.paid_at
        if paid_at:
            pm = paid_at.strftime("%Y-%m")
            payments_by_month[pm] += 1

    if not payments_by_month:
        return None

    # Calculate elapsed months
    months_sorted = sorted(payments_by_month.keys())
    first_pm = months_sorted[0]
    last_pm = months_sorted[-1]
    months_elapsed = months_diff(first_pm, last_pm) + 1

    avg_per_month = paid_installments / max(months_elapsed, 1)

    # Regularity: coefficient of variation < 30%
    per_month_counts = list(payments_by_month.values())
    count_mean = sum(per_month_counts) / len(per_month_counts)
    if count_mean > 0:
        variance = sum((x - count_mean) ** 2 for x in per_month_counts) / len(per_month_counts)
        std_dev = math.sqrt(variance)
        is_regular = (std_dev / count_mean) < 0.3
    else:
        is_regular = True

    # Estimate remaining months
    remaining_months = math.ceil(remaining_installments / max(avg_per_month, 0.01))

    # Compute payoff date from now
    ny, nm = int(now_month[:4]), int(now_month[5:])
    payoff_m = nm + remaining_months
    payoff_year = ny + (payoff_m - 1) // 12
    payoff_month = ((payoff_m - 1) % 12) + 1
    payoff_my = f"{payoff_year:04d}-{payoff_month:02d}"
    month_name = _MONTH_NAMES_PT[payoff_month]

    if avg_per_month > 1.2:
        message = (
            f"Pagando ~{round(avg_per_month)} parcelas/mês, você quita em "
            f"{month_name}/{payoff_year} ({remaining_months} meses)."
        )
    else:
        message = (
            f"No ritmo atual, você quita em {month_name}/{payoff_year} ({remaining_months} meses)."
        )

    return {
        "estimatedPayoffMonthYear": payoff_my,
        "remainingMonths": remaining_months,
        "paymentVelocity": {
            "avgPaymentsPerMonth": round(avg_per_month, 2),
            "isRegular": is_regular,
        },
        "message": message,
    }


@tool(parse_docstring=True)
async def get_debt_progress(
    debt_id: str | None = None,
    month_year: str | None = None,
    *,
    config: RunnableConfig,
) -> str:
    """Consulta o progresso das dívidas do usuário com projeção de quitação.

    Args:
        debt_id: ID (UUID) de uma dívida específica. Se omitido, retorna todas.
        month_year: Mês no formato YYYY-MM para filtro de visibilidade. Usa mês atual se omitido.
    """
    session_factory = config["configurable"]["session_factory"]
    user_id: str = config["configurable"]["user_id"]
    user_tz: str = config["configurable"].get("user_timezone", "America/Sao_Paulo")

    uid = uuid.UUID(user_id)
    target_month = month_year or get_current_month_tz(user_tz)
    today = get_today_tz(user_tz)

    async with get_user_session(session_factory, user_id) as session:
        if debt_id:
            try:
                parsed_id = uuid.UUID(debt_id)
            except ValueError:
                return json.dumps({"error": f"ID de dívida inválido: {debt_id}"})
            single = await FinanceRepository.get_debt_by_id(session, uid, parsed_id)
            debts = [single] if single else []
        else:
            all_debts = await FinanceRepository.get_debts(session, uid)
            debts = [d for d in all_debts if _is_visible_in_month(d, target_month)]

        # Batch fetch payments for all visible debts
        debt_ids = [d.id for d in debts]
        all_payments = await FinanceRepository.get_debt_payments_for_debts(session, debt_ids)

    if not debts and debt_id:
        return json.dumps({"error": f"Dívida não encontrada: {debt_id}"})

    # Index payments by debt_id
    payments_by_debt: dict[uuid.UUID, list[DebtPayment]] = defaultdict(list)
    for p in all_payments:
        payments_by_debt[p.debt_id].append(p)

    total_debts = 0.0
    total_paid = 0.0
    total_remaining = 0.0
    progress_sum = 0.0
    progress_count = 0
    overdue_count = 0
    items = []

    now_month = today.strftime("%Y-%m")

    for debt in debts:
        status_val = debt.status.value if hasattr(debt.status, "value") else debt.status
        total_amount = debt.total_amount or 0.0
        total_debts += total_amount

        paid_installments = (debt.current_installment or 1) - 1
        installment_amount = debt.installment_amount or 0.0
        debt_paid = installment_amount * paid_installments
        total_paid += debt_paid

        remaining = total_amount - debt_paid
        if remaining < 0:
            remaining = 0.0
        total_remaining += remaining

        percent_complete = round(debt_paid / total_amount * 100, 1) if total_amount > 0 else 0.0
        progress_sum += percent_complete
        progress_count += 1

        # Days until next due
        days_until = get_days_until_due_day(debt.due_day, user_tz) if debt.due_day else None
        if status_val == "overdue":
            overdue_count += 1

        # Projection
        debt_payments = payments_by_debt.get(debt.id, [])
        projection = _calculate_projection(debt, debt_payments, now_month)

        items.append(
            {
                "id": str(debt.id),
                "name": debt.name,
                "creditor": debt.creditor,
                "totalAmount": total_amount,
                "isNegotiated": debt.is_negotiated,
                "totalInstallments": debt.total_installments,
                "currentInstallment": debt.current_installment,
                "installmentAmount": installment_amount,
                "paidInstallments": paid_installments,
                "totalPaid": debt_paid,
                "remaining": remaining,
                "percentComplete": percent_complete,
                "status": status_val,
                "dueDay": debt.due_day,
                "daysUntilDue": days_until,
                "startMonthYear": debt.start_month_year,
                "currency": debt.currency,
                "notes": debt.notes,
                "projection": projection,
            }
        )

    avg_progress = round(progress_sum / progress_count, 1) if progress_count > 0 else None

    logger.info("get_debt_progress returned %d debts", len(items))

    return json.dumps(
        {
            "monthYear": target_month,
            "debts": items,
            "summary": {
                "totalDebts": total_debts,
                "totalPaid": total_paid,
                "totalRemaining": total_remaining,
                "averageProgress": avg_progress,
                "overdueCount": overdue_count,
                "count": len(items),
            },
        }
    )
