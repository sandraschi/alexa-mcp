# Alexa MCP - Industrial Acoustic Bridge

[![FastMCP Version](https://img.shields.io/badge/FastMCP-3.2.0-blue?style=flat-square&logo=python&logoColor=white)](https://github.com/sandraschi/fastmcp) [![Ruff](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/astral-sh/ruff/main/assets/badge/v2.json)](https://github.com/astral-sh/ruff) [![Linted with Biome](https://img.shields.io/badge/Linted_with-Biome-60a5fa?style=flat-square&logo=biome&logoColor=white)](https://biomejs.dev/) [![Built with Just](https://img.shields.io/badge/Built_with-Just-000000?style=flat-square&logo=gnu-bash&logoColor=white)](https://github.com/casey/just)
<p align="center">
  <img src="https://img.shields.io/badge/Status-Industrial-cyan?style=for-the-badge&logo=probot&logoColor=white" alt="Industrial Status"/>
  <img src="https://img.shields.io/badge/Standard-SOTA%20v14.1-blue?style=for-the-badge&logo=github&logoColor=white" alt="SOTA Standard"/>
  <img src="https://img.shields.io/badge/Audio-Acoustic%20Bridge-orange?style=for-the-badge&logo=sounddevice&logoColor=white" alt="Audio Bridge"/>
</p>

##  "The Pulse of the Smart Home"
Transform your AI into a physical presence. The **Alexa Acoustic Bridge** allows agentic AI to issue verbal commands to Alexa devices and hear her responses perfectly, bridging the gap between digital intelligence and physical smart home hardware.

##  Operational Overview
The server acts as a localized proxy. It synthesizes natural language into neural speech for Alexa to hear and uses local inference to transcribe Alexa's ambient audio response back into high-fidelity text.

###  Key Features
- **Neural TTS**: High-clarity commands via `edge-tts` (Aria).
- **Local STT**: Low-latency transcription via `faster-whisper`.
- **Hybrid Transport**: Supports standard MCP Protocol (STDIO) and the Industrial Web Bridge (FastAPI).
- **Industrial Dashboard**: Premium web interface for fleet telemetry and manual interaction.

##  Installation & Orchestration

### Prerequisites
- [uv](https://docs.astral.sh/uv/) (Required for high-performance orchestration)
- Python 3.12+
- `ffmpeg` (Installed on system PATH)

### Quick Start (Protocol Mode)
```bash
uvx alexa-mcp
```

### Industrial Mode (Web Dashboard)
To launch the full control plane:
```powershell
just dev
```
*Or navigate to `web_sota` and run `start.ps1`.*

##  Tool Catalog

| Tool | Action | Description |
| :--- | :--- | :--- |
| `interact` | Command | Full acoustic loop: Speak + Listen (transcribe). |
| `speak_command` | Synthesis | Neural TTS delivery to specified output device. |
| `listen_response`| Capture | High-fidelity STT transcription of Alexa's output. |
| `agentic_query` | Agentic | Samples host to refine queries before acoustic delivery. |
| `docs_help` | Info | Returns technical architecture and protocol docs. |

##  Architecture
The server implements a strict **Instance Separation Pattern**:
- **MCP Server**: Handles JSON-RPC protocol/stdio via FastMCP 3.2.0
- **Web Bridge**: Serves the React Dashboard and REST API via FastAPI.
- **Audio Logic**: Decoupled hardware management via `sounddevice`.

##  Standards & Compliance
- **Doctrine**: Android Robotics Doctrine Compliance v1.2.
- **Registry**: Synchronized with MCP Central Docs.
- **Hardening**: Ruff v14.1, Typed Pydantic models.

---
**By FlowEngineer sandraschi** | *Revolutionizing acoustic smart home orchestration.*


## 🛡️ Industrial Quality Stack

This project adheres to **SOTA 14.1** industrial standards for high-fidelity agentic orchestration:

- **Python (Core)**: [Ruff](https://astral.sh/ruff) for linting and formatting. Zero-tolerance for `print` statements in core handlers (`T201`).
- **Webapp (UI)**: [Biome](https://biomejs.dev/) for sub-millisecond linting. Strict `noConsoleLog` enforcement.
- **Protocol Compliance**: Hardened `stdout/stderr` isolation to ensure crash-resistant JSON-RPC communication.
- **Automation**: [Justfile](./justfile) recipes for all fleet operations (`just lint`, `just fix`, `just dev`).
- **Security**: Automated audits via `bandit` and `safety`.
