"""Tests for ConfirmableToolNode."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any
from unittest.mock import AsyncMock, patch

import pytest
from langchain_core.messages import AIMessage, ToolMessage
from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field

from app.tools.common.confirmable_tool_node import ConfirmableToolNode

if TYPE_CHECKING:
    from app.agents.state import AgentState


# ---------------------------------------------------------------------------
# Dummy tools for testing
# ---------------------------------------------------------------------------


class ReadToolInput(BaseModel):
    query: str = Field(description="Search query")


class WriteToolInput(BaseModel):
    value: str = Field(description="Value to write")


class DummyReadTool(BaseTool):
    name: str = "read_data"
    description: str = "Read some data"
    args_schema: type[BaseModel] = ReadToolInput

    async def _arun(self, query: str) -> str:
        return f"read result: {query}"

    def _run(self, query: str) -> str:
        return f"read result: {query}"


class DummyWriteTool(BaseTool):
    name: str = "write_data"
    description: str = "Write some data"
    args_schema: type[BaseModel] = WriteToolInput

    async def _arun(self, value: str) -> str:
        return f"wrote: {value}"

    def _run(self, value: str) -> str:
        return f"wrote: {value}"


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def tools() -> list[BaseTool]:
    return [DummyReadTool(), DummyWriteTool()]


@pytest.fixture
def node(tools: list[BaseTool]) -> ConfirmableToolNode:
    return ConfirmableToolNode(tools, write_tools={"write_data"})


def _make_state(tool_calls: list[dict[str, Any]]) -> AgentState:
    ai_msg = AIMessage(content="")
    ai_msg.tool_calls = tool_calls  # type: ignore[attr-defined]
    return {
        "messages": [ai_msg],
        "user_id": "test-user",
        "conversation_id": "test-conv",
        "current_agent": None,
    }


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_read_tools_execute_without_interrupt(node: ConfirmableToolNode) -> None:
    """READ tools should execute immediately without calling interrupt."""
    state = _make_state(
        [
            {"name": "read_data", "args": {"query": "hello"}, "id": "tc-1", "type": "tool_call"},
        ]
    )
    config: dict[str, Any] = {"configurable": {}}

    with patch("app.tools.common.confirmable_tool_node.interrupt") as mock_interrupt:
        result = await node(state, config)  # type: ignore[arg-type]

    mock_interrupt.assert_not_called()
    assert len(result["messages"]) == 1
    assert isinstance(result["messages"][0], ToolMessage)
    assert "read result" in result["messages"][0].content


@pytest.mark.asyncio
async def test_write_tools_trigger_interrupt(node: ConfirmableToolNode) -> None:
    """WRITE tools should trigger interrupt() with the confirmation payload."""
    state = _make_state(
        [
            {"name": "write_data", "args": {"value": "test"}, "id": "tc-1", "type": "tool_call"},
        ]
    )
    config: dict[str, Any] = {"configurable": {}}

    # Simulate confirm response from interrupt
    with patch(
        "app.tools.common.confirmable_tool_node.interrupt",
        return_value={"action": "confirm"},
    ) as mock_interrupt:
        result = await node(state, config)  # type: ignore[arg-type]

    mock_interrupt.assert_called_once()
    # Verify payload passed to interrupt
    payload = mock_interrupt.call_args[0][0]
    assert payload["type"] == "confirmation_required"

    # Tool should have executed after confirm
    assert len(result["messages"]) == 1
    assert "wrote: test" in result["messages"][0].content


@pytest.mark.asyncio
async def test_write_tools_reject(node: ConfirmableToolNode) -> None:
    """Rejected WRITE tools should return cancellation messages."""
    state = _make_state(
        [
            {"name": "write_data", "args": {"value": "test"}, "id": "tc-1", "type": "tool_call"},
        ]
    )
    config: dict[str, Any] = {"configurable": {}}

    with patch(
        "app.tools.common.confirmable_tool_node.interrupt",
        return_value={"action": "reject"},
    ):
        result = await node(state, config)  # type: ignore[arg-type]

    assert len(result["messages"]) == 1
    assert "cancelada" in result["messages"][0].content


@pytest.mark.asyncio
async def test_write_tools_edit(node: ConfirmableToolNode) -> None:
    """Edited WRITE tools should apply corrected args before execution."""
    state = _make_state(
        [
            {"name": "write_data", "args": {"value": "old"}, "id": "tc-1", "type": "tool_call"},
        ]
    )
    config: dict[str, Any] = {"configurable": {}}

    with patch(
        "app.tools.common.confirmable_tool_node.interrupt",
        return_value={"action": "edit", "args": {"tc-1": {"value": "new"}}},
    ):
        result = await node(state, config)  # type: ignore[arg-type]

    assert len(result["messages"]) == 1
    assert "wrote: new" in result["messages"][0].content


@pytest.mark.asyncio
async def test_batch_write_single_interrupt(node: ConfirmableToolNode) -> None:
    """Multiple WRITE tools should produce a single interrupt (batch)."""
    state = _make_state(
        [
            {"name": "write_data", "args": {"value": "a"}, "id": "tc-1", "type": "tool_call"},
            {"name": "write_data", "args": {"value": "b"}, "id": "tc-2", "type": "tool_call"},
        ]
    )
    config: dict[str, Any] = {"configurable": {}}

    with patch(
        "app.tools.common.confirmable_tool_node.interrupt",
        return_value={"action": "confirm"},
    ) as mock_interrupt:
        result = await node(state, config)  # type: ignore[arg-type]

    # Only one interrupt call for both writes
    mock_interrupt.assert_called_once()
    payload = mock_interrupt.call_args[0][0]
    assert len(payload["data"]["tools"]) == 2

    # Both tools executed
    assert len(result["messages"]) == 2


@pytest.mark.asyncio
async def test_mixed_read_write(node: ConfirmableToolNode) -> None:
    """Mixed READ + WRITE calls: READ executes, WRITE triggers interrupt."""
    state = _make_state(
        [
            {"name": "read_data", "args": {"query": "q"}, "id": "tc-1", "type": "tool_call"},
            {"name": "write_data", "args": {"value": "v"}, "id": "tc-2", "type": "tool_call"},
        ]
    )
    config: dict[str, Any] = {"configurable": {}}

    with patch(
        "app.tools.common.confirmable_tool_node.interrupt",
        return_value={"action": "confirm"},
    ):
        result = await node(state, config)  # type: ignore[arg-type]

    assert len(result["messages"]) == 2
    names = {m.name for m in result["messages"]}
    assert names == {"read_data", "write_data"}


@pytest.mark.asyncio
async def test_tool_error_returns_error_message(tools: list[BaseTool]) -> None:
    """If a tool raises, the node should return an error ToolMessage."""
    # Create a fresh node where we can swap the tool with a mock
    error_node = ConfirmableToolNode(tools, write_tools={"write_data"})

    # Replace tool with a mock that raises
    mock_tool = AsyncMock()
    mock_tool.name = "read_data"
    mock_tool.ainvoke = AsyncMock(side_effect=RuntimeError("DB down"))
    error_node.tools_by_name["read_data"] = mock_tool

    state = _make_state(
        [
            {"name": "read_data", "args": {"query": "q"}, "id": "tc-1", "type": "tool_call"},
        ]
    )
    config: dict[str, Any] = {"configurable": {}}

    result = await error_node(state, config)  # type: ignore[arg-type]

    assert len(result["messages"]) == 1
    assert "Erro ao executar read_data" in result["messages"][0].content
