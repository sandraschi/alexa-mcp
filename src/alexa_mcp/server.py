from fastmcp import FastMCP
import asyncio
import sys
from .audio import record_audio
from .tts import speak_text
from .stt import transcribe_audio
import os
import uvicorn
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from .auth import authenticate
from .web import setup_webapp

# Initialize FastMCP
app = FastMCP("alexa-mcp", version="0.1.0")

# Storage for the last weather response (exposed as a resource)
_last_weather: dict = {"response": None, "timestamp": None}


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
    2. Waits 0.5 seconds for Alexa to process.
    3. Listens for a response (if wait_for_response is True).
    """
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


@app.tool()
async def get_weather(timeout: int = 15) -> str:
    """
    Asks Alexa for the current weather and returns a structured transcription.
    Speaks "Alexa, what is the weather?" and listens for Alexa's response.
    The result is also stored and accessible via the alexa://weather/latest resource.
    """
    import datetime

    result = await interact("what is the weather?", wait_for_response=True, timeout=timeout)

    # Parse the response out of the interact result string
    response_text = result
    if "\nResponse: '" in result:
        response_text = result.split("\nResponse: '", 1)[1].rstrip("'")

    _last_weather["response"] = response_text
    _last_weather["timestamp"] = datetime.datetime.now().isoformat()
    _last_weather["raw"] = result

    return result


@app.resource("alexa://weather/latest")
def weather_latest() -> dict:
    """
    The most recent weather report captured from Alexa via the get_weather tool.
    Returns the transcribed response and timestamp.
    """
    return _last_weather


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


class ChatRequest(BaseModel):
    command: str
    wait_for_response: bool = True
    timeout: Optional[int] = 10


@web_app.post("/api/chat")
async def chat(request: ChatRequest):
    """
    Chat endpoint for the web UI. Wraps the interact MCP tool.
    Accepts {command, wait_for_response, timeout} and returns {response}.
    """
    try:
        result = await interact(
            command=request.command,
            wait_for_response=request.wait_for_response,
            timeout=request.timeout or 10,
        )
        return {"response": result}
    except Exception as e:
        return {"response": f"Bridge error: {str(e)}"}


# Setup static file serving
setup_webapp(web_app, mcp_app=app)


def main():
    """Main entry point with unified transport handling."""
    from .transport import run_server

    if os.getenv("MCP_TRANSPORT") == "http" or "--http" in sys.argv:
        port = int(os.getenv("MCP_PORT", "10801"))
        print(f"Starting Alexa MCP Web Bridge on port {port}...")
        uvicorn.run(web_app, host="0.0.0.0", port=port)
    else:
        run_server(app, server_name="alexa-mcp")


if __name__ == "__main__":
    main()
