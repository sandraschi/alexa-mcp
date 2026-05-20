# Alexa MCP - Industrial Acoustic Bridge

<p align="center">
  <a href="https://github.com/casey/just"><img src="https://img.shields.io/badge/just-ready_to_go-7c5cfc?style=flat-square&logo=just&logoColor=white" alt="Just"></a>
  <a href="https://github.com/astral-sh/ruff"><img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/astral-sh/ruff/main/assets/badge/v2.json" alt="Ruff"></a>
  <a href="https://python.org"><img src="https://img.shields.io/badge/Python-3.13+-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python"></a>
  <a href="https://github.com/PrefectHQ/fastmcp"><img src="https://img.shields.io/badge/FastMCP-3.2-7c5cfc?style=flat-square" alt="FastMCP"></a>
</p>

## Quick Start

```powershell
git clone https://github.com/sandraschi/alexa-mcp
cd alexa-mcp
just
```

This opens an interactive dashboard showing all available commands. Run `just bootstrap` to install dependencies, then `just serve` or `just dev` to start.

### Manual Setup

If you don't have `just` installed:

##  "The Pulse of the Smart Home"
Transform your AI into a physical presence. The **Alexa Acoustic Bridge** allows agentic AI to issue verbal commands to Alexa devices and hear her responses perfectly, bridging the gap between digital intelligence and physical smart home hardware.

##  Operational Overview
The server acts as a localized proxy. It synthesizes natural language into neural speech for Alexa to hear and uses local inference to transcribe Alexa's ambient audio response back into high-fidelity text.

###  Key Features
- **Neural TTS**: High-clarity commands via `edge-tts` (Aria).
- **Local STT**: Low-latency transcription via `faster-whisper`.
- **Hybrid Transport**: Supports standard MCP Protocol (STDIO) and the Industrial Web Bridge (FastAPI).
- **Industrial Dashboard**: Premium web interface for fleet telemetry and manual interaction.

##  Documentation

| Where | What |
| :--- | :--- |
| **[CHANGELOG.md](CHANGELOG.md)** | Versioned list of user-visible changes. |
| **This README** | Install, tools, **Alexa+** ecosystem and security, architecture. |
| **Web app → Help** | Acoustic basics, Alexa+ / Austria testing, **Security & access**, automatic **TTS shopping guard** summary. |
| **MCP `docs_help` tool** | Condensed technical protocol + ecosystem notes for clients. |
| **MCP Central** | Fleet mirror: in a clone of `mcp-central-docs`, see `projects/alexa-mcp/README.md` and `CHANGELOG.md`. |

##  Installation & Orchestration

