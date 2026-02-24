"""Memory consolidation worker — daily extraction of facts from conversations.

Ported from apps/api/src/jobs/memory-consolidation/memory-consolidation.processor.ts.
Runs at 3:00 AM local time per timezone via APScheduler. For each user:
  1. Get user memory + messages since last consolidation
  2. Run deduplication phase on existing knowledge
  3. Build prompt, call LLM, parse response
  4. Apply memory updates + create/update knowledge items
  5. Log consolidation result
"""

from __future__ import annotations

import datetime as _dt
import logging
import uuid as _uuid
from typing import TYPE_CHECKING, Any

from pydantic import BaseModel

from app.agents.llm import create_llm
from app.config import get_settings
from app.db.repositories.chat import ChatRepository
from app.db.repositories.memory import MemoryRepository
from app.db.repositories.user import UserRepository
from app.db.session import get_service_session
from app.tools.memory._contradiction_detector import check_contradictions
from app.workers.consolidation_prompt import (
    ConsolidationResponse,
    build_consolidation_prompt,
    parse_consolidation_response,
)

if TYPE_CHECKING:
    from app.db.engine import AsyncSessionFactory
    from app.db.models.memory import KnowledgeItem
    from app.db.models.users import User
from app.workers.utils import retry_with_backoff

logger = logging.getLogger(__name__)

# Module-level reference to session factory, set during scheduler setup
_session_factory: AsyncSessionFactory | None = None


def set_session_factory(sf: AsyncSessionFactory) -> None:
    """Set the module-level session factory (called from lifespan)."""
    global _session_factory  # noqa: PLW0603
    _session_factory = sf


def _get_session_factory() -> AsyncSessionFactory:
    if _session_factory is None:
        msg = "Session factory not initialized — call set_session_factory() first"
        raise RuntimeError(msg)
    return _session_factory


class ConsolidationResult(BaseModel):
    users_processed: int = 0
    users_consolidated: int = 0
    users_skipped: int = 0
    errors: int = 0
    completed_at: str = ""


async def run_consolidation(timezone: str) -> ConsolidationResult:
    """Run memory consolidation for all active users in a timezone.

    Called by APScheduler at 3 AM local time for each timezone.
    """
    session_factory = _get_session_factory()
    logger.info("Starting memory consolidation for timezone %s", timezone)

    async with get_service_session(session_factory) as session:
        users = await UserRepository.get_users_by_timezone(session, timezone)

    users_consolidated = 0
    users_skipped = 0
    errors = 0

    for user in users:
        try:
            consolidated = await _process_user(user)
            if consolidated:
                users_consolidated += 1
            else:
                users_skipped += 1
        except Exception:
            errors += 1
            logger.exception("Failed to consolidate user %s", user.id)
            await _log_consolidation(user.id, status="failed")

    logger.info(
        "Consolidation complete for %s: %d consolidated, %d skipped, %d errors",
        timezone,
        users_consolidated,
        users_skipped,
        errors,
    )

    return ConsolidationResult(
        users_processed=len(users),
        users_consolidated=users_consolidated,
        users_skipped=users_skipped,
        errors=errors,
        completed_at=_dt.datetime.now(tz=_UTC).isoformat(),
    )


async def run_consolidation_for_user(user_id: str) -> ConsolidationResult:
    """Manual trigger: run consolidation for a single user."""
    session_factory = _get_session_factory()

    async with get_service_session(session_factory) as session:
        user = await UserRepository.get_by_id(session, _uuid.UUID(user_id))

    if user is None:
        logger.warning("User %s not found for consolidation", user_id)
        return ConsolidationResult(
            users_processed=0,
            completed_at=_dt.datetime.now(tz=_UTC).isoformat(),
        )

    try:
        consolidated = await _process_user(user)
        return ConsolidationResult(
            users_processed=1,
            users_consolidated=1 if consolidated else 0,
            users_skipped=0 if consolidated else 1,
            completed_at=_dt.datetime.now(tz=_UTC).isoformat(),
        )
    except Exception:
        logger.exception("Failed to consolidate user %s", user_id)
        await _log_consolidation(user.id, status="failed")
        return ConsolidationResult(
            users_processed=1,
            errors=1,
            completed_at=_dt.datetime.now(tz=_UTC).isoformat(),
        )


_UTC = _dt.UTC


def _enum_val(v: object) -> str:
    """Extract .value from enum or convert to str."""
    return v.value if hasattr(v, "value") else str(v)


