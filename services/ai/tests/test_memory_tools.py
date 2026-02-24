"""Unit tests for memory tools (mocked repositories — no DB required)."""

from __future__ import annotations

import json
import uuid
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.db.models.enums import KnowledgeItemSource, KnowledgeItemType, LifeArea, SubArea
from app.db.models.memory import KnowledgeItem
from app.tools.memory._contradiction_detector import ContradictionResult, check_contradictions
from app.tools.memory.add_knowledge import add_knowledge
from app.tools.memory.analyze_context import analyze_context
from app.tools.memory.search_knowledge import search_knowledge

# ---------------------------------------------------------------------------
# Test helpers
# ---------------------------------------------------------------------------

TEST_USER_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
TEST_ITEM_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
TEST_ITEM_ID_2 = "cccccccc-cccc-cccc-cccc-cccccccccccc"


def _make_config(user_id: str = TEST_USER_ID) -> dict[str, Any]:
    """Create a mock RunnableConfig with session_factory for tool testing."""
    mock_session = AsyncMock()
    mock_session_cm = AsyncMock()
    mock_session_cm.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session_cm.__aexit__ = AsyncMock(return_value=None)

    mock_factory = MagicMock(return_value=mock_session_cm)

    return {
        "configurable": {
            "session_factory": mock_factory,
            "user_id": user_id,
            "user_timezone": "America/Sao_Paulo",
        }
    }


def _make_knowledge_item(
    item_id: str = TEST_ITEM_ID,
    item_type: str = "fact",
    area: str = "health",
    title: str = "Fato: pesa 80kg",
    content: str = "Pesa 80kg",
    confidence: float = 0.9,
    sub_area: str | None = None,
) -> KnowledgeItem:
    """Create a mock KnowledgeItem."""
    item = MagicMock(spec=KnowledgeItem)
    item.id = uuid.UUID(item_id)
    item.user_id = uuid.UUID(TEST_USER_ID)
    item.type = KnowledgeItemType(item_type)
    item.area = LifeArea(area) if area else None
    item.sub_area = SubArea(sub_area) if sub_area else None
    item.title = title
    item.content = content
    item.confidence = confidence
    item.source = KnowledgeItemSource.CONVERSATION
    item.superseded_by_id = None
    item.deleted_at = None
    return item


def _make_user_memories(
    learned_patterns: list[dict[str, Any]] | None = None,
) -> MagicMock:
    """Create a mock UserMemory."""
    mem = MagicMock()
    mem.learned_patterns = learned_patterns
    return mem


# ---------------------------------------------------------------------------
# search_knowledge tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_search_knowledge_no_filters() -> None:
    item = _make_knowledge_item()
    config = _make_config()

    with patch(
        "app.tools.memory.search_knowledge.get_user_session",
    ) as mock_session:
        mock_ctx = AsyncMock()
        mock_ctx.__aenter__ = AsyncMock(return_value=AsyncMock())
        mock_ctx.__aexit__ = AsyncMock(return_value=None)
        mock_session.return_value = mock_ctx

        with patch(
            "app.tools.memory.search_knowledge.MemoryRepository.search_knowledge",
            return_value=[item],
        ):
            result = await search_knowledge.ainvoke(input={}, config=config)

    data = json.loads(result)
    assert data["success"] is True
    assert data["count"] == 1
    assert data["results"][0]["id"] == str(item.id)
    assert data["results"][0]["type"] == "fact"


@pytest.mark.asyncio
async def test_search_knowledge_with_type_filter() -> None:
    config = _make_config()

    with patch(
        "app.tools.memory.search_knowledge.get_user_session",
    ) as mock_session:
        mock_ctx = AsyncMock()
        mock_ctx.__aenter__ = AsyncMock(return_value=AsyncMock())
        mock_ctx.__aexit__ = AsyncMock(return_value=None)
        mock_session.return_value = mock_ctx

        with patch(
            "app.tools.memory.search_knowledge.MemoryRepository.search_knowledge",
            return_value=[],
        ) as mock_search:
            result = await search_knowledge.ainvoke(input={"type": "preference"}, config=config)
            # Verify the filter was passed
            mock_search.assert_called_once()
            call_kwargs = mock_search.call_args
            assert call_kwargs.kwargs["item_type"] == "preference"

    data = json.loads(result)
    assert data["success"] is True
    assert data["count"] == 0


