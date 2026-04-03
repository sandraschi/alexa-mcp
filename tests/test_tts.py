"""Tests for alexa_mcp.tts — edge-tts and pydub fully mocked."""

import os
import pytest
from unittest.mock import AsyncMock, MagicMock, patch, call


class TestSpeakText:
    @pytest.mark.asyncio
    async def test_calls_edge_tts_communicate(self, mock_edge_tts, tmp_path):
        from alexa_mcp.tts import speak_text

        output = str(tmp_path / "out.wav")
        await speak_text("hello world", output_file=output)

        mock_edge_tts.Communicate.assert_called_with("hello world", "en-US-AriaNeural")

    @pytest.mark.asyncio
    async def test_saves_mp3_then_converts(self, mock_edge_tts, mock_pydub, tmp_path):
        from alexa_mcp.tts import speak_text

        output = str(tmp_path / "out.wav")
        mp3 = output.replace(".wav", ".mp3")

        await speak_text("test", output_file=output)

        communicate = mock_edge_tts.Communicate.return_value
        communicate.save.assert_called_with(mp3)

    @pytest.mark.asyncio
    async def test_custom_voice(self, mock_edge_tts, tmp_path):
        from alexa_mcp.tts import speak_text

        output = str(tmp_path / "out.wav")
        await speak_text("hi", voice="en-GB-RyanNeural", output_file=output)

        mock_edge_tts.Communicate.assert_called_with("hi", "en-GB-RyanNeural")

    @pytest.mark.asyncio
    async def test_cleans_up_mp3_on_success(self, mock_edge_tts, tmp_path, monkeypatch):
        from alexa_mcp.tts import speak_text
        import alexa_mcp.tts as tts_module

        removed = []
        original_remove = os.remove

        def fake_remove(path):
            removed.append(path)

        monkeypatch.setattr(os, "remove", fake_remove)
        # Make files appear to exist so cleanup runs
        monkeypatch.setattr(os.path, "exists", lambda p: True)

        output = str(tmp_path / "out.wav")
        await speak_text("cleanup test", output_file=output)

        mp3 = output.replace(".wav", ".mp3")
        assert mp3 in removed

    @pytest.mark.asyncio
    async def test_ffmpeg_hint_shown_on_error(self, mock_edge_tts, monkeypatch, capsys, tmp_path):
        """When pydub fails and ffmpeg is not in PATH, print a hint."""
        import sys
        from alexa_mcp.tts import speak_text as _speak_text

        # Simulate pydub AudioSegment.from_mp3 raising an exception
        broken_segment = MagicMock()
        broken_segment.from_mp3.side_effect = Exception("ffmpeg not found")
        broken_pydub = MagicMock()
        broken_pydub.AudioSegment = broken_segment
        monkeypatch.setitem(sys.modules, "pydub", broken_pydub)

        # Ensure ffmpeg is not in PATH
        monkeypatch.setenv("PATH", "/usr/bin:/bin")

        output = str(tmp_path / "out.wav")
        # Should not raise — errors are caught internally
        await _speak_text("broken", output_file=output)

        captured = capsys.readouterr()
        # Verify it printed the error (doesn't crash)
        assert "Error playing audio" in captured.out
