import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

from app.agents.graph import build_chat_graph
from app.agents.llm import create_llm, create_triage_llm
from app.api.middleware.auth import ServiceAuthMiddleware
from app.api.routes.chat import router as chat_router
from app.api.routes.health import router as health_router
from app.api.routes.workers import router as workers_router
from app.config import get_settings
from app.db.engine import get_async_engine, get_session_factory
from app.workers.consolidation import set_session_factory
from app.workers.scheduler import setup_scheduler

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    app.state.app_version = settings.APP_VERSION

    # Database engine + session factory
    engine = get_async_engine(settings.DATABASE_URL)
    app.state.db_engine = engine
    app.state.session_factory = get_session_factory(engine)

    # LangGraph checkpoint persistence (context manager manages psycopg connection)
    async with AsyncPostgresSaver.from_conn_string(settings.DATABASE_URL) as checkpointer:
        await checkpointer.setup()
        app.state.checkpointer = checkpointer

        # Build and store the LangGraph multi-agent chat graph
        llm = create_llm(settings)
        triage_llm = create_triage_llm(settings)
        app.state.graph = build_chat_graph(llm, triage_llm, checkpointer)

        # APScheduler for consolidation jobs
        set_session_factory(app.state.session_factory)
        scheduler = None
        if settings.CONSOLIDATION_ENABLED:
            scheduler = await setup_scheduler(app.state.session_factory)
            app.state.scheduler = scheduler

        logger.info("AI service started (version=%s)", settings.APP_VERSION)

        yield

    # Shutdown
    if scheduler is not None:
        scheduler.shutdown()
        logger.info("APScheduler stopped")
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
    app.include_router(chat_router)
    app.include_router(workers_router)

    return app


app = create_app()
