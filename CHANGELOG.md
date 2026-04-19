# Changelog

All notable changes to AgentTeams will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.1.0] - 2026-04-19 - Hive Congress — Full Government Simulation

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
