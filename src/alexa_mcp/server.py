import asyncio
import logging
import os
import platform
import sys
import time
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

import httpx
import uvicorn
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastmcp import Context, FastMCP

from .activity_log import install_log_handler, log_activity, query_logs
from .audio import record_audio
from .auth import authenticate
from .logs_api import router as logs_router
from .prefab_tools import register_prefab_tools
from .scheduler import (
    create_preset,
    create_scheduled_command,
    delete_preset,
    delete_scheduled_command,
    get_analytics,
    get_preset,
    list_presets,
    list_scheduled_commands,
    run_preset_steps,
    scheduler_loop,
    update_preset,
    update_scheduled_command,
)
from .session_archive import (
    archive_enabled,
    create_session_dir,
    delete_session,
    export_to_depot,
    get_session,
    list_sessions,
    save_listen_wav,
    send_to_reaper,
    write_turn_json,
)
from .sessions_api import router as sessions_router
from .stt import transcribe_audio
from .tts import speak_text
from .web import LaunchRequest, setup_webapp

# Configure logging (fleet ActivityLogHandler → /api/logs kind=server)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s - %(message)s",
    stream=sys.stderr,
)
install_log_handler()
logger = logging.getLogger("alexa-mcp")

# 1. Initialize FastMCP (Acoustic Protocol Layer)
app = FastMCP(
    "alexa-mcp",
)

INTERACTION_COUNT: int = 0
_START_TIME: float = time.time()


def _error_response(error: str, error_type: str = "general", **kwargs: object) -> dict[str, object]:
    """Auto-logging error response — traceback logged before returning to caller."""
    logger.exception("Tool error: %s [%s]", error, error_type)
    return {"success": False, "error": error, "error_type": error_type, **kwargs}


def _record_interaction(full_command: str, transcription: str, *, success: bool) -> None:
    global INTERACTION_COUNT
    INTERACTION_COUNT += 1
    detail = f"{full_command} → {transcription[:240] if transcription else '[no response]'}"
    log_activity(
        kind="interaction",
        detail=detail,
        level="INFO" if success else "ERROR",
        meta={
            "interaction_id": INTERACTION_COUNT,
            "command": full_command,
            "response": transcription,
            "success": success,
        },
    )


@app.resource("interaction://logs")
def get_interaction_logs() -> str:
    """Return the most recent Alexa interaction logs as a formatted list."""
    payload = query_logs(limit=50, kind="interaction", sort="desc")
    entries = payload.get("entries") or []
    if not entries:
        return "No interactions logged yet."

    lines = ["# Alexa Interaction History"]
    for log in entries:
        meta = log.get("meta") or {}
        status = "✅" if meta.get("success", True) else "❌"
        cmd = meta.get("command", log.get("detail", ""))
        resp = meta.get("response", "")
        lines.append(f"- [{meta.get('interaction_id', log.get('id'))}] {status} `{cmd}` -> {resp}")
    return "\n".join(lines)


def _alexa_report(
    command: str,
    response: str,
    success: bool = True,
    *,
    session_id: str | None = None,
) -> str:
    """Universal formatter for Alexa interactions (Mud-to-Gold standard)."""
    status_emoji = "✅" if success else "❌"
    lines = [
        f"# {status_emoji} Alexa Interaction Report",
        f"- **Command**: `{command}`",
        f"- **Response**: {f'_{response}_' if response else '*[No response detected]*'}",
    ]
    if session_id:
        lines.append(f"- **Session**: `{session_id}`")
    lines.extend(
        [
            "\n---",
            "**Next Steps**:",
            "- Use `interact` for a follow-up command",
            "- Use `session_archive` to list/export keepers to depot-mcp or Reaper",
            "- Check the 'Audio' tab in the webapp for waveforms",
        ]
    )
    return "\n".join(lines)


@app.prompt("alexa_interaction")
def alexa_interaction_prompt(command: str) -> str:
    """Template for issuing optimal Alexa commands."""
    return f"Issue the following command to Alexa via the acoustic bridge: '{command}'. Wait for her response."


_READONLY = {"readonly": True}


