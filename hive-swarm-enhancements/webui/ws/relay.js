/**
 * @file Hive Swarm — WebSocket relay module
 *
 * Bridges browser WebSocket clients ↔ mesh server ↔ hermes.
 *
 * Architecture:
 *   Browser WS → relay.js → mesh server (localhost:4000)
 *                           → hermes (optional unix socket or HTTP)
 *
 * The relay receives messages from browsers, routes them based on 'to'/'room'/'type',
 * and receives messages from mesh/hermes to broadcast back to browsers.
 *
 * Exports:
 *   createRelay(browserWs, opts) → { relay, cleanup }
 *   RelayManager — manages all active relays, broadcasts to rooms
 *
 * Run: imported by server.js which creates the WebSocketServer at path '/ws'.
 *
 * @module hive-swarm-enhancements/webui/ws/relay
 */

'use strict';

const { WebSocket } = require('ws');

// ---------------------------------------------------------------------------
// Constants & defaults
// ---------------------------------------------------------------------------

const DEFAULT_MESH_WS_URL = process.env.MESH_WS_URL || 'ws://localhost:4000';
const DEFAULT_MESH_API_KEY = process.env.MESH_API_KEY || 'openclaw-mesh-default-key';
const DEFAULT_HERMES_BRIDGE_ENABLED =
  (process.env.HERMES_BRIDGE || 'false').toLowerCase() === 'true';
const DEFAULT_HERMES_SOCKET = process.env.HERMES_SOCKET || null;

const MAX_POLL_BYTES = 1024 * 64; // 64 KB cap on incoming WS frames
const MESH_PING_INTERVAL_MS = 10000; // ping mesh /api/status every 10s
const MESH_RECONNECT_BASE_MS = 1000;
const MESH_RECONNECT_CAP_MS = 30000;
const HEARTBEAT_INTERVAL_MS = 15000; // browser heartbeat check
const HEARTBEAT_TIMEOUT_MS = 40000; // consider client dead after 40s silence

// ---------------------------------------------------------------------------
// Safe JSON (copied from server.js so relay is self-contained)
// ---------------------------------------------------------------------------

/**
 * JSON.stringify that never throws.
 * @param {*} obj
 * @returns {string}
 */
function safeJsonStringify(obj) {
  const seen = new WeakSet();
  try {
    return JSON.stringify(obj, (k, v) => {
      if (typeof v === 'function') return '[Function]';
      if (v && typeof v === 'object') {
        if (seen.has(v)) return '[Circular]';
        seen.add(v);
      }
      return v;
    });
  } catch {
    return '[Unstringifiable]';
  }
}

// ---------------------------------------------------------------------------
// Logging helper — logs to dashboard.log
// ---------------------------------------------------------------------------

/**
 * @param {'INFO'|'WARN'|'ERROR'|'DEBUG'} level
 * @param {string} msg
 * @param {object} [meta]
 */
function log(level, msg, meta) {
  const ts = new Date().toISOString();
  const line =
    `[${ts}] [${level}] [relay] ${msg}` +
    (meta !== undefined ? ' ' + safeJsonStringify(meta) : '');
  if (level === 'ERROR') {
    console.error(line);
  } else {
    console.log(line);
  }
  // best-effort append to dashboard.log (assumes server.js sets up build-logs/)
  try {
    const path = require('path');
    const LOGS_FILE = path.join(__dirname, '..', '..', 'build-logs', 'dashboard.log');
    require('fs').appendFileSync(LOGS_FILE, line + '\n', 'utf8');
  } catch {
    // swallow — logging is best-effort
  }
}

// ---------------------------------------------------------------------------
// Relay — one per browser WebSocket client
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} RelayMessage
 * @property {string} type  — message|broadcast|status|heartbeat|subscribe|unsubscribe
 * @property {string} [from] — agent-name or 'hive-dashboard'
 * @property {string} [to]   — agent-name or room-name
 * @property {string} [room] — room-name for subscription
 * @property {string} [content]
 * @property {number} [timestamp]
 * @property {string} [version]
 */

/**
 * Creates a relay that pipes a browser WebSocket ↔ mesh WebSocket.
 *
 * @param {import('ws').WebSocket} browserWs — the browser-side WebSocket
 * @param {Object} [opts]
 * @param {string} [opts.meshWsUrl] — mesh WebSocket URL
 * @param {string} [opts.meshApiKey] — API key for mesh auth
 * @param {boolean} [opts.hermesBridgeEnabled] — enable hermes bridge
 * @param {string} [opts.hermesSocket] — hermes unix socket path
 * @returns {{ relay: Relay, cleanup: Function }}
 */
