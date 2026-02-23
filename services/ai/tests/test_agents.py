"""Tests for agent state, general agent, and save_response nodes."""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from langchain_core.messages import AIMessage, HumanMessage

from app.agents.domains.general import general_agent
from app.agents.save_response import save_response
from app.agents.state import AgentState


def test_agent_state_has_correct_keys() -> None:
    """AgentState TypedDict must have the expected keys."""
    expected_keys = {"messages", "user_id", "conversation_id", "current_agent"}
    assert set(AgentState.__annotations__.keys()) == expected_keys


@pytest.mark.asyncio
async def test_general_agent_calls_llm_with_system_prompt() -> None:
    """general_agent node should call LLM with system prompt + messages."""
    mock_response = AIMessage(content="Olá! Como posso ajudar?")
    mock_llm = AsyncMock()
    mock_llm.ainvoke = AsyncMock(return_value=mock_response)

    state: AgentState = {
        "messages": [HumanMessage(content="Oi")],
        "user_id": "test-user",
        "conversation_id": "test-conv",
        "current_agent": None,
    }
    config = {
        "configurable": {
            "system_prompt": "Você é uma assistente de vida.",
            "thread_id": "test-conv",
        }
    }

    with patch("app.agents.domains.general.create_llm", return_value=mock_llm):
        result = await general_agent(state, config)  # type: ignore[arg-type]

    assert "messages" in result
    assert len(result["messages"]) == 1
    assert isinstance(result["messages"][0], AIMessage)
    assert result["messages"][0].content == "Olá! Como posso ajudar?"

    # Verify LLM was called with system prompt as first message
    call_args = mock_llm.ainvoke.call_args
    messages = call_args[0][0]
    assert messages[0].content == "Você é uma assistente de vida."
    assert messages[1].content == "Oi"


@pytest.mark.asyncio
async def test_save_response_persists_assistant_message() -> None:
    """save_response node should extract the last AI message and save to DB."""
    mock_session = AsyncMock()
    mock_session.add = MagicMock()
    mock_session.flush = AsyncMock()

    # Mock context manager for get_user_session
    mock_session_cm = AsyncMock()
    mock_session_cm.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session_cm.__aexit__ = AsyncMock(return_value=None)

    mock_session_factory = MagicMock()

    state: AgentState = {
        "messages": [
            HumanMessage(content="Oi"),
            AIMessage(content="Olá! Como posso ajudar?"),
        ],
        "user_id": str(uuid.uuid4()),
        "conversation_id": str(uuid.uuid4()),
        "current_agent": None,
    }
    config = {
        "configurable": {
            "session_factory": mock_session_factory,
            "thread_id": state["conversation_id"],
        }
    }

    with patch("app.agents.save_response.get_user_session", return_value=mock_session_cm):
        result = await save_response(state, config)  # type: ignore[arg-type]

    # save_response returns empty dict (no new messages)
    assert result == {}
    # Session should have had add() called for the new message
    mock_session.add.assert_called_once()
    added_obj = mock_session.add.call_args[0][0]
    assert added_obj.role == "assistant"
    assert added_obj.content == "Olá! Como posso ajudar?"


@pytest.mark.asyncio
async def test_save_response_handles_no_ai_message() -> None:
    """save_response should return empty dict when no AI message exists."""
    state: AgentState = {
        "messages": [HumanMessage(content="Oi")],
        "user_id": str(uuid.uuid4()),
        "conversation_id": str(uuid.uuid4()),
        "current_agent": None,
    }
    config = {
        "configurable": {
            "session_factory": MagicMock(),
            "thread_id": state["conversation_id"],
        }
    }

    result = await save_response(state, config)  # type: ignore[arg-type]
    assert result == {}
