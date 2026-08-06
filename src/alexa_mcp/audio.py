import asyncio
import os

import numpy as np
import scipy.io.wavfile as wav
import sounddevice as sd

from .playback_meter import play_with_meter


def play_audio_file(file_path: str, device: int | None = None) -> None:
    """Plays a WAV file using sounddevice (with live RMS metering)."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Audio file not found: {file_path}")

    sample_rate, data = wav.read(file_path)
    play_with_meter(data, sample_rate, device=device, blocking=True)


async def record_audio(duration: float, sample_rate: int = 16000, device: int | None = None) -> np.ndarray:
    """Record audio for a specific duration.

    Returns:
        numpy array of audio data.

    """
    # Create an Event to signal recording finished if we were using a callback,
    # but for fixed duration sd.rec is fine.

    # sd.rec is non-blocking, so we sleep.
    recording = sd.rec(
        int(duration * sample_rate),
        samplerate=sample_rate,
        channels=1,
        dtype="float32",
        device=device,
    )

    # We await the duration logic.
    # Since sd.wait() is blocking, we wrap it or just sleep.
    # Ideally standard sd.wait() blocks the thread. In async, we might want to run
    # this in executor if it blocks heavily, but for short durations
    # asyncio.sleep might desync.
    # Let's use sounddevice's blocking wait in a thread to be safe.

    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, sd.wait)

    return recording.flatten()


def save_wav(file_path: str, data: np.ndarray, sample_rate: int = 16000) -> None:
    """Save numpy audio data to WAV file."""
    wav.write(file_path, sample_rate, data)
