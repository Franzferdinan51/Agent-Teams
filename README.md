# Agent-Teams

**Version 2.3.0** · Node.js ≥ 18 · MIT

Agent-Teams is the merged successor of the owner's earlier **AI-Council** and **AI-Consensus-Council** projects (both deprecated in its favour). It is a multi-model deliberation council: a set of councilor personas deliberates a topic through a local or remote LLM (LM Studio by default), with a Mixture-of-Agents (MoA) runtime, two complementary HTTP servers, an MCP tool surface, a WebUI, and a CLI. The two servers are **not** duplicates — `council-server.js` is the deliberation + MoA engine, and `council-api-server.cjs` is the control plane (councilor CRUD, settings, vision/browser tools, and MCP over HTTP). See the service map below; pick a port deliberately, because same-named routes on 3003 and 3001 return different shapes.

## Quickstart

Prerequisites: Node.js ≥ 18 (see `engines` in `package.json`) and npm.

```bash
npm install
cp .env.example .env   # then edit .env if needed — LM Studio defaults to http://127.0.0.1:1234
```

Start everything (council engine, council API, and WebUI, with PID-file management):

```bash
./start-all.sh         # starts council (3003), council-api (3001), webui (3131)
./start-all.sh stop    # stops only the PIDs recorded in ./.agent-teams.pids
```

Or start services individually:

```bash
npm run start:council      # council-server.js — deliberation + MoA engine, port 3003
npm run start:council-api  # council-api-server.cjs — control plane + MCP, port 3001 (PORT env)
npm run start:webui        # webui/server.js — WebUI, port 3131 (PORT env)
npm run start:mcp          # mcp-server.js — standalone MCP server, port 3456 (MCP_PORT env)
```

Verify the install without any real LLM (the test harness boots a stub LLM — no real API calls):

```bash
npm test
```

Handy checks once services are running:

```bash
npm run council:status     # GET http://localhost:3003/api/health
npm run council:providers  # GET http://localhost:3003/api/providers
npm run council:list       # councilor count via council-server (3003)
npm run council:mcp-tools  # MCP tools/list via council-api (3001)
npm run mcp:status         # GET http://localhost:3456/health (standalone MCP server)
node council-cli.js --help # CLI v3 — set COUNCIL_API first, see CLI note below
```

> **CLI note:** `council-cli.js` reads its API base from the `COUNCIL_API` env var. Its built-in fallback in the source is still the stale `http://localhost:3007` (nothing listens there), so always set it explicitly, e.g. `COUNCIL_API=http://localhost:3001 node council-cli.js health`.

## Service map

| Component | File | Port | Role |
|---|---|---|---|
| Deliberation + MoA engine | `council-server.js` | **3003** (hardcoded) | Bare-`http` server. Routes: `GET /api/health`, `GET /api/councilors`, `GET /api/providers`, `GET /api/modes`, `POST /api/session/start`, `GET /api/session/:id`, `GET /api/moa/presets`, `POST /api/moa/run`. Talks to LM Studio via `LMSTUDIO_URL` / `LM_STUDIO_URL`. |
| Control plane + MCP over HTTP | `council-api-server.cjs` | **3001** (`PORT` env, default 3001) | Express server. Councilor CRUD, settings persistence (`settings.json`, a gitignored runtime file), vision + browser tools, `POST /api/ask`, `POST /api/decide` (D1 decision service, see Decision Models), server-side memory (`GET /api/memory`, `GET/PUT/DELETE /api/memory/:key`, file-backed at `data/council-memory.json`), `POST /api/llm/provider`, `POST /api/llm/test`, and MCP over HTTP at `POST /mcp` (verified `tools/list` = 56 tools, incl. `council_decide`). |
| Standalone MCP server | `mcp-server.js` | **3456** (`MCP_PORT` env, default 3456) | MCP over HTTP + SSE, 23 tools. Talks to council-api (`COUNCIL_PORT` env, default 3001) and the WebUI hive API (`HIVE_PORT` env, default 3131). Separate from the `/mcp` endpoint on 3001. |
| WebUI | `webui/server.js` | **3131** (`PORT` env, default 3131) | Web UI; proxies the council-api (`COUNCIL_PORT`, default 3001). |
| CLI | `council-cli.js` | — (client) | CLI v3. API base via the `COUNCIL_API` env var (see CLI note above). |
| MoA runtime | `moa/moa-runtime.js` | — (library) | Mixture-of-Agents runtime used by `council-server.js` and `test-moa.js`. Presets include `tiny`, `default`, `coding`, `security`. |
| MoA OpenClaw plugin | `moa/openclaw-plugin/` | — | OpenClaw plugin with its own vitest suite (green). |
| Agent API (separate) | `agent-api-server/server.js` | **3001** (`PORT` env, default 3001) | Separate small Express agent API; its package is `ai-council-agent-api`. **Port collision:** its default 3001 is the same as council-api's — if you run both, start this one on a distinct `PORT`. Not started by `start-all.sh`. |
| Python swarm orchestrator | `agent-swarm-system/swarm-orchestrator.py` | — | Python swarm orchestrator plus an agent registry (`agent-registry.json`, 218 agents). Not started by `start-all.sh`. Boot-verified in 2.2.1: it is a *planner* — it classifies a task, selects agents, and writes `plans/plan-<id>.json`; despite older doc wording it does not itself dispatch agents (no spawn/network code exists in it). See `agent-swarm-system/README.md` for its verified status. |

