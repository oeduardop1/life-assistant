"""Python StrEnum classes mirroring PostgreSQL CREATE TYPE enums.

Only enums referenced by SQLAlchemy models in this service are included.
Source of truth: packages/database/src/schema/enums.ts
"""

from enum import StrEnum

# --- User ---


class UserStatus(StrEnum):
    PENDING = "pending"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    CANCELED = "canceled"
    DELETED = "deleted"


class UserPlan(StrEnum):
    FREE = "free"
    PRO = "pro"
    PREMIUM = "premium"


# --- Life Areas (ADR-017) ---


class LifeArea(StrEnum):
    HEALTH = "health"
    FINANCE = "finance"
    PROFESSIONAL = "professional"
    LEARNING = "learning"
    SPIRITUAL = "spiritual"
    RELATIONSHIPS = "relationships"


class SubArea(StrEnum):
    PHYSICAL = "physical"
    MENTAL = "mental"
    LEISURE = "leisure"
    BUDGET = "budget"
    SAVINGS = "savings"
    DEBTS = "debts"
    INVESTMENTS = "investments"
    CAREER = "career"
    BUSINESS = "business"
    FORMAL = "formal"
    INFORMAL = "informal"
    PRACTICE = "practice"
    COMMUNITY = "community"
    FAMILY = "family"
    ROMANTIC = "romantic"
    SOCIAL = "social"


# --- Tracking ---


class TrackingType(StrEnum):
    WEIGHT = "weight"
    WATER = "water"
    SLEEP = "sleep"
    EXERCISE = "exercise"
    MOOD = "mood"
    ENERGY = "energy"
    CUSTOM = "custom"


class ExerciseIntensity(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class ExerciseType(StrEnum):
    CARDIO = "cardio"
    STRENGTH = "strength"
    FLEXIBILITY = "flexibility"
    SPORTS = "sports"
    OTHER = "other"


# --- Chat ---


class ConversationType(StrEnum):
    GENERAL = "general"
    COUNSELOR = "counselor"
    QUICK_ACTION = "quick_action"
    REPORT = "report"


class MessageRole(StrEnum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


# --- Finance ---


class IncomeType(StrEnum):
    SALARY = "salary"
    FREELANCE = "freelance"
    BONUS = "bonus"
    PASSIVE = "passive"
    INVESTMENT = "investment"
    GIFT = "gift"
    OTHER = "other"


class IncomeFrequency(StrEnum):
    MONTHLY = "monthly"
    BIWEEKLY = "biweekly"
    WEEKLY = "weekly"
    ANNUAL = "annual"
    IRREGULAR = "irregular"


class IncomeStatus(StrEnum):
    ACTIVE = "active"
    EXCLUDED = "excluded"


class BillCategory(StrEnum):
    HOUSING = "housing"
    UTILITIES = "utilities"
    SUBSCRIPTION = "subscription"
    INSURANCE = "insurance"
    OTHER = "other"


class BillStatus(StrEnum):
    PENDING = "pending"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELED = "canceled"


class ExpenseCategory(StrEnum):
    FOOD = "food"
    TRANSPORT = "transport"
    HOUSING = "housing"
    HEALTH = "health"
    EDUCATION = "education"
    ENTERTAINMENT = "entertainment"
    SHOPPING = "shopping"
    BILLS = "bills"
    SUBSCRIPTIONS = "subscriptions"
    TRAVEL = "travel"
    GIFTS = "gifts"
    INVESTMENTS = "investments"
    OTHER = "other"


class ExpenseStatus(StrEnum):
    ACTIVE = "active"
    EXCLUDED = "excluded"


class DebtStatus(StrEnum):
    ACTIVE = "active"
    OVERDUE = "overdue"
    PAID_OFF = "paid_off"
    SETTLED = "settled"
    DEFAULTED = "defaulted"


class InvestmentType(StrEnum):
    EMERGENCY_FUND = "emergency_fund"
    RETIREMENT = "retirement"
    SHORT_TERM = "short_term"
    LONG_TERM = "long_term"
    EDUCATION = "education"
    CUSTOM = "custom"


# --- Memory (ADR-012) ---


class KnowledgeItemType(StrEnum):
    FACT = "fact"
    PREFERENCE = "preference"
    MEMORY = "memory"
    INSIGHT = "insight"
    PERSON = "person"


class KnowledgeItemSource(StrEnum):
    CONVERSATION = "conversation"
    USER_INPUT = "user_input"
    AI_INFERENCE = "ai_inference"


class ConsolidationStatus(StrEnum):
    COMPLETED = "completed"
    FAILED = "failed"
    PARTIAL = "partial"


# --- Goals & Habits ---


class GoalStatus(StrEnum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELED = "canceled"


class HabitFrequency(StrEnum):
    DAILY = "daily"
    WEEKDAYS = "weekdays"
    WEEKENDS = "weekends"
    CUSTOM = "custom"


class PeriodOfDay(StrEnum):
    MORNING = "morning"
    AFTERNOON = "afternoon"
    EVENING = "evening"
    ANYTIME = "anytime"