@app.tool(annotations=_READONLY)
async def docs_help() -> str:
    """Return technical documentation for the Alexa Acoustic Bridge.

    Covers architecture, STT/TTS engines, and interaction protocols.
    """
    lines = [
        "# Alexa MCP Technical Documentation",
        "## Architecture",
        "The server acts as an acoustic proxy. It translates text commands into voice via synthesis, "
        "and captures environmental audio for transcription.",
        "\n## Components",
        "- **SoundDevice**: Manages local audio hardware buffers.",
        "- **Edge-TTS**: Cloud-based neural synthesis for high-clarity commands.",
        "- **Faster-Whisper**: Local inference engine for low-latency response transcription.",
        "\n## Protocol",
        "1. **Wake**: All commands are prepended with 'Alexa' unless already present.",
        "2. **Speak**: Audio is played via the system's default output device.",
        "3. **Listen**: Systems enters a recording state for a specified duration.",
        "4. **Analyze**: Audio buffers are processed by the Whisper model to return a text response.",
        "\n## Amazon Alexa+ (ecosystem)",
        (
            "This bridge drives a *physical* Alexa. On Amazon's side, the product **Alexa+** is a "
            "separate generative upgrade (Prime/subscription, regional rollout)."
        ),
        (
            "As of 2026 public posts: **US** broad launch (e.g. Feb 2026 in trade press), **UK** from 19 Mar 2026 "
            "(Early Access), and **CA/MX/IT** named alongside US/UK in Amazon's international announcement; "
            "**Austria** is not named there."
        ),
        (
            "**Reception (third-party)**: Outlets report both strong upgrades for Echo-heavy Prime homes and pain "
            "points (reliability, over-chatty replies, app UX). See README (Amazon Alexa+ section) for links: "
            "Consumer Reports, CNET, WIRED, etc."
        ),
        (
            "\n**Web bridge (roadmap)**: HTTP dashboard/API are not yet built for untrusted exposure; **auth for the "
            "control plane is planned** (see README)."
        ),
        (
            "\n**TTS shopping guard**: Heuristic block for buy/order/cart + Amazon context (env `ALEXA_SHOPPING_GUARD`,"
            " default on). See README."
        ),
    ]
    return "\n".join(lines)


@app.tool(annotations=_READONLY)
async def speak_command(text: str) -> str:
    r"""Synthesize and speak the given text via the default speaker.

    Use this to issue commands to Alexa (e.g., \"Alexa, what time is it?\").

    ## Return Format
    Success: "✅ Successfully synthesized and spoke: `{text}`"
    Error: "❌ Error speaking command: **{error}**"

    ## Examples
    speak_command("Alexa, what time is it?")
    """
    try:
        output_file = "temp_command.wav"
        await speak_text(text, output_file=output_file)
        return f"✅ Successfully synthesized and spoke: `{text}`"
    except Exception as e:
        logger.error(f"Error speaking command: {e}")
        return f"❌ Error speaking command: **{e}**"


@app.tool(annotations=_READONLY)
async def listen_for_response(duration: int = 10) -> str:
    """Listen to the microphone for a period and transcribe the audio.

    Use this to capture Alexa's response.

    ## Return Format
    Success: Transcribed text string.
    Silence: "[No speech detected]"
    Error: "❌ Error listening: {error}"

    ## Examples
    listen_for_response(duration=10)
    """
    try:
        logger.info(f"Listening for {duration} seconds...")
        audio_data = await record_audio(duration=float(duration))
        logger.info("Transcribing audio...")
        text = transcribe_audio(audio_data)
        return text if text else "[No speech detected]"
    except Exception as e:
        logger.error(f"Error listening: {e}")
        return f"❌ Error listening: {e!s}"