**One councilor dataset for both servers.** Since 2.2.1, both servers load the same canonical `councilors.json` at the repo root (86 councilors; path overridable via `COUNCILORS_PATH`). It is the merged superset of the three rosters that used to diverge (the engine's inline persona list, the API's inline registry, and the old file): every entry carries the display fields (`name`, `model`, `color`, `expertise`) and the deliberation persona fields (`personaName`, `party`, `title`, `specialty`, `voteWeight`), plus `alias`/`aliases` preserving every legacy id — the API's `get_councilor` resolves legacy ids too. `npm test` includes a roster-parity check that fails if the two servers' `GET /api/councilors` id sets ever drift apart again. The file is read-only at runtime: council-api's CRUD has only ever persisted custom bots to `settings.json`, never the registry.

### Deliberation modes

The servers expose different mode lists — again, the port decides:

- **council-server (3003), `GET /api/modes` / `MODES`:** `adversarial`, `standard`, `consensus`, `socratic`, `creative`, `analytical`, `emergency`, `vision`, `swarm_coding`, `strategic`, `multi`.
- **council-api (3001), `GET /api/modes` / `DELIBERATION_MODES`:** `deliberation`, `legislative`, `inquiry`, `swarm`, `swarm_coding`, `prediction`, `deep_research`, `vision`, `emergency`, `risk_assessment`, `collaborative`.

## Decision Models

New in 2.3.0: council-api can ask a **decision model** for a verdict, separately from deliberation chat. This follows the fleet's existing **System One pattern** (the pattern behind TypeSafe AI's Jev and the owner's local SystemOne service):

- **Code owns the workflow; the model owns exactly one judgment.** The caller enumerates the options and the criteria; the model returns a typed answer with calibrated probabilities in a single forward pass. It generates no text and writes no rationale — any prose explanation is assembled by the caller from the deliberation trace and the returned distribution.
- **Atomic questions.** One call fans out independent questions evaluated in isolation: a `choice` question (which option?) plus a `noul` question (is the information sufficient to decide now? → readiness). Every choice question carries an explicit `defer` catch-all option, so "none of these / not enough information" is a real answer with real probability mass, not a failure mode.
- **Confidence gating.** The verdict reports numbers; the caller gates on them (thresholds below). Probabilities still need per-task tuning on your own labelled data before you trust a band blindly.

**Default decider: D1.** Liquid AI's `d1-2b` (the local implementation of this exact contract), served by LM Studio ≥ 0.4.26 at its native `POST /v1/systemone` endpoint. D1 is **not a chat model** — it accepts `{model, state, questions}` and returns typed answers; do not point chat-completions code at it. It is the current flagship of its family and no ≤8B model servable in LM Studio beats it on decision benchmarks.

**Configuration** — same settings pattern as the other providers:

- Settings key `providers.decision`, repointable at runtime: `PUT /api/providers/decision` with `{endpoint, model}`.
- Env defaults: `DECISION_URL` (default `http://127.0.0.1:1234/v1`; the service appends `/systemone`) and `DECISION_MODEL` (default `d1-2b`).
- A future decider swap (different quant, different engine) is a config change, not a code change.

