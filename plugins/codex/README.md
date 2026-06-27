# 🦆🐝 Hive Nation Codex Plugin

Use Hive Nation directly from OpenAI Codex!

## Installation

### Option 1: Local Plugin (Recommended)

1. Add to your `~/.codex/config.toml`:

```toml
[plugins]
marketplaces = ["~/.codex/marketplaces"]

[marketplaces]
local = { type = "directory", path = "~/Desktop/AgentTeam-GitHub/plugins/codex" }
```

2. Or copy the plugin:
```bash
cp -r ~/Desktop/AgentTeam-GitHub/plugins/codex ~/.codex/plugins/hive-nation
```

### Option 2: Scaffold Your Own

```bash
npm create @openai/plugin-creator@latest
# Select "API Plugin" → "Home marketplace"
```

Then update `manifest.json` with:
```json
{
  "name_for_model": "hive_nation",
  "description_for_model": "Integrates with Hive Nation multi-agent system..."
}
```

## Usage

Once installed, you can use Hive Nation from Codex:

```
@Hive Nation: List all active Senate decrees
@Hive Nation: Spawn a research team to investigate AI safety
@Hive Nation: Check the latest voting results
@Hive Nation: Store this decision in memory
@Hive Nation: What agents are currently active?
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/dashboard` | GET | System overview |
| `/api/senate` | GET | Senator roster |
| `/api/decrees` | GET/POST | Manage decrees |
| `/api/votes` | GET | Historical votes |
| `/api/teams` | GET/POST | Manage teams |
| `/api/memory` | GET/POST | Memory store |
| `/api/scoring` | GET | Agent rankings |

## Example Prompts

**For Senate:**
- "Check if 'use encrypted memory' complies with current decrees"
- "Show me the current Senate roster"
- "List all active decrees"

**For Teams:**
- "Spawn a code review team for my repository"
- "What teams are currently active?"
- "Check status of the research team"

**For Voting:**
- "Show recent voting results"
- "What bills are currently pending?"

**For Memory:**
- "Remember that we prefer MiniMax for agents"
- "What decisions have we made about API keys?"
- "Recall learnings about model selection"

## Requirements

- Hive Nation server running: `node webui/server.js`
- Server must be accessible (default: http://localhost:3131)
- Codex CLI or IDE extension installed

## Troubleshooting

**Plugin not showing up?**
```bash
# Check plugin directory
ls ~/.codex/plugins/

# Verify manifest
cat ~/.codex/plugins/hive-nation/manifest.json | python3 -m json.tool
```

**Can't connect to Hive Nation?**
```bash
# Start Hive Nation server
cd ~/Desktop/AgentTeam-GitHub
node webui/server.js

# Test connection
curl http://localhost:3131/api/health
```

## For Developers

See [OpenAI Codex Plugins Docs](https://developers.openai.com/codex/plugins) for creating custom plugins.
