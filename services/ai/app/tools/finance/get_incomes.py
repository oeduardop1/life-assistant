"""get_incomes — READ tool that retrieves incomes for a given month."""

from __future__ import annotations

import json
import logging
import uuid

from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool

from app.db.models.finance import Income
from app.db.repositories.finance import FinanceRepository
from app.db.session import get_user_session
from app.tools.finance._helpers import ensure_recurring_for_month, resolve_month_year

logger = logging.getLogger(__name__)


@tool(parse_docstring=True)
async def get_incomes(
    month: int | None = None,
    year: int | None = None,
    *,
    config: RunnableConfig,
) -> str:
    """Consulta as receitas do usuário em um mês.

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
        await ensure_recurring_for_month(session, uid, month_year, Income)
        incomes = await FinanceRepository.get_incomes(session, uid, month_year)

    total_expected = 0.0
    total_actual = 0.0
    received_count = 0
    pending_count = 0
    items = []

    for inc in incomes:
        expected = inc.expected_amount or 0.0
        actual = inc.actual_amount
        total_expected += expected

        variance: float | None = None
        if actual is not None:
            total_actual += actual
            variance = actual - expected
            received_count += 1
        else:
            pending_count += 1

        items.append(
            {
                "id": str(inc.id),
                "name": inc.name,
                "type": inc.type.value if hasattr(inc.type, "value") else inc.type,
                "frequency": inc.frequency.value
                if hasattr(inc.frequency, "value")
                else inc.frequency,
                "expectedAmount": expected,
                "actualAmount": actual,
                "currency": inc.currency,
                "isRecurring": inc.is_recurring,
                "status": inc.status.value if hasattr(inc.status, "value") else inc.status,
                "variance": variance,
            }
        )

    total_variance = total_actual - total_expected if received_count > 0 else None

    logger.info("get_incomes returned %d incomes for %s", len(items), month_year)

    return json.dumps(
        {
            "monthYear": month_year,
            "incomes": items,
            "summary": {
                "totalExpected": total_expected,
                "totalActual": total_actual,
                "variance": total_variance,
                "count": len(items),
                "receivedCount": received_count,
                "pendingCount": pending_count,
            },
        }
    )
