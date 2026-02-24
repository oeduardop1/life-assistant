"""Consolidation prompt builder and response parser.

Ported from apps/api/src/jobs/memory-consolidation/consolidation-prompt.ts.
Builds the LLM prompt for daily memory consolidation and parses the structured
JSON response with normalization and validation.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator

logger = logging.getLogger(__name__)

# --- Pydantic models for consolidation response ---

VALID_TYPES = {"fact", "preference", "memory", "insight", "person"}
TYPE_MAPPING: dict[str, str] = {
    "challenge": "insight",
    "goal": "fact",
    "observation": "insight",
    "note": "fact",
}

VALID_AREAS = {"health", "finance", "professional", "learning", "spiritual", "relationships"}
VALID_SUB_AREAS = {
    "physical",
    "mental",
    "leisure",
    "budget",
    "savings",
    "debts",
    "investments",
    "career",
    "business",
    "formal",
    "informal",
    "practice",
    "community",
    "family",
    "romantic",
    "social",
}


class LearnedPattern(BaseModel):
    pattern: str
    confidence: float = Field(ge=0, le=1)
    evidence: list[str]


class MemoryUpdates(BaseModel):
    bio: str | None = None
    occupation: str | None = None
    family_context: str | None = Field(None, alias="familyContext")
    current_goals: list[str] | None = Field(None, alias="currentGoals")
    current_challenges: list[str] | None = Field(None, alias="currentChallenges")
    top_of_mind: list[str] | None = Field(None, alias="topOfMind")
    values: list[str] | None = None
    learned_patterns: list[LearnedPattern] | None = Field(None, alias="learnedPatterns")

    model_config = {"populate_by_name": True}


class NewKnowledgeItem(BaseModel):
    type: str
    area: str | None = None
    sub_area: str | None = Field(None, alias="subArea")
    content: str
    title: str | None = None
    confidence: float = Field(ge=0, le=1)
    source: str = "ai_inference"
    inference_evidence: str | None = Field(None, alias="inferenceEvidence")

    model_config = {"populate_by_name": True}

    @field_validator("type")
    @classmethod
    def normalize_type(cls, v: str) -> str:
        if v in VALID_TYPES:
            return v
        mapped = TYPE_MAPPING.get(v)
        if mapped:
            return mapped
        msg = f"Invalid knowledge item type: {v}"
        raise ValueError(msg)

    @field_validator("area")
    @classmethod
    def validate_area(cls, v: str | None) -> str | None:
        if v is None:
            return None
        if v in VALID_AREAS:
            return v
        return None  # silently drop invalid areas

    @field_validator("sub_area")
    @classmethod
    def validate_sub_area(cls, v: str | None) -> str | None:
        if v is None:
            return None
        if v in VALID_SUB_AREAS:
            return v
        return None


class UpdatedKnowledgeItem(BaseModel):
    id: str
    content: str | None = None
    confidence: float | None = Field(None, ge=0, le=1)


class ConsolidationResponse(BaseModel):
    memory_updates: MemoryUpdates
    new_knowledge_items: list[NewKnowledgeItem]
    updated_knowledge_items: list[UpdatedKnowledgeItem]


# --- Prompt formatting helpers ---


def _format_messages(messages: list[Any]) -> str:
    """Format messages for the consolidation prompt."""
    lines: list[str] = []
    for m in messages:
        role = "Usuário" if m.role == "user" else "Assistente"
        if isinstance(m.created_at, datetime):
            ts = m.created_at.strftime("%d/%m/%Y %H:%M")
        else:
            ts = str(m.created_at)
        lines.append(f"[{ts}] {role}: {m.content}")
    return "\n\n".join(lines)


def _format_current_memory(memory: dict[str, Any]) -> str:
    """Format current user memory for the prompt."""
    parts: list[str] = []

    if memory.get("bio"):
        parts.append(f"Bio: {memory['bio']}")
    if memory.get("occupation"):
        parts.append(f"Ocupação: {memory['occupation']}")
    if memory.get("family_context"):
        parts.append(f"Família: {memory['family_context']}")

    values = memory.get("values")
    if values and len(values) > 0:
        parts.append(f"Valores: {', '.join(values)}")
    goals = memory.get("current_goals")
    if goals and len(goals) > 0:
        parts.append(f"Objetivos: {', '.join(goals)}")
    challenges = memory.get("current_challenges")
    if challenges and len(challenges) > 0:
        parts.append(f"Desafios: {', '.join(challenges)}")
    top = memory.get("top_of_mind")
    if top and len(top) > 0:
        parts.append(f"Em mente: {', '.join(top)}")

    return "\n".join(parts) if parts else "(Memória vazia)"


def _format_knowledge_items(items: list[dict[str, str]]) -> str:
    """Format existing knowledge items for the prompt."""
    if not items:
        return "(Nenhum conhecimento registrado)"
    return "\n".join(
        f"[{item['id']}] ({item['type']}) {item.get('title', '')}: {item['content']}"
        for item in items
    )


def build_consolidation_prompt(
    messages: list[Any],
    current_memory: dict[str, Any],
    existing_knowledge: list[dict[str, str]],
) -> str:
    """Build the consolidation prompt for the LLM."""
    return f"""## Tarefa: Consolidar Memória do Usuário

Analise as conversas recentes e extraia informações para atualizar a memória do usuário.

### Conversas das últimas 24h:
{_format_messages(messages)}

### Memória atual do usuário:
{_format_current_memory(current_memory)}

