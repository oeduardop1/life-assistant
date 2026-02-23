"""Chat repository — conversations and messages."""

import uuid as _uuid
from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.chat import Conversation, Message


class ChatRepository:
    @staticmethod
    async def get_conversation(
        session: AsyncSession, conversation_id: _uuid.UUID
    ) -> Conversation | None:
        result = await session.execute(
            select(Conversation).where(Conversation.id == conversation_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_conversations(
        session: AsyncSession, user_id: _uuid.UUID, *, limit: int = 50
    ) -> list[Conversation]:
        result = await session.execute(
            select(Conversation)
            .where(Conversation.user_id == user_id, Conversation.deleted_at.is_(None))
            .order_by(Conversation.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_messages(
        session: AsyncSession, conversation_id: _uuid.UUID, *, limit: int | None = None
    ) -> list[Message]:
        stmt = (
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at)
        )
        if limit is not None:
            stmt = stmt.limit(limit)
        result = await session.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def create_message(session: AsyncSession, data: dict[str, Any]) -> Message:
        obj = Message(**data)
        session.add(obj)
        await session.flush()
        return obj

    @staticmethod
    async def get_messages_since(
        session: AsyncSession, user_id: _uuid.UUID, since: datetime
    ) -> list[Message]:
        """Get all messages for a user since a given timestamp (for consolidation)."""
        result = await session.execute(
            select(Message)
            .join(Conversation, Message.conversation_id == Conversation.id)
            .where(Conversation.user_id == user_id, Message.created_at >= since)
            .order_by(Message.created_at)
        )
        return list(result.scalars().all())
