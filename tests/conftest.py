from unittest.mock import AsyncMock

import numpy as np
import pytest


@pytest.fixture
def mcp_app():
    """Provides the FastMCP app instance for testing."""
    from alexa_mcp.server import app

    return app


@pytest.fixture
def mock_audio(mocker):
    """Mocks the audio I/O layer as used in server.py."""
    mock_record = mocker.patch("alexa_mcp.server.record_audio", new_callable=AsyncMock)
    # Return dummy audio data (sine wave)
    mock_record.return_value = np.zeros(16000, dtype=np.float32)
    return {"record": mock_record}


@pytest.fixture
def mock_stt(mocker):
    """Mocks the STT layer as used in server.py."""
    mock_transcribe = mocker.patch("alexa_mcp.server.transcribe_audio", return_value="Alexa, the weather is sunny.")
    return mock_transcribe


@pytest.fixture
def mock_tts(mocker):
    """Mocks the TTS layer as used in server.py."""
    mock_speak = mocker.patch("alexa_mcp.server.speak_text", new_callable=AsyncMock)
    return mock_speak
