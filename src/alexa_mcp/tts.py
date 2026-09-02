"""
TTS module for alexa-mcp.

Provider is selected via TTS_PROVIDER env var or the ``provider`` argument:
    edge-tts   (default) — Microsoft neural TTS, needs internet + ffmpeg
    speech-mcp           — calls a running speech-mcp server
                           (set SPEECH_MCP_URL, default http://localhost:10802)
"""

import os
from typing import Optional
from .audio import play_audio_file


async def speak_text(
    text: str,
    voice: str = "en-US-AriaNeural",
    output_file: str = "tts_output.wav",
    provider: Optional[str] = None,
):
    """
    Synthesizes speech from text and plays it through the default speaker.

    Args:
        text:        Text to synthesize.
        voice:       Voice name (provider-specific).
        output_file: Temporary WAV path used during playback.
        provider:    Override TTS_PROVIDER env var. "edge-tts" | "speech-mcp".
    """
    resolved = provider or os.getenv("TTS_PROVIDER", "edge-tts")
    if resolved == "speech-mcp":
        await _speak_via_speech_mcp(text, voice, output_file)
    else:
        await _speak_via_edge_tts(text, voice, output_file)


async def _speak_via_edge_tts(text: str, voice: str, output_file: str):
    """Synthesize with edge-tts (Microsoft neural), convert MP3->WAV, play."""
    import edge_tts

    communicate = edge_tts.Communicate(text, voice)
    mp3_file = output_file.replace(".wav", ".mp3")
    await communicate.save(mp3_file)

    try:
        from pydub import AudioSegment

        audio = AudioSegment.from_mp3(mp3_file)
        audio.export(output_file, format="wav")
        play_audio_file(output_file)

    except Exception as e:
        print(f"Error playing audio: {e}")
        if not os.path.exists("ffmpeg.exe") and "ffmpeg" not in os.environ.get("PATH", ""):
            print("FFmpeg might be missing. Please install FFmpeg for MP3->WAV conversion.")

    finally:
        if os.path.exists(mp3_file):
            os.remove(mp3_file)
        if os.path.exists(output_file):
            os.remove(output_file)


async def _speak_via_speech_mcp(text: str, voice: str, output_file: str):
    """
    Synthesize by calling a running speech-mcp server.
    Expects POST /api/synthesize returning raw WAV bytes.
    """
    import httpx

    endpoint = os.getenv("SPEECH_MCP_URL", "http://localhost:10802")
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{endpoint}/api/synthesize",
                json={"text": text, "voice": voice},
                timeout=30.0,
            )
            resp.raise_for_status()
            with open(output_file, "wb") as f:
                f.write(resp.content)
        play_audio_file(output_file)
    except Exception as e:
        print(f"Error calling speech-mcp at {endpoint}: {e}")
    finally:
        if os.path.exists(output_file):
            os.remove(output_file)
