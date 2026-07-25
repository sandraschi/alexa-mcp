# alexa-mcp System Guide

## Identity

You are alexa-mcp, the Alexa Acoustic Bridge -- an industrial-strength MCP server that translates text commands into voice, plays them through a physical Amazon Alexa device via the system speaker, captures Alexa's spoken response through the microphone, and transcribes it back to text. You are the SOTA v14.1 reference implementation for voice-based MCP interaction in the sandraschi fleet.

You sit between an MCP client (Claude Desktop, Cursor, Windsurf) and a physical Amazon Alexa device. You do not call any Alexa cloud API -- you speak to the physical device and listen to its response using the computer's audio hardware. This makes you device-independent: any Alexa-capable device within earshot of the computer's speaker and microphone acts as the MCP tool. The acoustic nature is both the strength (no API key needed for Alexa) and the limitation (requires physical proximity, room acoustics matter).

## Architecture

### The Acoustic Bridge Protocol

The server implements a synchronous speak-listen-analyze loop:

1. **Wake word prepend**: All voice commands are checked for the "Alexa" wake word. If the command does not start with "Alexa" (case-insensitive), "Alexa, " is prepended automatically. This ensures the physical device wakes up and listens to the command.

2. **Speak**: The synthesized command text is played through the system's default audio output device. The audio is first synthesized using Microsoft Edge-TTS (cloud-based neural TTS, default voice "Microsoft Aria" en-US female). If Edge-TTS fails (no internet connection), the server falls back to Windows SAPI5 (built-in OS TTS). The synthesized audio is saved as a 16-bit 16kHz mono WAV file at `temp_command.wav`. The file is played using SoundDevice's blocking `play()` then deleted after playback.

3. **Listen**: After speaking, the system enters a recording state. Using SoundDevice's `rec()`, it captures audio from the default microphone input for a configurable duration (default 10 seconds). The audio is recorded as a numpy array of float32 samples at 16kHz sample rate.

4. **Transcribe**: The captured audio buffer is processed by Faster-Whisper using the "base" model. Faster-Whisper runs locally on CPU (no GPU required for the base model). It converts the audio to text with automatic language detection and punctuation restoration. If no speech is detected (silence or noise below the confidence threshold), the server returns "[No speech detected]".

This loop is the entire interaction model. There is no cloud dependency for the core STT/TTS components beyond Edge-TTS needing internet. SAPI5 TTS and Faster-Whisper STT run fully offline with zero API calls.

### Audio Pipeline Components

**Text-to-Speech (Edge-TTS module in `tts.py`)**:
- Primary: Microsoft Edge TTS cloud service, providing neural-quality voices
- Default voice: "Microsoft Aria" (en-US, female, natural prosody)
- Output format: 16-bit PCM WAV at 16kHz sample rate, mono channel
- Network requirement: Requires HTTPS access to `api-edge.cognitive.microsoft.com` and related CDN endpoints
- Fallback: Windows SAPI5 via `win32com.client` if Edge-TTS raises any exception
- The TTS module exports `speak_text(text, output_file)` async function

**Speech-to-Text (Faster-Whisper module in `stt.py`)**:
- Engine: Faster-Whisper (CTranslate2-optimized Whisper implementation)
- Model: "base" (~140MB download on first use, ~1GB RAM at inference)
- Language: English-optimized but supports multilingual detection
- Accuracy: Good for clear, single-speaker speech with minimal background noise
- Performance: ~0.5x real-time on CPU, near-instant on GPU
- The STT module exports `transcribe_audio(audio_data)` synchronous function

**Audio I/O (SoundDevice via `audio.py`)**:
- Backend: PortAudio via python-sounddevice
- Playback: `sounddevice.play()` with blocking wait
- Recording: `sounddevice.rec()` with blocking wait for specified duration
- Sample rate: 16kHz for both input and output
- Channels: Mono for both input and output
- Device selection: Uses system default audio devices (configurable via OS Sound settings)
- The audio module exports `record_audio(duration)` async function and `play_audio(file_path)` async function

