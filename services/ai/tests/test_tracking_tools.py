"""Unit tests for tracking tools (mocked repositories — no DB required)."""

from __future__ import annotations

import json
import uuid
from datetime import date, timedelta
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.db.models.enums import HabitFrequency, LifeArea, PeriodOfDay, SubArea, TrackingType
from app.db.models.tracking import Habit, HabitCompletion, TrackingEntry
from app.tools.tracking.delete_metric import delete_metric
from app.tools.tracking.get_habits import get_habits
from app.tools.tracking.get_history import get_history
from app.tools.tracking.record_habit import record_habit
from app.tools.tracking.record_metric import record_metric
from app.tools.tracking.update_metric import update_metric

# ---------------------------------------------------------------------------
# Test helpers
# ---------------------------------------------------------------------------

TEST_USER_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
TEST_ENTRY_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
TEST_HABIT_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc"


def _make_config(user_id: str = TEST_USER_ID) -> dict[str, Any]:
    """Create a mock RunnableConfig with session_factory for tool testing."""
    mock_session = AsyncMock()
    mock_session_cm = AsyncMock()
    mock_session_cm.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session_cm.__aexit__ = AsyncMock(return_value=None)

    mock_factory = MagicMock(return_value=mock_session_cm)

    return {
        "configurable": {
            "session_factory": mock_factory,
            "user_id": user_id,
            "user_timezone": "America/Sao_Paulo",
        }
    }


def _make_tracking_entry(
    entry_id: str = TEST_ENTRY_ID,
    tracking_type: str = "weight",
    value: float = 80.0,
    unit: str = "kg",
    entry_date: date | None = None,
) -> TrackingEntry:
    """Create a mock TrackingEntry."""
    entry = MagicMock(spec=TrackingEntry)
    entry.id = uuid.UUID(entry_id)
    entry.user_id = uuid.UUID(TEST_USER_ID)
    entry.type = TrackingType(tracking_type)
    entry.area = LifeArea.HEALTH
    entry.sub_area = SubArea.PHYSICAL
    entry.value = value
    entry.unit = unit
    entry.entry_date = entry_date or date.today()
    entry.entry_metadata = None
    entry.source = "chat"
    return entry


def _make_habit(
    habit_id: str = TEST_HABIT_ID,
    name: str = "Meditação",
    icon: str = "🧘",
) -> Habit:
    """Create a mock Habit."""
    habit = MagicMock(spec=Habit)
    habit.id = uuid.UUID(habit_id)
    habit.user_id = uuid.UUID(TEST_USER_ID)
    habit.name = name
    habit.icon = icon
    habit.frequency = HabitFrequency.DAILY
    habit.period_of_day = PeriodOfDay.MORNING
    habit.sort_order = 0
    habit.longest_streak = 5
    habit.is_active = True
    habit.deleted_at = None
    return habit


def _make_completion(
    habit_id: str = TEST_HABIT_ID,
    completion_date: date | None = None,
) -> HabitCompletion:
    """Create a mock HabitCompletion."""
    comp = MagicMock(spec=HabitCompletion)
    comp.id = uuid.uuid4()
    comp.habit_id = uuid.UUID(habit_id)
    comp.user_id = uuid.UUID(TEST_USER_ID)
    comp.completion_date = completion_date or date.today()
    comp.source = "chat"
    comp.notes = None
    return comp


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
@patch("app.tools.tracking.record_metric.get_user_session")
@patch("app.tools.tracking.record_metric.TrackingRepository")
async def test_record_metric_success(
    mock_repo: MagicMock, mock_session: MagicMock
) -> None:
    """record_metric with valid params returns success JSON with entry ID."""
    mock_entry = _make_tracking_entry(value=2000.0, unit="ml", tracking_type="water")
    mock_repo.create = AsyncMock(return_value=mock_entry)
    mock_session.return_value = AsyncMock()
    mock_session.return_value.__aenter__ = AsyncMock()
    mock_session.return_value.__aexit__ = AsyncMock(return_value=None)

    config = _make_config()
    result = await record_metric.ainvoke(
        {"metric_type": "water", "value": 2000.0, "date": "2026-02-23"},
        config,
    )

    parsed = json.loads(result)
    assert parsed["success"] is True
    assert "entryId" in parsed
    assert "Registrado" in parsed["message"]
    assert "água" in parsed["message"]


