"""LangGraph chat graph builder — multi-agent with triage + domain routing.

M4.7: Replaces the single-agent graph with a triage → dynamic dispatch
architecture. A fast triage LLM classifies user intent, then the agent
node dynamically selects tools and prompt extension per domain.
"""

from typing import Any

from langchain_core.language_models.chat_models import BaseChatModel
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from langgraph.graph.state import CompiledStateGraph

from app.agents.registry import build_domain_registry
from app.agents.triage import make_triage_node
from app.tools.common.agent_factory import build_multi_agent_graph


def build_chat_graph(
    llm: BaseChatModel,
    triage_llm: BaseChatModel,
    checkpointer: AsyncPostgresSaver,
) -> CompiledStateGraph[Any]:
    """Build and compile the multi-agent chat graph.

    Flow: START → triage → agent → should_continue → tools → agent (loop)
                                                    ↘ save_response → END

    Parameters
    ----------
    llm:
        Main LLM for domain agents (e.g. gemini-2.5-flash).
    triage_llm:
        Fast LLM for triage classification (e.g. gemini-flash-latest).
    checkpointer:
        LangGraph checkpoint persistence.
    """
    triage_node = make_triage_node(triage_llm)
    domain_registry = build_domain_registry()

    return build_multi_agent_graph(llm, triage_node, domain_registry, checkpointer)
