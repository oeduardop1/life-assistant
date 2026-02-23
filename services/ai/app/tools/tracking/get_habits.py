"""get_habits — READ tool that lists user's habits with optional streak/today status."""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime
from zoneinfo import ZoneInfo

from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool

from app.db.repositories.tracking import TrackingRepository
from app.db.session import get_user_session

logger = logging.getLogger(__name__)


@tool(parse_docstring=True)
async def get_habits(
    include_streaks: bool = True,
    include_today_status: bool = True,
    *,
    config: RunnableConfig,
) -> str:
    """Lista os hábitos ativos do usuário com status de conclusão.

    Args:
        include_streaks: Incluir sequência atual e recorde (padrão: sim)
        include_today_status: Incluir se o hábito foi concluído hoje (padrão: sim)
    """
    session_factory = config["configurable"]["session_factory"]
    user_id: str = config["configurable"]["user_id"]
    user_timezone: str = config["configurable"].get("user_timezone", "America/Sao_Paulo")

    try:
        tz = ZoneInfo(user_timezone)
    except (KeyError, ValueError):
        tz = ZoneInfo("America/Sao_Paulo")

    today = datetime.now(tz).date()

    async with get_user_session(session_factory, user_id) as session:
        user_uuid = uuid.UUID(user_id)
        habits = await TrackingRepository.get_habits(session, user_uuid)

        formatted = []
        for habit in habits:
            entry: dict[str, object] = {
                "id": str(habit.id),
                "name": habit.name,
                "icon": habit.icon,
                "frequency": str(habit.frequency),
                "periodOfDay": str(habit.period_of_day),
            }

            if include_streaks:
                completions = await TrackingRepository.get_recent_completions(
                    session, habit.id, user_uuid, limit=60
                )
                entry["currentStreak"] = TrackingRepository.compute_streak(completions, today)
                entry["longestStreak"] = habit.longest_streak

            if include_today_status:
                completion = await TrackingRepository.get_completion_for_date(
                    session, habit.id, user_uuid, today
                )
                entry["completedToday"] = completion is not None

            formatted.append(entry)

    logger.debug("get_habits found %d habits", len(habits))

    return json.dumps(
        {
            "count": len(formatted),
            "habits": formatted,
            "message": (
                "Você ainda não tem hábitos cadastrados."
                if len(formatted) == 0
                else f"Encontrados {len(formatted)} hábitos."
            ),
        }
    )
