"""Tests for POST /chat/resume endpoint."""

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

TEST_USER_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"


def _db_mocks() -> tuple[MagicMock, MagicMock, MagicMock]:
    """Build mock objects for DB calls used by resume endpoint."""
    mock_session_cm = AsyncMock()
    mock_session_cm.__aenter__ = AsyncMock(return_value=AsyncMock())
    mock_session_cm.__aexit__ = AsyncMock(return_value=None)

    mock_conversation = MagicMock()
    mock_conversation.type = "general"

    mock_user = MagicMock()
    mock_user.timezone = "America/Sao_Paulo"

    return mock_session_cm, mock_conversation, mock_user


@pytest.fixture
def resume_app() -> FastAPI:
    """Create a test app with chat router for resume endpoint tests."""
    test_app = FastAPI()
    test_app.add_middleware(ServiceAuthMiddleware, service_secret=TEST_SERVICE_SECRET)
    test_app.include_router(chat_router)

    test_app.state.checkpointer = AsyncMock()
    test_app.state.session_factory = MagicMock()
    test_app.state.graph = AsyncMock()

    return test_app


@pytest.fixture
async def resume_client(resume_app: FastAPI) -> AsyncIterator[AsyncClient]:
    transport = ASGITransport(app=resume_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def test_resume_missing_body_returns_422(resume_client: AsyncClient) -> None:
    response = await resume_client.post("/chat/resume", headers=AUTH_HEADERS, content="{}")
    assert response.status_code == 422


async def test_resume_confirm_returns_sse(resume_app: FastAPI) -> None:
    """POST /chat/resume with action=confirm should stream SSE events."""
    from langchain_core.messages import AIMessageChunk

    async def mock_astream(input_data: Any, config: Any, **kwargs: Any) -> Any:
        yield (
            "messages",
            (
                AIMessageChunk(content="Pronto, registrado!"),
                {"langgraph_node": "agent"},
            ),
        )

    resume_app.state.graph.astream = mock_astream

    session_cm, conv, user = _db_mocks()
    with (
        patch("app.api.routes.chat.get_user_session", return_value=session_cm),
        patch("app.api.routes.chat.ChatRepository.get_conversation", return_value=conv),
        patch("app.api.routes.chat.build_context", return_value="System prompt"),
        patch("app.api.routes.chat.UserRepository.get_by_id", return_value=user),
    ):
        transport = ASGITransport(app=resume_app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/chat/resume",
                headers=AUTH_HEADERS,
                json={
                    "thread_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
                    "user_id": TEST_USER_ID,
                    "action": "confirm",
                },
            )

    assert response.status_code == 200
    assert "text/event-stream" in response.headers.get("content-type", "")

    data_lines = [
        line.removeprefix("data: ")
        for line in response.text.split("\n")
        if line.startswith("data: ")
    ]
    events = [json.loads(d) for d in data_lines if d.strip()]
    content_events = [e for e in events if e.get("content")]
    assert len(content_events) >= 1


async def test_resume_reject_returns_sse(resume_app: FastAPI) -> None:
    """POST /chat/resume with action=reject should stream cancellation SSE."""
    from langchain_core.messages import AIMessageChunk

    async def mock_astream(input_data: Any, config: Any, **kwargs: Any) -> Any:
        yield (
            "messages",
            (
                AIMessageChunk(content="Ok, cancelado."),
                {"langgraph_node": "agent"},
            ),
        )

    resume_app.state.graph.astream = mock_astream

    session_cm, conv, user = _db_mocks()
    with (
        patch("app.api.routes.chat.get_user_session", return_value=session_cm),
        patch("app.api.routes.chat.ChatRepository.get_conversation", return_value=conv),
        patch("app.api.routes.chat.build_context", return_value="System prompt"),
        patch("app.api.routes.chat.UserRepository.get_by_id", return_value=user),
    ):
        transport = ASGITransport(app=resume_app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/chat/resume",
                headers=AUTH_HEADERS,
                json={
                    "thread_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
                    "user_id": TEST_USER_ID,
                    "action": "reject",
                },
            )

    assert response.status_code == 200
    data_lines = [
        line.removeprefix("data: ")
        for line in response.text.split("\n")
        if line.startswith("data: ")
    ]
    events = [json.loads(d) for d in data_lines if d.strip()]
    assert len(events) >= 1


async def test_resume_error_returns_error_sse(resume_app: FastAPI) -> None:
    """If resume streaming raises, should return error SSE event."""

    async def mock_astream_error(*args: Any, **kwargs: Any) -> Any:
        raise RuntimeError("checkpoint not found")
        yield  # pragma: no cover

    resume_app.state.graph.astream = mock_astream_error

    session_cm, conv, user = _db_mocks()
    with (
        patch("app.api.routes.chat.get_user_session", return_value=session_cm),
        patch("app.api.routes.chat.ChatRepository.get_conversation", return_value=conv),
        patch("app.api.routes.chat.build_context", return_value="System prompt"),
        patch("app.api.routes.chat.UserRepository.get_by_id", return_value=user),
    ):
        transport = ASGITransport(app=resume_app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/chat/resume",
                headers=AUTH_HEADERS,
                json={
                    "thread_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
                    "user_id": TEST_USER_ID,
                    "action": "confirm",
                },
            )

    assert response.status_code == 200
    data_lines = [
        line.removeprefix("data: ")
        for line in response.text.split("\n")
        if line.startswith("data: ")
    ]
    events = [json.loads(d) for d in data_lines if d.strip()]
    error_events = [e for e in events if e.get("error")]
    assert len(error_events) >= 1
