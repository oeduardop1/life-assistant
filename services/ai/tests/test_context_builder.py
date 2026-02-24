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
    feedback_preferences: str | None = None,
    learned_patterns: list[dict] | None = None,
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
    mem.feedback_preferences = feedback_preferences
    mem.learned_patterns = learned_patterns
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

    assert "Memória ainda não inicializada" in prompt


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


# ---------------------------------------------------------------------------
# Tool instruction tests (M4.6)
# ---------------------------------------------------------------------------


async def _build_general_prompt() -> str:
    """Helper to build a general prompt with mocked user."""
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
        return await build_context(session, str(uuid.uuid4()), "general")


@pytest.mark.asyncio
async def test_tool_instructions_memory_tools() -> None:
    prompt = await _build_general_prompt()
    assert "### search_knowledge" in prompt
    assert "### add_knowledge" in prompt
    assert "### analyze_context" in prompt
    assert "SEMPRE use quando perguntarem sobre o usuário" in prompt


@pytest.mark.asyncio
async def test_tool_instructions_tracking_tools() -> None:
    prompt = await _build_general_prompt()
    assert "### record_metric" in prompt
    assert "### update_metric" in prompt
    assert "### delete_metric" in prompt
    assert "### get_tracking_history" in prompt
    assert "FLUXO OBRIGATÓRIO (ADR-015)" in prompt
    assert "REGRA CRÍTICA SOBRE entryId" in prompt


@pytest.mark.asyncio
async def test_tool_instructions_habits_tools() -> None:
    prompt = await _build_general_prompt()
    assert "### record_habit" in prompt
    assert "### get_habits" in prompt
    assert "NUNCA criar novos hábitos" in prompt


@pytest.mark.asyncio
async def test_tool_instructions_finance_tools() -> None:
    prompt = await _build_general_prompt()
    assert "### Ferramentas de Finanças" in prompt
    assert "get_finance_summary" in prompt
    assert "get_bills" in prompt
    assert "get_expenses" in prompt
    assert "mark_bill_paid" in prompt
    assert "create_expense" in prompt
    assert "FLUXO OBRIGATÓRIO para análise financeira" in prompt
    assert "REGRAS CRÍTICAS" in prompt


@pytest.mark.asyncio
async def test_tool_instructions_present() -> None:
    """System prompt contains the 'Suas capacidades' section with all tool blocks."""
    prompt = await _build_general_prompt()
    assert "## Suas capacidades" in prompt


@pytest.mark.asyncio
async def test_rules_complete() -> None:
    """All 11 rules from TS are present."""
    prompt = await _build_general_prompt()
    # Check key rules by content
    assert "NUNCA invente informações" in prompt  # Rule 1
    assert "diagnósticos médicos" in prompt  # Rule 2
    assert "NUNCA julgue" in prompt  # Rule 3
    assert "confirme brevemente ao usuário o que foi registrado" in prompt  # Rule 4
    assert "search_knowledge primeiro" in prompt  # Rule 5
    assert "emojis com moderação" in prompt  # Rule 6
    assert "concisa" in prompt  # Rule 7
    assert "Se não me engano" in prompt  # Rule 8
    assert "/memory" in prompt  # Rule 9
    assert "ADR-015" in prompt  # Rule 10
    assert "NÃO cobre tracking" in prompt  # Rule 11


@pytest.mark.asyncio
async def test_counselor_mode_tom_section() -> None:
    """Counselor extension includes 'Tom' subsection."""
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

    assert "### Tom" in prompt
    assert "pausado e reflexivo" in prompt
    assert "Minimize emojis" in prompt


@pytest.mark.asyncio
async def test_inferential_reasoning_section() -> None:
    """Inferential reasoning section matches TS."""
    prompt = await _build_general_prompt()
    assert "## Raciocínio Inferencial" in prompt
    assert "FLUXO OBRIGATÓRIO" in prompt
    assert "Stress financeiro + problemas de sono" in prompt


# ---------------------------------------------------------------------------
# Memory formatting tests (M4.6)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_memory_formatting_markdown_headers() -> None:
    """Memory is formatted with ## headers matching TS."""
    session = AsyncMock()
    user = _mock_user()
    memories = _mock_memories(
        bio="Mora em SP",
        occupation="Dev",
        values=["Honestidade", "Família"],
        current_goals=["Emagrecer"],
        current_challenges=["Insônia"],
        top_of_mind=["Viagem"],
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

    assert "## Sobre o Usuário" in prompt
    assert "## Valores" in prompt
    assert "## Objetivos Atuais" in prompt
    assert "## Desafios Atuais" in prompt
    assert "## Em Mente" in prompt


@pytest.mark.asyncio
async def test_learned_patterns_in_memory() -> None:
    """Patterns with confidence >= 0.7 appear, max 5, lower confidence excluded."""
    session = AsyncMock()
    user = _mock_user()
    memories = _mock_memories(
        bio="Mora em SP",
        learned_patterns=[
            {"pattern": "Stress causa insônia", "confidence": 0.85, "evidence": "3x"},
            {"pattern": "Café piora ansiedade", "confidence": 0.75, "evidence": "2x"},
            {"pattern": "Pouco relevante", "confidence": 0.3, "evidence": "1x"},
        ],
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

    assert "## Padrões Observados" in prompt
    assert "Stress causa insônia" in prompt
    assert "Café piora ansiedade" in prompt
    assert "Pouco relevante" not in prompt  # Below threshold


@pytest.mark.asyncio
async def test_communication_section() -> None:
    """Communication style and feedback preferences appear."""
    session = AsyncMock()
    user = _mock_user()
    memories = _mock_memories(
        bio="Mora em SP",
        communication_style="direto",
        feedback_preferences="Prefere feedback construtivo",
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

    assert "## Comunicação" in prompt
    assert "direto" in prompt
    assert "Prefere feedback construtivo" in prompt


@pytest.mark.asyncio
async def test_empty_sections_skipped() -> None:
    """Sections with no data are not rendered."""
    session = AsyncMock()
    user = _mock_user()
    memories = _mock_memories(
        bio="Mora em SP",
        occupation=None,
        family_context=None,
        current_goals=None,
        current_challenges=None,
        top_of_mind=None,
        values=None,
        communication_style=None,
        feedback_preferences=None,
        learned_patterns=None,
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

    assert "## Sobre o Usuário" in prompt  # bio exists
    assert "## Valores" not in prompt
    assert "## Objetivos Atuais" not in prompt
    assert "## Desafios Atuais" not in prompt
    assert "## Em Mente" not in prompt
    assert "## Padrões Observados" not in prompt
    assert "## Comunicação" not in prompt
