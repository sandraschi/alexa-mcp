"""Persistent TTS output device and volume (server-side, for sounddevice)."""

import json
import logging
import threading
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

logger = logging.getLogger("alexa-mcp.playback")

_lock = threading.Lock()
_CONFIG_DIR = Path.home() / ".alexa-mcp"
_CONFIG_PATH = _CONFIG_DIR / "playback.json"

_settings: "PlaybackSettings | None" = None


@dataclass
class PlaybackSettings:
    """Output device index for sounddevice, or None for system default. Volume 0.0-1.0 linear."""

    device_id: int | None = None
    volume: float = 1.0


def _parse_file(data: dict[str, Any]) -> PlaybackSettings:
    raw = data.get("device_id")
    dev: int | None
    if raw is None:
        dev = None
    else:
        dev = int(raw)
    vol = max(0.0, min(1.0, float(data.get("volume", 1.0))))
    return PlaybackSettings(device_id=dev, volume=vol)


def _load() -> PlaybackSettings:
    global _settings
    if _settings is not None:
        return _settings
    with _lock:
        if _settings is not None:
            return _settings
        if _CONFIG_PATH.is_file():
            try:
                data = json.loads(_CONFIG_PATH.read_text(encoding="utf-8"))
                if isinstance(data, dict):
                    _settings = _parse_file(data)
                else:
                    _settings = PlaybackSettings()
            except (OSError, json.JSONDecodeError, TypeError, ValueError, KeyError) as e:
                logger.warning("Could not load %s: %s — using defaults", _CONFIG_PATH, e)
                _settings = PlaybackSettings()
        else:
            _settings = PlaybackSettings()
    return _settings


def _save(s: PlaybackSettings) -> None:
    _CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    _CONFIG_PATH.write_text(json.dumps(asdict(s), indent=2) + "\n", encoding="utf-8")


def get_playback_settings() -> PlaybackSettings:
    """Return a copy of the current TTS output settings."""
    s = _load()
    return PlaybackSettings(**asdict(s))


def set_playback_settings(*, device_id: int | None, volume: float) -> PlaybackSettings:
    """Persist TTS output device and volume, then return the active settings."""
    v = max(0.0, min(1.0, float(volume)))
    with _lock:
        global _settings
        s = PlaybackSettings(device_id=device_id, volume=v)
        _settings = s
        try:
            _save(s)
        except OSError as e:
            logger.error("Failed to save playback config: %s", e)
        return s
