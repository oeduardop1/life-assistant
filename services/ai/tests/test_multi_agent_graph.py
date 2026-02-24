"""Tests for the multi-agent graph — build_multi_agent_graph in agent_factory.py."""

from __future__ import annotations

from typing import TYPE_CHECKING
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from langchain_core.messages import AIMessage, HumanMessage, ToolMessage
from langgraph.checkpoint.memory import InMemorySaver

from app.agents.registry import DomainConfig
from app.tools.common.agent_factory import build_multi_agent_graph

if TYPE_CHECKING:
    from langchain_core.runnables import RunnableConfig

    from app.agents.state import AgentState


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_mock_llm(response_content: str = "Tudo bem! Como vai?") -> MagicMock:
    """Create a mock LLM that returns a simple AI message and supports bind_tools."""
    mock_llm = MagicMock()
    mock_bound = AsyncMock()
    mock_bound.ainvoke = AsyncMock(return_value=AIMessage(content=response_content))
    mock_llm.bind_tools = MagicMock(return_value=mock_bound)
    return mock_llm


def _make_triage_node(agent: str = "general"):
    """Create a mock triage node that always returns the given agent."""

    async def triage_node(state: AgentState, config: RunnableConfig) -> dict[str, str]:
        return {"current_agent": agent}

    return triage_node


def _make_minimal_registry() -> dict[str, DomainConfig]:
    """Create a minimal registry with no tools for testing."""
    return {
        "general": DomainConfig(
            tools=[],
            write_tools=set(),
            prompt_extension="\n## General mode\n",
        ),
        "tracking": DomainConfig(
            tools=[],
            write_tools=set(),
            prompt_extension="\n## Tracking mode\n",
        ),
        "finance": DomainConfig(
            tools=[],
            write_tools=set(),
            prompt_extension="\n## Finance mode\n",
        ),
        "memory": DomainConfig(
            tools=[],
            write_tools=set(),
            prompt_extension="\n## Memory mode\n",
        ),
        "wellbeing": DomainConfig(
            tools=[],
            write_tools=set(),
            prompt_extension="\n## Wellbeing mode\n",
        ),
    }


def _make_config(thread_id: str = "test-thread") -> dict:
    return {
        "configurable": {
            "thread_id": thread_id,
            "session_factory": MagicMock(),
            "system_prompt": "Você é uma assistente de vida.",
        }
    }


def _make_input_state(content: str = "Oi, tudo bem?") -> AgentState:
    return {
        "messages": [HumanMessage(content=content)],
        "user_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "conversation_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        "current_agent": None,
    }


# ---------------------------------------------------------------------------
# Build tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_multi_agent_graph_has_expected_nodes() -> None:
    """Graph should have triage, agent, tools, and save_response nodes."""
    mock_llm = _make_mock_llm()
    checkpointer = InMemorySaver()
    registry = _make_minimal_registry()

    graph = build_multi_agent_graph(
        mock_llm, _make_triage_node(), registry, checkpointer
    )

    node_names = set(graph.get_graph().nodes.keys())
    assert "triage" in node_names
    assert "agent" in node_names
    assert "tools" in node_names
    assert "save_response" in node_names


# ---------------------------------------------------------------------------
# Routing tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_routes_to_general_agent() -> None:
    """Messages triaged to 'general' get a response from the general agent."""
    mock_llm = _make_mock_llm("Bom dia! Como posso ajudar?")
    checkpointer = InMemorySaver()
    registry = _make_minimal_registry()

    mock_session_cm = AsyncMock()
    mock_session_cm.__aenter__ = AsyncMock(return_value=AsyncMock())
    mock_session_cm.__aexit__ = AsyncMock(return_value=None)

    with patch("app.agents.save_response.get_user_session", return_value=mock_session_cm):
        graph = build_multi_agent_graph(
            mock_llm, _make_triage_node("general"), registry, checkpointer
        )
        events = []
        async for event in graph.astream(
            _make_input_state("Bom dia!"),
            _make_config(),
            stream_mode="values",
        ):
            events.append(event)

    last_state = events[-1]
    ai_messages = [m for m in last_state["messages"] if isinstance(m, AIMessage)]
    assert ai_messages[-1].content == "Bom dia! Como posso ajudar?"
    assert last_state.get("current_agent") == "general"


@pytest.mark.asyncio
async def test_routes_to_tracking_agent() -> None:
    """Messages triaged to 'tracking' use tracking prompt extension."""
    invoked_prompts: list[str] = []

    async def capture_prompt(messages, config):
        # Capture the system prompt passed to LLM
        invoked_prompts.append(messages[0].content)
        return AIMessage(content="Registrei 2L de água!")

    mock_llm = MagicMock()
    mock_bound = AsyncMock()
    mock_bound.ainvoke = AsyncMock(side_effect=capture_prompt)
    mock_llm.bind_tools = MagicMock(return_value=mock_bound)

    checkpointer = InMemorySaver()
    registry = _make_minimal_registry()

    mock_session_cm = AsyncMock()
    mock_session_cm.__aenter__ = AsyncMock(return_value=AsyncMock())
    mock_session_cm.__aexit__ = AsyncMock(return_value=None)

    with patch("app.agents.save_response.get_user_session", return_value=mock_session_cm):
        graph = build_multi_agent_graph(
            mock_llm, _make_triage_node("tracking"), registry, checkpointer
        )
        events = []
        async for event in graph.astream(
            _make_input_state("Registra 2L de agua"),
            _make_config(),
            stream_mode="values",
        ):
            events.append(event)

    # Verify the prompt includes the tracking extension
    assert len(invoked_prompts) >= 1
    assert "## Tracking mode" in invoked_prompts[0]