function createRelay(browserWs, opts = {}) {
  const meshWsUrl = opts.meshWsUrl || DEFAULT_MESH_WS_URL;
  const meshApiKey = opts.meshApiKey || DEFAULT_MESH_API_KEY;
  const hermesBridgeEnabled = opts.hermesBridgeEnabled || DEFAULT_HERMES_BRIDGE_ENABLED;
  const hermesSocket = opts.hermesSocket || DEFAULT_HERMES_SOCKET;

  /** @type {import('ws').WebSocket|null} */
  let meshSocket = null;
  /** @type {NodeJS.Timeout|null} */
  let meshReconnectTimer = null;
  /** @type {NodeJS.Timeout|null} */
  let meshPingTimer = null;
  /** @type {NodeJS.Timeout|null} */
  let heartbeatTimer = null;
  /** @type {NodeJS.Timeout|null} */
  let browserPingTimer = null;
  let meshReconnectDelay = MESH_RECONNECT_BASE_MS;
  let isClosed = false;

  /** @type {Set<string>} rooms this relay is subscribed to */
  const subscriptions = new Set();

  // ------------------------------------------------------------------
  // Mesh connection
  // ------------------------------------------------------------------

  /**
   * Connect (or reconnect) to the mesh WebSocket.
   */
  function connectMesh() {
    if (isClosed) return;
    if (meshSocket && meshSocket.readyState === WebSocket.OPEN) return;

    try {
      log('DEBUG', `Connecting to mesh at ${meshWsUrl}`);
      meshSocket = new WebSocket(meshWsUrl);
    } catch (e) {
      log('ERROR', `Failed to construct mesh WS: ${e.message}`);
      scheduleMeshReconnect();
      return;
    }

    meshSocket.on('open', () => {
      log('INFO', 'Mesh WS connected');
      meshReconnectDelay = MESH_RECONNECT_BASE_MS;

      // Register with mesh
      sendToMesh({
        type: 'register',
        from: 'hive-dashboard',
        version: '1.0.0',
        role: 'dashboard',
        timestamp: Date.now(),
      });

      // Re-subscribe to previously subscribed rooms
      for (const room of subscriptions) {
        sendToMesh({
          type: 'subscribe',
          from: 'hive-dashboard',
          room,
          timestamp: Date.now(),
        });
      }

      // Notify browser
      sendToBrowser({
        type: 'mesh_status',
        payload: { connected: true },
      });
    });

    meshSocket.on('message', (data) => {
      let msg;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        log('DEBUG', 'Ignoring non-JSON mesh message');
        return;
      }

      // Route to browser based on 'room' or 'to'
      if (msg.room && subscriptions.has(msg.room)) {
        // Room broadcast — forward to browser
        sendToBrowser(Object.assign({ source: 'mesh' }, msg));
      } else if (!msg.to || msg.to === '*') {
        // General broadcast
        sendToBrowser(Object.assign({ source: 'mesh' }, msg));
      } else {
        // Directed message — also forward
        sendToBrowser(Object.assign({ source: 'mesh' }, msg));
      }

      // Surface status/broadcasts as logs
      if (msg.type === 'broadcast' || msg.type === 'status') {
        log('INFO', `[mesh] [${msg.from || '?'}] ${msg.content || ''}`);
      }
    });

    meshSocket.on('close', (code, reason) => {
      log('WARN', `Mesh WS closed (${code} ${reason || ''})`);
      meshSocket = null;
      sendToBrowser({ type: 'mesh_status', payload: { connected: false } });
      scheduleMeshReconnect();
    });

    meshSocket.on('error', (err) => {
      log('WARN', `Mesh WS error: ${err.message}`);
    });
  }

  /**
   * Schedule a mesh reconnect with exponential backoff.
   */
  function scheduleMeshReconnect() {
    if (isClosed) return;
    if (meshReconnectTimer) return;
    const delay = Math.min(meshReconnectDelay, MESH_RECONNECT_CAP_MS);
    log('DEBUG', `Mesh reconnect in ${delay}ms`);
    meshReconnectTimer = setTimeout(() => {
      meshReconnectTimer = null;
      meshReconnectDelay = Math.min(meshReconnectDelay * 2, MESH_RECONNECT_CAP_MS);
      connectMesh();
    }, delay);
  }

  /**
   * Send a raw JSON frame to the mesh upstream.
   * @param {object} msg
   */
  function sendToMesh(msg) {
    if (!meshSocket || meshSocket.readyState !== WebSocket.OPEN) {
      log('WARN', 'Cannot send to mesh — not connected');
      return false;
    }
    try {
      meshSocket.send(safeJsonStringify(msg));
      return true;
    } catch (e) {
      log('WARN', `Failed to send to mesh: ${e.message}`);
      return false;
    }
  }

  /**
   * Send a JSON frame to the browser client.
   * @param {object} obj
   */
  function sendToBrowser(obj) {
    if (browserWs.readyState !== browserWs.OPEN) return;
    try {
      browserWs.send(safeJsonStringify(obj));
    } catch (e) {
      log('WARN', `Failed to send to browser: ${e.message}`);
    }
  }

  // ------------------------------------------------------------------
  // Message routing
  // ------------------------------------------------------------------

  /**
   * Route a browser message to the appropriate destination.
   * @param {RelayMessage} msg
   */
  function routeBrowserMessage(msg) {
    if (!msg || typeof msg !== 'object') return;

    // heartbeat — respond locally
    if (msg.type === 'heartbeat') {
      sendToBrowser({
        type: 'heartbeat_ack',
        payload: { ts: Date.now() },
      });
      // Also forward to mesh if configured
      if (meshSocket && meshSocket.readyState === WebSocket.OPEN) {
        sendToMesh(Object.assign({}, msg, { from: msg.from || 'hive-dashboard' }));
      }
      return;
    }

    // subscribe to a room
    if (msg.type === 'subscribe' && msg.room) {
      subscriptions.add(msg.room);
      sendToMesh({
        type: 'subscribe',
        from: msg.from || 'hive-dashboard',
        room: msg.room,
        timestamp: Date.now(),
      });
      log('INFO', `Subscribed to room: ${msg.room}`);
      return;
    }

    // unsubscribe from a room
    if (msg.type === 'unsubscribe' && msg.room) {
      subscriptions.delete(msg.room);
      sendToMesh({
        type: 'unsubscribe',
        from: msg.from || 'hive-dashboard',
        room: msg.room,
        timestamp: Date.now(),
      });
      log('INFO', `Unsubscribed from room: ${msg.room}`);
      return;
    }

    // Route based on 'to' field
    if (msg.to) {
      // Directed message to specific agent
      sendToMesh(Object.assign({}, msg, { from: msg.from || 'hive-dashboard' }));
      log('DEBUG', `Forwarding to agent: ${msg.to}`);
      return;
    }

    // Room broadcast
    if (msg.room && subscriptions.has(msg.room)) {
      sendToMesh(Object.assign({}, msg, { from: msg.from || 'hive-dashboard' }));
      log('DEBUG', `Broadcasting to room: ${msg.room}`);
      return;
    }

    // General broadcast
    if (msg.type === 'broadcast') {
      sendToMesh(Object.assign({}, msg, { from: msg.from || 'hive-dashboard' }));
      log('DEBUG', 'Broadcasting to mesh');
      return;
    }

    // Default: forward as-is
    sendToMesh(Object.assign({}, msg, { from: msg.from || 'hive-dashboard' }));
  }

  // ------------------------------------------------------------------
  // Browser message handler
  // ------------------------------------------------------------------

  function onBrowserMessage(data) {
    if (data.length > MAX_POLL_BYTES) {
      try {
        browserWs.send(JSON.stringify({ type: 'error', payload: { error: 'frame too large' } }));
      } catch {}
      return;
    }

    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      try {
        browserWs.send(JSON.stringify({ type: 'error', payload: { error: 'invalid json' } }));
      } catch {}
      return;
    }

    routeBrowserMessage(msg);
  }

  // ------------------------------------------------------------------
  // Browser connection lifecycle
  // ------------------------------------------------------------------

  browserWs.on('message', onBrowserMessage);

  browserWs.on('close', () => {
    log('INFO', 'Browser WS disconnected');
    cleanup();
  });

  browserWs.on('error', (err) => {
    log('WARN', `Browser WS error: ${err.message}`);
  });

  // Server-initiated ping to browser every 30s
  browserPingTimer = setInterval(() => {
    if (browserWs.readyState === browserWs.OPEN) {
      try { browserWs.ping(); } catch {}
    } else {
      clearInterval(browserPingTimer);
    }
  }, 30000);

  // Start mesh connection
  connectMesh();

  // ------------------------------------------------------------------
  // Cleanup
  // ------------------------------------------------------------------

  function cleanup() {
    if (isClosed) return;
    isClosed = true;

    if (meshReconnectTimer) clearTimeout(meshReconnectTimer);
    if (meshPingTimer) clearTimeout(meshPingTimer);
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    if (browserPingTimer) clearInterval(browserPingTimer);

    if (meshSocket) {
      try { meshSocket.close(1001, 'relay cleanup'); } catch {}
      meshSocket = null;
    }

    subscriptions.clear();
    log('DEBUG', 'Relay cleaned up');
  }

  return {
    relay: {
      subscriptions,
      sendToBrowser,
      sendToMesh,
      routeBrowserMessage,
    },
    cleanup,
  };
}

