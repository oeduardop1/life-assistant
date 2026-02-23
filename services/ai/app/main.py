import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from sqlalchemy.ext.asyncio import create_async_engine

from app.api.middleware.auth import ServiceAuthMiddleware
from app.api.routes.health import router as health_router
from app.config import get_settings

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    app.state.app_version = settings.APP_VERSION

    # Database engine for health checks and future use
    db_url = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
    engine = create_async_engine(db_url, pool_pre_ping=True)
    app.state.db_engine = engine

    # LangGraph checkpoint persistence (context manager manages psycopg connection)
    async with AsyncPostgresSaver.from_conn_string(settings.DATABASE_URL) as checkpointer:
        await checkpointer.setup()
        app.state.checkpointer = checkpointer

        logger.info("AI service started (version=%s)", settings.APP_VERSION)

        yield

    # Shutdown
    await engine.dispose()
    logger.info("AI service stopped")


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="Life Assistant AI Service",
        version=settings.APP_VERSION,
        lifespan=lifespan,
    )

    # Middleware
    app.add_middleware(ServiceAuthMiddleware, service_secret=settings.SERVICE_SECRET)

    # Routes
    app.include_router(health_router)

    return app


app = create_app()
