"""APScheduler setup — timezone-aware consolidation scheduling.

Queries distinct user timezones and registers one CronTrigger job per timezone
so that consolidation runs at 3:00 AM local time for each group.
"""

import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler  # type: ignore[import-untyped]
from apscheduler.triggers.cron import CronTrigger  # type: ignore[import-untyped]

from app.config import get_settings
from app.db.engine import AsyncSessionFactory
from app.db.repositories.user import UserRepository
from app.db.session import get_service_session

logger = logging.getLogger(__name__)


async def setup_scheduler(session_factory: AsyncSessionFactory) -> AsyncIOScheduler:
    """Create and start the APScheduler instance with consolidation jobs.

    Queries the database for distinct user timezones and registers a cron job
    for each so consolidation runs at 3 AM local time.
    """
    settings = get_settings()
    scheduler = AsyncIOScheduler()

    async with get_service_session(session_factory) as session:
        timezones = await UserRepository.get_distinct_timezones(session)

    if not timezones:
        logger.info("No active users found, scheduler started with no consolidation jobs")
        scheduler.start()
        return scheduler

    for tz in timezones:
        scheduler.add_job(
            "app.workers.consolidation:run_consolidation",
            CronTrigger(
                hour=settings.CONSOLIDATION_CRON_HOUR,
                minute=settings.CONSOLIDATION_CRON_MINUTE,
                timezone=tz,
            ),
            id=f"consolidation:{tz}",
            replace_existing=True,
            kwargs={"timezone": tz},
        )
        logger.debug(
            "Scheduled consolidation for timezone %s at %02d:%02d",
            tz,
            settings.CONSOLIDATION_CRON_HOUR,
            settings.CONSOLIDATION_CRON_MINUTE,
        )

    scheduler.start()
    logger.info(
        "APScheduler started: %d consolidation job(s) for %d timezone(s)",
        len(timezones),
        len(timezones),
    )
    return scheduler


async def refresh_schedules(
    scheduler: AsyncIOScheduler,
    session_factory: AsyncSessionFactory,
) -> None:
    """Re-query timezones and upsert jobs (e.g. when a new user registers)."""
    settings = get_settings()

    async with get_service_session(session_factory) as session:
        timezones = await UserRepository.get_distinct_timezones(session)

    existing_ids = {job.id for job in scheduler.get_jobs()}

    for tz in timezones:
        job_id = f"consolidation:{tz}"
        if job_id not in existing_ids:
            scheduler.add_job(
                "app.workers.consolidation:run_consolidation",
                CronTrigger(
                    hour=settings.CONSOLIDATION_CRON_HOUR,
                    minute=settings.CONSOLIDATION_CRON_MINUTE,
                    timezone=tz,
                ),
                id=job_id,
                replace_existing=True,
                kwargs={"timezone": tz},
            )
            logger.info("Added new consolidation job for timezone %s", tz)