// ---------------------------------------------------------------------------
// RelayManager — manages all active relays, room broadcasts
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} RelayManagerOptions
 * @property {string} [meshWsUrl]
 * @property {string} [meshApiKey]
 * @property {boolean} [hermesBridgeEnabled]
 * @property {string} [hermesSocket]
 */

/**
 * Manages all browser WebSocket relays and provides room-based broadcasting.
 */
class RelayManager {
  /**
   * @param {RelayManagerOptions} [opts]
   */
  constructor(opts = {}) {
    /** @type {Map<import('ws').WebSocket, { relay: object, cleanup: Function }>} */
    this._relays = new Map();
    /** @type {Map<string, Set<import('ws').WebSocket>>} room → browser clients */
    this._rooms = new Map();
    /** @type {{ meshWsUrl: string, meshApiKey: string, hermesBridgeEnabled: boolean, hermesSocket: string }} */
    this._opts = opts;

    // Status polling
    /** @type {NodeJS.Timeout|null} */
    this._statusPollTimer = null;
    this._meshConnected = false;

    log('INFO', 'RelayManager initialized', {
      meshWsUrl: opts.meshWsUrl || DEFAULT_MESH_WS_URL,
      hermesBridge: opts.hermesBridgeEnabled ? 'enabled' : 'disabled',
    });
  }

