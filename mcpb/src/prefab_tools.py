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
        from alexa_mcp.activity_log import max_entries, query_logs
        import alexa_mcp.server as srv

        payload = query_logs(limit=20, kind="interaction", sort="desc")
        logs: list[dict[str, Any]] = payload.get("entries") or []
        count = int(getattr(srv, "INTERACTION_COUNT", 0))
        max_sz = max_entries()

        with Card(css_class="max-w-lg") as view:
            with CardHeader():
                CardTitle("Alexa interaction status")
            with CardContent():
                Text(f"Total logged: {count} (buffer max {max_sz})")
                if not logs:
                    Text("No interactions in buffer yet.")
                else:
                    for log in logs:
                        meta = log.get("meta") or {}
                        ok = bool(meta.get("success", True))
                        status = "OK" if ok else "fail"
                        cmd = str(meta.get("command", log.get("detail", "")))[:120]
                        Text(f"[{meta.get('interaction_id', log.get('id'))}] {status}: {cmd}", css_class="text-sm")

        lines = [
            f"Alexa interaction buffer: {len(logs)} entries, {count} total count",
        ]
        for log in logs:
            meta = log.get("meta") or {}
            lines.append(f"- [{meta.get('interaction_id', log.get('id'))}] {meta.get('command', log.get('detail'))}")
        summary = "\n".join(lines)

        return ToolResult(
            content=summary,
            structured_content=PrefabApp(view=view, title="Alexa interaction status"),
        )
