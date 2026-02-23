"""Tracking tools — 4 WRITE + 2 READ tools for the tracking domain."""

from app.tools.tracking.delete_metric import delete_metric
from app.tools.tracking.get_habits import get_habits
from app.tools.tracking.get_history import get_history
from app.tools.tracking.record_habit import record_habit
from app.tools.tracking.record_metric import record_metric
from app.tools.tracking.update_metric import update_metric

TRACKING_TOOLS = [
    record_metric, get_history, update_metric, delete_metric, record_habit, get_habits
]
TRACKING_WRITE_TOOLS = {"record_metric", "update_metric", "delete_metric", "record_habit"}

__all__ = [
    "TRACKING_TOOLS",
    "TRACKING_WRITE_TOOLS",
    "record_metric",
    "get_history",
    "update_metric",
    "delete_metric",
    "record_habit",
    "get_habits",
]
