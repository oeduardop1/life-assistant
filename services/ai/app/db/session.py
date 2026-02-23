"""RLS-aware session context managers."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.engine import AsyncSessionFactory


@asynccontextmanager
async def get_user_session(
    session_factory: AsyncSessionFactory,
    user_id: str,
) -> AsyncIterator[AsyncSession]:
    """Yield an AsyncSession with RLS context set for the given user.

    Sets ``request.jwt.claim.sub`` so PostgreSQL RLS policies using
    ``auth.uid()`` correctly scope queries to this user.
    ``SET LOCAL`` is scoped to the current transaction.
    """
    async with session_factory() as session, session.begin():
        await session.execute(
            text("SET LOCAL request.jwt.claim.sub = :uid"),
            {"uid": user_id},
        )
        yield session


@asynccontextmanager
async def get_service_session(
    session_factory: AsyncSessionFactory,
) -> AsyncIterator[AsyncSession]:
    """Yield an AsyncSession with service_role that bypasses RLS.

    Used by worker jobs (e.g. consolidation) that operate across users.
    """
    async with session_factory() as session, session.begin():
        await session.execute(text("SET LOCAL role = 'service_role'"))
        yield session
