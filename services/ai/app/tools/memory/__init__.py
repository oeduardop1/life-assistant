"""Memory tools — 2 READ + 1 WRITE tools for the memory domain."""

from app.tools.memory.add_knowledge import add_knowledge
from app.tools.memory.analyze_context import analyze_context
from app.tools.memory.search_knowledge import search_knowledge

MEMORY_TOOLS = [search_knowledge, add_knowledge, analyze_context]
MEMORY_WRITE_TOOLS: set[str] = {"add_knowledge"}

__all__ = [
    "MEMORY_TOOLS",
    "MEMORY_WRITE_TOOLS",
    "search_knowledge",
    "add_knowledge",
    "analyze_context",
]
