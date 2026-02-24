"""User repository — read user profiles and manage user memories."""

import uuid as _uuid
from typing import Any

from sqlalchemy import distinct, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.enums import UserStatus
from app.db.models.users import User, UserMemory


class UserRepository:
    @staticmethod
    async def get_by_id(session: AsyncSession, user_id: _uuid.UUID) -> User | None:
        result = await session.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_memories(session: AsyncSession, user_id: _uuid.UUID) -> UserMemory | None:
        result = await session.execute(select(UserMemory).where(UserMemory.user_id == user_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def update_memories(
        session: AsyncSession, user_id: _uuid.UUID, data: dict[str, Any]
    ) -> UserMemory | None:
        await session.execute(
            update(UserMemory).where(UserMemory.user_id == user_id).values(**data)
        )
        return await UserRepository.get_memories(session, user_id)

    @staticmethod
    async def get_distinct_timezones(session: AsyncSession) -> list[str]:
        """Get unique timezones from active users."""
        result = await session.execute(
            select(distinct(User.timezone)).where(
                User.status == UserStatus.ACTIVE,
                User.deleted_at.is_(None),
            )
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_users_by_timezone(session: AsyncSession, timezone: str) -> list[User]:
        """Get active users for a given timezone."""
        result = await session.execute(
            select(User).where(
                User.timezone == timezone,
                User.status == UserStatus.ACTIVE,
                User.deleted_at.is_(None),
            )
        )
        return list(result.scalars().all())
