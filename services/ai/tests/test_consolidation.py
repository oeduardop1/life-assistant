"""Unit tests for memory consolidation worker (mocked deps, no real DB/LLM)."""

from __future__ import annotations

import datetime as _dt
import json
import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.db.models.enums import KnowledgeItemSource, KnowledgeItemType, LifeArea
from app.db.models.memory import KnowledgeItem
from app.db.models.users import User, UserMemory
from app.workers.consolidation import (
    _log_consolidation,
    _resolve_priority,
    _run_deduplication_phase,
    run_consolidation,
    set_session_factory,
)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

USER_A_ID = uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
USER_B_ID = uuid.UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
USER_C_ID = uuid.UUID("cccccccc-cccc-cccc-cccc-cccccccccccc")

_UTC = _dt.UTC

# Shared patch target prefix
_C = "app.workers.consolidation"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_mock_user(
    user_id: uuid.UUID = USER_A_ID,
    name: str = "Test User",
    timezone: str = "America/Sao_Paulo",
) -> MagicMock:
    user = MagicMock(spec=User)
    user.id = user_id
    user.name = name
    user.timezone = timezone
    return user


def _make_mock_memory(
    last_consolidated_at: _dt.datetime | None = None,
    bio: str | None = None,
    occupation: str | None = None,
    family_context: str | None = None,
    current_goals: list[str] | None = None,
    current_challenges: list[str] | None = None,
    top_of_mind: list[str] | None = None,
    values: list[str] | None = None,
) -> MagicMock:
    mem = MagicMock(spec=UserMemory)
    mem.last_consolidated_at = last_consolidated_at
    mem.created_at = _dt.datetime(2026, 1, 1, tzinfo=_UTC)
    mem.bio = bio
    mem.occupation = occupation
    mem.family_context = family_context
    mem.current_goals = current_goals
    mem.current_challenges = current_challenges
    mem.top_of_mind = top_of_mind
    mem.values = values
    return mem


def _make_mock_message(
    role: str,
    content: str,
    created_at: _dt.datetime | None = None,
) -> MagicMock:
    msg = MagicMock()
    msg.role = role
    msg.content = content
    msg.created_at = created_at or _dt.datetime(2026, 1, 15, 10, 0, tzinfo=_UTC)
    return msg


def _make_knowledge_item(
    item_id: uuid.UUID | None = None,
    item_type: str = "fact",
    area: str | None = "health",
    content: str = "Pesa 80kg",
    confidence: float = 0.9,
    validated: bool = False,
) -> MagicMock:
    item = MagicMock(spec=KnowledgeItem)
    item.id = item_id or uuid.uuid4()
    item.user_id = USER_A_ID
    item.type = KnowledgeItemType(item_type)
    item.area = LifeArea(area) if area else None
    item.sub_area = None
    item.title = f"Test: {content[:30]}"
    item.content = content
    item.confidence = confidence
    item.source = KnowledgeItemSource.CONVERSATION
    item.validated_by_user = validated
    item.superseded_by_id = None
    item.deleted_at = None
    return item


def _make_llm_json_response(data: dict[str, Any]) -> MagicMock:
    """Create a mock LLM response whose .content is a JSON string."""
    resp = MagicMock()
    resp.content = json.dumps(data)
    return resp


@asynccontextmanager
async def _fake_service_session(*_a: object, **_kw: object) -> AsyncIterator[AsyncMock]:
    yield AsyncMock()


# ---------------------------------------------------------------------------
# Fixture: set and reset session factory
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def init_session_factory() -> Any:
    """Set a mock session factory before each test, reset after."""
    mock_factory = MagicMock()
    set_session_factory(mock_factory)
    yield
    import app.workers.consolidation as mod

    mod._session_factory = None


# ---------------------------------------------------------------------------
# Standard LLM response for tests that need full consolidation
# ---------------------------------------------------------------------------

