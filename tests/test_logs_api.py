"""Fleet /api/logs HTTP surface."""

from base64 import b64encode

import pytest
from httpx import ASGITransport, AsyncClient

from alexa_mcp.activity_log import clear_logs, log_activity
from alexa_mcp.server import web_app


def _auth_header() -> str:
    return b64encode(b"sandra:vienna2026").decode("ascii")


@pytest.fixture(autouse=True)
def _clean_buffer() -> None:
    clear_logs()
    log_activity("tool_call", "speak_command (ok)", level="INFO", meta={"tool": "speak_command"})
    log_activity("interaction", "Alexa, test → ok", level="INFO", meta={"success": True})


@pytest.mark.asyncio
async def test_logs_query_and_filters() -> None:
    transport = ASGITransport(app=web_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        headers = {"Authorization": f"Basic {_auth_header()}"}
        logs = await ac.get("/api/logs?limit=10&kind=tool_call", headers=headers)
        assert logs.status_code == 200
        data = logs.json()
        assert "entries" in data
        assert data["total"] >= 1
        assert all(e["kind"] == "tool_call" for e in data["entries"])

        stats = await ac.get("/api/logs/stats", headers=headers)
        assert stats.status_code == 200
        assert stats.json()["total"] >= 2


@pytest.mark.asyncio
async def test_logs_export_and_clear() -> None:
    transport = ASGITransport(app=web_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        headers = {"Authorization": f"Basic {_auth_header()}"}
        export = await ac.get("/api/logs/export?format=json&kind=tool_call", headers=headers)
        assert export.status_code == 200
        assert "application/json" in export.headers.get("content-type", "")

        cleared = await ac.delete("/api/logs", headers=headers)
        assert cleared.status_code == 200
        assert cleared.json()["success"] is True
        assert (await ac.get("/api/logs/stats", headers=headers)).json()["total"] == 1


@pytest.mark.asyncio
async def test_activity_legacy_feed() -> None:
    transport = ASGITransport(app=web_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/api/activity?limit=5", headers={"Authorization": f"Basic {_auth_header()}"})
        assert resp.status_code == 200
        entries = resp.json()["entries"]
        assert all(e["kind"] == "interaction" for e in entries)
