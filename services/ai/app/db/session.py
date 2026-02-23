"""RLS-aware session context managers."""

import uuid as _uuid
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

    Note: ``SET LOCAL`` does not support bind parameters (``$1``) in
    PostgreSQL's extended query protocol used by asyncpg.  The value is
    interpolated directly after UUID validation to prevent SQL injection.
    """
    safe_uid = str(_uuid.UUID(user_id))  # raises ValueError if malformed
    async with session_factory() as session, session.begin():
        await session.execute(text(f"SET LOCAL request.jwt.claim.sub = '{safe_uid}'"))
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
