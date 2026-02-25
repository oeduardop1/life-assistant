"""Unit tests for workers: scheduler, retry utility, and admin trigger endpoint."""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.api.middleware.auth import ServiceAuthMiddleware
from app.api.routes.workers import router as workers_router

TEST_SERVICE_SECRET = "test-secret-token"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _mock_service_session() -> tuple[AsyncMock, AsyncMock]:
    """Return (mock_get_service_session, mock_session).

    ``mock_get_service_session`` is an async-context-manager factory that
    yields ``mock_session``.
    """
    mock_session = AsyncMock()

    @asynccontextmanager
    async def _ctx(*_args: object, **_kw: object) -> AsyncIterator[AsyncMock]:
        yield mock_session

    return AsyncMock(side_effect=_ctx), mock_session


# ---------------------------------------------------------------------------
# 1 — setup_scheduler registers one job per timezone
# ---------------------------------------------------------------------------


async def test_scheduler_registers_jobs_per_timezone() -> None:
    mock_get_service_session, mock_session = _mock_service_session()

    mock_settings = MagicMock()
    mock_settings.CONSOLIDATION_CRON_HOUR = 3
    mock_settings.CONSOLIDATION_CRON_MINUTE = 0

    timezones = ["America/Sao_Paulo", "Europe/London"]

    with (
        patch(
            "app.workers.scheduler.get_service_session",
            side_effect=mock_get_service_session.side_effect,
        ),
        patch(
            "app.workers.scheduler.UserRepository.get_distinct_timezones",
            return_value=timezones,
        ),
        patch("app.workers.scheduler.get_settings", return_value=mock_settings),
        patch("app.workers.scheduler.AsyncIOScheduler") as MockScheduler,
        patch("app.workers.scheduler.CronTrigger") as MockCronTrigger,
    ):
        scheduler_instance = MockScheduler.return_value
        scheduler_instance.get_jobs.return_value = []

        from app.workers.scheduler import setup_scheduler

        result = await setup_scheduler(MagicMock())

        assert scheduler_instance.add_job.call_count == 2

        # Verify CronTrigger was created with correct args
        assert MockCronTrigger.call_count == 2
        for i, tz in enumerate(timezones):
            call = MockCronTrigger.call_args_list[i]
            assert call.kwargs["hour"] == 3
            assert call.kwargs["minute"] == 0
            assert call.kwargs["timezone"] == tz

        # Verify scheduler was started
        scheduler_instance.start.assert_called_once()
        assert result is scheduler_instance


# ---------------------------------------------------------------------------
# 8 — refresh_schedules only adds new timezones
# ---------------------------------------------------------------------------


async def test_refresh_schedules_only_adds_new_timezones() -> None:
    mock_get_service_session, _ = _mock_service_session()

    mock_settings = MagicMock()
    mock_settings.CONSOLIDATION_CRON_HOUR = 3
    mock_settings.CONSOLIDATION_CRON_MINUTE = 0

    # DB returns 3 timezones, 2 already scheduled
    with (
        patch(
            "app.workers.scheduler.get_service_session",
            side_effect=mock_get_service_session.side_effect,
        ),
        patch(
            "app.workers.scheduler.UserRepository.get_distinct_timezones",
            return_value=["America/Sao_Paulo", "Europe/London", "Asia/Tokyo"],
        ),
        patch("app.workers.scheduler.get_settings", return_value=mock_settings),
        patch("app.workers.scheduler.CronTrigger"),
    ):
        scheduler = MagicMock()
        # Existing jobs
        existing_job_1 = MagicMock()
        existing_job_1.id = "consolidation:America/Sao_Paulo"
        existing_job_2 = MagicMock()
        existing_job_2.id = "consolidation:Europe/London"
        scheduler.get_jobs.return_value = [existing_job_1, existing_job_2]

        from app.workers.scheduler import refresh_schedules

        await refresh_schedules(scheduler, MagicMock())

        # Only Asia/Tokyo should be added
        assert scheduler.add_job.call_count == 1
        call = scheduler.add_job.call_args
        assert call.kwargs["id"] == "consolidation:Asia/Tokyo"


