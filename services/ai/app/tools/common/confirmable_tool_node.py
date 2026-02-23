"""ConfirmableToolNode — LangGraph node that gates WRITE tools behind confirmation.

Replaces ``langgraph.prebuilt.ToolNode`` for domain agents that mix READ
(idempotent) and WRITE (requires confirmation) tools.

Flow:
1. READ tools execute immediately.
2. WRITE tools trigger a single ``interrupt()`` (batch).
3. On resume the node re-executes: READs re-run (idempotent, safe),
   ``interrupt()`` returns the resume value instantly, and WRITE tools
   execute (confirm), execute with edits (edit) or return cancellation
   messages (reject).
"""

from __future__ import annotations

import json
import logging
from typing import TYPE_CHECKING, Any

from langchain_core.messages import ToolMessage
from langgraph.types import interrupt

from app.tools.common.confirmation import (
    build_interrupt_payload,
    generate_batch_message,
    generate_confirmation_message,
)

if TYPE_CHECKING:
    from langchain_core.runnables import RunnableConfig
    from langchain_core.tools import BaseTool

    from app.agents.state import AgentState

logger = logging.getLogger(__name__)


class ConfirmableToolNode:
    """LangGraph node callable that separates READ / WRITE tool execution.

    Parameters
    ----------
    tools:
        All tools the agent can call (both READ and WRITE).
    write_tools:
        Names of tools that require user confirmation before execution.
    """

    def __init__(self, tools: list[BaseTool], write_tools: set[str]) -> None:
        self.tools_by_name: dict[str, BaseTool] = {t.name: t for t in tools}
        self.write_tools = write_tools

    async def __call__(
        self, state: AgentState, config: RunnableConfig
    ) -> dict[str, list[ToolMessage]]:
        last_message = state["messages"][-1]
        tool_calls: list[dict[str, Any]] = getattr(last_message, "tool_calls", [])

        read_calls = [tc for tc in tool_calls if tc["name"] not in self.write_tools]
        write_calls = [tc for tc in tool_calls if tc["name"] in self.write_tools]

        results: list[ToolMessage] = []

        # READ tools — execute immediately (idempotent; safe to re-run on resume)
        for tc in read_calls:
            results.append(await self._execute_tool(tc, config))

        # WRITE tools — batch interrupt
        if write_calls:
            message = (
                generate_batch_message(write_calls)
                if len(write_calls) > 1
                else generate_confirmation_message(write_calls[0]["name"], write_calls[0]["args"])
            )
            payload = build_interrupt_payload(write_calls, message)

            # PAUSE — on first run this suspends the graph.
            # On resume, interrupt() returns the resume value instantly.
            response: dict[str, Any] = interrupt(payload)

            action = response.get("action", "reject")

            if action == "confirm":
                for tc in write_calls:
                    results.append(await self._execute_tool(tc, config))

            elif action == "edit":
                edited: dict[str, dict[str, Any]] = response.get("args", {})
                for tc in write_calls:
                    merged_args = {**tc["args"], **edited.get(tc["id"], {})}
                    tc_copy = {**tc, "args": merged_args}
                    results.append(await self._execute_tool(tc_copy, config))

            else:  # reject
                for tc in write_calls:
                    results.append(
                        ToolMessage(
                            content=json.dumps(
                                {
                                    "success": False,
                                    "message": "Operação cancelada pelo usuário.",
                                }
                            ),
                            tool_call_id=tc["id"],
                            name=tc["name"],
                        )
                    )

        return {"messages": results}

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _execute_tool(self, tc: dict[str, Any], config: RunnableConfig) -> ToolMessage:
        """Execute a single tool call and return a ``ToolMessage``.

        When ``tc`` includes ``"type": "tool_call"`` LangChain's
        ``BaseTool.ainvoke`` returns a ``ToolMessage`` with
        ``tool_call_id`` set automatically.
        """
        tool = self.tools_by_name[tc["name"]]
        # Ensure the dict has "type": "tool_call" for auto-ToolMessage
        tool_call: dict[str, Any] = {**tc, "type": "tool_call"} if "type" not in tc else tc

        try:
            result = await tool.ainvoke(tool_call, config)
            if isinstance(result, ToolMessage):
                return result
            # Fallback: input without "type" field may return a raw string
            return ToolMessage(content=str(result), tool_call_id=tc["id"], name=tc["name"])
        except Exception as exc:
            logger.exception("Tool %s failed", tc["name"])
            return ToolMessage(
                content=f"Erro ao executar {tc['name']}: {exc}",
                tool_call_id=tc["id"],
                name=tc["name"],
            )
