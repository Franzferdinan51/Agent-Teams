# 🤖 AgentTeams v1.0.0

**Multi-Agent Collaboration System** — spawn, coordinate, and orchestrate multiple specialized agents for complex tasks.

Built for [OpenClaw](https://github.com/openclaw/openclaw) and [Duck CLI](https://github.com/Franzferdinan51/duck-cli).
Inspired by [Hermes Agent](https://github.com/NousResearch/hermes-agent).

## 🧠 THE HIVE MIND

Every system connected to the mesh becomes part of the hive:

```
┌──────────────────────────────────────────────────────────────────┐
│                     THE HIVE MIND                                 │
│                                                                  │
│   Every agent, system, and AI is connected                       │
│                                                                  │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│   │  Duck CLI   │  │  Dashboard  │  │  AI Council  │             │
│   │  (Coding)   │  │  (Status)   │  │(Deliberation)│             │
│   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│          │                │                │                      │
│   ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐            │
│   │Creative    │  │  Android    │  │  Meta       │            │
│   │Agents      │  │  Control    │  │  Agents     │            │
│   │(Image/3D)  │  │  (ADB)      │  │(Plan/Exec)  │            │
│   └────────────┘  └────────────┘  └────────────┘            │
│                                                                  │
│              ┌────────────────────────┐                          │
│              │     AGENT MESH API     │                         │
│              │   (Central Nervous)    │                         │
│              └────────────────────────┘                          │
└──────────────────────────────────────────────────────────────────┘
```

**Connect ANY system:** `./scripts/hive-connect.sh <name> [capabilities]`

## Core Features

- **🧠 Hive Mind** — All agents/systems connected and coordinating
- **🎨 Creative Agents** — Image, Video, 3D, Music generation
- **🌐 Live Communication** — Real-time WebSocket messaging
- **🌙 Dreaming Engine** — Light→REM→Deep memory consolidation
- **🤖 30+ Micro-Agents** — Single-purpose specialists
- **🧠 Meta-Agent** — Plan→Execute→Critic→Heal→Learn
- **📱 Android Control** — ADB + reflection loop
- **✅ QA Verification** — Multi-round verification

## 🎨 Creative Agents

| Agent | Purpose | Tools |
|-------|---------|-------|
| `image-generator` | Text-to-image | ComfyUI, MiniMax, SDXL |
| `video-generator` | Video creation | MiniMax, AnimateDiff, SVD |
| `3d-modeler` | 3D mesh creation | Blender, GLTF export |
| `blender-artist` | Blender scripting | Python API, Cycles |
| `texture-artist` | Procedural textures | Stable Diffusion |
| `music-generator` | Music creation | MiniMax |
| `speech-agent` | TTS + voice | MiniMax |
| `animate-artist` | Animation sequences | ComfyUI |

### Connect Creative Tools

```bash
# Connect all creative agents
./scripts/creative-hive.sh

# Or individual
./scripts/hive-connect.sh "comfyui" "image,workflows"
./scripts/hive-connect.sh "minimax-creative" "speech,music,video"
./scripts/hive-connect.sh "blender" "3d,rendering"
```

## Quick Start

```bash
git clone https://github.com/Franzferdinan51/Agent-Teams.git
cd Agent-Teams
chmod +x *.sh scripts/*.sh

# Start mesh (hive nervous system)
cd /tmp/agent-mesh-api && npm start &

# Connect to hive
./scripts/hive-connect.sh my-system

# List agents
./scripts/micro.sh list

# Spawn creative agent
./scripts/micro.sh image-generator "futuristic city at sunset"
```

## Hive Mind Scripts

| Script | Purpose |
|--------|---------|
| `hive-connect.sh` | Connect any system to hive |
| `hive-mind.js` | Orchestrate multi-system tasks |
| `creative-hive.sh` | Connect all creative agents |
| `live-messenger.js` | Real-time messaging |

## Micro-Agents (30+)

**Research:** researcher, researcher-deep, comparer, summarizer

**Coding:** coder, debugger, bug-hunt, optimizer, security-scan, refactor

**Creative:** image-generator, video-generator, 3d-modeler, music-generator, speech-agent

**QA:** test-writer, code-review, qa-test-writer, qa-security-scan

**Planning:** planner, architect

**All can spawn sub-agents as needed**

## Related Projects

| Project | Purpose |
|---------|---------|
| [Duck CLI](https://github.com/Franzferdinan51/duck-cli) | Desktop AI agent |
| [Agent Mesh API](https://github.com/Franzferdinan51/agent-mesh-api) | Hive communication |
| [MiniMax CLI](https://github.com/MiniMax-AI/cli) | Speech, video, music |
| [ComfyUI](https://github.com/comfyanonymous/ComfyUI) | Image workflows |

## Changelog

### v1.0.0 (2026-04-19)
- **Hive Mind** — unified multi-system coordination
- **Creative Agents** — image, video, 3D, music, speech
- Agent Mesh API live WebSocket
- Dreaming Engine (Light→REM→Deep)
- 30+ Micro-Agents (all can spawn sub-agents)
- Meta-Agent with sub-agent support
- Android control (ADB + reflection)
- Hermes patterns, Active memory

## License

MIT