# ---------------------------------------------------------------------------
# 7a — retry_with_backoff succeeds on third attempt
# ---------------------------------------------------------------------------


async def test_retry_with_backoff_succeeds_on_third_attempt() -> None:
    call_count = 0

    async def flaky() -> str:
        nonlocal call_count
        call_count += 1
        if call_count < 3:
            raise RuntimeError(f"fail #{call_count}")
        return "ok"

    with patch("app.workers.utils.asyncio.sleep", new_callable=AsyncMock) as mock_sleep:
        from app.workers.utils import retry_with_backoff

        result = await retry_with_backoff(flaky, max_retries=3, base_delay=1.0)

    assert result == "ok"
    assert call_count == 3

    # Verify exponential backoff delays: 1.0 * 2^0, 1.0 * 2^1
    assert mock_sleep.call_count == 2
    mock_sleep.assert_any_call(1.0)
    mock_sleep.assert_any_call(2.0)


# ---------------------------------------------------------------------------
# 7b — retry_with_backoff raises after exhaustion
# ---------------------------------------------------------------------------


async def test_retry_with_backoff_raises_after_exhaustion() -> None:
    async def always_fail() -> str:
        raise ValueError("permanent error")

    with patch("app.workers.utils.asyncio.sleep", new_callable=AsyncMock):
        from app.workers.utils import retry_with_backoff

        with pytest.raises(ValueError, match="permanent error"):
            await retry_with_backoff(always_fail, max_retries=3, base_delay=1.0)


# ---------------------------------------------------------------------------
# 13 — trigger endpoint tests
# ---------------------------------------------------------------------------


@pytest.fixture
def workers_app() -> FastAPI:
    """Create a test FastAPI app with only the workers router."""
    test_app = FastAPI()
    test_app.add_middleware(ServiceAuthMiddleware, service_secret=TEST_SERVICE_SECRET)
    test_app.include_router(workers_router)
    return test_app


@pytest.fixture
async def workers_client(workers_app: FastAPI) -> AsyncIterator[AsyncClient]:
    transport = ASGITransport(app=workers_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


_AUTH = {"Authorization": f"Bearer {TEST_SERVICE_SECRET}"}


async def test_trigger_endpoint_with_user_id(workers_client: AsyncClient) -> None:
    from app.workers.consolidation import ConsolidationResult

    result = ConsolidationResult(
        users_processed=1,
        users_consolidated=1,
        completed_at="2026-01-01T00:00:00",
    )

    with patch(
        "app.api.routes.workers.run_consolidation_for_user",
        new_callable=AsyncMock,
        return_value=result,
    ) as mock_fn:
        resp = await workers_client.post(
            "/workers/consolidation/trigger",
            json={"user_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"},
            headers=_AUTH,
        )

    assert resp.status_code == 200
    mock_fn.assert_called_once_with("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")


async def test_trigger_endpoint_with_timezone(workers_client: AsyncClient) -> None:
    from app.workers.consolidation import ConsolidationResult

    result = ConsolidationResult(
        users_processed=3,
        users_consolidated=2,
        users_skipped=1,
        completed_at="2026-01-01T00:00:00",
    )

    with patch(
        "app.api.routes.workers.run_consolidation",
        new_callable=AsyncMock,
        return_value=result,
    ) as mock_fn:
        resp = await workers_client.post(
            "/workers/consolidation/trigger",
            json={"timezone": "America/Sao_Paulo"},
            headers=_AUTH,
        )

    assert resp.status_code == 200
    mock_fn.assert_called_once_with("America/Sao_Paulo")


async def test_trigger_endpoint_with_neither(workers_client: AsyncClient) -> None:
    resp = await workers_client.post(
        "/workers/consolidation/trigger",
        json={},
        headers=_AUTH,
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["errors"] == 1
