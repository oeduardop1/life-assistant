from httpx import AsyncClient


async def test_health_returns_200(client: AsyncClient) -> None:
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["version"] == "0.1.0-test"
    assert data["database"] == "connected"


async def test_health_accessible_without_auth(client: AsyncClient) -> None:
    """Health endpoint must NOT require authentication."""
    response = await client.get("/health")
    assert response.status_code == 200
