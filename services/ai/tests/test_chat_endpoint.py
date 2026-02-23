"""Tests for chat endpoint — app/api/routes/chat.py."""

from __future__ import annotations

import json
from typing import TYPE_CHECKING, Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

if TYPE_CHECKING:
    from collections.abc import AsyncIterator

from app.api.middleware.auth import ServiceAuthMiddleware
from app.api.routes.chat import router as chat_router
from tests.conftest import TEST_SERVICE_SECRET

AUTH_HEADERS = {"Authorization": f"Bearer {TEST_SERVICE_SECRET}"}


@pytest.fixture
def chat_app() -> FastAPI:
    """Create a test app with the chat router and mocked state."""
    test_app = FastAPI()
    test_app.add_middleware(ServiceAuthMiddleware, service_secret=TEST_SERVICE_SECRET)
    test_app.include_router(chat_router)

    # Mock app state
    test_app.state.checkpointer = AsyncMock()
    test_app.state.checkpointer.aget_tuple = AsyncMock(return_value=None)
    test_app.state.session_factory = MagicMock()

    # Mock graph with aget_state returning no interrupts
    mock_graph = AsyncMock()
    mock_state = MagicMock()
    mock_state.interrupts = ()  # No pending interrupts
    mock_graph.aget_state = AsyncMock(return_value=mock_state)
    test_app.state.graph = mock_graph

    return test_app


