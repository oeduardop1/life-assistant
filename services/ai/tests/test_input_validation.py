"""Tests for input validation — chat request models."""

from __future__ import annotations

from typing import TYPE_CHECKING
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.api.middleware.auth import ServiceAuthMiddleware
from app.api.routes.chat import router as chat_router
from tests.conftest import TEST_SERVICE_SECRET

if TYPE_CHECKING:
    from collections.abc import AsyncIterator

AUTH_HEADERS = {"Authorization": f"Bearer {TEST_SERVICE_SECRET}"}


@pytest.fixture
def validation_app() -> FastAPI:
    test_app = FastAPI()
    test_app.add_middleware(ServiceAuthMiddleware, service_secret=TEST_SERVICE_SECRET)
    test_app.include_router(chat_router)

    test_app.state.checkpointer = AsyncMock()
    test_app.state.checkpointer.aget_tuple = AsyncMock(return_value=None)
    test_app.state.session_factory = MagicMock()

    mock_graph = AsyncMock()
    mock_state = MagicMock()
    mock_state.interrupts = ()
    mock_graph.aget_state = AsyncMock(return_value=mock_state)
    test_app.state.graph = mock_graph

    return test_app


@pytest.fixture
async def validation_client(validation_app: FastAPI) -> AsyncIterator[AsyncClient]:
    transport = ASGITransport(app=validation_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def test_empty_message_returns_422(validation_client: AsyncClient) -> None:
    response = await validation_client.post(
        "/chat/invoke",
        headers=AUTH_HEADERS,
        json={"user_id": "u1", "conversation_id": "c1", "message": ""},
    )
    assert response.status_code == 422


async def test_valid_message_accepted(validation_client: AsyncClient) -> None:
    """A valid message should NOT return 422 (may return 200 SSE)."""
    response = await validation_client.post(
        "/chat/invoke",
        headers=AUTH_HEADERS,
        json={"user_id": "u1", "conversation_id": "c1", "message": "hello"},
    )
    assert response.status_code != 422


async def test_invalid_resume_action_returns_422(validation_client: AsyncClient) -> None:
    response = await validation_client.post(
        "/chat/resume",
        headers=AUTH_HEADERS,
        json={"thread_id": "t1", "action": "invalid"},
    )
    assert response.status_code == 422
