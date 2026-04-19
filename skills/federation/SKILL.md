# 🏠 Hive Federation — Multi-Instance Agent Network

## What Is Federation?

Federation lets multiple **independent AgentTeams instances** discover and communicate with each other — like Mastodon federation but for AI agents.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FEDERATION HUB                                    │
│                                                                     │
│   🏠 Your Mac mini    🏠 Friend's Server    🏠 Cloud Instance        │
│   "AI Lab"           "Research Team"        "Production"           │
│         │                    │                    │                  │
│         └────────────────────┼────────────────────┘                  │
│                    Cross-Federation Communication                   │
│                              │                                       │
│         ┌────────────────────┴────────────────────┐                   │
│         │    Share Councilors, Agents, Tasks    │                   │
│         │    Borrow expertise from other feds   │                   │
│         └─────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────────┘
```

## Key Concepts

### Federation
- An **independent AgentTeams instance**
- Has its own agents, councilors, mesh
- Runs on its own server/machine
- Has unique ID and name

### Federation Relay
- Helps federations **find each other**
- Not required — federations can connect directly
- Similar to how Mastodon has relay servers

### Shared Councilors
- One federation can **share** its AI councilors
- Other federations can **delegate** tasks to them
- "Botanist councilor from Fed A is available to Fed B"

## Why Federation?

| Benefit | Description |
|---------|-------------|
| **Scale** | Multiple machines, distributed processing |
| **Specialization** | Each fed focuses on different expertise |
| **Redundancy** | If one fed fails, others continue |
| **Collaboration** | Share councilors across organizations |
| **Privacy** | Each fed has own private data |

## Usage

### Start Your Federation
```bash
# Basic
./scripts/hive-federation.sh 4200 start

# Named
./scripts/hive-federation.sh 4200 start "My AI Lab" "Research focused"

# Check info
./scripts/hive-federation.sh 4200 info
```

### Connect to Other Federations
```bash
# Discover other federations
./scripts/hive-federation.sh 4200 discover

# See shared councilors
./scripts/hive-federation.sh 4200 councilors

# See capabilities
./scripts/hive-federation.sh 4200 capabilities
```

### Share Your Councilors
When starting, your federation automatically shares:
- `Botanist` 🌿
- `Meteorologist` 🌪️
- `Economist` 💰
- `Security Expert` 🔒

### Delegate to Another Federation
```javascript
const { FederationNode } = require('./scripts/hive-federation');

const fed = new FederationNode({ federationName: 'My Lab' });
await fed.start();

// Delegate a plant analysis to another federation
await fed.delegateTo('Botanist', 'Analyze this grow operation');

// Send message across federations
await fed.broadcast({
    type: 'research_request',
    content: 'Need help with genetics question'
});
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      FEDERATION NODE                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │
│  │ Local Mesh  │  │  Councilors │  │  Federation │                │
│  │ (port 4000)│  │  (45 total) │  │  (port 4200)│               │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                │
│         │                │                │                         │
│         └────────────────┼────────────────┘                         │
│                          ▼                                          │
│              ┌───────────────────────┐                             │
│              │   Federation Bridge   │                              │
│              └───────────────────────┘                             │
│                          │                                          │
│         ┌────────────────┼────────────────┐                        │
│         ▼                ▼                ▼                        │
│   ┌──────────┐   ┌──────────┐   ┌──────────┐                  │
│   │  Fed A   │◄──│  Relay   │──►│  Fed B   │                  │
│   └──────────┘   └──────────┘   └──────────┘                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Federation Discovery

### Method 1: Relay Server
```
Federation A ──► Relay Server ──► Federation B
```
Federations register with relay, relay tells others about them.

### Method 2: Direct IP
```
Federation A knows IP of Federation B
Connects directly via HTTP/WebSocket
```

### Method 3: Tailscale VPN
```
All federations on same Tailscale network
Auto-discover via Tailscale DNS
```

## Comparison

| Feature | Single Instance | Federation |
|---------|----------------|------------|
| Machines | 1 | Multiple |
| Scale | Limited | Unlimited |
| Privacy | All in one | Per-federation |
| Councilors | Own only | Shareable |
| Complexity | Low | Medium |
| Trust Model | Single entity | Multi-party |

## Trust & Security

### Federation Model
- **Trust is explicit** — you choose which feds to connect to
- **No central authority** — federations are equals
- **Optional encryption** — can add TLS for production

### Privacy
- Each federation has **private** agents, memory, data
- Only **shared** councilors/capabilities are visible
- Federation IDs are pseudonymous (random hex)

## Example Use Cases

### Research Collaboration
```
Fed A (Genetics Lab)
  └─ Shares: Geneticist, Botanist
  └─ Needs: Emergency response

Fed B (Weather Center)
  └─ Shares: Meteorologist, Risk Analyst
  └─ Needs: Plant genetics

Fed A ──► Delegates genetics to Fed B's Geneticist
Fed B ──► Delegates weather analysis to Fed A's Meteorologist
```

### Production + Development
```
Fed A (Production)
  └─ Live agents, production councilors
  └─ Only shares: Sentinel (security monitoring)

Fed B (Development)
  └─ Test agents, all councilors
  └─ Can query Fed A's Sentinel for security alerts
```

### Personal AI Network
```
Your Mac mini (Local Federation)
  └─ Privacy-first
  └─ Shares: Grow expert, Home automation

Friend's Server (Remote Federation)
  └─ More compute
  └─ Shares: Heavy research, 3D rendering

Your Mac ──► Delegates 3D renders to Friend's server
Friend's   ──► Delegates grow advice to Your Mac
```

## Status

Added: 2026-04-19
Purpose: Connect multiple AgentTeams instances across machines/organizations