"""Tests for alexa_mcp.stt — faster-whisper mocked via conftest."""

from unittest.mock import MagicMock

import numpy as np


class TestGetModel:
    def test_returns_model_instance(self, mock_whisper) -> None:
        import alexa_mcp.stt as stt_module

        model = stt_module.get_model()
        assert model is not None

    def test_singleton_reuse(self, mock_whisper) -> None:
        """get_model() should return the same instance on repeated calls."""
        import alexa_mcp.stt as stt_module

        m1 = stt_module.get_model()
        m2 = stt_module.get_model()
        assert m1 is m2

    def test_model_loaded_with_correct_params(self, monkeypatch) -> None:
        import alexa_mcp.stt as stt_module

        # Reset singleton
        monkeypatch.setattr(stt_module, "_model", None)

        # Use a fresh mock so call history is isolated
        fresh_wm = MagicMock(return_value=MagicMock())
        monkeypatch.setattr(stt_module, "WhisperModel", fresh_wm)

        stt_module.get_model(model_size="small", device="cpu", compute_type="int8")

        fresh_wm.assert_called_once_with("small", device="cpu", compute_type="int8")


class TestTranscribeAudio:
    def test_returns_transcribed_string(self, mock_whisper) -> None:
        from alexa_mcp.stt import transcribe_audio

        audio = np.zeros(16000, dtype="float32")
        result = transcribe_audio(audio)

        assert isinstance(result, str)
        assert result == "hello alexa"

    def test_joins_multiple_segments(self, mock_whisper, monkeypatch) -> None:
        import alexa_mcp.stt as stt_module

        seg1 = MagicMock()
        seg1.text = "turn on"
        seg2 = MagicMock()
        seg2.text = "the lights"
        mock_whisper.transcribe.return_value = ([seg1, seg2], MagicMock())

        audio = np.zeros(16000, dtype="float32")
        result = stt_module.transcribe_audio(audio)

        assert result == "turn on the lights"

    def test_empty_segments_returns_empty_string(self, mock_whisper) -> None:
        import alexa_mcp.stt as stt_module

        mock_whisper.transcribe.return_value = ([], MagicMock())

        audio = np.zeros(16000, dtype="float32")
        result = stt_module.transcribe_audio(audio)

        assert result == ""

    def test_calls_transcribe_with_audio_data(self, mock_whisper) -> None:
        from alexa_mcp.stt import transcribe_audio

        audio = np.ones(8000, dtype="float32") * 0.5
        transcribe_audio(audio)

        call_args = mock_whisper.transcribe.call_args
        np.testing.assert_array_equal(call_args[0][0], audio)
