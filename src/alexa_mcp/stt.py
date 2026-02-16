from faster_whisper import WhisperModel
import os
import numpy as np

# Global model instance to avoid reloading
_model = None


def get_model(
    model_size: str = "base", device: str = "cpu", compute_type: str = "int8"
):
    global _model
    if _model is None:
        print(f"Loading Whisper model: {model_size} on {device}...")
        _model = WhisperModel(model_size, device=device, compute_type=compute_type)
    return _model


def transcribe_audio(audio_data: np.ndarray, sample_rate: int = 16000) -> str:
    """
    Transcribes audio data (numpy array).
    """
    model = get_model()

    # faster-whisper expects float32 array or file path.
    # We have float32 array from sounddevice.

    segments, info = model.transcribe(audio_data, beam_size=5)

    text_segments = []
    for segment in segments:
        text_segments.append(segment.text)

    return " ".join(text_segments).strip()
