"""update_metric — WRITE tool that updates an existing tracking entry."""

from __future__ import annotations

import json
import logging
import uuid
from typing import Any

from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool

from app.db.repositories.tracking import TrackingRepository
from app.db.session import get_user_session

logger = logging.getLogger(__name__)

_TYPE_LABELS: dict[str, str] = {
    "weight": "peso",
    "water": "água",
    "sleep": "sono",
    "exercise": "exercício",
    "mood": "humor",
    "energy": "energia",
}


@tool(parse_docstring=True)
async def update_metric(
    entry_id: str,
    value: float,
    unit: str | None = None,
    reason: str | None = None,
    *,
    config: RunnableConfig,
) -> str:
    """Atualiza o valor de um registro de tracking existente.

    Args:
        entry_id: ID (UUID) exato do registro a ser atualizado
        value: Novo valor numérico
        unit: Nova unidade (opcional, mantém a atual se omitido)
        reason: Motivo da correção (opcional)
    """
    session_factory = config["configurable"]["session_factory"]
    user_id: str = config["configurable"]["user_id"]

    try:
        entry_uuid = uuid.UUID(entry_id)
    except ValueError:
        return json.dumps({"error": f"ID inválido: {entry_id}"})

    async with get_user_session(session_factory, user_id) as session:
        existing = await TrackingRepository.get_by_id(session, entry_uuid)
        if existing is None:
            return json.dumps({"error": f"Registro não encontrado: {entry_id}"})

        old_value = existing.value
        old_unit = existing.unit

        update_data: dict[str, Any] = {"value": value}
        if unit is not None:
            update_data["unit"] = unit
        if reason:
            metadata = dict(existing.entry_metadata) if existing.entry_metadata else {}
            metadata["correctionReason"] = reason
            update_data["entry_metadata"] = metadata

        await TrackingRepository.update(session, entry_uuid, update_data)

    type_label = _TYPE_LABELS.get(str(existing.type), str(existing.type))
    display_unit = unit or old_unit or ""

    logger.info("update_metric updated entry %s: %s → %s", entry_id, old_value, value)

    return json.dumps(
        {
            "success": True,
            "entryId": entry_id,
            "message": (
                f"Corrigido: {type_label} de {old_value} "
                f"{old_unit or ''} para {value} {display_unit}"
            ).strip(),
            "oldValue": old_value,
            "newValue": value,
        }
    )
