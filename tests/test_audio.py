"""Tests for alexa_mcp.audio — all hardware mocked via conftest."""

import numpy as np
import pytest

# ---------------------------------------------------------------------------
# play_audio_file
# ---------------------------------------------------------------------------


class TestPlayAudioFile:
    def test_raises_if_file_missing(self) -> None:
        from alexa_mcp.audio import play_audio_file

        with pytest.raises(FileNotFoundError, match="not found"):
            play_audio_file("/nonexistent/path/audio.wav")

    def test_plays_existing_file(self, tmp_wav, mock_scipy_wavfile, mocker) -> None:
        mock_play = mocker.patch("alexa_mcp.audio.play_with_meter")
        from alexa_mcp.audio import play_audio_file

        play_audio_file(tmp_wav)

        mock_scipy_wavfile.read.assert_called_once_with(tmp_wav)
        mock_play.assert_called_once()
        _, kwargs = mock_play.call_args
        assert kwargs.get("blocking") is True

    def test_passes_device_argument(self, tmp_wav, mock_scipy_wavfile, mocker) -> None:
        mock_play = mocker.patch("alexa_mcp.audio.play_with_meter")
        from alexa_mcp.audio import play_audio_file

        play_audio_file(tmp_wav, device=2)

        mock_play.assert_called_once()
        _, kwargs = mock_play.call_args
        assert kwargs.get("device") == 2


# ---------------------------------------------------------------------------
# record_audio
# ---------------------------------------------------------------------------


class TestRecordAudio:
    @pytest.mark.asyncio
    async def test_returns_flattened_array(self, mock_sounddevice) -> None:
        from alexa_mcp.audio import record_audio

        result = await record_audio(duration=2.0)

        assert isinstance(result, np.ndarray)
        assert result.ndim == 1

    @pytest.mark.asyncio
    async def test_records_correct_number_of_samples(self, mock_sounddevice) -> None:
        from alexa_mcp.audio import record_audio

        sample_rate = 16000
        duration = 3.0
        expected_samples = int(duration * sample_rate)

        mock_sounddevice.rec.return_value = np.zeros((expected_samples,), dtype="float32")

        result = await record_audio(duration=duration, sample_rate=sample_rate)

        # Verify the most recent call used the right arguments
        mock_sounddevice.rec.assert_called_with(
            expected_samples,
            samplerate=sample_rate,
            channels=1,
            dtype="float32",
            device=None,
        )
        assert len(result) == expected_samples

    @pytest.mark.asyncio
    async def test_waits_for_recording_to_finish(self, mock_sounddevice) -> None:
        from alexa_mcp.audio import record_audio

        mock_sounddevice.wait.reset_mock()
        await record_audio(duration=1.0)

        mock_sounddevice.wait.assert_called()


# ---------------------------------------------------------------------------
# save_wav
# ---------------------------------------------------------------------------


class TestSaveWav:
    def test_saves_numpy_array(self, tmp_path, mock_scipy_wavfile) -> None:
        from alexa_mcp.audio import save_wav

        data = np.zeros(100, dtype="float32")
        path = str(tmp_path / "out.wav")
        save_wav(path, data, sample_rate=22050)

        mock_scipy_wavfile.write.assert_called_once_with(path, 22050, data)
