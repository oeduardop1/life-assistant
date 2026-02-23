"""Classify whether a user message is a confirmation response.

When the graph has a pending ``interrupt()``, we need to decide if the
user's next message is a confirm / reject / edit response or an
unrelated new query.

Uses a low-temperature LLM call (per ADR-015 — no regex fallback).
"""

from __future__ import annotations

import json
import logging
from typing import TYPE_CHECKING, Any

from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel

if TYPE_CHECKING:
    from langchain_core.language_models.chat_models import BaseChatModel

logger = logging.getLogger(__name__)

_CLASSIFICATION_PROMPT = """\
Você é um classificador de intenção. Uma operação está aguardando confirmação do usuário.

Operação pendente: {pending_message}

Classifique a mensagem do usuário em uma das categorias:
- "confirm": o usuário concorda (ex: "sim", "ok", "pode fazer", "beleza", "confirma")
- "reject": o usuário recusa (ex: "não", "cancela", "esquece", "não quero")
- "edit": o usuário concorda mas quer mudar algo (ex: "sim mas muda para 3L")
- "unrelated": a mensagem não é sobre a operação pendente

Se "edit", extraia os campos corrigidos em formato JSON.

Responda APENAS com JSON: {{"action": "...", "corrected_args": {{...}} | null}}"""


class ConfirmationIntent(BaseModel):
    action: str  # "confirm" | "reject" | "edit" | "unrelated"
    corrected_args: dict[str, Any] | None = None


async def classify_confirmation_intent(
    user_message: str,
    interrupt_info: dict[str, Any],
    llm: BaseChatModel,
) -> ConfirmationIntent:
    """Classify the user message against a pending interrupt.

    Parameters
    ----------
    user_message:
        The raw text the user sent.
    interrupt_info:
        The ``Interrupt.value`` payload (contains ``data.message``).
    llm:
        A chat model instance (should be temperature=0 for determinism).

    Returns
    -------
    ConfirmationIntent
        The classified action and optional corrected args.
    """
    pending_message = interrupt_info.get("data", {}).get("message", "")
    system = _CLASSIFICATION_PROMPT.format(pending_message=pending_message)

    response = await llm.ainvoke(
        [SystemMessage(content=system), HumanMessage(content=user_message)]
    )

    raw = response.content
    if isinstance(raw, list):
        raw = "".join(
            block.get("text", "") if isinstance(block, dict) else str(block) for block in raw
        )

    try:
        parsed = json.loads(str(raw).strip())
        action = parsed.get("action", "unrelated")
        if action not in ("confirm", "reject", "edit", "unrelated"):
            action = "unrelated"
        return ConfirmationIntent(
            action=action,
            corrected_args=parsed.get("corrected_args"),
        )
    except (json.JSONDecodeError, AttributeError):
        logger.warning("Failed to parse intent classification: %s", raw)
        return ConfirmationIntent(action="unrelated")
