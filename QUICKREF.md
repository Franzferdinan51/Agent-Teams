# 🕸️ AGENTTEAMS — Scripts Quick Reference

**All executable scripts at a glance**

---

## 🚀 GETTING STARTED

```bash
git clone https://github.com/Franzferdinan51/Agent-Teams.git
cd Agent-Teams
chmod +x *.sh scripts/*.sh scripts/*.js
```

---

## 🎯 QUICK COMMANDS

### One-liners
```bash
./scripts/micro.sh list                              # List all agents
./scripts/micro.sh researcher "AI news"             # Quick research
./scripts/micro.sh coder "fix this bug"             # Quick coding
./scripts/openclaw-hive.sh                           # Connect OpenClaw
./scripts/ai-council-hive.sh                        # Connect AI Council
./scripts/hive-connect.sh "my-system"              # Connect to hive
```

---

## 🕸️ HIVE MIND SCRIPTS (14)

### Core Hive
```bash
./scripts/openclaw-hive.sh                           # Connect OpenClaw to hive
./scripts/ai-council-hive.sh                        # Connect AI Council
./scripts/hive-connect.sh <name> [caps]             # Connect system to hive
./scripts/creative-hive.sh                          # Connect creative tools
```

### Hive Operations
```bash
node scripts/hive-mind.js connect [name]             # Connect as orchestrator
node scripts/hive-mind.js status                     # Hive status
node scripts/hive-mind.js discover                   # List all systems
node scripts/hive-mind.js broadcast [msg]           # Broadcast to all
```

### Task Routing
```bash
node scripts/hive-router.js "build REST API"         # Route task to best agent
```

### Consensus & Voting
```bash
node scripts/hive-consensus.js poll "Question?" "choice1,choice2"
node scripts/hive-consensus.js vote <pollId> <choice> [voter]
node scripts/hive-consensus.js results <pollId>
node scripts/hive-consensus.js yesno "Is this good?"
```

### Memory
```bash
node scripts/hive-memory.js set <key> <json>        # Store value
node scripts/hive-memory.js get <key>                # Get value
node scripts/hive-memory.js search <query>            # Search
node scripts/hive-memory.js dump                      # Show all
node scripts/hive-memory.js context <agent> [json]   # Set agent context
```

### Learning
```bash
node scripts/hive-learning.js learn <agent> "learning"
node scripts/hive-learning.js patterns               # Show patterns
node scripts/hive-learning.js suggest <task>         # Suggest approach
node scripts/hive-learning.js teach <topic>          # Find teacher
node scripts/hive-learning.js learn-from <from> <to> <topic>
```

### Task Queue
```bash
node scripts/hive-queue.js enqueue <task> [priority] [creator]
node scripts/hive-queue.js critical <task> [creator]
node scripts/hive-queue.js high <task> [creator]
node scripts/hive-queue.js batch <task1|task2|task3> [creator]
node scripts/hive-queue.js dequeue [worker] [caps]
node scripts/hive-queue.js complete <taskId> [result] [worker]
node scripts/hive-queue.js status                    # Queue status
```

### Monitoring
```bash
node scripts/hive-watchdog.js                         # Monitor + alert
node scripts/hive-discovery.js discover              # Discover capabilities
node scripts/hive-discovery.js tree                   # Capability tree
node scripts/hive-discovery.js find <capability>     # Find who has it
```

### Emergency
```bash
./scripts/hive-emergency.sh DEFCON1 "Critical!"     # Level 1
./scripts/hive-emergency.sh DEFCON2 "High alert!"   # Level 2
./scripts/hive-emergency.sh DEFCON3 "Warning!"      # Level 3
./scripts/hive-emergency.sh WARNING "Caution"        # Warning
./scripts/hive-emergency.sh INFO "FYI"               # Info
```

---

## 🤖 MICRO-AGENTS

```bash
./scripts/micro.sh list                             # List all
./scripts/micro.sh <agent> <task>                    # Spawn agent
```

### Research
```bash
./scripts/micro.sh researcher <task>               # Web research
./scripts/micro.sh researcher-deep <topic>           # Deep dive
./scripts/micro.sh comparer <options>               # Compare things
```

### Coding
```bash
./scripts/micro.sh coder <task>                    # Write code
./scripts/micro.sh debugger <issue>                 # Debug
./scripts/micro.sh bug-hunt <code>                 # Find bugs
./scripts/micro.sh refactor <code>                 # Clean up
./scripts/micro.sh security-scan <repo>            # Security audit
```

