"""FastAPI dependency injection functions."""

from collections.abc import AsyncIterator
from typing import Any

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.db.session import get_user_session


def get_app_settings() -> Settings:
    return get_settings()


def get_checkpointer(request: Request) -> Any:
    return request.app.state.checkpointer


async def get_db_session(request: Request, user_id: str) -> AsyncIterator[AsyncSession]:
    """Provide an RLS-scoped database session for the given user."""
    async with get_user_session(request.app.state.session_factory, user_id) as session:
        yield session