@app.tool(annotations=_READONLY)
async def interact(command: str, wait_for_response: bool = True, timeout: int = 10) -> str:
    r"""Run the full acoustic interaction loop.

    1. Prepend \"Alexa\" wake word if missing.
    2. Speak command via default audio output.
    3. Capture microphone response via whisper transcription.
    4. When session archive is enabled (default), persist ask.mp3 / listen.wav / turn.json
       under ``~/.alexa-mcp/sessions/<id>/``.

    ## Return Format
    "# ✅ Alexa Interaction Report\n- **Command**: `{command}`\n- **Response**: {transcription}"

    ## Examples
    interact("what time is it?")
    interact("turn on the lights", wait_for_response=False)
    """
    # Prepend Alexa if missing, to ensure she wakes up
    clean_command = command.strip()
    if not clean_command.lower().startswith("alexa"):
        full_command = f"Alexa, {clean_command}"
    else:
        full_command = clean_command

    session_dir = None
    session_id: str | None = None
    ask_archive: str | None = None
    if archive_enabled():
        session_dir = create_session_dir()
        session_id = session_dir.name
        ask_archive = str(session_dir / "ask.mp3")

    try:
        await speak_text(full_command, archive_mp3_path=ask_archive)
    except Exception as e:
        logger.error(f"Error speaking command: {e}")
        return f"❌ Error speaking command: **{e}**"

    if not wait_for_response:
        if session_dir is not None:
            write_turn_json(
                session_dir,
                {
                    "id": session_id,
                    "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    "command": full_command,
                    "response": None,
                    "success": True,
                    "wait_for_response": False,
                    "files": {"ask": "ask.mp3" if ask_archive else None},
                },
            )
        return _alexa_report(full_command, "", success=True, session_id=session_id)

    await asyncio.sleep(0.5)

    try:
        logger.info(f"Listening for {timeout} seconds...")
        audio_data = await record_audio(duration=float(timeout))
        if session_dir is not None:
            save_listen_wav(session_dir, audio_data)
        logger.info("Transcribing audio...")
        transcription = transcribe_audio(audio_data) or "[No speech detected]"
    except Exception as e:
        logger.error(f"Error listening: {e}")
        transcription = f"❌ Error listening: {e!s}"

    success = "[No speech detected]" not in transcription and "Error" not in transcription
    _record_interaction(full_command, transcription, success=success)

    if session_dir is not None:
        write_turn_json(
            session_dir,
            {
                "id": session_id,
                "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "command": full_command,
                "response": transcription,
                "success": success,
                "wait_for_response": True,
                "timeout_s": timeout,
                "files": {
                    "ask": "ask.mp3" if ask_archive else None,
                    "listen": "listen.wav",
                },
            },
        )

    return _alexa_report(full_command, transcription, success=success, session_id=session_id)


@app.tool(annotations=_READONLY)
async def session_archive(
    action: str = "list",
    session_id: str | None = None,
    limit: int = 50,
    tier: str = "fast",
    depot_url: str | None = None,
    reaper_url: str | None = None,
) -> dict[str, Any]:
    """Manage local Alexa session archive and optional fleet exports.

    Actions:
    - list: newest sessions under ``~/.alexa-mcp/sessions/``
    - get: full turn + file paths for ``session_id``
    - delete: remove a local session directory
    - export_depot: upload keepers to depot-mcp (tags ``alexa``, ``session:<id>``)
    - send_reaper: InsertMedia listen/ask into Reaper via reaper-mcp tools/call

    ## Return Format
    {"success": bool, "action": str, ...}

    ## Examples
    session_archive(action="list", limit=20)
    session_archive(action="export_depot", session_id="20260726T120000Z_abcd1234")
    session_archive(action="send_reaper", session_id="20260726T120000Z_abcd1234")
    """
    act = (action or "list").strip().lower()
    if act == "list":
        return {"success": True, "action": "list", "sessions": list_sessions(limit=limit)}
    if act == "get":
        if not session_id:
            return {"success": False, "action": "get", "error": "session_id required"}
        session = get_session(session_id)
        if not session:
            return {"success": False, "action": "get", "error": f"session not found: {session_id}"}
        return {"success": True, "action": "get", **session}
    if act == "delete":
        if not session_id:
            return {"success": False, "action": "delete", "error": "session_id required"}
        ok = delete_session(session_id)
        return {
            "success": ok,
            "action": "delete",
            "deleted": session_id if ok else None,
            "error": None if ok else f"session not found: {session_id}",
        }
    if act in ("export_depot", "export_to_depot"):
        if not session_id:
            return {"success": False, "action": "export_depot", "error": "session_id required"}
        result = await export_to_depot(session_id, base_url=depot_url, tier=tier)
        return {"action": "export_depot", **result}
    if act in ("send_reaper", "send_to_reaper"):
        if not session_id:
            return {"success": False, "action": "send_reaper", "error": "session_id required"}
        result = await send_to_reaper(session_id, base_url=reaper_url)
        return {"action": "send_reaper", **result}
    return {
        "success": False,
        "action": act,
        "error": f"unknown action: {action}",
        "valid_actions": ["list", "get", "delete", "export_depot", "send_reaper"],
    }


