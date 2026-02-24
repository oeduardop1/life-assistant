"""Domain registry — central mapping of agent → tools + prompt extension.

Provides ``DomainConfig`` and ``build_domain_registry()`` used by
``build_multi_agent_graph`` to configure per-domain tool binding and
prompt extensions.

Imports are deferred inside ``build_domain_registry()`` to avoid
circular dependencies at module level.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from langchain_core.tools import BaseTool


@dataclass(frozen=True)
class DomainConfig:
    """Configuration for a single domain agent.

    Attributes
    ----------
    tools:
        All tools available to this domain (domain-specific + shared memory READ).
    write_tools:
        Names of tools that require user confirmation (WRITE tools).
    prompt_extension:
        Domain-specific prompt text appended to the core system prompt.
    """

    tools: list[BaseTool]
    write_tools: set[str]
    prompt_extension: str


def build_domain_registry() -> dict[str, DomainConfig]:
    """Build the mapping of domain name → DomainConfig.

    Returns a dict with keys: tracking, finance, memory, wellbeing, general.
    Each domain includes shared memory READ tools (search_knowledge, analyze_context).

    Tool counts:
    - tracking: 6 + 2 shared = 8 (4 WRITE)
    - finance:  11 + 2 shared = 13 (2 WRITE)
    - memory:   3 (already includes READ tools) (1 WRITE)
    - wellbeing: 0 + 2 shared = 2 (0 WRITE)
    - general:  0 + 2 shared = 2 (0 WRITE)
    """
    from app.prompts.system import (
        FINANCE_PROMPT_EXTENSION,
        GENERAL_PROMPT_EXTENSION,
        MEMORY_WRITE_EXTENSION,
        TRACKING_PROMPT_EXTENSION,
        WELLBEING_PROMPT_EXTENSION,
    )
    from app.tools.finance import FINANCE_TOOLS, FINANCE_WRITE_TOOLS
    from app.tools.memory import MEMORY_READ_TOOLS, MEMORY_TOOLS, MEMORY_WRITE_TOOLS
    from app.tools.tracking import TRACKING_TOOLS, TRACKING_WRITE_TOOLS

    return {
        "tracking": DomainConfig(
            tools=TRACKING_TOOLS + MEMORY_READ_TOOLS,
            write_tools=TRACKING_WRITE_TOOLS,
            prompt_extension=TRACKING_PROMPT_EXTENSION,
        ),
        "finance": DomainConfig(
            tools=FINANCE_TOOLS + MEMORY_READ_TOOLS,
            write_tools=FINANCE_WRITE_TOOLS,
            prompt_extension=FINANCE_PROMPT_EXTENSION,
        ),
        "memory": DomainConfig(
            tools=MEMORY_TOOLS,
            write_tools=MEMORY_WRITE_TOOLS,
            prompt_extension=MEMORY_WRITE_EXTENSION,
        ),
        "wellbeing": DomainConfig(
            tools=list(MEMORY_READ_TOOLS),
            write_tools=set(),
            prompt_extension=WELLBEING_PROMPT_EXTENSION,
        ),
        "general": DomainConfig(
            tools=list(MEMORY_READ_TOOLS),
            write_tools=set(),
            prompt_extension=GENERAL_PROMPT_EXTENSION,
        ),
    }