### Creative
```bash
./scripts/micro.sh image-generator <prompt>        # Generate image
./scripts/micro.sh video-generator <prompt>         # Generate video
./scripts/micro.sh music-generator <prompt>         # Generate music
./scripts/micro.sh 3d-modeler <description>        # Create 3D
```

### Vision (Analyze Images)
```bash
./scripts/hive-vision.sh analyze <image> [prompt]   # Analyze image
./scripts/hive-vision.sh screen-analyze [prompt]   # Screen + analyze
./scripts/hive-vision.sh growth <image>             # Plant/grow analysis
./scripts/hive-vision.sh chart <image>              # Chart/graph analysis
./scripts/hive-vision.sh document <image>           # Document analysis
./scripts/hive-vision.sh receipt <image>           # Receipt extraction
./scripts/hive-vision.sh compare <img1> <img2>    # Compare images
./scripts/hive-vision.sh models                     # List vision models
```

---

## 🧠 META-AGENT

```bash
./scripts/meta-run.sh <task>                        # Full cycle
./scripts/meta-plan.sh <task>                       # Plan only
./scripts/meta-learnings.sh                          # View learnings
```

---

## 🏛️ AI COUNCIL

```bash
./scripts/ai-council-hive.sh                       # Connect to hive
./scripts/spawn-council.sh "Should we...?"         # Spawn deliberation
```

---

## 🌙 DREAMING & MEMORY

```bash
node scripts/dreaming-engine.js dream              # Run dream cycle
node scripts/dreaming-engine.js status              # Dreaming status
node scripts/subconscious.js                         # Cron consolidation
node scripts/session-manager.js status             # Session status
```

---

## 📡 LIVE COMMUNICATION

```bash
node scripts/live-messenger.js --demo               # Demo mode
./scripts/live-coord.sh status                     # Coordination status
./scripts/mesh-chat.sh <msg>                       # Quick chat
./scripts/mesh-register.js <name>                  # Register
```

---

## 🕸️ P2P DECENTRALIZED MESH

```bash
./scripts/hive-p2p.sh <port> relay                # Start as relay
./scripts/hive-p2p.sh <port> peer                  # Start as peer
./scripts/hive-p2p.sh <port> status                # Node status
./scripts/hive-p2p.sh <port> peers                 # List peers
./scripts/hive-p2p.sh <port> broadcast <msg>       # Broadcast
```

---

## ✅ QA & VERIFICATION

```bash
./scripts/qa-loop.sh <task>                        # QA verification loop
```

---

## 🐝 SWARM CODING

```bash
./scripts/spawn-swarm.sh "Build X"                 # Spawn swarm
```

---

## 📊 STATUS & INFO

```bash
./scripts/team-status.sh                           # Team status
./scripts/team-session.sh                           # Session info
./scripts/team-task.sh                             # Task status
```

---

## 🎨 CONNECTED SYSTEMS

```bash
./scripts/openclaw-hive.sh                          # OpenClaw 🦞
./scripts/ai-council-hive.sh                        # AI Council 🏛️
./scripts/hive-connect.sh duck-cli                  # Duck CLI 🦆
./scripts/hive-connect.sh dashboard                 # Dashboard 📊
./scripts/creative-hive.sh                          # Creative 🎨
./scripts/hive-connect.sh cannaai                   # CannaAI 🌿
```

---

## 📁 ALL SCRIPTS (by category)

### Hive Mind
- `openclaw-hive.sh`
- `ai-council-hive.sh`
- `hive-connect.sh`
- `creative-hive.sh`
- `hive-mind.js`
- `hive-router.js`
- `hive-consensus.js`
- `hive-memory.js`
- `hive-learning.js`
- `hive-queue.js`
- `hive-emergency.sh`
- `hive-watchdog.js`
- `hive-discovery.js`
- `hive-mesh-p2p.js`
- `hive-p2p.sh`

### Agents
- `micro.sh`
- `meta-run.sh`
- `meta-plan.sh`
- `meta-learnings.sh`
- `spawn-council.sh`
- `spawn-swarm.sh`
- `spawn-agent.sh`
- `team-session.sh`
- `team-status.sh`
- `team-task.sh`

### Memory & Dreaming
- `dreaming-engine.js`
- `subconscious.js`
- `session-manager.js`

### Communication
- `live-messenger.js`
- `live-coord.sh`
- `mesh-chat.sh`
- `mesh-register.js`

### QA
- `qa-loop.sh`

---

**See `START-HERE.md` for full guide or `README.md` for architecture.**