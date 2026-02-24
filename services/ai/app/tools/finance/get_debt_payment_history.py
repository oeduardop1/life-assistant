"""get_debt_payment_history — READ tool for debt payment history."""

from __future__ import annotations

import json
import logging
import uuid

from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool

from app.db.repositories.finance import FinanceRepository
from app.db.session import get_user_session

logger = logging.getLogger(__name__)


@tool(parse_docstring=True)
async def get_debt_payment_history(
    debt_id: str,
    limit: int | None = None,
    *,
    config: RunnableConfig,
) -> str:
    """Consulta o histórico de pagamentos de uma dívida específica.

    Args:
        debt_id: ID (UUID) da dívida.
        limit: Número máximo de pagamentos a retornar. Default: 50.
    """
    session_factory = config["configurable"]["session_factory"]
    user_id: str = config["configurable"]["user_id"]

    # Validate UUID
    try:
        parsed_debt_id = uuid.UUID(debt_id)
    except ValueError:
        return json.dumps({"error": f"ID de dívida inválido: {debt_id}"})

    effective_limit = min(limit or 50, 100)
    uid = uuid.UUID(user_id)

    async with get_user_session(session_factory, user_id) as session:
        debt = await FinanceRepository.get_debt_by_id(session, uid, parsed_debt_id)
        if not debt:
            return json.dumps({"error": f"Dívida não encontrada: {debt_id}"})

        payments = await FinanceRepository.get_debt_payments(session, parsed_debt_id)

    # Apply limit
    payments = payments[:effective_limit]

    total_amount = 0.0
    paid_early_count = 0
    items = []

    for p in payments:
        amount = p.amount or 0.0
        total_amount += amount

        # paidEarly: payment was made in a month before the scheduled month_year
        paid_at_my = p.paid_at.strftime("%Y-%m") if p.paid_at else None
        paid_early = paid_at_my is not None and paid_at_my < p.month_year
        if paid_early:
            paid_early_count += 1

        items.append(
            {
                "id": str(p.id),
                "installmentNumber": p.installment_number,
                "amount": amount,
                "monthYear": p.month_year,
                "paidAt": p.paid_at.isoformat() if p.paid_at else None,
                "paidEarly": paid_early,
            }
        )

    paid_installments = (debt.current_installment or 1) - 1

    logger.info("get_debt_payment_history returned %d payments for debt %s", len(items), debt_id)

    return json.dumps(
        {
            "debt": {
                "id": str(debt.id),
                "name": debt.name,
                "totalInstallments": debt.total_installments,
                "paidInstallments": paid_installments,
            },
            "payments": items,
            "summary": {
                "totalPayments": len(items),
                "totalAmount": total_amount,
                "paidEarlyCount": paid_early_count,
            },
        }
    )
