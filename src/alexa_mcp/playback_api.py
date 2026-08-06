"""HTTP API for TTS output device and volume."""

import asyncio
import logging
from typing import Any, Literal

import sounddevice as sd
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from .auth import authenticate
from .playback_device import resolve_output_device_id
from .playback_meter import get_meter
from .playback_settings import get_playback_settings, set_playback_settings

logger = logging.getLogger("alexa-mcp.playback_api")

router = APIRouter(prefix="/api/audio", tags=["audio"], dependencies=[Depends(authenticate)])


def list_output_devices() -> list[dict[str, Any]]:
    """PortAudio output devices (indices match sounddevice / ``sd.play(..., device=)``)."""
    try:
        devices = sd.query_devices()
    except Exception as e:
        logger.error("sounddevice query_devices failed: %s", e)
        return []
    try:
        _, def_out = sd.default.device
    except Exception:
        def_out = None
    out: list[dict[str, Any]] = []
    for i, d in enumerate(devices):
        ch = d.get("max_output_channels", 0) or 0
        if ch > 0:
            out.append(
                {
                    "id": i,
                    "name": str(d["name"]),
                    "channels": int(ch),
                    "is_default": i == def_out,
                }
            )
    return out


class PlaybackConfigBody(BaseModel):
    """Client payload for TTS output routing."""

    device_id: int | None = None
    volume: float = Field(1.0, ge=0.0, le=1.0)


@router.get("/playback")
async def get_playback() -> dict[str, Any]:
    """Return persisted playback settings and enumerated output devices."""
    s = get_playback_settings()
    return {
        "device_id": s.device_id,
        "volume": s.volume,
        "output_devices": list_output_devices(),
    }


@router.put("/playback")
async def put_playback(body: PlaybackConfigBody) -> dict[str, Any]:
    """Update persisted device and in-app TTS level."""
    dev = resolve_output_device_id(body.device_id)
    if body.device_id is not None and dev is None:
        raise HTTPException(
            status_code=400,
            detail="device_id is not a valid output device (use null for system default).",
        )
    s = set_playback_settings(device_id=dev, volume=body.volume)
    return {
        "device_id": s.device_id,
        "volume": s.volume,
        "output_devices": list_output_devices(),
    }


class PlaybackTestBody(BaseModel):
    """Loudness check: built-in chime, or TTS 'Hello' through the same output path."""

    kind: Literal["chime", "hello"] = "chime"


@router.post("/playback/test")
async def post_playback_test(body: PlaybackTestBody) -> dict[str, str]:
    """Play a chime or short TTS 'Hello' using current playback settings."""
    if body.kind == "hello":
        from .tts import speak_text

        await speak_text("Hello.")
    else:
        from .playback_chime import play_loudness_chime

        await asyncio.to_thread(play_loudness_chime)
    return {"status": "ok", "kind": body.kind}


@router.get("/level")
async def get_audio_level() -> dict[str, Any]:
    """Live output meter snapshot (RMS / peak / FFT bars).

    Prefer playback-path metering (PCM sent to PortAudio during chime/TTS).
    When Stereo Mix / loopback is available and acquired, ``source`` may be
    ``loopback`` for ambient device mix levels.
    """
    return get_meter().snapshot()


@router.post("/level/loopback")
async def start_level_loopback() -> dict[str, Any]:
    """Try to start Windows Stereo Mix / loopback capture for continuous metering."""
    return get_meter().acquire_loopback()


@router.delete("/level/loopback")
async def stop_level_loopback() -> dict[str, str]:
    """Release a loopback meter consumer (stops capture when refcount hits 0)."""
    get_meter().release_loopback()
    return {"status": "ok"}