@pytest.mark.asyncio
async def test_search_knowledge_with_area_filter() -> None:
    config = _make_config()

    with patch(
        "app.tools.memory.search_knowledge.get_user_session",
    ) as mock_session:
        mock_ctx = AsyncMock()
        mock_ctx.__aenter__ = AsyncMock(return_value=AsyncMock())
        mock_ctx.__aexit__ = AsyncMock(return_value=None)
        mock_session.return_value = mock_ctx

        with patch(
            "app.tools.memory.search_knowledge.MemoryRepository.search_knowledge",
            return_value=[],
        ) as mock_search:
            result = await search_knowledge.ainvoke(input={"area": "finance"}, config=config)
            mock_search.assert_called_once()
            assert mock_search.call_args.kwargs["area"] == "finance"

    data = json.loads(result)
    assert data["success"] is True


@pytest.mark.asyncio
async def test_search_knowledge_with_keyword() -> None:
    config = _make_config()

    with patch(
        "app.tools.memory.search_knowledge.get_user_session",
    ) as mock_session:
        mock_ctx = AsyncMock()
        mock_ctx.__aenter__ = AsyncMock(return_value=AsyncMock())
        mock_ctx.__aexit__ = AsyncMock(return_value=None)
        mock_session.return_value = mock_ctx

        with patch(
            "app.tools.memory.search_knowledge.MemoryRepository.search_knowledge",
            return_value=[],
        ) as mock_search:
            result = await search_knowledge.ainvoke(input={"query": "peso"}, config=config)
            mock_search.assert_called_once()
            assert mock_search.call_args.kwargs["query"] == "peso"

    data = json.loads(result)
    assert data["success"] is True


@pytest.mark.asyncio
async def test_search_knowledge_invalid_type() -> None:
    config = _make_config()
    result = await search_knowledge.ainvoke(input={"type": "invalid"}, config=config)
    data = json.loads(result)
    assert "error" in data
    assert "Tipo inválido" in data["error"]


# ---------------------------------------------------------------------------
# add_knowledge tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_add_knowledge_basic() -> None:
    config = _make_config()
    new_item = _make_knowledge_item()

    with (
        patch("app.tools.memory.add_knowledge.get_user_session") as mock_session,
        patch(
            "app.tools.memory.add_knowledge.MemoryRepository.search_knowledge",
            return_value=[],
        ),
        patch(
            "app.tools.memory.add_knowledge.check_contradictions",
            return_value=[],
        ),
        patch(
            "app.tools.memory.add_knowledge.MemoryRepository.create_knowledge",
            return_value=new_item,
        ),
    ):
        mock_ctx = AsyncMock()
        mock_ctx.__aenter__ = AsyncMock(return_value=AsyncMock())
        mock_ctx.__aexit__ = AsyncMock(return_value=None)
        mock_session.return_value = mock_ctx

        result = await add_knowledge.ainvoke(
            input={
                "type": "fact",
                "content": "Mora em São Paulo",
                "area": "relationships",
            },
            config=config,
        )

    data = json.loads(result)
    assert data["success"] is True
    assert "itemId" in data
    assert "Conhecimento adicionado" in data["message"]


@pytest.mark.asyncio
async def test_add_knowledge_title_generation() -> None:
    """Verify title is generated with type label prefix."""
    from app.tools.memory.add_knowledge import _generate_title

    assert _generate_title("É solteiro.", "fact") == "Fato: É solteiro."
    assert _generate_title("Gosta de café", "preference") == "Preferência: Gosta de café"
    assert _generate_title("A" * 200, "insight").endswith("...")
    assert len(_generate_title("A" * 200, "insight")) <= 100


@pytest.mark.asyncio
async def test_add_knowledge_contradiction_detection() -> None:
    config = _make_config()
    old_item = _make_knowledge_item(item_id=TEST_ITEM_ID, content="É solteiro")
    new_item = _make_knowledge_item(item_id=TEST_ITEM_ID_2, content="Está namorando")

    contradiction = ContradictionResult(
        item_id=uuid.UUID(TEST_ITEM_ID),
        is_contradiction=True,
        confidence=0.95,
        reason="Status de relacionamento mudou",
    )

    with (
        patch("app.tools.memory.add_knowledge.get_user_session") as mock_session,
        patch(
            "app.tools.memory.add_knowledge.MemoryRepository.search_knowledge",
            return_value=[old_item],
        ),
        patch(
            "app.tools.memory.add_knowledge.check_contradictions",
            return_value=[contradiction],
        ),
        patch(
            "app.tools.memory.add_knowledge.MemoryRepository.create_knowledge",
            return_value=new_item,
        ),
        patch(
            "app.tools.memory.add_knowledge.MemoryRepository.supersede_knowledge",
        ) as mock_supersede,
    ):
        mock_ctx = AsyncMock()
        mock_ctx.__aenter__ = AsyncMock(return_value=AsyncMock())
        mock_ctx.__aexit__ = AsyncMock(return_value=None)
        mock_session.return_value = mock_ctx

        result = await add_knowledge.ainvoke(
            input={
                "type": "fact",
                "content": "Está namorando",
                "area": "relationships",
            },
            config=config,
        )

    data = json.loads(result)
    assert data["success"] is True
    assert "superseded" in data
    assert data["superseded"]["oldItemId"] == TEST_ITEM_ID
    mock_supersede.assert_called_once()