### Knowledge Items existentes:
{_format_knowledge_items(existing_knowledge)}

### Instruções:
1. Identifique NOVOS fatos, preferências ou insights sobre o usuário
2. Identifique atualizações para fatos existentes
3. Faça inferências quando houver padrões (mínimo 3 ocorrências)
4. Atribua confidence score para cada item
5. O título DEVE ser um resumo fiel do conteúdo - NUNCA faça inferências no título

### Formato de saída (JSON estrito):
{{
  "memory_updates": {{
    "bio": "atualização se mencionado",
    "occupation": "ocupação se mencionada",
    "familyContext": "contexto familiar se mencionado",
    "currentGoals": ["novos goals se identificados"],
    "currentChallenges": ["novos challenges se identificados"],
    "topOfMind": ["prioridades atuais"],
    "values": ["valores identificados"],
    "learnedPatterns": [
      {{
        "pattern": "padrão identificado",
        "confidence": 0.8,
        "evidence": ["evidência 1", "evidência 2"]
      }}
    ]
  }},
  "new_knowledge_items": [
    {{
      "type": "fact|preference|insight|memory|person",
      "area": "health|finance|professional|learning|spiritual|relationships",
      "subArea": "(ver lista de sub-áreas acima)",
      "content": "descrição do fato",
      "title": "título curto",
      "confidence": 0.9,
      "source": "ai_inference",
      "inferenceEvidence": "evidência se for inferência"
    }}
  ],
  "updated_knowledge_items": [
    {{
      "id": "uuid do item existente",
      "content": "conteúdo atualizado",
      "confidence": 0.95
    }}
  ]
}}

### Regras:
- Confidence >= 0.7 para inferências
- Confidence >= 0.9 para fatos explícitos
- NÃO crie duplicatas de knowledge_items existentes
- Padrões requerem mínimo 3 ocorrências
- CONTRADIÇÕES: Se identificar informação que contradiz um item existente,
  crie um novo item com a informação mais recente.
  O sistema detectará a contradição e substituirá o item antigo.

### IMPORTANTE - Consistência entre título e conteúdo:
- O título DEVE refletir EXATAMENTE o que está no conteúdo
- NUNCA faça inferências ou previsões no título
- Use os termos exatos da conversa

Exemplos de ERROS a evitar:
❌ Título: "É solteiro" | Conteúdo: "Está em relacionamento pensando em terminar"
   (ERRADO: "pensando em terminar" ≠ "é solteiro")
❌ Título: "Vai mudar de emprego" | Conteúdo: "Está insatisfeito no trabalho"
   (ERRADO: insatisfação ≠ decisão de mudar)

Exemplos CORRETOS:
✓ Título: "Relacionamento em crise" | Conteúdo: "Está em relacionamento pensando em terminar"
✓ Título: "Insatisfação no trabalho" | Conteúdo: "Está insatisfeito no trabalho atual"

- Retorne APENAS o JSON, sem texto adicional"""


def _remove_nulls(obj: Any) -> Any:
    """Recursively remove None/null values from parsed JSON."""
    if obj is None:
        return None
    if isinstance(obj, list):
        return [_remove_nulls(item) for item in obj if item is not None]
    if isinstance(obj, dict):
        return {k: _remove_nulls(v) for k, v in obj.items() if v is not None}
    return obj


def _try_extract_partial_json(text: str) -> dict[str, Any] | None:
    """Try to extract valid JSON from a possibly truncated response."""
    # Find the last valid closing brace
    for i in range(len(text) - 1, -1, -1):
        if text[i] == "}":
            candidate = text[: i + 1]
            try:
                parsed = json.loads(candidate)
                if isinstance(parsed, dict):
                    return parsed
            except json.JSONDecodeError:
                continue
    return None


def parse_consolidation_response(response: str) -> ConsolidationResponse:
    """Parse and validate the LLM consolidation response.

    Handles markdown code fences, null normalization, type normalization,
    and truncated response recovery.
    """
    text = response.strip()

    # Remove markdown code blocks
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()

    # Parse JSON
    parsed: dict[str, Any] | None = None
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        # Try to extract partial JSON from truncated response
        parsed = _try_extract_partial_json(text)
        if parsed is None:
            msg = f"Failed to parse consolidation response as JSON: {text[:200]}"
            raise ValueError(msg) from None
        logger.warning("Recovered partial JSON from truncated consolidation response")

    # Remove nulls
    parsed = _remove_nulls(parsed)

    # Ensure required top-level keys exist
    if "memory_updates" not in parsed:
        parsed["memory_updates"] = {}
    if "new_knowledge_items" not in parsed:
        parsed["new_knowledge_items"] = []
    if "updated_knowledge_items" not in parsed:
        parsed["updated_knowledge_items"] = []

    # Force source to ai_inference on all new items
    for item in parsed["new_knowledge_items"]:
        if isinstance(item, dict):
            item["source"] = "ai_inference"

    # Filter items with completely invalid types (Pydantic validator handles mapping)
    valid_new_items: list[dict[str, Any]] = []
    for item in parsed["new_knowledge_items"]:
        if isinstance(item, dict):
            item_type = item.get("type", "")
            if item_type in VALID_TYPES or item_type in TYPE_MAPPING:
                valid_new_items.append(item)
            else:
                logger.warning("Dropping knowledge item with invalid type: %s", item_type)
    parsed["new_knowledge_items"] = valid_new_items

    # Validate with Pydantic
    return ConsolidationResponse.model_validate(parsed)
