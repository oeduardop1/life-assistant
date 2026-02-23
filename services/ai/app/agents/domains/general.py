"""General conversational agent node (no tools)."""

from typing import Any

from langchain_core.messages import SystemMessage
from langchain_core.runnables import RunnableConfig

from app.agents.llm import create_llm
from app.agents.state import AgentState
from app.config import get_settings


async def general_agent(state: AgentState, config: RunnableConfig) -> dict[str, list[Any]]:
    """LangGraph node: invoke the LLM with the system prompt and conversation messages.

    The system prompt is passed via ``config["configurable"]["system_prompt"]``
    so that the graph builder does not need to know about prompt construction.

    ``config`` is forwarded to ``ainvoke`` so that streaming propagates correctly.
    """
    system_prompt: str = config["configurable"]["system_prompt"]
    settings = get_settings()
    llm = create_llm(settings)

    messages = [SystemMessage(content=system_prompt), *state["messages"]]
    response = await llm.ainvoke(messages, config)

    return {"messages": [response]}