@app.tool(annotations=_READONLY)
async def agentic_alexa_query(query: str, ctx: Context) -> str:
    """Refine the command using host sampling before speaking.

    Ensures the natural language query is translated into a clear Alexa command.

    ## Return Format
    Same as interact() — interaction report markdown string.

    ## Examples
    agentic_alexa_query("ask alexa what the weather will be like tomorrow")
    """
    prompt = (
        f"Translate this user query into a clear, concise Alexa command: '{query}'. "
        "Keep it simple so the acoustic bridge captures it perfectly."
    )

    # Use FastMCP 3.2 Host Sampling
    logger.info(f"Sampling host for query refinement: {query}")
    response = await ctx.sample(
        messages=[{"role": "user", "content": prompt}],
        max_tokens=100,
    )

    refined_command = response.text.strip().strip("\"'").replace("Alexa, ", "")
    logger.info(f"Refined command: {refined_command}")

    return await interact(refined_command)


@app.tool(annotations={"destroy": True})
async def alexa_mcp_shutdown(confirm: bool = False) -> str:
    """Shut down the Alexa MCP server gracefully.

    Requires confirm=True to prevent accidental termination.

    ## Return Format
    "Shutting down..." on success.

    ## Examples
    alexa_mcp_shutdown(confirm=True)
    """
    if not confirm:
        return "Shutdown aborted — set confirm=True to proceed."
    logger.warning("Shutdown requested via MCP tool")
    task = asyncio.create_task(_do_shutdown())
    task.add_done_callback(lambda t: logger.info("Shutdown task done"))
    return "Shutting down..."


