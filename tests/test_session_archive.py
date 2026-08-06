"""Tests for local session archive and depot/reaper export helpers."""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

import numpy as np
import pytest

from alexa_mcp import session_archive as sa


@pytest.fixture()
def sessions_home(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    monkeypatch.setenv("ALEXA_MCP_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("ALEXA_SESSION_ARCHIVE", "1")
    return tmp_path


def test_create_and_list_session(sessions_home: Path) -> None:
    d = sa.create_session_dir("test_sess_1")
    assert d.is_dir()
    audio = np.zeros(1600, dtype=np.float32)
    sa.save_listen_wav(d, audio, sample_rate=16000)
    (d / "ask.mp3").write_bytes(b"fake-mp3")
    sa.write_turn_json(
        d,
        {
            "id": "test_sess_1",
            "command": "Alexa, what time is it?",
            "response": "It is noon",
            "success": True,
            "ts": "2026-07-26T12:00:00Z",
        },
    )
    listed = sa.list_sessions(limit=10)
    assert len(listed) == 1
    assert listed[0]["session_id"] == "test_sess_1"
    assert listed[0]["has_listen"] is True
    assert listed[0]["has_ask"] is True

    got = sa.get_session("test_sess_1")
    assert got is not None
    assert got["turn"]["command"].startswith("Alexa")
    assert got["files"]["listen_wav"] is not None


@pytest.mark.asyncio
async def test_export_to_depot(sessions_home: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    d = sa.create_session_dir("export_me")
    (d / "listen.wav").write_bytes(b"RIFF" + b"\x00" * 40)
    (d / "turn.json").write_text(json.dumps({"id": "export_me"}), encoding="utf-8")

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "success": True,
        "file_id": "abc",
        "tier": "fast",
        "size_bytes": 44,
    }

    mock_client = AsyncMock()
    mock_client.post = AsyncMock(return_value=mock_resp)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    monkeypatch.setattr(sa.httpx, "AsyncClient", MagicMock(return_value=mock_client))

    result = await sa.export_to_depot("export_me", base_url="http://depot.test")
    assert result["success"] is True
    assert result["uploaded"]
    assert mock_client.post.await_count >= 1


@pytest.mark.asyncio
async def test_send_to_reaper(sessions_home: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    d = sa.create_session_dir("reaper_me")
    (d / "listen.wav").write_bytes(b"RIFF" + b"\x00" * 40)
    (d / "turn.json").write_text("{}", encoding="utf-8")

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"status": "success", "result": {"inserted_count": 1}}

    mock_client = AsyncMock()
    mock_client.post = AsyncMock(return_value=mock_resp)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    monkeypatch.setattr(sa.httpx, "AsyncClient", MagicMock(return_value=mock_client))

    result = await sa.send_to_reaper("reaper_me", base_url="http://reaper.test")
    assert result["success"] is True
    assert result["media"]
    call_args = mock_client.post.await_args
    assert call_args.args[0].endswith("/api/v1/tools/call")
    assert call_args.kwargs["json"]["name"] == "reaper_reascript"


@pytest.mark.asyncio
async def test_interact_writes_session(
    sessions_home: Path,
    mock_tts: AsyncMock,
    mock_stt: MagicMock,
    mock_audio: dict,
) -> None:
    from alexa_mcp.server import app

    result = await app.call_tool("interact", {"command": "what time is it", "wait_for_response": True})
    text = result.content[0].text
    assert "Session" in text
    listed = sa.list_sessions()
    assert listed
    sess = sa.get_session(listed[0]["session_id"])
    assert sess is not None
    assert sess["turn"]["command"].startswith("Alexa")
    assert (sessions_home / "sessions" / listed[0]["session_id"] / "listen.wav").is_file()
    assert (sessions_home / "sessions" / listed[0]["session_id"] / "turn.json").is_file()


@pytest.mark.asyncio
async def test_session_archive_tool_list(sessions_home: Path) -> None:
    from alexa_mcp.server import app

    d = sa.create_session_dir("tool_list")
    sa.write_turn_json(d, {"id": "tool_list", "command": "hi", "success": True})
    result = await app.call_tool("session_archive", {"action": "list", "limit": 10})
    payload = json.loads(result.content[0].text) if isinstance(result.content[0].text, str) else result.data
    # FastMCP may return structured content
    if isinstance(payload, str):
        payload = json.loads(payload)
    # ToolResult structured
    raw = getattr(result, "data", None) or payload
    if isinstance(raw, dict):
        assert raw.get("success") is True
        assert any(s.get("session_id") == "tool_list" for s in raw.get("sessions", []))
    else:
        text = result.content[0].text
        assert "tool_list" in text
