"""Context builder — loads user info + memories and formats system prompt.

Full TS parity with context-builder.service.ts formatForPrompt().
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING
from zoneinfo import ZoneInfo

from app.db.repositories.user import UserRepository
from app.prompts.system import BASE_SYSTEM_PROMPT, COUNSELOR_EXTENSION

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

    from app.db.models.users import UserMemory


def _format_user_memory(memories: UserMemory | None) -> str:
    """Format user memories into markdown sections matching TS formatForPrompt().

    Uses ## headers and skips empty sections.
    """
    if memories is None:
        return "(Memória ainda não inicializada)"

    sections: list[str] = []

    # ## Sobre o Usuário — prose format (bio, occupation, family)
    about_parts: list[str] = []
    if memories.bio:
        about_parts.append(memories.bio)
    if memories.occupation:
        about_parts.append(f"Profissão: {memories.occupation}")
    if memories.family_context:
        about_parts.append(f"Família: {memories.family_context}")
    if about_parts:
        sections.append("## Sobre o Usuário\n" + "\n".join(about_parts))

    # ## Valores — bullet list
    if memories.values:
        items = "\n".join(f"- {v}" for v in memories.values)
        sections.append(f"## Valores\n{items}")

    # ## Objetivos Atuais — bullet list
    if memories.current_goals:
        items = "\n".join(f"- {g}" for g in memories.current_goals)
        sections.append(f"## Objetivos Atuais\n{items}")

    # ## Desafios Atuais — bullet list
    if memories.current_challenges:
        items = "\n".join(f"- {c}" for c in memories.current_challenges)
        sections.append(f"## Desafios Atuais\n{items}")

    # ## Em Mente — bullet list
    if memories.top_of_mind:
        items = "\n".join(f"- {t}" for t in memories.top_of_mind)
        sections.append(f"## Em Mente\n{items}")

    # ## Padrões Observados — bullet list (filtered confidence >= 0.7, max 5)
    if memories.learned_patterns:
        patterns = [
            p
            for p in memories.learned_patterns
            if isinstance(p, dict) and float(p.get("confidence", 0)) >= 0.7
        ][:5]
        if patterns:
            items = "\n".join(f"- {p.get('pattern', '')}" for p in patterns)
            sections.append(f"## Padrões Observados\n{items}")

    # ## Comunicação — style + preferences
    comm_parts: list[str] = []
    if memories.communication_style:
        comm_parts.append(f"Estilo: {memories.communication_style}")
    if memories.feedback_preferences:
        comm_parts.append(f"Preferências: {memories.feedback_preferences}")
    if comm_parts:
        sections.append("## Comunicação\n" + "\n".join(comm_parts))

    if not sections:
        return "(Memória ainda não inicializada)"

    return "\n\n".join(sections)


async def build_context(session: AsyncSession, user_id: str, conversation_type: str) -> str:
    """Build the complete system prompt with user context.

    1. Load user profile → name, timezone
    2. Load user memories → full formatted memory
    3. Format into system prompt template
    4. If counselor mode, append counselor extension
    """
    user = await UserRepository.get_by_id(session, uuid.UUID(user_id))
    memories = await UserRepository.get_memories(session, uuid.UUID(user_id))

    user_name = user.name if user else "usuário"
    user_timezone = user.timezone if user else "America/Sao_Paulo"

    # Build memory section
    user_memory = _format_user_memory(memories)

    # Current datetime in user's timezone
    try:
        tz = ZoneInfo(user_timezone)
    except (KeyError, ValueError):
        tz = ZoneInfo("America/Sao_Paulo")
    now = datetime.now(tz)
    current_datetime = now.strftime("%d/%m/%Y %H:%M (%A)")

    # Build prompt
    prompt = BASE_SYSTEM_PROMPT.format(
        user_name=user_name,
        user_memory=user_memory,
        current_datetime=current_datetime,
        user_timezone=user_timezone,
    )

    if conversation_type == "counselor":
        prompt += COUNSELOR_EXTENSION

    return prompt
