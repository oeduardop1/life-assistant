"""Tests for intent classifier."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock

import pytest
from langchain_core.messages import AIMessage

from app.tools.common.intent_classifier import classify_confirmation_intent

INTERRUPT_INFO = {
    "type": "confirmation_required",
    "data": {
        "message": "Registrar 2L de água em 23/02/2026?",
        "confirmationId": "abc-123",
    },
}


def _make_llm(response_json: dict) -> AsyncMock:
    """Create a mock LLM that returns a JSON response."""
    mock = AsyncMock()
    mock.ainvoke = AsyncMock(return_value=AIMessage(content=json.dumps(response_json)))
    return mock


@pytest.mark.asyncio
async def test_classify_confirm() -> None:
    llm = _make_llm({"action": "confirm", "corrected_args": None})
    result = await classify_confirmation_intent("sim", INTERRUPT_INFO, llm)
    assert result.action == "confirm"
    assert result.corrected_args is None


@pytest.mark.asyncio
async def test_classify_reject() -> None:
    llm = _make_llm({"action": "reject", "corrected_args": None})
    result = await classify_confirmation_intent("não", INTERRUPT_INFO, llm)
    assert result.action == "reject"


@pytest.mark.asyncio
async def test_classify_edit() -> None:
    llm = _make_llm({"action": "edit", "corrected_args": {"valor": "3"}})
    result = await classify_confirmation_intent("sim mas muda para 3L", INTERRUPT_INFO, llm)
    assert result.action == "edit"
    assert result.corrected_args == {"valor": "3"}


@pytest.mark.asyncio
async def test_classify_unrelated() -> None:
    llm = _make_llm({"action": "unrelated", "corrected_args": None})
    result = await classify_confirmation_intent("como está o tempo hoje?", INTERRUPT_INFO, llm)
    assert result.action == "unrelated"


@pytest.mark.asyncio
async def test_classify_malformed_response_returns_unrelated() -> None:
    """If the LLM returns non-JSON, default to unrelated."""
    mock = AsyncMock()
    mock.ainvoke = AsyncMock(return_value=AIMessage(content="I don't understand"))
    result = await classify_confirmation_intent("blah", INTERRUPT_INFO, mock)
    assert result.action == "unrelated"


@pytest.mark.asyncio
async def test_classify_invalid_action_returns_unrelated() -> None:
    """If the LLM returns an invalid action, default to unrelated."""
    llm = _make_llm({"action": "maybe", "corrected_args": None})
    result = await classify_confirmation_intent("talvez", INTERRUPT_INFO, llm)
    assert result.action == "unrelated"


@pytest.mark.asyncio
async def test_classify_gemini_block_list_content() -> None:
    """Handle Gemini's content format: list of blocks."""
    mock = AsyncMock()
    mock.ainvoke = AsyncMock(
        return_value=AIMessage(
            content=[{"type": "text", "text": '{"action": "confirm", "corrected_args": null}'}]
        )
    )
    result = await classify_confirmation_intent("ok", INTERRUPT_INFO, mock)
    assert result.action == "confirm"
