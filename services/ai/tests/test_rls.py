"""RLS isolation tests — verify Row Level Security works correctly.

These tests require a running local Supabase instance with migrations applied.
Run: pnpm infra:up && cd services/ai && uv run pytest tests/test_rls.py -v
"""

import uuid

import pytest
from sqlalchemy import text

from app.db.engine import AsyncSessionFactory
from app.db.session import get_user_session

pytestmark = pytest.mark.skipif(
    "not config.getoption('--run-db', default=False)",
    reason="Requires --run-db flag and running Supabase",
)


def pytest_addoption(parser: pytest.Parser) -> None:  # pragma: no cover
    """Register --run-db CLI option (called by pytest plugin system)."""
    parser.addoption("--run-db", action="store_true", default=False)


@pytest.fixture
async def _tracking_entry_for_user_a(
    session_factory: AsyncSessionFactory,
    seed_test_users: None,
    user_a_id: uuid.UUID,
) -> str:
    """Insert a tracking entry owned by user A, return its ID."""
    entry_id = str(uuid.uuid4())
    async with session_factory() as session, session.begin():
        await session.execute(text("SET LOCAL role = 'service_role'"))
        await session.execute(
            text(
                "INSERT INTO tracking_entries "
                "(id, user_id, type, area, value, entry_date) "
                "VALUES (:id, :uid, 'weight', 'health', 82.5, CURRENT_DATE)"
            ),
            {"id": entry_id, "uid": str(user_a_id)},
        )
    return entry_id


async def test_user_a_can_read_own_data(
    session_factory: AsyncSessionFactory,
    user_a_id: uuid.UUID,
    _tracking_entry_for_user_a: str,
) -> None:
    """User A should see their own tracking entries."""
    async with get_user_session(session_factory, str(user_a_id)) as session:
        result = await session.execute(
            text("SELECT id FROM tracking_entries WHERE user_id = :uid"),
            {"uid": str(user_a_id)},
        )
        rows = result.fetchall()
        assert len(rows) >= 1


async def test_user_b_cannot_read_user_a_data(
    session_factory: AsyncSessionFactory,
    user_b_id: uuid.UUID,
    _tracking_entry_for_user_a: str,
) -> None:
    """User B should NOT see User A's tracking entries (RLS isolation)."""
    async with get_user_session(session_factory, str(user_b_id)) as session:
        result = await session.execute(
            text("SELECT id FROM tracking_entries WHERE id = :id"),
            {"id": _tracking_entry_for_user_a},
        )
        rows = result.fetchall()
        assert len(rows) == 0


async def test_session_without_set_local_returns_empty(
    session_factory: AsyncSessionFactory,
    _tracking_entry_for_user_a: str,
) -> None:
    """A session without SET LOCAL should return empty results due to RLS."""
    async with session_factory() as session, session.begin():
        result = await session.execute(
            text("SELECT id FROM tracking_entries WHERE id = :id"),
            {"id": _tracking_entry_for_user_a},
        )
        rows = result.fetchall()
        assert len(rows) == 0


async def test_user_b_cannot_read_user_a_finances(
    session_factory: AsyncSessionFactory,
    seed_test_users: None,
    user_a_id: uuid.UUID,
    user_b_id: uuid.UUID,
) -> None:
    """User B should NOT see User A's financial data (RLS isolation)."""
    # Insert an income for user A via service_role
    income_id = str(uuid.uuid4())
    async with session_factory() as session, session.begin():
        await session.execute(text("SET LOCAL role = 'service_role'"))
        await session.execute(
            text(
                "INSERT INTO incomes "
                "(id, user_id, name, type, frequency, expected_amount, month_year) "
                "VALUES (:id, :uid, 'Salary', 'salary', 'monthly', 5000, '2026-01')"
            ),
            {"id": income_id, "uid": str(user_a_id)},
        )

    # User B tries to read it
    async with get_user_session(session_factory, str(user_b_id)) as session:
        result = await session.execute(
            text("SELECT id FROM incomes WHERE id = :id"), {"id": income_id}
        )
        assert len(result.fetchall()) == 0

    # Cleanup
    async with session_factory() as session, session.begin():
        await session.execute(text("SET LOCAL role = 'service_role'"))
        await session.execute(text("DELETE FROM incomes WHERE id = :id"), {"id": income_id})
