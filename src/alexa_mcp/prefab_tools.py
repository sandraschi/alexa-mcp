"""MCP Apps (Prefab): list/status surfaces for Alexa interaction log — fleet standard."""

from __future__ import annotations

from typing import Any

from fastmcp import Context, FastMCP
from fastmcp.tools import ToolResult
from prefab_ui.app import PrefabApp
from prefab_ui.components import Card, CardContent, CardHeader, CardTitle, Text


def register_prefab_tools(mcp: FastMCP) -> None:
    """Register `@mcp.tool(app=True)` handlers for Prefab-capable hosts."""

    @mcp.tool(app=True)
    def show_alexa_interaction_status_prefab_card(ctx: Context | None = None) -> ToolResult:
        """Show a Prefab card with recent Alexa interaction status (buffered log).

        Plain-text summary is always returned for hosts that do not render Apps.
        """
        import alexa_mcp.server as srv

        logs: list[dict[str, Any]] = getattr(srv, "INTERACTION_LOGS", [])
        count = int(getattr(srv, "INTERACTION_COUNT", 0))
        max_sz = int(getattr(srv, "MAX_LOG_SIZE", 50))

        with Card(css_class="max-w-lg") as view:
            with CardHeader():
                CardTitle("Alexa interaction status")
            with CardContent():
                Text(f"Total logged: {count} (buffer max {max_sz})")
                if not logs:
                    Text("No interactions in buffer yet.")
                else:
                    for log in logs[-20:]:
                        ok = bool(log.get("success"))
                        status = "OK" if ok else "fail"
                        cmd = str(log.get("command", ""))[:120]
                        Text(f"[{log.get('id')}] {status}: {cmd}", css_class="text-sm")

        lines = [
            f"Alexa interaction buffer: {len(logs)} entries, {count} total count",
        ]
        for log in logs[-20:]:
            lines.append(f"- [{log.get('id')}] {log.get('command')}")
        summary = "\n".join(lines)

        return ToolResult(
            content=summary,
            structured_content=PrefabApp(view=view, title="Alexa interaction status"),
        )