async def _process_user(user: User) -> bool:
    """Process a single user's messages for consolidation.

    Returns True if messages were consolidated, False if skipped.
    """
    session_factory = _get_session_factory()
    logger.debug("Processing user %s (%s)", user.id, user.name)

    async with get_service_session(session_factory) as session:
        # Get user memory (or None if not created)
        memory = await MemoryRepository.get_user_memories(session, user.id)
        if memory is None:
            logger.debug("No memory record for user %s, skipping", user.id)
            return False

        # Calculate time range
        consolidated_from = memory.last_consolidated_at or memory.created_at
        consolidated_to = _dt.datetime.now(tz=_UTC)

        # Get messages since last consolidation
        messages = await ChatRepository.get_messages_since(session, user.id, consolidated_from)

        if not messages:
            logger.debug("No messages to consolidate for user %s", user.id)
            return False

        logger.info("Found %d messages to consolidate for user %s", len(messages), user.id)

        # Get existing knowledge items
        existing_knowledge = await MemoryRepository.search_knowledge(
            session,
            user.id,
            limit=100,
        )

    # Run deduplication phase (outside session — it opens its own)
    dedup_resolved = await _run_deduplication_phase(user.id, existing_knowledge)
    if dedup_resolved > 0:
        logger.info("Resolved %d existing contradictions for user %s", dedup_resolved, user.id)

    # Build prompt
    memory_dict = {
        "bio": memory.bio,
        "occupation": memory.occupation,
        "family_context": memory.family_context,
        "current_goals": memory.current_goals,
        "current_challenges": memory.current_challenges,
        "top_of_mind": memory.top_of_mind,
        "values": memory.values,
    }
    knowledge_dicts = [
        {
            "id": str(ki.id),
            "type": _enum_val(ki.type),
            "content": ki.content,
            "title": ki.title or "",
        }
        for ki in existing_knowledge
    ]
    prompt = build_consolidation_prompt(messages, memory_dict, knowledge_dicts)

    # Call LLM with retry
    settings = get_settings()
    llm = create_llm(settings, temperature=0.3)

    raw_output: str = ""

    async def _call_llm() -> str:
        response = await llm.ainvoke(prompt)
        content = response.content
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            return " ".join(
                block.get("text", "") if isinstance(block, dict) else str(block)
                for block in content
            )
        return str(content)

    raw_output = await retry_with_backoff(_call_llm)

    # Parse response
    consolidation_result = parse_consolidation_response(raw_output)

    # Apply updates
    await _apply_consolidation_result(user.id, consolidation_result, existing_knowledge)

    # Update last_consolidated_at and log
    async with get_service_session(session_factory) as session:
        await MemoryRepository.update_user_memories(
            session,
            user.id,
            {"last_consolidated_at": consolidated_to},
        )

    await _log_consolidation(
        user.id,
        status="completed",
        consolidated_from=consolidated_from,
        consolidated_to=consolidated_to,
        messages_processed=len(messages),
        result=consolidation_result,
        raw_output=raw_output,
    )

    return True


async def _run_deduplication_phase(
    user_id: _uuid.UUID,
    existing_knowledge: list[KnowledgeItem],
) -> int:
    """Find and resolve existing contradictions within knowledge item groups."""
    if len(existing_knowledge) < 2:
        return 0

    session_factory = _get_session_factory()
    contradictions_resolved = 0

    # Group by type + area
    grouped: dict[str, list[KnowledgeItem]] = {}
    for item in existing_knowledge:
        area_val = _enum_val(item.area) if item.area else "null"
        type_val = _enum_val(item.type)
        key = f"{type_val}:{area_val}"
        grouped.setdefault(key, []).append(item)

    for group_key, items in grouped.items():
        if len(items) < 2:
            continue

        # Check each pair: compare newer items against older ones
        for i in range(1, len(items)):
            newer = items[i]
            older_items = items[:i]

            results = await check_contradictions(
                newer.content,
                older_items,
                threshold=0.7,
            )

            for result in results:
                # Determine which to keep based on priority:
                # validatedByUser > confidence > recency
                old_item = next(
                    (it for it in older_items if it.id == result.item_id),
                    None,
                )
                if old_item is None:
                    continue

                keep, supersede = _resolve_priority(newer, old_item)

                async with get_service_session(session_factory) as session:
                    await MemoryRepository.supersede_knowledge(
                        session,
                        supersede.id,
                        keep.id,
                    )

                logger.debug(
                    "Deduplication: resolved contradiction in %s, kept %s, superseded %s",
                    group_key,
                    keep.id,
                    supersede.id,
                )
                contradictions_resolved += 1

    return contradictions_resolved


def _resolve_priority(
    newer: KnowledgeItem, older: KnowledgeItem
) -> tuple[KnowledgeItem, KnowledgeItem]:
    """Determine which item to keep based on 3-tier priority.

    Priority: validatedByUser > confidence > recency (newer wins).
    Returns (keep, supersede).
    """
    # Tier 1: validated by user wins
    if older.validated_by_user and not newer.validated_by_user:
        return older, newer
    if newer.validated_by_user and not older.validated_by_user:
        return newer, older

    # Tier 2: higher confidence wins
    if older.confidence > newer.confidence:
        return older, newer
    if newer.confidence > older.confidence:
        return newer, older

    # Tier 3: newer wins (recency)
    return newer, older