**Endpoint: `POST /api/decide`** on council-api (3001). Body: `{question, context?, options, criteria?, council?, councilors?, mode?, thresholds?}` — `options` is an array of 2–50 `{label, description?, id?}` entries. With `council: true`, the council first deliberates (the existing chat-provider path), the deliberation text is folded into the decision `state`, and the trace is attached as `deliberation: {mode, responses}`. **Council advises, decider decides:** the verdict's numbers come only from D1.

Response shape:

```json
{
  "question": "…", "model": "d1-2b", "backend": "d1",
  "chosen": { "id": "A", "label": "Cheap simple route" },
  "deferred": false,
  "scores": [{ "id": "A", "label": "…", "probability": 0.982 }, { "id": "B", "label": "…", "probability": 0.001 }],
  "deferProbability": 0.017,
  "confidence": 0.982,
  "readiness": 0.978,
  "band": "act",
  "latencyMs": 87,
  "timestamp": "…"
}
```

`scores` is the full probability distribution over the caller's options (sorted descending, `defer` excluded and reported separately as `deferProbability`); `confidence` is the chosen option's probability; `readiness` is the `noul` P(sufficient information). **Bands:** `act` when confidence ≥ **0.85**, `review` when ≥ **0.60**, otherwise `escalate`; a deferred verdict is always `escalate`. Thresholds are overridable per call via `thresholds: {act, review}`.

**Hard-fail semantics:** if the decision provider is unreachable or returns a malformed answer, `/api/decide` returns **HTTP 502** with an `error` — never a fabricated verdict (the same rule `/api/ask` adopted in 2.2.2). Validation errors (missing question, fewer than 2 options, duplicate/reserved ids) return **400**.

**Documented future swaps (not adopted):**

- **d1 Q8_0 quant:** if the installed d1-2B is Q4_K_M, moving to Q8_0 (`lms get LiquidAI/d1-2B-GGUF`) raises same-answer agreement vs full precision from ~96.3% to ~99.3% at ~2 GB. Same for `d1-omni-2b`.
- **Cloudflare Clef-flash shadow test:** Clef-flash (~9.1B, Apache-2.0) self-reports a higher Decision Index (57.07 vs D1's 51.1), but its servability in LM Studio is **unproven** (new `clef` llama.cpp architecture). If it ever loads, it gets an A/B shadow test on logged decision records before any adoption — it is not adopted.

## Fleet integration

In the owner's fleet the council-api runs as a service on **Robin** (the headless Omarchy box, tailnet `100.88.161.36`) and is wired into **Hermes** on the Mac Studio as an MCP server.

**Robin service** — systemd user unit `agent-teams-council`, deploy dir `~/agent-teams` on Robin, port **3001**, with `DECISION_URL` / `LMSTUDIO_URL` pointing at Robin's local LM Studio tunnel (`http://127.0.0.1:1234/v1`, which forwards to the Mac's LM Studio):

```bash
systemctl --user status agent-teams-council     # status
systemctl --user restart agent-teams-council    # restart
# remove: systemctl --user disable --now agent-teams-council \
#   && rm ~/.config/systemd/user/agent-teams-council.service \
#   && systemctl --user daemon-reload && rm -rf ~/agent-teams
```

**Hermes MCP entry** — in the default profile's `~/.hermes/config.yaml` on the Mac, under `mcp_servers:`:

```yaml
  agent-teams-council:
    url: http://100.88.161.36:3001/mcp
    enabled: true
    connect_timeout: 30
```

`hermes mcp test agent-teams-council` verifies it (connects, discovers 56 tools). Running Hermes sessions pick it up via `/reload-mcp` from inside a session; new sessions get it automatically. Remove with `hermes mcp remove agent-teams-council`.

### Agent quickstart (worked examples, run live against the Robin service 2026-11-26)

REST decision:

```bash
curl -s -X POST http://100.88.161.36:3001/api/decide -H 'Content-Type: application/json' -d '{
  "question": "How should this support ticket be handled?",
  "context": "A support ticket says: my password reset email never arrived. It is not urgent and needs a simple standard fix.",
  "options": [
    {"label": "Cheap simple route", "description": "Handle with the cheap simple route"},
    {"label": "Escalate to expensive expert route", "description": "Escalate to the expensive expert route"}],
  "criteria": "Prefer the cheap simple route when the fix is simple and standard; escalate only when the issue is urgent, complex, or high-risk."}'
```

Real output (trimmed):

