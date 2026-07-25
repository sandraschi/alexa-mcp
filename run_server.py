"""PyInstaller entry point -- starts the HTTP/uvicorn server."""
import os
import sys
sys.path.insert(0, "src")

import uvicorn
from alexa_mcp.server import web_app

port = int(os.getenv("MCP_PORT", "10801"))
host = os.getenv("MCP_HOST", "127.0.0.1")
uvicorn.run(web_app, host=host, port=port, log_level="info")
