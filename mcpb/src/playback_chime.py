"""Short test sounds for output level checks (uses same device and gain as TTS)."""

import logging

import numpy as np
import sounddevice as sd

from .playback_device import resolve_output_device_id
from .playback_settings import get_playback_settings

logger = logging.getLogger("alexa-mcp.playback_chime")

SAMPLE_RATE = 44100


def play_loudness_chime() -> None:
    """Play a two-tone chime on the configured output (blocking)."""
    s = get_playback_settings()
    dev = resolve_output_device_id(s.device_id)
    vol = max(0.0, min(1.0, s.volume))
    if vol <= 0.0:
        logger.info("Chime skipped (volume is 0).")
        return

    n = int(0.4 * SAMPLE_RATE)
    t = np.arange(n, dtype=np.float64) / SAMPLE_RATE
    # Pleasant major third: C5 + E5, second slightly shorter for a "ding"
    split = int(0.18 * SAMPLE_RATE)
    env = np.sin(np.pi * np.arange(n, dtype=np.float64) / max(n - 1, 1)) ** 0.75
    w = np.zeros(n, dtype=np.float64)
    w[:split] = 0.42 * np.sin(2 * np.pi * 523.25 * t[:split])
    w[split:] = 0.38 * np.sin(2 * np.pi * 659.25 * t[split:])
    w *= env
    wave = (w * vol * 0.9).astype(np.float32)
    np.clip(wave, -1.0, 1.0, out=wave)

    try:
        info = sd.query_devices(dev if dev is not None else sd.default.device[1], "output")
        ch = int(info.get("max_output_channels", 1) or 1)
    except Exception:
        ch = 1
    if ch >= 2:
        wave = np.column_stack([wave, wave])

    try:
        sd.play(wave, SAMPLE_RATE, device=dev, blocking=True)
    except Exception as e:
        msg = f"Chime playback failed: {e!s}"
        raise RuntimeError(msg) from e
    logger.info("Loudness chime played (volume=%.0f%%)", 100.0 * vol)
