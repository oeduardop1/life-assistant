"""get_history — READ tool that retrieves tracking history with stats."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool

from app.db.repositories.tracking import TrackingRepository
from app.db.session import get_user_session

logger = logging.getLogger(__name__)


@tool(parse_docstring=True)
async def get_history(
    metric_type: str,
    days: int = 30,
    *,
    config: RunnableConfig,
) -> str:
    """Consulta histórico de uma métrica de tracking do usuário.

    Args:
        metric_type: Tipo da métrica: weight, water, sleep, exercise, mood, energy ou custom
        days: Quantidade de dias para consultar (padrão: 30)
    """
    session_factory = config["configurable"]["session_factory"]
    user_id: str = config["configurable"]["user_id"]
    user_timezone: str = config["configurable"].get("user_timezone", "America/Sao_Paulo")

    try:
        tz = ZoneInfo(user_timezone)
    except (KeyError, ValueError):
        tz = ZoneInfo("America/Sao_Paulo")

    now = datetime.now(tz)
    end_date = now.date()
    start_date = end_date - timedelta(days=days - 1)

    import uuid

    async with get_user_session(session_factory, user_id) as session:
        entries = await TrackingRepository.find_by_filters(
            session,
            uuid.UUID(user_id),
            tracking_type=metric_type,
            date_from=start_date,
            date_to=end_date,
            limit=100,
        )

    logger.debug("get_history found %d entries for %s", len(entries), metric_type)

    # Format entries with real UUIDs (critical for update/delete)
    formatted_entries = [
        {
            "id": str(e.id),
            "date": str(e.entry_date),
            "value": e.value,
            "unit": e.unit,
        }
        for e in entries
    ]

    # Compute stats
    values = [e.value for e in entries]
    count = len(values)

    avg: float | None = None
    min_val: float | None = None
    max_val: float | None = None
    sum_val: float | None = None
    latest: float | None = None
    previous: float | None = None
    variation: float | None = None
    trend = "stable"

    if count > 0:
        avg = sum(values) / count
        min_val = min(values)
        max_val = max(values)
        sum_val = sum(values)
        latest = values[0] if values else None
        previous = values[1] if len(values) > 1 else None

        if latest is not None and previous is not None and previous != 0:
            variation = ((latest - previous) / previous) * 100

        if variation is not None:
            if variation > 5:
                trend = "increasing"
            elif variation < -5:
                trend = "decreasing"

    return json.dumps(
        {
            "_note": (
                'IMPORTANTE: Para update_metric ou delete_metric, use o campo "id" '
                "EXATO de cada entry como entry_id. Nunca invente IDs."
            ),
            "type": metric_type,
            "period": {
                "startDate": str(start_date),
                "endDate": str(end_date),
                "days": days,
            },
            "entries": formatted_entries,
            "stats": {
                "count": count,
                "average": round(avg, 2) if avg is not None else None,
                "min": min_val,
                "max": max_val,
                "sum": round(sum_val, 2) if sum_val is not None else None,
                "latestValue": latest,
                "previousValue": previous,
                "variation": round(variation, 2) if variation is not None else None,
                "trend": trend,
            },
        }
    )
