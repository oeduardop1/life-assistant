from collections.abc import AsyncIterator
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.api.middleware.auth import ServiceAuthMiddleware
from app.api.routes.health import router as health_router

TEST_SERVICE_SECRET = "test-secret-token"


@pytest.fixture
def app() -> FastAPI:
    """Create a test FastAPI app without lifespan (no real DB)."""
    test_app = FastAPI()
    test_app.add_middleware(ServiceAuthMiddleware, service_secret=TEST_SERVICE_SECRET)
    test_app.include_router(health_router)

    # Mock app state
    test_app.state.app_version = "0.1.0-test"
    test_app.state.checkpointer = MagicMock()

    # Mock DB engine with async connect
    mock_engine = MagicMock()
    mock_conn = AsyncMock()
    mock_conn.execute = AsyncMock()
    mock_cm = AsyncMock()
    mock_cm.__aenter__ = AsyncMock(return_value=mock_conn)
    mock_cm.__aexit__ = AsyncMock(return_value=None)
    mock_engine.connect = MagicMock(return_value=mock_cm)
    test_app.state.db_engine = mock_engine

    return test_app


@pytest.fixture
async def client(app: FastAPI) -> AsyncIterator[AsyncClient]:
    """Async HTTP client for testing."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
