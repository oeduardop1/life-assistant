"""Chat endpoints — POST /chat/invoke and POST /chat/resume with SSE streaming."""

from __future__ import annotations

import json
import logging
import uuid
from typing import TYPE_CHECKING, Any, Literal

from fastapi import APIRouter, Request
from langchain_core.messages import (
    AIMessage,
    AIMessageChunk,
    BaseMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
)
from langgraph.types import Command
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from app.agents.llm import create_llm
from app.config import get_settings
from app.db.repositories.chat import ChatRepository
from app.db.session import get_user_session
from app.prompts.context_builder import build_context
from app.tools.common.intent_classifier import classify_confirmation_intent

if TYPE_CHECKING:
    from collections.abc import AsyncIterator

    from app.db.models.chat import Message

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------


class ChatInvokeRequest(BaseModel):
    user_id: str
    conversation_id: str
    message: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def convert_db_messages(db_messages: list[Message]) -> list[BaseMessage]:
    """Convert SQLAlchemy Message rows to LangChain message objects."""
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


def _extract_text(content: Any) -> str:
    """Extract plain text from LLM content (string or Gemini block list)."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join(b.get("text", "") if isinstance(b, dict) else str(b) for b in content)
    return str(content)


def _has_tool_calls(node_output: dict[str, Any]) -> bool:
    """Check if a node output contains an AIMessage with tool_calls."""
    for msg in node_output.get("messages", []):
        if isinstance(msg, AIMessage) and getattr(msg, "tool_calls", None):
            return True
    return False


def _format_tool_calls_event(node_output: dict[str, Any]) -> dict[str, Any]:
    """Format tool_calls from an agent node output as an SSE event payload."""
    tool_calls_data: list[dict[str, Any]] = []
    for msg in node_output.get("messages", []):
        if isinstance(msg, AIMessage) and msg.tool_calls:
            for tc in msg.tool_calls:
                tool_calls_data.append(
                    {"toolName": tc["name"], "toolArgs": tc["args"], "toolCallId": tc["id"]}
                )
    return {
        "type": "tool_calls",
        "data": {"toolCalls": tool_calls_data},
    }


def _has_tool_results(node_output: dict[str, Any]) -> bool:
    """Check if a node output contains ToolMessages."""
    return any(isinstance(msg, ToolMessage) for msg in node_output.get("messages", []))


def _format_tool_result_events(
    node_output: dict[str, Any],
) -> list[dict[str, Any]]:
    """Format ToolMessages as individual SSE event payloads."""
    events: list[dict[str, Any]] = []
    for msg in node_output.get("messages", []):
        if isinstance(msg, ToolMessage):
            content_str = str(msg.content)
            is_error = content_str.startswith("Erro ao executar") or content_str.startswith(
                "Operação cancelada"
            )
            events.append(
                {
                    "type": "tool_result",
                    "data": {
                        "toolName": msg.name or "",
                        "toolCallId": msg.tool_call_id,
                        "result": msg.content,
                        "success": not is_error,
                    },
                }
            )
    return events


# ---------------------------------------------------------------------------
# Shared streaming generator
# ---------------------------------------------------------------------------


async def stream_graph_events(
    graph: Any,
    input_data: Any,
    config: dict[str, Any],
    request: Request,
) -> AsyncIterator[dict[str, str]]:
    """SSE generator reused by ``/chat/invoke`` and ``/chat/resume``.

    Uses ``stream_mode=["messages", "updates"]`` which yields 2-tuples
    ``(mode, chunk)``::

    - ``mode="messages"`` → ``chunk = (AIMessageChunk, metadata_dict)``
    - ``mode="updates"``  → ``chunk = {"node": output}`` or
      ``{"__interrupt__": (Interrupt(...),)}``
    """
    full_content = ""

    async for mode, chunk in graph.astream(input_data, config, stream_mode=["messages", "updates"]):
        if await request.is_disconnected():
            logger.info("Client disconnected, stopping stream")
            break

        if mode == "messages":
            msg_chunk, metadata = chunk
            if (
                isinstance(msg_chunk, AIMessageChunk)
                and msg_chunk.content
                and metadata.get("langgraph_node") == "agent"
            ):
                token = _extract_text(msg_chunk.content)
                full_content += token
                yield {"data": json.dumps({"content": token, "done": False})}

        elif mode == "updates":
            # Interrupt detection
            if "__interrupt__" in chunk:
                interrupt_value = chunk["__interrupt__"][0].value
                yield {"data": json.dumps(interrupt_value)}
                yield {
                    "data": json.dumps(
                        {
                            "content": interrupt_value["data"]["message"],
                            "done": True,
                            "awaitingConfirmation": True,
                        }
                    )
                }
                return  # End stream — waiting for /chat/resume

            # Tool call / result events
            for node_name, node_output in chunk.items():
                if node_name == "agent" and _has_tool_calls(node_output):
                    yield {"data": json.dumps(_format_tool_calls_event(node_output))}
                elif node_name == "tools" and _has_tool_results(node_output):
                    for result_event in _format_tool_result_events(node_output):
                        yield {"data": json.dumps(result_event)}

    if full_content:
        yield {"data": json.dumps({"content": full_content, "done": True})}


# ---------------------------------------------------------------------------
# POST /chat/invoke
# ---------------------------------------------------------------------------


@router.post("/invoke")
async def invoke_chat(request: Request, body: ChatInvokeRequest) -> EventSourceResponse:
    """Invoke the LangGraph chat agent and stream tokens back via SSE."""
    return EventSourceResponse(stream_chat_response(request, body))


async def stream_chat_response(request: Request, body: ChatInvokeRequest) -> Any:
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

        # ------------------------------------------------------------------
        # Check for pending interrupt — message might be a confirmation
        # ------------------------------------------------------------------
        state = await graph.aget_state(thread_config)
        has_pending = bool(state and getattr(state, "interrupts", None))

        if has_pending:
            settings = get_settings()
            classifier_llm = create_llm(settings, temperature=0)
            intent = await classify_confirmation_intent(
                body.message,
                state.interrupts[0].value,
                classifier_llm,
            )
            if intent.action in ("confirm", "reject", "edit"):
                resume_value: dict[str, Any] = {"action": intent.action}
                if intent.action == "edit" and intent.corrected_args:
                    resume_value["args"] = intent.corrected_args

                resume_config = {**thread_config}
                async for event in stream_graph_events(
                    graph, Command(resume=resume_value), resume_config, request
                ):
                    yield event
                return
            else:
                # Unrelated message — silently reject pending and continue
                await graph.ainvoke(Command(resume={"action": "reject"}), thread_config)

        # ------------------------------------------------------------------
        # Normal flow (no pending interrupt)
        # ------------------------------------------------------------------
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

        thread_config["configurable"]["system_prompt"] = system_prompt

        async for event in stream_graph_events(graph, input_state, thread_config, request):
            yield event

    except Exception:
        logger.exception("Chat streaming error")
        yield {"data": json.dumps({"content": "", "done": True, "error": "Erro ao gerar resposta"})}


# ---------------------------------------------------------------------------
# POST /chat/resume
# ---------------------------------------------------------------------------


class _ChatResumeBody(BaseModel):
    thread_id: str
    action: Literal["confirm", "reject", "edit"]
    edited_args: dict[str, dict[str, Any]] | None = None


@router.post("/resume")
async def resume_chat(request: Request, body: _ChatResumeBody) -> EventSourceResponse:
    """Resume an interrupted graph (confirm / reject / edit a pending tool)."""
    return EventSourceResponse(stream_resume_response(request, body))


async def stream_resume_response(request: Request, body: _ChatResumeBody) -> Any:
    """Async generator for resumed graph streaming."""
    try:
        graph = request.app.state.graph
        session_factory = request.app.state.session_factory

        config: dict[str, Any] = {
            "configurable": {
                "thread_id": body.thread_id,
                "session_factory": session_factory,
            }
        }

        resume_value: dict[str, Any] = {"action": body.action}
        if body.action == "edit" and body.edited_args:
            resume_value["args"] = body.edited_args

        resume_input = Command(resume=resume_value)  # type: ignore[var-annotated]

        async for event in stream_graph_events(graph, resume_input, config, request):
            yield event

    except Exception:
        logger.exception("Resume streaming error")
        yield {
            "data": json.dumps(
                {"content": "", "done": True, "error": "Erro ao processar confirmação"}
            )
        }