async def _do_shutdown() -> None:
    await asyncio.sleep(0.5)
    os._exit(0)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Start the background scheduler on app startup."""
    loop = asyncio.get_event_loop()
    _sched_task = loop.create_task(scheduler_loop(speak_command))
    _sched_task.add_done_callback(lambda t: logger.info("Scheduler task ended"))
    yield
    from .scheduler import stop_scheduler as _stop

    _stop()


# 2. Initialize FastAPI (Web Management Layer)
web_app = FastAPI(
    title="Alexa Control Web Bridge",
    description="Industrial management bridge for the Alexa Acoustic MCP fleet.",
    version="0.3.0",
    lifespan=lifespan,
    # Auth is applied per-route on API endpoints only; static assets must be unauthenticated
    # so the browser can load JS/CSS after the initial Basic Auth challenge on index.html.
)

_is_tauri = os.environ.get("ALEXA_MCP_TAURI", "").lower() in ("1", "true", "yes")
web_app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:10800",
        "http://127.0.0.1:10800",
        "http://localhost:10801",
        "http://127.0.0.1:10801",
        "http://tauri.localhost",
        "https://tauri.localhost",
        "tauri://localhost",
    ],
    allow_origin_regex=r"https?://(?:[a-zA-Z0-9-]+\.ts\.net|.*?\.tail-[a-f0-9]+\.ts\.net|tauri\.localhost|localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|100\.\d{1,3}\.\d{1,3}\.\d{1,3})(?::\d+)?$|^tauri://localhost$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@web_app.get("/api/health")
async def get_health() -> dict[str, str]:
    """Liveness probe for health checks."""
    return {"status": "ok", "service": "alexa-mcp"}


@web_app.get("/api/status", dependencies=[Depends(authenticate)])
async def get_status() -> dict[str, Any]:
    """Industrial health and status endpoint."""
    return {
        "status": "online",
        "server": "alexa-mcp",
        "version": "0.3.0",
        "standard": "SOTA v14.1",
        "engines": {
            "stt": "Faster-Whisper (Base)",
            "tts": "Edge-TTS (Aria)",
            "io": "SoundDevice",
        },
        "stats": {
            "interactions": INTERACTION_COUNT,
            "health": "nominal",
        },
    }


web_app.include_router(logs_router)
web_app.include_router(sessions_router)


@web_app.post("/api/fleet/launch", dependencies=[Depends(authenticate)])
async def launch_fleet_app(request: LaunchRequest) -> dict[str, Any]:
    """Standardized fleet navigation endpoint."""
    import subprocess

    repo_path = request.repo_path
    if not os.path.exists(repo_path):  # noqa: ASYNC240
        return {"error": f"Path not found: {repo_path}"}

    if not repo_path.replace("\\", "/").startswith("D:/Dev/repos"):
        return {"error": "Unauthorized path (out of fleet)"}

    try:
        # Check for standardized start scripts
        start_script = os.path.join(repo_path, "start.ps1")
        if not os.path.exists(start_script):  # noqa: ASYNC240
            start_script = os.path.join(repo_path, "web_sota", "start.ps1")

        if os.path.exists(start_script):  # noqa: ASYNC240
            # S603/S607: Intentional fleet launch behavior
            subprocess.Popen(["powershell", "-File", start_script], cwd=repo_path)  # noqa: ASYNC220
            return {"status": "launching", "app": request.app_id}
        return {"error": f"No start.ps1 found in {repo_path}"}
    except Exception as e:
        logger.error(f"Launch failure: {e}")
        return {"error": str(e)}


@web_app.get("/api/v1/diagnostics")
async def get_diagnostics() -> dict[str, Any]:
    """Full diagnostics — tool list, system info, errors.

    Required for CUA-NSIS smoke testing.
    """
    return {
        "status": "ok",
        "server": "alexa-mcp",
        "version": "0.3.0",
        "uptime_seconds": int(time.time() - _START_TIME),
        "tool_count": 7,
        "tools": [
            {"name": "docs_help"},
            {"name": "speak_command"},
            {"name": "listen_for_response"},
            {"name": "interact"},
            {"name": "agentic_alexa_query"},
            {"name": "session_archive"},
            {"name": "alexa_mcp_shutdown"},
        ],
        "system": {
            "platform": platform.system(),
            "python": platform.python_version(),
        },
        "errors": [],
    }


@web_app.get("/api/skills")
async def get_skills() -> list[dict[str, str]]:
    """List available skills."""
    return [{"name": "alexa-bridge", "uri": "skill://alexa-bridge/SKILL.md"}]


@web_app.get("/api/skills/{skill_name}")
async def get_skill_content(skill_name: str) -> str:
    """Return the raw SKILL.md content for a skill."""
    skill_path = Path(__file__).parent / "skills" / skill_name / "SKILL.md"
    if skill_path.exists():
        return skill_path.read_text(encoding="utf-8")
    return "not found"


@web_app.get("/api/llm/discover")
async def discover_llm() -> dict[str, Any]:
    """Probe for local LLM providers (Ollama, LM Studio)."""
    providers: list[dict[str, Any]] = []
    probes = [
        ("ollama", "http://127.0.0.1:11434/api/tags"),
        ("lm_studio", "http://127.0.0.1:1234/v1/models"),
        ("vllm", "http://127.0.0.1:8000/v1/models"),
    ]
    for name, url in probes:
        try:
            async with httpx.AsyncClient(timeout=3) as client:
                r = await client.get(url)
                if r.status_code == 200:
                    providers.append({"name": name, "detected": True, "url": url.rsplit("/", 1)[0]})
                    continue
        except Exception:
            logger.debug("LLM provider %s not detected at %s", name, url)
        providers.append({"name": name, "detected": False})

    return {"providers": providers}


@web_app.get("/api/capabilities")
async def get_capabilities() -> dict[str, Any]:
    """Return server capabilities for dynamic feature discovery."""
    return {
        "server": "alexa-mcp",
        "version": "0.3.0",
        "features": {
            "chat": bool(os.getenv("OLLAMA_URL")),
            "skills": True,
            "tools": True,
            "llm_discovery": True,
        },
    }


# --- Scheduler Endpoints ---


@web_app.get("/api/scheduler/commands")
async def api_list_scheduled() -> list[dict[str, Any]]:
    """List all scheduled commands."""
    return list_scheduled_commands()


@web_app.post("/api/scheduler/commands")
async def api_create_scheduled(body: dict[str, Any]) -> dict[str, Any]:
    """Create a scheduled command."""
    return create_scheduled_command(
        command=body["command"],
        cron_expr=body["cron_expr"],
        label=body.get("label", ""),
    )


@web_app.put("/api/scheduler/commands/{cmd_id}")
async def api_update_scheduled(cmd_id: int, body: dict[str, Any]) -> dict[str, Any]:
    """Update a scheduled command."""
    result = update_scheduled_command(cmd_id, **body)
    if result is None:
        return {"error": "not found"}
    return result


@web_app.delete("/api/scheduler/commands/{cmd_id}")
async def api_delete_scheduled(cmd_id: int) -> dict[str, Any]:
    """Delete a scheduled command."""
    deleted = delete_scheduled_command(cmd_id)
    return {"deleted": deleted}


# --- Presets Endpoints ---


@web_app.get("/api/presets")
async def api_list_presets() -> list[dict[str, Any]]:
    """List all command presets."""
    return list_presets()


@web_app.get("/api/presets/{preset_id}")
async def api_get_preset(preset_id: int) -> dict[str, Any]:
    """Get a preset with steps."""
    preset = get_preset(preset_id)
    if preset is None:
        return {"error": "not found"}
    return preset


@web_app.post("/api/presets")
async def api_create_preset(body: dict[str, Any]) -> dict[str, Any]:
    """Create a command preset."""
    return create_preset(
        name=body["name"],
        description=body.get("description", ""),
        steps=body.get("steps"),
    )


@web_app.put("/api/presets/{preset_id}")
async def api_update_preset(preset_id: int, body: dict[str, Any]) -> dict[str, Any]:
    """Update a preset."""
    result = update_preset(
        preset_id,
        name=body.get("name"),
        description=body.get("description"),
        steps=body.get("steps"),
    )
    if result is None:
        return {"error": "not found"}
    return result


@web_app.delete("/api/presets/{preset_id}")
async def api_delete_preset(preset_id: int) -> dict[str, Any]:
    """Delete a command preset."""
    deleted = delete_preset(preset_id)
    return {"deleted": deleted}


@web_app.post("/api/presets/{preset_id}/run")
async def api_run_preset(preset_id: int) -> dict[str, Any]:
    """Execute a preset's command sequence."""
    preset = get_preset(preset_id)
    if preset is None:
        return {"error": "not found"}
    steps = preset.get("steps", [])
    results = run_preset_steps(steps, lambda cmd: "ok")
    return {"preset": preset["name"], "results": results}


