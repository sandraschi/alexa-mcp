import pytest

from alexa_mcp.server import app


@pytest.mark.asyncio
async def test_speak_command(mock_tts) -> None:
    """Verify the speak_command tool call."""
    result = await app.call_tool("speak_command", {"text": "Hello Alexa"})
    # FastMCP 3.2 returns ToolResult, we need to check the text content
    text_content = result.content[0].text
    assert "Successfully synthesized" in text_content
    mock_tts.assert_called_once()


@pytest.mark.asyncio
async def test_interact_flow(mock_tts, mock_stt, mock_audio) -> None:
    """Verify the full interact tool flow."""
    result = await app.call_tool("interact", {"command": "what time is it", "wait_for_response": True})

    # Check that "Alexa" was prepended
    mock_tts.assert_called_once()
    args, _ = mock_tts.call_args
    assert args[0].startswith("Alexa,")

    text_content = result.content[0].text
    assert "Alexa Interaction Report" in text_content
    assert "the weather is sunny" in text_content


@pytest.mark.asyncio
async def test_docs_help() -> None:
    """Verify the docs_help tool."""
    result = await app.call_tool("docs_help", {})
    text_content = result.content[0].text
    assert "Alexa MCP Technical Documentation" in text_content
