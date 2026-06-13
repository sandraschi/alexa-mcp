import pytest
from httpx import ASGITransport, AsyncClient

from alexa_mcp.server import web_app


@pytest.mark.asyncio
async def test_api_status() -> None:
    """Verify the industrial status endpoint."""
    transport = ASGITransport(app=web_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        from base64 import b64encode

        auth_header = b64encode(b"sandra:vienna2026").decode("ascii")

        response = await ac.get("/api/status", headers={"Authorization": f"Basic {auth_header}"})

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "SOTA v14.1" in data["standard"]


@pytest.mark.asyncio
async def test_api_logs() -> None:
    """Verify interaction logs retrieval."""
    from base64 import b64encode

    auth_header = b64encode(b"sandra:vienna2026").decode("ascii")

    transport = ASGITransport(app=web_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/logs", headers={"Authorization": f"Basic {auth_header}"})

    assert response.status_code == 200
    data = response.json()
    assert "entries" in data
    assert "total" in data