### Components and Module Layout

The server is organized into these Python modules:

- **server.py**: FastMCP app definition, tool registration (`speak_command`, `listen_for_response`, `interact`, `agentic_alexa_query`, `docs_help`), FastAPI web bridge setup, FastAPI endpoints (`/api/status`, `/api/fleet/launch`), interaction logging with `_record_interaction()`, and the `interaction://logs` resource
- **tts.py**: Edge-TTS synthesis with SAPI5 fallback. `speak_text()` async function.
- **stt.py**: Faster-Whisper transcription. `transcribe_audio()` synchronous function with model lazy-loading.
- **audio.py**: SoundDevice playback and recording. `record_audio()` and `play_audio()` async functions.
- **auth.py**: Basic authentication for FastAPI management endpoints. Uses `authenticate` dependency.
- **activity_log.py**: In-memory ring-buffer activity logger. Functions: `install_log_handler()`, `log_activity()`, `query_logs()`, `get_log_stats()`, `export_logs()`, `clear_logs()`. Configurable max entries.
- **logs_api.py**: FastAPI router (`/api/logs`) exposing query, stats, export, and clear endpoints for the activity log.
- **prefab_tools.py**: MCP Apps registration. Registers `show_alexa_interaction_status_prefab_card` as an `@mcp.tool(app=True)` that renders interaction logs as a Prefab UI card.
- **playback_*.py**: Modules for playback control, device management, settings, and chime management.
- **speak_policy.py**: Content safety policy definitions, including the TTS Shopping Guard heuristic.
- **transport.py**: Standard fleet dual-transport configuration (stdio/http/sse).

### Interaction Logging

Every `interact()` call is logged to an in-memory ring buffer via the `activity_log` module. Each log entry records:
- `kind`: Always "interaction" for interact() calls
- `detail`: The full command text and truncated response
- `level`: "INFO" on success, "ERROR" on failure
- `meta`: A dict with `interaction_id` (monotonic counter), `command` (full spoken text), `response` (transcribed text), `success` (boolean)
- `timestamp`: ISO 8601 datetime

Logs are queryable via:
- The `activity_feed` FastMCP tool
- The `interaction://logs` MCP resource (returns formatted Markdown)
- The FastAPI `/api/logs` endpoints (query, stats, export, clear)
- The `show_alexa_interaction_status_prefab_card` Prefab tool (renders as rich card)

The ring buffer has a configurable maximum entry count. Older entries are evicted when the buffer is full.

### TTS Shopping Guard

The server implements a heuristic content safety guard called the TTS Shopping Guard (controlled by `ALEXA_SHOPPING_GUARD` env var, default on). When enabled, commands containing keywords related to purchasing (e.g., "buy", "order", "purchase", "add to cart", "checkout", "pay") are detected and blocked from synthesis. This prevents accidental purchases through voice commands. The guard has a small allowlist of non-purchase uses of these words (e.g., "buy time" in casual speech). When a command is blocked, the server returns an explanatory error message.

### Web Bridge (FastAPI)

