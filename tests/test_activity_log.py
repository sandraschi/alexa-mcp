"""Tests for fleet activity log ring buffer."""

from alexa_mcp.activity_log import clear_logs, export_logs, log_activity, log_stats, query_logs


def test_log_and_query() -> None:
    clear_logs()
    log_activity("tool_call", "interact (ok)", level="INFO", meta={"tool": "interact"})
    log_activity("interaction", "Alexa, hi → hello", level="INFO", meta={"success": True})
    result = query_logs(limit=10, kind="tool_call")
    assert result["total"] == 1
    assert result["entries"][0]["kind"] == "tool_call"


def test_level_filter() -> None:
    clear_logs()
    log_activity("server", "info line", level="INFO")
    log_activity("server", "error line", level="ERROR")
    result = query_logs(limit=50, level="ERROR")
    assert result["total"] == 1
    assert result["entries"][0]["level"] == "ERROR"


def test_export_json_csv() -> None:
    clear_logs()
    log_activity("system", "test", level="WARNING")
    _body, _mt, name_json = export_logs(format="json")
    assert name_json.endswith(".json")
    body_csv, mt_csv, name_csv = export_logs(format="csv")
    assert mt_csv == "text/csv"
    assert "timestamp" in body_csv
    assert name_csv.endswith(".csv")


def test_stats_and_clear() -> None:
    clear_logs()
    log_activity("bridge", "chat ping", level="INFO")
    stats = log_stats()
    assert stats["total"] == 1
    assert stats["rotation"] == "ring_buffer"
    clear_logs()
    assert log_stats()["total"] == 0
