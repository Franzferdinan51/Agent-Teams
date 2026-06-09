/**
 * @file Hive Swarm Dashboard — browser-side controller.
 *
 * Loaded with `defer` from `public/index.html`. Defines a single global
 * `HiveDashboard` object that:
 *   - Opens a WebSocket to `ws://<host>/ws` (auto-reconnect with backoff)
 *   - Maintains a small in-memory state store (swarms, agents, polls, logs)
 *   - Exposes a tiny pub/sub (`on(event, handler)`) for feature modules
 *   - Wires the tab bar + connection-status indicator
 *   - Performs initial REST fetches to /api/swarms and /api/agents
 *   - Renders a minimal placeholder for each panel so the UI is alive
 *     even before the feature controllers (swarm-controller, agent-cards,
 *     consensus-panel) land.
 *
 * Feature modules can do `HiveDashboard.on('swarm_update', handler)` etc.
 *
 * Public surface (for sibling scripts):
 *   HiveDashboard.state.{swarms, agents, polls, logs}
 *   HiveDashboard.on(event, handler) -> unsubscribe()
 *   HiveDashboard.emit(event, payload)
 *   HiveDashboard.send(msg)         -> send over WS
 *   HiveDashboard.api(path, opts)   -> fetch wrapper
 *   HiveDashboard.toast(msg, kind)
 *   HiveDashboard.formatTime(ts)
 *   HiveDashboard.escapeHtml(s)
 *   HiveDashboard.activateTab(name)
 */

