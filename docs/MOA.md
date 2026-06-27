# Mixture of Agents (MoA) — User Guide

**Last Updated:** 2026-06-26
**Status:** ✅ Ready to Use

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [How MoA Works](#2-how-moa-works)
3. [MoA vs Council vs Swarm](#3-moa-vs-council-vs-swarm)
4. [Installation & Setup](#4-installation--setup)
5. [Configuration — Presets Deep Dive](#5-configuration--presets-deep-dive)
6. [CLI Usage](#6-cli-usage)
7. [REST API Reference](#7-rest-api-reference)
8. [Programmatic API (JavaScript)](#8-programmatic-api-javascript)
9. [Adding MoA to Any Project](#9-adding-moa-to-any-project)
10. [Best Practices & Pitfalls](#10-best-practices--pitfalls)
11. [Troubleshooting](#11-troubleshooting)
12. [File Reference](#12-file-reference)

---

## 1. Introduction

### What Is MoA?

**Mixture of Agents (MoA)** is a virtual-model pattern where multiple "reference" models independently analyze the same task in parallel, then a single "aggregator" model synthesizes all of their perspectives into one high-quality response. This implementation is based on the [Hermes Agent MoA](https://hermes-agent.nousresearch.com) design by [Nous Research](https://nousresearch.com).

The core insight is simple: different models see problems differently. A technical model, a security-focused model, and a pragmatic business model will each notice things the others miss. Rather than running a slow multi-round deliberation (as the Council does), MoA collects those perspectives in a single parallel pass, then has the aggregator do the synthesis.

### The Problem MoA Solves

When you need nuanced, multi-perspective analysis, single-model prompting has limits. A single model tends to lock onto the first interpretation it sees. Multi-model patterns solve this differently:

- **Council** runs adversarial debate rounds — high quality, but slow and complex
- **Swarm** runs agents in parallel with tools — great for task execution, not advisory synthesis
- **MoA** runs advisory references in parallel — fast, focused, no overhead

MoA is the "advisory synthesis" pattern: collect diverse perspectives fast, let the aggregator do the thinking.

### MoA in AgentTeams

MoA ships as a built-in module in AgentTeams (`moa/`). It integrates with:

- The **REST API** via `council-server.js` on port 3003
- The **CLI** via `council moa` in `council-cli.js`
- The **programmatic API** via `moa/moa-runtime.js`

No separate install needed — if you have AgentTeams running, MoA is available.

---

## 2. How MoA Works

### Data Flow

```
User Prompt
    │
    ▼
┌─────────────────────────────────────────────────────┐
│  Reference Models (PARALLEL — Promise.all)          │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │ Reference 1 │  │ Reference 2 │  │ Reference 3│ │
│  │ (technical) │  │(security)   │  │(pragmatic) │ │
│  └─────────────┘  └─────────────┘  └────────────┘ │
│         │                │                │          │
│         └────────────────┴────────────────┘          │
│                         │                            │
│              (all run simultaneously)               │
└─────────────────────────┼───────────────────────────┘
                          │
                          ▼
                   Aggregator Model
              (synthesizes + acts, can use tools)
                          │
                          ▼
                  Final Response
```

### Stage-by-Stage Breakdown

**Stage 1 — Prompt sanitization**
The user's prompt + conversation history is trimmed. System prompts and tool messages are stripped out — references only see the human text. This prevents billing the system prompt N times and avoids strict providers rejecting orphan tool messages.

**Stage 2 — Reference models run in parallel**
Every reference model in the preset receives the sanitized transcript simultaneously. Each one produces its own advisory response from its perspective. They have **no tools** — pure text analysis only.

**Stage 3 — Aggregator synthesizes**
The aggregator receives:
1. The original user prompt
2. All reference responses, labeled by source

It then produces a synthesized recommendation — not a list of "what each reference said," but a unified response that resolves conflicts, highlights agreements, and provides actionable next steps.

**Stage 4 — Response returned**
The aggregator's text is the final response. If tools were passed via `runMoAWithTools`, the aggregator can also call them.

### Key Design Properties

| Property | Detail |
|----------|--------|
| **Parallelism** | References run via `Promise.all` — as fast as the slowest provider |
| **Non-fatal** | One failed reference → its slot gets `[error]` text, others continue |
| **Advisory-only refs** | References have no tools — keeps them fast and focused |
| **Acting aggregator** | The aggregator **can** call tools — this is what makes MoA agentic |
| **Sanitized transcript** | References see only user/assistant text, no system or tool messages |
| **MoA recursion guard** | A reference model that is itself an MoA preset will be skipped |

---

## 3. MoA vs Council vs Swarm

### Comparison Table

| | **MoA** | **Council** | **Swarm** |
|--|---------|-------------|-----------|
| **Purpose** | Advisory synthesis | Adversarial deliberation | Parallel task execution |
| **Who has tools** | Aggregator only | No one | Every agent |
| **Output type** | Synthesized recommendation | Consensus verdict | Task deliverables |
| **Latency** | Medium (parallel refs + 1 agg) | High (sequential rounds) | High (parallel tasks) |
| **Complexity** | Low–medium | High | Medium |
| **Multi-turn** | Single-turn synthesis | Multi-round debate | Multi-agent coordination |
| **Best for** | Complex single tasks needing multiple perspectives | Decisions requiring adversarial challenge | Large tasks decomposed into subtasks |
| **Cost per run** | N + 1 calls | Many calls (rounds × councilors) | Many calls (agents × tasks) |

### Decision Tree: Which Pattern to Use?

```
Is this a complex task needing multiple perspectives?
│
├── No → Single model (direct call)
│
├── Yes — Do you need tools executed?
│    │
│    ├── No → Is latency critical?
│    │         ├── No → Use Council (adversarial depth)
│    │         └── Yes → Use MoA (fast synthesis)
│    │
│    └── Yes → Use Swarm (parallel execution with tools)
```

### When to Choose MoA Specifically

- You want multi-perspective analysis but don't need full Council deliberation
- You want quality synthesis without the overhead of rounds and voting
- You want to preprocess a task before sending it to Council or Swarm
- You want to aggregate outputs from multiple sub-agents after a Swarm run
- You need a fast, one-shot advisory from several expert "consultants"

---

## 4. Installation & Setup

### Prerequisites

- **Node.js 18+** installed
- **AgentTeams repository** cloned
- **Providers registered** — at minimum, one provider for references and one for the aggregator

### Where MoA Files Live

```
agent-teams/
├── moa/
│   ├── moa-runtime.js    # Core engine (parallel refs + aggregation)
│   ├── config.json        # Preset definitions
│   └── index.js           # Public exports
├── council-server.js     # REST API endpoints (includes MoA routes)
└── council-cli.js         # CLI commands (`council moa ...`)
```

### Starting the Server

```bash
cd /path/to/Agent-Teams-main
node council-server.js
```

The server starts on **port 3003** by default. MoA endpoints are available at `/api/moa/*`.

### Verifying MoA Is Working

```bash
# List all configured presets
curl http://localhost:3003/api/moa/presets
```

Expected output:
```json
[
  {"name":"default","enabled":true,"ref_count":3,"aggregator":"lmstudio:qwen3.6-35b-a3b"},
  {"name":"coding","enabled":true,"ref_count":2,"aggregator":"lmstudio:qwen3.6-35b-a3b"},
  {"name":"security","enabled":true,"ref_count":2,"aggregator":"lmstudio:qwen3.6-35b-a3b"}
]
```

### LM Studio Setup (Local Models)

If using local models via LM Studio, ensure the LM Studio server is running and accessible. The default runtime connects to:

```javascript
LM_STUDIO_URL = process.env.LM_STUDIO_URL || 'http://100.68.208.113:1234'
LM_STUDIO_KEY = process.env.LM_STUDIO_KEY || 'sk-lm-xWvfQHZF:L8P76SQakhEA95U8DDNf'
```

To override:
```bash
export LM_STUDIO_URL=http://localhost:1234
export LM_STUDIO_KEY=sk-lm-xxxx
node council-server.js
```

For other providers (OpenAI, OpenRouter, Groq), register them in `providers/provider-adapter.js` and reference them by name in your preset config.

---

## 5. Configuration — Presets Deep Dive

### Full `config.json` Schema

```json
{
  "moa": {
    "default_preset": "preset-name",
    "presets": {
      "preset-name": {
        "description": "Optional human-readable label",
        "reference_models": [
          { "provider": "lmstudio", "model": "model-name" }
        ],
        "aggregator": { "provider": "lmstudio", "model": "model-name" },
        "reference_temperature": 0.6,
        "aggregator_temperature": 0.4,
        "reference_max_tokens": 1024,
        "enabled": true
      }
    }
  }
}
```

### Field Reference

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `default_preset` | `string` | `"default"` | Preset used when none is specified |
| `presets[].description` | `string` | — | Human-readable label (optional) |
| `presets[].reference_models` | `array` | **required** | Array of `{provider, model}` objects |
| `presets[].aggregator` | `object` | **required** | Single `{provider, model}` for synthesis |
| `presets[].reference_temperature` | `float` | `0.6` | Temperature for reference calls (0.0–1.0) |
| `presets[].aggregator_temperature` | `float` | `0.4` | Temperature for aggregator call (0.0–1.0) |
| `presets[].reference_max_tokens` | `integer` | `1024` | Max tokens per reference or aggregator call |
| `presets[].enabled` | `boolean` | `true` | `false` → skip references, run aggregator directly |

### Provider Options

Any provider registered in `providers/provider-adapter.js` is valid:

| Provider | Example Model |
|----------|--------------|
| `lmstudio` | `qwen3.6-35b-a3b`, `supergemma4-26b-uncensored-v2` |
| `openai` | `gpt-4o`, `gpt-4o-mini` |
| `openrouter` | `anthropic/claude-3.5-sonnet` |
| `groq` | `llama-3.1-70b-versatile` |

### Built-in Presets

#### `default`
General-purpose MoA for broad tasks. Three references covering technical, security, and pragmatic perspectives.
```json
{
  "reference_models": [
    { "provider": "lmstudio", "model": "qwen3.6-35b-a3b" },
    { "provider": "lmstudio", "model": "supergemma4-26b-uncensored-v2" },
    { "provider": "lmstudio", "model": "qwen3.5-9b" }
  ],
  "aggregator": { "provider": "lmstudio", "model": "qwen3.6-35b-a3b" },
  "reference_temperature": 0.6,
  "aggregator_temperature": 0.4
}
```

#### `coding`
Two-reference preset tuned for code review, architecture decisions, and implementation questions.
```json
{
  "reference_models": [
    { "provider": "lmstudio", "model": "qwen3.6-35b-a3b" },
    { "provider": "lmstudio", "model": "qwen3.5-9b" }
  ],
  "aggregator": { "provider": "lmstudio", "model": "qwen3.6-35b-a3b" },
  "reference_temperature": 0.5,
  "aggregator_temperature": 0.3,
  "reference_max_tokens": 768
}
```

#### `security`
Two-reference preset tuned for security audits, threat modeling, and adversarial review.
```json
{
  "reference_models": [
    { "provider": "lmstudio", "model": "supergemma4-26b-uncensored-v2" },
    { "provider": "lmstudio", "model": "qwen3.6-35b-a3b" }
  ],
  "aggregator": { "provider": "lmstudio", "model": "qwen3.6-35b-a3b" },
  "reference_temperature": 0.7,
  "aggregator_temperature": 0.4,
  "reference_max_tokens": 512
}
```

### Creating a Custom Preset

**Option A — Via REST API:**

```bash
curl -X POST http://localhost:3003/api/moa/presets \
  -H "Content-Type: application/json" \
  -d '{
    "preset_name": "my-research",
    "preset_config": {
      "description": "Research-focused preset",
      "reference_models": [
        { "provider": "lmstudio", "model": "qwen3.6-35b-a3b" },
        { "provider": "lmstudio", "model": "qwen3.5-9b" }
      ],
      "aggregator": { "provider": "openai", "model": "gpt-4o" },
      "reference_temperature": 0.6,
      "aggregator_temperature": 0.3,
      "reference_max_tokens": 1024,
      "enabled": true
    }
  }'
```

**Option B — Direct file edit:**

Edit `moa/config.json` directly, then restart the server (or the next run will pick up changes):

```json
{
  "moa": {
    "default_preset": "default",
    "presets": {
      "my-research": {
        "description": "Research-focused preset",
        "reference_models": [
          { "provider": "lmstudio", "model": "qwen3.6-35b-a3b" },
          { "provider": "lmstudio", "model": "qwen3.5-9b" }
        ],
        "aggregator": { "provider": "openai", "model": "gpt-4o" },
        "reference_temperature": 0.6,
        "aggregator_temperature": 0.3,
        "reference_max_tokens": 1024,
        "enabled": true
      }
    }
  }
}
```

---

## 6. CLI Usage

All MoA CLI commands are under `council moa`:

```bash
council moa "prompt"                    # Run with default preset
council moa "prompt" --preset coding   # Run with named preset
council moa list                       # List all presets
council moa delete <name>              # Delete a preset
```

### `council moa "prompt"`

Run MoA with the default preset:

```bash
council moa "Should I refactor the authentication system?"
```

Output:
```
⚙️  Running MoA (preset: default)...

✅ MoA Complete
   Preset:    default
   Aggregator: lmstudio:qwen3.6-35b-a3b
   References: 3

   ── Response ─────────────────────────────────────
   [aggregator synthesized text]
   ──────────────────────────────────────────────────
```

### `council moa "prompt" --preset <name>`

Run with a named preset:

```bash
council moa "Audit this code for vulnerabilities" --preset security
```

### `council moa list`

List all configured presets:

```bash
council moa list
```

Output:
```
⚛ MoA Presets:

  default  [ON]  3 refs  →  lmstudio:qwen3.6-35b-a3b
  coding   [ON]  2 refs  →  lmstudio:qwen3.6-35b-a3b
  security [ON]  2 refs  →  lmstudio:qwen3.6-35b-a3b
```

### `council moa delete <name>`

Delete a preset:

```bash
council moa delete my-research
```

```
✓ Deleted preset 'my-research'
```

---

## 7. REST API Reference

Base URL: `http://localhost:3003`

### `GET /api/moa/presets`

List all configured presets.

**Response `200`:**
```json
[
  {
    "name": "default",
    "enabled": true,
    "ref_count": 3,
    "aggregator": "lmstudio:qwen3.6-35b-a3b",
    "reference_temperature": 0.6,
    "aggregator_temperature": 0.4
  }
]
```

**Example:**
```bash
curl http://localhost:3003/api/moa/presets
```

---

### `POST /api/moa/presets`

Save or update a preset.

**Request body:**
```json
{
  "preset_name": "my-preset",
  "preset_config": {
    "reference_models": [
      { "provider": "lmstudio", "model": "qwen3.6-35b-a3b" }
    ],
    "aggregator": { "provider": "openai", "model": "gpt-4o" },
    "reference_temperature": 0.6,
    "aggregator_temperature": 0.4,
    "reference_max_tokens": 1024,
    "enabled": true
  }
}
```

**Response `200`:**
```json
{ "saved": true, "name": "my-preset" }
```

**Example:**
```bash
curl -X POST http://localhost:3003/api/moa/presets \
  -H "Content-Type: application/json" \
  -d '{"preset_name":"research","preset_config":{"reference_models":[{"provider":"lmstudio","model":"qwen3.5-9b"}],"aggregator":{"provider":"openai","model":"gpt-4o"},"enabled":true}}'
```

---

### `GET /api/moa/presets/:name`

Get a single preset's full configuration.

**Response `200`:**
```json
{
  "reference_models": [
    { "provider": "lmstudio", "model": "qwen3.6-35b-a3b" },
    { "provider": "lmstudio", "model": "supergemma4-26b-uncensored-v2" }
  ],
  "aggregator": { "provider": "lmstudio", "model": "qwen3.6-35b-a3b" },
  "reference_temperature": 0.6,
  "aggregator_temperature": 0.4,
  "reference_max_tokens": 1024,
  "enabled": true
}
```

**Response `404`:**
```json
{ "error": "Preset not found" }
```

**Example:**
```bash
curl http://localhost:3003/api/moa/presets/coding
```

---

### `DELETE /api/moa/presets/:name`

Delete a preset.

**Response `200`:**
```json
{ "deleted": true }
```

**Response `404`:**
```json
{ "error": "Preset not found" }
```

**Example:**
```bash
curl -X DELETE http://localhost:3003/api/moa/presets/my-preset
```

---

### `POST /api/moa/run`

Run MoA end-to-end.

**Request body:**
```json
{
  "prompt": "Should I adopt TypeScript in this project?",
  "preset": "default",
  "history": [
    { "role": "user", "content": "We're starting a new Node.js API" },
    { "role": "assistant", "content": "Great! What kind of API is this?" }
  ]
}
```

All fields except `prompt` are optional. If `preset` is omitted, uses the `default_preset` from config.

**Response `200`:**
```json
{
  "response": "The aggregator's synthesized response text...",
  "references": [
    {
      "label": "lmstudio:qwen3.6-35b-a3b",
      "text": "Reference 1's advisory text..."
    },
    {
      "label": "lmstudio:supergemma4-26b-uncensored-v2",
      "text": "Reference 2's advisory text..."
    }
  ],
  "preset": "default",
  "aggregator": "lmstudio:qwen3.6-35b-a3b"
}
```

**Example:**
```bash
curl -X POST http://localhost:3003/api/moa/run \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Design a REST API for a task manager","preset":"coding"}'
```

---

## 8. Programmatic API (JavaScript)

### Import

```javascript
const {
  runMoA,
  runMoAWithTools,
  listPresets,
  getPreset,
  savePreset,
  deletePreset
} = require('./moa/moa-runtime.js');
```

### `runMoA(prompt, presetName, history)`

Run MoA and get the aggregator's synthesized response.

```javascript
const result = await runMoA("your prompt here", "default", []);

console.log(result.response);    // aggregator's final text
console.log(result.references);  // [{label, text}, ...]
console.log(result.preset);      // preset name used
console.log(result.aggregator);  // aggregator model label
```

**With conversation history:**
```javascript
const withHistory = await runMoA("follow-up question", "default", [
  { role: "user", content: "first question" },
  { role: "assistant", content: "first answer" }
]);
```

**Accessing reference outputs:**
```javascript
const result = await runMoA("analyze this architecture", "coding", []);
result.references.forEach((ref, i) => {
  console.log(`Reference ${i+1} (${ref.label}):`);
  console.log(ref.text);
  console.log('---');
});
```

### `runMoAWithTools(prompt, presetName, tools, toolsFn, history)`

Run MoA where the aggregator can call tools. The tools function receives the aggregator model and messages, and should return `{text, toolCalls}`.

```javascript
const result = await runMoAWithTools(
  "Create a file at /tmp/test.txt",
  "default",
  [{ name: "write_file", description: "...", inputSchema: {...} }],
  async (model, messages, tools) => {
    // Your tool execution logic here
    const toolResult = await executeTools(tools, messages);
    return { text: toolResult.text, toolCalls: toolResult.calls };
  },
  []
);
```

### `listPresets()`

```javascript
const presets = listPresets();
presets.forEach(p => {
  const status = p.enabled ? 'ON' : 'OFF';
  console.log(`${p.name} [${status}] ${p.ref_count} refs → ${p.aggregator}`);
});
```

### `getPreset(name)`

```javascript
const preset = getPreset("coding");
if (preset) {
  console.log(`Aggregator: ${preset.aggregator}`);
  console.log(`References: ${preset.reference_models.length}`);
}
```

### `savePreset(name, config)`

```javascript
savePreset("my-preset", {
  reference_models: [
    { provider: "lmstudio", model: "qwen3.6-35b-a3b" }
  ],
  aggregator: { provider: "openai", model: "gpt-4o" },
  reference_temperature: 0.6,
  aggregator_temperature: 0.4,
  reference_max_tokens: 1024,
  enabled: true
});
```

### `deletePreset(name)`

```javascript
const deleted = deletePreset("my-preset");
console.log(deleted ? "Deleted" : "Not found");
```

---

## 9. Adding MoA to Any Project

MoA is self-contained and can be used independently of the AgentTeams web UI or chat interface.

### Option A: Standalone Node.js

**Step 1 — Copy MoA files to your project:**

```
your-project/
├── moa/
│   ├── moa-runtime.js   # Copy from AgentTeams
│   └── config.json      # Your custom config
└── providers/
    └── provider-adapter.js  # Copy from AgentTeams (for provider routing)
```

**Step 2 — Register your providers:**

```javascript
const MoA = require('./moa/moa-runtime.js');
const { ProviderManager } = require('./providers/provider-adapter.js');

// Create and register providers
const providers = new ProviderManager();

// Option: OpenAI
providers.registerProvider('openai', {
  baseUrl: 'https://api.openai.com/v1',
  apiKey: 'sk-...'
});

// Option: LM Studio (local)
providers.registerProvider('lmstudio', {
  baseUrl: 'http://localhost:1234/v1',
  apiKey: 'sk-lm-...'  // May not be needed for local
});

// Option: OpenRouter
providers.registerProvider('openrouter', {
  baseUrl: 'https://openrouter.ai/api/v1',
  apiKey: 'sk-or-...'
});
```

**Step 3 — Configure your preset in `config.json`:**

```json
{
  "moa": {
    "default_preset": "my-preset",
    "presets": {
      "my-preset": {
        "reference_models": [
          { "provider": "openai", "model": "gpt-4o-mini" },
          { "provider": "openrouter", "model": "anthropic/claude-3.5-sonnet" }
        ],
        "aggregator": { "provider": "openai", "model": "gpt-4o" },
        "reference_temperature": 0.6,
        "aggregator_temperature": 0.4,
        "reference_max_tokens": 1024,
        "enabled": true
      }
    }
  }
}
```

**Step 4 — Run!**

```javascript
const result = await MoA.runMoA("Analyze the tradeoffs of microservices vs monolith", "my-preset", []);
console.log(result.response);
```

---

### Option B: As an MCP Tool

Expose MoA as a tool via any MCP server (e.g., the AgentTeams MCP server on port 3850):

```javascript
// In your MCP server's tool registry
{
  name: "moa_run",
  description: "Run Mixture-of-Agents: multiple reference models analyze in parallel, aggregator synthesizes a response",
  inputSchema: {
    type: "object",
    properties: {
      prompt: {
        type: "string",
        description: "The task or question for the MoA to analyze"
      },
      preset: {
        type: "string",
        description: "Named preset to use (default: 'default')"
      }
    },
    required: ["prompt"]
  }
}

// Handler
async function handleMoaRun(args) {
  const { runMoA } = require('./moa/moa-runtime.js');
  const result = await runMoA(args.prompt, args.preset || 'default', []);
  return {
    content: [{
      type: "text",
      text: result.response
    }]
  };
}
```

The MCP tool returns the aggregator's synthesized text. Reference outputs are available in `result.references` if you want to expose them.

---

### Option C: REST Client from Any Language

**Python:**
```python
import requests

response = requests.post(
    "http://localhost:3003/api/moa/run",
    json={
        "prompt": "What are the security implications of JWT vs session auth?",
        "preset": "security"
    }
)
data = response.json()
print(data["response"])
```

**curl:**
```bash
curl -X POST http://localhost:3003/api/moa/run \
  -H "Content-Type: application/json" \
  -d '{"prompt":"your task","preset":"default"}'
```

**Any HTTP client (Ruby, Go, Rust, etc.):**
The API is plain JSON over HTTP. Send a `POST` to `/api/moa/run` with the body documented in [Section 7](#post-apimoarun), and read `response` from the JSON reply.

---

### Option D: Embed in Another Web App

Mount the MoA REST endpoints in any Express or Fastify application:

```javascript
const express = require('express');
const councilServer = require('./council-server.js');

const app = express();
app.use(express.json());

// Mount all council endpoints (including MoA at /api/moa/*)
councilServer.attach(app);

// Or mount only MoA routes:
const moa = require('./moa/moa-runtime.js');
app.post('/api/moa/run', async (req, res) => {
  try {
    const { prompt, preset, history } = req.body;
    const result = await moa.runMoA(prompt, preset || 'default', history || []);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log('MoA available at http://localhost:3000/api/moa/run'));
```

---

## 10. Best Practices & Pitfalls

### Preset Design

- **Don't use the aggregator as a reference.** The aggregator sees the prompt first via the synthesis step — if it's also a reference, its advice is biased by its own earlier synthesis.
- **Mix model families when possible.** Using the same model with different temperatures for all references defeats the diversity purpose. Prefer models with different training/alignment backgrounds.
- **3–5 references is a good range.** Fewer than 2 reduces diversity; more than 5 adds cost and latency without proportional quality gain.

### Token Budgets

- **`reference_max_tokens` too low** → truncated advice, especially for complex tasks. If references are cutting off at 512 tokens, consider 768 or 1024.
- **`reference_max_tokens` too high** → wasted tokens and latency for simple tasks. Coding and security presets use lower values (768, 512) because their analysis is more focused.
- The aggregator gets `maxTokens * 2` to allow a longer synthesis — this is intentionally generous.

### Temperature Tuning

| Role | Recommended Range | Why |
|------|-----------------|-----|
| References | 0.5–0.7 | Creative, diverse perspectives; 0.6 is a safe default |
| Aggregator | 0.3–0.4 | Focused, coherent synthesis; lower prevents rambling |

Avoid running references at temperature 0.0 — deterministic outputs reduce the diversity benefit of MoA.

### Provider Failures

- All providers are called in parallel via `Promise.all`. The overall run speed is bounded by the **slowest** provider.
- One provider timing out or returning an error → that reference slot gets `[error: ...]` text, the others continue.
- If **all** references fail, the aggregator runs directly on the raw prompt (fallback, lower quality).
- **Tip:** Use providers with similar latency for best overall performance, or set timeouts in your provider adapter.

### MoA Recursion

> ⚠️ **Do not make a reference model itself an MoA preset.**

If `preset.reference_models` points to a model that is itself an MoA aggregator, you risk an infinite loop. The runtime has a basic guard that skips references that match the aggregator label, but avoid designing presets this way.

### When NOT to Use MoA

| Scenario | Why | Alternative |
|----------|-----|-------------|
| Simple factual lookups | Overkill; single call is faster and cheaper | Direct model call |
| Latency-critical UI responses | MoA adds parallel latency + synthesis step | Single model or cached response |
| Tasks requiring tool execution by multiple agents | References don't have tools | Swarm |
| Adversarial decision-making | Need debate and voting, not synthesis | Council |
| Very short, trivial tasks | Cost/benefit doesn't justify MoA overhead | Single model |

### Cost

Each MoA run costs: **(N reference calls) + 1 aggregator call**, where N = number of reference models in the preset.

For the default preset (3 references + 1 aggregator = 4 calls), budget accordingly. Use the `security` or `coding` presets with fewer references for lower-cost runs.

### Disabling MoA (A/B Testing)

Set **`enabled: false`** in any preset to skip all reference calls and run the aggregator directly on the prompt:

```json
{
  "name": "ab-test",
  "reference_models": [...],
  "aggregator": {...},
  "enabled": false
}
```

This is useful for comparing MoA-assisted quality vs. direct aggregator output on the same prompt.

---

## 11. Troubleshooting

### "Preset not found"

```
Error: No MoA preset found for 'my-preset'
```

**Fix:** Check the preset name with `council moa list`. Ensure the preset exists in `moa/config.json`. Preset names are case-sensitive.

```bash
council moa list
# Verify 'my-preset' is listed
```

---

### "Provider not registered"

```
[error: Provider 'openai' not registered]
```

**Fix:** The provider must be registered in `providers/provider-adapter.js`. If you're using a custom provider setup outside AgentTeams, register it before running MoA:

```javascript
const { ProviderManager } = require('./providers/provider-adapter.js');
const providers = new ProviderManager();
providers.registerProvider('openai', { baseUrl: '...', apiKey: '...' });
```

---

### Empty references array

The `references` array comes back empty but no error is shown.

**Fix:**
1. Check that `preset.enabled !== false` in config
2. Verify at least one reference model is configured in the preset
3. Confirm the provider endpoint is reachable:
```bash
curl http://localhost:1234/v1/models  # for LM Studio
curl https://api.openai.com/v1/models  # for OpenAI (needs key)
```

---

### MoA hangs with no response

Likely cause: one provider is not responding, and `Promise.all` is waiting for it.

**Fix:**
1. Check LM Studio or your API endpoint is responding:
```bash
curl http://localhost:1234/v1/models
```
2. Reduce the number of reference models in the preset
3. Add a timeout to your provider adapter
4. Check network connectivity to the provider URL in your preset config

---

### All references fail, response looks poor

If all reference calls fail, the aggregator runs directly on the prompt as a fallback. The response will be lower quality because it lacks the synthesized perspectives.

**Fix:** Check the error messages in the reference outputs:
```javascript
const result = await runMoA(prompt, preset, history);
result.references.forEach(r => {
  if (r.text.startsWith('[error') || r.text.startsWith('[failed')) {
    console.log(`${r.label}: ${r.text}`);
  }
});
```
Address the root cause (API key, network, model name typo, etc.).

---

### `enabled: false` not working as expected

If you set `enabled: false` but still see reference calls, the server may have cached the config. Restart `council-server.js` after changing `config.json`.

---

## 12. File Reference

| File | Purpose |
|------|---------|
| **`moa/moa-runtime.js`** | Core MoA engine. Handles parallel reference execution, aggregator synthesis, transcript sanitization, preset loading, and the public API (`runMoA`, `runMoAWithTools`, `listPresets`, `getPreset`, `savePreset`, `deletePreset`). |
| **`moa/config.json`** | Preset definitions. Contains `default_preset` name and all named presets with their reference models, aggregator, temperatures, and token limits. Safe to edit directly. |
| **`moa/index.js`** | Thin public export wrapper. Re-exports `runMoA`, `runMoAWithTools`, `listPresets`, `getPreset`, `savePreset`, `deletePreset` from `moa-runtime.js`. Use this as the entry point from other modules. |
| **`council-server.js`** | REST API server. MoA routes (`/api/moa/*`) are mounted here. No changes needed to use MoA remotely — just keep this server running. |
| **`council-cli.js`** | CLI commands. `council moa ...` commands delegate to `moa-runtime.js`. Adding new CLI features = edit here and/or in `moa-runtime.js`. |
| **`providers/provider-adapter.js`** | Provider registry. `ProviderManager` routes model calls to the correct backend (LM Studio, OpenAI, OpenRouter, etc.). All MoA providers must be registered here. |

---

## Quick Reference

```bash
# Start server
node council-server.js

# CLI usage
council moa "your prompt"
council moa "prompt" --preset coding
council moa list
council moa delete <name>

# REST
curl http://localhost:3003/api/moa/presets
curl -X POST http://localhost:3003/api/moa/run \
  -H "Content-Type: application/json" \
  -d '{"prompt":"your task","preset":"default"}'

# Programmatic
const { runMoA } = require('./moa/moa-runtime.js');
const result = await runMoA("task", "default", []);
console.log(result.response);
```

---

*MoA is designed for advisory synthesis — use it when you need multiple expert perspectives without the overhead of full Council deliberation. For tool-bearing parallel execution, use Swarm. For adversarial multi-round debate, use Council.*