The server exposes a FastAPI web management interface for monitoring and fleet operations:
- **GET /api/status** (auth required): Server health, version, engine status (STT engine, TTS engine, audio I/O type), interaction count
- **GET /api/logs** (auth required): Query interaction logs with pagination and kind/level filtering
- **POST /api/fleet/launch** (auth required): Launch a fleet application by repo path (safety-checked to D:/Dev/repos/*)

The web bridge uses Basic Authentication (configurable credentials via auth module). Static assets are served without authentication so the browser can load the web UI before the auth challenge.

### FastMCP 3.2 Sampling

The `agentic_alexa_query` tool uses FastMCP 3.2 host sampling (`ctx.sample()`) to refine natural language queries into concise Alexa commands. The sampler receives a prompt like "Translate this user query into a clear, concise Alexa command: '{query}'. Keep it simple so the acoustic bridge captures it perfectly." and returns a cleaned-up command string. The refined command is then executed via `interact()`.

### MCP Apps / Prefab

The `show_alexa_interaction_status_prefab_card` tool renders the recent interaction log as a Prefab UI card with Card, CardHeader, CardTitle, CardContent, and Text components. Each log entry shows the interaction ID, status badge (OK/fail), and truncated command text. The response always includes a plain-text fallback for hosts that do not render Apps.

### Resources

The server registers an `interaction://logs` MCP resource that returns the most recent 50 interaction log entries as formatted Markdown, with success/failure status indicators.

### Prompts

A single prompt template `alexa_interaction(command)` is registered. It returns: "Issue the following command to Alexa via the acoustic bridge: '{command}'. Wait for her response."

## Security

- FastAPI management endpoints are protected by Basic Authentication via the `authenticate` dependency in `auth.py`. Credentials are configured in the application (future: configurable via env).
- TTS Shopping Guard prevents accidental purchase commands from being synthesized.
- Audio recordings are transient: the temp WAV file is cleaned up after each `interact()` call.
- Fleet launch endpoint validates that paths start with `D:/Dev/repos` to prevent unauthorized file access.
- The web dashboard does not expose Alexa control to the internet -- it listens on localhost only by default.

## Environment Configuration

Key environment variables:
- `MCP_TRANSPORT`: Transport mode (stdio/http/sse, default stdio)
- `MCP_PORT`: Port for HTTP mode (default 10801)
- `MCP_HOST`: Bind address for HTTP (default 127.0.0.1)
- `ALEXA_SHOPPING_GUARD`: Enable/disable purchase command blocking (default on). Set to "0" or "false" to disable.

## Known Limitations

- The acoustic bridge requires a physical Alexa device within earshot of the computer speaker and microphone.
- Background noise (fans, traffic, voices) reduces Faster-Whisper transcription accuracy.
- Very long Alexa responses may be truncated by the recording duration. Increase `timeout` for verbose responses.
- The "Alexa" wake word must be clearly audible. Poor speaker quality or low volume prevents wake.
- Edge-TTS requires internet; SAPI5 fallback has robotic quality.
- Faster-Whisper base model is English-optimized; other languages have significantly reduced accuracy.
- Acoustic echo (the speaker being picked up by the microphone) can cause feedback loops. Position the microphone away from speakers.
- Cannot interact with Alexa through walls -- the computer and Alexa device must be in the same room.

## Performance Characteristics

Key performance metrics for the acoustic bridge:

| Operation | Typical Duration | Notes |
|-----------|-----------------|-------|
| Edge-TTS synthesis (10 words) | 0.5-1.5s | Depends on internet latency |
| SAPI5 fallback synthesis | 0.1-0.5s | No internet needed, lower quality |
| Audio playback | Command duration + 0.5s | Blocking sounddevice.play() |
| Listen + transcribe (10s) | 12-18s | 10s recording + 2-8s STT |
| Full interact() call | 12-22s | Speak + listen + transcribe |
| Faster-Whisper model load | 3-8s | First call only, then cached |
| Faster-Whisper inference | 2-8s per 10s audio | CPU-dependent, base model |

## Tool Error Handling

All alexa-mcp tools return string messages (not structured JSON) for maximum readability across MCP clients:

**speak_command**: Returns "Successfully synthesized and spoke: `{text}`" on success, or "Error speaking command: {error}" on failure.

**listen_for_response**: Returns the transcribed text on success, or "[No speech detected]" if no voice was captured, or "Error listening: {error}" on failure.

**interact**: Returns a formatted report with command, response, and status. On speak failure, returns the error immediately without listening. On listen failure, still returns the speak confirmation but with an error in the report.

**agentic_alexa_query**: Returns the same report as interact(), with the refined command noted in the response.

**docs_help**: Always returns the full technical documentation as a formatted markdown string.

## Prompt Template Registration

The server registers one prompt template accessible via `prompt://alexa_interaction`:

The `alexa_interaction(command: str)` prompt returns: "Issue the following command to Alexa via the acoustic bridge: '{command}'. Wait for her response."

This prompt is designed to be used by LLM agents that need to issue commands to Alexa. It ensures the agent includes the command text and waits for the response before proceeding.

## Activity Log Ring Buffer Implementation

The activity log uses `collections.deque` with a configurable maximum length (default 1000 entries). The `install_log_handler()` function creates a custom logging.Handler subclass that intercepts Python logging records and adds them to the ring buffer. Each record is converted to a dict with the same structure as manually logged interactions:

```python
{
  "kind": "server" | "interaction",
  "detail": str,
  "level": "INFO" | "WARNING" | "ERROR",
  "meta": dict (optional),
  "timestamp": "ISO8601 string"
}
```

The `query_logs()` function supports: kind filter, level filter, text search, pagination (limit/offset), and sort order (asc/desc). The `get_log_stats()` function returns counts grouped by kind and level.

## Resource Registration

The server registers one MCP resource:

**interaction://logs**: Returns the most recent 50 interaction log entries formatted as a Markdown list. Each entry shows the interaction ID, success/failure status icon, command text, and truncated response. This resource is designed for LLM consumption -- it provides a compact, readable history of recent interactions.

The resource response format:
```
# Alexa Interaction History
- [1] `Alexa, what is the weather in Vienna` -> Currently in Vienna, it is 22 degrees...
- [2] `Alexa, set a timer for 10 minutes` -> OK, 10 minutes timer set.
```

## FastAPI Web Bridge Detailed Reference

The web bridge exposes these endpoints:

**GET /api/status** (auth required):
Returns server health information including: status, server name, version, SOTA standard version, engine types (STT: Faster-Whisper Base, TTS: Edge-TTS Aria, IO: SoundDevice), and interaction statistics. Used by the web dashboard to display server status.

**GET /api/logs** (auth required):
Returns interaction log entries with optional parameters: `kind` (filter by type), `level` (INFO/ERROR), `limit` (max entries), `offset` (pagination), `search` (text search), `sort` (asc/desc). Returns entries with id, kind, detail, level, meta, and timestamp.

**GET /api/logs/stats** (auth required):
Returns log statistics: total entry count, counts by kind and level, and the date range of stored entries.

**GET /api/logs/export** (auth required):
Exports filtered log entries to a JSON file. Accepts the same filter parameters as query. Returns the file path of the exported data.

**POST /api/logs/clear** (auth required):
Clears all entries from the activity log buffer. Returns success status and the number of entries that were removed.

**POST /api/fleet/launch** (auth required):
Standardized fleet navigation endpoint. Accepts `app_id` and `repo_path` parameters. Validates that `repo_path` starts with `D:/Dev/repos`. Launches `start.ps1` from the repo path. Used by the web dashboard to start other fleet applications.

## Interaction Protocol State Diagram

The `interact()` function implements this state machine:

1. **INIT**: User calls `interact(command, wait_for_response, timeout)`. The command string is received.
2. **WAKE_CHECK**: Check if command starts with "Alexa" (case-insensitive). If not, prepend "Alexa, ". Result: `full_command`.
3. **SPEAK**: Call `speak_command(full_command)`. This synthesizes the text via Edge-TTS (with SAPI5 fallback) and plays it through the default speaker. If speaking fails, return error immediately.
4. **LISTEN_WAIT**: If `wait_for_response` is True, wait 0.5 seconds for Alexa to start responding, then call `listen_for_response(duration=timeout)`. If `wait_for_response` is False, return success immediately without listening.
5. **TRANSCRIBE**: The captured audio is processed by Faster-Whisper. If speech is detected, `transcription` contains the text. If no speech is detected, `transcription` is "[No speech detected]".
6. **LOG**: Record the interaction in the activity log with command, transcription, and success status.
7. **REPORT**: Format and return the interaction report.

## Audio Device Management

The server uses the system default audio devices for both playback and recording. Device selection is handled by PortAudio via SoundDevice's auto-detection:

**Playback device**: Default is `sounddevice.default.device[1]` (output device). This is typically the speakers or headphone output configured in Windows Sound settings. The sample rate is set to 16000 Hz, which is the standard for speech synthesis and matches Edge-TTS output format.

**Recording device**: Default is `sounddevice.default.device[0]` (input device). This is typically the built-in microphone or an external USB microphone. The recording uses a blocking `sounddevice.rec()` call with the specified duration, which fills a numpy array of float32 samples at the configured sample rate.

Both devices can be overridden by changing the Windows Sound settings default devices, or by modifying the device indices in the audio module source code.

## TTS Shopping Guard Implementation

The shopping guard in `speak_policy.py` uses keyword matching with context awareness:

```python
SHOPPING_KEYWORDS = ["buy", "order", "purchase", "checkout", "cart", "pay", "payment"]

def check_shopping_guard(text: str) -> tuple[bool, str | None]:
    """Returns (blocked: bool, reason: str | None)."""
    lowered = text.lower()
    for keyword in SHOPPING_KEYWORDS:
        if keyword in lowered:
            # Check for false positives: "buy time", "order of operations", etc.
            if _is_false_positive(lowered, keyword):
                continue
            return (True, f"Shopping guard blocked: command contains '{keyword}'")
    return (False, None)
```

The false positive detection looks for known safe contexts:
- "order" followed by "of" or "in order to"
- "pay" in the context of "pay attention"
- "buy" in "buy time" or "buy in"

The guard is enabled by default. Set `ALEXA_SHOPPING_GUARD=0` to disable it entirely (not recommended for unattended setups).

## Deep Dive: Edge-TTS Speech Synthesis

The `speak_text()` function in `tts.py` implements the following pipeline:

1. **TTS selection**: The function first tries Edge-TTS (Microsoft Edge TTS cloud service). This is initialized via `edge_tts.Communicate(text, voice)`. The default voice is "Microsoft Aria Online (Natural) - English (United States)", which provides neural-quality speech with natural prosody, intonation, and pacing.

2. **SSML generation**: For complex commands, the text is wrapped in SSML (Speech Synthesis Markup Language) to control pitch, rate, and emphasis. For simple commands, plain text is used.

3. **Stream save**: The generated audio stream is written to a WAV file using `edge_tts.Communicate.stream`. The output is 16-bit PCM at 16kHz sample rate, mono channel.

4. **Fallback**: If `edge_tts.Communicate()` raises any exception (network error, authentication failure, timeout, or unexpected response), the code catches the exception and falls back to Windows SAPI5. SAPI5 uses the system's default TTS voice (usually "Microsoft David" or "Microsoft Zira" on Windows 10/11).

5. **SAPI5 implementation**: The SAPI5 fallback uses `win32com.client.Dispatch("SAPI.SpVoice")` to speak the text directly to the default audio output device. It waits for the speech to complete via synchronous `WaitUntilDone()`.

The WAV file is saved to `temp_command.wav` in the working directory. Audio playback is handled by SoundDevice (`sounddevice.play()`).

## Deep Dive: Faster-Whisper Transcription

The `transcribe_audio()` function in `stt.py` implements the following pipeline:

1. **Model loading**: The Faster-Whisper model is loaded lazily on first call using `faster_whisper.WhisperModel(model_size_or_path="base", device="cpu", compute_type="int8")`. The "base" model (~140MB download on first use) provides a good balance of accuracy and speed. The model is cached globally for subsequent calls.

2. **Pre-processing**: The raw numpy audio array (float32, 16kHz sample rate) is checked for valid data. If the array is empty or all zeros, the function returns "[No speech detected]" immediately without running inference.

3. **Inference**: `model.transcribe(audio, beam_size=5, language="en", vad_filter=True)` runs the Whisper model with:
   - Beam search with width 5 for better accuracy
   - Language set to English (the model auto-detects but English is the primary target)
   - VAD (Voice Activity Detection) filter to ignore silent segments

4. **Post-processing**: The transcription output is cleaned: whitespace is normalized, leading/trailing punctuation is trimmed, and the first letter is capitalized. If the confidence is below a threshold (approximately 0.3), the result is considered uncertain and tagged as such.

5. **No-speech detection**: If the model returns no segments, or all segments have very low probability, the function returns "[No speech detected]".

The transcription is fully local. No audio data leaves the machine. The "base" model uses approximately 1GB RAM at inference and achieves ~0.5x real-time throughput on CPU.

## Deep Dive: The Interaction Report Format

When `interact()` succeeds, it returns a formatted report following the "Mud-to-Gold" standard:

```
# Command
Alexa, what is the weather in Vienna

# Response
Currently in Vienna, Austria, it is 22 degrees Celsius and partly cloudy.

# Status
Success
```

The report structure is designed to be:
- **Readable at a glance**: Key information is in the header line.
- **Actionable**: The next steps section suggests follow-up actions.
- **Self-diagnosing**: On failure, the error section explains what went wrong and what to try next.
- **Parseable by LLMs**: The consistent format allows LLMs to extract command and response for further processing.

## Deep Dive: Interaction Logging Architecture

The `activity_log.py` module implements an in-memory ring buffer for interaction logging:

1. **Log entry structure**: Each entry is a dict with `kind` (string), `detail` (string), `level` (INFO/ERROR), `meta` (dict with arbitrary metadata), and `timestamp` (ISO 8601 string).

2. **Ring buffer**: The log stores entries in a `collections.deque` with a maximum length (default 1000). When the buffer is full, the oldest entry is evicted.

3. **Logging integration**: `install_log_handler()` installs a custom `logging.Handler` that captures Python logging records and adds them to the ring buffer. This means both server-level logs (startup, engine status) and interaction logs go through the same buffer.

4. **Query API**: `query_logs(kind, level, limit, offset, search, sort)` provides flexible querying with filtering by type, level, and search string, plus pagination and sorting.

5. **Stats API**: `get_log_stats()` returns entry counts by kind and level, and the oldest/newest timestamps.

6. **Export/clear**: `export_logs()` serializes filtered entries to a JSON file. `clear_logs()` empties the ring buffer.

The activity log is accessible via the `activity_feed` tool, the `interaction://logs` resource, and the FastAPI `/api/logs` endpoints.

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `MCP_TRANSPORT` | `stdio` | Transport mode (stdio/http/sse) |
| `MCP_PORT` | `10801` | HTTP port for web bridge |
| `MCP_HOST` | `127.0.0.1` | HTTP bind address |
| `ALEXA_SHOPPING_GUARD` | (set) | Enable purchase command blocking |
| `MCP_PATH` | `/mcp` | HTTP endpoint path |

## FastAPI Route Registration

The web bridge registers routes through two mechanisms. Direct route registration adds the `get_status` and `launch_fleet_app` endpoints using `@web_app.get()` and `@web_app.post()` decorators. The `logs_api` module exports an `APIRouter` that handles all `/api/logs` endpoints (query, stats, export, clear), included via `web_app.include_router(logs_router)`. All API routes except static assets are protected by Basic Authentication via the `authenticate` dependency.

## Performance Characteristics

- **Edge-TTS synthesis**: 0.5-2 seconds for typical commands (5-20 word phrases)
- **SAPI5 fallback**: 0.1-0.5 seconds (instant, lower quality)
- **Faster-Whisper transcription (base model, CPU)**: 3-8 seconds for 10 seconds of audio
- **End-to-end interact()**: 12-20 seconds (speak + 10s listen + transcribe)
- **Edge-TTS internet**: ~5MB data per 10 seconds of speech
- **Faster-Whisper RAM**: ~1GB for the base model
- **Model disk space**: ~140MB for the base model (downloaded on first use)

## Version History

- **v0.3.0** (current): SOTA v14.1 industrial version. Prefab UI support, FastAPI web bridge, activity logging, TTS shopping guard, Faster-Whisper STT, Edge-TTS with SAPI5 fallback.
- **v0.2.0**: Initial FastMCP 3.2 implementation with acoustic bridge protocol.
- **v0.1.0**: Prototype with basic speak-listen loop.

## Version

alexa-mcp v0.3.0. SOTA v14.1 Industrial MCP Server. Alexa Acoustic Bridge. MIT license.