@pytest.mark.asyncio
async def test_record_metric_validation_rejects_out_of_range() -> None:
    """record_metric rejects values outside allowed ranges."""
    config = _make_config()

    # weight=600 → out of range (max 500)
    result = await record_metric.ainvoke(
        {"metric_type": "weight", "value": 600.0},
        config,
    )
    parsed = json.loads(result)
    assert "error" in parsed
    assert "intervalo" in parsed["error"]

    # water=-1 → out of range (min 1)
    result = await record_metric.ainvoke(
        {"metric_type": "water", "value": -1.0},
        config,
    )
    parsed = json.loads(result)
    assert "error" in parsed

    # mood=15 → out of range (max 10)
    result = await record_metric.ainvoke(
        {"metric_type": "mood", "value": 15.0},
        config,
    )
    parsed = json.loads(result)
    assert "error" in parsed


@pytest.mark.asyncio
@patch("app.tools.tracking.get_history.get_user_session")
@patch("app.tools.tracking.get_history.TrackingRepository")
async def test_get_history_returns_formatted_entries(
    mock_repo: MagicMock, mock_session: MagicMock
) -> None:
    """get_history returns entries with real UUIDs, stats, and a warning note."""
    today = date.today()
    entries = [
        _make_tracking_entry(
            entry_id="11111111-1111-1111-1111-111111111111",
            value=80.0,
            entry_date=today,
        ),
        _make_tracking_entry(
            entry_id="22222222-2222-2222-2222-222222222222",
            value=79.5,
            entry_date=today - timedelta(days=1),
        ),
    ]
    mock_repo.find_by_filters = AsyncMock(return_value=entries)
    mock_session.return_value = AsyncMock()
    mock_session.return_value.__aenter__ = AsyncMock()
    mock_session.return_value.__aexit__ = AsyncMock(return_value=None)

    config = _make_config()
    result = await get_history.ainvoke(
        {"metric_type": "weight", "days": 30},
        config,
    )

    parsed = json.loads(result)
    assert "_note" in parsed
    assert "EXATO" in parsed["_note"]
    assert len(parsed["entries"]) == 2
    assert parsed["entries"][0]["id"] == "11111111-1111-1111-1111-111111111111"
    assert parsed["stats"]["count"] == 2
    assert parsed["stats"]["average"] == 79.75


@pytest.mark.asyncio
@patch("app.tools.tracking.update_metric.get_user_session")
@patch("app.tools.tracking.update_metric.TrackingRepository")
async def test_update_metric_not_found(
    mock_repo: MagicMock, mock_session: MagicMock
) -> None:
    """update_metric returns error when entry does not exist."""
    mock_repo.get_by_id = AsyncMock(return_value=None)
    mock_session.return_value = AsyncMock()
    mock_session.return_value.__aenter__ = AsyncMock()
    mock_session.return_value.__aexit__ = AsyncMock(return_value=None)

    config = _make_config()
    result = await update_metric.ainvoke(
        {"entry_id": TEST_ENTRY_ID, "value": 81.0},
        config,
    )

    parsed = json.loads(result)
    assert "error" in parsed
    assert "não encontrado" in parsed["error"]


@pytest.mark.asyncio
@patch("app.tools.tracking.delete_metric.get_user_session")
@patch("app.tools.tracking.delete_metric.TrackingRepository")
async def test_delete_metric_success(
    mock_repo: MagicMock, mock_session: MagicMock
) -> None:
    """delete_metric returns PT-BR message with deleted entry details."""
    entry = _make_tracking_entry(value=80.5)
    mock_repo.get_by_id = AsyncMock(return_value=entry)
    mock_repo.delete = AsyncMock()
    mock_session.return_value = AsyncMock()
    mock_session.return_value.__aenter__ = AsyncMock()
    mock_session.return_value.__aexit__ = AsyncMock(return_value=None)

    config = _make_config()
    result = await delete_metric.ainvoke(
        {"entry_id": TEST_ENTRY_ID},
        config,
    )

    parsed = json.loads(result)
    assert parsed["success"] is True
    assert "Removido" in parsed["message"]
    assert "peso" in parsed["message"]


