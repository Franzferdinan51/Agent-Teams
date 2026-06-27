# MoA Integration Design — AgentTeams

## What is MoA (Mixture of Agents)

MoA is a virtual-model pattern where multiple "reference" models analyze a task in parallel, then a single "aggregator" model synthesizes their advice and acts. Reference models have **no tools**, produce **advisory text only**. The aggregator is the **actual acting model** that calls tools and responds to the user.

```
User prompt
    │
    ├── Reference 1 (e.g. technical/coder perspective) ──┐
    ├── Reference 2 (e.g. security perspective) ──────────┤
    └── Reference 3 (e.g. pragmatic perspective) ────────┤
                                                           ▼
                                                   Aggregator Model
                                                   (acts + tools)
```

Source: Hermes Agent MoA (Nous Research) — `agent/moa_loop.py` + `hermes_agent.nousresearch.com/docs/user-guide/features/mixture-of-agents`

---

## Where MoA Fits in AgentTeams

AgentTeams already has two multi-model patterns:
1. **Council deliberation** — adversarial multi-persona debate, consensus voting
2. **Swarm sub-agents** — parallel task execution, each agent has tools

MoA adds a **third distinct pattern**: advisory synthesis. It sits between them conceptually and can be used:
- **Pre-council**: Run MoA to collect expert perspectives before Senate deliberation
- **Post-swarm**: Aggregate sub-agent outputs via MoA instead of manual synthesis
- **Standalone**: Direct MoA invocation for complex single-turn tasks

---

## Architecture

```
moa/
├── config.json              # MoA presets (named configurations)
├── moa-runtime.js          # Core MoA engine (parallel refs + aggregation)
└── moa-presets.js          # Preset resolver + CLI commands

Integration points:
├── council-server.js         # Add /api/moa/* endpoints
├── council-cli.js            # Add `council moa ...` commands
├── councilors.json           # Add moa-councilor entries
└── skills/                  # Add moa-skill/
```

---

## Config Schema

```json
{
  "moa": {
    "default_preset": "default",
    "presets": {
      "default": {
        "reference_models": [
          { "provider": "lmstudio", "model": "qwen3.6-35b-a3b" },
          { "provider": "lmstudio", "model": "supergemma4-26b-uncensored-v2" },
          { "provider": "lmstudio", "model": "qwen3.5-9b" }
        ],
        "aggregator": { "provider": "lmstudio", "model": "qwen3.6-35b-a3b" },
        "reference_temperature": 0.6,
        "aggregator_temperature": 0.4,
        "reference_max_tokens": 1024,
        "enabled": true
      },
      "coding": {
        "reference_models": [
          { "provider": "lmstudio", "model": "qwen3.6-35b-a3b" },
          { "provider": "lmstudio", "model": "gemma-4-26b-a4b" }
        ],
        "aggregator": { "provider": "lmstudio", "model": "qwen3.6-35b-a3b" },
        "reference_temperature": 0.5,
        "aggregator_temperature": 0.3,
        "reference_max_tokens": 768,
        "enabled": true
      },
      "security": {
        "reference_models": [
          { "provider": "lmstudio", "model": "supergemma4-26b-uncensored-v2" },
          { "provider": "lmstudio", "model": "qwen3.6-35b-a3b" }
        ],
        "aggregator": { "provider": "lmstudio", "model": "qwen3.6-35b-a3b" },
        "reference_temperature": 0.7,
        "aggregator_temperature": 0.4,
        "reference_max_tokens": 512,
        "enabled": true
      }
    }
  }
}
```

---

## Runtime API (moa-runtime.js)

```javascript
/**
 * run_moa(prompt, preset_name) → Promise<string>
 * Runs MoA with a named preset. Returns aggregator's final text response.
 * Reference models run in parallel (ThreadPoolExecutor equivalent: Promise.all).
 * Each reference sees the conversation history minus tool calls and system prompts.
 * Failures are non-fatal: failed references become "[model: failed]" notes.
 */
async function run_moa(prompt, preset_name = 'default', conversation_history = []) → string

/**
 * run_moa_with_tools(prompt, preset_name, tool_schemas, tools_fn) → Promise<ToolCall[]|string>
 * Runs MoA and lets the aggregator actually call tools.
 * The aggregator sees reference outputs as injected context.
 * This is the agentic mode: MoA + tools = MoA agent.
 */
async function run_moa_with_tools(prompt, preset_name, tool_schemas, tools_fn) → string

/**
 * list_presets() → Array<{name, ref_count, aggregator, enabled}>
 */
function list_presets() → Array
```

---

## Reference Message Filtering

Reference models receive a sanitized transcript:
- **Included**: user text turns, assistant text turns
- **Excluded**: system prompt, tool_result messages, tool_calls payloads
This prevents: (a) rebilling the system prompt per reference call, and (b) strict providers rejecting orphan tool messages.

---

## Council Server Endpoints

```
GET  /api/moa/presets              → list all presets
GET  /api/moa/presets/:name         → get preset config
POST /api/moa/run                   → {prompt, preset?, history?} → {response, references_used, aggregator_model}
POST /api/moa/run-with-tools        → {prompt, preset?, tools, history?} → {response, tool_calls, references_used}
POST /api/moa/configure             → {preset_name, preset_config} → saved
DELETE /api/moa/presets/:name      → delete preset
```

---

## CLI Integration (council-cli.js)

```bash
# Run MoA with default preset
council moa "should I refactor the auth system?"

# Run MoA with named preset
council moa "audit this code" --preset security

# List presets
council moa list

# Create/update a preset
council moa configure my-preset --references qwen3.6-35b-a3b,supergemma4-26b --aggregator qwen3.6-35b-a3b

# Delete a preset
council moa delete my-preset
```

---

## MCP Tools

```javascript
{
  "name": "moa_run",
  "description": "Run Mixture-of-Agents: multiple reference models analyze in parallel, aggregator synthesizes",
  "inputSchema": {
    "type": "object",
    "properties": {
      "prompt": { "type": "string", "description": "The task or question" },
      "preset": { "type": "string", "description": "Named preset (default: 'default')" },
      "temperature": { "type": "number" },
      "max_tokens": { "type": "number" }
    },
    "required": ["prompt"]
  }
}
```

---

## Implementation Notes

1. **Provider reuse**: Use existing `ProviderManager` from `providers/provider-adapter.js`
2. **Parallel execution**: Use `Promise.all` to fan out reference calls simultaneously
3. **Non-fatal failures**: Each reference is wrapped in try/catch — one failure doesn't kill the MoA
4. **MoA recursion guard**: If a reference model is itself an MoA preset, skip it and note it
5. **Tool calling**: Aggregator can call tools — this is what makes MoA agentic (vs. Hermes which uses MoA only as context for their main agent loop)
6. **Council integration**: `/api/session/start` with `mode: "moa"` runs MoA instead of council deliberation

---

## Key Differences from Existing Patterns

| | Council | Swarm | **MoA** |
|--|--------|-------|---------|
| Models have tools? | No | Yes (each agent) | Aggregator: yes; Refs: no |
| Purpose | Adversarial debate | Parallel task execution | Advisory synthesis |
| Output | Consensus verdict | Task deliverables | Synthesized recommendation |
| Complexity | High (multi-round) | Medium | Low-medium |
| Latency | High (sequential deliberation) | High (parallel tasks) | Medium (parallel refs) |
