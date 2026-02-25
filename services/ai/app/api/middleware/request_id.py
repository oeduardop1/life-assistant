"""Request-ID middleware: propagation, correlation, and request/response logging.

Note on body reading: BaseHTTPMiddleware wraps the request in _CachedRequest,
which caches the body on request.body()/request.json() and replays it to
downstream handlers. This is safe — the route handler receives the full body.
"""

from __future__ import annotations

import json
import logging
import time
import uuid
from contextvars import ContextVar
from typing import TYPE_CHECKING

import sentry_sdk
from starlette.middleware.base import BaseHTTPMiddleware

if TYPE_CHECKING:
    from collections.abc import Awaitable, Callable

    from fastapi import Request, Response

logger = logging.getLogger(__name__)

request_id_var: ContextVar[str | None] = ContextVar("request_id", default=None)
user_id_var: ContextVar[str | None] = ContextVar("user_id", default=None)


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Propagate x-request-id header and log requests/responses with timing."""

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        rid = request.headers.get("x-request-id") or str(uuid.uuid4())
        request_id_var.set(rid)

        # Extract user_id from JSON body (chat endpoints). Safe to read here
        # because BaseHTTPMiddleware._CachedRequest caches body and replays it.
        uid: str | None = None
        if request.method == "POST":
            try:
                body = await request.body()
                if body:
                    data = json.loads(body)
                    uid = data.get("user_id") if isinstance(data, dict) else None
            except Exception:
                pass
        user_id_var.set(uid)

        sentry_sdk.set_tag("request_id", rid)
        if uid:
            sentry_sdk.set_tag("user_id", uid)

        method = request.method
        path = request.url.path
        start = time.perf_counter()

        logger.info("%s %s", method, path)

        try:
            response = await call_next(request)
        except Exception:
            duration_ms = round((time.perf_counter() - start) * 1000, 1)
            logger.exception("%s %s ERROR", method, path, extra={"duration_ms": duration_ms})
            raise

        duration_ms = round((time.perf_counter() - start) * 1000, 1)
        logger.info(
            "%s %s %s",
            method,
            path,
            response.status_code,
            extra={"duration_ms": duration_ms},
        )

        response.headers["x-request-id"] = rid
        return response
