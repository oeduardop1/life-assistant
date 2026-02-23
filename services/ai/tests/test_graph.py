"""Tests for the LangGraph chat graph — app/agents/graph.py."""

from __future__ import annotations

from typing import TYPE_CHECKING
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from langchain_core.messages import AIMessage, HumanMessage
from langgraph.checkpoint.memory import InMemorySaver

from app.agents.graph import build_chat_graph

if TYPE_CHECKING:
    from app.agents.state import AgentState


@pytest.mark.asyncio
async def test_graph_builds_and_compiles() -> None:
    """build_chat_graph should return a compiled graph with expected nodes."""
    checkpointer = InMemorySaver()
    graph = build_chat_graph(checkpointer)  # type: ignore[arg-type]

    # The compiled graph should have nodes for general_agent and save_response
    node_names = set(graph.get_graph().nodes.keys())
    assert "general_agent" in node_names
    assert "save_response" in node_names


@pytest.mark.asyncio
async def test_graph_execution_with_mocked_llm() -> None:
    """Full graph execution: general_agent → save_response with mocked LLM."""
    mock_llm = AsyncMock()
    mock_llm.ainvoke = AsyncMock(return_value=AIMessage(content="Tudo bem! Como vai?"))

    checkpointer = InMemorySaver()

    # Mock save_response to avoid DB calls
    mock_session = AsyncMock()
    mock_session.add = MagicMock()
    mock_session.flush = AsyncMock()
    mock_session_cm = AsyncMock()
    mock_session_cm.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session_cm.__aexit__ = AsyncMock(return_value=None)

    mock_session_factory = MagicMock()

    input_state: AgentState = {
        "messages": [HumanMessage(content="Oi, tudo bem?")],
        "user_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "conversation_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        "current_agent": None,
    }

    config = {
        "configurable": {
            "thread_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
            "session_factory": mock_session_factory,
            "system_prompt": "Você é uma assistente de vida.",
        }
    }

    with (
        patch("app.agents.domains.general.create_llm", return_value=mock_llm),
        patch("app.agents.save_response.get_user_session", return_value=mock_session_cm),
    ):
        graph = build_chat_graph(checkpointer)  # type: ignore[arg-type]

        # Collect all streamed events
        events = []
        async for event in graph.astream(input_state, config, stream_mode="values"):
            events.append(event)

    # After execution, the last state should have the AI response
    assert len(events) > 0
    last_state = events[-1]
    messages = last_state["messages"]
    ai_messages = [m for m in messages if isinstance(m, AIMessage)]
    assert len(ai_messages) >= 1
    assert ai_messages[-1].content == "Tudo bem! Como vai?"
