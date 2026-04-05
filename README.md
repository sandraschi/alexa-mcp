# Alexa MCP Server

An MCP server that acts as an acoustic bridge to control an Alexa device. It uses Text-to-Speech (TTS) to issue commands to a physical Alexa device via speakers, and Speech-to-Text (STT) to listen to Alexa's responses via a microphone.

## Technical Architecture
- **TTS Engine**: `edge-tts` (Neural speech synthesis)
- **STT Engine**: `faster-whisper` (Base model, Int8 quantized)
- **Audio I/O**: `sounddevice` / `pydub`
- **Framework**: `FastMCP` (Python)

## Prerequisites
- **Hardware**: A computer with Speakers and a Microphone, placed near an Alexa device (Echo Dot, etc.).
- **Software**: 
  - Python 3.10+
  - `ffmpeg` installed and on PATH (required for audio conversion).

##  Installation

### Prerequisites
- [uv](https://docs.astral.sh/uv/) installed (RECOMMENDED)
- Python 3.12+

###  Quick Start
Run immediately via `uvx`:
```bash
uvx alexa-mcp
```

###  Claude Desktop Integration
Add to your `claude_desktop_config.json`:
```json
"mcpServers": {
  "alexa-mcp": {
    "command": "uv",
    "args": ["--directory", "D:/Dev/repos/alexa-mcp", "run", "alexa-mcp"]
  }
}
```
## Usage

Run the server:
```bash
mcp run src/alexa_mcp/server.py
```
Or use the MCP CLI / Inspector.

### Tools

- `speak_command(text: str)`: Speaks the given text.
- `listen_response(duration: int = 10)`: Listens for `duration` seconds and returns transcription.
- `interact(command: str, wait_for_response: bool = True, timeout: int = 10)`: Speaks "Alexa, {command}" (or just command if it starts with Alexa) and returns the response.

## Troubleshooting

- **Audio Device Error**: Ensure your default input/output devices are correctly set in OS settings or specify device indices in `audio.py` if needed.
- **FFmpeg missing**: Install FFmpeg (`winget install ffmpeg` on Windows).


## Web Dashboard
The server includes a web interface for monitoring and manual control.
- **Web Port**: `10800`
- **Backend API**: `10801`

To launch:
1. Navigate to `/web_sota`.
2. Run `start.bat` or `start.ps1`.
3. Access `http://localhost:10800`.