@pytest.mark.asyncio
async def test_add_knowledge_no_contradiction() -> None:
    config = _make_config()
    existing_item = _make_knowledge_item(content="Gosta de café")
    new_item = _make_knowledge_item(item_id=TEST_ITEM_ID_2, content="Prefere espresso")

    with (
        patch("app.tools.memory.add_knowledge.get_user_session") as mock_session,
        patch(
            "app.tools.memory.add_knowledge.MemoryRepository.search_knowledge",
            return_value=[existing_item],
        ),
        patch(
            "app.tools.memory.add_knowledge.check_contradictions",
            return_value=[],  # No contradictions
        ),
        patch(
            "app.tools.memory.add_knowledge.MemoryRepository.create_knowledge",
            return_value=new_item,
        ),
        patch(
            "app.tools.memory.add_knowledge.MemoryRepository.supersede_knowledge",
        ) as mock_supersede,
    ):
        mock_ctx = AsyncMock()
        mock_ctx.__aenter__ = AsyncMock(return_value=AsyncMock())
        mock_ctx.__aexit__ = AsyncMock(return_value=None)
        mock_session.return_value = mock_ctx

        result = await add_knowledge.ainvoke(
            input={
                "type": "preference",
                "content": "Prefere espresso",
                "area": "health",
            },
            config=config,
        )

    data = json.loads(result)
    assert data["success"] is True
    assert "superseded" not in data
    mock_supersede.assert_not_called()


# ---------------------------------------------------------------------------
# contradiction detector tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_contradiction_detector_llm_error() -> None:
    """On LLM error, returns empty list (safe default)."""
    item = _make_knowledge_item(content="É solteiro")

    with patch(
        "app.tools.memory._contradiction_detector.create_llm",
        side_effect=Exception("LLM unavailable"),
    ):
        result = await check_contradictions("Está namorando", [item])

    assert result == []


@pytest.mark.asyncio
async def test_contradiction_detector_empty_items() -> None:
    """With no existing items, returns empty list."""
    result = await check_contradictions("Qualquer coisa", [])
    assert result == []


@pytest.mark.asyncio
async def test_contradiction_detector_parses_llm_response() -> None:
    """Parses LLM JSON response correctly."""
    item = _make_knowledge_item(item_id=TEST_ITEM_ID, content="É solteiro")

    mock_llm = AsyncMock()
    mock_response = MagicMock()
    mock_response.content = json.dumps(
        [
            {
                "item_id": TEST_ITEM_ID,
                "is_contradiction": True,
                "confidence": 0.95,
                "reason": "Status mudou",
            }
        ]
    )
    mock_llm.ainvoke = AsyncMock(return_value=mock_response)

    with patch(
        "app.tools.memory._contradiction_detector.create_llm",
        return_value=mock_llm,
    ):
        results = await check_contradictions("Está namorando", [item])

    assert len(results) == 1
    assert results[0].item_id == uuid.UUID(TEST_ITEM_ID)
    assert results[0].is_contradiction is True
    assert results[0].confidence == 0.95


@pytest.mark.asyncio
async def test_contradiction_detector_filters_by_threshold() -> None:
    """Items below threshold are excluded."""
    item = _make_knowledge_item(item_id=TEST_ITEM_ID, content="É solteiro")

    mock_llm = AsyncMock()
    mock_response = MagicMock()
    mock_response.content = json.dumps(
        [
            {
                "item_id": TEST_ITEM_ID,
                "is_contradiction": True,
                "confidence": 0.5,  # Below default 0.7 threshold
                "reason": "Maybe?",
            }
        ]
    )
    mock_llm.ainvoke = AsyncMock(return_value=mock_response)

    with patch(
        "app.tools.memory._contradiction_detector.create_llm",
        return_value=mock_llm,
    ):
        results = await check_contradictions("Está namorando", [item])

    assert len(results) == 0


