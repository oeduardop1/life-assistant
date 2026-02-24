"""Factory for domain agent graphs with confirmation support.

Creates a LangGraph ``CompiledStateGraph`` that routes between an LLM
"agent" node, a ``ConfirmableToolNode``, and a ``save_response`` node.

Reusable by tracking (M4.4), finance (M4.5), memory (M4.6), etc.

M4.7 adds ``build_multi_agent_graph`` with triage → dynamic dispatch.
"""

from __future__ import annotations

import json
import logging
from typing import TYPE_CHECKING, Any

from langchain_core.messages import AIMessage, SystemMessage, ToolMessage
from langgraph.graph import END, START, StateGraph

from app.agents.save_response import save_response
from app.agents.state import AgentState  # runtime: used as StateGraph schema
from app.tools.common.confirmable_tool_node import ConfirmableToolNode

if TYPE_CHECKING:
    from collections.abc import Callable

    from langchain_core.language_models.chat_models import BaseChatModel
    from langchain_core.runnables import RunnableConfig
    from langchain_core.tools import BaseTool
    from langgraph.checkpoint.base import BaseCheckpointSaver
    from langgraph.graph.state import CompiledStateGraph

    from app.agents.registry import DomainConfig

logger = logging.getLogger(__name__)


def build_domain_agent_graph(
    llm: BaseChatModel,
    tools: list[BaseTool],
    write_tools: set[str],
    checkpointer: BaseCheckpointSaver,  # type: ignore[type-arg]
) -> CompiledStateGraph[Any]:
    """Build a domain agent graph with tool confirmation.

    Graph::

        START → agent → should_continue → tools → agent  (loop)
                                        ↘ save_response → END

    - If the agent returns ``tool_calls`` → ``tools`` node
      (``ConfirmableToolNode`` handles READ vs WRITE).
    - If the agent returns text → ``save_response`` → END.
    - After tools execute, control returns to the agent so the LLM can
      see tool results and decide the next step.

    .. deprecated::
        Use ``build_multi_agent_graph`` (M4.7) for new code. Kept for
        backward compatibility.
    """
    tool_node = ConfirmableToolNode(tools, write_tools)
    llm_with_tools = llm.bind_tools(tools)

    async def agent_node(state: AgentState, config: RunnableConfig) -> dict[str, Any]:
        system_prompt: str = config["configurable"]["system_prompt"]
        messages = [SystemMessage(content=system_prompt), *state["messages"]]
        response = await llm_with_tools.ainvoke(messages, config)

        # Loop guard: if the LLM re-calls a WRITE tool that just returned a
        # result, force a text-only response to break the cycle.
        if getattr(response, "tool_calls", None) and state["messages"]:
            prev = state["messages"][-1]
            if isinstance(prev, ToolMessage) and getattr(prev, "name", "") in write_tools:
                prev_name = prev.name
                new_names = {tc["name"] for tc in response.tool_calls}
                if prev_name in new_names:
                    logger.warning(
                        "Loop guard: LLM re-called write tool %s after it succeeded, "
                        "forcing text response",
                        prev_name,
                    )
                    text = response.content
                    if isinstance(text, list):
                        text = "".join(
                            b.get("text", "") if isinstance(b, dict) else str(b) for b in text
                        )
                    if not text:
                        try:
                            result = json.loads(str(prev.content))
                            text = result.get("message", "Pronto, registrado!")
                        except (json.JSONDecodeError, AttributeError):
                            text = "Pronto, registrado!"
                    response = AIMessage(content=text or "Pronto, registrado!")

        return {"messages": [response]}

    def should_continue(state: AgentState) -> str:
        last = state["messages"][-1]
        if hasattr(last, "tool_calls") and last.tool_calls:
            return "tools"
        return "save_response"

    graph = StateGraph(AgentState)
    graph.add_node("agent", agent_node)
    graph.add_node("tools", tool_node)
    graph.add_node("save_response", save_response)
    graph.add_edge(START, "agent")
    graph.add_conditional_edges(
        "agent",
        should_continue,
        {"tools": "tools", "save_response": "save_response"},
    )
    graph.add_edge("tools", "agent")
    graph.add_edge("save_response", END)
    return graph.compile(checkpointer=checkpointer)


# ---------------------------------------------------------------------------
# M4.7 — Multi-agent graph with triage + dynamic dispatch
# ---------------------------------------------------------------------------


