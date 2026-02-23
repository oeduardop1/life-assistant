"""Memory repository — knowledge items, user memories, and consolidation logs."""

import uuid as _uuid
from datetime import datetime
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.memory import KnowledgeItem, MemoryConsolidation
from app.db.models.users import UserMemory


class MemoryRepository:
    # --- Knowledge Items ---

    @staticmethod
    async def search_knowledge(
        session: AsyncSession,
        user_id: _uuid.UUID,
        *,
        item_type: str | None = None,
        area: str | None = None,
        limit: int = 50,
    ) -> list[KnowledgeItem]:
        stmt = select(KnowledgeItem).where(
            KnowledgeItem.user_id == user_id,
            KnowledgeItem.deleted_at.is_(None),
            KnowledgeItem.superseded_by_id.is_(None),
        )
        if item_type is not None:
            stmt = stmt.where(KnowledgeItem.type == item_type)
        if area is not None:
            stmt = stmt.where(KnowledgeItem.area == area)
        stmt = stmt.order_by(KnowledgeItem.created_at.desc()).limit(limit)
        result = await session.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_knowledge_by_id(
        session: AsyncSession, item_id: _uuid.UUID
    ) -> KnowledgeItem | None:
        result = await session.execute(select(KnowledgeItem).where(KnowledgeItem.id == item_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def create_knowledge(session: AsyncSession, data: dict[str, Any]) -> KnowledgeItem:
        obj = KnowledgeItem(**data)
        session.add(obj)
        await session.flush()
        return obj

    @staticmethod
    async def update_knowledge(
        session: AsyncSession, item_id: _uuid.UUID, data: dict[str, Any]
    ) -> KnowledgeItem | None:
        await session.execute(
            update(KnowledgeItem).where(KnowledgeItem.id == item_id).values(**data)
        )
        return await MemoryRepository.get_knowledge_by_id(session, item_id)

    @staticmethod
    async def supersede_knowledge(
        session: AsyncSession,
        old_id: _uuid.UUID,
        new_id: _uuid.UUID,
    ) -> None:
        await session.execute(
            update(KnowledgeItem)
            .where(KnowledgeItem.id == old_id)
            .values(superseded_by_id=new_id, superseded_at=datetime.now())
        )

    # --- User Memories ---

    @staticmethod
    async def get_user_memories(session: AsyncSession, user_id: _uuid.UUID) -> UserMemory | None:
        result = await session.execute(select(UserMemory).where(UserMemory.user_id == user_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def update_user_memories(
        session: AsyncSession, user_id: _uuid.UUID, data: dict[str, Any]
    ) -> UserMemory | None:
        await session.execute(
            update(UserMemory).where(UserMemory.user_id == user_id).values(**data)
        )
        return await MemoryRepository.get_user_memories(session, user_id)

    # --- Consolidation Logs ---

    @staticmethod
    async def create_consolidation_log(
        session: AsyncSession, data: dict[str, Any]
    ) -> MemoryConsolidation:
        obj = MemoryConsolidation(**data)
        session.add(obj)
        await session.flush()
        return obj

    @staticmethod
    async def get_last_consolidation(
        session: AsyncSession, user_id: _uuid.UUID
    ) -> MemoryConsolidation | None:
        result = await session.execute(
            select(MemoryConsolidation)
            .where(MemoryConsolidation.user_id == user_id)
            .order_by(MemoryConsolidation.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()
