# 🐝 Hive Swarm Dashboard

The **multi-agent master dashboard** for the [Agent-Teams](https://github.com/Franzferdinan51/Agent-Teams) Hive Swarm.

A real-time, browser-based control plane for orchestrating swarms of AI agents
across the Agent Mesh. Pure HTML/CSS/JS on the frontend (no build step) and
a small Express + WebSocket server on the backend.

---

## ⚡ Quick Start

```bash
cd hive-swarm-enhancements/webui
npm install
npm start
```

Then open:

- **Local:** <http://localhost:8787>
- **Tailscale / LAN:** <http://&lt;your-tailscale-ip&gt;:8787>
  (the server binds to `0.0.0.0`, so any reachable interface works)

### Configuration (env vars)

| Var                  | Default                       | Description                              |
|----------------------|-------------------------------|------------------------------------------|
| `PORT`               | `8787`                        | HTTP + WebSocket port                    |
| `MESH_URL`           | `http://localhost:4000`       | Agent Mesh HTTP base                     |
| `MESH_WS_URL`        | `ws://localhost:4000`         | Agent Mesh WebSocket                     |
| `MESH_API_KEY`       | `openclaw-mesh-default-key`   | X-API-Key for mesh requests              |
| `HERMES_BRIDGE`      | `true`                        | Connect upstream WS to the mesh          |
| `HERMES_SOCKET`      | _(unset)_                     | Optional unix socket for hermes bridge   |

---

## 🏗️ Architecture

```
                 ┌────────────────────────────────────────┐
                 │  Browser (your phone, laptop, etc)    │
                 │  http://<tailscale-ip>:8787           │
                 └──────────────┬─────────────────────────┘
                                │  HTTP (REST)  +  WS (/ws)
                                ▼
        ┌──────────────────────────────────────────────────┐
        │  webui/server.js  (Express + ws)                 │
        │  ┌────────────┐  ┌─────────────┐  ┌────────────┐  │
        │  │ REST API   │  │ WS relay    │  │ Static SPA │  │
        │  │ /api/*     │  │ bridge      │  │ /public/*  │  │
        │  └─────┬──────┘  └──────┬──────┘  └────────────┘  │
        └────────┼───────────────┼──────────────────────────┘
                 │               │
       persist   │               │ upstream WS
       ──────────┼──► swarms.json │  + REST proxy
                 │               │  to /api/agents
                 │               ▼
                 │     ┌──────────────────────┐
                 │     │  Agent Mesh server   │
                 │     │  localhost:4000      │
                 │     └──────────┬───────────┘
                 │                │
                 │                ▼
                 │     ┌──────────────────────┐
                 │     │  Live Agents         │
                 │     │  (researcher, coder, │
                 │     │   reviewer, …)       │
                 │     └──────────────────────┘
                 │
                 │   ┌──────────────────────┐
                 └──►│  build-logs/         │
                     │   - swarms.json      │
                     │   - dashboard.log    │
                     └──────────────────────┘
```

### Required Services

1. **Agent Mesh** — `http://localhost:4000` (must be running)
   - Exposes `GET /api/agents` and `ws://` for live agent messaging.
   - API key: `openclaw-mesh-default-key` (default; override with `MESH_API_KEY`).

2. **Hermes** _(optional, for chat input at the bottom of the dashboard)_
   - The hermes bridge is currently a stub: outgoing commands are queued
     in memory and viewable at `GET /__hermes/outbox` for debugging.
   - The `POST /__hermes/inject` endpoint lets the hermes process push
     inbound messages to all browser clients.

3. **Hive Swarm core** — `../core/`
   - `goal-decomposer.js` — turns a goal into 3-7 subtasks (sibling sub-agent)
   - `worker-dispatcher.js` — dispatches subtasks across the mesh (sibling)
   - These are loaded dynamically with `require()` so the server still
     starts if they aren't built yet.

---

## 🗂️ File Layout

```
webui/
├── package.json
├── server.js                    Express + WS relay
├── README.md                    (this file)
└── public/
    ├── index.html               Dashboard shell (HTML5, no build step)
    ├── css/
    │   └── main.css             Dark theme (matches council-app.tsx)
    └── js/
        └── dashboard.js         WS client, state, event dispatcher
```

---

## 🛰️ REST API

| Method | Path                          | Purpose                                      |
|--------|-------------------------------|----------------------------------------------|
| GET    | `/api/health`                 | Liveness + mesh + hermes status              |
| GET    | `/api/swarms`                 | List all swarms (newest first)               |
| POST   | `/api/swarms`                 | Start a new swarm `{goal,count,domain}`      |
| GET    | `/api/swarms/:id`             | Get one swarm                                |
| DELETE | `/api/swarms/:id`             | Kill a swarm                                 |
| GET    | `/api/agents`                 | Proxy to mesh `GET /api/agents`              |
| POST   | `/api/consensus`              | Create a poll `{question,choices,timeout}`   |
| GET    | `/api/consensus/:id`          | Get a poll + tallies                         |
| POST   | `/api/consensus/:id/vote`     | Cast a vote `{choice,voter?}`                |
| GET    | `/api/logs?swarm=<id>&tail=N` | Recent log lines (default tail 200)          |
| GET    | `/__hermes/outbox`            | Debug: queued hermes commands                |
| POST   | `/__hermes/inject`            | Debug: inject inbound hermes message         |

## 🔌 WebSocket Protocol

Endpoint: `ws://<host>:8787/ws`

### Server → Browser
```json
{ "type": "hello",             "payload": { "server": "hive-swarm-dashboard", "ts": "...", "mesh": true } }
{ "type": "mesh_status",       "payload": { "connected": true } }
{ "type": "swarm_update",      "payload": { "id": "swarm-...", "status": "running", ... } }
{ "type": "agent_update",      "payload": { "id": "agent-...", "status": "active", ... } }
{ "type": "consensus_update",  "payload": { "id": "poll-...", "tallies": {...}, ... } }
{ "type": "log",               "payload": { "ts": 171..., "level": "INFO", "source": "swarm", "message": "...", "swarmId": "..." } }
{ "type": "hermes_ack",        "payload": { "command": "...", "queued": true } }
{ "type": "error",             "payload": { "error": "..." } }
```

### Browser → Server
```json
{ "type": "hermes_command", "command": "summarize the latest swarm", "from": "dashboard", "ts": 171... }
{ "type": "broadcast",      "room": "coordination", "content": "Hello from the dashboard" }
{ "type": "message",        "to": "agent-1", "content": "..." }
```

The server transparently relays non-`hermes_command` messages to the
upstream Agent Mesh WS.

---

## 🛣️ Roadmap

| Feature                            | Status         | Notes                                  |
|------------------------------------|----------------|----------------------------------------|
| Express + WS server boot           | ✅ done        | Binds 0.0.0.0, configurable port       |
| REST: health                       | ✅ done        | Probes mesh + reports uptime           |
| REST: swarms CRUD                  | ✅ done        | File-backed to `build-logs/swarms.json`|
| REST: agents proxy                 | ✅ done        | Passes through mesh `GET /api/agents`  |
| REST: consensus CRUD               | ✅ done        | In-memory polls with tallies           |
| REST: logs tail                    | ✅ done        | Rolling buffer, swarmId filter         |
| WS: browser ↔ mesh relay           | ✅ done        | Auto-reconnect, backoff                |
| WS: hermes bridge                  | 🟡 stub        | Queue + inject endpoints only          |
| Dashboard HTML shell + tabs        | ✅ done        | Swarms/Agents/Consensus/Logs/Settings  |
| Dark theme (council-app.tsx)       | ✅ done        | All CSS vars centralized               |
| Toast system                       | ✅ done        | 4 severity levels, auto-dismiss        |
| Swarm controller (start/kill UI)   | 🔜 next tick   | Will populate swarms tab               |
| Agent cards (live status)          | 🔜 next tick   | Will populate agents tab               |
| Consensus panel (live voting)      | 🔜 next tick   | Will populate consensus tab            |
| Log stream view                    | 🔜 next tick   | Will populate logs tab                 |
| Auth (Tailscale ACL / API key)     | ⏳ planned     | CORS is wide open for now              |
| Real swarm → mesh integration      | ⏳ pending     | Awaits `core/goal-decomposer.js`       |

---

## 🧪 Development Tips

- Tail server logs in another terminal:
  ```bash
  tail -f hive-swarm-enhancements/build-logs/dashboard.log
  ```
- Inspect persisted swarms:
  ```bash
  cat hive-swarm-enhancements/build-logs/swarms.json | jq .
  ```
- Force a reconnect from the browser: open DevTools → Network → WS → close.
- Start a swarm from the CLI:
  ```bash
  curl -X POST http://localhost:8787/api/swarms \
    -H 'Content-Type: application/json' \
    -d '{"goal":"audit the webui code","count":3,"domain":"code"}'
  ```

---

## 📜 License & Credits

Part of the [Agent-Teams](https://github.com/Franzferdinan51/Agent-Teams)
swarm-intelligence build. Built by the Hive Swarm overnight build (June 2026).
