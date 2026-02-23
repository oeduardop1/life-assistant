"""LangGraph chat graph builder — domain agent with tracking tools."""

from typing import Any

from langchain_core.language_models.chat_models import BaseChatModel
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from langgraph.graph.state import CompiledStateGraph

from app.agents.domains.tracking import TRACKING_TOOLS, TRACKING_WRITE_TOOLS
from app.tools.common.agent_factory import build_domain_agent_graph


def build_chat_graph(
    llm: BaseChatModel, checkpointer: AsyncPostgresSaver
) -> CompiledStateGraph[Any]:
    """Build and compile the chat StateGraph with tracking tools.

    Flow: START → agent → should_continue → tools → agent  (loop)
                                           ↘ save_response → END

    The graph is compiled once at startup and reused for every invocation.
    Thread isolation is achieved via the ``thread_id`` in the config.
    """
    return build_domain_agent_graph(llm, TRACKING_TOOLS, TRACKING_WRITE_TOOLS, checkpointer)
