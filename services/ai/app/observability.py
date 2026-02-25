"""Observability: Sentry + structured JSON logging."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

import sentry_sdk
from pythonjsonlogger.json import JsonFormatter
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration

if TYPE_CHECKING:
    from app.config import Settings


def init_sentry(settings: Settings) -> None:
    """Initialize Sentry SDK. No-op when SENTRY_DSN is empty or env is test."""
    if not settings.SENTRY_DSN or settings.ENVIRONMENT == "test":
        return

    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT,
        release=settings.APP_VERSION,
        traces_sample_rate=0.1 if settings.ENVIRONMENT == "production" else 1.0,
        send_default_pii=False,
        integrations=[StarletteIntegration(), FastApiIntegration()],
    )


class _ContextFilter(logging.Filter):
    """Inject request_id and user_id from ContextVars into log records."""

    def filter(self, record: logging.LogRecord) -> bool:
        from app.api.middleware.request_id import request_id_var, user_id_var

        record.request_id = request_id_var.get(None)
        record.user_id = user_id_var.get(None)
        return True


def configure_logging(settings: Settings) -> None:
    """Set up JSON structured logging to stdout."""
    formatter = JsonFormatter(
        fmt="%(asctime)s %(levelname)s %(name)s %(message)s",
        rename_fields={"levelname": "level", "asctime": "timestamp"},
        static_fields={"service": "ai-service"},
        defaults={"request_id": None, "user_id": None, "duration_ms": None},
        timestamp=True,
    )

    context_filter = _ContextFilter()

    handler = logging.StreamHandler()
    handler.setFormatter(formatter)
    handler.addFilter(context_filter)

    level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(level)

    # Override uvicorn loggers to use JSON format
    for name in ("uvicorn", "uvicorn.access", "uvicorn.error"):
        uv_logger = logging.getLogger(name)
        uv_logger.handlers.clear()
        uv_logger.addHandler(handler)
        uv_logger.propagate = False
