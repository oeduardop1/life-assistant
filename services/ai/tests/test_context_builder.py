"""Tests for context builder — app/prompts/context_builder.py."""

import uuid
from unittest.mock import AsyncMock, patch

import pytest

from app.prompts.context_builder import build_context


def _mock_user(*, name: str = "Eduardo", timezone: str = "America/Sao_Paulo"):
    """Create a mock User object."""
    user = AsyncMock()
    user.name = name
    user.timezone = timezone
    return user


def _mock_memories(
    *,
    bio: str | None = "Desenvolvedor apaixonado por tecnologia",
    occupation: str | None = "Desenvolvedor",
    family_context: str | None = None,
    current_goals: list[str] | None = None,
    current_challenges: list[str] | None = None,
    top_of_mind: list[str] | None = None,
    values: list[str] | None = None,
    communication_style: str | None = None,
):
    """Create a mock UserMemory object."""
    mem = AsyncMock()
    mem.bio = bio
    mem.occupation = occupation
    mem.family_context = family_context
    mem.current_goals = current_goals
    mem.current_challenges = current_challenges
    mem.top_of_mind = top_of_mind
    mem.values = values
    mem.communication_style = communication_style
    return mem


@pytest.mark.asyncio
async def test_context_includes_user_name_and_timezone() -> None:
    session = AsyncMock()
    user = _mock_user(name="Maria", timezone="America/Recife")

    with (
        patch(
            "app.prompts.context_builder.UserRepository.get_by_id",
            return_value=user,
        ),
        patch(
            "app.prompts.context_builder.UserRepository.get_memories",
            return_value=None,
        ),
    ):
        prompt = await build_context(session, str(uuid.uuid4()), "general")

    assert "Maria" in prompt
    assert "America/Recife" in prompt


@pytest.mark.asyncio
async def test_context_includes_user_memories() -> None:
    session = AsyncMock()
    user = _mock_user()
    memories = _mock_memories(
        bio="Mora em SP",
        current_goals=["Emagrecer", "Ler mais"],
        top_of_mind=["Viagem de férias"],
    )

    with (
        patch(
            "app.prompts.context_builder.UserRepository.get_by_id",
            return_value=user,
        ),
        patch(
            "app.prompts.context_builder.UserRepository.get_memories",
            return_value=memories,
        ),
    ):
        prompt = await build_context(session, str(uuid.uuid4()), "general")

    assert "Mora em SP" in prompt
    assert "Emagrecer" in prompt
    assert "Ler mais" in prompt
    assert "Viagem de férias" in prompt


@pytest.mark.asyncio
async def test_counselor_mode_appends_extension() -> None:
    session = AsyncMock()
    user = _mock_user()

    with (
        patch(
            "app.prompts.context_builder.UserRepository.get_by_id",
            return_value=user,
        ),
        patch(
            "app.prompts.context_builder.UserRepository.get_memories",
            return_value=None,
        ),
    ):
        prompt = await build_context(session, str(uuid.uuid4()), "counselor")

    assert "Modo Especial: Conselheira" in prompt
    assert "perguntas abertas" in prompt


@pytest.mark.asyncio
async def test_general_mode_does_not_include_counselor() -> None:
    session = AsyncMock()
    user = _mock_user()

    with (
        patch(
            "app.prompts.context_builder.UserRepository.get_by_id",
            return_value=user,
        ),
        patch(
            "app.prompts.context_builder.UserRepository.get_memories",
            return_value=None,
        ),
    ):
        prompt = await build_context(session, str(uuid.uuid4()), "general")

    assert "Modo Especial: Conselheira" not in prompt


@pytest.mark.asyncio
async def test_missing_memories_shows_fallback() -> None:
    session = AsyncMock()
    user = _mock_user()

    with (
        patch(
            "app.prompts.context_builder.UserRepository.get_by_id",
            return_value=user,
        ),
        patch(
            "app.prompts.context_builder.UserRepository.get_memories",
            return_value=None,
        ),
    ):
        prompt = await build_context(session, str(uuid.uuid4()), "general")

    assert "Nenhuma memória disponível ainda" in prompt


@pytest.mark.asyncio
async def test_missing_user_uses_fallback_name() -> None:
    session = AsyncMock()

    with (
        patch(
            "app.prompts.context_builder.UserRepository.get_by_id",
            return_value=None,
        ),
        patch(
            "app.prompts.context_builder.UserRepository.get_memories",
            return_value=None,
        ),
    ):
        prompt = await build_context(session, str(uuid.uuid4()), "general")

    assert "usuário" in prompt
