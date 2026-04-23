"""Tests for alexa_mcp.tts (miniaudio + sounddevice path)."""

from unittest.mock import AsyncMock, patch

import pytest


class TestSpeakText:
    @pytest.mark.asyncio
    async def test_calls_edge_tts_and_playback(self, monkeypatch: pytest.MonkeyPatch, tmp_path: object) -> None:
        """speak_text saves MP3 via edge-tts, decodes, and plays."""
        monkeypatch.setenv("ALEXA_SHOPPING_GUARD", "0")

        with (
            patch("alexa_mcp.tts.edge_tts.Communicate") as m_comm,
            patch("alexa_mcp.tts.play_mp3_file") as m_play,
            patch("alexa_mcp.tts._nonempty_file", return_value=True),
        ):
            m_com = m_comm.return_value
            m_com.save = AsyncMock()
            from alexa_mcp.tts import speak_text

            out = str(tmp_path / "ignored.wav")
            await speak_text("hello world", output_file=out)
            m_comm.assert_called_with("hello world", "en-US-AriaNeural")
            m_com.save.assert_awaited_once()
            m_play.assert_called_once()
            assert m_play.call_args[0][0].endswith(".mp3")

    @pytest.mark.asyncio
    async def test_custom_voice(self, monkeypatch: pytest.MonkeyPatch, tmp_path: object) -> None:
        monkeypatch.setenv("ALEXA_SHOPPING_GUARD", "0")
        with (
            patch("alexa_mcp.tts.edge_tts.Communicate") as m_comm,
            patch("alexa_mcp.tts.play_mp3_file"),
            patch("alexa_mcp.tts._nonempty_file", return_value=True),
        ):
            m_comm.return_value.save = AsyncMock()
            from alexa_mcp.tts import speak_text

            await speak_text("hi", voice="en-GB-RyanNeural", output_file=str(tmp_path / "o.wav"))
            m_comm.assert_called_with("hi", "en-GB-RyanNeural")