  // ------------------------------------------------------------------
  // Registration
  // ------------------------------------------------------------------

  /**
   * Register a new browser WebSocket client with the relay manager.
   * Creates a relay and starts mesh connection.
   * @param {import('ws').WebSocket} browserWs
   * @returns {{ relay: object, cleanup: Function }}
   */
  addClient(browserWs) {
    const { relay, cleanup } = createRelay(browserWs, this._opts);
    this._relays.set(browserWs, { relay, cleanup });
    log('INFO', `Client registered (total: ${this._relays.size})`);
    return { relay, cleanup };
  }

  /**
   * Unregister a browser WebSocket client.
   * @param {import('ws').WebSocket} browserWs
   */
  removeClient(browserWs) {
    const entry = this._relays.get(browserWs);
    if (entry) {
      entry.cleanup();
      this._relays.delete(browserWs);
      // Remove from all rooms
      for (const [, clients] of this._rooms) {
        clients.delete(browserWs);
      }
      log('INFO', `Client unregistered (total: ${this._relays.size})`);
    }
  }

  // ------------------------------------------------------------------
  // Room management
  // ------------------------------------------------------------------

  /**
   * Subscribe a browser client to a room.
   * @param {import('ws').WebSocket} browserWs
   * @param {string} room
   */
  subscribe(browserWs, room) {
    if (!this._rooms.has(room)) {
      this._rooms.set(room, new Set());
    }
    this._rooms.get(room).add(browserWs);
    log('DEBUG', `Client subscribed to room: ${room} (${this._rooms.get(room).size} clients)`);
  }

  /**
   * Unsubscribe a browser client from a room.
   * @param {import('ws').WebSocket} browserWs
   * @param {string} room
   */
  unsubscribe(browserWs, room) {
    const clients = this._rooms.get(room);
    if (clients) {
      clients.delete(browserWs);
      if (clients.size === 0) this._rooms.delete(room);
    }
  }

  /**
   * Broadcast a message to all clients in a room.
   * @param {string} room
   * @param {object} msg
   */
  broadcastToRoom(room, msg) {
    const clients = this._rooms.get(room);
    if (!clients || clients.size === 0) return;

    const json = safeJsonStringify(msg);
    for (const ws of clients) {
      if (ws.readyState === ws.OPEN) {
        try { ws.send(json); } catch (e) { log('WARN', `broadcastToRoom failed: ${e.message}`); }
      }
    }
  }

  /**
   * Broadcast a message to all connected browser clients.
   * @param {object} obj
   */
  broadcastToAll(obj) {
    const json = safeJsonStringify(obj);
    for (const [ws, ] of this._relays) {
      if (ws.readyState === ws.OPEN) {
        try { ws.send(json); } catch (e) { log('WARN', `broadcastToAll failed: ${e.message}`); }
      }
    }
  }

