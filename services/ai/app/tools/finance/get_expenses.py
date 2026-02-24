"""get_expenses — READ tool that retrieves variable expenses for a given month."""

from __future__ import annotations

import json
import logging
import uuid

from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool

from app.db.models.finance import VariableExpense
from app.db.repositories.finance import FinanceRepository
from app.db.session import get_user_session
from app.tools.finance._helpers import ensure_recurring_for_month, resolve_month_year

logger = logging.getLogger(__name__)


@tool(parse_docstring=True)
async def get_expenses(
    month: int | None = None,
    year: int | None = None,
    *,
    config: RunnableConfig,
) -> str:
    """Consulta as despesas variáveis do usuário em um mês.

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
        await ensure_recurring_for_month(session, uid, month_year, VariableExpense)
        expenses = await FinanceRepository.get_expenses(session, uid, month_year)

    total_expected = 0.0
    total_actual = 0.0
    recurring_count = 0
    one_time_count = 0
    over_budget_count = 0
    items = []

    for exp in expenses:
        expected = exp.expected_amount or 0.0
        actual = exp.actual_amount or 0.0
        total_expected += expected
        total_actual += actual

        variance = actual - expected
        percent_used = round(actual / expected * 100, 1) if expected > 0 else 0.0

        if actual > expected and expected > 0:
            over_budget_count += 1

        if exp.is_recurring:
            recurring_count += 1
        else:
            one_time_count += 1

        items.append(
            {
                "id": str(exp.id),
                "name": exp.name,
                "category": exp.category.value if hasattr(exp.category, "value") else exp.category,
                "expectedAmount": expected,
                "actualAmount": actual,
                "currency": exp.currency,
                "isRecurring": exp.is_recurring,
                "status": exp.status.value if hasattr(exp.status, "value") else exp.status,
                "variance": variance,
                "percentUsed": percent_used,
            }
        )

    total_variance = total_actual - total_expected

    logger.info("get_expenses returned %d expenses for %s", len(items), month_year)

    return json.dumps(
        {
            "monthYear": month_year,
            "expenses": items,
            "summary": {
                "totalExpected": total_expected,
                "totalActual": total_actual,
                "variance": total_variance,
                "recurringCount": recurring_count,
                "oneTimeCount": one_time_count,
                "overBudgetCount": over_budget_count,
            },
        }
    )
