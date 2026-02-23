"""SQLAlchemy models for chat tables.

Passive mapping of Drizzle schemas — never generates migrations.
Source: packages/database/src/schema/conversations.ts
"""

import uuid as _uuid
from datetime import datetime
from typing import Any

from sqlalchemy import JSON, TIMESTAMP, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.models.base import Base, SoftDeleteMixin, TimestampMixin
from app.db.models.enums import ConversationType, MessageRole


class Conversation(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "conversations"

    id: Mapped[_uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    user_id: Mapped[_uuid.UUID] = mapped_column(UUID(as_uuid=True))
    type: Mapped[ConversationType] = mapped_column(String(20), server_default="general")
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    conversation_metadata: Mapped[dict[str, Any] | None] = mapped_column(
        "metadata", JSON, nullable=True
    )


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[_uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    conversation_id: Mapped[_uuid.UUID] = mapped_column(UUID(as_uuid=True))
    role: Mapped[MessageRole] = mapped_column(String(20))
    content: Mapped[str] = mapped_column(Text)
    message_metadata: Mapped[dict[str, Any] | None] = mapped_column("metadata", JSON, nullable=True)
    actions: Mapped[list[dict[str, Any]] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now()
    )
