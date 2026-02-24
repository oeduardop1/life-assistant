"""Tests for the triage node — app/agents/triage.py."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest
from langchain_core.messages import HumanMessage

from app.agents.triage import TriageDecision, make_triage_node


def _make_triage_llm(agent: str = "general", confidence: float = 0.95) -> MagicMock:
    """Create a mock LLM that returns a TriageDecision via with_structured_output."""
    decision = TriageDecision(agent=agent, confidence=confidence)

    mock_router = AsyncMock()
    mock_router.ainvoke = AsyncMock(return_value=decision)

    mock_llm = MagicMock()
    mock_llm.with_structured_output = MagicMock(return_value=mock_router)
    return mock_llm


def _make_state(content: str) -> dict:
    return {
        "messages": [HumanMessage(content=content)],
        "user_id": "test-user",
        "conversation_id": "test-conv",
        "current_agent": None,
    }


def _config() -> dict:
    return {"configurable": {"thread_id": "test"}}


# ---------------------------------------------------------------------------
# Classification tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("message", "expected_agent"),
    [
        # Tracking
        ("Registra 2L de agua", "tracking"),
        ("Dormi 7 horas ontem", "tracking"),
        ("Quanto peso eu registrei essa semana?", "tracking"),
        ("Fiz musculação hoje", "tracking"),
        ("Meu humor tá 8 hoje", "tracking"),
        # Finance
        ("Quanto gastei este mes?", "finance"),
        ("Preciso pagar a conta de luz", "finance"),
        ("Quais são minhas dívidas?", "finance"),
        ("Registra um gasto de 50 reais em comida", "finance"),
        # Memory
        ("O que voce sabe sobre mim?", "memory"),
        ("Lembra que eu gosto de café", "memory"),
        ("O que eu te contei sobre meu trabalho?", "memory"),
        # Wellbeing
        ("Estou me sentindo ansioso", "wellbeing"),
        ("Tô estressado com o trabalho", "wellbeing"),
        ("Me sinto triste hoje", "wellbeing"),
        ("Preciso desabafar", "wellbeing"),
        # General
        ("Bom dia!", "general"),
        ("Me conta uma curiosidade", "general"),
        ("Oi, tudo bem?", "general"),
        ("Qual a capital da França?", "general"),
    ],
)
async def test_triage_classification(message: str, expected_agent: str) -> None:
    """Triage routes messages to the correct domain."""
    mock_llm = _make_triage_llm(agent=expected_agent)
    triage_node = make_triage_node(mock_llm)

    result = await triage_node(_make_state(message), _config())

    assert result == {"current_agent": expected_agent}
    # Verify with_structured_output was called with TriageDecision
    mock_llm.with_structured_output.assert_called_once_with(TriageDecision)


# ---------------------------------------------------------------------------
# Error fallback tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_triage_fallback_on_llm_error() -> None:
    """Triage falls back to 'general' when the LLM raises an exception."""
    mock_router = AsyncMock()
    mock_router.ainvoke = AsyncMock(side_effect=RuntimeError("LLM error"))

    mock_llm = MagicMock()
    mock_llm.with_structured_output = MagicMock(return_value=mock_router)

    triage_node = make_triage_node(mock_llm)
    result = await triage_node(_make_state("Registra 2L de agua"), _config())

    assert result == {"current_agent": "general"}


@pytest.mark.asyncio
async def test_triage_fallback_on_timeout() -> None:
    """Triage falls back to 'general' on timeout (simulated as exception)."""
    mock_router = AsyncMock()
    mock_router.ainvoke = AsyncMock(side_effect=TimeoutError("Triage timeout"))

    mock_llm = MagicMock()
    mock_llm.with_structured_output = MagicMock(return_value=mock_router)

    triage_node = make_triage_node(mock_llm)
    result = await triage_node(_make_state("Oi"), _config())

    assert result == {"current_agent": "general"}


# ---------------------------------------------------------------------------
# Structural tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_triage_does_not_add_messages() -> None:
    """Triage node only sets current_agent, never adds messages."""
    mock_llm = _make_triage_llm(agent="tracking")
    triage_node = make_triage_node(mock_llm)

    result = await triage_node(_make_state("Registra 80kg"), _config())

    assert "messages" not in result
    assert "current_agent" in result


@pytest.mark.asyncio
async def test_triage_decision_model_validates_agent() -> None:
    """TriageDecision rejects invalid agent values."""
    with pytest.raises(Exception):  # noqa: B017
        TriageDecision(agent="invalid_domain", confidence=0.9)  # type: ignore[arg-type]


def test_triage_decision_model_validates_confidence() -> None:
    """TriageDecision rejects confidence outside [0, 1]."""
    with pytest.raises(Exception):  # noqa: B017
        TriageDecision(agent="general", confidence=1.5)

    with pytest.raises(Exception):  # noqa: B017
        TriageDecision(agent="general", confidence=-0.1)