_STANDARD_LLM_RESPONSE: dict[str, Any] = {
    "memory_updates": {
        "bio": "Engenheiro de software, 30 anos",
        "currentGoals": ["Aprender Rust"],
    },
    "new_knowledge_items": [
        {
            "type": "fact",
            "area": "professional",
            "content": "Trabalha com Python e TypeScript",
            "title": "Linguagens de programação",
            "confidence": 0.95,
            "source": "ai_inference",
        },
        {
            "type": "insight",
            "area": "health",
            "content": "Tendência a dormir tarde quando estressado",
            "title": "Padrão de sono",
            "confidence": 0.8,
            "source": "ai_inference",
            "inferenceEvidence": "3 menções em conversas diferentes",
        },
    ],
    "updated_knowledge_items": [
        {
            "id": "dddddddd-dddd-dddd-dddd-dddddddddddd",
            "content": "Peso atualizado: 78kg",
            "confidence": 0.95,
        }
    ],
}


# ---------------------------------------------------------------------------
# #2 — Consolidation extracts facts from conversations
# ---------------------------------------------------------------------------


async def test_consolidation_extracts_facts_from_conversations() -> None:
    user = _make_mock_user()
    memory = _make_mock_memory(bio="Dev")
    messages = [
        _make_mock_message("user", "Comecei a estudar Rust hoje"),
        _make_mock_message("assistant", "Que legal! Rust é uma ótima linguagem."),
    ]

    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(return_value=_make_llm_json_response(_STANDARD_LLM_RESPONSE))

    with (
        patch(f"{_C}.get_service_session", side_effect=_fake_service_session),
        patch(f"{_C}.UserRepository.get_users_by_timezone", new_callable=AsyncMock, return_value=[user]),
        patch(f"{_C}.MemoryRepository.get_user_memories", new_callable=AsyncMock, return_value=memory),
        patch(f"{_C}.ChatRepository.get_messages_since", new_callable=AsyncMock, return_value=messages),
        patch(f"{_C}.MemoryRepository.search_knowledge", new_callable=AsyncMock, return_value=[]),
        patch(f"{_C}.check_contradictions", new_callable=AsyncMock, return_value=[]),
        patch(f"{_C}.create_llm", return_value=mock_llm),
        patch(f"{_C}.MemoryRepository.update_user_memories", new_callable=AsyncMock) as mock_update_mem,
        patch(f"{_C}.MemoryRepository.create_knowledge", new_callable=AsyncMock) as mock_create_ki,
        patch(f"{_C}.MemoryRepository.update_knowledge", new_callable=AsyncMock),
        patch(f"{_C}.MemoryRepository.supersede_knowledge", new_callable=AsyncMock),
        patch(f"{_C}.MemoryRepository.create_consolidation_log", new_callable=AsyncMock),
        patch(f"{_C}.get_settings", return_value=MagicMock()),
    ):
        result = await run_consolidation("America/Sao_Paulo")

    assert result.users_consolidated == 1
    assert result.errors == 0

    # LLM was called
    mock_llm.ainvoke.assert_called_once()

    # create_knowledge called for each new item (2 in standard response)
    assert mock_create_ki.call_count == 2

    # update_user_memories called (at least for bio/goals + last_consolidated_at)
    assert mock_update_mem.call_count >= 1

    # Check last_consolidated_at was set
    last_call_data = mock_update_mem.call_args_list[-1][0][-1]
    assert "last_consolidated_at" in last_call_data


# ---------------------------------------------------------------------------
# #3 — Contradictions detected and resolved
# ---------------------------------------------------------------------------


