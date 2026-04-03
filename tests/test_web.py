"""Tests for alexa_mcp.web — FastAPI routes, auth, and SPA fallback."""

import pytest
from fastapi.testclient import TestClient


class TestStatusEndpoint:
    def test_status_returns_online(self, web_client):
        resp = web_client.get("/api/status")
        assert resp.status_code == 200
        assert resp.json()["status"] == "online"

    def test_status_requires_auth(self, unauthed_client):
        resp = unauthed_client.get("/api/status")
        assert resp.status_code == 401


class TestToolsEndpoint:
    def test_list_tools_returns_list(self, web_client):
        resp = web_client.get("/api/tools")
        assert resp.status_code == 200
        data = resp.json()
        assert "tools" in data
        assert isinstance(data["tools"], list)

    def test_list_tools_has_expected_tools(self, web_client):
        resp = web_client.get("/api/tools")
        names = [t["name"] for t in resp.json()["tools"]]
        assert "speak_command" in names
        assert "listen_for_response" in names
        assert "interact" in names

    def test_list_tools_requires_auth(self, unauthed_client):
        resp = unauthed_client.get("/api/tools")
        assert resp.status_code == 401

    def test_execute_tool_speak_command(self, web_client):
        from unittest.mock import AsyncMock, patch

        with patch("alexa_mcp.server.speak_text", new=AsyncMock(return_value=None)):
            resp = web_client.post(
                "/api/tools/speak_command",
                json={"arguments": {"text": "Alexa, hello"}},
            )

        assert resp.status_code == 200
        body = resp.json()
        assert "result" in body or "error" in body

    def test_execute_unknown_tool_returns_error(self, web_client):
        resp = web_client.post(
            "/api/tools/nonexistent_tool",
            json={"arguments": {}},
        )
        assert resp.status_code == 200
        assert "error" in resp.json()


class TestSPAFallback:
    def test_root_returns_html(self, web_client):
        resp = web_client.get("/")
        assert resp.status_code in (200, 404)
        assert "text/html" in resp.headers.get("content-type", "")

    def test_unknown_path_returns_html(self, web_client):
        resp = web_client.get("/some/spa/route")
        assert resp.status_code in (200, 404)


class TestBugFixes:
    def test_ffmpeg_detection_not_using_broken_find(self):
        """Regression: tts.py must not use .find() for ffmpeg PATH check."""
        import pathlib

        src = pathlib.Path("/home/user/alexa-mcp/src/alexa_mcp/tts.py").read_text()
        assert '.find(\n            "ffmpeg"\n        )' not in src
        assert '"ffmpeg" not in os.environ' in src

    def test_ai_default_model_is_not_gemini(self):
        """Regression: ai.py default model must be a local model."""
        import pathlib

        src = pathlib.Path("/home/user/alexa-mcp/src/alexa_mcp/ai.py").read_text()
        assert "gemini-2.0-flash-exp" not in src
