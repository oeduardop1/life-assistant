"""record_metric — WRITE tool that records a tracking metric entry."""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool

from app.db.repositories.tracking import TrackingRepository
from app.db.session import get_user_session

logger = logging.getLogger(__name__)

# Type → (area, sub_area)
_AREA_MAP: dict[str, tuple[str, str | None]] = {
    "weight": ("health", "physical"),
    "water": ("health", "physical"),
    "sleep": ("health", "physical"),
    "exercise": ("health", "physical"),
    "mood": ("health", "mental"),
    "energy": ("health", "mental"),
    "custom": ("learning", "informal"),
}

# Type → default unit
_DEFAULT_UNIT: dict[str, str] = {
    "weight": "kg",
    "water": "ml",
    "sleep": "hours",
    "exercise": "min",
    "mood": "score",
    "energy": "score",
}

# Type → (min, max) validation
_VALUE_RANGES: dict[str, tuple[float, float]] = {
    "weight": (0.1, 500),
    "water": (1, 10000),
    "sleep": (0.1, 24),
    "exercise": (1, 1440),
    "mood": (1, 10),
    "energy": (1, 10),
}

_VALID_TYPES = {"weight", "water", "sleep", "exercise", "mood", "energy", "custom"}

_TYPE_LABELS: dict[str, str] = {
    "weight": "peso",
    "water": "água",
    "sleep": "sono",
    "exercise": "exercício",
    "mood": "humor",
    "energy": "energia",
    "custom": "métrica personalizada",
}

_UNIT_LABELS: dict[str, str] = {
    "kg": "kg",
    "ml": "ml",
    "hours": "horas",
    "min": "minutos",
    "score": "pontos",
}


@tool(parse_docstring=True)
async def record_metric(
    metric_type: str,
    value: float,
    unit: str | None = None,
    date: str | None = None,
    notes: str | None = None,
    *,
    config: RunnableConfig,
) -> str:
    """Registra uma métrica de tracking do usuário.

    Args:
        metric_type: Tipo da métrica: weight, water, sleep, exercise, mood, energy ou custom
        value: Valor numérico da métrica
        unit: Unidade (kg, ml, hours, min, score). Auto-preenchido se omitido
        date: Data no formato YYYY-MM-DD. Usa hoje se omitido
        notes: Observações opcionais sobre o registro
    """
    session_factory = config["configurable"]["session_factory"]
    user_id: str = config["configurable"]["user_id"]
    user_timezone: str = config["configurable"].get("user_timezone", "America/Sao_Paulo")

    # Validate type
    if metric_type not in _VALID_TYPES:
        return json.dumps(
            {"error": f"Tipo inválido: {metric_type}. Use: {', '.join(sorted(_VALID_TYPES))}"}
        )

    # Validate value range
    if metric_type in _VALUE_RANGES:
        vmin, vmax = _VALUE_RANGES[metric_type]
        if not (vmin <= value <= vmax):
            return json.dumps(
                {"error": f"Valor fora do intervalo para {metric_type}: {vmin}-{vmax}"}
            )

    # Auto-fill unit
    if unit is None:
        unit = _DEFAULT_UNIT.get(metric_type)

    # Auto-fill / parse date → always a Python date object (asyncpg requires it)
    if date is None:
        try:
            tz = ZoneInfo(user_timezone)
        except (KeyError, ValueError):
            tz = ZoneInfo("America/Sao_Paulo")
        entry_date = datetime.now(tz).date()
    else:
        entry_date = datetime.strptime(date, "%Y-%m-%d").date()

    # Resolve area/sub_area
    area, sub_area = _AREA_MAP.get(metric_type, ("learning", "informal"))

    # Build metadata
    metadata: dict[str, Any] = {}
    if notes:
        metadata["notes"] = notes

    entry_id = uuid.uuid4()

    async with get_user_session(session_factory, user_id) as session:
        await TrackingRepository.create(
            session,
            {
                "id": entry_id,
                "user_id": uuid.UUID(user_id),
                "type": metric_type,
                "area": area,
                "sub_area": sub_area,
                "value": value,
                "unit": unit,
                "entry_date": entry_date,
                "source": "chat",
                "entry_metadata": metadata or None,
            },
        )

    type_label = _TYPE_LABELS.get(metric_type, metric_type)
    unit_label = _UNIT_LABELS.get(unit or "", unit or "")

    logger.info("record_metric saved entry %s: %s = %s", entry_id, metric_type, value)

    return json.dumps(
        {
            "success": True,
            "entryId": str(entry_id),
            "message": f"Registrado: {type_label} = {value} {unit_label} em {entry_date}",
        }
    )
