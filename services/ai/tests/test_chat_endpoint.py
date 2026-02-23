"""Tests for chat endpoint — app/api/routes/chat.py."""

from __future__ import annotations

import json
from typing import TYPE_CHECKING
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
    test_app.state.graph = AsyncMock()

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

    # Mock the graph.astream to yield one token + done
    async def mock_astream(*args, **kwargs):
        chunk = AIMessageChunk(content="Olá!")
        metadata = {"langgraph_node": "general_agent"}
        yield chunk, metadata

    chat_app.state.graph.astream = mock_astream

    # Mock DB lookups
    mock_session = AsyncMock()
    mock_session_cm = AsyncMock()
    mock_session_cm.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session_cm.__aexit__ = AsyncMock(return_value=None)

    mock_conversation = MagicMock()
    mock_conversation.type = "general"

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
        line.removeprefix("data: ")
        for line in body.split("\n")
        if line.startswith("data: ")
    ]
    assert len(data_lines) >= 1

    # At least one event should have content
    events = [json.loads(d) for d in data_lines if d.strip()]
    content_events = [e for e in events if e.get("content")]
    assert len(content_events) >= 1


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
    async def mock_astream_error(*args, **kwargs):
        raise RuntimeError("LLM unavailable")
        yield  # pragma: no cover — make it an async generator

    chat_app.state.graph.astream = mock_astream_error

    with (
        patch("app.api.routes.chat.get_user_session", return_value=mock_session_cm),
        patch("app.api.routes.chat.ChatRepository.get_messages", return_value=[]),
        patch(
            "app.api.routes.chat.ChatRepository.get_conversation",
            return_value=mock_conversation,
        ),
        patch("app.api.routes.chat.build_context", return_value="System prompt"),
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
        line.removeprefix("data: ")
        for line in body.split("\n")
        if line.startswith("data: ")
    ]
    # Should have at least one error event
    events = [json.loads(d) for d in data_lines if d.strip()]
    error_events = [e for e in events if e.get("error")]
    assert len(error_events) >= 1
