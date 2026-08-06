"""Unit tests for live output RMS metering."""

from __future__ import annotations

import numpy as np

from alexa_mcp.playback_meter import PlaybackMeter, _bands_from_mono, _rms, _to_float_mono, get_meter


def test_rms_silence_and_full_scale() -> None:
    """RMS of silence is 0; full-scale ones is ~1."""
    silence = np.zeros(1024, dtype=np.float32)
    assert _rms(silence) == 0.0
    full = np.ones(1024, dtype=np.float32)
    assert abs(_rms(full) - 1.0) < 1e-6


def test_to_float_mono_int16() -> None:
    """int16 PCM normalizes into [-1, 1]."""
    x = np.array([0, 16384, -32768], dtype=np.int16)
    y = _to_float_mono(x)
    assert y.dtype == np.float32
    assert abs(y[1] - 0.5) < 0.01
    assert y[2] == -1.0


def test_bands_count() -> None:
    """FFT bar helper always returns 12 bands."""
    t = np.linspace(0, 1, 4096, dtype=np.float32)
    tone = (0.4 * np.sin(2 * np.pi * 440 * t)).astype(np.float32)
    bars = _bands_from_mono(tone, n_bars=12)
    assert len(bars) == 12
    assert max(bars) > 0


def test_meter_push_and_snapshot() -> None:
    """Pushing a tone yields non-zero RMS and dB in the snapshot."""
    m = PlaybackMeter()
    t = np.linspace(0, 0.05, 2205, dtype=np.float32)
    tone = (0.25 * np.sin(2 * np.pi * 1000 * t)).astype(np.float32)
    m.note_playing(True)
    m.push_samples(tone, source="playback")
    snap = m.snapshot()
    assert snap["playing"] is True
    assert snap["source"] == "playback"
    assert snap["rms"] > 0.05
    assert len(snap["bars"]) == 12
    assert snap["db"] > -40
    m.note_playing(False)


def test_global_meter_singleton() -> None:
    """get_meter returns a single shared instance."""
    a = get_meter()
    b = get_meter()
    assert a is b
