# Hive Swarm Enhancements

> Native swarm intelligence for the Hive Nation — no external dependencies, no deletion, only enhancement.

## Quick Start

### 1. Run the swarm CLI

```bash
cd C:\Users\franz\Agent-Teams\hive-swarm-enhancements\core
node cli.js <command>
```

**Available commands:**
- `node cli.js swarm "<goal>" --count N --domain X` — Run a swarm
- `node cli.js status <swarmId> --json` — Check swarm status
- `node cli.js list --json` — List all swarms
- `node cli.js stop <swarmId>` — Stop a swarm
- `node cli.js poll "<question>" "<choice1,choice2,...">` — Create a poll
- `node cli.js vote <pollId> <choice>` — Cast a vote
- `node cli.js dashboard` — Start the WebUI via CLI
- `node cli.js preflight` — Check mesh + LLM connectivity
- `node cli.js plan "<goal>"` — See what the planner would do
- `node cli.js decompose "<goal>" --count N` — Decompose without executing

### 2. Start the WebUI dashboard

```bash
cd C:\Users\franz\Agent-Teams\hive-swarm-enhancements\webui
npm install
node server.js
```

Then open **http://localhost:8787**

### 3. Start the WebUI via CLI

```bash
cd C:\Users\franz\Agent-Teams\hive-swarm-enhancements\core
node cli.js dashboard
```

### 4. Real example — run a swarm

```bash
cd C:\Users\franz\Agent-Teams\hive-swarm-enhancements\core
node cli.js swarm "build a REST API" --count 3 --domain build
```

### 5. Check swarm status

```bash
cd C:\Users\franz\Agent-Teams\hive-swarm-enhancements\core
node cli.js status <swarmId> --json
```

### 6. List all swarms

```bash
cd C:\Users\franz\Agent-Teams\hive-swarm-enhancements\core
node cli.js list --json
```

---

## Overview

The Hive Swarm Enhancements project lives in `hive-swarm-enhancements/` and provides:

- **Core swarm layer** (`core/`) — native swarm intelligence with no external npm deps
- **WebUI dashboard** (`webui/`) — real-time browser-based control plane
- **Prompts** (`prompts/`) — LLM prompts for decompose, aggregate, consensus
- **Examples** (`examples/`) — worked examples (build-rest-api, audit-codebase, research-topic)
- **Docs** (`docs/`) — architecture, integration, and vs-swarm-agent comparisons

## Architecture

```
                    ┌────────────────────────────────────────┐
                    │  Browser (dashboard)                   │
                    │  http://localhost:8787                │
                    └──────────────┬─────────────────────────┘
                                   │  HTTP (REST) + WS (/ws)
                                   ▼
              ┌──────────────────────────────────────────────────┐
              │  webui/server.js (Express + ws)                │
              │  REST API /api/* + WebSocket relay             │
              └──────────────┬─────────────────────────────────┘
                             │
              ┌──────────────┴──────────────────────┐
              │                                     │
              ▼                                     ▼
     ┌─────────────────┐                 ┌─────────────────────┐
     │  Agent Mesh      │                 │  Hive Swarm core    │
     │  localhost:4000  │                 │  core/cli.js        │
     └─────────────────┘                 └─────────────────────┘
```

## Core Components

| File | Purpose |
|------|---------|
| `core/planner.js` | Top-level router — decides how to attack a goal |
| `core/goal-decomposer.js` | Breaks a goal into 3–7 parallel subtasks |
| `core/worker-dispatcher.js` | Sends subtasks to agents via mesh WebSocket |
| `core/result-aggregator.js` | Synthesizes N parallel outputs into one result |
| `core/consensus-engine.js` | Runs vote/agreement rounds |
| `core/cli.js` | Main CLI entry point |

## WebUI Components

| File | Purpose |
|------|---------|
| `webui/server.js` | Express + WebSocket relay |
| `webui/public/index.html` | Dashboard SPA (no build step) |
| `webui/public/js/dashboard.js` | WS client + state management |
| `webui/api/swarm.js` | REST: start/stop/list swarms |

## CLI Reference

```bash
node cli.js swarm        "<goal>"  [--count N] [--domain X] [--model M] [--consensus] [--dry-run]
node cli.js status      <swarmId> [--json]
node cli.js list         [--json]
node cli.js stop         <swarmId>
node cli.js poll         "<question>" "<choice1,choice2,...">  [--timeout MS]
node cli.js vote        <pollId> <choice>
node cli.js dashboard
node cli.js plan         "<goal>"
node cli.js decompose    "<goal>"  [--count N] [--domain X]
node cli.js preflight
node cli.js --help
node cli.js --version
```

## Environment Variables

| Variable | Default | Used for |
|----------|---------|----------|
| `MESH_URL` | `http://localhost:4000` | Mesh HTTP base |
| `MESH_KEY` | `openclaw-mesh-default-key` | Mesh auth header |
| `LMSTUDIO_URL` | `http://localhost:1234` | LLM provider |
| `PORT` | `8787` | WebUI HTTP + WS port |

## Build Logs

All swarm activity is persisted to `build-logs/`:
- `build-logs/swarms.json` — swarm registry
- `build-logs/dispatches/` — per-dispatch state
- `build-logs/decompositions/` — decomposition audit logs
- `build-logs/aggregations/` — aggregation results

## Skills

This project is wired into Hermes via `skills/hive-swarm/SKILL.md` — the skill is auto-discovered and usable in daily chats.