"""Voice command scheduler — cron-like Alexa automation with SQLite persistence."""

import asyncio
import logging
import os
import sqlite3
from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

logger = logging.getLogger("alexa-mcp.scheduler")

_DB_PATH: Path | None = None
_conn: sqlite3.Connection | None = None
_running = False


def _get_db_path() -> Path:
    global _DB_PATH
    if _DB_PATH is None:
        base = Path(os.getenv("ALEXA_MCP_DATA_DIR", str(Path.home() / ".alexa-mcp")))
        base.mkdir(parents=True, exist_ok=True)
        _DB_PATH = base / "scheduler.db"
    return _DB_PATH


def _get_conn() -> sqlite3.Connection:
    global _conn
    if _conn is None:
        _conn = sqlite3.connect(str(_get_db_path()), check_same_thread=False)
        _conn.row_factory = sqlite3.Row
        _conn.execute("PRAGMA journal_mode=WAL")
        _init_db()
    return _conn


def _init_db() -> None:
    conn = _get_conn()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS scheduled_commands (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            command TEXT NOT NULL,
            label TEXT NOT NULL DEFAULT '',
            cron_expr TEXT NOT NULL,
            enabled INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            last_run_at TEXT,
            last_status TEXT,
            run_count INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS command_presets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            run_count INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS preset_steps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            preset_id INTEGER NOT NULL REFERENCES command_presets(id) ON DELETE CASCADE,
            step_order INTEGER NOT NULL,
            command TEXT NOT NULL,
            delay_seconds REAL NOT NULL DEFAULT 2.0
        );
        CREATE TABLE IF NOT EXISTS scheduler_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            command_id INTEGER REFERENCES scheduled_commands(id),
            preset_id INTEGER REFERENCES command_presets(id),
            executed_at TEXT NOT NULL DEFAULT (datetime('now')),
            status TEXT NOT NULL,
            detail TEXT
        );
    """)
    conn.commit()


# --- Scheduled Commands CRUD ---


def list_scheduled_commands() -> list[dict[str, Any]]:
    """List all scheduled commands, newest first."""
    conn = _get_conn()
    rows = conn.execute("SELECT * FROM scheduled_commands ORDER BY created_at DESC").fetchall()
    return [dict(r) for r in rows]


def create_scheduled_command(command: str, cron_expr: str, label: str = "") -> dict[str, Any]:
    """Create a new scheduled command entry."""
    conn = _get_conn()
    cur = conn.execute(
        "INSERT INTO scheduled_commands (command, cron_expr, label) VALUES (?, ?, ?)",
        (command, cron_expr, label),
    )
    conn.commit()
    return {"id": cur.lastrowid, "command": command, "cron_expr": cron_expr, "label": label}


_ALLOWED_FIELDS = frozenset({"command", "cron_expr", "label", "enabled"})


def update_scheduled_command(cmd_id: int, **kwargs: str) -> dict[str, Any] | None:
    """Update a scheduled command's fields. Only known keys are accepted."""
    conn = _get_conn()
    updates = {k: v for k, v in kwargs.items() if k in _ALLOWED_FIELDS}
    if not updates:
        return None
    updates["updated_at"] = datetime.now(UTC).isoformat()
    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = [*list(updates.values()), cmd_id]
    conn.execute(f"UPDATE scheduled_commands SET {set_clause} WHERE id = ?", values)  # noqa: S608 — keys from frozenset whitelist
    conn.commit()
    row = conn.execute("SELECT * FROM scheduled_commands WHERE id = ?", (cmd_id,)).fetchone()
    return dict(row) if row else None


def delete_scheduled_command(cmd_id: int) -> bool:
    """Remove a scheduled command by ID."""
    conn = _get_conn()
    cur = conn.execute("DELETE FROM scheduled_commands WHERE id = ?", (cmd_id,))
    conn.commit()
    return cur.rowcount > 0


# --- Presets CRUD ---


def list_presets() -> list[dict[str, Any]]:
    """List all command presets with their steps, newest first."""
    conn = _get_conn()
    rows = conn.execute("SELECT * FROM command_presets ORDER BY created_at DESC").fetchall()
    result = []
    for r in rows:
        d = dict(r)
        steps = conn.execute(
            "SELECT * FROM preset_steps WHERE preset_id = ? ORDER BY step_order", (d["id"],)
        ).fetchall()
        d["steps"] = [dict(s) for s in steps]
        result.append(d)
    return result


def get_preset(preset_id: int) -> dict[str, Any] | None:
    """Get a single preset with its steps."""
    conn = _get_conn()
    row = conn.execute("SELECT * FROM command_presets WHERE id = ?", (preset_id,)).fetchone()
    if not row:
        return None
    d = dict(row)
    steps = conn.execute("SELECT * FROM preset_steps WHERE preset_id = ? ORDER BY step_order", (d["id"],)).fetchall()
    d["steps"] = [dict(s) for s in steps]
    return d


