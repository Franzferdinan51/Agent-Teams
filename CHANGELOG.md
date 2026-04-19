# Changelog

All notable changes to AgentTeams will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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
