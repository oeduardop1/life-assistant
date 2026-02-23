"""Side-effect node that persists the assistant message to the database."""

from __future__ import annotations

import logging
import uuid
from typing import TYPE_CHECKING

from langchain_core.messages import AIMessage

from app.config import get_settings
from app.db.repositories.chat import ChatRepository
from app.db.session import get_user_session

if TYPE_CHECKING:
    from langchain_core.runnables import RunnableConfig

    from app.agents.state import AgentState
    from app.db.engine import AsyncSessionFactory

logger = logging.getLogger(__name__)


async def save_response(state: AgentState, config: RunnableConfig) -> dict[str, object]:
    """LangGraph node: persist the last assistant message to the database.

    Accesses ``session_factory`` from ``config["configurable"]`` and creates
    an RLS-scoped session for the user.

    Returns an empty dict — no new messages are added to the graph state.
    """
    # Find the last AI message
    last_ai_message: AIMessage | None = None
    for msg in reversed(state["messages"]):
        if isinstance(msg, AIMessage):
            last_ai_message = msg
            break

    if last_ai_message is None or not last_ai_message.content:
        logger.warning("save_response: no AI message to persist")
        return {}

    # Skip save when silently rejecting a pending interrupt (unrelated message flow).
    # The new flow will generate a single combined response instead.
    if config["configurable"].get("skip_save_response"):
        logger.info("save_response: skipped (silent rejection)")
        return {}

    session_factory: AsyncSessionFactory = config["configurable"]["session_factory"]
    user_id = state["user_id"]
    conversation_id = state["conversation_id"]

    settings = get_settings()

    async with get_user_session(session_factory, user_id) as session:
        # Gemini returns content as a list of blocks:
        # [{"type": "text", "text": "..."}] — extract plain text.
        raw = last_ai_message.content
        if isinstance(raw, str):
            content = raw
        elif isinstance(raw, list):
            content = "".join(
                block.get("text", "") if isinstance(block, dict) else str(block) for block in raw
            )
        else:
            content = str(raw)
        await ChatRepository.create_message(
            session,
            {
                "id": uuid.uuid4(),
                "conversation_id": uuid.UUID(conversation_id),
                "role": "assistant",
                "content": content,
                "message_metadata": {
                    "provider": settings.LLM_PROVIDER,
                    "model": settings.LLM_MODEL,
                    "source": "python_ai",
                },
            },
        )

    logger.info("Saved assistant message for conversation %s", conversation_id)
    return {}
