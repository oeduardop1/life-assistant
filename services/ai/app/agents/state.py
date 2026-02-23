"""Agent state definition for LangGraph."""

from typing import Annotated, Any, TypedDict

from langgraph.graph.message import add_messages


class AgentState(TypedDict):
    """Shared state for all LangGraph agent nodes.

    ``messages`` uses the ``add_messages`` reducer so that each node only
    needs to return new messages — the reducer handles appending and
    deduplication via message IDs.
    """

    messages: Annotated[list[Any], add_messages]
    user_id: str
    conversation_id: str
    current_agent: str | None  # For M4.7 multi-agent routing
