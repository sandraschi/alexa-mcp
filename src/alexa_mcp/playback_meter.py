"""Live output-level meter for TTS / chime playback (and optional loopback capture).

Primary source: RMS of PCM we actually send to PortAudio (post in-app volume).
Secondary source: Windows Stereo Mix / loopback-named input devices when present.
"""

from __future__ import annotations

import logging
import math
import threading
import time
from collections import deque
from typing import Any

import numpy as np
import sounddevice as sd

logger = logging.getLogger("alexa-mcp.playback_meter")

BAR_COUNT = 12


def _rms(block: np.ndarray) -> float:
    if block.size == 0:
        return 0.0
    x = np.asarray(block, dtype=np.float64)
    if x.ndim > 1:
        x = x.mean(axis=1)
    return float(np.sqrt(np.mean(np.square(x))))


def _to_float_mono(data: np.ndarray) -> np.ndarray:
    """Normalize int/float PCM to float32 mono in roughly [-1, 1]."""
    x = np.asarray(data)
    if x.dtype == np.int16:
        y = x.astype(np.float32) / 32768.0
    elif x.dtype == np.int32:
        y = x.astype(np.float32) / 2147483648.0
    else:
        y = x.astype(np.float32)
        peak = float(np.max(np.abs(y))) if y.size else 0.0
        if peak > 1.5:
            y = y / 32768.0
    if y.ndim > 1:
        y = y.mean(axis=1)
    return np.clip(y, -1.0, 1.0)


def _bands_from_mono(mono: np.ndarray, n_bars: int = BAR_COUNT) -> list[float]:
    """Cheap log-ish band energies from a mono float window (0..1 each)."""
    if mono.size < 32:
        return [0.0] * n_bars
    n = min(mono.size, 4096)
    chunk = mono[-n:]
    windowed = chunk * np.hanning(chunk.size)
    spec = np.abs(np.fft.rfft(windowed))
    if spec.size < 2:
        return [0.0] * n_bars
    freqs = spec[1:]
    edges = np.unique(np.geomspace(1, max(freqs.size, 2), num=n_bars + 1).astype(int))
    if len(edges) < 2:
        return [0.0] * n_bars
    bars: list[float] = []
    for i in range(len(edges) - 1):
        seg = freqs[edges[i] - 1 : edges[i + 1] - 1]
        if seg.size == 0:
            bars.append(0.0)
        else:
            e = float(np.sqrt(np.mean(np.square(seg))))
            bars.append(min(1.0, e * 4.0))
    while len(bars) < n_bars:
        bars.append(0.0)
    return bars[:n_bars]


