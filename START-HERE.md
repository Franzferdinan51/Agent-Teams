# 🕸️ START HERE — AgentTeams Complete Guide

**The ultimate multi-agent collaboration system. Get started in 5 minutes.**

> 🏠 **Federation is OPTIONAL** — The full program works 100% standalone.
> Join the federation only if you want to collaborate with other instances.
> See [Federation](#federation-optional) below for details.

---

## ⚡ QUICK START (5 Minutes)

```bash
# 1. Clone
git clone https://github.com/Franzferdinan51/Agent-Teams.git
cd Agent-Teams

# 2. Make scripts executable
chmod +x *.sh scripts/*.sh scripts/*.js

# 3. Start the Mesh API (central nervous system)
cd /tmp/agent-mesh-api && npm start &
# If not installed: git clone https://github.com/Franzferdinan51/agent-mesh-api.git /tmp/agent-mesh-api

# 4. Connect your first system
./scripts/openclaw-hive.sh

# 5. Done! Now explore below 👇
```

---

## 🎯 WHAT DO YOU WANT TO DO?

### 🤖 I want to... spawn agents to do work

```bash
# List all available agents
./scripts/micro.sh list

# Spawn a researcher
./scripts/micro.sh researcher "Latest AI news"

# Spawn a coder
./scripts/micro.sh coder "Build a REST API"

# Spawn image generator
./scripts/micro.sh image-generator "futuristic city at sunset"
```

### 🏛️ I want to... debate decisions with the AI Council

```bash
# Start a council deliberation
./scripts/ai-council-hive.sh

# The Council has 45 specialized senators:
# - Economist (ROI, cost-benefit)
# - Security Expert (threats, safety)
# - Botanist 🌿 (plant health)
# - Meteorologist (weather patterns)
# - ...and 41 more!
```

### 🧠 I want to... use the Hive Mind

```bash
# Connect to hive
./scripts/hive-connect.sh my-system "coding,research"

# Route a task to the best agent
node scripts/hive-router.js "build a REST API"

# Broadcast to all agents
./scripts/hive-connect.sh broadcast "Storm warning in 2 hours"
```

### 📊 I want to... coordinate complex tasks

```bash
# Create a task queue
node scripts/hive-queue.js enqueue "Process image" 2

# Workers pick up tasks
node scripts/hive-queue.js dequeue worker1

# Mark complete
node scripts/hive-queue.js complete task-123
```

### 🌙 I want to... enable dreaming/memory

```bash
# Start the dreaming engine
node scripts/dreaming-engine.js dream

# This runs Light → REM → Deep cycles
# Consolidates memories while you sleep!
```

### 👁️ I want to... analyze images and screenshots

```bash
# Analyze any image
./scripts/hive-vision.sh analyze photo.jpg "Describe this"

# Capture and analyze screen
./scripts/hive-vision.sh screen-analyze "What windows are open?"

# Plant/grow analysis 🌿
./scripts/hive-vision.sh growth plant.jpg

# Chart/graph analysis 📊
./scripts/hive-vision.sh chart graph.png

# Receipt extraction 🧾
./scripts/hive-vision.sh receipt receipt.jpg

# Compare two images
./scripts/hive-vision.sh compare before.jpg after.jpg
```

**Vision Models:** Kimi K2.5 (screenshots), GPT-5.4 (complex), Qwen VL (local), Gemini 2.0 (fast)

### 🏠 I want to... run everything LOCAL (no cloud)

```bash
# Local model chat (LM Studio)
./scripts/hive-local.sh chat "Hello, explain this code"

# Local speech recognition (Whisper)
./scripts/hive-local.sh transcribe audio.mp3

# Local text-to-speech (macOS)
./scripts/hive-local.sh tts "Hello from Hive Local"

# Local web search (DuckDuckGo)
./scripts/hive-local.sh search "AI news"

# Local GitHub search (gh CLI)
./scripts/hive-local.sh gh-search "rust web framework"

# Local file search
./scripts/hive-local.sh find ~/projects "*.js"
./scripts/hive-local.sh grep ~/projects "function"
```

**100% local — no API keys needed for most tasks!**

### 🕸️ I want to... go decentralized (P2P)

```bash
# Start a relay (optional, helps NAT traversal)
./scripts/hive-p2p.sh 4100 relay

# Start a peer
./scripts/hive-p2p.sh 4101 peer

# Broadcast to mesh
./scripts/hive-p2p.sh 4100 broadcast "Hello decentralized world!"
```

### 🚨 I want to... send emergency alerts

```bash
# DEFCON 1 - CRITICAL
./scripts/hive-emergency.sh DEFCON1 "System compromised!"

# DEFCON 3 - Warning
./scripts/hive-emergency.sh WARNING "Storm incoming in 2 hours"

# DEFCON 5 - All clear
./scripts/hive-emergency.sh DEFCON5 "Situation resolved"
```

---

## 🏠 Federation (OPTIONAL) — Expand & Collaborate

**Federation is completely OPTIONAL. The full program works 100% standalone.**

Federation lets you collaborate with other AgentTeams instances, but you DON'T need it.

```bash
# Start your federation (OPTIONAL)
./scripts/hive-federation.sh 4200 start "My AI Lab"

# Discover other federations
./scripts/hive-federation.sh 4200 discover

# Share your councilors with others (you choose)
# Default shared: Botanist, Meteorologist, Economist, Security Expert

# Delegate a task to another federation
node scripts/hive-federation.js delegate "Genetics" "Breeding question..."

# OR DON'T JOIN — full program works without federation!
```

---

## 📁 REPO STRUCTURE

```
AgentTeams/
├── scripts/              # All executable scripts
│   ├── hive-*.js       # Hive Mind scripts
│   ├── hive-*.sh       # Shell wrappers
│   ├── micro.sh        # Micro-agent spawner
│   ├── meta-*.sh       # Meta-agent scripts
│   └── p2p-*.js        # P2P mesh
│
├── skills/              # Skill documentation
│   ├── hive-mind/      # Hive Mind system
│   ├── ai-council/     # AI Council integration
│   ├── p2p-mesh/       # Decentralized P2P
│   ├── creative-agents/# Image, Video, 3D
│   └── ...             # Many more!
│
├── src/                 # Source code (if applicable)
├── config/              # Configuration
├── README.md            # This file
└── START-HERE.md        # You are here
```

---

## 🕸️ THE HIVE MIND — Complete System

### Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                         THE HIVE MIND                           │
│                                                                 │
│   🦞 OpenClaw │ 🦆 Duck CLI │ 🏛️ AI Council │ 📊 Dashboard │
│   🕸️ P2P Mesh │ 🎨 Creative │ 📱 Android    │ 🤖 Micro      │
│                                                                 │
│              ┌───────────────────────┐                         │
│              │   AGENT MESH API      │                         │
│              │   (Central Nervous)   │                         │
│              └───────────────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
```

### All Hive Scripts (19 total)

| Script | Purpose |
|--------|---------|
| `openclaw-hive.sh` | Connect OpenClaw |
| `ai-council-hive.sh` | Connect AI Council |
| `hive-connect.sh` | Connect any system |
| `hive-mind.js` | Orchestrate multi-system |
| `hive-router.js` | Route tasks to best agent |
| `hive-consensus.js` | Hive-wide voting |
| `hive-memory.js` | Shared memory |
| `hive-learning.js` | Cross-agent learning |
| `hive-queue.js` | Distributed task queue |
| `hive-emergency.sh` | Emergency broadcasts |
| `hive-watchdog.js` | Monitor health |
| `hive-discovery.js` | Find capabilities |
| `hive-mesh-p2p.js` | P2P mesh (decentralized) |
| `hive-p2p.sh` | P2P CLI |
| `creative-hive.sh` | Connect creative tools |

### All Other Scripts

| Script | Purpose |
|--------|---------|
| `micro.sh` | Spawn micro-agents (30+) |
| `meta-run.sh` | Run Meta-Agent cycle |
| `meta-plan.sh` | Plan complex tasks |
| `dreaming-engine.js` | Memory consolidation |
| `subconscious.js` | 30-min cron consolidation |
| `session-manager.js` | Session + context |
| `live-messenger.js` | Real-time messaging |
| `qa-loop.sh` | QA verification |
| `spawn-council.sh` | Spawn AI Council |
| `spawn-swarm.sh` | Spawn swarm coding |

---

## 🤖 30+ MICRO-AGENTS

Spawn with `./scripts/micro.sh <agent> <task>`

### Research
| Agent | What It Does |
|-------|-------------|
| `researcher` | Web search and summarize |
| `researcher-deep` | Deep research |
| `comparer` | Compare options |

### Coding
| Agent | What It Does |
|-------|-------------|
| `coder` | Write code |
| `debugger` | Find and fix bugs |
| `security-scan` | Security review |
| `refactor` | Clean messy code |

### Creative
| Agent | What It Does |
|-------|-------------|
| `image-generator` | Text-to-image |
| `video-generator` | Create videos |
| `3d-modeler` | 3D meshes |
| `music-generator` | Create music |

### QA & Docs
| Agent | What It Does |
|-------|-------------|
| `test-writer` | Unit tests |
| `code-review` | Review code |
| `doc-writer` | Write docs |

---

## 🏛️ AI COUNCIL — 45 SENATORS

The Senate for complex decisions.

### Core (15)
Speaker, Technocrat, Ethicist, Pragmatist, Skeptic, Sentinel, Visionary, Historian, Diplomat, Journalist, Psychologist, Conspiracist, Propagandist, Moderator, Coder

### Business (5)
Economist, Product Manager, Marketing Expert, Finance Expert, Risk Manager

### Technical (7)
DevOps Engineer, Security Expert, Data Scientist, Performance Engineer, QA, Solutions Architect, Technical Writer

### Emergency (5)
Meteorologist, Emergency Manager, Animal Care Specialist, Risk Analyst, Local Resident

### Plant Science (2)
Botanist 🌿, Geneticist 🧬

### Vision (8)
Visual Analyst, Pattern Recognizer, Color Specialist, Composition Expert, Context Interpreter, Detail Observer, Emotion Reader, Symbol Interpreter

### 11 Deliberation Modes
⚖️ Legislative · 🧠 Deep Research · 🐝 Swarm Hive · 💻 Swarm Coding · 🔮 Prediction Market · 🗣️ Inquiry · 🌪️ Emergency Response · 📊 Risk Assessment · 🤝 Consensus Building · 🎯 Strategic Planning · 👁️ Vision Council

---

## 🌙 DREAMING SYSTEM

Background memory consolidation while you sleep.

```bash
# Run dreaming cycle
node scripts/dreaming-engine.js dream

# 3 phases: Light → REM → Deep
# 6 scoring signals for memory promotion
# 3 gates to long-term memory
```

---

## 🕸️ P2P DECENTRALIZED MESH

No central server — pure peer-to-peer.

```bash
# Start relay (optional)
./scripts/hive-p2p.sh 4100 relay

# Start peer
./scripts/hive-p2p.sh 4101 peer

# Works over Tailscale VPN too!
```

---

## 🚨 EMERGENCY SYSTEM

DEFCON-style alerts for the whole hive.

```bash
./scripts/hive-emergency.sh DEFCON1 "Critical alert!"
./scripts/hive-emergency.sh WARNING "Storm warning"
./scripts/hive-emergency.sh DEFCON5 "All clear"
```

---

## 📚 DOCUMENTATION

| File | What It Is |
|------|-----------|
| `START-HERE.md` | **You are here** — Quick start |
| `README.md` | Main documentation |
| `AGENTS.md` | For AI agents (what to do) |
| `skills/*/SKILL.md` | Detailed skill docs |

---

## 🔧 CONFIGURATION

### Environment Variables
```bash
MESH_URL=http://localhost:4000
MESH_KEY=openclaw-mesh-default-key
OPENCLAW_URL=http://localhost:18789
COUNCIL_URL=http://localhost:3003
```

---

## 🆘 TROUBLESHOOTING

### Mesh not running?
```bash
cd /tmp/agent-mesh-api && npm start &
```

### Permission denied?
```bash
chmod +x scripts/*.sh scripts/*.js
```

### Node not found?
```bash
node --version  # Need v18+
```

---

## 🎓 LEARN MORE

- **For Agents:** Read `AGENTS.md`
- **For Development:** Read `README.md`
- **For Skills:** Check `skills/*/SKILL.md`

---

**Welcome to the Hive Mind!** 🕸️🦆🧠
