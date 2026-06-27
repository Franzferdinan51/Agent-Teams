# Agent Teams MoA — OpenClaw Plugin

**Mixture of Agents (MoA)** for OpenClaw. Based on [Hermes Agent MoA](https://hermes-agent.nousresearch.com) by [Nous Research](https://nousresearch.com).

Exposes 5 native OpenClaw tools — no CLI needed, agents call MoA directly as a tool.

## Tools

| Tool | Description |
|------|-------------|
| `moa_run` | Run MoA with a prompt and preset |
| `moa_list_presets` | List all available presets |
| `moa_get_preset` | Get full config of a preset |
| `moa_save_preset` | Create or update a preset |
| `moa_delete_preset` | Delete a preset |

## Setup

### 1. Install

```bash
cd /path/to/Agent-Teams
openclaw plugins install --link ./moa/openclaw-plugin
```

### 2. Start council-server.js

```bash
cd /path/to/Agent-Teams
node council-server.js
```

The plugin calls `http://localhost:3007` by default. Set `COUNCIL_SERVER_URL` env var or `councilUrl` in plugin config to change.

### 3. Restart OpenClaw

```bash
openclaw gateway restart
```

## Configuration

```json
{
  "plugins": {
    "entries": {
      "agent-teams-mo": {
        "enabled": true,
        "config": {
          "councilUrl": "http://localhost:3007",
          "defaultPreset": "default"
        }
      }
    }
  }
}
```

## Usage Examples

```
User: How should I structure the auth module?

Agent calls: moa_run({ prompt: "How should I structure the auth module?", preset: "coding" })
→ Returns: Reference perspectives + aggregator synthesis
```

```
User: List available presets
Agent calls: moa_list_presets({})
→ Returns: Table of all presets with model counts
```

## Presets

| Preset | Refs | Aggregator | Best For |
|--------|------|------------|----------|
| `tiny` | 1 | qwythos 9B | Testing, fast feedback |
| `default` | 3 | ornith 35B | General analysis |
| `coding` | 2 | ornith 35b | Architecture, code review |
| `security` | 2 | ornith 35B | Security audits |

See `moa/config.json` for full preset definitions.

## Requirements

- OpenClaw >= 2026.5.17
- `council-server.js` running with MoA endpoints enabled
- Node.js >= 18
