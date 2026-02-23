"""Tracking repository — CRUD for tracking entries, habits, and completions."""

import uuid as _uuid
from datetime import date
from typing import Any

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.tracking import Habit, HabitCompletion, TrackingEntry


class TrackingRepository:
    @staticmethod
    async def create(session: AsyncSession, entry: dict[str, Any]) -> TrackingEntry:
        obj = TrackingEntry(**entry)
        session.add(obj)
        await session.flush()
        return obj

    @staticmethod
    async def get_by_id(session: AsyncSession, entry_id: _uuid.UUID) -> TrackingEntry | None:
        result = await session.execute(select(TrackingEntry).where(TrackingEntry.id == entry_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def find_by_filters(
        session: AsyncSession,
        user_id: _uuid.UUID,
        *,
        tracking_type: str | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        limit: int = 100,
    ) -> list[TrackingEntry]:
        stmt = select(TrackingEntry).where(TrackingEntry.user_id == user_id)
        if tracking_type is not None:
            stmt = stmt.where(TrackingEntry.type == tracking_type)
        if date_from is not None:
            stmt = stmt.where(TrackingEntry.entry_date >= date_from)
        if date_to is not None:
            stmt = stmt.where(TrackingEntry.entry_date <= date_to)
        stmt = stmt.order_by(TrackingEntry.entry_date.desc()).limit(limit)
        result = await session.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def update(
        session: AsyncSession, entry_id: _uuid.UUID, data: dict[str, Any]
    ) -> TrackingEntry | None:
        await session.execute(
            update(TrackingEntry).where(TrackingEntry.id == entry_id).values(**data)
        )
        return await TrackingRepository.get_by_id(session, entry_id)

    @staticmethod
    async def delete(session: AsyncSession, entry_id: _uuid.UUID) -> None:
        await session.execute(delete(TrackingEntry).where(TrackingEntry.id == entry_id))

    @staticmethod
    async def delete_batch(session: AsyncSession, entry_ids: list[_uuid.UUID]) -> int:
        result = await session.execute(delete(TrackingEntry).where(TrackingEntry.id.in_(entry_ids)))
        return result.rowcount  # type: ignore[attr-defined, no-any-return]

    @staticmethod
    async def get_habits(session: AsyncSession, user_id: _uuid.UUID) -> list[Habit]:
        result = await session.execute(
            select(Habit)
            .where(Habit.user_id == user_id, Habit.is_active.is_(True), Habit.deleted_at.is_(None))
            .order_by(Habit.sort_order)
        )
        return list(result.scalars().all())

    @staticmethod
    async def create_habit_completion(
        session: AsyncSession, data: dict[str, Any]
    ) -> HabitCompletion:
        obj = HabitCompletion(**data)
        session.add(obj)
        await session.flush()
        return obj
