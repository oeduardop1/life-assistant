"""Tests for the domain registry — app/agents/registry.py."""

from app.agents.registry import DomainConfig, build_domain_registry


def test_registry_has_all_five_domains() -> None:
    """Registry must contain all 5 domains."""
    registry = build_domain_registry()
    expected = {"tracking", "finance", "memory", "wellbeing", "general"}
    assert set(registry.keys()) == expected


def test_registry_returns_domain_config_instances() -> None:
    """Each registry value must be a DomainConfig."""
    registry = build_domain_registry()
    for name, dc in registry.items():
        assert isinstance(dc, DomainConfig), f"{name} is not a DomainConfig"


def test_tracking_tool_count() -> None:
    """Tracking: 6 domain tools + 2 shared memory READ = 8 total, 4 WRITE."""
    registry = build_domain_registry()
    dc = registry["tracking"]
    assert len(dc.tools) == 8
    assert len(dc.write_tools) == 4


def test_finance_tool_count() -> None:
    """Finance: 11 domain tools + 2 shared memory READ = 13 total, 2 WRITE."""
    registry = build_domain_registry()
    dc = registry["finance"]
    assert len(dc.tools) == 13
    assert len(dc.write_tools) == 2


def test_memory_tool_count() -> None:
    """Memory: 3 tools (search + add + analyze, already includes READ), 1 WRITE."""
    registry = build_domain_registry()
    dc = registry["memory"]
    assert len(dc.tools) == 3
    assert len(dc.write_tools) == 1


def test_wellbeing_tool_count() -> None:
    """Wellbeing: 0 domain + 2 shared memory READ = 2 total, 0 WRITE."""
    registry = build_domain_registry()
    dc = registry["wellbeing"]
    assert len(dc.tools) == 2
    assert len(dc.write_tools) == 0


def test_general_tool_count() -> None:
    """General: 0 domain + 2 shared memory READ = 2 total, 0 WRITE."""
    registry = build_domain_registry()
    dc = registry["general"]
    assert len(dc.tools) == 2
    assert len(dc.write_tools) == 0


def test_all_domains_have_memory_read_tools() -> None:
    """Every domain must include search_knowledge and analyze_context."""
    registry = build_domain_registry()
    for name, dc in registry.items():
        tool_names = {t.name for t in dc.tools}
        assert "search_knowledge" in tool_names, f"{name} missing search_knowledge"
        assert "analyze_context" in tool_names, f"{name} missing analyze_context"


def test_wellbeing_has_no_write_tools() -> None:
    """Wellbeing is read-only (counselor mode, no data writes)."""
    registry = build_domain_registry()
    assert registry["wellbeing"].write_tools == set()


def test_general_has_no_write_tools() -> None:
    """General agent is read-only (conversational, no data writes)."""
    registry = build_domain_registry()
    assert registry["general"].write_tools == set()


def test_all_domains_have_prompt_extension() -> None:
    """Every domain must have a non-empty prompt extension."""
    registry = build_domain_registry()
    for name, dc in registry.items():
        assert dc.prompt_extension, f"{name} has empty prompt_extension"


def test_tracking_write_tools_are_correct() -> None:
    """Tracking WRITE tools must be the expected set."""
    registry = build_domain_registry()
    expected = {"record_metric", "update_metric", "delete_metric", "record_habit"}
    assert registry["tracking"].write_tools == expected


def test_finance_write_tools_are_correct() -> None:
    """Finance WRITE tools must be the expected set."""
    registry = build_domain_registry()
    expected = {"mark_bill_paid", "create_expense"}
    assert registry["finance"].write_tools == expected


def test_memory_write_tools_are_correct() -> None:
    """Memory WRITE tools must be the expected set."""
    registry = build_domain_registry()
    expected = {"add_knowledge"}
    assert registry["memory"].write_tools == expected


def test_no_duplicate_tools_within_domain() -> None:
    """No domain should have duplicate tool names."""
    registry = build_domain_registry()
    for name, dc in registry.items():
        tool_names = [t.name for t in dc.tools]
        assert len(tool_names) == len(set(tool_names)), f"{name} has duplicate tools"
