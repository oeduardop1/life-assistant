"""Admin endpoints for triggering worker jobs."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Request
from pydantic import BaseModel

from app.workers.consolidation import (
    ConsolidationResult,
    run_consolidation,
    run_consolidation_for_user,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/workers", tags=["workers"])


class TriggerRequest(BaseModel):
    user_id: str | None = None
    timezone: str | None = None


@router.post("/consolidation/trigger", response_model=ConsolidationResult)
async def trigger_consolidation(request: Request, body: TriggerRequest) -> Any:
    """Manually trigger memory consolidation.

    - If ``user_id`` is provided, run for that single user.
    - If ``timezone`` is provided, run for all users in that timezone.
    - If neither, return an error.

    Auth is handled by ServiceAuthMiddleware (requires SERVICE_SECRET).
    """
    if body.user_id:
        logger.info("Manual consolidation trigger for user %s", body.user_id)
        return await run_consolidation_for_user(body.user_id)

    if body.timezone:
        logger.info("Manual consolidation trigger for timezone %s", body.timezone)
        return await run_consolidation(body.timezone)

    return ConsolidationResult(
        errors=1,
        completed_at="",
    )
