import sounddevice as sd
import numpy as np
import scipy.io.wavfile as wav
import os
import asyncio
import threading
from typing import Optional


def play_audio_file(file_path: str, device: Optional[int] = None):
    """Plays a WAV file using sounddevice."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Audio file not found: {file_path}")
    sample_rate, data = wav.read(file_path)
    sd.play(data, sample_rate, device=device)
    sd.wait()


async def record_audio(
    duration: float, sample_rate: int = 16000, device: Optional[int] = None
) -> np.ndarray:
    """Records audio for a fixed duration. Returns a flat float32 array."""
    recording = sd.rec(
        int(duration * sample_rate),
        samplerate=sample_rate,
        channels=1,
        dtype="float32",
        device=device,
    )
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, sd.wait)
    return recording.flatten()


async def record_until_silence(
    max_duration: float = 30.0,
    silence_threshold: float = 0.02,
    silence_duration: float = 1.5,
    min_speech_duration: float = 0.3,
    sample_rate: int = 16000,
    device: Optional[int] = None,
) -> np.ndarray:
    """
    VAD-based recording: captures audio until silence follows speech.

    Stops when either:
    - ``silence_duration`` seconds of silence follow at least
      ``min_speech_duration`` seconds of detected speech, or
    - ``max_duration`` seconds have elapsed.

    Uses RMS energy thresholding — no extra dependencies needed.
    For better noise robustness, swap in silero-vad as a future upgrade.
    """
    chunk_duration = 0.05  # 50 ms chunks
    chunk_size = int(sample_rate * chunk_duration)
    silence_chunks_needed = int(silence_duration / chunk_duration)
    min_speech_chunks = int(min_speech_duration / chunk_duration)
    max_chunks = int(max_duration / chunk_duration)

    chunks: list[np.ndarray] = []
    speech_started = False
    silence_count = 0
    speech_count = 0
    stop_event = threading.Event()

    def callback(indata: np.ndarray, frames: int, time_info, status):
        nonlocal speech_started, silence_count, speech_count

        chunk = indata.flatten().copy()
        chunks.append(chunk)

        rms = float(np.sqrt(np.mean(chunk ** 2)))
        is_speech = rms > silence_threshold

        if is_speech:
            speech_started = True
            silence_count = 0
            speech_count += 1
        elif speech_started:
            silence_count += 1
            if (
                silence_count >= silence_chunks_needed
                and speech_count >= min_speech_chunks
            ):
                stop_event.set()

        if len(chunks) >= max_chunks:
            stop_event.set()

    def _blocking_stream():
        with sd.InputStream(
            samplerate=sample_rate,
            channels=1,
            dtype="float32",
            blocksize=chunk_size,
            device=device,
            callback=callback,
        ):
            stop_event.wait(timeout=max_duration + 1.0)

    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, _blocking_stream)

    if not chunks:
        return np.zeros(chunk_size, dtype="float32")

    return np.concatenate(chunks)


def save_wav(file_path: str, data: np.ndarray, sample_rate: int = 16000):
    """Saves numpy audio data to a WAV file."""
    wav.write(file_path, sample_rate, data)
