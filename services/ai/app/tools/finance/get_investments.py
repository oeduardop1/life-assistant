"""get_investments — READ tool that retrieves all user investments with progress."""

from __future__ import annotations

import json
import logging
import math
import uuid

from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool

from app.db.repositories.finance import FinanceRepository
from app.db.session import get_user_session

logger = logging.getLogger(__name__)


@tool(parse_docstring=True)
async def get_investments(*, config: RunnableConfig) -> str:
    """Consulta todos os investimentos do usuário com progresso em relação à meta.

    Args:
    """
    session_factory = config["configurable"]["session_factory"]
    user_id: str = config["configurable"]["user_id"]

    async with get_user_session(session_factory, user_id) as session:
        investments = await FinanceRepository.get_investments(session, uuid.UUID(user_id))

    items = []
    total_current = 0.0
    total_goal = 0.0
    total_monthly = 0.0
    progress_sum = 0.0
    progress_count = 0

    for inv in investments:
        current = inv.current_amount or 0.0
        goal = inv.goal_amount
        monthly = inv.monthly_contribution

        progress: float | None = None
        remaining: float | None = None
        months_to_goal: int | None = None

        if goal and goal > 0:
            progress = round(current / goal * 100, 1)
            remaining = goal - current
            if monthly and monthly > 0 and remaining > 0:
                months_to_goal = math.ceil(remaining / monthly)
            total_goal += goal
            progress_sum += progress
            progress_count += 1

        total_current += current
        if monthly:
            total_monthly += monthly

        items.append(
            {
                "id": str(inv.id),
                "name": inv.name,
                "type": inv.type.value if hasattr(inv.type, "value") else inv.type,
                "currentAmount": current,
                "goalAmount": goal,
                "monthlyContribution": monthly,
                "currency": inv.currency,
                "deadline": str(inv.deadline) if inv.deadline else None,
                "progress": progress,
                "remainingToGoal": remaining,
                "monthsToGoal": months_to_goal,
            }
        )

    avg_progress = round(progress_sum / progress_count, 1) if progress_count > 0 else None

    logger.info("get_investments returned %d investments", len(items))

    return json.dumps(
        {
            "investments": items,
            "summary": {
                "count": len(items),
                "totalCurrentAmount": total_current,
                "totalGoalAmount": total_goal,
                "totalMonthlyContribution": total_monthly,
                "averageProgress": avg_progress,
            },
        }
    )
