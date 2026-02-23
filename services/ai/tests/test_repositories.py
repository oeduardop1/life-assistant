"""Repository integration tests — CRUD against real Supabase.

These tests require a running local Supabase instance with migrations applied.
Run: pnpm infra:up && cd services/ai && uv run pytest tests/test_repositories.py -v --run-db
"""

import uuid
from datetime import UTC, date, datetime

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.engine import AsyncSessionFactory
from app.db.models.enums import (
    ConversationType,
    IncomeFrequency,
    IncomeType,
    KnowledgeItemSource,
    KnowledgeItemType,
    LifeArea,
    MessageRole,
    TrackingType,
)
from app.db.repositories.chat import ChatRepository
from app.db.repositories.finance import FinanceRepository
from app.db.repositories.memory import MemoryRepository
from app.db.repositories.tracking import TrackingRepository
from app.db.repositories.user import UserRepository
from app.db.session import get_user_session

pytestmark = pytest.mark.skipif(
    "not config.getoption('--run-db', default=False)",
    reason="Requires --run-db flag and running Supabase",
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _user_session(session_factory: AsyncSessionFactory, user_id: uuid.UUID) -> AsyncSession:
    """Shorthand to enter an RLS-scoped session (used as async context manager)."""
    return get_user_session(session_factory, str(user_id))  # type: ignore[return-value]


# ---------------------------------------------------------------------------
# UserRepository
# ---------------------------------------------------------------------------


class TestUserRepository:
    async def test_get_by_id(
        self,
        session_factory: AsyncSessionFactory,
        seed_test_users: None,
        user_a_id: uuid.UUID,
    ) -> None:
        async with get_user_session(session_factory, str(user_a_id)) as session:
            user = await UserRepository.get_by_id(session, user_a_id)
            assert user is not None
            assert user.name == "User A"

    async def test_get_by_id_not_found(
        self,
        session_factory: AsyncSessionFactory,
        seed_test_users: None,
        user_a_id: uuid.UUID,
    ) -> None:
        fake_id = uuid.UUID("00000000-0000-0000-0000-000000000000")
        async with get_user_session(session_factory, str(user_a_id)) as session:
            user = await UserRepository.get_by_id(session, fake_id)
            assert user is None


# ---------------------------------------------------------------------------
# TrackingRepository
# ---------------------------------------------------------------------------


class TestTrackingRepository:
    async def test_create_and_find(
        self,
        session_factory: AsyncSessionFactory,
        seed_test_users: None,
        user_a_id: uuid.UUID,
    ) -> None:
        entry_id = uuid.uuid4()
        async with get_user_session(session_factory, str(user_a_id)) as session:
            entry = await TrackingRepository.create(
                session,
                {
                    "id": entry_id,
                    "user_id": user_a_id,
                    "type": TrackingType.WEIGHT,
                    "area": LifeArea.HEALTH,
                    "value": 82.5,
                    "entry_date": date.today(),
                },
            )
            assert entry.id == entry_id
            assert isinstance(entry.value, float)
            assert entry.value == 82.5

        # Find it back
        async with get_user_session(session_factory, str(user_a_id)) as session:
            entries = await TrackingRepository.find_by_filters(
                session, user_a_id, tracking_type=TrackingType.WEIGHT
            )
            assert any(e.id == entry_id for e in entries)

        # Cleanup
        async with get_user_session(session_factory, str(user_a_id)) as session:
            await TrackingRepository.delete(session, entry_id)

    async def test_update(
        self,
        session_factory: AsyncSessionFactory,
        seed_test_users: None,
        user_a_id: uuid.UUID,
    ) -> None:
        entry_id = uuid.uuid4()
        async with get_user_session(session_factory, str(user_a_id)) as session:
            await TrackingRepository.create(
                session,
                {
                    "id": entry_id,
                    "user_id": user_a_id,
                    "type": TrackingType.WATER,
                    "area": LifeArea.HEALTH,
                    "value": 1.5,
                    "entry_date": date.today(),
                },
            )

        async with get_user_session(session_factory, str(user_a_id)) as session:
            updated = await TrackingRepository.update(session, entry_id, {"value": 2.0})
            assert updated is not None
            assert updated.value == 2.0

        # Cleanup
        async with get_user_session(session_factory, str(user_a_id)) as session:
            await TrackingRepository.delete(session, entry_id)

    async def test_delete_batch(
        self,
        session_factory: AsyncSessionFactory,
        seed_test_users: None,
        user_a_id: uuid.UUID,
    ) -> None:
        ids = [uuid.uuid4(), uuid.uuid4()]
        async with get_user_session(session_factory, str(user_a_id)) as session:
            for eid in ids:
                await TrackingRepository.create(
                    session,
                    {
                        "id": eid,
                        "user_id": user_a_id,
                        "type": TrackingType.MOOD,
                        "area": LifeArea.HEALTH,
                        "value": 7.0,
                        "entry_date": date.today(),
                    },
                )

        async with get_user_session(session_factory, str(user_a_id)) as session:
            count = await TrackingRepository.delete_batch(session, ids)
            assert count == 2


# ---------------------------------------------------------------------------
# FinanceRepository
# ---------------------------------------------------------------------------


class TestFinanceRepository:
    async def test_get_incomes(
        self,
        session_factory: AsyncSessionFactory,
        seed_test_users: None,
        user_a_id: uuid.UUID,
    ) -> None:
        income_id = uuid.uuid4()
        async with get_user_session(session_factory, str(user_a_id)) as session:
            from app.db.models.finance import Income

            obj = Income(
                id=income_id,
                user_id=user_a_id,
                name="Test Salary",
                type=IncomeType.SALARY,
                frequency=IncomeFrequency.MONTHLY,
                expected_amount=5000.00,
                month_year="2026-02",
            )
            session.add(obj)
            await session.flush()

        async with get_user_session(session_factory, str(user_a_id)) as session:
            incomes = await FinanceRepository.get_incomes(session, user_a_id, "2026-02")
            assert any(i.id == income_id for i in incomes)
            income = next(i for i in incomes if i.id == income_id)
            assert isinstance(income.expected_amount, float)
            assert income.expected_amount == 5000.00

        # Cleanup
        async with get_user_session(session_factory, str(user_a_id)) as session:
            from sqlalchemy import delete

            from app.db.models.finance import Income as IncomeModel

            await session.execute(delete(IncomeModel).where(IncomeModel.id == income_id))

    async def test_create_expense(
        self,
        session_factory: AsyncSessionFactory,
        seed_test_users: None,
        user_a_id: uuid.UUID,
    ) -> None:
        expense_id = uuid.uuid4()
        async with get_user_session(session_factory, str(user_a_id)) as session:
            expense = await FinanceRepository.create_expense(
                session,
                {
                    "id": expense_id,
                    "user_id": user_a_id,
                    "name": "Groceries",
                    "category": "food",
                    "expected_amount": 500.00,
                    "month_year": "2026-02",
                },
            )
            assert expense.id == expense_id

        # Cleanup
        async with get_user_session(session_factory, str(user_a_id)) as session:
            from sqlalchemy import delete

            from app.db.models.finance import VariableExpense

            await session.execute(delete(VariableExpense).where(VariableExpense.id == expense_id))


# ---------------------------------------------------------------------------
# MemoryRepository
# ---------------------------------------------------------------------------


class TestMemoryRepository:
    async def test_create_and_search_knowledge(
        self,
        session_factory: AsyncSessionFactory,
        seed_test_users: None,
        user_a_id: uuid.UUID,
    ) -> None:
        item_id = uuid.uuid4()
        async with get_user_session(session_factory, str(user_a_id)) as session:
            item = await MemoryRepository.create_knowledge(
                session,
                {
                    "id": item_id,
                    "user_id": user_a_id,
                    "type": KnowledgeItemType.FACT,
                    "title": "Likes coffee",
                    "content": "User prefers espresso in the morning.",
                    "source": KnowledgeItemSource.CONVERSATION,
                },
            )
            assert item.id == item_id

        async with get_user_session(session_factory, str(user_a_id)) as session:
            results = await MemoryRepository.search_knowledge(
                session, user_a_id, item_type=KnowledgeItemType.FACT
            )
            assert any(k.id == item_id for k in results)

        # Cleanup
        async with get_user_session(session_factory, str(user_a_id)) as session:
            from sqlalchemy import delete

            from app.db.models.memory import KnowledgeItem

            await session.execute(delete(KnowledgeItem).where(KnowledgeItem.id == item_id))


# ---------------------------------------------------------------------------
# ChatRepository
# ---------------------------------------------------------------------------


class TestChatRepository:
    async def test_create_message_and_get(
        self,
        session_factory: AsyncSessionFactory,
        seed_test_users: None,
        user_a_id: uuid.UUID,
    ) -> None:
        conv_id = uuid.uuid4()
        msg_id = uuid.uuid4()

        # Create conversation + message
        async with get_user_session(session_factory, str(user_a_id)) as session:
            from app.db.models.chat import Conversation

            conv = Conversation(
                id=conv_id,
                user_id=user_a_id,
                type=ConversationType.GENERAL,
                title="Test Chat",
            )
            session.add(conv)
            await session.flush()

            msg = await ChatRepository.create_message(
                session,
                {
                    "id": msg_id,
                    "conversation_id": conv_id,
                    "role": MessageRole.USER,
                    "content": "Hello!",
                },
            )
            assert msg.id == msg_id

        # Read back
        async with get_user_session(session_factory, str(user_a_id)) as session:
            conv = await ChatRepository.get_conversation(session, conv_id)
            assert conv is not None
            assert conv.title == "Test Chat"

            messages = await ChatRepository.get_messages(session, conv_id)
            assert len(messages) == 1
            assert messages[0].content == "Hello!"

        # get_conversations
        async with get_user_session(session_factory, str(user_a_id)) as session:
            convs = await ChatRepository.get_conversations(session, user_a_id)
            assert any(c.id == conv_id for c in convs)

        # Cleanup (cascade deletes messages)
        async with get_user_session(session_factory, str(user_a_id)) as session:
            from sqlalchemy import delete

            from app.db.models.chat import Conversation as Conv

            await session.execute(delete(Conv).where(Conv.id == conv_id))

    async def test_get_messages_since(
        self,
        session_factory: AsyncSessionFactory,
        seed_test_users: None,
        user_a_id: uuid.UUID,
    ) -> None:
        conv_id = uuid.uuid4()
        since = datetime.now(tz=UTC)

        async with get_user_session(session_factory, str(user_a_id)) as session:
            from app.db.models.chat import Conversation

            conv = Conversation(
                id=conv_id,
                user_id=user_a_id,
                type=ConversationType.GENERAL,
            )
            session.add(conv)
            await session.flush()

            await ChatRepository.create_message(
                session,
                {
                    "id": uuid.uuid4(),
                    "conversation_id": conv_id,
                    "role": MessageRole.USER,
                    "content": "Recent message",
                },
            )

        async with get_user_session(session_factory, str(user_a_id)) as session:
            messages = await ChatRepository.get_messages_since(session, user_a_id, since)
            assert any(m.content == "Recent message" for m in messages)

        # Cleanup
        async with get_user_session(session_factory, str(user_a_id)) as session:
            from sqlalchemy import delete

            from app.db.models.chat import Conversation as Conv

            await session.execute(delete(Conv).where(Conv.id == conv_id))
