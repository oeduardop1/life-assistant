"""LLM-based semantic contradiction detection for knowledge items.

Matches the TS ContradictionDetectorAdapter behaviour: compares new content
against existing items and identifies contradictions that should trigger
supersession.
"""

from __future__ import annotations

import json
import logging
import uuid as _uuid
from dataclasses import dataclass

from app.agents.llm import create_llm
from app.config import get_settings
from app.db.models.memory import KnowledgeItem

logger = logging.getLogger(__name__)

_CONTRADICTION_PROMPT = """\
Você é um detector de contradições. Compare o NOVO FATO com cada FATO EXISTENTE e determine se há contradição.

NOVO FATO: "{new_content}"

FATOS EXISTENTES:
{existing_items_text}

REGRAS:
- Contradição = informações INCOMPATÍVEIS (ex: "é solteiro" → "está namorando", "desempregado" → "trabalha como dev")
- NÃO é contradição = informações COMPLEMENTARES (ex: "gosta de café" + "prefere espresso", "mora sozinho" + "trabalha de casa")
- Atualização de status = contradição (ex: "mora em SP" → "mora no RJ", "é estudante" → "se formou")

Responda APENAS com JSON válido, sem markdown:
[
  {{
    "item_id": "<UUID do fato existente>",
    "is_contradiction": true/false,
    "confidence": 0.0 a 1.0,
    "reason": "motivo breve"
  }}
]

Se nenhum fato existente contradiz, retorne lista vazia: []
"""


@dataclass
class ContradictionResult:
    item_id: _uuid.UUID
    is_contradiction: bool
    confidence: float
    reason: str


async def check_contradictions(
    new_content: str,
    existing_items: list[KnowledgeItem],
    threshold: float = 0.7,
) -> list[ContradictionResult]:
    """Check if new content contradicts existing knowledge items using LLM.

    Returns only items where contradiction confidence >= threshold.
    On any LLM error, returns empty list (safe default — no contradiction assumed).
    """
    if not existing_items:
        return []

    # Format existing items for the prompt
    lines: list[str] = []
    for item in existing_items:
        lines.append(f"- ID: {item.id} | Conteúdo: {item.content}")
    existing_items_text = "\n".join(lines)

    prompt = _CONTRADICTION_PROMPT.format(
        new_content=new_content,
        existing_items_text=existing_items_text,
    )

    try:
        llm = create_llm(get_settings(), temperature=0)
        response = await llm.ainvoke(prompt)

        # Extract text content from response
        text = ""
        if hasattr(response, "content"):
            content = response.content
            if isinstance(content, str):
                text = content
            elif isinstance(content, list):
                text = " ".join(
                    block.get("text", "") if isinstance(block, dict) else str(block)
                    for block in content
                )
        else:
            text = str(response)

        # Strip markdown code fences if present
        text = text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

        raw_results = json.loads(text)
        if not isinstance(raw_results, list):
            logger.warning("Contradiction detector returned non-list: %s", type(raw_results))
            return []

        results: list[ContradictionResult] = []
        for entry in raw_results:
            if not isinstance(entry, dict):
                continue
            if not entry.get("is_contradiction"):
                continue
            confidence = float(entry.get("confidence", 0))
            if confidence < threshold:
                continue
            results.append(
                ContradictionResult(
                    item_id=_uuid.UUID(str(entry["item_id"])),
                    is_contradiction=True,
                    confidence=confidence,
                    reason=str(entry.get("reason", "")),
                )
            )

        logger.info(
            "Contradiction detector found %d contradictions (threshold=%.2f)",
            len(results),
            threshold,
        )
        return results

    except Exception:
        logger.exception("Contradiction detection failed — safe default (no contradictions)")
        return []
