"""Chat endpoint — POST /chat/invoke with SSE streaming."""

from __future__ import annotations

import json
import logging
import uuid
from typing import TYPE_CHECKING, Any

from fastapi import APIRouter, Request
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from app.db.repositories.chat import ChatRepository
from app.db.session import get_user_session
from app.prompts.context_builder import build_context

if TYPE_CHECKING:
    from app.db.models.chat import Message

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatInvokeRequest(BaseModel):
    user_id: str
    conversation_id: str
    message: str


def convert_db_messages(db_messages: list[Message]) -> list[BaseMessage]:
    """Convert SQLAlchemy Message rows to LangChain message objects.

    Message IDs from the DB are preserved so that the ``add_messages``
    reducer can handle deduplication correctly.
    """
    result: list[BaseMessage] = []
    for msg in db_messages:
        msg_id = str(msg.id)
        if msg.role == "user":
            result.append(HumanMessage(content=msg.content, id=msg_id))
        elif msg.role == "assistant":
            result.append(AIMessage(content=msg.content, id=msg_id))
        elif msg.role == "system":
            result.append(SystemMessage(content=msg.content, id=msg_id))
    return result


@router.post("/invoke")
async def invoke_chat(request: Request, body: ChatInvokeRequest) -> EventSourceResponse:
    """Invoke the LangGraph chat agent and stream tokens back via SSE."""
    return EventSourceResponse(stream_chat_response(request, body))


async def stream_chat_response(
    request: Request, body: ChatInvokeRequest
) -> Any:
    """Async generator that streams SSE events from the LangGraph agent."""
    try:
        graph = request.app.state.graph
        checkpointer = request.app.state.checkpointer
        session_factory = request.app.state.session_factory

        thread_config: dict[str, Any] = {
            "configurable": {
                "thread_id": body.conversation_id,
                "session_factory": session_factory,
            }
        }

        # Check if checkpoint exists for this conversation
        checkpoint = await checkpointer.aget_tuple(thread_config)

        if checkpoint is None:
            # First Python invocation — load full history from DB
            async with get_user_session(session_factory, body.user_id) as session:
                db_messages = await ChatRepository.get_messages(
                    session, uuid.UUID(body.conversation_id), limit=20
                )
                conversation = await ChatRepository.get_conversation(
                    session, uuid.UUID(body.conversation_id)
                )
                conv_type = conversation.type if conversation else "general"
                system_prompt = await build_context(session, body.user_id, conv_type)

            # DB messages include the just-saved user message from NestJS
            langchain_messages = convert_db_messages(db_messages)
        else:
            # Checkpoint exists — only pass new user message
            async with get_user_session(session_factory, body.user_id) as session:
                conversation = await ChatRepository.get_conversation(
                    session, uuid.UUID(body.conversation_id)
                )
                conv_type = conversation.type if conversation else "general"
                system_prompt = await build_context(session, body.user_id, conv_type)

            langchain_messages = [HumanMessage(content=body.message)]

        input_state = {
            "messages": langchain_messages,
            "user_id": body.user_id,
            "conversation_id": body.conversation_id,
            "current_agent": None,
        }

        # Store system prompt in config for general_agent node to access
        thread_config["configurable"]["system_prompt"] = system_prompt

        # Stream tokens
        full_content = ""
        async for chunk, metadata in graph.astream(
            input_state, thread_config, stream_mode="messages"
        ):
            if await request.is_disconnected():
                logger.info("Client disconnected, stopping stream")
                break

            if chunk.content and metadata.get("langgraph_node") == "general_agent":
                raw = chunk.content
                if isinstance(raw, str):
                    token = raw
                elif isinstance(raw, list):
                    token = "".join(
                        b.get("text", "") if isinstance(b, dict) else str(b) for b in raw
                    )
                else:
                    token = str(raw)
                full_content += token
                yield {"data": json.dumps({"content": token, "done": False})}

        # Final event
        yield {"data": json.dumps({"content": full_content, "done": True})}

    except Exception:
        logger.exception("Chat streaming error")
        yield {"data": json.dumps({"content": "", "done": True, "error": "Erro ao gerar resposta"})}
