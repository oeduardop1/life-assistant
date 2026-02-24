"""mark_bill_paid — WRITE tool that marks a bill as paid."""

from __future__ import annotations

import json
import logging
import uuid as _uuid
from datetime import datetime

from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool

from app.db.repositories.finance import FinanceRepository
from app.db.session import get_user_session
from app.tools.finance._helpers import get_today_tz

logger = logging.getLogger(__name__)


@tool(parse_docstring=True)
async def mark_bill_paid(
    bill_id: str,
    paid_date: str | None = None,
    *,
    config: RunnableConfig,
) -> str:
    """Marca uma conta (bill) como paga.

    Args:
        bill_id: UUID da conta a ser marcada como paga
        paid_date: Data do pagamento no formato YYYY-MM-DD. Usa hoje se omitido
    """
    session_factory = config["configurable"]["session_factory"]
    user_id: str = config["configurable"]["user_id"]
    user_timezone: str = config["configurable"].get("user_timezone", "America/Sao_Paulo")

    # Validate bill_id
    try:
        bill_uuid = _uuid.UUID(bill_id)
    except (ValueError, AttributeError):
        return json.dumps({"error": f"ID de conta inválido: {bill_id}"})

    # Parse or default paid_date
    if paid_date is not None:
        try:
            paid_at_dt = datetime.strptime(paid_date, "%Y-%m-%d")
        except ValueError:
            return json.dumps({"error": f"Data inválida: {paid_date}. Use YYYY-MM-DD"})
    else:
        today = get_today_tz(user_timezone)
        paid_at_dt = datetime(today.year, today.month, today.day)

    async with get_user_session(session_factory, user_id) as session:
        bill = await FinanceRepository.get_bill_by_id(session, bill_uuid)

        if bill is None:
            return json.dumps({"error": "Conta não encontrada ou não pertence ao usuário"})

        bill_status = bill.status.value if hasattr(bill.status, "value") else bill.status

        if bill_status not in ("pending", "overdue"):
            return json.dumps(
                {
                    "error": f"Conta já está com status '{bill_status}'"
                    " — só contas pendentes/atrasadas podem ser pagas"
                }
            )

        await FinanceRepository.mark_bill_paid(session, bill_uuid, paid_at_dt)

    bill_name = bill.name
    bill_amount = float(bill.amount or 0)

    logger.info("mark_bill_paid: bill %s marked as paid at %s", bill_id, paid_at_dt)

    return json.dumps(
        {
            "success": True,
            "bill": {
                "id": str(bill_uuid),
                "name": bill_name,
                "amount": bill_amount,
            },
            "paidAt": paid_at_dt.isoformat(),
            "message": f"Conta '{bill_name}' marcada como paga (R$ {bill_amount:.2f})",
        }
    )
