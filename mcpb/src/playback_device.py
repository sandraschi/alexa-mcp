"""Shared PortAudio output resolution for TTS and test sounds."""

import sounddevice as sd


def resolve_output_device_id(device_id: int | None) -> int | None:
    """Return device_id if it is a valid output device, else None (use PortAudio default)."""
    if device_id is None:
        return None
    try:
        d = sd.query_devices(int(device_id))
    except Exception:
        return None
    if (d.get("max_output_channels") or 0) < 1:
        return None
    return int(device_id)
