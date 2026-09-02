"""
STT module for alexa-mcp.

Model is configurable via environment variables:
    WHISPER_MODEL        base (default) | small | medium | large-v3 | large-v3-turbo
    WHISPER_DEVICE       cpu (default) | cuda | auto
    WHISPER_COMPUTE_TYPE int8 (default) | float16 | float32

"large-v3-turbo" gives near-large quality at roughly base speed and is
recommended when transcription accuracy matters (e.g. parsing weather reports).
"""

from faster_whisper import WhisperModel
import os
import numpy as np

_model: WhisperModel | None = None


def get_model(
    model_size: str | None = None,
    device: str | None = None,
    compute_type: str | None = None,
) -> WhisperModel:
    """Returns the shared WhisperModel, loading it on first call."""
    global _model
    if _model is None:
        size = model_size or os.getenv("WHISPER_MODEL", "base")
        dev = device or os.getenv("WHISPER_DEVICE", "cpu")
        ctype = compute_type or os.getenv("WHISPER_COMPUTE_TYPE", "int8")
        print(f"Loading Whisper model: {size} on {dev} ({ctype})...")
        _model = WhisperModel(size, device=dev, compute_type=ctype)
    return _model


def transcribe_audio(audio_data: np.ndarray, sample_rate: int = 16000) -> str:
    """Transcribes a float32 numpy audio array using faster-whisper."""
    model = get_model()
    segments, _ = model.transcribe(audio_data, beam_size=5)
    return " ".join(seg.text for seg in segments).strip()
