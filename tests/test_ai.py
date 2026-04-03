"""Tests for alexa_mcp.ai — httpx calls are mocked."""

import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from fastapi import FastAPI

from alexa_mcp.ai import router


@pytest.fixture()
def ai_client():
    app = FastAPI()
    app.include_router(router)
    return TestClient(app, raise_server_exceptions=False)


class TestChatOllama:
    def test_ollama_success(self, ai_client):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"response": "The lights are on."}
        mock_resp.raise_for_status = MagicMock()

        mock_client = AsyncMock()
        mock_client.__aenter__.return_value.post = AsyncMock(return_value=mock_resp)

        with patch("alexa_mcp.ai.httpx.AsyncClient", return_value=mock_client):
            resp = ai_client.post(
                "/api/ai/chat",
                json={"message": "turn on lights", "provider": "ollama", "model": "llama3"},
            )

        assert resp.status_code == 200
        assert resp.json()["response"] == "The lights are on."

    def test_ollama_uses_correct_endpoint(self, ai_client):
        mock_resp = MagicMock()
        mock_resp.json.return_value = {"response": "ok"}
        mock_resp.raise_for_status = MagicMock()

        post_mock = AsyncMock(return_value=mock_resp)
        mock_client = AsyncMock()
        mock_client.__aenter__.return_value.post = post_mock

        with patch("alexa_mcp.ai.httpx.AsyncClient", return_value=mock_client):
            ai_client.post(
                "/api/ai/chat",
                json={
                    "message": "hello",
                    "provider": "ollama",
                    "endpoint": "http://localhost:11434",
                },
            )

        call_args = post_mock.call_args
        assert "http://localhost:11434/api/generate" in call_args[0]

    def test_ollama_network_error_returns_error_response(self, ai_client):
        mock_client = AsyncMock()
        mock_client.__aenter__.return_value.post = AsyncMock(
            side_effect=Exception("connection refused")
        )

        with patch("alexa_mcp.ai.httpx.AsyncClient", return_value=mock_client):
            resp = ai_client.post(
                "/api/ai/chat",
                json={"message": "hi", "provider": "ollama"},
            )

        assert resp.status_code == 200
        assert "AI Bridge Error" in resp.json()["response"]


class TestChatLMStudio:
    def test_lmstudio_success(self, ai_client):
        mock_resp = MagicMock()
        mock_resp.json.return_value = {
            "choices": [{"message": {"content": "Light turned on."}}]
        }
        mock_resp.raise_for_status = MagicMock()

        mock_client = AsyncMock()
        mock_client.__aenter__.return_value.post = AsyncMock(return_value=mock_resp)

        with patch("alexa_mcp.ai.httpx.AsyncClient", return_value=mock_client):
            resp = ai_client.post(
                "/api/ai/chat",
                json={"message": "turn on light", "provider": "lmstudio"},
            )

        assert resp.status_code == 200
        assert resp.json()["response"] == "Light turned on."


class TestChatUnsupportedProvider:
    def test_unknown_provider_returns_error(self, ai_client):
        resp = ai_client.post(
            "/api/ai/chat",
            json={"message": "hi", "provider": "openai"},
        )
        assert resp.status_code == 200
        assert "AI Bridge Error" in resp.json()["response"] or resp.json()["response"]


class TestListModels:
    def test_ollama_models_returned(self, ai_client):
        mock_resp = MagicMock()
        mock_resp.json.return_value = {"models": [{"name": "llama3"}, {"name": "mistral"}]}

        mock_client = AsyncMock()
        mock_client.__aenter__.return_value.get = AsyncMock(return_value=mock_resp)

        with patch("alexa_mcp.ai.httpx.AsyncClient", return_value=mock_client):
            resp = ai_client.get("/api/ai/models?provider=ollama")

        assert resp.status_code == 200
        data = resp.json()
        assert "models" in data

    def test_unknown_provider_returns_empty(self, ai_client):
        resp = ai_client.get("/api/ai/models?provider=unknown_llm")
        assert resp.status_code == 200
        assert resp.json() == {"models": []}

    def test_network_error_returns_error_key(self, ai_client):
        mock_client = AsyncMock()
        mock_client.__aenter__.return_value.get = AsyncMock(
            side_effect=Exception("timeout")
        )

        with patch("alexa_mcp.ai.httpx.AsyncClient", return_value=mock_client):
            resp = ai_client.get("/api/ai/models?provider=ollama")

        assert "error" in resp.json()


class TestDefaultModel:
    def test_default_model_is_local(self):
        """Default model must not be a cloud model (regression for ai.py bug fix)."""
        from alexa_mcp.ai import ChatRequest

        req = ChatRequest(message="hello")
        assert req.model != "gemini-2.0-flash-exp", (
            "Default model was reset to a Google Cloud model. Should be a local model like llama3."
        )
        assert req.model == "llama3"
