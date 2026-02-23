"""LangGraph chat graph builder."""

from typing import Any

from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from langgraph.graph import END, START, StateGraph
from langgraph.graph.state import CompiledStateGraph

from app.agents.domains.general import general_agent
from app.agents.save_response import save_response
from app.agents.state import AgentState


def build_chat_graph(checkpointer: AsyncPostgresSaver) -> CompiledStateGraph[Any]:
    """Build and compile the chat StateGraph.

    Flow: START → general_agent → save_response → END

    The graph is compiled once at startup and reused for every invocation.
    Thread isolation is achieved via the ``thread_id`` in the config.
    """
    graph = StateGraph(AgentState)
    graph.add_node("general_agent", general_agent)
    graph.add_node("save_response", save_response)
    graph.add_edge(START, "general_agent")
    graph.add_edge("general_agent", "save_response")
    graph.add_edge("save_response", END)
    return graph.compile(checkpointer=checkpointer)
