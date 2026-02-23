"""SQLAlchemy models for tracking tables.

Passive mapping of Drizzle schemas — never generates migrations.
Source: packages/database/src/schema/tracking.ts, custom-metrics.ts, goals.ts (habits)
"""

import uuid as _uuid
from datetime import date, datetime, time
from typing import Any

from sqlalchemy import (
    JSON,
    TIMESTAMP,
    Boolean,
    Date,
    Enum,
    Integer,
    Numeric,
    String,
    Text,
    Time,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.models.base import Base, SoftDeleteMixin, TimestampMixin
from app.db.models.enums import HabitFrequency, LifeArea, PeriodOfDay, SubArea, TrackingType

_vc = lambda e: [m.value for m in e]  # noqa: E731  # values_callable shorthand


class TrackingEntry(Base, TimestampMixin):
    __tablename__ = "tracking_entries"

    id: Mapped[_uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    user_id: Mapped[_uuid.UUID] = mapped_column(UUID(as_uuid=True))
    type: Mapped[TrackingType] = mapped_column(
        Enum(TrackingType, name="tracking_type", create_type=False, values_callable=_vc)
    )
    area: Mapped[LifeArea] = mapped_column(
        Enum(LifeArea, name="life_area", create_type=False, values_callable=_vc)
    )
    sub_area: Mapped[SubArea | None] = mapped_column(
        Enum(SubArea, name="sub_area", create_type=False, values_callable=_vc), nullable=True
    )
    value: Mapped[float] = mapped_column(Numeric(precision=10, scale=2, asdecimal=False))
    unit: Mapped[str | None] = mapped_column(String(20), nullable=True)
    entry_metadata: Mapped[dict[str, Any] | None] = mapped_column("metadata", JSON, nullable=True)
    entry_date: Mapped[date] = mapped_column(Date)
    entry_time: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    source: Mapped[str] = mapped_column(String(50), server_default="form")


class CustomMetricDefinition(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "custom_metric_definitions"

    id: Mapped[_uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    user_id: Mapped[_uuid.UUID] = mapped_column(UUID(as_uuid=True))
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    icon: Mapped[str] = mapped_column(String(50), server_default="📊")
    color: Mapped[str | None] = mapped_column(String(7), nullable=True)
    unit: Mapped[str | None] = mapped_column(String(20), nullable=True)
    min_value: Mapped[float | None] = mapped_column(
        Numeric(precision=10, scale=2, asdecimal=False), nullable=True
    )
    max_value: Mapped[float | None] = mapped_column(
        Numeric(precision=10, scale=2, asdecimal=False), nullable=True
    )
    area: Mapped[LifeArea] = mapped_column(
        Enum(LifeArea, name="life_area", create_type=False, values_callable=_vc),
        server_default="learning",
    )
    sub_area: Mapped[SubArea | None] = mapped_column(
        Enum(SubArea, name="sub_area", create_type=False, values_callable=_vc), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, server_default="true")


class Habit(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "habits"

    id: Mapped[_uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    user_id: Mapped[_uuid.UUID] = mapped_column(UUID(as_uuid=True))
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    icon: Mapped[str] = mapped_column(String(50), server_default="✓")
    color: Mapped[str | None] = mapped_column(String(7), nullable=True)
    frequency: Mapped[HabitFrequency] = mapped_column(
        Enum(HabitFrequency, name="habit_frequency", create_type=False, values_callable=_vc),
        server_default="daily",
    )
    frequency_days: Mapped[list[int] | None] = mapped_column(JSON, nullable=True)
    period_of_day: Mapped[PeriodOfDay] = mapped_column(
        Enum(PeriodOfDay, name="period_of_day", create_type=False, values_callable=_vc),
        server_default="anytime",
    )
    sort_order: Mapped[int] = mapped_column(Integer, server_default="0")
    longest_streak: Mapped[int] = mapped_column(Integer, server_default="0")
    reminder_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    reminder_enabled: Mapped[bool] = mapped_column(Boolean, server_default="false")
    is_active: Mapped[bool] = mapped_column(Boolean, server_default="true")


class HabitCompletion(Base):
    __tablename__ = "habit_completions"

    id: Mapped[_uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    habit_id: Mapped[_uuid.UUID] = mapped_column(UUID(as_uuid=True))
    user_id: Mapped[_uuid.UUID] = mapped_column(UUID(as_uuid=True))
    completion_date: Mapped[date] = mapped_column(Date)
    completed_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now()
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str] = mapped_column(String(50), server_default="form")
