"""search_knowledge — READ tool that searches user knowledge items."""

from __future__ import annotations

import json
import logging

from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool

from app.db.repositories.memory import MemoryRepository
from app.db.session import get_user_session

logger = logging.getLogger(__name__)

_VALID_TYPES = {"fact", "preference", "memory", "insight", "person"}
_VALID_AREAS = {"health", "finance", "professional", "learning", "spiritual", "relationships"}


@tool(parse_docstring=True)
async def search_knowledge(
    query: str | None = None,
    type: str | None = None,
    area: str | None = None,
    sub_area: str | None = None,
    limit: int = 10,
    *,
    config: RunnableConfig,
) -> str:
    """Busca fatos e conhecimentos sobre o usuário na memória.

    Args:
        query: Texto para buscar no título e conteúdo (busca parcial)
        type: Tipo do conhecimento: fact, preference, memory, insight ou person
        area: Área de vida: health, finance, professional, learning, spiritual ou relationships
        sub_area: Sub-área para filtro mais específico (ex: physical, mental, budget, career)
        limit: Máximo de resultados (1-20, padrão 10)
    """
    session_factory = config["configurable"]["session_factory"]
    user_id: str = config["configurable"]["user_id"]

    # Validate type
    if type is not None and type not in _VALID_TYPES:
        return json.dumps(
            {"error": f"Tipo inválido: {type}. Use: {', '.join(sorted(_VALID_TYPES))}"}
        )

    # Validate area
    if area is not None and area not in _VALID_AREAS:
        return json.dumps(
            {"error": f"Área inválida: {area}. Use: {', '.join(sorted(_VALID_AREAS))}"}
        )

    # Clamp limit
    limit = max(1, min(20, limit))

    import uuid

    async with get_user_session(session_factory, user_id) as session:
        items = await MemoryRepository.search_knowledge(
            session,
            uuid.UUID(user_id),
            query=query,
            item_type=type,
            area=area,
            sub_area=sub_area,
            limit=limit,
        )

    results = [
        {
            "id": str(item.id),
            "type": item.type.value if hasattr(item.type, "value") else str(item.type),
            "area": item.area.value if item.area and hasattr(item.area, "value") else item.area,
            "title": item.title,
            "content": item.content,
            "confidence": item.confidence,
        }
        for item in items
    ]

    logger.info("search_knowledge found %d items for user %s", len(results), user_id[:8])

    return json.dumps({"success": True, "count": len(results), "results": results})