### Prerequisites
- [uv](https://docs.astral.sh/uv/) (Required for high-performance orchestration)
- Python 3.12+
- TTS does **not** require system `ffmpeg`; MP3 is decoded in-process via `miniaudio` and played with `sounddevice`.
- TTS output device and in-app level are configurable in the **Audio** page and stored at `~/.alexa-mcp/playback.json` on the server host.

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

##  Amazon Alexa+ (ecosystem)

Amazon’s generative refresh of the assistant is branded **Alexa+** (often described in press as a “next-generation” or more dialogic Alexa). It is **not** the same as this project’s TTS: Alexa+ runs on **Amazon’s services and compatible Echo / app clients**. This section is **context** for what your acoustic bridge is talking to.

**Rollout (public announcements, 2025–2026).**

- **United States**: Broader availability with Prime bundling and subscription tiers described in Amazon and trade press; see [About Amazon: Alexa+ in the US](https://www.aboutamazon.com/news/devices/alexa-plus-available-free-prime-members-us) and [TechCrunch](https://techcrunch.com/2026/02/04/alexa-amazons-ai-assistant-is-now-available-to-everyone-in-the-u-s).
- **United Kingdom**: European launch with **Early Access** from **19 March 2026** (first market in that wave called out in Amazon’s own post). See [About Amazon: international launch](https://www.aboutamazon.com/news/devices/alexa-plus-international-launch) and [MacRumors](https://www.macrumors.com/2026/03/19/amazons-alexa-launches-uk-free-early-access/).
- **Other markets** named in the same **About Amazon** international coverage include **Canada**, **Mexico**, and **Italy** alongside the US and UK. **Austria** is *not* listed in those public announcements; treat regional availability as **subject to Amazon’s country pages and device eligibility**, not to this repository.

**Features (stated and observed).**

- **Conversational / LLM-style** answers, memory, and multi-step requests compared with “classic” Alexa, using Amazon’s and partners’ model stack (e.g. Nova and Anthropic, as described in press on the UK launch).
- **Deeper app and “agentic”** flows in supported locales: e.g. reservations, rides, and smart-home control where integrations exist (press cites partners such as **OpenTable**; UK-specific wording and local teams are part of the UK marketing story).
- **Pricing / access**: Prime-included or paid **subscription** model outside Early Access, as described in Amazon and Consumer Reports. Web and app **limited** chat tiers for non-Prime use are part of the US story.

**Public reaction and reviews (synthesis, not a verdict).**

- **Positive themes**: Smarter, more chatbot-like Q&A and smart-home control; meaningful upgrade for people already deep in the Echo ecosystem; **Consumer Reports** notes a large step forward while still hitting glitches ([review](https://www.consumerreports.org/electronics/digital-assistants/amazon-alexa-plus-ai-assistant-review-a1667486499/)). **CNET** emphasizes strong value for **Prime** members who use voice a lot, with caveats for non-Prime price ([column](https://www.cnet.com/tech/services-and-software/a-year-with-alexa-plus-an-ai-thats-worth-it-if-youre-someone-like-me/)).
- **Critical themes**: **WIRED** and other outlets report friction with reliability, over-talking, and misfired device control in real kitchens and living rooms ([WIRED](https://www.wired.com/story/why-is-amazon-alexa-plus-so-bad/)). Aggregators and forums (e.g. **Yahoo Tech** summarizing **Reddit** threads) document **regressions** in basic smart-home behavior, slowness, and “sounds great in demo” pain points ([Yahoo](https://tech.yahoo.com/ai/copilot/articles/alexa-bringer-sorrow-amazon-starts-140000443.html)). The overall picture in third-party writeups is **polarized**: “best Alexa yet” for some, **unacceptable regression** for others, often depending on **hardware generation**, **region**, and **Early Access** status.

**Why this matters for the acoustic bridge**: A physical Alexa may still be on **classic** or **Alexa+** behavior depending on **account, device, and country**. The bridge’s job remains **clear TTS and faithful STT**; richer dialogic behavior lives on **Amazon’s side** when your region and device are eligible.

**Project intent (Austria, testing).** The goal for this work is to use the acoustic bridge in **longer, agentic and more dialogic** loops with Alexa as Alexa+ matures: multi-step commands, back-and-forth, and model-assisted planning **spoken to the device** rather than one-shot phrases. In **Austria**, Alexa+ is not yet in the public rollout lists above, so **end-to-end validation of that vision is not possible here for now**—development stays compatibility-first (clear voice out, reliable transcription in) until the service is available locally or can be tested in a supported region.

**Security, voice shopping, and prompt injection.** A chain that goes **(LLM or other agent) → TTS → Alexa** inherits real-world risk: Alexa can place **Amazon orders** and run other high-impact “do things” skills if your account, Echo, and Shopping settings allow it. A **prompt-injected** or model-hallucinated “command” could theoretically be read aloud and acted on (the tired example: a surprise bulk order of nail files). This project does not implement purchase safeguards. Mitigations are on you and Amazon’s controls: e.g. **turn off or tightly restrict voice purchasing**, use **PINs / confirmation** for orders, cap **1-Click** and default payment exposure, and **never** pipe untrusted or unreviewed model output straight into `speak` when shopping is possible. Treat voice-mediated commerce like production automation: allow lists, human confirmation, or a dedicated low-privilege account.

**Web control plane (roadmap).** The **Industrial dashboard and REST API** are not a fully hardened, authenticated product surface. **Authentication for the web bridge** (and related HTTP entry points) is **intended** before any **untrusted, shared, or internet-exposed** deployment. Until then, run behind a **VPN**, **localhost only**, or another gate you control.

**TTS shopping guard (default on).** Before playing audio, the server runs a **heuristic** on the full string: if it looks like **ordering / buying / cart** language together with an **Amazon / `amazon.com` / Prime Now**-style context, `speak_text` raises and nothing is read aloud. Order **tracking** questions and **Amazon Music / Video**-shaped phrases are *usually* left alone. This is not foolproof. Disable with environment **`ALEXA_SHOPPING_GUARD=0`** (not recommended) if you accept the risk.

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
