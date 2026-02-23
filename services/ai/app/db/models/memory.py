"""SQLAlchemy models for memory system tables.

Passive mapping of Drizzle schemas — never generates migrations.
Source: packages/database/src/schema/knowledge-items.ts, memory-consolidations.ts
"""

import uuid as _uuid
from datetime import datetime
from typing import Any

from sqlalchemy import JSON, TIMESTAMP, Boolean, Enum, Float, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.models.base import Base, SoftDeleteMixin, TimestampMixin
from app.db.models.enums import (
    ConsolidationStatus,
    KnowledgeItemSource,
    KnowledgeItemType,
    LifeArea,
    SubArea,
)

_vc = lambda e: [m.value for m in e]  # noqa: E731  # values_callable shorthand


class KnowledgeItem(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "knowledge_items"

    id: Mapped[_uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    user_id: Mapped[_uuid.UUID] = mapped_column(UUID(as_uuid=True))
    type: Mapped[KnowledgeItemType] = mapped_column(
        Enum(KnowledgeItemType, name="knowledge_item_type", create_type=False, values_callable=_vc)
    )
    area: Mapped[LifeArea | None] = mapped_column(
        Enum(LifeArea, name="life_area", create_type=False, values_callable=_vc), nullable=True
    )
    sub_area: Mapped[SubArea | None] = mapped_column(
        Enum(SubArea, name="sub_area", create_type=False, values_callable=_vc), nullable=True
    )
    title: Mapped[str] = mapped_column(String(255))
    content: Mapped[str] = mapped_column(Text)
    source: Mapped[KnowledgeItemSource] = mapped_column(
        Enum(
            KnowledgeItemSource,
            name="knowledge_item_source",
            create_type=False,
            values_callable=_vc,
        )
    )
    source_ref: Mapped[_uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    inference_evidence: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence: Mapped[float] = mapped_column(Float, server_default="0.9")
    validated_by_user: Mapped[bool] = mapped_column(Boolean, server_default="false")
    related_items: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    tags: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    person_metadata: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    superseded_by_id: Mapped[_uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    superseded_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)


class MemoryConsolidation(Base):
    """Append-only audit log — no updated_at column."""

    __tablename__ = "memory_consolidations"

    id: Mapped[_uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    user_id: Mapped[_uuid.UUID] = mapped_column(UUID(as_uuid=True))
    consolidated_from: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True))
    consolidated_to: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True))
    messages_processed: Mapped[int] = mapped_column(Integer, server_default="0")
    facts_created: Mapped[int] = mapped_column(Integer, server_default="0")
    facts_updated: Mapped[int] = mapped_column(Integer, server_default="0")
    inferences_created: Mapped[int] = mapped_column(Integer, server_default="0")
    memory_updates: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    raw_output: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    status: Mapped[ConsolidationStatus] = mapped_column(
        Enum(
            ConsolidationStatus,
            name="consolidation_status",
            create_type=False,
            values_callable=_vc,
        )
    )
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now()
    )
