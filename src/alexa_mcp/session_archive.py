"""Local Alexa interaction session archive under ``~/.alexa-mcp/sessions/``.

Each turn stores ``ask.mp3`` (optional), ``listen.wav``, and ``turn.json``.
Keepers can be exported to depot-mcp; optional send to reaper-mcp for DAW edit.
"""

from __future__ import annotations

import json
import logging
import os
import shutil
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import httpx
import numpy as np

from .audio import save_wav

logger = logging.getLogger("alexa-mcp.session_archive")

_DEFAULT_DEPOT_URL = "http://127.0.0.1:10727"
_DEFAULT_REAPER_URL = "http://127.0.0.1:10797"


def sessions_root() -> Path:
    """Return (and create) the sessions directory under the alexa data dir."""
    base = Path(os.getenv("ALEXA_MCP_DATA_DIR", str(Path.home() / ".alexa-mcp")))
    root = base / "sessions"
    root.mkdir(parents=True, exist_ok=True)
    return root


def archive_enabled() -> bool:
    """Whether interact turns should be persisted (default on)."""
    return os.getenv("ALEXA_SESSION_ARCHIVE", "1").strip().lower() not in ("0", "false", "no", "off")


def new_session_id() -> str:
    ts = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    return f"{ts}_{uuid.uuid4().hex[:8]}"


def create_session_dir(session_id: str | None = None) -> Path:
    sid = session_id or new_session_id()
    d = sessions_root() / sid
    d.mkdir(parents=True, exist_ok=True)
    return d


def write_turn_json(session_dir: Path, payload: dict[str, Any]) -> Path:
    path = session_dir / "turn.json"
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    return path


def save_listen_wav(session_dir: Path, audio: np.ndarray, sample_rate: int = 16000) -> Path:
    path = session_dir / "listen.wav"
    save_wav(str(path), audio, sample_rate)
    return path


