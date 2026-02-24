"""get_bills — READ tool that retrieves all bills for a given month with status breakdown."""

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
async def get_bills(
    month: int | None = None,
    year: int | None = None,
    status: str | None = None,
    *,
    config: RunnableConfig,
) -> str:
    """Consulta todas as contas (bills) do usuário em um mês, com filtro opcional de status.

    Args:
        month: Mês (1-12). Usa o mês atual se omitido.
        year: Ano (ex: 2026). Usa o ano atual se omitido.
        status: Filtro de status: "all", "pending", "paid", "overdue", "canceled". Default: "all".
    """
    session_factory = config["configurable"]["session_factory"]
    user_id: str = config["configurable"]["user_id"]
    user_tz: str = config["configurable"].get("user_timezone", "America/Sao_Paulo")

    month_year = resolve_month_year(month, year, user_tz)
    uid = uuid.UUID(user_id)

    # Normalize status filter
    status_filter = status if status and status != "all" else None

    async with get_user_session(session_factory, user_id) as session:
        await ensure_recurring_for_month(session, uid, month_year, Bill)
        bills = await FinanceRepository.get_bills(session, uid, month_year, status=status_filter)

    total_amount = 0.0
    paid_amount = 0.0
    pending_amount = 0.0
    overdue_amount = 0.0
    paid_count = 0
    pending_count = 0
    overdue_count = 0
    canceled_count = 0
    items = []

    for bill in bills:
        amount = bill.amount or 0.0
        total_amount += amount
        days_until = get_days_until_due_day(bill.due_day, user_tz)
        bill_status = bill.status.value if hasattr(bill.status, "value") else bill.status

        if bill_status == "paid":
            paid_amount += amount
            paid_count += 1
        elif bill_status == "canceled":
            canceled_count += 1
        elif days_until < 0:
            # Reclassify as overdue
            bill_status = "overdue"
            overdue_amount += amount
            overdue_count += 1
        else:
            pending_amount += amount
            pending_count += 1

        items.append(
            {
                "id": str(bill.id),
                "name": bill.name,
                "category": bill.category.value
                if hasattr(bill.category, "value")
                else bill.category,
                "amount": amount,
                "dueDay": bill.due_day,
                "status": bill_status,
                "paidAt": bill.paid_at.isoformat() if bill.paid_at else None,
                "currency": bill.currency,
                "isRecurring": bill.is_recurring,
                "daysUntilDue": days_until,
            }
        )

    logger.info("get_bills returned %d bills for %s", len(items), month_year)

    return json.dumps(
        {
            "monthYear": month_year,
            "bills": items,
            "summary": {
                "totalAmount": total_amount,
                "paidAmount": paid_amount,
                "pendingAmount": pending_amount,
                "overdueAmount": overdue_amount,
                "paidCount": paid_count,
                "pendingCount": pending_count,
                "overdueCount": overdue_count,
                "canceledCount": canceled_count,
            },
        }
    )
