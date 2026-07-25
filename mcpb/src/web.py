"""Web interface and static file serving for Alexa MCP."""

import inspect
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, FastAPI, Request
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastmcp import FastMCP
from pydantic import BaseModel

from .activity_log import log_activity
from .ai import router as ai_router
from .auth import authenticate
from .playback_api import router as playback_router


def _serialize_tool_result(result: object) -> object:
    """Normalize FastMCP ``call_tool`` return values for JSON HTTP responses."""
    if result is None:
        return None
    content = getattr(result, "content", None)
    if content is not None:
        texts: list[str] = []
        for part in content:
            text = getattr(part, "text", None)
            if text is not None:
                texts.append(text)
        if texts:
            return "\n".join(texts)
    if isinstance(result, str | int | float | bool):
        return result
    if isinstance(result, dict | list):
        return result
    return str(result)


class ToolExecutionRequest(BaseModel):
    """Request model for generic MCP tool execution via the web bridge."""

    arguments: dict[str, Any] = {}


class ChatBridgeRequest(BaseModel):
    """Request model for the specialized Alexa Chat Bridge."""

    command: str
    wait_for_response: bool = True
    timeout: int = 15


class LaunchRequest(BaseModel):
    """Request model for launching fleet applications from the industrial dashboard."""

    repo_path: str
    app_id: str
    port: int | None = None  # optional; echoed from fleet UI for validation/logging


router = APIRouter(prefix="/api", dependencies=[Depends(authenticate)])

# Directory configuration
current_dir = Path(__file__).parent
project_root = current_dir.parent.parent
dist_dir = project_root / "web_sota" / "dist"


def register_tool_routes(mcp_app: FastMCP) -> None:
    """Register the standard MCP tool bridge endpoints."""

    @router.get("/tools")
    async def list_tools() -> dict[str, Any]:
        tools = mcp_app.list_tools()
        if inspect.isawaitable(tools):
            tools = await tools
        return {"tools": [{"name": t.name, "description": t.description} for t in tools]}

    @router.post("/tools/{tool_name}")
    async def execute_tool(tool_name: str, request: ToolExecutionRequest) -> dict[str, Any]:
        try:
            result = await mcp_app.call_tool(tool_name, request.arguments)
            log_activity(
                kind="tool_call",
                detail=f"{tool_name} (ok)",
                level="INFO",
                meta={"tool": tool_name, "arguments": request.arguments},
            )
            return {"result": _serialize_tool_result(result)}
        except Exception as e:
            log_activity(
                kind="tool_call",
                detail=f"{tool_name} (error): {e!s}",
                level="ERROR",
                meta={"tool": tool_name, "arguments": request.arguments},
            )
            return {"error": str(e)}

    @router.post("/chat")
    async def chat_bridge(request: ChatBridgeRequest) -> dict[str, Any]:
        """Direct mapping for the frontend chat interface to the 'interact' tool."""
        try:
            result = await mcp_app.call_tool(
                "interact",
                {
                    "command": request.command,
                    "wait_for_response": request.wait_for_response,
                    "timeout": request.timeout,
                },
            )
            log_activity(
                kind="bridge",
                detail=f"chat: {request.command[:120]}",
                level="INFO",
                meta={
                    "command": request.command,
                    "wait_for_response": request.wait_for_response,
                    "timeout": request.timeout,
                },
            )
            return {"response": _serialize_tool_result(result)}
        except Exception as e:
            log_activity(
                kind="bridge",
                detail=f"chat error: {e!s}",
                level="ERROR",
                meta={"command": request.command},
            )
            return {"response": f"Bridge Error: {e!s}"}


def setup_webapp(app: APIRouter | FastAPI, mcp_app: FastMCP | None = None) -> None:
    """Mount the static files and set up the SPA routing with a tool bridge."""
    if mcp_app:
        register_tool_routes(mcp_app)

    # Include routers
    app.include_router(router)
    app.include_router(ai_router)
    app.include_router(playback_router)

    # Serve static files if they exist
    if dist_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(dist_dir / "assets")), name="assets")

        @app.get("/{full_path:path}", response_class=HTMLResponse, response_model=None)
        async def serve_spa(request: Request, full_path: str) -> HTMLResponse | FileResponse | None:
            # Skip API and MCP protocol paths
            if full_path.startswith("api/") or full_path.startswith("mcp"):
                return None

            index_path = dist_dir / "index.html"
            if index_path.exists():
                return FileResponse(index_path)
            return HTMLResponse(
                content="<h1>Frontend not built</h1><p>Run <code>npm run build</code> in web_sota</p>",
                status_code=404,
            )
    else:

        @app.get("/", response_class=HTMLResponse)
        async def dev_hint() -> HTMLResponse:
            return HTMLResponse(
                content=(
                    "<h1>Static files missing</h1>"
                    "<p>Expected <code>web_sota/dist</code> but it does not exist.</p>"
                    "<p>If in development, use <code>npm run dev</code> on port 10800.</p>"
                )
            )