@pytest.mark.asyncio
async def test_routes_to_wellbeing_agent() -> None:
    """Messages triaged to 'wellbeing' use wellbeing (counselor) prompt extension."""
    invoked_prompts: list[str] = []

    async def capture_prompt(messages, config):
        invoked_prompts.append(messages[0].content)
        return AIMessage(content="Entendo como você se sente...")

    mock_llm = MagicMock()
    mock_bound = AsyncMock()
    mock_bound.ainvoke = AsyncMock(side_effect=capture_prompt)
    mock_llm.bind_tools = MagicMock(return_value=mock_bound)

    checkpointer = InMemorySaver()
    registry = _make_minimal_registry()

    mock_session_cm = AsyncMock()
    mock_session_cm.__aenter__ = AsyncMock(return_value=AsyncMock())
    mock_session_cm.__aexit__ = AsyncMock(return_value=None)

    with patch("app.agents.save_response.get_user_session", return_value=mock_session_cm):
        graph = build_multi_agent_graph(
            mock_llm, _make_triage_node("wellbeing"), registry, checkpointer
        )
        events = []
        async for event in graph.astream(
            _make_input_state("Estou ansioso"),
            _make_config(),
            stream_mode="values",
        ):
            events.append(event)

    assert len(invoked_prompts) >= 1
    assert "## Wellbeing mode" in invoked_prompts[0]


# ---------------------------------------------------------------------------
# Fallback tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_fallback_on_triage_failure() -> None:
    """If triage fails (returns unknown agent), falls back to general."""

    async def bad_triage(state: AgentState, config: RunnableConfig) -> dict[str, str]:
        return {"current_agent": "nonexistent_domain"}

    mock_llm = _make_mock_llm("Olá!")
    checkpointer = InMemorySaver()
    registry = _make_minimal_registry()

    mock_session_cm = AsyncMock()
    mock_session_cm.__aenter__ = AsyncMock(return_value=AsyncMock())
    mock_session_cm.__aexit__ = AsyncMock(return_value=None)

    with patch("app.agents.save_response.get_user_session", return_value=mock_session_cm):
        graph = build_multi_agent_graph(
            mock_llm, bad_triage, registry, checkpointer
        )
        events = []
        async for event in graph.astream(
            _make_input_state("Oi"),
            _make_config("fallback-thread"),
            stream_mode="values",
        ):
            events.append(event)

    # Should still produce a response (falls back to general)
    last_state = events[-1]
    ai_messages = [m for m in last_state["messages"] if isinstance(m, AIMessage)]
    assert len(ai_messages) >= 1


# ---------------------------------------------------------------------------
# Loop guard test (multi-agent version)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_loop_guard_in_multi_agent_graph() -> None:
    """Loop guard breaks WRITE tool re-call in multi-agent graph."""
    call_count = 0

    async def _mock_invoke(messages, config):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return AIMessage(
                content="",
                tool_calls=[
                    {
                        "name": "record_metric",
                        "args": {"type": "water", "value": 2000},
                        "id": "tc-1",
                    }
                ],
            )
        return AIMessage(
            content="",
            tool_calls=[
                {
                    "name": "record_metric",
                    "args": {"type": "water", "value": 2000},
                    "id": "tc-2",
                }
            ],
        )

    mock_llm = MagicMock()
    mock_bound = AsyncMock()
    mock_bound.ainvoke = AsyncMock(side_effect=_mock_invoke)
    mock_llm.bind_tools = MagicMock(return_value=mock_bound)

    checkpointer = InMemorySaver()

    # Create a mock tool so ConfirmableToolNode can find it
    mock_tool = MagicMock()
    mock_tool.name = "record_metric"
    mock_tool.ainvoke = AsyncMock(
        return_value=ToolMessage(
            content='{"success": true, "message": "Registrado: água = 2000.0 ml"}',
            tool_call_id="tc-1",
            name="record_metric",
        )
    )

    registry = {
        "tracking": DomainConfig(
            tools=[mock_tool],
            write_tools={"record_metric"},
            prompt_extension="\n## Tracking\n",
        ),
        "general": DomainConfig(tools=[], write_tools=set(), prompt_extension=""),
    }

    mock_session_cm = AsyncMock()
    mock_session_cm.__aenter__ = AsyncMock(return_value=AsyncMock())
    mock_session_cm.__aexit__ = AsyncMock(return_value=None)

    input_state: AgentState = {
        "messages": [
            HumanMessage(content="Registra 2L de agua"),
            AIMessage(
                content="",
                tool_calls=[
                    {
                        "name": "record_metric",
                        "args": {"type": "water", "value": 2000},
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
        "current_agent": "tracking",
    }

    with patch("app.agents.save_response.get_user_session", return_value=mock_session_cm):
        graph = build_multi_agent_graph(
            mock_llm, _make_triage_node("tracking"), registry, checkpointer
        )
        events = []
        async for event in graph.astream(
            input_state, _make_config("loop-guard-thread"), stream_mode="values"
        ):
            events.append(event)

    last_state = events[-1]
    last_ai = [m for m in last_state["messages"] if isinstance(m, AIMessage)][-1]
    assert last_ai.content == "Registrado: água = 2000.0 ml"
    assert not getattr(last_ai, "tool_calls", None)