# ---------------------------------------------------------------------------
# analyze_context tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_analyze_context_multi_area() -> None:
    item1 = _make_knowledge_item(item_id=TEST_ITEM_ID, area="health", content="Dorme pouco")
    item2 = _make_knowledge_item(item_id=TEST_ITEM_ID_2, area="finance", content="Dívida alta")
    config = _make_config()

    with (
        patch("app.tools.memory.analyze_context.get_user_session") as mock_session,
        patch(
            "app.tools.memory.analyze_context.MemoryRepository.search_knowledge",
            side_effect=[[item1], [item2]],
        ),
        patch(
            "app.tools.memory.analyze_context.MemoryRepository.get_user_memories",
            return_value=None,
        ),
    ):
        mock_ctx = AsyncMock()
        mock_ctx.__aenter__ = AsyncMock(return_value=AsyncMock())
        mock_ctx.__aexit__ = AsyncMock(return_value=None)
        mock_session.return_value = mock_ctx

        result = await analyze_context.ainvoke(
            input={
                "current_topic": "ansiedade com finanças",
                "related_areas": ["health", "finance"],
            },
            config=config,
        )

    data = json.loads(result)
    assert len(data["relatedFacts"]) == 2
    ids = {f["id"] for f in data["relatedFacts"]}
    assert str(uuid.UUID(TEST_ITEM_ID)) in ids
    assert str(uuid.UUID(TEST_ITEM_ID_2)) in ids


@pytest.mark.asyncio
async def test_analyze_context_patterns() -> None:
    config = _make_config()
    user_memories = _make_user_memories(
        learned_patterns=[
            {"pattern": "Stress causa insônia", "confidence": 0.85, "evidence": "3 ocorrências"},
            {"pattern": "Pouco relevante", "confidence": 0.3, "evidence": "1 ocorrência"},
        ]
    )

    with (
        patch("app.tools.memory.analyze_context.get_user_session") as mock_session,
        patch(
            "app.tools.memory.analyze_context.MemoryRepository.search_knowledge",
            return_value=[],
        ),
        patch(
            "app.tools.memory.analyze_context.MemoryRepository.get_user_memories",
            return_value=user_memories,
        ),
    ):
        mock_ctx = AsyncMock()
        mock_ctx.__aenter__ = AsyncMock(return_value=AsyncMock())
        mock_ctx.__aexit__ = AsyncMock(return_value=None)
        mock_session.return_value = mock_ctx

        result = await analyze_context.ainvoke(
            input={
                "current_topic": "problemas de sono",
                "related_areas": ["health"],
            },
            config=config,
        )

    data = json.loads(result)
    # Only pattern with confidence >= 0.7 should be included
    assert len(data["existingPatterns"]) == 1
    assert data["existingPatterns"][0]["pattern"] == "Stress causa insônia"


@pytest.mark.asyncio
async def test_analyze_context_hint() -> None:
    config = _make_config()

    with (
        patch("app.tools.memory.analyze_context.get_user_session") as mock_session,
        patch(
            "app.tools.memory.analyze_context.MemoryRepository.search_knowledge",
            return_value=[],
        ),
        patch(
            "app.tools.memory.analyze_context.MemoryRepository.get_user_memories",
            return_value=None,
        ),
    ):
        mock_ctx = AsyncMock()
        mock_ctx.__aenter__ = AsyncMock(return_value=AsyncMock())
        mock_ctx.__aexit__ = AsyncMock(return_value=None)
        mock_session.return_value = mock_ctx

        # With contradictions hint
        result = await analyze_context.ainvoke(
            input={
                "current_topic": "trabalho",
                "related_areas": ["professional"],
                "look_for_contradictions": True,
            },
            config=config,
        )

    data = json.loads(result)
    assert "_hint" in data
    assert "contradições" in data["_hint"]


@pytest.mark.asyncio
async def test_analyze_context_no_hint() -> None:
    config = _make_config()

    with (
        patch("app.tools.memory.analyze_context.get_user_session") as mock_session,
        patch(
            "app.tools.memory.analyze_context.MemoryRepository.search_knowledge",
            return_value=[],
        ),
        patch(
            "app.tools.memory.analyze_context.MemoryRepository.get_user_memories",
            return_value=None,
        ),
    ):
        mock_ctx = AsyncMock()
        mock_ctx.__aenter__ = AsyncMock(return_value=AsyncMock())
        mock_ctx.__aexit__ = AsyncMock(return_value=None)
        mock_session.return_value = mock_ctx

        result = await analyze_context.ainvoke(
            input={
                "current_topic": "trabalho",
                "related_areas": ["professional"],
                "look_for_contradictions": False,
            },
            config=config,
        )

    data = json.loads(result)
    assert "_hint" not in data


@pytest.mark.asyncio
async def test_analyze_context_invalid_areas() -> None:
    config = _make_config()
    result = await analyze_context.ainvoke(
        input={
            "current_topic": "test",
            "related_areas": ["invalid_area"],
        },
        config=config,
    )
    data = json.loads(result)
    assert "error" in data
