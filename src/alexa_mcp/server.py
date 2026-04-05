import asyncio
import logging
import os

import uvicorn
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastmcp import Context, FastMCP

from .audio import record_audio
from .auth import authenticate
from .stt import transcribe_audio
from .tts import speak_text
from .web import LaunchRequest, setup_webapp

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("alexa-mcp")

# Initialize FastMCP
app = FastMCP("alexa-mcp", version="0.2.0")

# In-memory log buffer for the dashboard
INTERACTION_LOGS = []
MAX_LOG_SIZE = 10
INTERACTION_COUNT = 0


def _alexa_report(command: str, response: str, success: bool = True) -> str:
    """Universal formatter for Alexa interactions (Mud-to-Gold standard)."""
    status_emoji = "✅" if success else "❌"
    lines = [
        f"# {status_emoji} Alexa Interaction Report",
        f"- **Command**: `{command}`",
        f"- **Response**: {f'_{response}_' if response else '*[No response detected]*'}",
        "\n---",
        "**Next Steps**:",
        "- Use `interact` for a follow-up command",
        "- Check the 'Audio' tab in the webapp for waveforms",
    ]
    return "\n".join(lines)


@app.prompt("alexa_interaction")
def alexa_interaction_prompt(command: str) -> str:
    """Template for issuing optimal Alexa commands."""
    return f"Issue the following command to Alexa via the acoustic bridge: '{command}'. Wait for her response."


@app.tool()
async def docs_help() -> str:
    """
    Returns technical documentation for the Alexa Acoustic Bridge.
    Covers architecture, STT/TTS engines, and interaction protocols.
    """
    lines = [
        "# Alexa MCP Technical Documentation",
        "## Architecture",
        "The server acts as an acoustic proxy. It translates text commands into voice via synthesis, "
        "and captures environmental audio for transcription.",
        "\n## Components",
        "- **Pulse Audio / SoundDevice**: Manages local audio hardware buffers.",
        "- **Edge-TTS**: Cloud-based neural synthesis for high-clarity commands.",
        "- **Faster-Whisper**: Local inference engine for low-latency response transcription.",
        "\n## Protocol",
        "1. **Wake**: All commands are prepended with 'Alexa' unless already present.",
        "2. **Speak**: Audio is played via the system's default output device.",
        "3. **Listen**: Systems enters a recording state for a specified duration.",
        "4. **Analyze**: Audio buffers are processed by the Whisper model to return a text response.",
    ]
    return "\n".join(lines)


@app.tool()
async def speak_command(text: str) -> str:
    """
    Synthesizes and speaks the given text via the default speaker.
    Use this to issue commands to Alexa (e.g., \"Alexa, what time is it?\").
    """
    try:
        output_file = "temp_command.wav"
        await speak_text(text, output_file=output_file)
        return f"✅ Successfully synthesized and spoke: `{text}`"
    except Exception as e:
        return f"❌ Error speaking command: **{e}**"


@app.tool()
async def listen_for_response(duration: int = 10) -> str:
    """
    Listens to the microphone for a specified duration (seconds) and transcribes the audio.
    Use this to capture Alexa's response.
    """
    try:
        print(f"Listening for {duration} seconds...")
        audio_data = await record_audio(duration=float(duration))
        print("Transcribing...")
        text = transcribe_audio(audio_data)
        return text if text else "[No speech detected]"
    except Exception as e:
        return f"Error listening: {str(e)}"


@app.tool()
async def interact(command: str, wait_for_response: bool = True, timeout: int = 10) -> str:
    """
    Full acoustic interaction loop:
    1. Prepend \"Alexa\" wake word if missing.
    2. Speak command via default audio output.
    3. Capture microphone response via whisper transcription.
    """
    # Prepend Alexa if missing, to ensure she wakes up
    clean_command = command.strip()
    if not clean_command.lower().startswith("alexa"):
        full_command = f"Alexa, {clean_command}"
    else:
        full_command = clean_command

    speak_res = await speak_command(full_command)
    if "Error" in speak_res or "❌" in speak_res:
        return speak_res

    if not wait_for_response:
        return speak_res

    await asyncio.sleep(0.5)

    transcription = await listen_for_response(duration=timeout)
    success = "[No speech detected]" not in transcription and "Error" not in transcription

    # Log the interaction
    global INTERACTION_COUNT
    INTERACTION_COUNT += 1
    log_entry = {
        "id": INTERACTION_COUNT,
        "command": full_command,
        "response": transcription,
        "success": success,
        "timestamp": asyncio.get_event_loop().time(),
    }
    INTERACTION_LOGS.insert(0, log_entry)
    if len(INTERACTION_LOGS) > MAX_LOG_SIZE:
        INTERACTION_LOGS.pop()

    return _alexa_report(full_command, transcription, success=success)


@app.tool()
async def agentic_alexa_query(query: str, ctx: Context) -> str:
    """
    Advanced agentic query that refines the command using host sampling before speaking.
    Ensures the natural language query is translated into a clear Alexa command.
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


# FastAPI Bridge
web_app = FastAPI(title="Alexa Control Web Bridge", dependencies=[Depends(authenticate)])

web_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@web_app.get("/api/status")
async def get_status():
    return {
        "status": "online",
        "server": "alexa-mcp",
        "version": "0.2.0",
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


@web_app.get("/api/logs")
async def get_logs():
    return {"logs": INTERACTION_LOGS}


@web_app.post("/api/fleet/launch")
async def launch_fleet_app(request: LaunchRequest):
    """
    Standardized endpoint to launch other apps in the fleet.
    Used for seamless navigation between MCP applications.
    """
    import subprocess

    repo_path = request.repo_path
    if not os.path.exists(repo_path):
        return {"error": f"Path not found: {repo_path}"}

    # Security check: only allow paths in D:/Dev/repos
    if not repo_path.replace("\\", "/").startswith("D:/Dev/repos"):
        return {"error": "Unauthorized path"}

    try:
        # Launch using the localized start.ps1 if it exists
        start_script = os.path.join(repo_path, "start.ps1")
        if not os.path.exists(start_script):
            # Try web_sota/start.ps1
            start_script = os.path.join(repo_path, "web_sota", "start.ps1")

        if os.path.exists(start_script):
            subprocess.Popen(["powershell", "-File", start_script], cwd=repo_path)
            return {"status": "launching", "app": request.app_id}
        return {"error": f"No start.ps1 found in {repo_path}"}
    except Exception as e:
        return {"error": str(e)}


# Setup static file serving
setup_webapp(web_app, mcp_app=app)


def main():
    """Main entry point with unified transport handling (FastMCP 2.14.4+)."""
    from .transport import run_server

    # Check if we should run the web server instead of just MCP
    if os.getenv("MCP_TRANSPORT") == "http" or "--http" in os.sys.argv:
        port = int(os.getenv("MCP_PORT", "10801"))
        print(f"Starting Alexa MCP Web Bridge on port {port}...")
        uvicorn.run(web_app, host="0.0.0.0", port=port)
    else:
        run_server(app, server_name="alexa-mcp")


if __name__ == "__main__":
    main()
