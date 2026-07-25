# Alexa Acoustic Bridge Skill

This MCP server provides an acoustic bridge to control physical Alexa devices via Text-to-Speech (TTS) and Speech-to-Text (STT).

## Tools

| Tool | Description |
|------|-------------|
| `interact` | Full acoustic loop: speaks command, listens for response |
| `speak_command` | Synthesizes and plays text via default audio output |
| `listen_for_response` | Records mic audio and transcribes via Whisper |
| `agentic_alexa_query` | Uses host sampling to refine user queries |
| `docs_help` | Returns technical documentation |
| `alexa_mcp_shutdown` | Gracefully shuts down the server |

## Best Practices

1. Prefer `interact` for most use cases — it handles wake word prepending automatically.
2. Use `speak_command` when you only need to issue a command without a response.
3. Use `agentic_alexa_query` for complex natural language requests that need refinement.
4. After issuing important commands, note the response.
