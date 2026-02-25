"""Tests for RequestIdMiddleware — propagation, generation, context vars, user_id extraction."""

from __future__ import annotations

from typing import TYPE_CHECKING

import pytest
from fastapi import FastAPI, Request
from httpx import ASGITransport, AsyncClient
from pydantic import BaseModel

from app.api.middleware.request_id import RequestIdMiddleware, request_id_var, user_id_var

if TYPE_CHECKING:
    from collections.abc import AsyncIterator


class _EchoBody(BaseModel):
    user_id: str
    message: str


@pytest.fixture
def rid_app() -> FastAPI:
    """FastAPI app with only RequestIdMiddleware (no auth)."""
    test_app = FastAPI()
    test_app.add_middleware(RequestIdMiddleware)

    @test_app.get("/echo-rid")
    async def echo_rid(request: Request) -> dict[str, str | None]:
        return {"request_id": request_id_var.get(None), "user_id": user_id_var.get(None)}

    @test_app.post("/echo-body")
    async def echo_body(request: Request, body: _EchoBody) -> dict[str, str | None]:
        return {
            "request_id": request_id_var.get(None),
            "user_id": user_id_var.get(None),
            "body_user_id": body.user_id,
        }

    return test_app


@pytest.fixture
async def rid_client(rid_app: FastAPI) -> AsyncIterator[AsyncClient]:
    transport = ASGITransport(app=rid_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def test_propagates_existing_request_id(rid_client: AsyncClient) -> None:
    response = await rid_client.get("/echo-rid", headers={"x-request-id": "my-req-123"})
    assert response.status_code == 200
    assert response.headers["x-request-id"] == "my-req-123"


async def test_generates_request_id_when_missing(rid_client: AsyncClient) -> None:
    response = await rid_client.get("/echo-rid")
    assert response.status_code == 200
    rid = response.headers.get("x-request-id")
    assert rid is not None
    # Should be a valid UUID4
    import uuid

    uuid.UUID(rid, version=4)


async def test_request_id_available_in_context(rid_client: AsyncClient) -> None:
    response = await rid_client.get("/echo-rid", headers={"x-request-id": "ctx-test-456"})
    assert response.status_code == 200
    data = response.json()
    assert data["request_id"] == "ctx-test-456"


async def test_user_id_extracted_from_json_body(rid_client: AsyncClient) -> None:
    """POST with JSON body containing user_id → ContextVar populated."""
    response = await rid_client.post(
        "/echo-body", json={"user_id": "usr-abc-123", "message": "hello"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == "usr-abc-123"
    # Body must still be available to the route handler (not consumed by middleware)
    assert data["body_user_id"] == "usr-abc-123"


async def test_user_id_none_for_get_requests(rid_client: AsyncClient) -> None:
    """GET requests have no body → user_id stays None."""
    response = await rid_client.get("/echo-rid")
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] is None


async def test_body_not_consumed_by_middleware(rid_client: AsyncClient) -> None:
    """Route handler must receive the full body even after middleware reads it."""
    response = await rid_client.post(
        "/echo-body", json={"user_id": "usr-xyz", "message": "test body passthrough"}
    )
    assert response.status_code == 200
    data = response.json()
    # If middleware consumed the body, FastAPI would return 422 (missing body)
    assert data["body_user_id"] == "usr-xyz"
    assert data["user_id"] == "usr-xyz"
