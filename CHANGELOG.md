# Changelog

All notable changes to **alexa-mcp** are documented here. The format is loosely [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.3.0] — 2026-04-21

### Added

- **TTS shopping guard** (`speak_policy`): default-on heuristic that refuses to play lines matching **Amazon / voice-purchase**-shaped phrasing (buy/order/cart + Amazon context). Opt out with `ALEXA_SHOPPING_GUARD=0` (not recommended). Unit tests in `tests/test_speak_policy.py`.
- **Playback control plane**: persisted output device and in-app volume (`~/.alexa-mcp/playback.json`), `GET/PUT /api/audio/playback`, `POST /api/audio/playback/test` (chime / “Hello” for level checks).
- **Web dashboard** (`web_sota`): routes for **Status**, **Audio**, **Logs**, **Help**, **AI Command** (`/chat`) with **Listen after speak** and listen timeout mapped to `interact`.
- **Process log** buffer for the server (in-memory, capped) and API exposure for the Logger UI.
- **Documentation in-repo**: long-form **Amazon Alexa+** context (rollout, features, press synthesis), **Austria testing** note, **security** (voice shopping, prompt injection, web auth roadmap) in the README; mirrored narrative on the **Help** page.
- **`docs_help` MCP tool**: extended with Alexa+ ecosystem, web-bridge roadmap, and TTS shopping guard pointers.

### Changed

- **TTS pipeline**: Edge-TTS → temp MP3 → **miniaudio** decode → **sounddevice** playback (no system **ffmpeg** required for that path). Temp file handling adjusted for more reliable Windows behavior.
- **Ollama / local LLM**: more predictable HTTP client settings (`httpx` `trust_env=False`, IPv4 default for Ollama).
- **Tooling**: Ruff-clean `src` and `tests` (import order, `docs_help` string wrapping, `object` types in web bridge, pytest fixture typing). `verify_setup.py` excluded where still legacy.
- **Timestamps**: interaction log `recorded_at` uses `datetime.now(UTC)`.

### Security

- Documented **LLM → TTS → physical Alexa** risk and **Amazon account** mitigations; shopping guard is a **best-effort** pre-speech block, not a substitute for account controls.

## Earlier releases

Prior iterations shipped the core **FastMCP** acoustic tools (`interact`, `speak_command`, `listen_for_response`, `docs_help`, etc.), **faster-whisper** STT, **edge-tts** synthesis, and the **Industrial** web bridge pattern. For commit-level history, see `git log`.
