"""Wellbeing domain — tool exports for the chat agent.

The wellbeing domain has no domain-specific tools. It operates in
"counselor mode" — deep reflection, open questions, minimal emojis.
Memory READ tools (search_knowledge, analyze_context) are shared
from the registry.
"""

from langchain_core.tools import BaseTool

WELLBEING_TOOLS: list[BaseTool] = []
WELLBEING_WRITE_TOOLS: set[str] = set()

__all__ = ["WELLBEING_TOOLS", "WELLBEING_WRITE_TOOLS"]
