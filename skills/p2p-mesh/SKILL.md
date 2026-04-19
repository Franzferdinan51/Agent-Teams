# 🕸️ HiveMesh P2P — Decentralized Agent Mesh

## Overview

**Decentralized peer-to-peer communication** for the Hive Mind — no central server, no blockchain, just pure agent-to-agent networking.

Inspired by [BitChat](https://github.com/permissionlesstech/bitchat) — the decentralized Bluetooth + Nostr mesh chat.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     DECENTRALIZED MESH                              │
│                                                                     │
│   Each node is equal — no central server                           │
│                                                                     │
│      🕸️ Node A ◄──────► 🕸️ Node B                              │
│         │    \            /    │                                   │
│         │     \          /     │                                   │
│         │      \        /      │                                   │
│         │       \      /       │                                   │
│         │        \    /        │                                   │
│         │    ┌──────┴──────┐   │                                   │
│         │    │  🛰️ Relay   │   │                                   │
│         │    │ (optional)   │   │                                   │
│         │    └──────┬──────┘   │                                   │
│         │           │          │                                   │
│         ▼           ▼          ▼                                   │
│      🕸️ Node C ◄──────► 🕸️ Node D                              │
│                                                                     │
│   Messages propagate via GOSSIP protocol                           │
│   Relays help nodes behind NAT find each other                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Key Concepts

### Peer-to-Peer
- Every node is equal
- Direct communication between agents
- No single point of failure
- Network continues if any node fails

### Gossip Protocol
- Messages spread like gossip through the network
- Each node forwards to its peers
- TTL (time-to-live) limits propagation
- Eventually reaches all nodes

### Relay Servers (Optional)
- Help nodes behind NAT/firewall
- Not required for operation
- Multiple relays for redundancy
- Nodes can be both peer AND relay

## How It Works

```
1. NODE STARTS
   └─> Announces itself to known relays
   
2. PEER DISCOVERY
   └─> Query relays for known peers
   └─> Connect directly to discovered peers
   
3. MESSAGE SENT
   └─> Stored locally
   └─> Forwarded to connected peers (gossip)
   └─> Each peer forwards to their peers (up to TTL hops)
   
4. MESSAGE RECEIVED
   └─> Emit event to local agents
   └─> Forward to other peers (if TTL > 0)
   └─> Deduplicate by message ID
```

## Usage

### Start a Relay (Optional)
```bash
# First node - acts as relay
./scripts/hive-p2p.sh 4100 relay
```

### Start a Peer
```bash
# Connect to existing mesh
./scripts/hive-p2p.sh 4101 peer

# Or specify port
./scripts/hive-p2p.sh 4200 peer
```

### CLI Commands
```bash
# Check status
./scripts/hive-p2p.sh 4100 status

# List peers
./scripts/hive-p2p.sh 4100 peers

# Broadcast message
./scripts/hive-p2p.sh 4100 broadcast "Hello mesh!"

# View history
./scripts/hive-p2p.sh 4100 history
```

### Programmatic Usage
```javascript
const { HiveMeshNode } = require('./scripts/hive-mesh-p2p');

const node = new HiveMeshNode({ port: 4100 });
await node.start();

// Listen for messages
node.on('message', (msg) => {
    console.log(`${msg.from}: ${msg.content}`);
});

// Broadcast
await node.broadcast('hello', 'Hello from peer!');

// Send direct
await node.sendTo('node-abc123', 'Private message');

// Stop
await node.stop();
```

## Multi-Machine Setup

### Local Network (Same WiFi)
Nodes auto-discover each other via mDNS/Bonjour (future).

### Remote Machines (Tailscale VPN)
```
1. Install Tailscale on all machines
2. Connect to same tailnet
3. Nodes use Tailscale IPs to connect
4. Mesh works across the internet!
```

### Setup
```bash
# On each machine
brew install tailscale
tailscale up

# Then start HiveMesh with Tailscale IP
./scripts/hive-p2p.sh 4100 peer
```

## Comparison

| Feature | Centralized (Mesh API) | Decentralized (P2P) |
|---------|------------------------|---------------------|
| **Server** | Required | Optional |
| **Single Point of Failure** | Yes | No |
| **Works Offline** | No | Yes (local mesh) |
| **Setup Complexity** | Low | Medium |
| **Message Delivery** | Guaranteed | Best-effort |
| **Scalability** | Limited | High |
| **Privacy** | Server sees all | End-to-end possible |

## For the Hive Mind

### Current (Centralized)
```
Agent → Mesh API Server (port 4000) → Other Agents
```

### With P2P Mesh (Decentralized)
```
Agent A ↔ Agent B ↔ Agent C ↔ Agent D
         ↕
     (optional relay)
```

### Hybrid Approach
```
- Local network: Direct P2P (fastest)
- Remote: Via relay or Tailscale VPN
- Critical messages: Both P2P + centralized backup
```

## Future Enhancements

| Feature | Status |
|---------|--------|
| mDNS/Bonjour discovery | Planned |
| WebRTC for NAT traversal | Planned |
| End-to-end encryption | Planned |
| DHT for peer discovery | Planned |
| Tor integration | Planned |
| Signal protocol | Planned |

## Comparison to BitChat

| Feature | BitChat | HiveMesh P2P |
|---------|---------|--------------|
| Transport | Bluetooth + Nostr | WebSocket + HTTP |
| Purpose | Human chat | Agent communication |
| Discovery | Bluetooth LE + relays | mDNS + DHT (future) |
| Encryption | Noise protocol | Simple (upgradeable) |
| Blockchain | No | No |
| Decentralization | Full | Full |

## Resources

- [BitChat](https://github.com/permissionlesstech/bitchat) — Inspiration
- [libp2p](https://libp2p.io/) — Production P2P library
- [YJS](https://docs.yjs.dev/) — CRDT for collaboration
- [Gun.js](https://gun.eco/) — Decentralized graph DB

## Status

Added: 2026-04-19
Purpose: Decentralized P2P communication for Hive Mind