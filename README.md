# Alexa MCP - Industrial Acoustic Bridge
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
- **MCP Server**: Handles JSON-RPC protocol/stdio via FastMCP.
- **Web Bridge**: Serves the React Dashboard and REST API via FastAPI.
- **Audio Logic**: Decoupled hardware management via `sounddevice`.

##  Standards & Compliance
- **Doctrine**: Android Robotics Doctrine Compliance v1.2.
- **Registry**: Synchronized with MCP Central Docs.
- **Hardening**: Ruff v14.1, Typed Pydantic models.

---
**By FlowEngineer sandraschi** | *Revolutionizing acoustic smart home orchestration.*
