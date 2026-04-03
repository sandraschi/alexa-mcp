"""Tests for alexa_mcp.server — MCP tools tested with mocked I/O."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch


class TestSpeakCommand:
    @pytest.mark.asyncio
    async def test_returns_spoke_message(self):
        from alexa_mcp.server import speak_command

        with patch("alexa_mcp.server.speak_text", new=AsyncMock(return_value=None)):
            result = await speak_command("hello world")

        assert "hello world" in result
        assert result.startswith("Spoke:")

    @pytest.mark.asyncio
    async def test_returns_error_on_exception(self):
        from alexa_mcp.server import speak_command

        with patch("alexa_mcp.server.speak_text", new=AsyncMock(side_effect=RuntimeError("boom"))):
            result = await speak_command("broken")

        assert "Error" in result
        assert "boom" in result

    @pytest.mark.asyncio
    async def test_speak_text_called_with_correct_args(self):
        from alexa_mcp.server import speak_command

        speak_mock = AsyncMock(return_value=None)
        with patch("alexa_mcp.server.speak_text", new=speak_mock):
            await speak_command("turn off the lights")

        speak_mock.assert_called_once()
        call_text = speak_mock.call_args[0][0]
        assert call_text == "turn off the lights"


class TestListenForResponse:
    @pytest.mark.asyncio
    async def test_returns_transcription(self):
        from alexa_mcp.server import listen_for_response
        import numpy as np

        with patch("alexa_mcp.server.record_audio", new=AsyncMock(return_value=np.zeros(16000))), \
             patch("alexa_mcp.server.transcribe_audio", return_value="the lights are on"):
            result = await listen_for_response(duration=5)

        assert result == "the lights are on"

    @pytest.mark.asyncio
    async def test_returns_no_speech_when_empty(self):
        from alexa_mcp.server import listen_for_response
        import numpy as np

        with patch("alexa_mcp.server.record_audio", new=AsyncMock(return_value=np.zeros(16000))), \
             patch("alexa_mcp.server.transcribe_audio", return_value=""):
            result = await listen_for_response(duration=3)

        assert result == "[No speech detected]"

    @pytest.mark.asyncio
    async def test_returns_error_on_exception(self):
        from alexa_mcp.server import listen_for_response

        with patch("alexa_mcp.server.record_audio", new=AsyncMock(side_effect=OSError("no mic"))):
            result = await listen_for_response(duration=1)

        assert "Error" in result
        assert "no mic" in result

    @pytest.mark.asyncio
    async def test_default_duration_is_10(self):
        from alexa_mcp.server import listen_for_response
        import numpy as np

        record_mock = AsyncMock(return_value=np.zeros(16000))
        with patch("alexa_mcp.server.record_audio", new=record_mock), \
             patch("alexa_mcp.server.transcribe_audio", return_value="ok"):
            await listen_for_response()

        call_kwargs = record_mock.call_args[1]
        assert call_kwargs.get("duration") == 10.0


class TestInteract:
    @pytest.mark.asyncio
    async def test_prepends_alexa_if_missing(self):
        from alexa_mcp.server import interact
        import numpy as np

        speak_mock = AsyncMock(return_value=None)
        with patch("alexa_mcp.server.speak_text", new=speak_mock), \
             patch("alexa_mcp.server.record_audio", new=AsyncMock(return_value=np.zeros(16000))), \
             patch("alexa_mcp.server.transcribe_audio", return_value="done"):
            result = await interact("turn on lights", wait_for_response=True, timeout=3)

        spoken_text = speak_mock.call_args[0][0]
        assert spoken_text.lower().startswith("alexa")
        assert "turn on lights" in spoken_text

    @pytest.mark.asyncio
    async def test_does_not_double_prepend_alexa(self):
        from alexa_mcp.server import interact
        import numpy as np

        speak_mock = AsyncMock(return_value=None)
        with patch("alexa_mcp.server.speak_text", new=speak_mock), \
             patch("alexa_mcp.server.record_audio", new=AsyncMock(return_value=np.zeros(16000))), \
             patch("alexa_mcp.server.transcribe_audio", return_value="done"):
            await interact("Alexa, what time is it?", wait_for_response=False)

        spoken_text = speak_mock.call_args[0][0]
        assert spoken_text.lower().count("alexa") == 1

    @pytest.mark.asyncio
    async def test_no_response_when_wait_false(self):
        from alexa_mcp.server import interact

        speak_mock = AsyncMock(return_value=None)
        record_mock = AsyncMock()

        with patch("alexa_mcp.server.speak_text", new=speak_mock), \
             patch("alexa_mcp.server.record_audio", new=record_mock):
            result = await interact("hello", wait_for_response=False)

        record_mock.assert_not_called()

    @pytest.mark.asyncio
    async def test_result_contains_command_and_response(self):
        from alexa_mcp.server import interact
        import numpy as np

        with patch("alexa_mcp.server.speak_text", new=AsyncMock(return_value=None)), \
             patch("alexa_mcp.server.record_audio", new=AsyncMock(return_value=np.zeros(16000))), \
             patch("alexa_mcp.server.transcribe_audio", return_value="it is 3pm"):
            result = await interact("what time is it", wait_for_response=True, timeout=5)

        assert "Command:" in result
        assert "Response:" in result
        assert "it is 3pm" in result


class TestMainEntryPoint:
    def test_sys_argv_import_is_correct(self):
        """Regression: server.py must use sys.argv, not os.sys.argv."""
        import ast, pathlib

        src = pathlib.Path("/home/user/alexa-mcp/src/alexa_mcp/server.py").read_text()
        assert "os.sys.argv" not in src, "Bug not fixed: os.sys.argv still present"
        assert "sys.argv" in src

    def test_status_endpoint(self, web_client):
        resp = web_client.get("/api/status")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "online"
        assert data["version"] == "0.1.0"
