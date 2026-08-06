"""Shared fixtures and mocks for alexa-mcp test suite.

Hardware-dependent libraries (sounddevice, faster_whisper, edge_tts, pydub)
are stubbed into sys.modules at module-load time for headless/CI runs.
Server-level tests also use pytest-mock fixtures for `speak_text` / `record_audio` / STT.
"""

import sys
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import numpy as np
import pytest
from pytest_mock import MockerFixture

# ---------------------------------------------------------------------------
# Stub heavy/hardware libraries into sys.modules BEFORE any src import
# ---------------------------------------------------------------------------

_sd = MagicMock()
_sd.rec.return_value = np.zeros((16000,), dtype="float32")
_sd.wait.return_value = None
_sd.play.return_value = None
sys.modules.setdefault("sounddevice", _sd)

_fw_segment = MagicMock()
_fw_segment.text = "hello alexa"
_fw_model = MagicMock()
_fw_model.transcribe.return_value = ([_fw_segment], MagicMock())
_fw_module = MagicMock()
_fw_module.WhisperModel.return_value = _fw_model
sys.modules.setdefault("faster_whisper", _fw_module)

_et_communicate = MagicMock()
_et_communicate.save = AsyncMock(return_value=None)
_et_module = MagicMock()
_et_module.Communicate.return_value = _et_communicate
sys.modules.setdefault("edge_tts", _et_module)

_audio_segment = MagicMock()
_audio_segment.from_mp3.return_value = _audio_segment
_audio_segment.export.return_value = None
_pydub_module = MagicMock()
_pydub_module.AudioSegment = _audio_segment
sys.modules.setdefault("pydub", _pydub_module)


@pytest.fixture()
def mock_sounddevice() -> MagicMock:
    return sys.modules["sounddevice"]


@pytest.fixture()
def mock_scipy_wavfile(monkeypatch: pytest.MonkeyPatch) -> MagicMock:
    wav_mock = MagicMock()
    wav_mock.read.return_value = (16000, np.zeros((16000,), dtype="int16"))
    wav_mock.write.return_value = None
    monkeypatch.setattr("alexa_mcp.audio.wav", wav_mock)
    return wav_mock


@pytest.fixture()
def mock_edge_tts() -> MagicMock:
    return sys.modules["edge_tts"]


@pytest.fixture()
def mock_pydub() -> MagicMock:
    return sys.modules["pydub"]


@pytest.fixture(autouse=True)
def reset_global_mocks() -> Any:
    """Reset sys.modules-level mocks before each test."""
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
def reset_whisper_singleton() -> Any:
    import alexa_mcp.stt as stt_mod

    stt_mod._model = None
    yield
    stt_mod._model = None


@pytest.fixture()
def mock_whisper() -> MagicMock:
    return sys.modules["faster_whisper"].WhisperModel.return_value


@pytest.fixture(autouse=True)
def mock_play_audio_file(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("alexa_mcp.audio.sd", sys.modules["sounddevice"])


@pytest.fixture()
def tmp_wav(tmp_path: Path) -> str:
    p = tmp_path / "test.wav"
    p.write_bytes(b"RIFF" + b"\x00" * 40)
    return str(p)


@pytest.fixture()
def web_client() -> Any:
    from base64 import b64encode

    from fastapi.testclient import TestClient

    from alexa_mcp.server import web_app

    credentials = b64encode(b"sandra:vienna2026").decode()
    client = TestClient(web_app, raise_server_exceptions=False)
    client.headers.update({"Authorization": f"Basic {credentials}"})
    return client


@pytest.fixture()
def unauthed_client() -> Any:
    from fastapi.testclient import TestClient

    from alexa_mcp.server import web_app

    return TestClient(web_app, raise_server_exceptions=False)


# ---------------------------------------------------------------------------
# Server tool tests (mock real TTS / audio / STT on the server module)
# ---------------------------------------------------------------------------


@pytest.fixture
def mock_audio(mocker: MockerFixture) -> dict[str, Any]:
    """Mock the audio I/O layer as used in server.py."""
    mock_record = mocker.patch("alexa_mcp.server.record_audio", new_callable=AsyncMock)
    mock_record.return_value = np.zeros(16000, dtype=np.float32)
    return {"record": mock_record}


@pytest.fixture
def mock_stt(mocker: MockerFixture) -> MagicMock:
    """Mock the STT layer as used in server.py."""
    return mocker.patch(
        "alexa_mcp.server.transcribe_audio",
        return_value="Alexa, the weather is sunny.",
    )


@pytest.fixture
def mock_tts(mocker: MockerFixture) -> AsyncMock:
    """Mock the TTS layer as used in server.py."""
    return mocker.patch("alexa_mcp.server.speak_text", new_callable=AsyncMock)
