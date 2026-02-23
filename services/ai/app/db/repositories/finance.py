"""Finance repository — read/write for incomes, bills, expenses, debts, investments, budgets."""

import uuid as _uuid
from datetime import datetime
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.finance import (
    Bill,
    Budget,
    Debt,
    DebtPayment,
    Income,
    Investment,
    VariableExpense,
)


class FinanceRepository:
    # --- Incomes ---

    @staticmethod
    async def get_incomes(
        session: AsyncSession, user_id: _uuid.UUID, month_year: str
    ) -> list[Income]:
        result = await session.execute(
            select(Income).where(Income.user_id == user_id, Income.month_year == month_year)
        )
        return list(result.scalars().all())

    # --- Bills ---

    @staticmethod
    async def get_bills(
        session: AsyncSession,
        user_id: _uuid.UUID,
        month_year: str,
        *,
        status: str | None = None,
    ) -> list[Bill]:
        stmt = select(Bill).where(Bill.user_id == user_id, Bill.month_year == month_year)
        if status is not None:
            stmt = stmt.where(Bill.status == status)
        result = await session.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_pending_bills(session: AsyncSession, user_id: _uuid.UUID) -> list[Bill]:
        result = await session.execute(
            select(Bill).where(Bill.user_id == user_id, Bill.status == "pending")
        )
        return list(result.scalars().all())

    @staticmethod
    async def mark_bill_paid(
        session: AsyncSession, bill_id: _uuid.UUID, paid_at: datetime
    ) -> Bill | None:
        await session.execute(
            update(Bill).where(Bill.id == bill_id).values(status="paid", paid_at=paid_at)
        )
        result = await session.execute(select(Bill).where(Bill.id == bill_id))
        return result.scalar_one_or_none()

    # --- Variable Expenses ---

    @staticmethod
    async def get_expenses(
        session: AsyncSession,
        user_id: _uuid.UUID,
        month_year: str,
        *,
        category: str | None = None,
    ) -> list[VariableExpense]:
        stmt = select(VariableExpense).where(
            VariableExpense.user_id == user_id, VariableExpense.month_year == month_year
        )
        if category is not None:
            stmt = stmt.where(VariableExpense.category == category)
        result = await session.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def create_expense(session: AsyncSession, data: dict[str, Any]) -> VariableExpense:
        obj = VariableExpense(**data)
        session.add(obj)
        await session.flush()
        return obj

    # --- Debts ---

    @staticmethod
    async def get_debts(
        session: AsyncSession, user_id: _uuid.UUID, *, status: str | None = None
    ) -> list[Debt]:
        stmt = select(Debt).where(Debt.user_id == user_id)
        if status is not None:
            stmt = stmt.where(Debt.status == status)
        result = await session.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_debt_payments(session: AsyncSession, debt_id: _uuid.UUID) -> list[DebtPayment]:
        result = await session.execute(
            select(DebtPayment)
            .where(DebtPayment.debt_id == debt_id)
            .order_by(DebtPayment.installment_number)
        )
        return list(result.scalars().all())

    @staticmethod
    async def create_debt_payment(session: AsyncSession, data: dict[str, Any]) -> DebtPayment:
        obj = DebtPayment(**data)
        session.add(obj)
        await session.flush()
        return obj

    # --- Investments ---

    @staticmethod
    async def get_investments(session: AsyncSession, user_id: _uuid.UUID) -> list[Investment]:
        result = await session.execute(select(Investment).where(Investment.user_id == user_id))
        return list(result.scalars().all())

    # --- Budgets ---

    @staticmethod
    async def get_budgets(
        session: AsyncSession, user_id: _uuid.UUID, year: int, month: int
    ) -> list[Budget]:
        result = await session.execute(
            select(Budget).where(
                Budget.user_id == user_id, Budget.year == year, Budget.month == month
            )
        )
        return list(result.scalars().all())
