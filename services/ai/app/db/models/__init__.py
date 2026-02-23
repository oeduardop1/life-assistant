"""SQLAlchemy models — passive mappings of Drizzle schemas."""

from app.db.models.base import Base, SoftDeleteMixin, TimestampMixin
from app.db.models.chat import Conversation, Message
from app.db.models.finance import (
    Bill,
    Budget,
    Debt,
    DebtPayment,
    Income,
    Investment,
    VariableExpense,
)
from app.db.models.memory import KnowledgeItem, MemoryConsolidation
from app.db.models.tracking import CustomMetricDefinition, Habit, HabitCompletion, TrackingEntry
from app.db.models.users import User, UserMemory

__all__ = [
    "Base",
    "Bill",
    "Budget",
    "Conversation",
    "CustomMetricDefinition",
    "Debt",
    "DebtPayment",
    "Habit",
    "HabitCompletion",
    "Income",
    "Investment",
    "KnowledgeItem",
    "MemoryConsolidation",
    "Message",
    "SoftDeleteMixin",
    "TimestampMixin",
    "TrackingEntry",
    "User",
    "UserMemory",
    "VariableExpense",
]
