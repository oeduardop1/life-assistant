from fastapi import FastAPI
from httpx import AsyncClient

from tests.conftest import TEST_SERVICE_SECRET


async def test_request_without_token_returns_401(app: FastAPI, client: AsyncClient) -> None:
    """Requests to protected endpoints without auth must return 401."""

    # Add a dummy protected route for testing
    @app.get("/protected")
    async def protected() -> dict[str, str]:
        return {"message": "ok"}

    response = await client.get("/protected")
    assert response.status_code == 401


async def test_request_with_wrong_token_returns_401(app: FastAPI, client: AsyncClient) -> None:
    """Requests with an incorrect service token must return 401."""

    @app.get("/protected2")
    async def protected2() -> dict[str, str]:
        return {"message": "ok"}

    response = await client.get("/protected2", headers={"Authorization": "Bearer wrong-token"})
    assert response.status_code == 401


async def test_request_with_correct_token_returns_200(app: FastAPI, client: AsyncClient) -> None:
    """Requests with a valid SERVICE_SECRET must succeed."""

    @app.get("/protected3")
    async def protected3() -> dict[str, str]:
        return {"message": "ok"}

    response = await client.get(
        "/protected3", headers={"Authorization": f"Bearer {TEST_SERVICE_SECRET}"}
    )
    assert response.status_code == 200
    assert response.json() == {"message": "ok"}