async def test_contradictions_detected_and_resolved() -> None:
    """'parou de tomar cafe' supersedes 'gosta de cafe' via contradiction detection."""
    from app.tools.memory._contradiction_detector import ContradictionResult

    user = _make_mock_user()
    memory = _make_mock_memory()
    messages = [_make_mock_message("user", "Parei de tomar café")]

    old_item_id = uuid.UUID("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee")
    old_item = _make_knowledge_item(
        item_id=old_item_id,
        content="Gosta de café",
        area="health",
        item_type="preference",
    )

    contradiction = ContradictionResult(
        item_id=old_item_id,
        is_contradiction=True,
        confidence=0.95,
        reason="Parou de tomar café",
    )

    llm_resp: dict[str, Any] = {
        "memory_updates": {},
        "new_knowledge_items": [
            {
                "type": "preference",
                "area": "health",
                "content": "Parou de tomar café",
                "title": "Preferência: parou de tomar café",
                "confidence": 0.95,
                "source": "ai_inference",
            }
        ],
        "updated_knowledge_items": [],
    }

    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(return_value=_make_llm_json_response(llm_resp))

    with (
        patch(f"{_C}.get_service_session", side_effect=_fake_service_session),
        patch(f"{_C}.UserRepository.get_users_by_timezone", new_callable=AsyncMock, return_value=[user]),
        patch(f"{_C}.MemoryRepository.get_user_memories", new_callable=AsyncMock, return_value=memory),
        patch(f"{_C}.ChatRepository.get_messages_since", new_callable=AsyncMock, return_value=messages),
        patch(f"{_C}.MemoryRepository.search_knowledge", new_callable=AsyncMock, return_value=[old_item]),
        patch(f"{_C}.check_contradictions", new_callable=AsyncMock, return_value=[contradiction]),
        patch(f"{_C}.create_llm", return_value=mock_llm),
        patch(f"{_C}.MemoryRepository.update_user_memories", new_callable=AsyncMock),
        patch(f"{_C}.MemoryRepository.create_knowledge", new_callable=AsyncMock),
        patch(f"{_C}.MemoryRepository.update_knowledge", new_callable=AsyncMock),
        patch(f"{_C}.MemoryRepository.supersede_knowledge", new_callable=AsyncMock) as mock_supersede,
        patch(f"{_C}.MemoryRepository.create_consolidation_log", new_callable=AsyncMock),
        patch(f"{_C}.get_settings", return_value=MagicMock()),
    ):
        result = await run_consolidation("America/Sao_Paulo")

    assert result.users_consolidated == 1
    assert mock_supersede.call_count >= 1


# ---------------------------------------------------------------------------
# #4 — User memories updated after consolidation
# ---------------------------------------------------------------------------


async def test_user_memories_updated_after_consolidation() -> None:
    user = _make_mock_user()
    memory = _make_mock_memory()
    messages = [_make_mock_message("user", "Sou engenheiro de software, tenho 30 anos")]

    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(return_value=_make_llm_json_response(_STANDARD_LLM_RESPONSE))

    with (
        patch(f"{_C}.get_service_session", side_effect=_fake_service_session),
        patch(f"{_C}.UserRepository.get_users_by_timezone", new_callable=AsyncMock, return_value=[user]),
        patch(f"{_C}.MemoryRepository.get_user_memories", new_callable=AsyncMock, return_value=memory),
        patch(f"{_C}.ChatRepository.get_messages_since", new_callable=AsyncMock, return_value=messages),
        patch(f"{_C}.MemoryRepository.search_knowledge", new_callable=AsyncMock, return_value=[]),
        patch(f"{_C}.check_contradictions", new_callable=AsyncMock, return_value=[]),
        patch(f"{_C}.create_llm", return_value=mock_llm),
        patch(f"{_C}.MemoryRepository.update_user_memories", new_callable=AsyncMock) as mock_update_mem,
        patch(f"{_C}.MemoryRepository.create_knowledge", new_callable=AsyncMock),
        patch(f"{_C}.MemoryRepository.update_knowledge", new_callable=AsyncMock),
        patch(f"{_C}.MemoryRepository.supersede_knowledge", new_callable=AsyncMock),
        patch(f"{_C}.MemoryRepository.create_consolidation_log", new_callable=AsyncMock),
        patch(f"{_C}.get_settings", return_value=MagicMock()),
    ):
        await run_consolidation("America/Sao_Paulo")

    # Called at least twice: memory_updates from LLM + last_consolidated_at
    assert mock_update_mem.call_count >= 2

    # First call should have bio from LLM response
    first_call_data = mock_update_mem.call_args_list[0][0][-1]
    assert "bio" in first_call_data
    assert first_call_data["bio"] == "Engenheiro de software, 30 anos"


