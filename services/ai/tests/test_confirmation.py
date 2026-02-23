"""Tests for confirmation payload builders."""

from __future__ import annotations

from app.tools.common.confirmation import (
    build_interrupt_payload,
    generate_batch_message,
    generate_confirmation_message,
)


class TestGenerateConfirmationMessage:
    def test_record_metric(self) -> None:
        msg = generate_confirmation_message(
            "record_metric",
            {"metric_type": "água", "value": "2", "unit": "L", "date": "23/02/2026"},
        )
        assert "água" in msg
        assert "2" in msg
        assert "L" in msg

    def test_create_expense(self) -> None:
        msg = generate_confirmation_message(
            "create_expense", {"valor": "50.00", "categoria": "alimentação"}
        )
        assert "R$50.00" in msg
        assert "alimentação" in msg

    def test_add_knowledge(self) -> None:
        msg = generate_confirmation_message("add_knowledge", {"conteudo": "Eu gosto de café"})
        assert "Eu gosto de café" in msg

    def test_record_habit(self) -> None:
        msg = generate_confirmation_message(
            "record_habit", {"habit_name": "Meditação", "date": "23/02/2026"}
        )
        assert "Meditação" in msg

    def test_mark_bill_paid(self) -> None:
        msg = generate_confirmation_message(
            "mark_bill_paid", {"nome": "Aluguel", "data": "01/03/2026"}
        )
        assert "Aluguel" in msg

    def test_fallback_for_unknown_tool(self) -> None:
        msg = generate_confirmation_message("some_new_tool", {"foo": "bar"})
        assert msg == "Executar some_new_tool?"

    def test_fallback_on_missing_args(self) -> None:
        msg = generate_confirmation_message("record_metric", {"wrong_key": "val"})
        assert msg == "Executar record_metric?"

    def test_optional_args_filled_with_defaults(self) -> None:
        """LLM may omit optional args like date/unit — defaults should fill in."""
        msg = generate_confirmation_message(
            "record_metric",
            {"metric_type": "water", "value": 3000},
        )
        assert "water" in msg
        assert "3000" in msg
        assert "hoje" in msg  # default for missing date

    def test_record_habit_without_date(self) -> None:
        msg = generate_confirmation_message("record_habit", {"habit_name": "Meditação"})
        assert "Meditação" in msg
        assert "hoje" in msg


class TestGenerateBatchMessage:
    def test_single_tool_delegates(self) -> None:
        calls = [{"name": "add_knowledge", "args": {"conteudo": "test"}, "id": "1"}]
        msg = generate_batch_message(calls)
        assert "Salvar" in msg

    def test_multiple_tools(self) -> None:
        calls = [
            {
                "name": "record_metric",
                "args": {"metric_type": "água", "value": "2", "unit": "L", "date": "hoje"},
                "id": "1",
            },
            {"name": "add_knowledge", "args": {"conteudo": "gosto de café"}, "id": "2"},
        ]
        msg = generate_batch_message(calls)
        assert "2 operações" in msg
        assert "•" in msg


class TestBuildInterruptPayload:
    def test_payload_structure(self) -> None:
        calls = [
            {"name": "create_expense", "args": {"valor": "30"}, "id": "tc-1"},
        ]
        payload = build_interrupt_payload(calls, "Registrar gasto?")
        assert payload["type"] == "confirmation_required"
        data = payload["data"]
        assert data["toolName"] == "create_expense"
        assert data["toolArgs"] == {"valor": "30"}
        assert data["message"] == "Registrar gasto?"
        assert "confirmationId" in data
        assert "expiresAt" in data
        assert len(data["tools"]) == 1
        assert data["tools"][0]["toolCallId"] == "tc-1"

    def test_batch_payload(self) -> None:
        calls = [
            {"name": "record_metric", "args": {"a": 1}, "id": "tc-1"},
            {"name": "add_knowledge", "args": {"b": 2}, "id": "tc-2"},
        ]
        payload = build_interrupt_payload(calls, "2 ops?")
        assert len(payload["data"]["tools"]) == 2
        assert payload["data"]["toolNames"] == ["record_metric", "add_knowledge"]
