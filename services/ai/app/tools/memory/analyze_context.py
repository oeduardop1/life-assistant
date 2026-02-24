"""analyze_context — READ tool that gathers contextual memory for a topic."""

from __future__ import annotations

import asyncio
import json
import logging
import uuid

from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool

from app.db.models.memory import KnowledgeItem
from app.db.repositories.memory import MemoryRepository
from app.db.session import get_user_session

logger = logging.getLogger(__name__)

_VALID_AREAS = {"health", "finance", "professional", "learning", "spiritual", "relationships"}


def _extract_keywords(text: str, min_len: int = 4) -> set[str]:
    """Extract unique words with length >= min_len from text (lowercased)."""
    return {w.lower() for w in text.split() if len(w) >= min_len}


@tool(parse_docstring=True)
async def analyze_context(
    current_topic: str,
    related_areas: list[str],
    look_for_contradictions: bool = True,
    *,
    config: RunnableConfig,
) -> str:
    """Analisa o contexto da memória do usuário para um tópico. OBRIGATÓRIO usar antes de responder temas pessoais.

    Args:
        current_topic: O assunto principal sendo discutido
        related_areas: Áreas de vida relacionadas (1-4): health, finance, professional, learning, spiritual, relationships
        look_for_contradictions: Se deve incluir dica para verificar contradições (padrão true)
    """
    session_factory = config["configurable"]["session_factory"]
    user_id: str = config["configurable"]["user_id"]

    # Validate areas
    valid_areas = [a for a in related_areas[:4] if a in _VALID_AREAS]
    if not valid_areas:
        return json.dumps({"error": f"Nenhuma área válida. Use: {', '.join(sorted(_VALID_AREAS))}"})

    uid = uuid.UUID(user_id)

    async with get_user_session(session_factory, user_id) as session:
        # Fetch items from each area in parallel
        async def _fetch_area(area: str) -> list[KnowledgeItem]:
            return await MemoryRepository.search_knowledge(session, uid, area=area, limit=10)

        area_results = await asyncio.gather(*[_fetch_area(a) for a in valid_areas])

        # Deduplicate by ID, keep all items
        seen_ids: set[str] = set()
        all_items = []
        for items in area_results:
            for item in items:
                item_id_str = str(item.id)
                if item_id_str not in seen_ids:
                    seen_ids.add(item_id_str)
                    all_items.append(item)

        # Sort by confidence desc, take top 15
        all_items.sort(key=lambda x: x.confidence, reverse=True)
        all_items = all_items[:15]

        # Load user memories for learned patterns
        user_memories = await MemoryRepository.get_user_memories(session, uid)

    # Format related facts
    related_facts = [
        {
            "id": str(item.id),
            "type": item.type.value if hasattr(item.type, "value") else str(item.type),
            "content": item.content,
            "confidence": item.confidence,
            "area": item.area.value if item.area and hasattr(item.area, "value") else item.area,
        }
        for item in all_items
    ]

    # Extract learned patterns (confidence >= 0.7)
    existing_patterns: list[dict[str, object]] = []
    if user_memories and user_memories.learned_patterns:
        for pattern in user_memories.learned_patterns:
            if isinstance(pattern, dict) and float(pattern.get("confidence", 0)) >= 0.7:
                existing_patterns.append(
                    {
                        "pattern": pattern.get("pattern", ""),
                        "confidence": pattern.get("confidence", 0),
                        "evidence": pattern.get("evidence", ""),
                    }
                )

    # Build potential connections via keyword matching
    topic_keywords = _extract_keywords(current_topic)
    potential_connections: list[str] = []

    for pattern in existing_patterns:
        pattern_text = str(pattern.get("pattern", ""))
        pattern_keywords = _extract_keywords(pattern_text)
        overlap = topic_keywords & pattern_keywords
        if overlap:
            potential_connections.append(
                f"Padrão '{pattern_text}' pode estar relacionado ao tópico (palavras em comum: {', '.join(sorted(overlap))})"
            )

    # Also check facts for keyword overlap
    for fact in related_facts[:10]:
        fact_keywords = _extract_keywords(str(fact.get("content", "")))
        overlap = topic_keywords & fact_keywords
        if overlap and len(overlap) >= 2:
            content_str = str(fact.get("content", ""))
            potential_connections.append(f"Fato '{content_str[:60]}...' pode ser relevante")

    # Build result
    result: dict[str, object] = {
        "relatedFacts": related_facts,
        "existingPatterns": existing_patterns,
        "potentialConnections": potential_connections[:5],
        "contradictions": [],
    }

    if look_for_contradictions:
        result["_hint"] = (
            "Analise os fatos acima e verifique se há contradições com o que o "
            "usuário está dizendo agora. Se encontrar, pergunte gentilmente."
        )

    logger.info(
        "analyze_context for '%s': %d facts, %d patterns, %d connections",
        current_topic[:30],
        len(related_facts),
        len(existing_patterns),
        len(potential_connections),
    )

    return json.dumps(result)
