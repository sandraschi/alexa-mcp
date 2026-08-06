"""Edge-TTS synthesis and local playback.

Edge-TTS writes MP3. We decode with **miniaudio** (dr_mp3) and play with **sounddevice**,
using **playback settings** (device + volume) from `~/.alexa-mcp/playback.json`.
"""

import asyncio
import logging
import os
import shutil
import tempfile
import uuid
from pathlib import Path

import certifi
import edge_tts
import miniaudio
import numpy as np
import sounddevice as sd

from .playback_device import resolve_output_device_id
from .playback_meter import play_with_meter
from .playback_settings import get_playback_settings
from .speak_policy import assert_speak_policy_allows

logger = logging.getLogger("alexa-mcp.tts")

_CERTIFI_WARNED = False


def _ensure_edge_tls_can_load_certs() -> None:
    """Log once if certifi's CA bundle path is missing (common WinError 2 / SSL source for edge-tts)."""
    global _CERTIFI_WARNED
    if _CERTIFI_WARNED:
        return
    p = certifi.where()
    if not os.path.isfile(p):
        _CERTIFI_WARNED = True
        logger.error(
            "certifi CA bundle is missing at %r — edge-tts HTTPS/WebSocket can fail. "
            "Reinstall certifi/venv or set SSL_CERT_FILE to a valid cacert.pem.",
            p,
        )


def _default_output_name_for_log(device: int | None) -> str | None:
    try:
        if device is None:
            _, idx = sd.default.device
        else:
            idx = int(device)
        if idx is None or idx < 0:
            return None
        return str(sd.query_devices(idx, "output")["name"])
    except Exception:
        return None


def _safe_unlink(p: str | Path) -> None:
    try:
        path = Path(p)
        if path.is_file():
            path.unlink()
    except OSError:
        pass


def _nonempty_file(path: str) -> bool:
    return os.path.isfile(path) and os.path.getsize(path) > 0


def _new_temp_mp3_path() -> str:
    base = os.path.normpath(os.path.realpath(tempfile.gettempdir()))
    return os.path.join(base, f"alexa-mcp-tts-{uuid.uuid4().hex}.mp3")


def play_mp3_file(path: str) -> None:
    """Decode MP3 in-process and play (blocking) using current playback settings."""
    try:
        decoded = miniaudio.decode_file(path, miniaudio.SampleFormat.SIGNED16)
    except miniaudio.DecodeError as e:
        raise RuntimeError(f"Could not decode TTS audio: {e!s}") from e
    except OSError as e:
        raise RuntimeError(f"Could not read TTS file: {e!s}") from e

    data = np.frombuffer(decoded.samples, dtype=np.int16)
    if decoded.nchannels > 1:
        data = data.reshape(-1, decoded.nchannels)

    s = get_playback_settings()
    dev = resolve_output_device_id(s.device_id)
    vol = max(0.0, min(1.0, s.volume))
    if vol <= 0.0:
        logger.info("TTS skipped playback (volume is 0).")
        return

    x = data.astype(np.float32) * vol
    np.clip(x, -32768, 32767, out=x)
    data = x.astype(np.int16)

    try:
        play_with_meter(data, decoded.sample_rate, device=dev, blocking=True)
    except Exception as e:
        raise RuntimeError(
            f"Playback failed: {e!s}. Try another output device in Audio → playback output, or set system default."
        ) from e

    label = _default_output_name_for_log(dev)
    if label:
        logger.info("TTS played on %s (volume=%.0f%%)", label, 100.0 * vol)


async def speak_text(
    text: str,
    voice: str = "en-US-AriaNeural",
    output_file: str = "tts_output.wav",
    archive_mp3_path: str | Path | None = None,
) -> None:
    """Synthesize with edge-tts, decode MP3, play using playback settings.

    ``output_file`` is accepted for backward compatibility; a temp file is used for the MP3.
    When ``archive_mp3_path`` is set, the synthesized MP3 is copied there before cleanup.

    Raises:
        ValueError: if the text is blocked by the shopping / voice-purchase guard.
        RuntimeError: if synthesis, decode, or playback fails.

    """
    _ = output_file
    assert_speak_policy_allows(text)
    _ensure_edge_tls_can_load_certs()
    communicate = edge_tts.Communicate(text, voice)
    # Do not pre-create the file: edge-tts uses open(path, "wb") (see edge_tts.communicate.Communicate.save).
    # Using mkstemp first caused confusing WinError 2 on some Windows setups; write only under %TEMP%.
    tmp_path = _new_temp_mp3_path()
    try:
        try:
            await communicate.save(tmp_path)
        except OSError as e:
            if getattr(e, "winerror", None) == 2 or e.errno == 2:
                raise RuntimeError(
                    f"edge-tts could not open or write the audio file at {tmp_path!r} "
                    f"(TEMP={os.environ.get('TEMP')!r}). If this persists, check disk access and antivirus. "
                    f"Underlying: {e!s}"
                ) from e
            raise RuntimeError(f"edge-tts save failed writing {tmp_path!r}: {e!s}") from e
        if not _nonempty_file(tmp_path):
            raise RuntimeError("edge-tts produced no audio file (network, API, or region issue).")
        if archive_mp3_path is not None:
            dest = Path(archive_mp3_path)
            dest.parent.mkdir(parents=True, exist_ok=True)
            try:
                shutil.copy2(tmp_path, dest)
            except OSError as e:
                logger.warning("Could not archive TTS MP3 to %s: %s", dest, e)
        await asyncio.to_thread(play_mp3_file, tmp_path)
    finally:
        _safe_unlink(tmp_path)
