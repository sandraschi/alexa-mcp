"""
Shared fixtures and mocks for alexa-mcp test suite.

IMPORTANT: Hardware-dependent libraries (sounddevice, faster_whisper, edge_tts,
pydub) are stubbed into sys.modules at module-load time so they never attempt
to initialise PortAudio or download models.  This runs before pytest collects
any test, so all imports inside src/ succeed even in a headless CI environment.
"""

import sys
import asyncio
import numpy as np
from unittest.mock import AsyncMock, MagicMock

# ---------------------------------------------------------------------------
# Stub heavy/hardware libraries into sys.modules BEFORE any src import
# ---------------------------------------------------------------------------

# --- sounddevice (needs PortAudio) ---
_sd = MagicMock()
_sd.rec.return_value = np.zeros((16000,), dtype="float32")
_sd.wait.return_value = None
_sd.play.return_value = None
sys.modules.setdefault("sounddevice", _sd)

# --- faster_whisper (downloads / GPU) ---
_fw_segment = MagicMock()
_fw_segment.text = "hello alexa"
_fw_model = MagicMock()
_fw_model.transcribe.return_value = ([_fw_segment], MagicMock())
_fw_module = MagicMock()
_fw_module.WhisperModel.return_value = _fw_model
sys.modules.setdefault("faster_whisper", _fw_module)

# --- edge_tts (network) ---
_et_communicate = MagicMock()
_et_communicate.save = AsyncMock(return_value=None)
_et_module = MagicMock()
_et_module.Communicate.return_value = _et_communicate
sys.modules.setdefault("edge_tts", _et_module)

# --- pydub (needs ffmpeg) ---
_audio_segment = MagicMock()
_audio_segment.from_mp3.return_value = _audio_segment
_audio_segment.export.return_value = None
_pydub_module = MagicMock()
_pydub_module.AudioSegment = _audio_segment
sys.modules.setdefault("pydub", _pydub_module)

# ---------------------------------------------------------------------------
# Now we can safely import pytest and the project
# ---------------------------------------------------------------------------
import pytest


# ---------------------------------------------------------------------------
# Per-test fixtures that expose the stubs to individual tests
# ---------------------------------------------------------------------------

@pytest.fixture()
def mock_sounddevice():
    return sys.modules["sounddevice"]


@pytest.fixture()
def mock_scipy_wavfile(monkeypatch):
    wav_mock = MagicMock()
    wav_mock.read.return_value = (16000, np.zeros((16000,), dtype="int16"))
    wav_mock.write.return_value = None
    monkeypatch.setattr("alexa_mcp.audio.wav", wav_mock)
    return wav_mock


@pytest.fixture()
def mock_edge_tts():
    return sys.modules["edge_tts"]


@pytest.fixture()
def mock_pydub():
    return sys.modules["pydub"]


@pytest.fixture(autouse=True)
def reset_global_mocks():
    """Reset all sys.modules-level mocks before each test so call counts don't bleed."""
    sys.modules["sounddevice"].reset_mock()
    sys.modules["sounddevice"].rec.return_value = np.zeros((16000,), dtype="float32")
    sys.modules["faster_whisper"].reset_mock()
    sys.modules["faster_whisper"].WhisperModel.return_value = _fw_model
    sys.modules["edge_tts"].reset_mock()
    sys.modules["edge_tts"].Communicate.return_value = _et_communicate
    _et_communicate.save = AsyncMock(return_value=None)
    sys.modules["pydub"].reset_mock()
    sys.modules["pydub"].AudioSegment = _audio_segment
    yield


@pytest.fixture(autouse=True)
def reset_whisper_singleton():
    """Reset the global Whisper model before each test so get_model() tests work."""
    import alexa_mcp.stt as stt_mod
    stt_mod._model = None
    yield
    stt_mod._model = None


@pytest.fixture()
def mock_whisper():
    """Return the mock WhisperModel instance used inside stt.py."""
    return sys.modules["faster_whisper"].WhisperModel.return_value


@pytest.fixture(autouse=True)
def mock_play_audio_file(monkeypatch):
    """Silence play_audio_file everywhere."""
    monkeypatch.setattr("alexa_mcp.audio.sd", sys.modules["sounddevice"])


# ---------------------------------------------------------------------------
# Filesystem helpers
# ---------------------------------------------------------------------------

@pytest.fixture()
def tmp_wav(tmp_path):
    p = tmp_path / "test.wav"
    p.write_bytes(b"RIFF" + b"\x00" * 40)
    return str(p)


# ---------------------------------------------------------------------------
# FastAPI test clients
# ---------------------------------------------------------------------------

@pytest.fixture()
def web_client():
    """Authenticated TestClient for the full web_app."""
    from fastapi.testclient import TestClient
    from alexa_mcp.server import web_app
    import base64

    credentials = base64.b64encode(b"sandra:vienna2026").decode()
    client = TestClient(web_app, raise_server_exceptions=False)
    client.headers.update({"Authorization": f"Basic {credentials}"})
    return client


@pytest.fixture()
def unauthed_client():
    from fastapi.testclient import TestClient
    from alexa_mcp.server import web_app

    return TestClient(web_app, raise_server_exceptions=False)
