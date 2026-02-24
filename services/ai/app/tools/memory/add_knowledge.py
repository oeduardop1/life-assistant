"""add_knowledge — WRITE tool that adds a knowledge item to user memory."""

from __future__ import annotations

import json
import logging
import uuid

from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool

from app.db.repositories.memory import MemoryRepository
from app.db.session import get_user_session
from app.tools.memory._contradiction_detector import check_contradictions

logger = logging.getLogger(__name__)

_VALID_TYPES = {"fact", "preference", "memory", "insight", "person"}
_VALID_AREAS = {"health", "finance", "professional", "learning", "spiritual", "relationships"}

_TYPE_LABELS: dict[str, str] = {
    "fact": "Fato",
    "preference": "Preferência",
    "memory": "Memória",
    "insight": "Insight",
    "person": "Pessoa",
}


def _generate_title(content: str, item_type: str) -> str:
    """Generate a title from content: type label + first sentence, max 100 chars."""
    label = _TYPE_LABELS.get(item_type, "Fato")

    # Extract first sentence (period, exclamation, question mark)
    for sep in (".", "!", "?"):
        idx = content.find(sep)
        if idx != -1 and idx < 95:
            return f"{label}: {content[: idx + 1]}"

    # No sentence end found — truncate
    max_content_len = 95 - len(label)
    if len(content) <= max_content_len:
        return f"{label}: {content}"
    return f"{label}: {content[: max_content_len - 3]}..."


@tool(parse_docstring=True)
async def add_knowledge(
    type: str,
    content: str,
    area: str | None = None,
    sub_area: str | None = None,
    confidence: float = 0.9,
    *,
    config: RunnableConfig,
) -> str:
    """Salvar um novo fato ou conhecimento sobre o usuário na memória.

    Args:
        type: Tipo do conhecimento: fact, preference, memory, insight ou person
        content: O conteúdo do conhecimento a ser salvo
        area: Área de vida: health, finance, professional, learning, spiritual ou relationships
        sub_area: Sub-área para maior especificidade (ex: physical, mental, budget, career)
        confidence: Nível de confiança de 0.0 a 1.0 (padrão 0.9)
    """
    session_factory = config["configurable"]["session_factory"]
    user_id: str = config["configurable"]["user_id"]

    # Validate type
    if type not in _VALID_TYPES:
        return json.dumps(
            {"error": f"Tipo inválido: {type}. Use: {', '.join(sorted(_VALID_TYPES))}"}
        )

    # Validate area
    if area is not None and area not in _VALID_AREAS:
        return json.dumps(
            {"error": f"Área inválida: {area}. Use: {', '.join(sorted(_VALID_AREAS))}"}
        )

    # Clamp confidence
    confidence = max(0.0, min(1.0, confidence))

    # Generate title
    title = _generate_title(content, type)

    uid = uuid.UUID(user_id)
    item_id = uuid.uuid4()
    superseded_info: dict[str, str] | None = None

    async with get_user_session(session_factory, user_id) as session:
        # LLM contradiction detection: fetch existing items in same scope
        existing = await MemoryRepository.search_knowledge(
            session,
            uid,
            item_type=type,
            area=area,
            limit=20,
        )

        contradictions = await check_contradictions(content, existing)

        # Create the new item
        new_item = await MemoryRepository.create_knowledge(
            session,
            {
                "id": item_id,
                "user_id": uid,
                "type": type,
                "area": area,
                "sub_area": sub_area,
                "title": title,
                "content": content,
                "source": "conversation",
                "confidence": confidence,
            },
        )

        # Supersede contradicted items
        if contradictions:
            top = contradictions[0]  # Supersede highest-confidence contradiction
            await MemoryRepository.supersede_knowledge(session, top.item_id, new_item.id)
            superseded_info = {
                "oldItemId": str(top.item_id),
                "reason": top.reason,
                "confidence": str(top.confidence),
            }
            logger.info(
                "add_knowledge superseded %s with %s: %s",
                top.item_id,
                item_id,
                top.reason,
            )

    logger.info("add_knowledge created %s: %s", item_id, title)

    result: dict[str, object] = {
        "success": True,
        "itemId": str(item_id),
        "message": f"Conhecimento adicionado: {title}",
    }
    if superseded_info:
        result["superseded"] = superseded_info

    return json.dumps(result)
