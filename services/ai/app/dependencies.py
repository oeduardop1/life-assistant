from typing import Any

from fastapi import Request

from app.config import Settings, get_settings


def get_app_settings() -> Settings:
    return get_settings()


def get_checkpointer(request: Request) -> Any:
    return request.app.state.checkpointer