```json
{"question":"How should this support ticket be handled?","model":"d1-2b","backend":"d1","chosen":{"id":"A","label":"Cheap simple route"},"deferred":false,"scores":[{"id":"A","label":"Cheap simple route","probability":0.9820792661479568},{"id":"B","label":"Escalate to expensive expert route","probability":0.0010418444312930335}],"deferProbability":0.016878889420750186,"confidence":0.9820792661479568,"readiness":0.9776240013047728,"band":"act","latencyMs":651,"timestamp":"2026-11-26T06:15:10.131Z"}
```

MCP `council_decide` (same question, no `criteria`):

```bash
curl -s -X POST http://100.88.161.36:3001/mcp -H 'Content-Type: application/json' -d '{
  "jsonrpc": "2.0", "id": 2, "method": "tools/call",
  "params": {"name": "council_decide", "arguments": {
    "question": "How should this support ticket be handled?",
    "context": "A support ticket says: my password reset email never arrived. It is not urgent and needs a simple standard fix.",
    "options": [
      {"label": "Cheap simple route", "description": "Handle with the cheap simple route"},
      {"label": "Escalate to expensive expert route", "description": "Escalate to the expensive expert route"}]}}}'
```

Real output (the verdict is the JSON text inside `result.content[0].text`; shown unwrapped and trimmed):

```json
{"question":"How should this support ticket be handled?","model":"d1-2b","backend":"d1","chosen":{"id":"A","label":"Cheap simple route"},"deferred":false,"scores":[{"id":"A","label":"Cheap simple route","probability":0.7598402325287016},{"id":"B","label":"Escalate to expensive expert route","probability":0.004815255997015019}],"deferProbability":0.23534451147428337,"confidence":0.7598402325287016,"readiness":0.9404018500995844,"band":"review","latencyMs":42,"timestamp":"2026-11-26T06:15:10.186Z"}
```

Note the second call honestly lands in `review`, not `act`: without the criteria text, D1 put real mass (0.235) on `defer`. That is the pattern working as intended — thin state in, hedged verdict out.

**Known gaps (honest):**

- The Hermes entry is in the **default profile only**. Named Hermes profiles that carry their own `mcp_servers:` blocks do not provably inherit it — unproven either way; profiles without their own block follow the default config.
- Deliberation chat (`/api/ask`, `council: true` traces) still runs through the **lmstudio chat provider**; only decisions use D1. The two paths are deliberately separate.
- Chamber memory is now server-backed (see Chamber UI) with a local fallback; data entered while the server was unreachable lives in that browser's localStorage until a later session re-syncs it via a mutation.

## Configuration

All configuration is via environment variables; copy `.env.example` to `.env` and fill in what you need. `.env` is gitignored. Key entries from `.env.example`:

| Variable | Default / notes |
|---|---|
| `LM_STUDIO_URL`, `LMSTUDIO_URL` | `http://127.0.0.1:1234` — LM Studio base URL (no trailing `/v1` in `LM_STUDIO_URL`; set both aliases to the same value). |
| `LM_STUDIO_KEY`, `LMSTUDIO_API_KEY`, `LMSTUDIO_KEY` | Empty by default; only needed if your LM Studio server requires auth. |
| `MINIMAX_API_KEY`, `OPENROUTER_API_KEY` | Cloud provider keys (optional). |
| `AGENT_MESH_API_KEY` | For the separate agent-mesh-api repo / mesh scripts. |
| `PORT` | `3001` for council-api. WebUI also uses `PORT` (default 3131 when run via its own defaults / `start-all.sh`). |
| `COUNCIL_PORT`, `COUNCIL_HOST` | `3001` / `localhost` — the council-api the WebUI and MCP server proxy to. Note: council-server's port is hardcoded to 3003 and is not set by `PORT`. |
| `DECISION_URL`, `DECISION_MODEL` | Decision provider defaults for council-api: `http://127.0.0.1:1234/v1` and `d1-2b` (the service appends `/systemone`). Also settable at runtime via settings `providers.decision` / `PUT /api/providers/decision`. See Decision Models. |
| `COUNCIL_MEMORY_FILE` | Path of council-api's server-side memory store; default `data/council-memory.json` next to `council-api-server.cjs`. |
| `BRAVE_API_KEY`, `BROWSEROS_MCP_URL` | Optional integrations; `BROWSEROS_MCP_URL` defaults to `http://127.0.0.1:9000/mcp`. |
| `MESH_URL`, `LOG_LEVEL` | `http://localhost:4000`, `INFO`. |