async def _apply_consolidation_result(
    user_id: _uuid.UUID,
    result: ConsolidationResponse,
    existing_knowledge: list[KnowledgeItem],
) -> None:
    """Apply consolidation result: update memory, create/update knowledge items."""
    session_factory = _get_session_factory()

    # Apply memory updates
    updates = result.memory_updates
    memory_payload: dict[str, Any] = {}

    if updates.bio is not None:
        memory_payload["bio"] = updates.bio
    if updates.occupation is not None:
        memory_payload["occupation"] = updates.occupation
    if updates.family_context is not None:
        memory_payload["family_context"] = updates.family_context
    if updates.current_goals is not None:
        memory_payload["current_goals"] = updates.current_goals
    if updates.current_challenges is not None:
        memory_payload["current_challenges"] = updates.current_challenges
    if updates.top_of_mind is not None:
        memory_payload["top_of_mind"] = updates.top_of_mind
    if updates.values is not None:
        memory_payload["values"] = updates.values
    if updates.learned_patterns is not None:
        memory_payload["learned_patterns"] = [lp.model_dump() for lp in updates.learned_patterns]

    if memory_payload:
        async with get_service_session(session_factory) as session:
            await MemoryRepository.update_user_memories(session, user_id, memory_payload)
        logger.debug("Updated memory for user %s", user_id)

    # Create new knowledge items (with contradiction detection)
    for item in result.new_knowledge_items:
        ki_data: dict[str, Any] = {
            "id": _uuid.uuid4(),
            "user_id": user_id,
            "type": item.type,
            "content": item.content,
            "confidence": item.confidence,
            "source": item.source,
            "title": item.title or "",
        }
        if item.area is not None:
            ki_data["area"] = item.area
        if item.sub_area is not None:
            ki_data["sub_area"] = item.sub_area
        if item.inference_evidence is not None:
            ki_data["inference_evidence"] = item.inference_evidence

        # Filter existing items in same type+area group for contradiction check
        same_group = [
            ki
            for ki in existing_knowledge
            if _enum_val(ki.type) == item.type
            and (_enum_val(ki.area) if ki.area else None) == item.area
        ]

        if same_group:
            contradictions = await check_contradictions(
                item.content,
                same_group,
                threshold=0.7,
            )
            for contradiction in contradictions:
                old_item = next(
                    (ki for ki in same_group if ki.id == contradiction.item_id),
                    None,
                )
                if old_item is None:
                    continue
                async with get_service_session(session_factory) as session:
                    await MemoryRepository.supersede_knowledge(
                        session,
                        old_item.id,
                        ki_data["id"],
                    )
                logger.debug(
                    "Superseded item %s during consolidation: %s",
                    old_item.id,
                    contradiction.reason,
                )

        async with get_service_session(session_factory) as session:
            await MemoryRepository.create_knowledge(session, ki_data)

    if result.new_knowledge_items:
        logger.debug(
            "Created %d knowledge items for user %s",
            len(result.new_knowledge_items),
            user_id,
        )

    # Update existing knowledge items
    for upd in result.updated_knowledge_items:
        update_payload: dict[str, Any] = {"updated_at": _dt.datetime.now(tz=_UTC)}
        if upd.content is not None:
            update_payload["content"] = upd.content
        if upd.confidence is not None:
            update_payload["confidence"] = upd.confidence

        async with get_service_session(session_factory) as session:
            await MemoryRepository.update_knowledge(
                session,
                _uuid.UUID(upd.id),
                update_payload,
            )

    if result.updated_knowledge_items:
        logger.debug(
            "Updated %d knowledge items for user %s",
            len(result.updated_knowledge_items),
            user_id,
        )


async def _log_consolidation(
    user_id: _uuid.UUID,
    *,
    status: str,
    consolidated_from: _dt.datetime | None = None,
    consolidated_to: _dt.datetime | None = None,
    messages_processed: int = 0,
    result: ConsolidationResponse | None = None,
    raw_output: str | None = None,
) -> None:
    """Create a consolidation audit log entry."""
    session_factory = _get_session_factory()
    now = _dt.datetime.now(tz=_UTC)

    facts_created = len(result.new_knowledge_items) if result else 0
    facts_updated = len(result.updated_knowledge_items) if result else 0
    inferences_created = (
        sum(1 for item in result.new_knowledge_items if item.inference_evidence is not None)
        if result
        else 0
    )

    memory_updates_dict = (
        result.memory_updates.model_dump(exclude_none=True, by_alias=True) if result else None
    )

    data: dict[str, Any] = {
        "id": _uuid.uuid4(),
        "user_id": user_id,
        "consolidated_from": consolidated_from or now,
        "consolidated_to": consolidated_to or now,
        "messages_processed": messages_processed,
        "facts_created": facts_created,
        "facts_updated": facts_updated,
        "inferences_created": inferences_created,
        "memory_updates": memory_updates_dict,
        "raw_output": raw_output,
        "status": status,
    }

    try:
        async with get_service_session(session_factory) as session:
            await MemoryRepository.create_consolidation_log(session, data)
    except Exception:
        logger.exception("Failed to create consolidation log for user %s", user_id)
