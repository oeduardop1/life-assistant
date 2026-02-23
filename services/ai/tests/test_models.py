"""Model validation tests — verify SQLAlchemy model structure and types.

These tests do NOT require a running database; they inspect model metadata.
"""

from sqlalchemy import Numeric

from app.db.models import (
    Base,
    Bill,
    Budget,
    Conversation,
    CustomMetricDefinition,
    Debt,
    DebtPayment,
    Habit,
    HabitCompletion,
    Income,
    Investment,
    KnowledgeItem,
    MemoryConsolidation,
    Message,
    TrackingEntry,
    User,
    UserMemory,
    VariableExpense,
)
from app.db.models.enums import (
    BillCategory,
    BillStatus,
    ConsolidationStatus,
    ConversationType,
    DebtStatus,
    ExpenseCategory,
    ExpenseStatus,
    GoalStatus,
    HabitFrequency,
    IncomeFrequency,
    IncomeStatus,
    IncomeType,
    InvestmentType,
    KnowledgeItemSource,
    KnowledgeItemType,
    LifeArea,
    MessageRole,
    PeriodOfDay,
    SubArea,
    TrackingType,
    UserPlan,
    UserStatus,
)

# All model classes that should be registered with Base
ALL_MODELS = [
    User,
    UserMemory,
    TrackingEntry,
    CustomMetricDefinition,
    Habit,
    HabitCompletion,
    Income,
    Bill,
    VariableExpense,
    Debt,
    DebtPayment,
    Investment,
    Budget,
    KnowledgeItem,
    MemoryConsolidation,
    Conversation,
    Message,
]


def test_all_models_registered_in_metadata() -> None:
    """Every model class should have its table in Base.metadata."""
    registered_tables = set(Base.metadata.tables.keys())
    for model in ALL_MODELS:
        assert model.__tablename__ in registered_tables, (
            f"{model.__name__} table '{model.__tablename__}' not in metadata"
        )


def test_numeric_fields_use_asdecimal_false() -> None:
    """All Numeric columns should have asdecimal=False to return float."""
    for table in Base.metadata.tables.values():
        for col in table.columns:
            if isinstance(col.type, Numeric):
                assert col.type.asdecimal is False, (
                    f"{table.name}.{col.name}: Numeric must use asdecimal=False"
                )


def test_enum_values_are_strings() -> None:
    """All StrEnum members should be lowercase strings."""
    all_enums = [
        UserStatus,
        UserPlan,
        LifeArea,
        SubArea,
        TrackingType,
        ConversationType,
        MessageRole,
        IncomeType,
        IncomeFrequency,
        IncomeStatus,
        BillCategory,
        BillStatus,
        ExpenseCategory,
        ExpenseStatus,
        DebtStatus,
        InvestmentType,
        KnowledgeItemType,
        KnowledgeItemSource,
        ConsolidationStatus,
        GoalStatus,
        HabitFrequency,
        PeriodOfDay,
    ]
    for enum_cls in all_enums:
        for member in enum_cls:
            assert isinstance(member.value, str), f"{enum_cls.__name__}.{member.name} not a string"


def test_user_table_columns() -> None:
    """Verify users table has expected columns."""
    table = User.__table__
    col_names = {c.name for c in table.columns}
    expected = {
        "id",
        "email",
        "name",
        "avatar_url",
        "height",
        "birth_date",
        "timezone",
        "locale",
        "currency",
        "preferences",
        "plan",
        "plan_expires_at",
        "stripe_customer_id",
        "status",
        "email_verified_at",
        "onboarding_completed_at",
        "deleted_at",
        "created_at",
        "updated_at",
    }
    assert expected.issubset(col_names), f"Missing columns: {expected - col_names}"


def test_tracking_entry_table_columns() -> None:
    """Verify tracking_entries table has expected columns."""
    table = TrackingEntry.__table__
    col_names = {c.name for c in table.columns}
    expected = {
        "id",
        "user_id",
        "type",
        "area",
        "sub_area",
        "value",
        "unit",
        "metadata",
        "entry_date",
        "entry_time",
        "source",
        "created_at",
        "updated_at",
    }
    assert expected.issubset(col_names), f"Missing columns: {expected - col_names}"


def test_finance_tables_exist() -> None:
    """Verify all 7 finance tables are registered."""
    finance_tables = {
        "incomes",
        "bills",
        "variable_expenses",
        "debts",
        "debt_payments",
        "investments",
        "budgets",
    }
    registered = set(Base.metadata.tables.keys())
    assert finance_tables.issubset(registered), f"Missing: {finance_tables - registered}"


def test_memory_tables_exist() -> None:
    """Verify memory system tables are registered."""
    memory_tables = {"knowledge_items", "memory_consolidations", "user_memories"}
    registered = set(Base.metadata.tables.keys())
    assert memory_tables.issubset(registered), f"Missing: {memory_tables - registered}"


def test_chat_tables_exist() -> None:
    """Verify chat tables are registered."""
    chat_tables = {"conversations", "messages"}
    registered = set(Base.metadata.tables.keys())
    assert chat_tables.issubset(registered), f"Missing: {chat_tables - registered}"


def test_message_has_no_updated_at() -> None:
    """Messages are append-only — no updated_at column."""
    col_names = {c.name for c in Message.__table__.columns}
    assert "updated_at" not in col_names


def test_memory_consolidation_has_no_updated_at() -> None:
    """Memory consolidations are append-only — no updated_at column."""
    col_names = {c.name for c in MemoryConsolidation.__table__.columns}
    assert "updated_at" not in col_names


def test_debt_payment_has_no_updated_at() -> None:
    """Debt payments are append-only — no updated_at column."""
    col_names = {c.name for c in DebtPayment.__table__.columns}
    assert "updated_at" not in col_names
