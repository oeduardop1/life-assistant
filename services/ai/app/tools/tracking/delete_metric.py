"""delete_metric — WRITE tool that deletes a tracking entry."""

from __future__ import annotations

import json
import logging
import uuid

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
async def delete_metric(
    entry_id: str,
    reason: str | None = None,
    *,
    config: RunnableConfig,
) -> str:
    """Remove um registro de tracking existente.

    Args:
        entry_id: ID (UUID) exato do registro a ser removido
        reason: Motivo da remoção (opcional)
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

        deleted_value = existing.value
        deleted_unit = existing.unit
        deleted_date = str(existing.entry_date)
        deleted_type = str(existing.type)

        await TrackingRepository.delete(session, entry_uuid)

    type_label = _TYPE_LABELS.get(deleted_type, deleted_type)

    logger.info("delete_metric deleted entry %s", entry_id)

    return json.dumps(
        {
            "success": True,
            "entryId": entry_id,
            "message": (
                f"Removido: {type_label} de {deleted_value} {deleted_unit or ''} ({deleted_date})"
            ).strip(),
            "deletedValue": deleted_value,
        }
    )
