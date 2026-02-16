from fastmcp import FastMCP
import asyncio
from .audio import record_audio
from .tts import speak_text
from .stt import transcribe_audio
import os
import uvicorn
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from .auth import authenticate
from .web import setup_webapp

# Initialize FastMCP
app = FastMCP("alexa-mcp", version="0.1.0")


@app.tool()
async def speak_command(text: str) -> str:
    """
    Synthesizes and speaks the given text via the default speaker.
    Use this to issue commands to Alexa (e.g., "Alexa, what time is it?").
    """
    try:
        output_file = "temp_command.wav"
        await speak_text(text, output_file=output_file)
        return f"Spoke: '{text}'"
    except Exception as e:
        return f"Error speaking command: {str(e)}"


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
async def interact(
    command: str, wait_for_response: bool = True, timeout: int = 10
) -> str:
    """
    A full interaction loop:
    1. Speaks the command (if it doesn't start with 'Alexa', it prepends it).
    2. Waits 1 second.
    3. Listens for a response (if wait_for_response is True).
    """
    # Prepend Alexa if missing, to ensure she wakes up
    if not command.lower().strip().startswith("alexa"):
        full_command = f"Alexa, {command}"
    else:
        full_command = command

    speak_result = await speak_command(full_command)

    if not wait_for_response:
        return speak_result

    await asyncio.sleep(0.5)

    transcription = await listen_for_response(duration=timeout)
    return f"Command: '{full_command}'\nResponse: '{transcription}'"


# FastAPI Bridge
web_app = FastAPI(
    title="Alexa Control Web Bridge", dependencies=[Depends(authenticate)]
)

web_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@web_app.get("/api/status")
async def get_status():
    return {"status": "online", "server": "alexa-mcp", "version": "0.1.0"}


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
