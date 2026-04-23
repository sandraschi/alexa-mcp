from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, MagicMock

import numpy as np
import pytest
from pytest_mock import MockerFixture


@pytest.fixture
def mock_audio(mocker: MockerFixture) -> dict[str, Any]:
    """Mock the audio I/O layer as used in server.py."""
    mock_record = mocker.patch("alexa_mcp.server.record_audio", new_callable=AsyncMock)
    # Return dummy audio data (sine wave)
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
