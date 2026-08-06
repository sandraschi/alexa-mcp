"""Tests for alexa_mcp.auth."""

import base64

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from alexa_mcp.auth import authenticate


def _make_app():
    """Minimal FastAPI app that requires authentication."""
    app = FastAPI()

    @app.get("/protected", dependencies=[Depends(authenticate)])
    async def protected():
        return {"ok": True}

    return app


@pytest.fixture()
def auth_client():
    return TestClient(_make_app(), raise_server_exceptions=False)


def _basic(user: str, password: str) -> str:
    return "Basic " + base64.b64encode(f"{user}:{password}".encode()).decode()


class TestAuthenticate:
    def test_correct_credentials_allowed(self, auth_client, monkeypatch) -> None:
        monkeypatch.setenv("ALEXA_WEB_USER", "sandra")
        monkeypatch.setenv("ALEXA_WEB_PASS", "vienna2026")

        resp = auth_client.get("/protected", headers={"Authorization": _basic("sandra", "vienna2026")})
        assert resp.status_code == 200

    def test_wrong_password_rejected(self, auth_client, monkeypatch) -> None:
        monkeypatch.setenv("ALEXA_WEB_USER", "sandra")
        monkeypatch.setenv("ALEXA_WEB_PASS", "vienna2026")

        resp = auth_client.get("/protected", headers={"Authorization": _basic("sandra", "wrongpass")})
        assert resp.status_code == 401

    def test_wrong_username_rejected(self, auth_client, monkeypatch) -> None:
        monkeypatch.setenv("ALEXA_WEB_USER", "sandra")
        monkeypatch.setenv("ALEXA_WEB_PASS", "vienna2026")

        resp = auth_client.get("/protected", headers={"Authorization": _basic("attacker", "vienna2026")})
        assert resp.status_code == 401

    def test_no_credentials_rejected(self, auth_client) -> None:
        resp = auth_client.get("/protected")
        assert resp.status_code == 401

    def test_custom_env_credentials(self, auth_client, monkeypatch) -> None:
        monkeypatch.setenv("ALEXA_WEB_USER", "alice")
        monkeypatch.setenv("ALEXA_WEB_PASS", "s3cr3t!")

        resp = auth_client.get("/protected", headers={"Authorization": _basic("alice", "s3cr3t!")})
        assert resp.status_code == 200

    def test_default_credentials_still_rejected_when_custom_set(self, auth_client, monkeypatch) -> None:
        monkeypatch.setenv("ALEXA_WEB_USER", "alice")
        monkeypatch.setenv("ALEXA_WEB_PASS", "s3cr3t!")

        resp = auth_client.get("/protected", headers={"Authorization": _basic("sandra", "vienna2026")})
        assert resp.status_code == 401
