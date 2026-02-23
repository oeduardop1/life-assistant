"""Confirmation payload builders for write tools.

Generates user-facing confirmation messages (PT-BR) and the interrupt
payload consumed by ``ConfirmableToolNode``.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import uuid4

# ---------------------------------------------------------------------------
# Per-tool confirmation messages (PT-BR)
# Based on confirmation-state.service.ts (NestJS)
# ---------------------------------------------------------------------------

_TOOL_MESSAGES: dict[str, str] = {
    "record_metric": "Registrar {tipo}: {valor} {unidade} em {data}?",
    "update_metric": "Corrigir {tipo} para {valor_novo}?",
    "delete_metric": "Remover registro de {tipo} de {data}?",
    "record_habit": "Marcar hábito '{nome}' como concluído em {data}?",
    "mark_bill_paid": "Marcar conta '{nome}' como paga em {data}?",
    "create_expense": "Registrar gasto de R${valor} em {categoria}?",
    "add_knowledge": "Salvar: '{conteudo}'?",
}

_FALLBACK_MESSAGE = "Executar {tool_name}?"


def generate_confirmation_message(tool_name: str, tool_args: dict[str, Any]) -> str:
    """Build a single-tool confirmation message in PT-BR.

    Falls back to a generic message when the tool has no specific template.
    """
    template = _TOOL_MESSAGES.get(tool_name)
    if template is None:
        return _FALLBACK_MESSAGE.format(tool_name=tool_name)
    try:
        return template.format(**tool_args)
    except KeyError:
        # Args don't match template placeholders — use fallback
        return _FALLBACK_MESSAGE.format(tool_name=tool_name)


def generate_batch_message(tool_calls: list[dict[str, Any]]) -> str:
    """Build a batch confirmation message for multiple write tools."""
    if len(tool_calls) == 1:
        return generate_confirmation_message(tool_calls[0]["name"], tool_calls[0]["args"])

    summaries = [generate_confirmation_message(tc["name"], tc["args"]) for tc in tool_calls]
    bullet_list = "\n".join(f"• {s}" for s in summaries)
    return f"Executar {len(tool_calls)} operações?\n{bullet_list}"


def build_interrupt_payload(tool_calls: list[dict[str, Any]], message: str) -> dict[str, Any]:
    """Build the standardised interrupt payload.

    The ``type`` field allows NestJS proxy and the frontend to identify the
    event as a confirmation request.  ``expiresAt`` is a soft 24 h limit
    (PostgreSQL checkpoints do not expire).
    """
    confirmation_id = str(uuid4())
    expires_at = (datetime.now(UTC) + timedelta(hours=24)).isoformat()

    return {
        "type": "confirmation_required",
        "data": {
            "confirmationId": confirmation_id,
            # Single-tool compat fields (frontend expects these)
            "toolName": tool_calls[0]["name"],
            "toolArgs": tool_calls[0]["args"],
            # Batch fields
            "toolNames": [tc["name"] for tc in tool_calls],
            "tools": [
                {
                    "toolName": tc["name"],
                    "toolArgs": tc["args"],
                    "toolCallId": tc["id"],
                }
                for tc in tool_calls
            ],
            "message": message,
            "expiresAt": expires_at,
        },
    }
