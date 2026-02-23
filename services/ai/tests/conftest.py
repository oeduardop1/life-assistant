import os
import uuid
from collections.abc import AsyncIterator
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from app.api.middleware.auth import ServiceAuthMiddleware
from app.api.routes.health import router as health_router
from app.db.engine import AsyncSessionFactory, get_async_engine, get_session_factory
from app.db.session import get_user_session

TEST_SERVICE_SECRET = "test-secret-token"

# Default local Supabase URL for integration tests
TEST_DATABASE_URL = os.environ.get(
    "DATABASE_URL", "postgresql://postgres:postgres@localhost:54322/postgres"
)


# ---------------------------------------------------------------------------
# HTTP / FastAPI fixtures (mocked DB — for unit tests)
# ---------------------------------------------------------------------------


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


# ---------------------------------------------------------------------------
# Real DB fixtures (for integration tests — require local Supabase running)
# ---------------------------------------------------------------------------


@pytest.fixture(scope="session")
def db_engine() -> AsyncEngine:
    """Create a real async engine connected to local Supabase."""
    return get_async_engine(TEST_DATABASE_URL)


@pytest.fixture(scope="session")
def session_factory(db_engine: AsyncEngine) -> AsyncSessionFactory:
    return get_session_factory(db_engine)


@pytest.fixture
def user_a_id() -> uuid.UUID:
    """Fixed UUID for test user A."""
    return uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")


@pytest.fixture
def user_b_id() -> uuid.UUID:
    """Fixed UUID for test user B."""
    return uuid.UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")


@pytest.fixture
async def seed_test_users(
    session_factory: AsyncSessionFactory,
    user_a_id: uuid.UUID,
    user_b_id: uuid.UUID,
) -> AsyncIterator[None]:
    """Insert two test users, clean up after test."""
    async with session_factory() as session, session.begin():
        # Use service_role to bypass RLS for seeding
        await session.execute(text("SET LOCAL role = 'service_role'"))
        for uid, name, email in [
            (user_a_id, "User A", "user-a@test.com"),
            (user_b_id, "User B", "user-b@test.com"),
        ]:
            await session.execute(
                text(
                    "INSERT INTO users (id, email, name, status) "
                    "VALUES (:id, :email, :name, 'active') "
                    "ON CONFLICT (id) DO NOTHING"
                ),
                {"id": str(uid), "email": email, "name": name},
            )

    yield

    # Cleanup: delete test data (cascade will remove related rows)
    async with session_factory() as session, session.begin():
        await session.execute(text("SET LOCAL role = 'service_role'"))
        for uid in [user_a_id, user_b_id]:
            await session.execute(text("DELETE FROM users WHERE id = :id"), {"id": str(uid)})


@pytest.fixture
async def user_session(
    session_factory: AsyncSessionFactory,
    user_a_id: uuid.UUID,
) -> AsyncIterator[AsyncSession]:
    """Yield an RLS-scoped session for user A."""
    async with get_user_session(session_factory, str(user_a_id)) as session:
        yield session
