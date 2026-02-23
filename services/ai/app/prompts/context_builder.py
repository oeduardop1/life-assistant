"""Minimal context builder for M4.3 — loads user info + memories."""

import uuid
from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.user import UserRepository
from app.prompts.system import BASE_SYSTEM_PROMPT, COUNSELOR_EXTENSION


async def build_context(session: AsyncSession, user_id: str, conversation_type: str) -> str:
    """Build the complete system prompt with user context.

    1. Load user profile → name, timezone
    2. Load user memories → bio, goals, topOfMind
    3. Format into system prompt template
    4. If counselor mode, append counselor extension
    """
    user = await UserRepository.get_by_id(session, uuid.UUID(user_id))
    memories = await UserRepository.get_memories(session, uuid.UUID(user_id))

    user_name = user.name if user else "usuário"
    user_timezone = user.timezone if user else "America/Sao_Paulo"

    # Build memory section
    memory_parts: list[str] = []
    if memories:
        if memories.bio:
            memory_parts.append(f"- Bio: {memories.bio}")
        if memories.occupation:
            memory_parts.append(f"- Profissão: {memories.occupation}")
        if memories.family_context:
            memory_parts.append(f"- Família: {memories.family_context}")
        if memories.current_goals:
            goals = ", ".join(memories.current_goals)
            memory_parts.append(f"- Objetivos atuais: {goals}")
        if memories.current_challenges:
            challenges = ", ".join(memories.current_challenges)
            memory_parts.append(f"- Desafios atuais: {challenges}")
        if memories.top_of_mind:
            topics = ", ".join(memories.top_of_mind)
            memory_parts.append(f"- Top of mind: {topics}")
        if memories.values:
            values = ", ".join(memories.values)
            memory_parts.append(f"- Valores: {values}")
        if memories.communication_style:
            memory_parts.append(f"- Estilo de comunicação: {memories.communication_style}")

    user_memory = "\n".join(memory_parts) if memory_parts else "Nenhuma memória disponível ainda."

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