Settings changed through council-api at runtime are persisted to `settings.json` next to `council-api-server.cjs` — a runtime file, not source; it is gitignored.

## Tests

- **`npm test`** — `test/run-tests.js` boots a stub LLM (`test/stub-llm.js`, canned OpenAI-compatible responses, plus a deterministic `/v1/systemone` decision stub; no real API calls) plus both council servers and runs **31 checks, all passing**: health, councilors, roster parity between the two servers and the canonical `councilors.json`, providers, a full deliberation session, MoA presets + a MoA run, council-api providers, `POST /api/llm/provider`, `POST /api/llm/test`, `POST /api/ask`, the `/api/ask` hard-fail check (dead provider → HTTP 502, never canned responses), the decision service (`POST /api/decide` happy path, `council: true` deliberation trace, decision-provider-down → 502), MCP `tools/list` = 56 incl. `council_decide` plus an MCP `council_decide` verdict, the council memory store (PUT → GET round-trip, list contains key, file exists on disk, DELETE → GET 404), and CLI health/councilors smoke checks.
- **MoA plugin tests** — in `moa/openclaw-plugin/`: `npm test` runs its vitest suite (green).
- **`node test-moa.js`** — manual MoA check; point `LM_STUDIO_URL` at any OpenAI-compatible endpoint (a real LM Studio with a model loaded, or the stub).

## Chamber UI

The React Chamber UI (`council-app.tsx`, `council-index.tsx`, `council-components/`, `council-types.ts`, `council-constants.ts`, manifest `council-package.json`) was **reworked in 2.2.1** and builds cleanly:

- **Build (one command):** `./scripts/build-chamber.sh` — stages the sources with `council-package.json` as `package.json` next to its lockfile, installs, type-checks (`tsconfig.chamber.json`, strict), and runs the Vite build into `council-dist/`. The root `package.json`/`node_modules` are untouched.
- **Services are real:** `services/aiService.ts` talks to the per-bot OpenAI-compatible endpoint from Settings (`POST {base}/chat/completions`, SSE streaming with JSON fallback; default `http://127.0.0.1:1234/v1`). `services/CouncilOrchestrationService.ts` is a client-side engine that executes real turns through the same chat path. The app loads the live councilor registry and modes from council-api (3001) on mount and shows a visible error if the API is down — no demo data anywhere.
- **Memory is server-backed (2.3.0):** council-api now has a memory API (`/api/memory/:key`, file-backed), and `services/knowledgeService.ts` is **server-first**: on first use it hydrates from the server (server data is the source of truth; local data migrates up when the server has none), mutations write through, and when the server is unreachable it silently falls back to the previous localStorage behavior — offline use is unchanged. Exported signatures are unchanged (synchronous, cache-backed). Speech synthesis uses Gemini TTS when a key is configured, else the browser's Web Speech API; transcription requires a Gemini key (no server transcription endpoint exists) and fails with a visible error without one. The LiveWatcher panel polls council-api's session list (there is no server event-ingest endpoint, so it cannot show a live message stream), and `OrchestrationPanel` is present but not mounted by the app.

## Security

- **All API keys are env-only since 2.2.0.** No key values live in scripts or source; `.env.example` documents the variables with placeholders only. Never commit a real `.env`.
- **Rotate if you used older versions:** versions before 2.2.0 committed an LM Studio key in `start-all.sh`. If you ever ran or shared a checkout from that era, rotate that LM Studio key — treat it as exposed.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for the full history. Summary of **2.3.0** (the decision release):

