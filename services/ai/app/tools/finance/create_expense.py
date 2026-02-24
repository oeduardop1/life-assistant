"""create_expense — WRITE tool that creates a variable expense."""

from __future__ import annotations

import json
import logging
import uuid as _uuid

from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool

from app.db.repositories.finance import FinanceRepository
from app.db.session import get_user_session
from app.tools.finance._helpers import get_current_month_tz

logger = logging.getLogger(__name__)

# PT category (LLM input) → EN category (database)
_CATEGORY_MAP: dict[str, str] = {
    "alimentacao": "food",
    "transporte": "transport",
    "lazer": "entertainment",
    "saude": "health",
    "educacao": "education",
    "vestuario": "shopping",
    "outros": "other",
}

# PT category → PT label (user-facing response)
_CATEGORY_LABELS: dict[str, str] = {
    "alimentacao": "Alimentação",
    "transporte": "Transporte",
    "lazer": "Lazer",
    "saude": "Saúde",
    "educacao": "Educação",
    "vestuario": "Vestuário",
    "outros": "Outros",
}


@tool(parse_docstring=True)
async def create_expense(
    name: str,
    category: str,
    budgeted_amount: float | None = None,
    actual_amount: float | None = None,
    is_recurring: bool = False,
    *,
    config: RunnableConfig,
) -> str:
    """Registra uma despesa variável do usuário.

    Args:
        name: Nome da despesa (ex: "Mercado", "Uber", "Almoço")
        category: Categoria: alimentacao, transporte, lazer, saude, educacao, vestuario, outros
        budgeted_amount: Valor orçado para a despesa
        actual_amount: Valor efetivamente gasto
        is_recurring: Se a despesa é recorrente (default: False)
    """
    session_factory = config["configurable"]["session_factory"]
    user_id: str = config["configurable"]["user_id"]
    user_timezone: str = config["configurable"].get("user_timezone", "America/Sao_Paulo")

    # Validate category
    db_category = _CATEGORY_MAP.get(category)
    if db_category is None:
        valid = ", ".join(sorted(_CATEGORY_MAP.keys()))
        return json.dumps({"error": f"Categoria inválida: '{category}'. Use: {valid}"})

    month_year = get_current_month_tz(user_timezone)

    expected = budgeted_amount or actual_amount or 0.0
    actual = actual_amount or 0.0

    data = {
        "id": _uuid.uuid4(),
        "user_id": _uuid.UUID(user_id),
        "name": name,
        "category": db_category,
        "expected_amount": expected,
        "actual_amount": actual,
        "is_recurring": is_recurring,
        "month_year": month_year,
        "currency": "BRL",
    }

    async with get_user_session(session_factory, user_id) as session:
        expense = await FinanceRepository.create_expense(session, data)

    display_amount = actual if actual > 0 else expected
    category_label = _CATEGORY_LABELS.get(category, category)

    logger.info("create_expense: expense %s created (%s)", expense.id, db_category)

    return json.dumps(
        {
            "success": True,
            "expense": {
                "id": str(expense.id),
                "name": name,
                "category": db_category,
                "actualAmount": actual,
            },
            "message": f"Despesa '{name}' ({category_label}) registrada: R$ {display_amount:.2f}",
        }
    )