def _read_turn(session_dir: Path) -> dict[str, Any] | None:
    turn_path = session_dir / "turn.json"
    if not turn_path.is_file():
        return None
    try:
        return json.loads(turn_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as e:
        logger.warning("Bad turn.json in %s: %s", session_dir, e)
        return None


def list_sessions(limit: int = 50) -> list[dict[str, Any]]:
    """Newest-first session summaries."""
    root = sessions_root()
    dirs = sorted(
        [p for p in root.iterdir() if p.is_dir()],
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    out: list[dict[str, Any]] = []
    for d in dirs[: max(1, min(limit, 500))]:
        turn = _read_turn(d) or {}
        out.append(
            {
                "session_id": d.name,
                "path": str(d.resolve()),
                "command": turn.get("command"),
                "response": turn.get("response"),
                "success": turn.get("success"),
                "ts": turn.get("ts"),
                "has_ask": (d / "ask.mp3").is_file(),
                "has_listen": (d / "listen.wav").is_file(),
            }
        )
    return out


def get_session(session_id: str) -> dict[str, Any] | None:
    d = sessions_root() / session_id
    if not d.is_dir():
        return None
    turn = _read_turn(d) or {}
    files = {
        "ask_mp3": str((d / "ask.mp3").resolve()) if (d / "ask.mp3").is_file() else None,
        "listen_wav": str((d / "listen.wav").resolve()) if (d / "listen.wav").is_file() else None,
        "turn_json": str((d / "turn.json").resolve()) if (d / "turn.json").is_file() else None,
    }
    return {
        "session_id": session_id,
        "path": str(d.resolve()),
        "turn": turn,
        "files": files,
    }


def delete_session(session_id: str) -> bool:
    d = sessions_root() / session_id
    if not d.is_dir():
        return False
    shutil.rmtree(d)
    return True


def _depot_base_url() -> str:
    return os.getenv("ALEXA_DEPOT_URL", _DEFAULT_DEPOT_URL).rstrip("/")


def _reaper_base_url() -> str:
    return os.getenv("ALEXA_REAPER_URL", _DEFAULT_REAPER_URL).rstrip("/")


async def export_to_depot(
    session_id: str,
    *,
    base_url: str | None = None,
    tier: str = "fast",
) -> dict[str, Any]:
    """Upload session keepers to depot-mcp ``POST /api/v1/depot/upload``."""
    session = get_session(session_id)
    if not session:
        return {"success": False, "error": f"session not found: {session_id}"}

    url = (base_url or _depot_base_url()).rstrip("/") + "/api/v1/depot/upload"
    tags = f"alexa,session:{session_id}"
    uploaded: list[dict[str, Any]] = []
    errors: list[str] = []

    candidates: list[tuple[str, Path]] = []
    files = session["files"]
    for key, fname in (("listen_wav", "listen.wav"), ("ask_mp3", "ask.mp3"), ("turn_json", "turn.json")):
        p = files.get(key)
        if p:
            candidates.append((f"{session_id}_{fname}", Path(p)))

    if not candidates:
        return {"success": False, "error": "no files to export"}

    async with httpx.AsyncClient(timeout=60.0) as client:
        for upload_name, path in candidates:
            try:
                content = path.read_bytes()
                resp = await client.post(
                    url,
                    files={"file": (upload_name, content)},
                    data={"tier": tier, "tags": tags},
                )
                if resp.status_code >= 400:
                    errors.append(f"{upload_name}: HTTP {resp.status_code} {resp.text[:200]}")
                    continue
                body = resp.json()
                uploaded.append(
                    {
                        "filename": upload_name,
                        "file_id": body.get("file_id"),
                        "tier": body.get("tier"),
                        "size_bytes": body.get("size_bytes"),
                    }
                )
            except Exception as e:
                errors.append(f"{upload_name}: {e}")

    ok = bool(uploaded) and not errors
    return {
        "success": ok or (bool(uploaded) and len(errors) < len(candidates)),
        "session_id": session_id,
        "depot_url": url,
        "uploaded": uploaded,
        "errors": errors or None,
    }


def _build_insert_media_script(media: list[dict[str, str]]) -> str:
    """ReaScript that inserts each file on its own named track."""
    media_json = json.dumps(media)
    return f"""
import json
media = json.loads({media_json!r})
inserted = []
for item in media:
    file_path = item["path"]
    track_name = item["track_name"]
    track_index = int(RPR_CountTracks(0))
    RPR_InsertTrackAtIndex(track_index, True)
    track = RPR_GetTrack(0, track_index)
    RPR_GetSetMediaTrackInfo_String(track, "P_NAME", track_name, True)
    RPR_SetOnlyTrackSelected(track)
    RPR_InsertMedia(file_path, 0)
    inserted.append({{"track_index": track_index + 1, "track_name": track_name, "path": file_path}})
_result = {{"operation": "alexa_session_import", "inserted": inserted, "inserted_count": len(inserted)}}
"""


async def send_to_reaper(
    session_id: str,
    *,
    base_url: str | None = None,
) -> dict[str, Any]:
    """Insert session audio into Reaper via reaper-mcp ``POST /api/v1/tools/call``."""
    session = get_session(session_id)
    if not session:
        return {"success": False, "error": f"session not found: {session_id}"}

    media: list[dict[str, str]] = []
    files = session["files"]
    if files.get("listen_wav"):
        media.append({"path": files["listen_wav"], "track_name": f"alexa-listen-{session_id[:8]}"})
    if files.get("ask_mp3"):
        media.append({"path": files["ask_mp3"], "track_name": f"alexa-ask-{session_id[:8]}"})
    if not media:
        return {"success": False, "error": "no audio files in session (need listen.wav or ask.mp3)"}

    url = (base_url or _reaper_base_url()).rstrip("/") + "/api/v1/tools/call"
    code = _build_insert_media_script(media)
    payload = {
        "name": "reaper_reascript",
        "arguments": {"operation": "run", "code": code},
    }
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code >= 400:
                return {
                    "success": False,
                    "error": f"reaper HTTP {resp.status_code}: {resp.text[:300]}",
                    "reaper_url": url,
                }
            body = resp.json()
            return {
                "success": body.get("status") == "success",
                "session_id": session_id,
                "reaper_url": url,
                "media": media,
                "result": body.get("result"),
                "message": body.get("message"),
            }
    except Exception as e:
        return {"success": False, "error": str(e), "reaper_url": url}
