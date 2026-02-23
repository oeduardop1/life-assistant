"""record_habit — WRITE tool that marks a habit as completed."""

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
async def record_habit(
    habit_name: str,
    date: str | None = None,
    notes: str | None = None,
    *,
    config: RunnableConfig,
) -> str:
    """Marca um hábito como concluído para uma data.

    Args:
        habit_name: Nome do hábito (busca fuzzy, não precisa ser exato)
        date: Data no formato YYYY-MM-DD. Usa hoje se omitido
        notes: Observações opcionais
    """
    session_factory = config["configurable"]["session_factory"]
    user_id: str = config["configurable"]["user_id"]
    user_timezone: str = config["configurable"].get("user_timezone", "America/Sao_Paulo")

    # Resolve date
    if date is None:
        try:
            tz = ZoneInfo(user_timezone)
        except (KeyError, ValueError):
            tz = ZoneInfo("America/Sao_Paulo")
        date = datetime.now(tz).strftime("%Y-%m-%d")

    async with get_user_session(session_factory, user_id) as session:
        user_uuid = uuid.UUID(user_id)

        # Get all active habits
        habits = await TrackingRepository.get_habits(session, user_uuid)

        if not habits:
            return json.dumps(
                {
                    "error": "Você ainda não tem hábitos cadastrados. "
                    "Crie um hábito primeiro no dashboard de Tracking."
                }
            )

        # Fuzzy match: exact case-insensitive first, then contains (both directions)
        matched = None
        name_lower = habit_name.lower()

        for h in habits:
            if h.name.lower() == name_lower:
                matched = h
                break

        if matched is None:
            for h in habits:
                if name_lower in h.name.lower() or h.name.lower() in name_lower:
                    matched = h
                    break

        if matched is None:
            available = ", ".join(h.name for h in habits)
            return json.dumps(
                {"error": f'Hábito "{habit_name}" não encontrado. Hábitos disponíveis: {available}'}
            )

        # Check if already completed for this date
        from datetime import date as date_type

        target_date = date_type.fromisoformat(date)
        existing_completion = await TrackingRepository.get_completion_for_date(
            session, matched.id, user_uuid, target_date
        )

        if existing_completion is not None:
            return json.dumps(
                {
                    "success": False,
                    "habitId": str(matched.id),
                    "habitName": matched.name,
                    "date": date,
                    "message": (
                        f'O hábito "{matched.name}" já estava '
                        f"marcado como concluído em {date}."
                    ),
                    "alreadyCompleted": True,
                }
            )

        # Create completion
        completion_id = uuid.uuid4()
        await TrackingRepository.create_habit_completion(
            session,
            {
                "id": completion_id,
                "habit_id": matched.id,
                "user_id": user_uuid,
                "completion_date": target_date,
                "source": "chat",
                "notes": notes,
            },
        )

        # Compute current streak
        completions = await TrackingRepository.get_recent_completions(
            session, matched.id, user_uuid, limit=60
        )
        streak = TrackingRepository.compute_streak(completions, target_date)

    logger.info(
        "record_habit completed habit %s (%s) for %s — streak %d",
        matched.id,
        matched.name,
        date,
        streak,
    )

    return json.dumps(
        {
            "success": True,
            "completionId": str(completion_id),
            "habitId": str(matched.id),
            "habitName": matched.name,
            "date": date,
            "currentStreak": streak,
            "message": (
                f'Hábito "{matched.name}" {matched.icon} marcado como concluído '
                f"em {date}. Sequência: {streak} dias"
            ),
        }
    )
