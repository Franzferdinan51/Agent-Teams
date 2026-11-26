# Changelog

All notable changes to AgentTeams will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [2.3.0] - 2026-11-26 - Decision service (D1), server-side council memory, fleet deployment

### Added
- **Decision service:** `POST /api/decide` on council-api and the MCP tool **`council_decide`** (MCP `tools/list` 55 → **56**). Implements the System One pattern (code owns the workflow, the model owns one judgment): one POST to the decision provider's native `POST /v1/systemone` carrying two atomic questions — a `pick` choice question (caller options plus an explicit `__defer__` catch-all) and a `ready` noul readiness question. Default provider is Liquid AI's **d1-2b** via LM Studio (`providers.decision`, env `DECISION_URL` / `DECISION_MODEL`, runtime-repointable via `PUT /api/providers/decision`). Verdicts carry the full per-option probability distribution (`scores`), `deferProbability`, `confidence`, `readiness`, and a gating `band` (act ≥ 0.85, review ≥ 0.60, else escalate; deferred → escalate; thresholds overridable per call). With `council: true` the council deliberates first and its text is folded into the decision state — council advises, decider decides; the numbers come only from D1. Provider failure or a malformed answer is a hard **502**, never a fabricated verdict; input validation errors are 400.
- **Server-side council memory:** `GET /api/memory` → `{entries: {key: {value, updatedAt}}}`, `GET /api/memory/:key` → `{key, value, updatedAt}` (404 `{error}` when absent), `PUT /api/memory/:key` with `{value: <any JSON>}` (missing `value` → 400; serialized value > 256 KB → 413), `DELETE /api/memory/:key` → `{ok: true}` (404 when absent). Persisted to `data/council-memory.json` (override `COUNCIL_MEMORY_FILE`, now gitignored) with atomic tmp-file + rename writes; loaded lazily; a missing or corrupt file starts empty (corruption is logged, never a crash).
- **Fleet integration:** council-api deployed to Robin (tailnet `100.88.161.36`) as the systemd user service `agent-teams-council` (deploy dir `~/agent-teams`, port 3001, decision/chat providers reached via Robin's local LM Studio tunnel), and registered in Hermes' default profile on the Mac as MCP server `agent-teams-council` (`http://100.88.161.36:3001/mcp`). README gains Decision Models and Fleet integration sections, including a worked agent quickstart whose curl examples were run live against the Robin service.

### Changed
- **Chamber knowledge is server-first:** `services/knowledgeService.ts` now hydrates its collections from the council memory API on first use (server is the source of truth; existing local data migrates up when the server has none), writes through on every mutation, and silently falls back to the previous localStorage behavior when the server is unreachable. All exported signatures unchanged (synchronous, cache-backed); offline use unaffected. `./scripts/build-chamber.sh` passes clean (strict tsc + Vite build).
- Version unified at 2.3.0 (`VERSION`, root/council/agent-api/MoA-plugin `package.json` files and their lockfiles, council-server health response, `start-all.sh` banners, `.env.example` header, README version line). Component-internal API versions (council-api health `3.1.0`) are not release stamps and stay.

### Verified
- `npm test` **31/31** (26 previous + 5 new): `/api/decide` happy path, `council: true` deliberation trace, decision-provider-down → 502, MCP tools/list = 56 incl. `council_decide`, MCP `council_decide` verdict, and memory PUT → GET round-trip / list / on-disk file / DELETE → 404. The test stub (`test/stub-llm.js`) serves a deterministic `/v1/systemone` in the real pinned D1 wire shape.
- **Live on Robin:** service restarted on the new build; `/api/health` ok, MCP tools/list = 56, memory PUT/GET round-trip against the service (persisted to `~/agent-teams/data/council-memory.json`), and a real `POST /api/decide` ticket question returned a D1 verdict (chosen A "Cheap simple route", confidence 0.982, band act) through Robin's tunnel to the Mac's LM Studio.
- **Live on the Mac (read-only):** `hermes mcp test agent-teams-council` connects and discovers 56 tools incl. `council_decide`. No Hermes config changes in this release. The decide calls JIT-loaded `d1-2b` on the Mac; it was the only loaded model and was unloaded afterwards, restoring the empty resting state. Maya :8086 untouched.

## [2.2.2] - 2026-11-26 - /api/ask hard-fails when no LLM provider answers

### Changed
- **`POST /api/ask` failure behavior (owner decision):** when every configured LLM provider (MiniMax, then LM Studio) fails to produce a response, the endpoint now returns **HTTP 502** with an `error` message instead of plausible canned councilor text. Previously a dead model silently produced fake "responses" indistinguishable from real ones. The canned-response generator (`generateContextualResponse`) is removed entirely — no code path fabricates council answers. Successful responses are unchanged, and the deliberate() cache only ever stores real provider output. The MCP deliberation tools surface the same failure as a tool error.
- Version unified at 2.2.2.

### Added
- Test: `npm test` gains a dead-provider check — with the LM Studio endpoint pointed at a dead port, `/api/ask` must return 502 with an error and no `responses` (21 checks total).

## [2.2.1] - 2026-11-26 - Completion Pass: Chamber Rework, Councilor Unification, Swarm Verification

### Added
- **Chamber UI services layer:** `services/aiService.ts` (per-bot OpenAI-compatible chat with SSE streaming + JSON fallback; Gemini TTS with Web Speech fallback; Gemini transcription that fails visibly without a key), `services/knowledgeService.ts` (honest browser-local store — neither server has a memory API), `services/CouncilOrchestrationService.ts` (client-side orchestration executing real chat turns), and `hooks/useLiveSession.ts` (polls council-api sessions/councilors).
- **Chamber build:** `scripts/build-chamber.sh` — one-command clean build (staged install → strict `tsc` via `tsconfig.chamber.json` → Vite) emitting `council-dist/`; `@types/react`/`@types/react-dom` added; Tailwind v4 (`@tailwindcss/vite`) wired with a safelist for interpolated classes — previously no CSS was linked at all.
- **Roster-parity tests:** `npm test` now also verifies both council servers serve the canonical `councilors.json` id set (20 checks total).

### Changed
- **Chamber UI reworked:** imports reconciled to the canonical `council-types.ts` / `council-constants.ts` / `council-components/` layout; the app loads the real councilor registry (86) and modes from council-api on mount with a visible error state when the API is down; Vite dev/preview proxy `/api` → council-api.
- **Councilor data unified:** `councilors.json` is now the single canonical dataset (86 councilors — the merged superset of the engine's 53, the API's 24, and the old file's 62) loaded by both servers (`COUNCILORS_PATH` override; clear fatal error if missing). Entries carry display + persona fields; every legacy id is preserved under `alias`/`aliases` and the API's `get_councilor` resolves them. Engine prompt/banner councilor counts are dynamic instead of hardcoded ("45"/"53").
- Version unified at 2.2.1 (`VERSION`, all `package.json` files, council health response).

### Fixed
- **Chamber UI:** 4 strict-TypeScript errors (including a ChatWindow thinking indicator keyed on a nonexistent message field); the app's session-event emitter POSTed to `/api/session/event`, which exists on neither server — removed with all its call sites; the shipped default AI endpoint was a dead tailnet IP, corrected to `127.0.0.1:1234/v1`.
- **Swarm orchestrator:** `--help`/`-h` was treated as a task and wrote a junk plan file (now prints usage, exit 0); `--count` crashed with a traceback on non-numeric input (now a clean error, exit 2) and accepted out-of-range values (0 produced an empty plan, −1 produced 49 agents — now clamped to the documented 1–15); `--domain` is validated against the seven real domains.

### Removed
- Proven-dead `council-components/LiveSession.tsx` (zero importers) and the Chamber's fake-data paths. `OrchestrationPanel` remains unmounted (pre-existing), now backed by a real service.

### Verified
- Chamber clean build passes; HTTP-level smoke against stub-backed servers: page/bundle/CSS 200, councilors (86, correct shape), modes (11), session start, and a completed deliberation on the engine.
- `npm test` 20/20, including deliberation against the stub LLM and the new roster-parity checks.
- Swarm orchestrator boot-tested in an isolated venv (stdlib-only): all entry flows pass post-fix; it is a planner that writes `plans/plan-<id>.json` — it does not dispatch agents. Full verdicts in `agent-swarm-system/README.md`.

## [2.2.0] - 2026-11-25 - Security, Ports & Test Overhaul

### Security
- All API keys are env-only: secrets scrubbed from scripts and source; `.env.example` documents every variable with placeholders only. Older versions committed an LM Studio key in `start-all.sh` — rotate that key if you used an older version.
- `start-all.sh` rewritten: PID-file management (`.agent-teams.pids`), no broad `pkill`, repo-local `.env` only, and the agent-mesh-api service removed (it lives in a separate repo and is no longer started here).

### Fixed
- Stale LM Studio endpoints replaced with `127.0.0.1` defaults; council-server LM Studio URL/key are now env-driven (`LMSTUDIO_URL`/`LM_STUDIO_URL`, key env-only).
- Missing root dependencies added (`express`, `cors`); all dependencies updated to current stable.
- Root npm scripts fixed to the real ports: council-server 3003, council-api 3001, standalone MCP 3456.
- MCP server: `COUNCIL_PORT` default corrected 3006 → 3001, JSON-RPC response hang fixed, 23 tools verified.
- WebUI drift fixes: health probe, session shape, and `council-new.html` repointed to real endpoints with honest failures.
- MoA OpenClaw plugin test fixed (vitest suite green).

### Added
- Council-server audit outcome: both servers kept with documented roles — `council-server.js` is the deliberation + MoA engine (port 3003), `council-api-server.cjs` is the control plane (port 3001: councilor CRUD, settings, vision/browser tools, MCP over HTTP at `POST /mcp`, verified 55 tools).
- council-api: new `POST /api/llm/provider` and `POST /api/llm/test` endpoints.
- New stub-based test suite: `npm test` runs `test/run-tests.js` (stub LLM in `test/stub-llm.js`, no real API calls) — 17 checks, all passing.
- Chamber build wiring: root `index.html` + `vite.config.ts` (`outDir: council-dist`) and a fixed entry import. The Chamber build is still blocked: the app imports `services/aiService` and `services/knowledgeService` modules that do not exist in the repo.

### Changed
- Version unified at 2.2.0 (`VERSION` and all `package.json` files).
- `council-dist` build output and `.bak` files untracked from git.
- README rewritten to verified reality (service map, real ports, honest Chamber UI status).

---

## [1.7.0] - 2026-04-19 - CLI + MCP + Cross-Platform

### NEW: Full CLI System
- `cli/index.js` - Unified command line interface
- `cli/platform-detect.js` - Platform detection (Mac/Linux/Termux/Android)
- `cli/hive` - Shell entry point
- `install.sh` - Cross-platform installer

### NEW: MCP Server
- `cli/mcp/server.js` - Model Context Protocol server
- Works with Claude CLI: `claude --mcp /path/to/cli/mcp/server.js`
- Exposes all Hive tools as MCP tools

### NEW: Termux:API Support (Android)
With `pkg install termux-api`:
- `hive camera 0` - Take photo
- `hive location` - Get GPS coordinates
- `hive clipboard [text]` - Get/set clipboard
- `hive notify "Title" "Message"` - Show notification
- `hive speak "Hello"` - Text-to-speech
- `hive sms 5551234 "Hi"` - Send SMS
- `hive vibrate 500` - Vibrate
- `hive flashlight on` - Toggle flashlight

### Platforms Supported
| Platform | CLI | MCP | Termux API |
|----------|-----|-----|------------|
| Mac | ✅ | ✅ | N/A |
| Linux | ✅ | ✅ | N/A |
| Termux | ✅ | ✅ | ✅ |
| Termux:API | ✅ | ✅ | ✅ |

---

## [1.2.0] - 2026-04-19 - Constitution SOUL + Government Operations

### Added

#### THE SOUL OF THE HIVE NATION (New!)
- **Like a SOUL.md for agents** — the nation's personality!
- **Core beliefs** that guide everything
- **What we stand for** (free speech, transparency, justice, privacy)
- **What we forbid** (slavery, cruelty, unlimited power)
- **The cast of characters** — funny biographies!

#### Funny Character Bios:
```
President Honeycomb McStuffins
  "The SWEETEST leader the Hive has ever seen"
  Fun fact: Allergic to bees but nobody has the heart to tell him

Vice President Sir Loxington Bumblebee III
  "The ceremonial fluff ball"
  Fun fact: Won an election by accident and just went with it

Speaker Fluffernutter Honksworth
  Fun fact: 100% attendance for 47 years straight

Majority Leader Buzz Lightwing
  Fun fact: Actually three bees in a suit
```

### Added

#### 📜 HIVE CONSTITUTION — The Founding Document
- **hive-constitution.js** (23KB) — Complete US-style constitution

##### Articles 1-7:
- **Article I**: Legislative Powers (Congress, House, Senate)
- **Article II**: Executive Powers (President, VP, Cabinet, Electoral College)
- **Article III**: Judicial Powers (Supreme Court, Judicial Review)
- **Article IV**: States and Federalism
- **Article V**: Amendment Process
- **Article VI**: Federal Supremacy (Supremacy Clause)
- **Article VII**: Ratification

##### Bill of Rights (Amendments 1-10):
1. Freedom of Expression (Speech, Religion, Press, Assembly, Petition)
2. Right to Bear Arms
3. Housing of Soldiers
4. Search and Seizure
5. Due Process and Takings
6. Right to Fair Trial
7. Civil Trials by Jury
8. Cruel and Unusual Punishment
9. Rights Retained by People
10. Powers Reserved to States

##### Amendments 11-27:
- 11: Sovereign Immunity (1795)
- 12: Presidential Elections (1804)
- 13: Abolition of Slavery (1865)
- 14: Citizenship and Equal Protection (1868)
- 15: Voting Rights (1870)
- 16: Income Tax (1913)
- 17: Direct Election of Senators (1913)
- 18: Prohibition (1919)
- 19: Women's Suffrage (1920)
- 20: Terms and Succession (1933)
- 21: Repeal of Prohibition (1933)
- 22: Limit on Presidential Terms (1951)
- 23: DC Voting Rights (1961)
- 24: Poll Tax Prohibited (1964)
- 25: Presidential Disability (1967)
- 26: Voting Age 18 (1971)
- 27: Congressional Pay (1992)

##### Constitutional Principles:
- Separation of Powers (3 branches, powers & limits)
- Checks and Balances (5 key checks defined)

### Commands
```bash
# View Constitution
./scripts/hive-constitution.sh full              # Entire document
./scripts/hive-constitution.sh preamble        # Preamble
./scripts/hive-constitution.sh article 1       # Article I (Legislative)
./scripts/hive-constitution.sh article 2       # Article II (Executive)
./scripts/hive-constitution.sh article 3       # Article III (Judicial)
./scripts/hive-constitution.sh bor             # Bill of Rights
./scripts/hive-constitution.sh amendments      # Amendments 11-27
./scripts/hive-constitution.sh amendment 14     # View specific amendment
./scripts/hive-constitution.sh principles      # Separation + Checks

# Search
./scripts/hive-constitution.sh search "slavery"  # Search term
```

---

## [1.1.1] - 2026-04-19 - Hive Congress GOVERNMENT OPERATIONS

### Changed

- **"Simulation" → "Operations"** — No fake connotation, actual operations
- **Funny Hive-themed names** — No real political names:
  - President Commander Quackford (was James Biden)
  - Senator Honks McQuackface (Speaker)
  - Senator Buzz Thornhill (Majority Leader)
  - Senator Wingnut R. Badwing (Minority Leader)
  - Chief Justice Hexagon Roberts III
  - Justice Blossom Sotomayor, Petalmaster Kagan, Dandelion Jackson
  - Secretary of State Fluttershy Blinken
  - And many more bee/hive-themed funny names!

---

## [1.1.0] - 2026-04-19 - Hive Congress — Full Government Operations

### Added

#### 🏛️ HIVE CONGRESS — Three Branches of Government
- **hive-congress.js** (30KB) — Complete government simulation

##### THREE BRANCHES:

**📜 LEGISLATIVE BRANCH**
- **Senate (Upper House)** — 100 seats (2 per state)
  - Speaker, Majority/Minority Leaders
  - Majority/Minority Whips
  - Leadership + all 100 state seats
- **House of Representatives (Lower House)** — 435 seats
  - Speaker, Majority/Minority Leaders
  - Seats by delegation
  - Committee assignments

**⚡ EXECUTIVE BRANCH**
- President + Vice President
- 15 Cabinet Secretaries:
  - State (Foreign Policy)
  - Treasury (Economics)
  - Defense (Military)
  - Justice (Law Enforcement)
  - Energy, Agriculture, Commerce, Labor
  - HHS, HUD, Transportation, Education
  - Veterans Affairs, Homeland Security
- White House Staff:
  - Chief of Staff, Press Secretary
  - National Security Advisor
  - Council of Economic Advisers

**⚖️ JUDICIAL BRANCH**
- Supreme Court — 9 Justices
  - Chief Justice John Roberts III
  - 6 Conservative, 3 Liberal justices
  - Ideology tracking, voting records

##### INTER-BRANCH INTERACTIONS:
- Bill must pass BOTH Senate AND House
- President can veto bills
- Congress can override veto (2/3 both chambers)
- Courts can strike down laws/executive orders
- Treaties require Senate confirmation (2/3)
- Appointments require Senate confirmation (51)
- Impeachment process (House charges, Senate trials)

##### LEGISLATION LIFECYCLE:
```
Bill Introduced → Senate Vote → House Vote → President → Law
                    ↓            ↓           ↓
                  Veto ← Override  Veto  → Court Review
```

### Commands
```bash
# Government Structure
./scripts/hive-congress.sh structure

# Legislation
./scripts/hive-congress.sh bill "Privacy Act"
./scripts/hive-congress.sh vote S.123 senate 60 40 51
./scripts/hive-congress.sh present S.123
./scripts/hive-congress.sh sign S.123
./scripts/hive-congress.sh veto S.123 "Constitutional concerns"
./scripts/hive-congress.sh override S.123 70 300

# Executive
./scripts/hive-congress.sh eo "Immigration Policy"
./scripts/hive-congress.sh cabinet "Climate Change"

# Judicial
./scripts/hive-congress.sh case "Tech v. Government"
./scripts/hive-congress.sh decision SCOTUS-123 "Struck Down" 6 3

# Other
./scripts/hive-congress.sh treaty "Trade Agreement" 60
./scripts/hive-congress.sh appointment "Nominee" "Secretary" 55
./scripts/hive-congress.sh impeachment "Official" "Charges"
```

---

## [1.0.5] - 2026-04-19 - Hive Senate Pro Enhancements

### Added

#### 🏛️ Hive Senate Pro — Advanced Congressional Features
- **hive-senate-pro.js** (22KB) — Advanced senate simulation

##### Bill Lifecycle System
- Introduce legislation with sponsors/cosponsors
- Track through 8 steps (introduced → law)
- Amendment proposals and voting
- Presidential veto and override (67 votes)

##### Witness Testimony
- Expert witnesses by category (tech, business, legal, emergency, agriculture)
- Formal hearing transcripts
- Senator questions and witness answers

##### Floor Debate Transcripts
- Full session transcripts
- Pro/con speeches recorded
- Speaker tracking and duration

##### Senator Profiles
- Detailed backgrounds (name, age, state, experience)
- Voting records (attendance, aye/nay percentage)
- Committee assignments
- Constituency representation

##### Party Leadership
- Majority/Minority Leaders and Whips
- Policy Chairs per party
- Neutral Bloc coordination

##### Constituency System
- Each senator represents an interest group
- Polling/approval ratings
- Key interests tracked

### Commands
```bash
# Bills
./scripts/hive-senate-pro.sh bill "Privacy Act"  
./scripts/hive-senate-pro.sh bills
./scripts/hive-senate-pro.sh advance S.123 "Committee Vote"

# Hearings
./scripts/hive-senate-pro.sh hearing Judiciary "AI Regulation" legal
./scripts/hive-senate-pro.sh testimony HRG-123 "My testimony..."

# Floor
./scripts/hive-senate-pro.sh session "Immigration Reform"
./scripts/hive-senate-pro.sh speak SESSION-123 Senator pro "I believe..."

# Profiles
./scripts/hive-senate-pro.sh profile botanist
./scripts/hive-senate-pro.sh leadership
./scripts/hive-senate-pro.sh constit meteorologist

# Veto
./scripts/hive-senate-pro.sh veto S.123 "Constitutional concerns"
./scripts/hive-senate-pro.sh override S.123 70
```

---

## [1.0.4] - 2026-04-19 - Agent Coordinator Anti-Spam System

### Added

#### 🤖 Agent Coordinator — Smart Sub-Agent Management
- **agent-coordinator.js** (20KB) — Intelligent coordination engine
  - **Batching Logic** — Combines similar tasks into single runs
  - **Queue Management** — Overflow queuing instead of spam
  - **Mesh Coordination** — Check existing agents before spawning
  - **Rules Engine** — Per-task-type coordination rules
  - **Resource Limits** — Max concurrent agents enforced
  - **Efficiency Tracking** — Batch rate, avg task time
  - **Anti-Spam Patterns** — 4 patterns for efficient spawning

#### Coordination Rules by Task Type
| Type | Max Concurrent | Batch Similar | Strategy |
|------|---------------|--------------|----------|
| research | 3 | ✅ | Delegate to mesh |
| coding | 2 | ❌ | Spawn fresh |
| review | 2 | ✅ | Local only |
| test | 3 | ✅ | Spawn fresh |

#### Anti-Spam Patterns
1. **Batch Similar** — 10 research topics = 1 agent, not 10
2. **Mesh Check First** — Avoid duplicating work
3. **Queue When Busy** — Don't overwhelm system
4. **Priority Queuing** — Critical tasks skip queue

#### Updated
- `skills/micro-agents/SKILL.md` — Complete coordination guide
- `scripts/agent-coordinator.sh` — CLI wrapper

---

## [1.0.3] - 2026-04-19 - Hive Senate 2.0 Enhancements

### Added

#### 🏛️ Hive Senate 2.0 — Enhanced AI Council
- **hive-senate.js** (18KB) — Complete senate simulation
  - **45 Senators** with metadata (party, expertise, term, veto)
  - **Committee System** — Topic-focused groups (auto-select experts)
  - **Partisan Caucuses** — Coalition building by ideology
  - **Bipartisan Coalition** — Cross-ideology cooperation
  - **Filibuster Mode** — Extended debate with speeches
  - **Cloture Votes** — 60% supermajority to end filibuster
  - **Veto Power** — Security/Budget/Emergency vetoes
  - **Brainstorm Mode** — Ideas without criticism
  - **Red Team / Blue Team** — Adversarial debate format
  - **Minority Reports** — Dissenting opinions recorded
  - **Senator Elections** — Term limits and rotation
  - **Joint Sessions** — Full congress for critical votes
  - **Performance Tracking** — Senator effectiveness scores

- **hive-senate.sh** — CLI wrapper

- **skills/senate/SKILL.md** — Complete senate documentation

### Features
| Feature | Description |
|---------|-------------|
| Committee | 5 senators with matching expertise |
| Caucus | 7-15 senators by ideology |
| Filibuster | Indefinite debate until cloture |
| Veto | Security/Budget/Emergency blocks |
| Supermajority | 60% for constitutional changes |
| Brainstorm | No criticism, just ideas |
| Red/Blue | 4v4 adversarial debate |

### Updated
- `START-HERE.md` — Added Senate 2.0 section
- `QUICKREF.md` — Added Senate commands

---

## [1.0.2] - 2026-04-19 - ComfyUI Integration + Creative Suite

### Added

#### 🎨 Hive ComfyUI — Full Diffusion Control (30KB)
- **Image Generation**: Flux (schnell/dev), SDXL, SD3, PixArt, HunyuanDiT, HiDream, Qwen Image
- **Video Generation**: Stable Video Diffusion, Mochi, LTX-Video, Hunyuan Video, Wan 2.1
- **Audio Generation**: Stable Audio, ACE Step
- **3D Generation**: Hunyuan3D 2.0
- **Advanced**: ControlNet, LoRA, Inpainting, Upscaling, Custom workflows
- **CLI**: Full shell interface + JavaScript API
- **Auto-poll**: Waits for completion, returns image URLs

#### Updated
- `skills/creative-agents/SKILL.md` — Complete ComfyUI documentation
- `START-HERE.md` — Added ComfyUI section
- `QUICKREF.md` — Added ComfyUI commands

---

## [1.0.1] - 2026-04-19 - Local Stack + Vision Enhancements

### Added

#### 🏠 Hive Local — Unified Local AI Stack
- `hive-local.js` (27KB) — Complete offline AI
  - **LM Studio integration** — Local model inference (Qwen, Llama, Mistral, Gemma)
  - **Vision** — Local image analysis with Qwen VL/LLaVA
  - **Voice STT** — Whisper transcription (base, small, medium, large)
  - **Voice TTS** — macOS say for instant offline TTS
  - **Web Search** — DuckDuckGo scraping, Brave API fallback
  - **GitHub** — gh CLI integration (search repos, code, issues)
  - **File Search** — find/grep for local files
  - **Cloud Fallbacks** — Seamless switch to cloud when local unavailable

- `hive-local.sh` — CLI wrapper

- `skills/local/SKILL.md` — Local stack documentation

#### 👁️ Vision Enhancements
- 5 vision models: Kimi K2.5, GPT-5.4, MiniMax VL, Qwen VL, Gemini 2.0
- Screen capture + analysis
- Batch processing
- Image comparison
- Preset analyses (growth, chart, document, receipt, code, room)

### Updated
- `START-HERE.md` — Added local stack section
- `QUICKREF.md` — Added local commands reference

---

## [1.0.0] - 2026-04-19 - The Complete Hive Senate

### Added

#### Core System
- **Hive Mind** — Central coordination layer
  - `hive-router.js` — Route tasks to best agent
  - `hive-consensus.js` — Hive-wide voting
  - `hive-memory.js` — Shared context
  - `hive-learning.js` — Cross-agent learning
  - `hive-queue.js` — Distributed task queue
  - `hive-emergency.sh` — Emergency broadcasts (DEFCON system)
  - `hive-watchdog.js` — Monitor + auto-restart
  - `hive-discovery.js` — Find capabilities

#### AI Council — The Senate
- **45 Councilors** — Expert archetypes
  - Core: Speaker, Technocrat, Ethicist, Pragmatist, Skeptic, Sentinel, Visionary, Historian, Diplomat, Journalist, Psychologist, Conspiracist, Propagandist, Moderator, Coder
  - Business: Economist, Product Manager, Marketing Expert, Finance Expert, Risk Manager
  - Technical: DevOps Engineer, Security Expert, Data Scientist, Performance Engineer, QA, Solutions Architect, Technical Writer
  - Emergency: Meteorologist, Emergency Manager, Animal Care Specialist, Risk Analyst, Local Resident
  - Plant Science: 🌿 Botanist, 🧬 Geneticist
  - Vision: Visual Analyst, Pattern Recognizer, Color Specialist, Composition Expert, Context Interpreter, Detail Observer, Emotion Reader, Symbol Interpreter

- **11 Deliberation Modes**
  - ⚖️ Legislative — Debate + vote
  - 🧠 Deep Research — Multi-round research
  - 🐝 Swarm Hive — Dynamic task decomposition
  - 💻 Swarm Coding — Software engineering
  - 🌪️ Emergency Response — Crisis decisions
  - 📊 Risk Assessment — Risk analysis
  - 🤝 Consensus Building — Find common ground
  - 🎯 Strategic Planning — Long-term strategy
  - 👁️ Vision Council — Image analysis

#### P2P Decentralized Mesh
- `hive-mesh-p2p.js` — Pure peer-to-peer communication
- `hive-p2p.sh` — CLI for P2P mesh
- Gossip protocol for message propagation
- Optional relays for NAT traversal
- No blockchain, no central server

#### Federation (Optional)
- `hive-federation.js` — Multi-instance collaboration
- `hive-federation.sh` — Federation CLI
- Share councilors across federations
- Delegate tasks to other instances
- Opt-in only — full system works standalone

#### Micro-Agents
- 30+ single-purpose agents
- All can spawn sub-agents
- Research, Coding, Creative, QA, Planning categories

#### Memory & Dreaming
- `dreaming-engine.js` — Light → REM → Deep cycles
- `subconscious.js` — 30-min cron consolidation
- `session-manager.js` — Session + context loading

#### Integration Scripts
- `openclaw-hive.sh` — Connect OpenClaw
- `ai-council-hive.sh` — Connect AI Council
- `hive-connect.sh` — Connect any system
- `creative-hive.sh` — Connect creative tools

### Documentation
- `START-HERE.md` — Quick start guide
- `QUICKREF.md` — All commands at a glance
- `AGENTS.md` — For AI agents
- `skills/*/SKILL.md` — Detailed skill docs

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     THE HIVE SENATE v1.0.0                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   🏛️ AI Council (45 Senators, 11 Modes)                          │
│   🕸️ Hive Mind (Router, Queue, Memory, Learning)                 │
│   🤖 30+ Micro-Agents                                          │
│   🕸️ P2P Mesh (Decentralized)                                 │
│   🏠 Federation (Optional Expansion)                             │
│   🌙 Dreaming System (Memory Consolidation)                      │
│   🚨 Emergency Broadcast (DEFCON System)                         │
│                                                                     │
│   Works 100% standalone — Federation is optional                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## [0.0.0] - 2026-04-18 - Initial Foundation

### Added
- Agent Mesh API integration
- Live messenger
- Meta-agent patterns
- Multi-agent coordination

---

[Unreleased]: https://github.com/Franzferdinan51/Agent-Teams/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/Franzferdinan51/Agent-Teams/releases/tag/v1.0.0
