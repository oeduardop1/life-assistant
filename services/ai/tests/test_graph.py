"""Tests for the LangGraph chat graph — app/agents/graph.py."""

from __future__ import annotations

from typing import TYPE_CHECKING
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from langchain_core.messages import AIMessage, HumanMessage, ToolMessage
from langgraph.checkpoint.memory import InMemorySaver

from app.agents.graph import build_chat_graph

if TYPE_CHECKING:
    from app.agents.state import AgentState


def _make_mock_llm() -> MagicMock:
    """Create a mock LLM that returns a simple AI message and supports bind_tools."""
    mock_llm = MagicMock()
    mock_bound = AsyncMock()
    mock_bound.ainvoke = AsyncMock(return_value=AIMessage(content="Tudo bem! Como vai?"))
    mock_llm.bind_tools = MagicMock(return_value=mock_bound)
    return mock_llm


def _make_mock_triage_llm() -> MagicMock:
    """Create a mock triage LLM for build_chat_graph."""
    from app.agents.triage import TriageDecision

    decision = TriageDecision(agent="general", confidence=0.95)
    mock_router = AsyncMock()
    mock_router.ainvoke = AsyncMock(return_value=decision)

    mock_llm = MagicMock()
    mock_llm.with_structured_output = MagicMock(return_value=mock_router)
    return mock_llm


@pytest.mark.asyncio
async def test_graph_builds_and_compiles() -> None:
    """build_chat_graph should return a compiled graph with expected nodes."""
    checkpointer = InMemorySaver()
    mock_llm = _make_mock_llm()
    mock_triage = _make_mock_triage_llm()
    graph = build_chat_graph(mock_llm, mock_triage, checkpointer)  # type: ignore[arg-type]

    # The compiled graph should have nodes for triage, agent, tools, and save_response
    node_names = set(graph.get_graph().nodes.keys())
    assert "triage" in node_names
    assert "agent" in node_names
    assert "tools" in node_names
    assert "save_response" in node_names


@pytest.mark.asyncio
async def test_graph_execution_with_mocked_llm() -> None:
    """Full graph execution: triage → agent → save_response with mocked LLM."""
    mock_llm = _make_mock_llm()
    mock_triage = _make_mock_triage_llm()
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

    with patch(
        "app.agents.save_response.get_user_session",
        return_value=mock_session_cm,
    ):
        graph = build_chat_graph(mock_llm, mock_triage, checkpointer)  # type: ignore[arg-type]

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


@pytest.mark.asyncio
async def test_loop_guard_breaks_write_tool_re_call() -> None:
    """If the LLM re-calls a WRITE tool that just succeeded, the loop guard forces text."""
    call_count = 0

    async def _mock_invoke(messages: list, config: dict) -> AIMessage:  # type: ignore[type-arg]
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            # First call: LLM wants to call record_metric
            return AIMessage(
                content="",
                tool_calls=[
                    {
                        "name": "record_metric",
                        "args": {"metric_type": "water", "value": 2000},
                        "id": "tc-1",
                    }
                ],
            )
        # Second call (after tool result): LLM tries to re-call record_metric (bug)
        return AIMessage(
            content="",
            tool_calls=[
                {
                    "name": "record_metric",
                    "args": {"metric_type": "water", "value": 2000},
                    "id": "tc-2",
                }
            ],
        )

    mock_llm = MagicMock()
    mock_bound = AsyncMock()
    mock_bound.ainvoke = AsyncMock(side_effect=_mock_invoke)
    mock_llm.bind_tools = MagicMock(return_value=mock_bound)

    mock_triage = _make_mock_triage_llm()
    checkpointer = InMemorySaver()

    mock_session = AsyncMock()
    mock_session.add = MagicMock()
    mock_session.flush = AsyncMock()
    mock_session_cm = AsyncMock()
    mock_session_cm.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session_cm.__aexit__ = AsyncMock(return_value=None)

    input_state: AgentState = {
        "messages": [
            HumanMessage(content="Registra 2L de agua"),
            AIMessage(
                content="",
                tool_calls=[
                    {
                        "name": "record_metric",
                        "args": {"metric_type": "water", "value": 2000},
                        "id": "tc-0",
                    }
                ],
            ),
            ToolMessage(
                content='{"success": true, "message": "Registrado: água = 2000.0 ml"}',
                tool_call_id="tc-0",
                name="record_metric",
            ),
        ],
        "user_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "conversation_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        "current_agent": None,
    }

    config = {
        "configurable": {
            "thread_id": "cccccccc-cccc-cccc-cccc-cccccccccccc",
            "session_factory": MagicMock(),
            "system_prompt": "Você é uma assistente.",
        }
    }

    with patch("app.agents.save_response.get_user_session", return_value=mock_session_cm):
        graph = build_chat_graph(mock_llm, mock_triage, checkpointer)  # type: ignore[arg-type]

        events = []
        async for event in graph.astream(input_state, config, stream_mode="values"):
            events.append(event)

    # The loop guard should have fired on the first call (LLM re-calls record_metric
    # after seeing ToolMessage from record_metric), breaking the loop with text
    last_state = events[-1]
    messages = last_state["messages"]
    last_ai = [m for m in messages if isinstance(m, AIMessage)][-1]

    # Should have text content (extracted from tool result), NOT tool_calls
    assert last_ai.content == "Registrado: água = 2000.0 ml"
    assert not getattr(last_ai, "tool_calls", None)