@pytest.mark.asyncio
@patch("app.tools.tracking.record_habit.get_user_session")
@patch("app.tools.tracking.record_habit.TrackingRepository")
async def test_record_habit_fuzzy_matching(
    mock_repo: MagicMock, mock_session: MagicMock
) -> None:
    """record_habit fuzzy matches 'meditar' → 'Meditação' and 'exerc' → 'Exercício'."""
    habits = [
        _make_habit(
            habit_id="cccccccc-cccc-cccc-cccc-cccccccccccc",
            name="Meditação",
            icon="🧘",
        ),
        _make_habit(
            habit_id="dddddddd-dddd-dddd-dddd-dddddddddddd",
            name="Exercício",
            icon="💪",
        ),
    ]
    mock_repo.get_habits = AsyncMock(return_value=habits)
    mock_repo.get_completion_for_date = AsyncMock(return_value=None)
    mock_repo.create_habit_completion = AsyncMock()
    mock_repo.get_recent_completions = AsyncMock(return_value=[])
    mock_repo.compute_streak = MagicMock(return_value=1)
    mock_session.return_value = AsyncMock()
    mock_session.return_value.__aenter__ = AsyncMock()
    mock_session.return_value.__aexit__ = AsyncMock(return_value=None)

    config = _make_config()

    # "Meditação" exact match (case-insensitive)
    result = await record_habit.ainvoke(
        {"habit_name": "meditação", "date": "2026-02-23"},
        config,
    )
    parsed = json.loads(result)
    assert parsed["success"] is True
    assert parsed["habitName"] == "Meditação"

    # Reset mocks for second invocation
    mock_repo.get_completion_for_date = AsyncMock(return_value=None)
    mock_repo.create_habit_completion = AsyncMock()
    mock_repo.get_recent_completions = AsyncMock(return_value=[])

    # "exerc" should match "Exercício" via contains
    result = await record_habit.ainvoke(
        {"habit_name": "exerc", "date": "2026-02-23"},
        config,
    )
    parsed = json.loads(result)
    assert parsed["success"] is True
    assert parsed["habitName"] == "Exercício"


@pytest.mark.asyncio
@patch("app.tools.tracking.record_habit.get_user_session")
@patch("app.tools.tracking.record_habit.TrackingRepository")
async def test_record_habit_already_completed(
    mock_repo: MagicMock, mock_session: MagicMock
) -> None:
    """record_habit returns graceful message when habit is already completed for date."""
    habit = _make_habit()
    existing_completion = _make_completion(completion_date=date(2026, 2, 23))

    mock_repo.get_habits = AsyncMock(return_value=[habit])
    mock_repo.get_completion_for_date = AsyncMock(return_value=existing_completion)
    mock_session.return_value = AsyncMock()
    mock_session.return_value.__aenter__ = AsyncMock()
    mock_session.return_value.__aexit__ = AsyncMock(return_value=None)

    config = _make_config()
    result = await record_habit.ainvoke(
        {"habit_name": "Meditação", "date": "2026-02-23"},
        config,
    )

    parsed = json.loads(result)
    assert parsed["success"] is False
    assert parsed["alreadyCompleted"] is True
    assert "já estava marcado" in parsed["message"]


@pytest.mark.asyncio
@patch("app.tools.tracking.get_habits.get_user_session")
@patch("app.tools.tracking.get_habits.TrackingRepository")
async def test_get_habits_with_streaks_and_today_status(
    mock_repo: MagicMock, mock_session: MagicMock
) -> None:
    """get_habits returns formatted list with streaks and today status."""
    habit = _make_habit()
    today = date.today()
    completions = [
        _make_completion(completion_date=today),
        _make_completion(completion_date=today - timedelta(days=1)),
    ]

    mock_repo.get_habits = AsyncMock(return_value=[habit])
    mock_repo.get_recent_completions = AsyncMock(return_value=completions)
    mock_repo.compute_streak = MagicMock(return_value=2)
    mock_repo.get_completion_for_date = AsyncMock(return_value=completions[0])
    mock_session.return_value = AsyncMock()
    mock_session.return_value.__aenter__ = AsyncMock()
    mock_session.return_value.__aexit__ = AsyncMock(return_value=None)

    config = _make_config()
    result = await get_habits.ainvoke(
        {"include_streaks": True, "include_today_status": True},
        config,
    )

    parsed = json.loads(result)
    assert parsed["count"] == 1
    h = parsed["habits"][0]
    assert h["name"] == "Meditação"
    assert h["icon"] == "🧘"
    assert h["currentStreak"] == 2
    assert h["completedToday"] is True
