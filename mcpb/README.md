# alexa-mcp (MCPB Bundle)

Alexa Acoustic Bridge - SOTA v14.1 Industrial MCP Server

## Usage

Add to \claude_desktop_config.json\:
\\\json
{
  "mcpServers": {
    "alexa-mcp": {
      "command": "uv",
      "args": ["run", "--directory", "\D:\Dev\repos", "python", "-m", "alexa_mcp"],
      "env": { "PYTHONPATH": "\D:\Dev\repos/src" }
    }
  }
}
\\\

## Tools

- **list_models**: list_models
- **logs_query**: logs_query
- **logs_stats**: logs_stats
- **logs_export**: logs_export
- **logs_clear**: logs_clear
- **activity_feed**: activity_feed
- **get_playback**: get_playback
- **put_playback**: put_playback
- **post_playback_test**: post_playback_test
- **show_alexa_interaction_status_prefab_card**: show_alexa_interaction_status_prefab_card
- **docs_help**: docs_help
- **speak_command**: speak_command
- **listen_for_response**: listen_for_response
- **interact**: interact
- **agentic_alexa_query**: agentic_alexa_query
- **main_stdio**: main(stdio)
- **main_http**: main(http)
- **main_sse**: main(sse)
- **list_tools**: list_tools
- **execute_tool**: execute_tool
- **chat_bridge**: chat_bridge

## Requirements

- Python 3.12+
- uv