  // ------------------------------------------------------------------
  // Mesh status relay
  // ------------------------------------------------------------------

  /**
   * Start periodically polling mesh /api/status and broadcasting to all clients.
   * @param {string} meshApiUrl — e.g. 'http://localhost:4000'
   * @param {string} [apiKey]
   */
  startStatusRelay(meshApiUrl, apiKey = '') {
    if (this._statusPollTimer) return;

    this._statusPollTimer = setInterval(async () => {
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`${meshApiUrl}/api/status`, {
          signal: controller.signal,
          headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json',
          },
        });
        clearTimeout(tid);

        if (res.ok) {
          const body = await res.json().catch(() => ({}));
          if (!this._meshConnected) {
            this._meshConnected = true;
            this.broadcastToAll({ type: 'mesh_status', payload: { connected: true, body } });
          } else {
            this.broadcastToAll({ type: 'mesh_status', payload: { connected: true, body } });
          }
        } else {
          this._meshConnected = false;
          this.broadcastToAll({ type: 'mesh_status', payload: { connected: false, status: res.status } });
        }
      } catch (e) {
        this._meshConnected = false;
        this.broadcastToAll({ type: 'mesh_status', payload: { connected: false, error: e.message } });
      }
    }, MESH_PING_INTERVAL_MS);

    log('INFO', `Status relay started (poll interval: ${MESH_PING_INTERVAL_MS}ms)`);
  }

  /**
   * Notify all browsers that mesh is down/up.
   * @param {boolean} connected
   */
  notifyMeshStatus(connected) {
    this._meshConnected = connected;
    this.broadcastToAll({ type: 'mesh_status', payload: { connected } });
  }

  // ------------------------------------------------------------------
  // Hermes bridge (stub — logs that it's disabled)
// ------------------------------------------------------------------

  /**
     * Attempt to connect to Hermes bridge.
     *
     * Hermes runs as a Python gateway subprocess accessed via Unix socket
     * (path set in HERMES_SOCKET env var). There is no raw HTTP port.
     *
     * This method checks bridge readiness and logs informative status.
     * Real socket communication would be implemented here when the
     * Hermes gateway protocol is defined.
     *
     * @returns {boolean} true if Hermes socket is detected and bridge is live
     */
    connectHermes() {
      const { hermesBridgeEnabled, hermesSocket } = this._opts;

      if (!hermesBridgeEnabled) {
        log('INFO', '[HermesBridge] Disabled — set HERMES_BRIDGE=true to enable');
        return false;
      }

      if (!hermesSocket) {
        log('WARN', '[HermesBridge] Enabled but HERMES_SOCKET is not set — bridge unavailable');
        log('INFO', '[HermesBridge] Expected path format: /path/to/hermes.sock (Unix domain socket)');
        return false;
      }

      // Informative: log what we would connect to
      log('INFO', `[HermesBridge] Hermes gateway subprocess socket: ${hermesSocket}`);

      // Check if socket file exists (informative only — real impl would connect)
      try {
        const fs = require('fs');
        fs.accessSync(hermesSocket, fs.constants.R_OK);
        log('INFO', `[HermesBridge] Socket file found — bridge would be live`);
      } catch {
        log('WARN', `[HermesBridge] Socket file not found at ${hermesSocket} — is Hermes gateway running?`);
      }

      // TODO: implement Unix socket communication with Hermes gateway protocol
      // Expected flow:
      //   1. Connect to hermesSocket via net.Socket
      //   2. Send handshake JSON (e.g. { type: 'relay_bridge', token: HERMES_TOKEN })
      //   3. Read responses from Hermes and broadcast to browser clients
      //   4. Forward browser messages to Hermes via the socket
      log('INFO', '[HermesBridge] Bridge stub — Unix socket transport not yet wired to relay');
      return false;
    }

  // ------------------------------------------------------------------
  // Shutdown
  // ------------------------------------------------------------------

  /**
   * Clean up all relays and stop timers.
   */
  destroy() {
    if (this._statusPollTimer) {
      clearInterval(this._statusPollTimer);
      this._statusPollTimer = null;
    }
    for (const [ws, entry] of this._relays) {
      entry.cleanup();
      try { ws.close(1001, 'manager destroy'); } catch {}
    }
    this._relays.clear();
    this._rooms.clear();
    log('INFO', 'RelayManager destroyed');
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = { createRelay, RelayManager };