"""Tests for LLM factory — app/agents/llm.py."""

import pytest

from app.agents.llm import create_llm
from app.config import Settings


def _settings(**overrides: str) -> Settings:
    """Create a Settings instance with test defaults."""
    defaults = {
        "DATABASE_URL": "postgresql://test:test@localhost:5432/test",
        "SERVICE_SECRET": "test-secret",
        "LLM_PROVIDER": "gemini",
        "LLM_MODEL": "gemini-2.5-flash",
        "GEMINI_API_KEY": "fake-gemini-key",
        "ANTHROPIC_API_KEY": "fake-anthropic-key",
    }
    defaults.update(overrides)
    return Settings(**defaults)  # type: ignore[arg-type]


def test_gemini_provider_returns_correct_class() -> None:
    settings = _settings(LLM_PROVIDER="gemini")
    llm = create_llm(settings)
    # Check class name to avoid importing the actual class at module level
    assert type(llm).__name__ == "ChatGoogleGenerativeAI"


def test_anthropic_provider_returns_correct_class() -> None:
    settings = _settings(LLM_PROVIDER="anthropic", LLM_MODEL="claude-sonnet-4-20250514")
    llm = create_llm(settings)
    assert type(llm).__name__ == "ChatAnthropic"


def test_invalid_provider_raises_error() -> None:
    settings = _settings(LLM_PROVIDER="openai")
    with pytest.raises(ValueError, match="Unsupported LLM provider: openai"):
        create_llm(settings)


def test_custom_temperature() -> None:
    settings = _settings(LLM_PROVIDER="gemini")
    llm = create_llm(settings, temperature=0.3)
    assert llm.temperature == pytest.approx(0.3)