# ---------------------------------------------------------------------------
# #5 — Knowledge items created/updated without duplicates
# ---------------------------------------------------------------------------


async def test_knowledge_items_created_and_updated_without_duplicates() -> None:
    user = _make_mock_user()
    memory = _make_mock_memory()
    messages = [_make_mock_message("user", "Update e novo fato")]

    existing_item_id = uuid.UUID("dddddddd-dddd-dddd-dddd-dddddddddddd")
    existing_item = _make_knowledge_item(
        item_id=existing_item_id,
        content="Pesa 80kg",
        area="health",
    )

    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(return_value=_make_llm_json_response(_STANDARD_LLM_RESPONSE))

    with (
        patch(f"{_C}.get_service_session", side_effect=_fake_service_session),
        patch(f"{_C}.UserRepository.get_users_by_timezone", new_callable=AsyncMock, return_value=[user]),
        patch(f"{_C}.MemoryRepository.get_user_memories", new_callable=AsyncMock, return_value=memory),
        patch(f"{_C}.ChatRepository.get_messages_since", new_callable=AsyncMock, return_value=messages),
        patch(f"{_C}.MemoryRepository.search_knowledge", new_callable=AsyncMock, return_value=[existing_item]),
        patch(f"{_C}.check_contradictions", new_callable=AsyncMock, return_value=[]),
        patch(f"{_C}.create_llm", return_value=mock_llm),
        patch(f"{_C}.MemoryRepository.update_user_memories", new_callable=AsyncMock),
        patch(f"{_C}.MemoryRepository.create_knowledge", new_callable=AsyncMock) as mock_create_ki,
        patch(f"{_C}.MemoryRepository.update_knowledge", new_callable=AsyncMock) as mock_update_ki,
        patch(f"{_C}.MemoryRepository.supersede_knowledge", new_callable=AsyncMock),
        patch(f"{_C}.MemoryRepository.create_consolidation_log", new_callable=AsyncMock),
        patch(f"{_C}.get_settings", return_value=MagicMock()),
    ):
        await run_consolidation("America/Sao_Paulo")

    # 2 new items created
    assert mock_create_ki.call_count == 2

    # 1 existing item updated
    assert mock_update_ki.call_count == 1

    # Updated item uses the existing ID
    update_call = mock_update_ki.call_args_list[0][0]
    assert update_call[1] == existing_item_id


# ---------------------------------------------------------------------------
# #6 — Batch deduplication groups by type+area
# ---------------------------------------------------------------------------


async def test_batch_deduplication_multiple_groups() -> None:
    from app.tools.memory._contradiction_detector import ContradictionResult

    older = _make_knowledge_item(
        item_id=uuid.UUID("11111111-1111-1111-1111-111111111111"),
        content="Gosta de café",
        area="health",
        item_type="preference",
        confidence=0.8,
    )
    newer = _make_knowledge_item(
        item_id=uuid.UUID("22222222-2222-2222-2222-222222222222"),
        content="Parou de tomar café",
        area="health",
        item_type="preference",
        confidence=0.9,
    )
    # Different group — should NOT interact
    other = _make_knowledge_item(
        item_id=uuid.UUID("33333333-3333-3333-3333-333333333333"),
        content="Ganha 10k",
        area="finance",
        item_type="fact",
        confidence=0.95,
    )

    contradiction = ContradictionResult(
        item_id=older.id,
        is_contradiction=True,
        confidence=0.95,
        reason="Parou de tomar café",
    )

    with (
        patch(f"{_C}.get_service_session", side_effect=_fake_service_session),
        patch(f"{_C}.check_contradictions", new_callable=AsyncMock, return_value=[contradiction]) as mock_check,
        patch(f"{_C}.MemoryRepository.supersede_knowledge", new_callable=AsyncMock) as mock_supersede,
    ):
        resolved = await _run_deduplication_phase(USER_A_ID, [older, newer, other])

    # check_contradictions called once for preference:health group (newer vs [older])
    # finance:fact group has only 1 item → skipped
    assert mock_check.call_count == 1
    assert mock_supersede.call_count == 1
    assert resolved == 1


