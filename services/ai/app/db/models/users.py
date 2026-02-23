"""SQLAlchemy models for users and user_memories tables.

Passive mapping of Drizzle schemas — never generates migrations.
Source: packages/database/src/schema/users.ts, user-memories.ts
"""

import uuid as _uuid
from datetime import date, datetime
from typing import Any

from sqlalchemy import JSON, TIMESTAMP, Date, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.models.base import Base, SoftDeleteMixin, TimestampMixin
from app.db.models.enums import UserPlan, UserStatus


class User(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "users"

    id: Mapped[_uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    email: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(255))
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    height: Mapped[float | None] = mapped_column(
        Numeric(precision=5, scale=2, asdecimal=False), nullable=True
    )
    birth_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    timezone: Mapped[str] = mapped_column(String(50), server_default="America/Sao_Paulo")
    locale: Mapped[str] = mapped_column(String(10), server_default="pt-BR")
    currency: Mapped[str] = mapped_column(String(3), server_default="BRL")
    preferences: Mapped[dict[str, Any]] = mapped_column(JSON)
    plan: Mapped[UserPlan] = mapped_column(String(10), server_default="free")
    plan_expires_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )
    stripe_customer_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[UserStatus] = mapped_column(String(20), server_default="pending")
    email_verified_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )
    onboarding_completed_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )


class UserMemory(Base, TimestampMixin):
    __tablename__ = "user_memories"

    id: Mapped[_uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    user_id: Mapped[_uuid.UUID] = mapped_column(UUID(as_uuid=True))
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    occupation: Mapped[str | None] = mapped_column(String(255), nullable=True)
    family_context: Mapped[str | None] = mapped_column(Text, nullable=True)
    current_goals: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    current_challenges: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    top_of_mind: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    values: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    communication_style: Mapped[str | None] = mapped_column(String(50), nullable=True)
    feedback_preferences: Mapped[str | None] = mapped_column(Text, nullable=True)
    learned_patterns: Mapped[list[dict[str, Any]] | None] = mapped_column(JSON, nullable=True)
    version: Mapped[int] = mapped_column(Integer, server_default="1")
    last_consolidated_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )
