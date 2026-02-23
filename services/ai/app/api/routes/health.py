from __future__ import annotations

from typing import TYPE_CHECKING, Any

from fastapi import APIRouter, Request
from sqlalchemy import text

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncEngine

router = APIRouter()


@router.get("/health")
async def health_check(request: Request) -> dict[str, Any]:
    """Health check endpoint. Returns service status and database connectivity."""
    db_status = "not_configured"

    engine: AsyncEngine | None = getattr(request.app.state, "db_engine", None)
    if engine is not None:
        try:
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            db_status = "connected"
        except Exception:
            db_status = "error"

    version: str = getattr(request.app.state, "app_version", "unknown")

    return {
        "status": "ok",
        "version": version,
        "database": db_status,
    }