(function (global) {
  'use strict';

  // -------------------------------------------------------------------------
  // Internal state
  // -------------------------------------------------------------------------
  const state = {
    swarms: /** @type {Map<string, any>} */ (new Map()),
    agents: /** @type {Map<string, any>} */ (new Map()),
    polls:  /** @type {Map<string, any>} */ (new Map()),
    logs:   /** @type {Array<any>} */ ([]),
    meta: {
      connected: false,
      meshConnected: false,
      serverTime: null,
      lastHello: null,
    },
  };

  const listeners = new Map(); // event -> Set<fn>
  const MAX_LOGS = 1000;

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  /**
   * Format an epoch-ms timestamp as HH:MM:SS.mmm (local time).
   * @param {number} ts epoch ms
   * @returns {string}
   */
  function formatTime(ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    const pad = (n, w = 2) => String(n).padStart(w, '0');
    return (
      pad(d.getHours()) + ':' +
      pad(d.getMinutes()) + ':' +
      pad(d.getSeconds()) + '.' +
      pad(d.getMilliseconds(), 3)
    );
  }

  /**
   * Minimal HTML-escape for safe text insertion.
   * @param {string} s
   * @returns {string}
   */
  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Show a transient toast notification.
   * @param {string} message
   * @param {'info'|'success'|'warn'|'error'} [kind='info']
   * @param {number} [ttl=4000] ms before auto-dismiss
   */
  function showToast(message, kind = 'info', ttl = 4000) {
    const container = document.getElementById('toast-container');
    const tpl = document.getElementById('tpl-toast');
    if (!container || !tpl) return;
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.classList.add('toast--' + kind);
    const icon = {
      info: 'ℹ️', success: '✅', warn: '⚠️', error: '❌',
    }[kind] || 'ℹ️';
    node.querySelector('.toast__icon').textContent = icon;
    node.querySelector('.toast__message').textContent = message;
    const close = () => {
      if (node.parentNode) node.parentNode.removeChild(node);
    };
    node.querySelector('.toast__close').addEventListener('click', close);
    container.appendChild(node);
    if (ttl > 0) setTimeout(close, ttl);
  }

  // -------------------------------------------------------------------------
  // Pub/Sub
  // -------------------------------------------------------------------------

  /**
   * Subscribe to a dashboard event. Returns an unsubscribe function.
   * Events: swarm_update, agent_update, consensus_update, log, hello,
   *         mesh_status, connected, disconnected, tab_changed.
   * @param {string} event
   * @param {(payload:any)=>void} handler
   * @returns {()=>void} unsubscribe
   */
  function on(event, handler) {
    if (typeof handler !== 'function') return () => {};
    let set = listeners.get(event);
    if (!set) {
      set = new Set();
      listeners.set(event, set);
    }
    set.add(handler);
    return () => set.delete(handler);
  }

  /**
   * Emit a dashboard event to all subscribers.
   * @param {string} event
   * @param {*} payload
   */
  function emit(event, payload) {
    const set = listeners.get(event);
    if (!set) return;
    for (const fn of set) {
      try { fn(payload); } catch (e) {
        console.error('[HiveDashboard] listener error for', event, e);
      }
    }
  }

  // -------------------------------------------------------------------------
  // REST API wrapper
  // -------------------------------------------------------------------------

  /**
   * Small fetch wrapper that prepends /api/ if needed and parses JSON.
   * @param {string} path e.g. "/api/swarms" or "swarms"
   * @param {object} [opts] fetch options
   * @returns {Promise<any>}
   */
  async function api(path, opts = {}) {
    const url = path.startsWith('/') || path.startsWith('http')
      ? path
      : '/api/' + path;
    const res = await fetch(url, Object.assign(
      { headers: { 'Content-Type': 'application/json' } },
      opts
    ));
    const ct = res.headers.get('content-type') || '';
    const body = ct.includes('application/json') ? await res.json() : await res.text();
    if (!res.ok) {
      const err = new Error((body && body.error) || res.statusText);
      err.status = res.status;
      err.body = body;
      throw err;
    }
    return body;
  }

  // -------------------------------------------------------------------------
  // WebSocket
  // -------------------------------------------------------------------------

  let socket = null;
  let reconnectDelay = 1000;
  let reconnectTimer = null;
  let intentionalClose = false;

  /**
   * Build the WS URL for the current page (ws:// or wss://, same host).
   * @returns {string}
   */
  function wsUrl() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return proto + '//' + location.host + '/ws';
  }

  /**
   * Open the WebSocket. Called on load and on every reconnect.
   */
  function connect() {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      return;
    }
    intentionalClose = false;
    setConnectionUi('connecting');
    try {
      socket = new WebSocket(wsUrl());
    } catch (e) {
      console.error('[HiveDashboard] WS construct failed', e);
      scheduleReconnect();
      return;
    }
    socket.addEventListener('open', onOpen);
    socket.addEventListener('close', onClose);
    socket.addEventListener('error', onError);
    socket.addEventListener('message', onMessage);
  }

  function onOpen() {
    reconnectDelay = 1000;
    state.meta.connected = true;
    setConnectionUi('connected');
    emit('connected', { ts: Date.now() });
  }

  function onClose(ev) {
    state.meta.connected = false;
    setConnectionUi('disconnected');
    emit('disconnected', { code: ev.code, reason: ev.reason });
    if (!intentionalClose) scheduleReconnect();
  }

  function onError() {
    // The 'close' event follows 'error' and will trigger reconnect.
    // We just log here for visibility.
    console.warn('[HiveDashboard] WS error (will retry)');
  }

  /**
   * Dispatch an inbound WS message to the appropriate state slot + emit.
   * @param {MessageEvent} ev
   */
  function onMessage(ev) {
    let msg;
    try { msg = JSON.parse(ev.data); } catch { return; }
    if (!msg || typeof msg !== 'object') return;

    switch (msg.type) {
      case 'hello':
        state.meta.lastHello = msg.payload || {};
        state.meta.serverTime = (msg.payload && msg.payload.ts) || Date.now();
        if (msg.payload && typeof msg.payload.mesh === 'boolean') {
          state.meta.meshConnected = msg.payload.mesh;
        }
        renderHeader();
        emit('hello', msg.payload);
        break;

      case 'mesh_status':
        state.meta.meshConnected = !!(msg.payload && msg.payload.connected);
        renderHeader();
        emit('mesh_status', msg.payload);
        break;

      case 'swarm_update': {
        const s = msg.payload || {};
        if (s.id) state.swarms.set(s.id, s);
        emit('swarm_update', s);
        break;
      }

      case 'agent_update': {
        const a = msg.payload || {};
        if (a.id) state.agents.set(a.id, a);
        emit('agent_update', a);
        break;
      }

      case 'consensus_update': {
        const p = msg.payload || {};
        if (p.id) state.polls.set(p.id, p);
        emit('consensus_update', p);
        break;
      }

      case 'log': {
        const entry = msg.payload || {};
        state.logs.push(entry);
        if (state.logs.length > MAX_LOGS) state.logs.shift();
        emit('log', entry);
        break;
      }

      case 'hermes_ack':
        emit('hermes_ack', msg.payload);
        break;

      case 'error':
        console.warn('[HiveDashboard] server error:', msg.payload);
        showToast('Server error: ' + ((msg.payload && msg.payload.error) || 'unknown'), 'error');
        emit('error', msg.payload);
        break;

      default:
        // pass-through to subscribers (e.g. future types)
        emit(msg.type, msg.payload);
    }
  }

  function scheduleReconnect() {
    if (reconnectTimer) return;
    const delay = Math.min(reconnectDelay, 15000);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      reconnectDelay = Math.min(reconnectDelay * 2, 15000);
      connect();
    }, delay);
  }

  /**
   * Send a JSON message over the WS. Queues if not yet open.
   * @param {object} msg
   * @returns {boolean} whether the message was sent (or queued)
   */
  function send(msg) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.warn('[HiveDashboard] send() while WS not open — dropped');
      return false;
    }
    try {
      socket.send(JSON.stringify(msg));
      return true;
    } catch (e) {
      console.error('[HiveDashboard] send failed', e);
      return false;
    }
  }

  // -------------------------------------------------------------------------
  // UI: connection status, header, tabs
  // -------------------------------------------------------------------------

  function setConnectionUi(kind) {
    const dot = document.getElementById('status-dot');
    const label = document.getElementById('status-label');
    if (!dot || !label) return;
    dot.classList.remove('status-dot--ok', 'status-dot--err', 'status-dot--unknown');
    if (kind === 'connected') {
      dot.classList.add('status-dot--ok');
      label.textContent = 'connected';
    } else if (kind === 'connecting') {
      dot.classList.add('status-dot--unknown');
      label.textContent = 'connecting…';
    } else {
      dot.classList.add('status-dot--err');
      label.textContent = 'disconnected';
    }
  }

  function renderHeader() {
    const meshEl = document.getElementById('mesh-status');
    const dot = document.getElementById('mesh-status-dot');
    const label = meshEl && meshEl.querySelector('.mesh-status__label');
    if (!meshEl) return;
    meshEl.hidden = false;
    if (state.meta.meshConnected) {
      dot.classList.remove('status-dot--err', 'status-dot--unknown');
      dot.classList.add('status-dot--ok');
      if (label) label.textContent = 'mesh: up';
    } else {
      dot.classList.remove('status-dot--ok');
      dot.classList.add('status-dot--err');
      if (label) label.textContent = 'mesh: down';
    }
  }

  /**
   * Switch to a named tab and emit a `tab_changed` event.
   * @param {'swarms'|'agents'|'consensus'|'logs'|'settings'} name
   */
  function activateTab(name) {
    const tabs = document.querySelectorAll('.tab');
    const panels = document.querySelectorAll('.tab-panel');
    let found = false;
    tabs.forEach((t) => {
      const active = t.dataset.tab === name;
      t.setAttribute('aria-selected', active ? 'true' : 'false');
      if (active) found = true;
    });
    panels.forEach((p) => {
      p.hidden = p.dataset.panel !== name;
    });
    if (found) emit('tab_changed', { tab: name, ts: Date.now() });
  }

  function wireTabBar() {
    document.querySelectorAll('.tab').forEach((t) => {
      t.addEventListener('click', () => activateTab(t.dataset.tab));
    });
  }

  // -------------------------------------------------------------------------
  // Initial REST fetches
  // -------------------------------------------------------------------------

  async function fetchSwarms() {
    try {
      const data = await api('swarms');
      if (data && Array.isArray(data.swarms)) {
        for (const s of data.swarms) {
          if (s && s.id) {
            state.swarms.set(s.id, s);
            emit('swarm_update', s);
          }
        }
      }
    } catch (e) {
      console.warn('[HiveDashboard] fetchSwarms failed', e);
    }
  }

  async function fetchAgents() {
    try {
      const data = await api('agents');
      if (data && Array.isArray(data.agents)) {
        for (const a of data.agents) {
          if (a && a.id) {
            state.agents.set(a.id, a);
            emit('agent_update', a);
          }
        }
      }
    } catch (e) {
      console.warn('[HiveDashboard] fetchAgents failed', e);
    }
  }

  // -------------------------------------------------------------------------
  // Lightweight renderers (placeholder; replaced by feature modules)
  // -------------------------------------------------------------------------

  function renderSwarmCount() {
    const el = document.getElementById('swarms-empty');
    if (el) {
      if (state.swarms.size > 0) {
        el.textContent = state.swarms.size + ' swarm(s) — feature controller will render details.';
      } else {
        el.textContent = 'No active swarms. Click + New Swarm to start one.';
      }
    }
  }

  function renderAgentCount() {
    const el = document.getElementById('agents-empty');
    if (el) {
      if (state.agents.size > 0) {
        el.textContent = state.agents.size + ' agent(s) online — feature controller will render cards.';
      } else {
        el.textContent = state.meta.meshConnected
          ? 'Mesh reachable but no agents registered yet.'
          : 'Mesh offline — cannot list agents.';
      }
    }
  }

  function renderPollCount() {
    const el = document.getElementById('polls-empty');
    if (el) {
      el.textContent = state.polls.size > 0
        ? state.polls.size + ' poll(s) — feature controller will render details.'
        : 'No active polls. Use + New Poll to ask the swarm a question.';
    }
  }

  // -------------------------------------------------------------------------
  // Chat bar (Hermes)
  // -------------------------------------------------------------------------

  function wireChatBar() {
    const form = document.getElementById('chat-form');
    const input = document.getElementById('chat-input');
    const hint = document.getElementById('chat-hint');
    if (!form || !input) return;

    // auto-resize
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 140) + 'px';
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      const sent = send({
        type: 'hermes_command',
        command: text,
        from: 'dashboard',
        ts: Date.now(),
      });
      if (sent) {
        if (hint) hint.textContent = 'Sent at ' + formatTime(Date.now()) + ' — waiting for hermes…';
        showToast('Sent to Hermes: ' + text.slice(0, 60) + (text.length > 60 ? '…' : ''), 'success', 3000);
        input.value = '';
        input.style.height = 'auto';
      } else {
        showToast('WebSocket not connected — message not sent', 'warn');
      }
    });
  }

  // -------------------------------------------------------------------------
  // Settings panel (small but useful)
  // -------------------------------------------------------------------------

  function wireSettings() {
    const setText = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    setText('settings-dashboard-url', location.origin);
    setText('settings-mesh-url', '(proxied via /api/agents)');
    setText('settings-ws-url', wsUrl());

    const compact = document.getElementById('settings-compact');
    if (compact) {
      compact.addEventListener('change', () => {
        document.body.classList.toggle('compact', compact.checked);
      });
    }
    const anim = document.getElementById('settings-animations');
    if (anim) {
      anim.addEventListener('change', () => {
        document.body.classList.toggle('no-animations', !anim.checked);
      });
    }
    const health = document.getElementById('btn-health-check');
    if (health) {
      health.addEventListener('click', async () => {
        health.disabled = true;
        const oldText = health.textContent;
        health.innerHTML = '<span class="spinner"></span> checking…';
        try {
          const r = await api('health');
          setText('settings-uptime', (r.uptime || 0).toFixed(1) + 's');
          showToast('Health OK · mesh=' + (r.mesh && r.mesh.reachable ? 'up' : 'down'), 'success');
        } catch (e) {
          showToast('Health check failed: ' + e.message, 'error');
        } finally {
          health.disabled = false;
          health.textContent = oldText;
        }
      });
    }
  }

  // -------------------------------------------------------------------------
  // Wiring
  // -------------------------------------------------------------------------

  function wire() {
    wireTabBar();
    wireChatBar();
    wireSettings();

    // state -> placeholder renderers (feature modules will replace)
    on('swarm_update', renderSwarmCount);
    on('agent_update', renderAgentCount);
    on('consensus_update', renderPollCount);

    // New swarm button (stub — feature controller will replace)
    const btn = document.getElementById('btn-new-swarm');
    if (btn) {
      btn.addEventListener('click', () => {
        showToast('Swarm creator UI is wired by the swarm-controller feature module (coming next tick).', 'info', 5000);
      });
    }
    const refresh = document.getElementById('btn-refresh-swarms');
    if (refresh) refresh.addEventListener('click', fetchSwarms);
    const refreshA = document.getElementById('btn-refresh-agents');
    if (refreshA) refreshA.addEventListener('click', fetchAgents);
  }

  // -------------------------------------------------------------------------
  // Boot
  // -------------------------------------------------------------------------

  function boot() {
    if (global.HiveDashboard && global.HiveDashboard.__booted) return;
    wire();
    connect();
    fetchSwarms();
    fetchAgents();
    // re-render count placeholders
    renderSwarmCount();
    renderAgentCount();
    renderPollCount();
  }

  // -------------------------------------------------------------------------
  // Expose
  // -------------------------------------------------------------------------

  global.HiveDashboard = {
    // lifecycle
    boot,
    __booted: true,
    // state (read-only — mutate via the WS / REST)
    state,
    // pub/sub
    on,
    emit,
    // IO
    send,
    api,
    // ui
    activateTab,
    toast: showToast,
    // utils
    formatTime,
    escapeHtml,
    // access to current socket (escape hatch)
    get socket() { return socket; },
  };

  // Auto-boot on DOM ready (the script is loaded with `defer`, so the
  // document is already parsed by the time we run).
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})(window);
