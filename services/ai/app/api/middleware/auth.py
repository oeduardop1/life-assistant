from collections.abc import Awaitable, Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

# Paths that don't require authentication
PUBLIC_PATHS = frozenset({"/health", "/docs", "/openapi.json", "/redoc"})


class ServiceAuthMiddleware(BaseHTTPMiddleware):
    """Verify service-to-service auth via Bearer token matching SERVICE_SECRET."""

    def __init__(self, app: object, service_secret: str) -> None:
        super().__init__(app)  # type: ignore[arg-type]
        self.service_secret = service_secret

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        if request.url.path in PUBLIC_PATHS:
            return await call_next(request)

        auth_header = request.headers.get("authorization", "")
        if not auth_header.startswith("Bearer "):
            return JSONResponse(
                status_code=401,
                content={"detail": "Missing or invalid Authorization header"},
            )

        token = auth_header.removeprefix("Bearer ")
        if token != self.service_secret:
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid service token"},
            )

        return await call_next(request)
