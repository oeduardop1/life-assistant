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
async def test_counselor_mode_no_longer_appends_extension() -> None:
    """M4.7: context_builder no longer appends counselor extension.

    Domain extensions are now applied by agent_node at runtime.
    """
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

    # Counselor extension is NOT appended by build_context anymore
    assert "Modo Especial: Conselheira" not in prompt


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
# Core prompt content tests (M4.7 — split prompt)
# ---------------------------------------------------------------------------


async def _build_core_prompt() -> str:
    """Helper to build a core prompt with mocked user."""
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
async def test_core_prompt_has_capabilities_section() -> None:
    """Core prompt contains the 'Suas capacidades' section."""
    prompt = await _build_core_prompt()
    assert "## Suas capacidades" in prompt


@pytest.mark.asyncio
async def test_core_prompt_does_not_have_domain_tool_instructions() -> None:
    """Core prompt from build_context has no domain-specific tool instructions.

    Domain extensions (tracking, finance, etc.) are appended by agent_node.
    """
    prompt = await _build_core_prompt()
    # These are in domain extensions, not in core
    assert "### record_metric" not in prompt
    assert "### Ferramentas de Finanças" not in prompt
    assert "### add_knowledge" not in prompt


@pytest.mark.asyncio
async def test_rules_complete() -> None:
    """All 11 rules from TS are present in the core prompt."""
    prompt = await _build_core_prompt()
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
async def test_inferential_reasoning_section() -> None:
    """Inferential reasoning section matches TS."""
    prompt = await _build_core_prompt()
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


# ---------------------------------------------------------------------------
# Domain extension content tests (M4.7)
# ---------------------------------------------------------------------------


def test_tracking_extension_has_tool_instructions() -> None:
    """Tracking prompt extension includes all tracking tool instructions."""
    from app.prompts.system import TRACKING_PROMPT_EXTENSION

    assert "### record_metric" in TRACKING_PROMPT_EXTENSION
    assert "### update_metric" in TRACKING_PROMPT_EXTENSION
    assert "### delete_metric" in TRACKING_PROMPT_EXTENSION
    assert "### get_tracking_history" in TRACKING_PROMPT_EXTENSION
    assert "FLUXO OBRIGATÓRIO (ADR-015)" in TRACKING_PROMPT_EXTENSION
    assert "REGRA CRÍTICA SOBRE entryId" in TRACKING_PROMPT_EXTENSION
    assert "### record_habit" in TRACKING_PROMPT_EXTENSION
    assert "### get_habits" in TRACKING_PROMPT_EXTENSION
    assert "### search_knowledge" in TRACKING_PROMPT_EXTENSION
    assert "### analyze_context" in TRACKING_PROMPT_EXTENSION


def test_finance_extension_has_tool_instructions() -> None:
    """Finance prompt extension includes all finance tool instructions."""
    from app.prompts.system import FINANCE_PROMPT_EXTENSION

    assert "### Ferramentas de Finanças" in FINANCE_PROMPT_EXTENSION
    assert "get_finance_summary" in FINANCE_PROMPT_EXTENSION
    assert "get_bills" in FINANCE_PROMPT_EXTENSION
    assert "mark_bill_paid" in FINANCE_PROMPT_EXTENSION
    assert "create_expense" in FINANCE_PROMPT_EXTENSION
    assert "FLUXO OBRIGATÓRIO para análise financeira" in FINANCE_PROMPT_EXTENSION
    assert "REGRAS CRÍTICAS" in FINANCE_PROMPT_EXTENSION
    assert "### search_knowledge" in FINANCE_PROMPT_EXTENSION
    assert "### analyze_context" in FINANCE_PROMPT_EXTENSION


def test_memory_write_extension_has_add_knowledge() -> None:
    """Memory write extension includes add_knowledge instructions."""
    from app.prompts.system import MEMORY_WRITE_EXTENSION

    assert "### add_knowledge" in MEMORY_WRITE_EXTENSION
    assert "### search_knowledge" in MEMORY_WRITE_EXTENSION
    assert "### analyze_context" in MEMORY_WRITE_EXTENSION


def test_wellbeing_extension_has_counselor_content() -> None:
    """Wellbeing prompt extension includes counselor mode content."""
    from app.prompts.system import WELLBEING_PROMPT_EXTENSION

    assert "Modo Especial: Conselheira" in WELLBEING_PROMPT_EXTENSION
    assert "perguntas abertas" in WELLBEING_PROMPT_EXTENSION
    assert "### Tom" in WELLBEING_PROMPT_EXTENSION
    assert "pausado e reflexivo" in WELLBEING_PROMPT_EXTENSION
    assert "Minimize emojis" in WELLBEING_PROMPT_EXTENSION
    assert "### search_knowledge" in WELLBEING_PROMPT_EXTENSION
    assert "### analyze_context" in WELLBEING_PROMPT_EXTENSION
