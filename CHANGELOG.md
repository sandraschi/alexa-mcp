# Changelog

All notable changes to **alexa-mcp** are documented here. The format is loosely [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **Session archive**: each `interact` turn can persist `ask.mp3`, `listen.wav`, and `turn.json` under `~/.alexa-mcp/sessions/<id>/` (env `ALEXA_SESSION_ARCHIVE`, default on). MCP tool `session_archive` (list/get/delete/export_depot/send_reaper) plus REST `/api/sessions*`. Keepers export to depot-mcp; optional InsertMedia via reaper-mcp (`ALEXA_DEPOT_URL`, `ALEXA_REAPER_URL`).
- **Live output level meter**: `playback_meter` computes real RMS/peak/FFT bars from PCM sent to PortAudio during chime/TTS; optional Windows Stereo Mix loopback via `GET/POST/DELETE /api/audio/level*`. Audio lab UI polls live levels (no fake animation).

## [0.3.1] — 2026-07-25

### Security (Critical)

- **CORS**: Replaced `allow_origins=["*"]` with fleet-standard explicit origins + unconditional Tailscale/LAN regex (`tauri://localhost`, `*.ts.net`, LAN CIDRs).
- **Build pipeline**: `build.ps1` now bundles `.env.example` (not `.env`) to prevent API key leaks. `tauri.conf.json` resources updated accordingly.
- **`.env.example`** created at repo root with documented env vars (no real secrets).

### Added

- **`run_server.py`**: PyInstaller dual-transport entry point for Tauri/NSIS builds.
- **Session context injection**: `.claude-plugin/`, `hooks/`, `.cursorrules`, `.windsurfrules`, `.github/copilot-instructions.md` with tool-awareness prompt.
- **`GET /api/health`** endpoint for liveness probes (dashboard health dot).
- **Tool annotations** (`READONLY`) on all MCP tools.
- **`## Return Format` and `## Examples`** sections in all tool docstrings.
- **`@tauri-apps/api`** dependency in webapp for Tauri event integration.

### Changed

- **`backend.rs`**: Port corrected to 10801 (was 10700). `free_port()` now has multi-layer kill (Stop-Process → taskkill → UAC → 240s poll). Added TCP health poll loop (30×2s).
- **`transport.py`**: Replaced `mcp.run_http_async()` with `uvicorn.Server` on `mcp.http_app()` to preserve CORS middleware.
- **`start.ps1`**: Complete rewrite — port zombie clearing, backend readiness poll, working directory, browser auto-open.
- **`.gitignore`**: Added `*.bak`, `*.mcpb`, `native/target/`, `native/gen/`, `reports/`.
- **`justfile`**: Added `certify`, `build-sidecar`, `build-native`, `mcpb-pack`, `cua-nsis-test` recipes.
- **`tauri.conf.json`**: `frontendDist` corrected to `../web_sota/dist`.
- **`glama.json`**: Added `docs_help` tool to tool list.

### Fixed

- Stale `llms-full.txt` noted for regeneration.
- `pyproject.toml` ruff config — added per-file ignores for `activity_log.py` and `logs_api.py`.
- Formatting in `server.py`, `speak_policy.py`, `transport.py`.

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
