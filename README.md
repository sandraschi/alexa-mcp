# Alexa MCP Server

An MCP server that acts as an acoustic bridge to control an Alexa device. It uses Text-to-Speech (TTS) to issue commands to a physical Alexa device via speakers, and Speech-to-Text (STT) to listen to Alexa's responses via a microphone.

## Features
- **Speak Command**: Synthesizes text to speech and plays it (e.g., "Alexa, turn on the lights").
- **Listen Response**: Records audio from the microphone and transcribes it to text.
- **Interact**: Combines speaking a command and listening for a response in one tool.
- **SOTA Tech Stack**:
  - TTS: `edge-tts` (Neural speech quality, online)
  - STT: `faster-whisper` (High accuracy, local)
  - Audio: `sounddevice`
  - IO: `FastMCP`

## Prerequisites
- **Hardware**: A computer with Speakers and a Microphone, placed near an Alexa device (Echo Dot, etc.).
- **Software**: 
  - Python 3.10+
  - `ffmpeg` installed and on PATH (required for audio conversion).

## Installation

1.  Clone this repository.
2.  Install dependencies:
    ```bash
    pip install .
    ```
    Or use `uv` / `pdm`.

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
