"""Factory for domain agent graphs with confirmation support.

Creates a LangGraph ``CompiledStateGraph`` that routes between an LLM
"agent" node, a ``ConfirmableToolNode``, and a ``save_response`` node.

Reusable by tracking (M4.4), finance (M4.5), memory (M4.6), etc.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from langchain_core.messages import SystemMessage
from langgraph.graph import END, START, StateGraph

from app.agents.save_response import save_response
from app.agents.state import AgentState  # runtime: used as StateGraph schema
from app.tools.common.confirmable_tool_node import ConfirmableToolNode

if TYPE_CHECKING:
    from langchain_core.language_models.chat_models import BaseChatModel
    from langchain_core.runnables import RunnableConfig
    from langchain_core.tools import BaseTool
    from langgraph.checkpoint.base import BaseCheckpointSaver
    from langgraph.graph.state import CompiledStateGraph


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
    """
    tool_node = ConfirmableToolNode(tools, write_tools)
    llm_with_tools = llm.bind_tools(tools)

    async def agent_node(state: AgentState, config: RunnableConfig) -> dict[str, Any]:
        system_prompt: str = config["configurable"]["system_prompt"]
        messages = [SystemMessage(content=system_prompt), *state["messages"]]
        response = await llm_with_tools.ainvoke(messages, config)
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