# ---------------------------------------------------------------------------
# #10 — Skip user with no messages since last consolidation
# ---------------------------------------------------------------------------


async def test_skip_user_no_messages_since_last_consolidation() -> None:
    user = _make_mock_user()
    memory = _make_mock_memory(
        last_consolidated_at=_dt.datetime(2026, 1, 15, 3, 0, tzinfo=_UTC),
    )

    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock()

    with (
        patch(f"{_C}.get_service_session", side_effect=_fake_service_session),
        patch(f"{_C}.UserRepository.get_users_by_timezone", new_callable=AsyncMock, return_value=[user]),
        patch(f"{_C}.MemoryRepository.get_user_memories", new_callable=AsyncMock, return_value=memory),
        patch(f"{_C}.ChatRepository.get_messages_since", new_callable=AsyncMock, return_value=[]),
        patch(f"{_C}.MemoryRepository.search_knowledge", new_callable=AsyncMock, return_value=[]),
        patch(f"{_C}.check_contradictions", new_callable=AsyncMock, return_value=[]),
        patch(f"{_C}.create_llm", return_value=mock_llm),
        patch(f"{_C}.MemoryRepository.update_user_memories", new_callable=AsyncMock),
        patch(f"{_C}.MemoryRepository.create_knowledge", new_callable=AsyncMock),
        patch(f"{_C}.MemoryRepository.update_knowledge", new_callable=AsyncMock),
        patch(f"{_C}.MemoryRepository.supersede_knowledge", new_callable=AsyncMock),
        patch(f"{_C}.MemoryRepository.create_consolidation_log", new_callable=AsyncMock),
        patch(f"{_C}.get_settings", return_value=MagicMock()),
    ):
        result = await run_consolidation("America/Sao_Paulo")

    assert result.users_skipped == 1
    assert result.users_consolidated == 0

    # LLM should NOT be called
    mock_llm.ainvoke.assert_not_called()


# ---------------------------------------------------------------------------
# #11 — Partial failure: one user fails, others continue
# ---------------------------------------------------------------------------


