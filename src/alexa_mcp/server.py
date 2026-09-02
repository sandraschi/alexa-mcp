from fastmcp import FastMCP
import asyncio
from .audio import record_audio, record_until_silence
from .tts import speak_text
from .stt import transcribe_audio
import os
import sys
import uvicorn
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from .auth import authenticate
from .web import setup_webapp

app = FastMCP("alexa-mcp", version="0.1.0")

_last_weather: dict = {"response": None, "timestamp": None}


@app.tool()
async def speak_command(text: str) -> str:
    """
    Synthesizes and speaks the given text via the default speaker.
    Use this to issue commands to Alexa (e.g., "Alexa, what time is it?").
    """
    try:
        await speak_text(text, output_file="temp_command.wav")
        return f"Spoke: '{text}'"
    except Exception as e:
        return f"Error speaking command: {str(e)}"


@app.tool()
async def listen_for_response(duration: int = 10, vad: bool = True) -> str:
    """
    Listens to the microphone and transcribes Alexa's response.

    When vad=True (default), stops automatically when silence follows speech.
    When vad=False, records for exactly ``duration`` seconds.

    Args:
        duration: Maximum listen time in seconds.
        vad:      Use voice-activity detection to stop early on silence.
    """
    try:
        if vad:
            print(f"Listening (VAD, max {duration}s)...")
            audio_data = await record_until_silence(max_duration=float(duration))
        else:
            print(f"Listening for {duration}s (fixed)...")
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
    Full interaction loop: speak command, wait, listen for response.
    Prepends 'Alexa,' if the command doesn't already start with it.
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
    Result is also stored at alexa://weather/latest resource.
    """
    import datetime

    result = await interact("what is the weather?", wait_for_response=True, timeout=timeout)
    response_text = result
    if "\nResponse: '" in result:
        response_text = result.split("\nResponse: '", 1)[1].rstrip("'")

    _last_weather["response"] = response_text
    _last_weather["timestamp"] = datetime.datetime.now().isoformat()
    _last_weather["raw"] = result
    return result


@app.resource("alexa://weather/latest")
def weather_latest() -> dict:
    """The most recent weather report captured from Alexa via get_weather."""
    return _last_weather


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
    """Web UI chat endpoint — wraps the interact MCP tool."""
    try:
        result = await interact(
            command=request.command,
            wait_for_response=request.wait_for_response,
            timeout=request.timeout or 10,
        )
        return {"response": result}
    except Exception as e:
        return {"response": f"Bridge error: {str(e)}"}


setup_webapp(web_app, mcp_app=app)


def main():
    from .transport import run_server

    if os.getenv("MCP_TRANSPORT") == "http" or "--http" in sys.argv:
        port = int(os.getenv("MCP_PORT", "10801"))
        print(f"Starting Alexa MCP Web Bridge on port {port}...")
        uvicorn.run(web_app, host="0.0.0.0", port=port)
    else:
        run_server(app, server_name="alexa-mcp")


if __name__ == "__main__":
    main()
