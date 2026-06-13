# Voice Command Bus (alexa-mcp member)

Canonical standard: **`D:\Dev\repos\mcp-central-docs\standards\VOICE_COMMAND_BUS.md`**

alexa-mcp is a **delegate** for the Alexa acoustic bridge — not the wake-word host.

## Spoken example

After wake (via speech-mcp):

> *"alexa what's the weather in Vienna"*

fleet-agent routes to **alexa** → MCP tool **`interact`** (`command`, `wait_for_response`, `timeout`).

## What alexa-mcp still does locally

- **TTS** command to the room (Echo hears it)
- **STT** of Alexa’s spoken reply (timed listen after speak)
- Shopping guard on TTS text

Wake word + operator command capture live in **speech-mcp** + **fleet-agent-mcp**.

## Fleet bridge

Server alias: `alexa` → `http://127.0.0.1:10801/mcp` (see fleet-agent `FLEET_SERVERS`).