class PlaybackMeter:
    """Process-wide meter state updated from playback and optional loopback."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._rms = 0.0
        self._peak = 0.0
        self._peak_hold = 0.0
        self._peak_hold_until = 0.0
        self._playing = False
        self._source = "idle"
        self._bars = [0.0] * BAR_COUNT
        self._recent: deque[np.ndarray] = deque(maxlen=8)
        self._updated_at = 0.0
        self._loop_thread: threading.Thread | None = None
        self._loop_stop = threading.Event()
        self._loop_device: int | None = None
        self._loop_consumers = 0

    def note_playing(self, playing: bool) -> None:
        """Mark whether app playback is currently streaming to the device."""
        with self._lock:
            self._playing = playing
            if playing:
                self._source = "playback"
            elif self._source == "playback" and self._loop_consumers == 0:
                self._source = "idle"

    def push_samples(self, data: np.ndarray, *, source: str = "playback") -> None:
        """Ingest a PCM block and refresh RMS / peak / FFT bars."""
        mono = _to_float_mono(data)
        r = _rms(mono)
        with self._lock:
            self._recent.append(mono)
            joined = np.concatenate(list(self._recent)) if self._recent else mono
            self._bars = _bands_from_mono(joined)
            self._rms = r
            self._peak = max(self._peak * 0.92, r)
            now = time.monotonic()
            if r >= self._peak_hold:
                self._peak_hold = r
                self._peak_hold_until = now + 0.8
            elif now > self._peak_hold_until:
                self._peak_hold *= 0.85
            self._source = source
            self._updated_at = now

    def decay_idle(self) -> None:
        """Fade meter readings when no fresh samples arrive."""
        with self._lock:
            if self._playing:
                return
            now = time.monotonic()
            if now - self._updated_at > 0.15:
                self._rms *= 0.75
                self._peak *= 0.85
                self._bars = [b * 0.8 for b in self._bars]
                if self._rms < 0.001:
                    self._rms = 0.0
                    self._bars = [0.0] * BAR_COUNT
                    if self._loop_consumers == 0:
                        self._source = "idle"

    def snapshot(self) -> dict[str, Any]:
        """Return a JSON-serializable meter reading for the web UI."""
        self.decay_idle()
        with self._lock:
            rms = self._rms
            peak = max(self._peak, self._peak_hold)
            db = -120.0 if rms <= 1e-9 else 20.0 * math.log10(max(rms, 1e-9))
            return {
                "rms": round(rms, 5),
                "peak": round(float(peak), 5),
                "db": round(db, 2),
                "bars": [round(float(b), 4) for b in self._bars],
                "playing": self._playing,
                "source": self._source,
                "loopback_active": self._loop_consumers > 0,
                "loopback_device": self._loop_device,
                "updated_at": self._updated_at,
            }

    def find_loopback_input(self) -> int | None:
        """Best-effort Stereo Mix / loopback input index, or None."""
        try:
            devices = sd.query_devices()
        except Exception:
            return None
        keywords = ("stereo mix", "what u hear", "loopback", "wave out mix", "mixed output")
        for i, d in enumerate(devices):
            if (d.get("max_input_channels") or 0) < 1:
                continue
            name = str(d.get("name", "")).lower()
            if any(k in name for k in keywords):
                return i
        return None

    def acquire_loopback(self) -> dict[str, Any]:
        """Start (or refcount) background loopback capture for live device metering."""
        with self._lock:
            self._loop_consumers += 1
            if self._loop_thread and self._loop_thread.is_alive():
                return {"ok": True, "device": self._loop_device, "already_running": True}

        device = self.find_loopback_input()
        if device is None:
            with self._lock:
                self._loop_consumers = max(0, self._loop_consumers - 1)
            return {
                "ok": False,
                "error": (
                    "No Stereo Mix / loopback input found. Enable it in Windows Sound settings, "
                    "or rely on playback-path metering during chime/TTS."
                ),
                "device": None,
            }

        self._loop_stop.clear()
        self._loop_device = device

        def _run() -> None:
            try:
                info = sd.query_devices(device, "input")
                sr = int(info.get("default_samplerate") or 48000)
                ch = min(2, int(info.get("max_input_channels") or 1))

                def callback(indata, frames, time_info, status) -> None:  # noqa: ANN001
                    _ = frames, time_info
                    if status:
                        logger.debug("loopback status: %s", status)
                    self.push_samples(indata.copy(), source="loopback")

                with sd.InputStream(
                    device=device,
                    channels=ch,
                    samplerate=sr,
                    dtype="float32",
                    blocksize=1024,
                    callback=callback,
                ):
                    while not self._loop_stop.wait(0.05):
                        pass
            except Exception as e:
                logger.warning("Loopback meter stopped: %s", e)
            finally:
                with self._lock:
                    if self._source == "loopback" and not self._playing:
                        self._source = "idle"

        t = threading.Thread(target=_run, name="alexa-mcp-loopback-meter", daemon=True)
        self._loop_thread = t
        t.start()
        return {"ok": True, "device": device, "already_running": False}

    def release_loopback(self) -> None:
        """Drop a loopback consumer; stop the capture thread when unused."""
        with self._lock:
            self._loop_consumers = max(0, self._loop_consumers - 1)
            if self._loop_consumers > 0:
                return
        self._loop_stop.set()
        t = self._loop_thread
        if t and t.is_alive():
            t.join(timeout=1.5)
        self._loop_thread = None
        self._loop_device = None


_meter = PlaybackMeter()


def get_meter() -> PlaybackMeter:
    """Return the process-wide playback meter singleton."""
    return _meter


def _prepare_play_buffer(data: np.ndarray, device: int | None) -> tuple[np.ndarray, int]:
    """Normalize PCM to float32 and match output channel count."""
    arr = np.asarray(data)
    if arr.dtype == np.int16:
        play = arr.astype(np.float32) / 32768.0
    elif arr.dtype == np.int32:
        play = arr.astype(np.float32) / 2147483648.0
    else:
        play = arr.astype(np.float32)
        if float(np.max(np.abs(play)) if play.size else 0.0) > 1.5:
            play = play / 32768.0
    play = np.clip(play, -1.0, 1.0)

    try:
        info = sd.query_devices(device if device is not None else sd.default.device[1], "output")
        max_ch = int(info.get("max_output_channels", 1) or 1)
    except Exception:
        max_ch = 1

    if play.ndim == 1:
        if max_ch >= 2:
            return np.column_stack([play, play]), 2
        return play.reshape(-1, 1), 1
    channels = min(play.shape[1], max_ch)
    return play[:, :channels], channels


def play_with_meter(
    data: np.ndarray,
    samplerate: int | float,
    *,
    device: int | None = None,
    blocking: bool = True,
) -> None:
    """Play PCM through sounddevice while updating the live RMS meter."""
    play, channels = _prepare_play_buffer(data, device)
    sr = int(samplerate)
    total = play.shape[0]
    idx = {"i": 0}
    meter = get_meter()
    meter.note_playing(True)
    finished = threading.Event()

    def callback(outdata, frames, time_info, status) -> None:  # noqa: ANN001
        _ = time_info
        if status:
            logger.debug("output status: %s", status)
        i = idx["i"]
        if i >= total:
            outdata.fill(0)
            raise sd.CallbackStop
        n = min(frames, total - i)
        chunk = play[i : i + n]
        if n < frames:
            outdata[:n] = chunk
            outdata[n:] = 0
            idx["i"] = total
            meter.push_samples(chunk, source="playback")
            raise sd.CallbackStop
        outdata[:] = chunk
        idx["i"] = i + n
        meter.push_samples(chunk, source="playback")

    try:
        with sd.OutputStream(
            samplerate=sr,
            device=device,
            channels=channels,
            dtype="float32",
            blocksize=1024,
            callback=callback,
            finished_callback=finished.set,
        ):
            if blocking:
                finished.wait(timeout=max(5.0, total / max(sr, 1) + 2.0))
    finally:
        meter.note_playing(False)
        meter.push_samples(np.zeros(256, dtype=np.float32), source="playback")