def _dedupe_tools(
    domain_registry: dict[str, DomainConfig],
) -> tuple[list[BaseTool], set[str]]:
    """Collect all unique tools and write-tool names across domains."""
    seen: dict[str, BaseTool] = {}
    all_write: set[str] = set()
    for dc in domain_registry.values():
        for tool in dc.tools:
            if tool.name not in seen:
                seen[tool.name] = tool
        all_write |= dc.write_tools
    return list(seen.values()), all_write


def build_multi_agent_graph(
    llm: BaseChatModel,
    triage_node_fn: Callable[..., Any],
    domain_registry: dict[str, DomainConfig],
    checkpointer: BaseCheckpointSaver,  # type: ignore[type-arg]
) -> CompiledStateGraph[Any]:
    """Build the multi-agent graph with triage + dynamic domain dispatch.

    Graph::

        START → triage → agent → should_continue → tools → agent  (loop)
                                                  ↘ save_response → END

    The ``agent`` node dynamically selects tools and prompt extension based
    on ``state["current_agent"]`` (set by triage). LLMs are pre-bound per
    domain at build time for efficiency.

    Parameters
    ----------
    llm:
        The main LLM (e.g. gemini-2.5-flash) used for domain agents.
    triage_node_fn:
        Async callable from ``make_triage_node(triage_llm)`` that
        classifies user intent.
    domain_registry:
        Mapping from domain name to ``DomainConfig`` (tools + prompt).
    checkpointer:
        LangGraph checkpoint saver for persistence.
    """
    # Pre-bind LLMs per domain at build time (one bind_tools call per domain).
    # bind_tools returns a Runnable (not BaseChatModel), so use Any for the dict.
    # Even domains with no tools get bind_tools([]) to ensure consistent interface.
    bound_llms: dict[str, Any] = {
        name: llm.bind_tools(dc.tools) for name, dc in domain_registry.items()
    }

    # ConfirmableToolNode with ALL tools (deduped across domains)
    all_tools, all_write = _dedupe_tools(domain_registry)
    tool_node = ConfirmableToolNode(all_tools, all_write)

    async def agent_node(state: AgentState, config: RunnableConfig) -> dict[str, Any]:
        current = state.get("current_agent") or "general"
        dc = domain_registry.get(current, domain_registry["general"])

        # Build full prompt: core (from config) + domain extension
        system_prompt: str = config["configurable"]["system_prompt"]
        full_prompt = system_prompt + dc.prompt_extension

        messages = [SystemMessage(content=full_prompt), *state["messages"]]
        bound_llm = bound_llms.get(current) or bound_llms["general"]
        response = await bound_llm.ainvoke(messages, config)

        # Loop guard: if the LLM re-calls a WRITE tool that just returned a
        # result, force a text-only response to break the cycle.
        if getattr(response, "tool_calls", None) and state["messages"]:
            prev = state["messages"][-1]
            if isinstance(prev, ToolMessage) and getattr(prev, "name", "") in all_write:
                prev_name = prev.name
                new_names = {tc["name"] for tc in response.tool_calls}
                if prev_name in new_names:
                    logger.warning(
                        "Loop guard: LLM re-called write tool %s after it succeeded, "
                        "forcing text response",
                        prev_name,
                    )
                    text = response.content
                    if isinstance(text, list):
                        text = "".join(
                            b.get("text", "") if isinstance(b, dict) else str(b) for b in text
                        )
                    if not text:
                        try:
                            result = json.loads(str(prev.content))
                            text = result.get("message", "Pronto, registrado!")
                        except (json.JSONDecodeError, AttributeError):
                            text = "Pronto, registrado!"
                    response = AIMessage(content=text or "Pronto, registrado!")

        return {"messages": [response]}

    def should_continue(state: AgentState) -> str:
        last = state["messages"][-1]
        if hasattr(last, "tool_calls") and last.tool_calls:
            return "tools"
        return "save_response"

    graph = StateGraph(AgentState)
    graph.add_node("triage", triage_node_fn)
    graph.add_node("agent", agent_node)
    graph.add_node("tools", tool_node)
    graph.add_node("save_response", save_response)
    graph.add_edge(START, "triage")
    graph.add_edge("triage", "agent")
    graph.add_conditional_edges(
        "agent",
        should_continue,
        {"tools": "tools", "save_response": "save_response"},
    )
    graph.add_edge("tools", "agent")
    graph.add_edge("save_response", END)
    return graph.compile(checkpointer=checkpointer)
