"""get_upcoming_installments — READ tool for upcoming debt installments in a given month."""

from __future__ import annotations

import json
import logging
import uuid
from typing import TYPE_CHECKING

from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool

from app.db.repositories.finance import FinanceRepository
from app.db.session import get_user_session

if TYPE_CHECKING:
    from app.db.models.finance import Debt, DebtPayment
from app.tools.finance._helpers import (
    get_current_month_tz,
    get_today_tz,
    months_diff,
)

logger = logging.getLogger(__name__)


def _is_debt_visible_in_month(debt: Debt, target_month: str) -> bool:
    """Check if a negotiated debt should be visible in target_month per §3.6."""
    if not debt.is_negotiated:
        return True  # non-negotiated always visible

    status_val = debt.status.value if hasattr(debt.status, "value") else str(debt.status)

    if status_val == "defaulted":
        return True  # defaulted always visible

    start_my = debt.start_month_year
    total_inst = debt.total_installments

    if not start_my or not total_inst:
        return True  # no installment info → show

    # Compute end month
    end_diff = total_inst - 1
    sy, sm = int(start_my[:4]), int(start_my[5:])
    end_month_num = sm + end_diff
    end_year = sy + (end_month_num - 1) // 12
    end_month = ((end_month_num - 1) % 12) + 1
    end_my = f"{end_year:04d}-{end_month:02d}"

    if status_val in ("paid_off", "settled"):
        # Historical only — visible up to end month
        return target_month <= end_my

    # Active/overdue negotiated: visible from start to end
    return start_my <= target_month <= end_my


@tool(parse_docstring=True)
async def get_upcoming_installments(
    month_year: str | None = None,
    *,
    config: RunnableConfig,
) -> str:
    """Consulta as parcelas de dívidas que vencem em um mês específico.

    Args:
        month_year: Mês no formato YYYY-MM. Usa o mês atual se omitido.
    """
    session_factory = config["configurable"]["session_factory"]
    user_id: str = config["configurable"]["user_id"]
    user_tz: str = config["configurable"].get("user_timezone", "America/Sao_Paulo")

    target_month = month_year or get_current_month_tz(user_tz)
    uid = uuid.UUID(user_id)
    today = get_today_tz(user_tz)
    today_my = today.strftime("%Y-%m")

    async with get_user_session(session_factory, user_id) as session:
        # Get negotiated debts that are active or overdue
        all_debts = await FinanceRepository.get_debts(session, uid)
        negotiated_debts = [
            d for d in all_debts if d.is_negotiated and _is_debt_visible_in_month(d, target_month)
        ]

        # Batch fetch payments for all visible debts
        debt_ids = [d.id for d in negotiated_debts]
        all_payments = await FinanceRepository.get_debt_payments_for_debts(session, debt_ids)

    # Index payments by (debt_id, installment_number)
    payment_map: dict[tuple[uuid.UUID, int], DebtPayment] = {}
    for p in all_payments:
        payment_map[(p.debt_id, p.installment_number)] = p

    total_amount = 0.0
    pending_count = 0
    paid_count = 0
    paid_early_count = 0
    overdue_count = 0
    items = []

    for debt in negotiated_debts:
        start_my = debt.start_month_year
        if not start_my or not debt.total_installments:
            continue

        diff = months_diff(start_my, target_month)
        inst_number = diff + 1

        if inst_number < 1 or inst_number > debt.total_installments:
            continue

        amount = debt.installment_amount or 0.0
        total_amount += amount

        payment = payment_map.get((debt.id, inst_number))

        # Determine status
        if payment:
            paid_at = payment.paid_at
            paid_at_my = paid_at.strftime("%Y-%m") if paid_at else None
            if paid_at_my and paid_at_my < target_month:
                inst_status = "paid_early"
                paid_early_count += 1
            else:
                inst_status = "paid"
                paid_count += 1
        elif target_month < today_my or (
            target_month == today_my and debt.due_day is not None and today.day > debt.due_day
        ):
            inst_status = "overdue"
            overdue_count += 1
        else:
            inst_status = "pending"
            pending_count += 1

        items.append(
            {
                "debtId": str(debt.id),
                "debtName": debt.name,
                "creditor": debt.creditor,
                "installmentNumber": inst_number,
                "totalInstallments": debt.total_installments,
                "amount": amount,
                "dueDay": debt.due_day,
                "currency": debt.currency,
                "status": inst_status,
                "paidAt": payment.paid_at.isoformat() if payment and payment.paid_at else None,
            }
        )

    logger.info(
        "get_upcoming_installments returned %d installments for %s", len(items), target_month
    )

    return json.dumps(
        {
            "monthYear": target_month,
            "installments": items,
            "summary": {
                "totalAmount": total_amount,
                "pendingCount": pending_count,
                "paidCount": paid_count,
                "paidEarlyCount": paid_early_count,
                "overdueCount": overdue_count,
            },
        }
    )
