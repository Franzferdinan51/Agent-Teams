# Agent-Teams

**Version 2.2.1** · Node.js ≥ 18 · MIT

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
| Control plane + MCP over HTTP | `council-api-server.cjs` | **3001** (`PORT` env, default 3001) | Express server. Councilor CRUD, settings persistence (`settings.json`, a gitignored runtime file), vision + browser tools, `POST /api/ask`, `POST /api/llm/provider`, `POST /api/llm/test`, and MCP over HTTP at `POST /mcp` (verified `tools/list` = 55 tools). |
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
| `BRAVE_API_KEY`, `BROWSEROS_MCP_URL` | Optional integrations; `BROWSEROS_MCP_URL` defaults to `http://127.0.0.1:9000/mcp`. |
| `MESH_URL`, `LOG_LEVEL` | `http://localhost:4000`, `INFO`. |

Settings changed through council-api at runtime are persisted to `settings.json` next to `council-api-server.cjs` — a runtime file, not source; it is gitignored.

## Tests

- **`npm test`** — `test/run-tests.js` boots a stub LLM (`test/stub-llm.js`, canned OpenAI-compatible responses, no real API calls) plus both council servers and runs **20 checks, all passing**: health, councilors, roster parity between the two servers and the canonical `councilors.json`, providers, a full deliberation session, MoA presets + a MoA run, council-api providers, `POST /api/llm/provider`, `POST /api/llm/test`, `POST /api/ask`, MCP `tools/list`, and CLI health/councilors smoke checks.
- **MoA plugin tests** — in `moa/openclaw-plugin/`: `npm test` runs its vitest suite (green).
- **`node test-moa.js`** — manual MoA check; point `LM_STUDIO_URL` at any OpenAI-compatible endpoint (a real LM Studio with a model loaded, or the stub).

## Chamber UI

The React Chamber UI (`council-app.tsx`, `council-index.tsx`, `council-components/`, `council-types.ts`, `council-constants.ts`, manifest `council-package.json`) was **reworked in 2.2.1** and builds cleanly:

- **Build (one command):** `./scripts/build-chamber.sh` — stages the sources with `council-package.json` as `package.json` next to its lockfile, installs, type-checks (`tsconfig.chamber.json`, strict), and runs the Vite build into `council-dist/`. The root `package.json`/`node_modules` are untouched.
- **Services are real:** `services/aiService.ts` talks to the per-bot OpenAI-compatible endpoint from Settings (`POST {base}/chat/completions`, SSE streaming with JSON fallback; default `http://127.0.0.1:1234/v1`). `services/CouncilOrchestrationService.ts` is a client-side engine that executes real turns through the same chat path. The app loads the live councilor registry and modes from council-api (3001) on mount and shows a visible error if the API is down — no demo data anywhere.
- **Honest limits, stated plainly:** neither council server has a memory/knowledge API, so `services/knowledgeService.ts` is a browser-local (localStorage) store — the same model the app always used — until a server memory API exists. Speech synthesis uses Gemini TTS when a key is configured, else the browser's Web Speech API; transcription requires a Gemini key (no server transcription endpoint exists) and fails with a visible error without one. The LiveWatcher panel polls council-api's session list (there is no server event-ingest endpoint, so it cannot show a live message stream), and `OrchestrationPanel` is present but not mounted by the app.

## Security

- **All API keys are env-only since 2.2.0.** No key values live in scripts or source; `.env.example` documents the variables with placeholders only. Never commit a real `.env`.
- **Rotate if you used older versions:** versions before 2.2.0 committed an LM Studio key in `start-all.sh`. If you ever ran or shared a checkout from that era, rotate that LM Studio key — treat it as exposed.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for the full history. Summary of **2.2.1** (the completion pass — the three gaps left open by 2.2.0, closed):

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