def create_preset(name: str, description: str = "", steps: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    """Create a new command preset with optional steps."""
    conn = _get_conn()
    cur = conn.execute("INSERT INTO command_presets (name, description) VALUES (?, ?)", (name, description))
    preset_id = cur.lastrowid
    if steps:
        for i, step in enumerate(steps):
            conn.execute(
                "INSERT INTO preset_steps (preset_id, step_order, command, delay_seconds) VALUES (?, ?, ?, ?)",
                (preset_id, i, step.get("command", ""), step.get("delay_seconds", 2.0)),
            )
    conn.commit()
    return get_preset(preset_id) or {"id": preset_id}


def update_preset(
    preset_id: int,
    name: str | None = None,
    description: str | None = None,
    steps: list[dict[str, Any]] | None = None,
) -> dict[str, Any] | None:
    """Update a preset's metadata and/or steps."""
    conn = _get_conn()
    if name is not None or description is not None:
        updates: dict[str, object] = {}
        if name is not None:
            updates["name"] = name
        if description is not None:
            updates["description"] = description
        updates["updated_at"] = datetime.now(UTC).isoformat()
        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = [*list(updates.values()), preset_id]
        conn.execute(f"UPDATE command_presets SET {set_clause} WHERE id = ?", values)  # noqa: S608 — keys from frozenset whitelist
    if steps is not None:
        conn.execute("DELETE FROM preset_steps WHERE preset_id = ?", (preset_id,))
        for i, step in enumerate(steps):
            conn.execute(
                "INSERT INTO preset_steps (preset_id, step_order, command, delay_seconds) VALUES (?, ?, ?, ?)",
                (preset_id, i, step.get("command", ""), step.get("delay_seconds", 2.0)),
            )
    conn.commit()
    return get_preset(preset_id)


def delete_preset(preset_id: int) -> bool:
    """Remove a preset and its steps."""
    conn = _get_conn()
    cur = conn.execute("DELETE FROM command_presets WHERE id = ?", (preset_id,))
    conn.commit()
    return cur.rowcount > 0


def run_preset_steps(steps: list[dict[str, Any]], speak_fn: Callable[[str], str]) -> list[dict[str, Any]]:
    """Execute a sequence of preset steps with delays."""
    results = []
    for step in steps:
        command = step.get("command", "")
        delay = step.get("delay_seconds", 2.0)
        logger.info("Preset step: %s (delay %.1fs)", command, delay)
        try:
            result = speak_fn(command)
            results.append({"command": command, "status": "ok", "result": result})
        except Exception as e:
            logger.error("Preset step failed: %s", e)
            results.append({"command": command, "status": "error", "error": str(e)})
        if delay > 0:
            asyncio.sleep(delay)
    return results


# --- Scheduler Background Task ---


def _cron_matches(cron_expr: str, now: datetime) -> bool:
    """Match a cron minute-hour expression against the current time."""
    parts = cron_expr.strip().split()
    if len(parts) < 2:
        return False
    minute_pattern, hour_pattern = parts[0], parts[1]
    if minute_pattern != "*" and str(now.minute) != minute_pattern:
        return False
    if hour_pattern != "*" and str(now.hour) != hour_pattern:
        return False
    return True


async def scheduler_loop(speak_fn: Callable[[str], str]) -> None:
    """Background loop: check every 30 seconds for due commands."""
    global _running
    _running = True
    logger.info("Scheduler loop started")
    while _running:
        try:
            now = datetime.now(UTC)
            conn = _get_conn()
            commands = conn.execute("SELECT * FROM scheduled_commands WHERE enabled = 1").fetchall()
            for cmd in commands:
                cmd = dict(cmd)
                if _cron_matches(cmd["cron_expr"], now):
                    last_run = cmd.get("last_run_at")
                    if last_run:
                        last_dt = datetime.fromisoformat(last_run)
                        if (now - last_dt).total_seconds() < 60:
                            continue
                    logger.info("Executing scheduled command: %s", cmd["command"])
                    try:
                        _ = speak_fn(cmd["command"])
                        status = "ok"
                    except Exception as e:
                        logger.error("Scheduled command failed: %s", e)
                        status = "error"
                    now_str = now.isoformat()
                    conn.execute(
                        "UPDATE scheduled_commands SET last_run_at = ?,"
                        " last_status = ?, run_count = run_count + 1 WHERE id = ?",
                        (now_str, status, cmd["id"]),
                    )
                    conn.execute(
                        "INSERT INTO scheduler_log (command_id, status, detail) VALUES (?, ?, ?)",
                        (cmd["id"], status, cmd["command"][:500]),
                    )
                    conn.commit()
        except Exception as e:
            logger.error("Scheduler tick error: %s", e)
        await asyncio.sleep(30)


def stop_scheduler() -> None:
    """Stop the background scheduler loop."""
    global _running
    _running = False


# --- Analytics ---


def get_analytics(days: int = 7) -> dict[str, Any]:
    """Return aggregated analytics from activity_log and scheduler DB."""
    conn = _get_conn()
    data: dict[str, Any] = {}

    try:
        from .activity_log import query_logs as ql

        logs = ql(limit=10000, kind="interaction", sort="desc")
        entries = logs.get("entries", [])
        total = len(entries)
        success = sum(1 for e in entries if e.get("meta", {}).get("success", False))
        data["total_interactions"] = total
        data["success_rate"] = round(success / total * 100, 1) if total > 0 else 0
        data["failed_interactions"] = total - success
    except Exception as e:
        logger.warning("Analytics query failed: %s", e)
        data["total_interactions"] = 0

    sched_count = conn.execute("SELECT COUNT(*) FROM scheduled_commands").fetchone()[0]
    enabled_count = conn.execute("SELECT COUNT(*) FROM scheduled_commands WHERE enabled = 1").fetchone()[0]
    data["scheduled_commands"] = sched_count
    data["active_schedules"] = enabled_count

    preset_count = conn.execute("SELECT COUNT(*) FROM command_presets").fetchone()[0]
    data["command_presets"] = preset_count

    log_count = conn.execute("SELECT COUNT(*) FROM scheduler_log").fetchone()[0]
    ok_count = conn.execute("SELECT COUNT(*) FROM scheduler_log WHERE status = 'ok'").fetchone()[0]
    data["scheduler_runs"] = log_count
    data["scheduler_success_rate"] = round(ok_count / log_count * 100, 1) if log_count > 0 else 0

    return data