# --- Announce Endpoint (Fleet Integration) ---


@web_app.post("/api/announce")
async def api_announce(body: dict[str, Any]) -> dict[str, Any]:
    """Fleet-wide announce endpoint — speaks text via the acoustic bridge.

    Call from other MCP servers to make announcements via Alexa.
    """
    text = body.get("text", "")
    if not text:
        return {"error": "text is required"}
    token = os.getenv("ALEXA_ANNOUNCE_TOKEN", "")
    header_token = body.get("token", "")
    if token and header_token != token:
        return {"error": "unauthorized"}
    try:
        output_file = "temp_announce.wav"
        from .tts import speak_text

        await speak_text(text, output_file=output_file)
        log_activity("announce", f"Announced: {text[:120]}", level="INFO")
        return {"status": "ok", "spoken": text}
    except Exception as e:
        logger.error("Announce failed: %s", e)
        return {"error": str(e)}


# --- Analytics ---


@web_app.get("/api/analytics/stats")
async def api_analytics() -> dict[str, Any]:
    """Return aggregated analytics for the dashboard."""
    return get_analytics(days=7)


# Prefab (MCP Apps) — fleet list/status surface
register_prefab_tools(app)

# 3. Securely bridge the app and web_app as separate entities
setup_webapp(web_app, mcp_app=app)


def main() -> None:
    """Run the main entry point for unified transport (Protocol vs Bridge)."""
    from .transport import run_server

    # Check if we should run the Web Bridge instead of just MCP Protocol
    if os.getenv("MCP_TRANSPORT") == "http" or "--http" in sys.argv:
        port = int(os.getenv("MCP_PORT", "10801"))
        logger.info(f"Starting Alexa MCP Web Bridge on port {port}...")
        uvicorn.run(web_app, host="0.0.0.0", port=port)  # noqa: S104
    else:
        # Standard MCP run (Protocol only)
        run_server(app, server_name="alexa-mcp")


# Entry point for uvicorn (web_sota/start.ps1): uvicorn alexa_mcp.server:asgi_app
asgi_app = web_app

if __name__ == "__main__":
    main()
