import asyncio
import os
import sys

# Ensure the src directory is in the path
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "src"))

from alexa_mcp.server import app


async def run_live_test() -> None:
    """Run a direct acoustic test via the interact tool."""
    # We call the tool directly using the app instance
    await app.call_tool("interact", {"command": "weather", "wait_for_response": True})


if __name__ == "__main__":
    asyncio.run(run_live_test())