@pytest.fixture
async def chat_client(chat_app: FastAPI) -> AsyncIterator[AsyncClient]:
    transport = ASGITransport(app=chat_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def test_invoke_missing_body_returns_422(chat_client: AsyncClient) -> None:
    response = await chat_client.post("/chat/invoke", headers=AUTH_HEADERS, content="{}")
    assert response.status_code == 422


async def test_invoke_invalid_body_returns_422(chat_client: AsyncClient) -> None:
    response = await chat_client.post(
        "/chat/invoke",
        headers=AUTH_HEADERS,
        json={"user_id": "abc"},  # missing required fields
    )
    assert response.status_code == 422


async def test_invoke_without_auth_returns_401(chat_client: AsyncClient) -> None:
    response = await chat_client.post(
        "/chat/invoke",
        json={
            "user_id": "test-user",
            "conversation_id": "test-conv",
            "message": "Oi",
        },
    )
    assert response.status_code == 401


async def test_invoke_returns_sse_stream(chat_app: FastAPI) -> None:
    """POST /chat/invoke with valid body should return SSE events."""
    import uuid

    from langchain_core.messages import AIMessageChunk

    user_id = str(uuid.uuid4())
    conv_id = str(uuid.uuid4())

    # Mock astream with new stream_mode=["messages", "updates"] format:
    # yields 2-tuples (mode, chunk)
    async def mock_astream(*args: Any, **kwargs: Any) -> Any:
        chunk = AIMessageChunk(content="Olá!")
        metadata = {"langgraph_node": "agent"}
        yield "messages", (chunk, metadata)

    chat_app.state.graph.astream = mock_astream

    # Mock DB lookups
    mock_session = AsyncMock()
    mock_session_cm = AsyncMock()
    mock_session_cm.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session_cm.__aexit__ = AsyncMock(return_value=None)

    mock_conversation = MagicMock()
    mock_conversation.type = "general"

    mock_user = MagicMock()
    mock_user.timezone = "America/Sao_Paulo"

    with (
        patch("app.api.routes.chat.get_user_session", return_value=mock_session_cm),
        patch(
            "app.api.routes.chat.ChatRepository.get_messages",
            return_value=[],
        ),
        patch(
            "app.api.routes.chat.ChatRepository.get_conversation",
            return_value=mock_conversation,
        ),
        patch(
            "app.api.routes.chat.build_context",
            return_value="System prompt here",
        ),
        patch(
            "app.api.routes.chat.UserRepository.get_by_id",
            return_value=mock_user,
        ),
    ):
        transport = ASGITransport(app=chat_app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/chat/invoke",
                headers=AUTH_HEADERS,
                json={
                    "user_id": user_id,
                    "conversation_id": conv_id,
                    "message": "Oi",
                },
            )

    assert response.status_code == 200
    # SSE responses have text/event-stream content type
    assert "text/event-stream" in response.headers.get("content-type", "")

    # Parse SSE data from response body
    body = response.text
    data_lines = [
        line.removeprefix("data: ") for line in body.split("\n") if line.startswith("data: ")
    ]
    assert len(data_lines) >= 1

    # At least one event should have content
    events = [json.loads(d) for d in data_lines if d.strip()]
    content_events = [e for e in events if e.get("content")]
    assert len(content_events) >= 1

    # Done event should have empty content (tokens already streamed individually)
    done_events = [e for e in events if e.get("done")]
    assert len(done_events) == 1
    assert done_events[0]["content"] == ""


async def test_invoke_non_streamed_content_via_updates(chat_app: FastAPI) -> None:
    """Content from non-streaming nodes (e.g. loop guard) should be sent via updates."""
    import uuid

    from langchain_core.messages import AIMessage

    user_id = str(uuid.uuid4())
    conv_id = str(uuid.uuid4())

    # Simulate a node that returns a pre-built AIMessage (not streamed chunks)
    # This happens when the loop guard intercepts an LLM re-call.
    async def mock_astream(*args: Any, **kwargs: Any) -> Any:
        # The "updates" mode delivers node outputs
        yield "updates", {
            "agent": {"messages": [AIMessage(content="Registrado: água = 2000 ml")]}
        }

    chat_app.state.graph.astream = mock_astream

    mock_session = AsyncMock()
    mock_session_cm = AsyncMock()
    mock_session_cm.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session_cm.__aexit__ = AsyncMock(return_value=None)

    mock_conversation = MagicMock()
    mock_conversation.type = "general"

    mock_user = MagicMock()
    mock_user.timezone = "America/Sao_Paulo"

    with (
        patch("app.api.routes.chat.get_user_session", return_value=mock_session_cm),
        patch("app.api.routes.chat.ChatRepository.get_messages", return_value=[]),
        patch(
            "app.api.routes.chat.ChatRepository.get_conversation",
            return_value=mock_conversation,
        ),
        patch("app.api.routes.chat.build_context", return_value="System prompt"),
        patch("app.api.routes.chat.UserRepository.get_by_id", return_value=mock_user),
    ):
        transport = ASGITransport(app=chat_app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/chat/invoke",
                headers=AUTH_HEADERS,
                json={
                    "user_id": user_id,
                    "conversation_id": conv_id,
                    "message": "Registra 2L de agua",
                },
            )

    assert response.status_code == 200
    body = response.text
    data_lines = [
        line.removeprefix("data: ") for line in body.split("\n") if line.startswith("data: ")
    ]
    events = [json.loads(d) for d in data_lines if d.strip()]

    # Non-streamed content should appear as a content event
    content_events = [e for e in events if e.get("content")]
    assert len(content_events) >= 1
    assert content_events[0]["content"] == "Registrado: água = 2000 ml"

    # Done event should also be sent
    done_events = [e for e in events if e.get("done")]
    assert len(done_events) == 1


async def test_invoke_empty_gemini_blocks_do_not_shadow_loop_guard(chat_app: FastAPI) -> None:
    """Empty Gemini content blocks (tool_call generation) must not prevent loop guard content."""
    import uuid

    from langchain_core.messages import AIMessage, AIMessageChunk

    user_id = str(uuid.uuid4())
    conv_id = str(uuid.uuid4())

    # Simulate: Gemini emits AIMessageChunks with empty content blocks (tool_call generation),
    # then the loop guard produces a pre-built AIMessage via "updates".
    async def mock_astream(*args: Any, **kwargs: Any) -> Any:
        # Gemini's tool_call chunks have content as [{"type":"text","text":""}] — truthy but empty
        empty_chunk = AIMessageChunk(content=[{"type": "text", "text": ""}])
        yield "messages", (empty_chunk, {"langgraph_node": "agent"})

        # Loop guard fires and produces text via updates
        yield "updates", {
            "agent": {"messages": [AIMessage(content="Pronto! Registrei 2L de água.")]}
        }

    chat_app.state.graph.astream = mock_astream

    mock_session = AsyncMock()
    mock_session_cm = AsyncMock()
    mock_session_cm.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session_cm.__aexit__ = AsyncMock(return_value=None)

    mock_conversation = MagicMock()
    mock_conversation.type = "general"

    mock_user = MagicMock()
    mock_user.timezone = "America/Sao_Paulo"

    with (
        patch("app.api.routes.chat.get_user_session", return_value=mock_session_cm),
        patch("app.api.routes.chat.ChatRepository.get_messages", return_value=[]),
        patch(
            "app.api.routes.chat.ChatRepository.get_conversation",
            return_value=mock_conversation,
        ),
        patch("app.api.routes.chat.build_context", return_value="System prompt"),
        patch("app.api.routes.chat.UserRepository.get_by_id", return_value=mock_user),
    ):
        transport = ASGITransport(app=chat_app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/chat/invoke",
                headers=AUTH_HEADERS,
                json={
                    "user_id": user_id,
                    "conversation_id": conv_id,
                    "message": "sim",
                },
            )

    assert response.status_code == 200
    body = response.text
    data_lines = [
        line.removeprefix("data: ") for line in body.split("\n") if line.startswith("data: ")
    ]
    events = [json.loads(d) for d in data_lines if d.strip()]

    # The loop guard content MUST appear — empty chunks must NOT shadow it
    content_events = [e for e in events if e.get("content")]
    assert len(content_events) >= 1
    assert content_events[0]["content"] == "Pronto! Registrei 2L de água."

    done_events = [e for e in events if e.get("done")]
    assert len(done_events) == 1


async def test_invoke_error_returns_error_sse(chat_app: FastAPI) -> None:
    """If the graph raises, the endpoint should return an error SSE event."""
    import uuid

    user_id = str(uuid.uuid4())
    conv_id = str(uuid.uuid4())

    # Mock checkpoint lookup to return None (first invocation)
    chat_app.state.checkpointer.aget_tuple = AsyncMock(return_value=None)

    # Mock DB lookups
    mock_session = AsyncMock()
    mock_session_cm = AsyncMock()
    mock_session_cm.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session_cm.__aexit__ = AsyncMock(return_value=None)

    mock_conversation = MagicMock()
    mock_conversation.type = "general"

    # Make graph.astream raise
    async def mock_astream_error(*args: Any, **kwargs: Any) -> Any:
        raise RuntimeError("LLM unavailable")
        yield  # pragma: no cover — make it an async generator

    chat_app.state.graph.astream = mock_astream_error

    mock_user = MagicMock()
    mock_user.timezone = "America/Sao_Paulo"

    with (
        patch("app.api.routes.chat.get_user_session", return_value=mock_session_cm),
        patch("app.api.routes.chat.ChatRepository.get_messages", return_value=[]),
        patch(
            "app.api.routes.chat.ChatRepository.get_conversation",
            return_value=mock_conversation,
        ),
        patch("app.api.routes.chat.build_context", return_value="System prompt"),
        patch("app.api.routes.chat.UserRepository.get_by_id", return_value=mock_user),
    ):
        transport = ASGITransport(app=chat_app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/chat/invoke",
                headers=AUTH_HEADERS,
                json={
                    "user_id": user_id,
                    "conversation_id": conv_id,
                    "message": "Oi",
                },
            )

    assert response.status_code == 200
    body = response.text
    data_lines = [
        line.removeprefix("data: ") for line in body.split("\n") if line.startswith("data: ")
    ]
    # Should have at least one error event
    events = [json.loads(d) for d in data_lines if d.strip()]
    error_events = [e for e in events if e.get("error")]
    assert len(error_events) >= 1


async def test_invoke_interrupt_saves_confirmation_to_db(chat_app: FastAPI) -> None:
    """When graph hits an interrupt, confirmation message should be saved to DB."""
    import uuid

    from langgraph.types import Interrupt

    user_id = str(uuid.uuid4())
    conv_id = str(uuid.uuid4())

    interrupt_payload = {
        "type": "confirmation_required",
        "data": {
            "confirmationId": "conf-123",
            "toolName": "record_metric",
            "toolArgs": {"metric_type": "water", "value": 2000, "unit": "ml"},
            "message": "Registrar water: 2000.0 ml em 2026-02-23?",
            "tools": [{"toolCallId": "tc-1", "toolName": "record_metric"}],
        },
    }

    # Graph yields an interrupt via updates mode
    async def mock_astream(*args: Any, **kwargs: Any) -> Any:
        yield "updates", {"__interrupt__": (Interrupt(value=interrupt_payload),)}

    chat_app.state.graph.astream = mock_astream

    # Mock DB lookups
    mock_session = AsyncMock()
    mock_session_cm = AsyncMock()
    mock_session_cm.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session_cm.__aexit__ = AsyncMock(return_value=None)

    mock_conversation = MagicMock()
    mock_conversation.type = "general"

    mock_user = MagicMock()
    mock_user.timezone = "America/Sao_Paulo"

    mock_create_message = AsyncMock()

    with (
        patch("app.api.routes.chat.get_user_session", return_value=mock_session_cm),
        patch("app.api.routes.chat.ChatRepository.get_messages", return_value=[]),
        patch(
            "app.api.routes.chat.ChatRepository.get_conversation",
            return_value=mock_conversation,
        ),
        patch(
            "app.api.routes.chat.ChatRepository.create_message",
            mock_create_message,
        ),
        patch("app.api.routes.chat.build_context", return_value="System prompt"),
        patch("app.api.routes.chat.UserRepository.get_by_id", return_value=mock_user),
    ):
        transport = ASGITransport(app=chat_app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/chat/invoke",
                headers=AUTH_HEADERS,
                json={
                    "user_id": user_id,
                    "conversation_id": conv_id,
                    "message": "Registra 2L de agua hoje",
                },
            )

    assert response.status_code == 200

    # Verify confirmation message was saved to DB
    mock_create_message.assert_called_once()
    saved_data = mock_create_message.call_args[0][1]
    assert saved_data["role"] == "assistant"
    assert saved_data["content"] == "Registrar water: 2000.0 ml em 2026-02-23?"
    assert saved_data["conversation_id"] == uuid.UUID(conv_id)
    assert saved_data["message_metadata"]["pendingConfirmation"]["toolName"] == "record_metric"
    assert saved_data["message_metadata"]["source"] == "python_ai"

    # Verify SSE stream still emits correct events
    body = response.text
    data_lines = [
        line.removeprefix("data: ") for line in body.split("\n") if line.startswith("data: ")
    ]
    events = [json.loads(d) for d in data_lines if d.strip()]

    # Should have the interrupt payload event and the done event
    done_events = [e for e in events if e.get("done")]
    assert len(done_events) == 1
    assert done_events[0]["awaitingConfirmation"] is True
    assert done_events[0]["content"] == "Registrar water: 2000.0 ml em 2026-02-23?"


async def test_invoke_interrupt_db_failure_still_streams(chat_app: FastAPI) -> None:
    """If saving confirmation to DB fails, SSE events should still be emitted."""
    import uuid

    from langgraph.types import Interrupt

    user_id = str(uuid.uuid4())
    conv_id = str(uuid.uuid4())

    interrupt_payload = {
        "type": "confirmation_required",
        "data": {
            "confirmationId": "conf-456",
            "toolName": "create_expense",
            "toolArgs": {"valor": "50.00"},
            "message": "Registrar gasto de R$50.00?",
            "tools": [{"toolCallId": "tc-2", "toolName": "create_expense"}],
        },
    }

    async def mock_astream(*args: Any, **kwargs: Any) -> Any:
        yield "updates", {"__interrupt__": (Interrupt(value=interrupt_payload),)}

    chat_app.state.graph.astream = mock_astream

    mock_session_cm = AsyncMock()
    mock_session_cm.__aenter__ = AsyncMock(return_value=AsyncMock())
    mock_session_cm.__aexit__ = AsyncMock(return_value=None)

    mock_conversation = MagicMock()
    mock_conversation.type = "general"

    mock_user = MagicMock()
    mock_user.timezone = "America/Sao_Paulo"

    # Simulate DB failure
    mock_create_message = AsyncMock(side_effect=RuntimeError("DB connection lost"))

    with (
        patch("app.api.routes.chat.get_user_session", return_value=mock_session_cm),
        patch("app.api.routes.chat.ChatRepository.get_messages", return_value=[]),
        patch(
            "app.api.routes.chat.ChatRepository.get_conversation",
            return_value=mock_conversation,
        ),
        patch(
            "app.api.routes.chat.ChatRepository.create_message",
            mock_create_message,
        ),
        patch("app.api.routes.chat.build_context", return_value="System prompt"),
        patch("app.api.routes.chat.UserRepository.get_by_id", return_value=mock_user),
    ):
        transport = ASGITransport(app=chat_app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/chat/invoke",
                headers=AUTH_HEADERS,
                json={
                    "user_id": user_id,
                    "conversation_id": conv_id,
                    "message": "Registra gasto de 50 reais",
                },
            )

    assert response.status_code == 200

    # SSE stream should still work despite DB failure (graceful degradation)
    body = response.text
    data_lines = [
        line.removeprefix("data: ") for line in body.split("\n") if line.startswith("data: ")
    ]
    events = [json.loads(d) for d in data_lines if d.strip()]
    done_events = [e for e in events if e.get("done")]
    assert len(done_events) == 1
    assert done_events[0]["awaitingConfirmation"] is True


async def test_invoke_reject_uses_ainvoke_and_sends_content(chat_app: FastAPI) -> None:
    """When user rejects a pending confirmation, ainvoke runs and content is in done event."""
    import uuid

    from langchain_core.messages import AIMessage
    from langgraph.types import Interrupt

    user_id = str(uuid.uuid4())
    conv_id = str(uuid.uuid4())

    # Simulate pending interrupt state
    interrupt_payload = {
        "type": "confirmation_required",
        "data": {
            "confirmationId": "conf-789",
            "toolName": "record_metric",
            "toolArgs": {"metric_type": "water", "value": 1000, "unit": "ml"},
            "message": "Registrar water: 1000 ml em hoje?",
            "tools": [{"toolCallId": "tc-1", "toolName": "record_metric"}],
        },
    }

    mock_state = MagicMock()
    mock_state.interrupts = (Interrupt(value=interrupt_payload),)
    chat_app.state.graph.aget_state = AsyncMock(return_value=mock_state)

    # Mock ainvoke to return a result with the reject response
    reject_response = AIMessage(content="Ok, Eduardo. Não registrei o consumo de água.")
    chat_app.state.graph.ainvoke = AsyncMock(
        return_value={"messages": [reject_response]}
    )

    # Mock intent classifier to return "reject"
    mock_intent = MagicMock()
    mock_intent.action = "reject"
    mock_intent.corrected_args = None

    mock_session = AsyncMock()
    mock_session_cm = AsyncMock()
    mock_session_cm.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session_cm.__aexit__ = AsyncMock(return_value=None)

    mock_conversation = MagicMock()
    mock_conversation.type = "general"

    mock_user = MagicMock()
    mock_user.timezone = "America/Sao_Paulo"

    with (
        patch("app.api.routes.chat.get_user_session", return_value=mock_session_cm),
        patch("app.api.routes.chat.ChatRepository.get_messages", return_value=[]),
        patch(
            "app.api.routes.chat.ChatRepository.get_conversation",
            return_value=mock_conversation,
        ),
        patch("app.api.routes.chat.build_context", return_value="System prompt"),
        patch("app.api.routes.chat.UserRepository.get_by_id", return_value=mock_user),
        patch(
            "app.api.routes.chat.classify_confirmation_intent",
            return_value=mock_intent,
        ),
        patch("app.api.routes.chat.create_llm", return_value=MagicMock()),
    ):
        transport = ASGITransport(app=chat_app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/chat/invoke",
                headers=AUTH_HEADERS,
                json={
                    "user_id": user_id,
                    "conversation_id": conv_id,
                    "message": "Não",
                },
            )

    assert response.status_code == 200

    # Parse SSE events
    body = response.text
    data_lines = [
        line.removeprefix("data: ") for line in body.split("\n") if line.startswith("data: ")
    ]
    events = [json.loads(d) for d in data_lines if d.strip()]

    # Reject should send a single done event WITH the response content
    done_events = [e for e in events if e.get("done")]
    assert len(done_events) == 1
    assert done_events[0]["content"] == "Ok, Eduardo. Não registrei o consumo de água."

    # Verify ainvoke was called (not astream)
    chat_app.state.graph.ainvoke.assert_called_once()
