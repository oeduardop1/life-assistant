"""SQLAlchemy models for finance tables.

Passive mapping of Drizzle schemas — never generates migrations.
Source: packages/database/src/schema/incomes.ts, bills.ts, variable-expenses.ts,
       debts.ts, debt-payments.ts, investments.ts, budgets.ts
"""

import uuid as _uuid
from datetime import date, datetime

from sqlalchemy import TIMESTAMP, Boolean, Date, Enum, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.models.base import Base, TimestampMixin
from app.db.models.enums import (
    BillCategory,
    BillStatus,
    DebtStatus,
    ExpenseCategory,
    ExpenseStatus,
    IncomeFrequency,
    IncomeStatus,
    IncomeType,
    InvestmentType,
)

_vc = lambda e: [m.value for m in e]  # noqa: E731  # values_callable shorthand


class Income(Base, TimestampMixin):
    __tablename__ = "incomes"

    id: Mapped[_uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    user_id: Mapped[_uuid.UUID] = mapped_column(UUID(as_uuid=True))
    name: Mapped[str] = mapped_column(String(255))
    type: Mapped[IncomeType] = mapped_column(
        Enum(IncomeType, name="income_type", create_type=False, values_callable=_vc)
    )
    frequency: Mapped[IncomeFrequency] = mapped_column(
        Enum(IncomeFrequency, name="income_frequency", create_type=False, values_callable=_vc)
    )
    expected_amount: Mapped[float] = mapped_column(Numeric(precision=12, scale=2, asdecimal=False))
    actual_amount: Mapped[float | None] = mapped_column(
        Numeric(precision=12, scale=2, asdecimal=False), nullable=True
    )
    is_recurring: Mapped[bool] = mapped_column(Boolean, server_default="true")
    recurring_group_id: Mapped[_uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    month_year: Mapped[str] = mapped_column(String(7))
    currency: Mapped[str] = mapped_column(String(3), server_default="BRL")
    status: Mapped[IncomeStatus] = mapped_column(
        Enum(IncomeStatus, name="income_status", create_type=False, values_callable=_vc),
        server_default="active",
    )


class Bill(Base, TimestampMixin):
    __tablename__ = "bills"

    id: Mapped[_uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    user_id: Mapped[_uuid.UUID] = mapped_column(UUID(as_uuid=True))
    name: Mapped[str] = mapped_column(String(255))
    category: Mapped[BillCategory] = mapped_column(
        Enum(BillCategory, name="bill_category", create_type=False, values_callable=_vc)
    )
    amount: Mapped[float] = mapped_column(Numeric(precision=12, scale=2, asdecimal=False))
    due_day: Mapped[int] = mapped_column(Integer)
    status: Mapped[BillStatus] = mapped_column(
        Enum(BillStatus, name="bill_status", create_type=False, values_callable=_vc),
        server_default="pending",
    )
    paid_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    is_recurring: Mapped[bool] = mapped_column(Boolean, server_default="true")
    recurring_group_id: Mapped[_uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    month_year: Mapped[str] = mapped_column(String(7))
    currency: Mapped[str] = mapped_column(String(3), server_default="BRL")


class VariableExpense(Base, TimestampMixin):
    __tablename__ = "variable_expenses"

    id: Mapped[_uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    user_id: Mapped[_uuid.UUID] = mapped_column(UUID(as_uuid=True))
    name: Mapped[str] = mapped_column(String(255))
    category: Mapped[ExpenseCategory] = mapped_column(
        Enum(ExpenseCategory, name="expense_category", create_type=False, values_callable=_vc)
    )
    expected_amount: Mapped[float] = mapped_column(Numeric(precision=12, scale=2, asdecimal=False))
    actual_amount: Mapped[float] = mapped_column(
        Numeric(precision=12, scale=2, asdecimal=False), server_default="0"
    )
    is_recurring: Mapped[bool] = mapped_column(Boolean, server_default="false")
    recurring_group_id: Mapped[_uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    month_year: Mapped[str] = mapped_column(String(7))
    currency: Mapped[str] = mapped_column(String(3), server_default="BRL")
    status: Mapped[ExpenseStatus] = mapped_column(
        Enum(ExpenseStatus, name="expense_status", create_type=False, values_callable=_vc),
        server_default="active",
    )


class Debt(Base, TimestampMixin):
    __tablename__ = "debts"

    id: Mapped[_uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    user_id: Mapped[_uuid.UUID] = mapped_column(UUID(as_uuid=True))
    name: Mapped[str] = mapped_column(String(255))
    creditor: Mapped[str | None] = mapped_column(String(255), nullable=True)
    total_amount: Mapped[float] = mapped_column(Numeric(precision=12, scale=2, asdecimal=False))
    is_negotiated: Mapped[bool] = mapped_column(Boolean, server_default="true")
    total_installments: Mapped[int | None] = mapped_column(Integer, nullable=True)
    installment_amount: Mapped[float | None] = mapped_column(
        Numeric(precision=12, scale=2, asdecimal=False), nullable=True
    )
    current_installment: Mapped[int] = mapped_column(Integer, server_default="1")
    due_day: Mapped[int | None] = mapped_column(Integer, nullable=True)
    start_month_year: Mapped[str | None] = mapped_column(String(7), nullable=True)
    status: Mapped[DebtStatus] = mapped_column(
        Enum(DebtStatus, name="debt_status", create_type=False, values_callable=_vc),
        server_default="active",
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    currency: Mapped[str] = mapped_column(String(3), server_default="BRL")


class DebtPayment(Base):
    __tablename__ = "debt_payments"

    id: Mapped[_uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    user_id: Mapped[_uuid.UUID] = mapped_column(UUID(as_uuid=True))
    debt_id: Mapped[_uuid.UUID] = mapped_column(UUID(as_uuid=True))
    installment_number: Mapped[int] = mapped_column(Integer)
    amount: Mapped[float] = mapped_column(Numeric(precision=12, scale=2, asdecimal=False))
    month_year: Mapped[str] = mapped_column(String(7))
    paid_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now()
    )


class Investment(Base, TimestampMixin):
    __tablename__ = "investments"

    id: Mapped[_uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    user_id: Mapped[_uuid.UUID] = mapped_column(UUID(as_uuid=True))
    name: Mapped[str] = mapped_column(String(255))
    type: Mapped[InvestmentType] = mapped_column(
        Enum(InvestmentType, name="investment_type", create_type=False, values_callable=_vc)
    )
    goal_amount: Mapped[float | None] = mapped_column(
        Numeric(precision=12, scale=2, asdecimal=False), nullable=True
    )
    current_amount: Mapped[float] = mapped_column(
        Numeric(precision=12, scale=2, asdecimal=False), server_default="0"
    )
    monthly_contribution: Mapped[float | None] = mapped_column(
        Numeric(precision=12, scale=2, asdecimal=False), nullable=True
    )
    deadline: Mapped[date | None] = mapped_column(Date, nullable=True)
    currency: Mapped[str] = mapped_column(String(3), server_default="BRL")


class Budget(Base, TimestampMixin):
    __tablename__ = "budgets"

    id: Mapped[_uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    user_id: Mapped[_uuid.UUID] = mapped_column(UUID(as_uuid=True))
    year: Mapped[int] = mapped_column(Integer)
    month: Mapped[int] = mapped_column(Integer)
    category: Mapped[ExpenseCategory | None] = mapped_column(
        Enum(ExpenseCategory, name="expense_category", create_type=False, values_callable=_vc),
        nullable=True,
    )
    amount: Mapped[float] = mapped_column(Numeric(precision=12, scale=2, asdecimal=False))
    currency: Mapped[str] = mapped_column(String(3), server_default="BRL")
    spent_amount: Mapped[float] = mapped_column(
        Numeric(precision=12, scale=2, asdecimal=False), server_default="0"
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