- **Decision service:** `POST /api/decide` + MCP tool `council_decide` (tools/list 55 → 56) speaking the System One protocol to Liquid AI's D1 (`d1-2b` via LM Studio `POST /v1/systemone`) — atomic choice + readiness questions in one call, a `defer` catch-all, confidence bands (act ≥ 0.85 / review ≥ 0.60 / else escalate), optional `council: true` deliberation folded into the decision state ("council advises, decider decides"), and hard-fail 502 semantics — never a fabricated verdict. Config via `providers.decision` / `DECISION_URL` / `DECISION_MODEL`. See Decision Models.
- **Server-side council memory:** `GET /api/memory`, `GET/PUT/DELETE /api/memory/:key` on council-api, persisted atomically to `data/council-memory.json` (`COUNCIL_MEMORY_FILE` override). The Chamber's `knowledgeService` is now server-first with a silent localStorage fallback.
- **Fleet integration:** council-api deployed as the `agent-teams-council` systemd user service on Robin (port 3001, LM Studio reached via Robin's local tunnel) and registered in Hermes' default profile on the Mac as the `agent-teams-council` MCP server (56 tools verified via `hermes mcp test`). See Fleet integration.
- `npm test` 31/31 (was 26): decision-service checks, MCP `council_decide`, and memory-store checks added. Chamber build clean.
- Version unified at **2.3.0**.

Summary of **2.2.1** (the completion pass — the three gaps left open by 2.2.0, closed):

- **Chamber UI reworked and buildable:** the missing `services/` layer was authored against the real endpoints (`aiService`, `knowledgeService`, `CouncilOrchestrationService`), imports/layout reconciled to the canonical `council-types.ts` / `council-constants.ts` / `council-components/`, strict TypeScript gate added, Tailwind v4 wired (no CSS was linked before), dead code removed, and fake-data paths deleted (including a session-event emitter that posted to an endpoint no server has). One-command build: `./scripts/build-chamber.sh` → `council-dist/`. Smoke-verified against stub-backed servers (councilors, modes, session start → completed deliberation).
- **Councilor data unified:** one canonical `councilors.json` (86 councilors, merged superset of the three divergent rosters, legacy ids preserved as aliases) loaded by both servers; engine prompt/banner counts are dynamic now; `npm test` gained roster-parity checks (20 checks total).
- **Python swarm orchestrator boot-tested:** stdlib-only, single `main()` entry; four input-handling bugs fixed (`--help` wrote a junk plan, `--count` crashed on non-numeric input and accepted out-of-range values, `--domain` was unvalidated). Verified verdicts recorded in `agent-swarm-system/README.md`.
- Version unified at **2.2.1** (`VERSION`, every `package.json`, and the council health response).

Summary of **2.2.0**:

- Secrets scrubbed to env-only; `start-all.sh` rewritten (PID-file management, no broad `pkill`, agent-mesh-api service removed — it is a separate repo now, not started here).
- Stale LM Studio endpoints replaced with `127.0.0.1` defaults; LM Studio URL/key now env-driven on council-server.
- Missing root dependencies added (`express`, `cors`) and all dependencies updated to current stable; root npm scripts fixed to the real ports (3003 / 3001 / 3456).
- Council-server audit outcome: both servers kept, with documented roles (deliberation/MoA engine on 3003 vs control plane on 3001) — see the service map above.
- council-api: new `POST /api/llm/provider` and `POST /api/llm/test` endpoints.
- WebUI drift fixes: health probe, session shape, and `council-new.html` repointed to real endpoints with honest failures.
- MCP server fixes: `COUNCIL_PORT` default corrected 3006 → 3001, a JSON-RPC response hang fixed, 23 tools verified; council-api's `POST /mcp` verified at 55 tools.
- New 17-check stub-based test suite: `npm test` (no real LLM needed).
- MoA OpenClaw plugin test fixed (vitest suite green).
- Chamber build wiring added (root `index.html`, `vite.config.ts` → `council-dist`) — the build was still blocked on the missing `services/*` modules in this release; fixed in 2.2.1, see above.
- `council-dist` build output and `.bak` files untracked from git.
- Version unified at **2.2.0** (`VERSION` and every `package.json`).

## Repository layout (top level)

- `council-server.js`, `council-api-server.cjs`, `mcp-server.js`, `webui/` — the HTTP services above.
- `council-app.tsx`, `council-index.tsx`, `council-components/`, `council-types.ts`, `council-constants.ts`, `services/`, `hooks/` — the Chamber UI (build: `./scripts/build-chamber.sh`).
- `councilors.json` — the canonical councilor dataset both council servers load.
- `moa/` — MoA runtime and the OpenClaw plugin.
- `council-cli.js` — CLI v3.
- `agent-api-server/`, `agent-swarm-system/` — separate components, not started by `start-all.sh` (see service map).
- `test/` — the stub-LLM test harness behind `npm test`; `test-moa.js` at the root is the manual MoA check.
- `docs/` — additional documentation; where a doc disagrees with this README or the code on ports/defaults, the code wins.
