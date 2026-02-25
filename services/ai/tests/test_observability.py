"""Tests for observability module — Sentry init + structured logging."""

from __future__ import annotations

import json
import logging
from unittest.mock import MagicMock, patch

from app.observability import (
    _ContextFilter,
    configure_logging,
    init_sentry,
)

# ---------------------------------------------------------------------------
# Sentry tests
# ---------------------------------------------------------------------------


def test_init_sentry_with_dsn() -> None:
    settings = MagicMock()
    settings.SENTRY_DSN = "https://examplePublicKey@o0.ingest.sentry.io/0"
    settings.ENVIRONMENT = "production"
    settings.APP_VERSION = "0.1.0"

    with patch("app.observability.sentry_sdk.init") as mock_init:
        init_sentry(settings)

    mock_init.assert_called_once()
    call_kwargs = mock_init.call_args[1]
    assert call_kwargs["dsn"] == settings.SENTRY_DSN
    assert call_kwargs["environment"] == "production"
    assert call_kwargs["release"] == "0.1.0"
    assert call_kwargs["send_default_pii"] is False


def test_init_sentry_without_dsn() -> None:
    settings = MagicMock()
    settings.SENTRY_DSN = ""

    with patch("app.observability.sentry_sdk.init") as mock_init:
        init_sentry(settings)

    mock_init.assert_not_called()


def test_init_sentry_test_env_skipped() -> None:
    settings = MagicMock()
    settings.SENTRY_DSN = "https://key@sentry.io/0"
    settings.ENVIRONMENT = "test"
    settings.APP_VERSION = "0.1.0"

    with patch("app.observability.sentry_sdk.init") as mock_init:
        init_sentry(settings)

    mock_init.assert_not_called()


def test_init_sentry_production_sample_rate() -> None:
    settings = MagicMock()
    settings.SENTRY_DSN = "https://key@sentry.io/0"
    settings.ENVIRONMENT = "production"
    settings.APP_VERSION = "0.1.0"

    with patch("app.observability.sentry_sdk.init") as mock_init:
        init_sentry(settings)

    call_kwargs = mock_init.call_args[1]
    assert call_kwargs["traces_sample_rate"] == 0.1


def test_init_sentry_dev_sample_rate() -> None:
    settings = MagicMock()
    settings.SENTRY_DSN = "https://key@sentry.io/0"
    settings.ENVIRONMENT = "development"
    settings.APP_VERSION = "0.1.0"

    with patch("app.observability.sentry_sdk.init") as mock_init:
        init_sentry(settings)

    call_kwargs = mock_init.call_args[1]
    assert call_kwargs["traces_sample_rate"] == 1.0


# ---------------------------------------------------------------------------
# Structured logging tests
# ---------------------------------------------------------------------------


def test_configure_logging_json_output(capfd: object) -> None:
    settings = MagicMock()
    settings.LOG_LEVEL = "info"

    configure_logging(settings)

    test_logger = logging.getLogger("test.json_output")
    test_logger.info("hello world")

    # Capture stdout (handler writes to stderr via StreamHandler default, but
    # StreamHandler() defaults to sys.stderr — we override nothing, so check stderr)
    import sys

    handler = logging.getLogger().handlers[0]
    assert handler.stream is sys.stderr or handler.stream is sys.stdout  # type: ignore[union-attr]

    # Verify the root logger has a JSON formatter
    from pythonjsonlogger.json import JsonFormatter

    assert isinstance(handler.formatter, JsonFormatter)


def test_logging_filter_injects_context() -> None:
    ctx_filter = _ContextFilter()
    record = logging.LogRecord(
        name="test", level=logging.INFO, pathname="", lineno=0, msg="test", args=(), exc_info=None
    )

    # Default: no context vars set → None
    ctx_filter.filter(record)
    assert record.request_id is None  # type: ignore[attr-defined]
    assert record.user_id is None  # type: ignore[attr-defined]

    # With context vars set
    from app.api.middleware.request_id import request_id_var, user_id_var

    token_rid = request_id_var.set("req-123")
    token_uid = user_id_var.set("user-456")
    try:
        ctx_filter.filter(record)
        assert record.request_id == "req-123"  # type: ignore[attr-defined]
        assert record.user_id == "user-456"  # type: ignore[attr-defined]
    finally:
        request_id_var.reset(token_rid)
        user_id_var.reset(token_uid)


def test_configure_logging_produces_valid_json(capsys: object) -> None:
    """Log output must be parseable JSON with expected fields."""
    settings = MagicMock()
    settings.LOG_LEVEL = "debug"

    configure_logging(settings)

    import io

    # Capture handler output directly
    buf = io.StringIO()
    root = logging.getLogger()
    handler = root.handlers[0]
    original_stream = handler.stream  # type: ignore[union-attr]
    handler.stream = buf  # type: ignore[union-attr]

    try:
        logging.getLogger("test.json").info("structured test")
        output = buf.getvalue()
    finally:
        handler.stream = original_stream  # type: ignore[union-attr]

    # Should be valid JSON
    parsed = json.loads(output.strip())
    assert parsed["message"] == "structured test"
    assert parsed["level"] == "INFO"
    assert parsed["service"] == "ai-service"
    assert "timestamp" in parsed
