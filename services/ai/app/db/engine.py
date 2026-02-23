"""Database engine and session factory configuration."""

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

AsyncSessionFactory = async_sessionmaker[AsyncSession]


def _to_asyncpg_url(url: str) -> str:
    """Convert postgresql:// URL to postgresql+asyncpg:// for async driver."""
    return url.replace("postgresql://", "postgresql+asyncpg://", 1)


def get_async_engine(database_url: str) -> AsyncEngine:
    """Create an async SQLAlchemy engine from a PostgreSQL URL."""
    return create_async_engine(
        _to_asyncpg_url(database_url),
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
    )


def get_session_factory(engine: AsyncEngine) -> AsyncSessionFactory:
    """Create an async session factory bound to the given engine."""
    return async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