async def test_partial_failure_one_user_fails_others_continue() -> None:
    user_a = _make_mock_user(user_id=USER_A_ID, name="User A")
    user_b = _make_mock_user(user_id=USER_B_ID, name="User B")
    user_c = _make_mock_user(user_id=USER_C_ID, name="User C")

    memory_ok = _make_mock_memory()
    msgs = [_make_mock_message("user", "Algo interessante")]

    async def _get_memories(session: Any, uid: uuid.UUID) -> MagicMock | None:
        if uid == USER_B_ID:
            raise RuntimeError("DB connection lost for user B")
        return memory_ok

    llm_resp: dict[str, Any] = {
        "memory_updates": {},
        "new_knowledge_items": [],
        "updated_knowledge_items": [],
    }
    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(return_value=_make_llm_json_response(llm_resp))

    with (
        patch(f"{_C}.get_service_session", side_effect=_fake_service_session),
        patch(f"{_C}.UserRepository.get_users_by_timezone", new_callable=AsyncMock, return_value=[user_a, user_b, user_c]),
        patch(f"{_C}.MemoryRepository.get_user_memories", new_callable=AsyncMock, side_effect=_get_memories),
        patch(f"{_C}.ChatRepository.get_messages_since", new_callable=AsyncMock, return_value=msgs),
        patch(f"{_C}.MemoryRepository.search_knowledge", new_callable=AsyncMock, return_value=[]),
        patch(f"{_C}.check_contradictions", new_callable=AsyncMock, return_value=[]),
        patch(f"{_C}.create_llm", return_value=mock_llm),
        patch(f"{_C}.MemoryRepository.update_user_memories", new_callable=AsyncMock),
        patch(f"{_C}.MemoryRepository.create_knowledge", new_callable=AsyncMock),
        patch(f"{_C}.MemoryRepository.update_knowledge", new_callable=AsyncMock),
        patch(f"{_C}.MemoryRepository.supersede_knowledge", new_callable=AsyncMock),
        patch(f"{_C}.MemoryRepository.create_consolidation_log", new_callable=AsyncMock) as mock_log,
        patch(f"{_C}.get_settings", return_value=MagicMock()),
    ):
        result = await run_consolidation("America/Sao_Paulo")

    assert result.users_processed == 3
    assert result.users_consolidated == 2
    assert result.errors == 1

    # _log_consolidation called with status="failed" for failing user
    failed_calls = [
        c for c in mock_log.call_args_list
        if c[0][1].get("status") == "failed"
    ]
    assert len(failed_calls) == 1


# ---------------------------------------------------------------------------
# #12 — Consolidation log created with correct counts
# ---------------------------------------------------------------------------


async def test_consolidation_log_created_correctly() -> None:
    from app.workers.consolidation_prompt import ConsolidationResponse

    resp = ConsolidationResponse.model_validate(_STANDARD_LLM_RESPONSE)

    with (
        patch(f"{_C}.get_service_session", side_effect=_fake_service_session),
        patch(f"{_C}.MemoryRepository.create_consolidation_log", new_callable=AsyncMock) as mock_create_log,
    ):
        await _log_consolidation(
            USER_A_ID,
            status="completed",
            consolidated_from=_dt.datetime(2026, 1, 1, tzinfo=_UTC),
            consolidated_to=_dt.datetime(2026, 1, 2, tzinfo=_UTC),
            messages_processed=5,
            result=resp,
            raw_output=json.dumps(_STANDARD_LLM_RESPONSE),
        )

    mock_create_log.assert_called_once()
    data = mock_create_log.call_args[0][1]

    # Standard response: 2 new items, 1 updated, 1 inference (insight with inferenceEvidence)
    assert data["facts_created"] == 2
    assert data["facts_updated"] == 1
    assert data["inferences_created"] == 1
    assert data["messages_processed"] == 5
    assert data["status"] == "completed"
    assert data["user_id"] == USER_A_ID


# ---------------------------------------------------------------------------
# Bonus: _resolve_priority 3-tier logic
# ---------------------------------------------------------------------------


def test_resolve_priority_validated_wins() -> None:
    """Validated item wins regardless of confidence or recency."""
    older = _make_knowledge_item(confidence=0.7, validated=True)
    newer = _make_knowledge_item(confidence=0.95, validated=False)

    keep, supersede = _resolve_priority(newer, older)
    assert keep is older
    assert supersede is newer


def test_resolve_priority_higher_confidence_wins() -> None:
    """When neither is validated, higher confidence wins."""
    older = _make_knowledge_item(confidence=0.95, validated=False)
    newer = _make_knowledge_item(confidence=0.7, validated=False)

    keep, supersede = _resolve_priority(newer, older)
    assert keep is older
    assert supersede is newer


def test_resolve_priority_recency_wins_as_tiebreaker() -> None:
    """When both have same confidence and validation, newer wins."""
    older = _make_knowledge_item(confidence=0.9, validated=False)
    newer = _make_knowledge_item(confidence=0.9, validated=False)

    keep, supersede = _resolve_priority(newer, older)
    assert keep is newer
    assert supersede is older
