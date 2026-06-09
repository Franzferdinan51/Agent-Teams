(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Namespace
  // ---------------------------------------------------------------------------
  window.HiveSwarm = window.HiveSwarm || {};
  window.HiveSwarm.AgentCards = { init, render };

  // ---------------------------------------------------------------------------
  // Local state
  // ---------------------------------------------------------------------------
  /** @type {Map<string, object>} */
  let _agents = new Map();

  /** Max messages to show in the preview tooltip */
  const MAX_PREVIEW = 3;

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------
  function init() {
    HiveDashboard.on('agent_update', onAgentUpdate);
    HiveDashboard.on('agent_message', onAgentMessage);

    const refreshBtn = document.getElementById('btn-refresh-agents');
    if (refreshBtn) refreshBtn.addEventListener('click', fetchAgents);

    // Delegate spawn form / expand inside agents grid
    const grid = document.getElementById('agents-grid');
    if (grid) grid.addEventListener('click', onGridClick);

    fetchAgents();
  }

  // ---------------------------------------------------------------------------
  // Fetch agents
  // ---------------------------------------------------------------------------
  function fetchAgents() {
    HiveDashboard.api('/api/agents')
      .then((data) => {
        if (Array.isArray(data)) {
          _agents = new Map(data.map((a) => [a.id, a]));
          HiveDashboard.state.agents = _agents;
          render();
        }
      })
      .catch(() => HiveDashboard.toast('Failed to load agents', 'error'));
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  function render() {
    const grid = document.getElementById('agents-grid');
    if (!grid) return;

    // Remove existing cards
    grid.querySelectorAll('.card--agent').forEach((c) => c.remove());

    const empty = document.getElementById('agents-empty');
    const tpl = document.getElementById('tpl-agent-card');

    if (_agents.size === 0) {
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;

    _agents.forEach((agent) => {
      grid.appendChild(buildCard(agent, tpl));
    });
  }

  /** Build one agent card */
  function buildCard(agent, tpl) {
    const card = tpl.content.firstElementChild.cloneNode(true);
    card.dataset.agentId = agent.id || '?';

    // Name
    const nameEl = card.querySelector('.agent-card__name');
    if (nameEl) nameEl.textContent = agent.name || agent.id || '?';

    // Status dot + label
    const statusBadge = card.querySelector('.agent-card__status');
    if (statusBadge) {
      const dot = statusBadge.querySelector('.status-dot');
      const label = statusBadge.querySelector('.agent-card__status-label');
      const css = cssForStatus(agent.status);
      if (dot) dot.className = `status-dot status-dot--${css}`;
      if (label) label.textContent = agent.status || 'unknown';
    }

    // KV fields
    setText(card, '.agent-card__role', agent.role || '—');
    setText(card, '.agent-card__model', agent.model || '—');

    // Current task (truncated)
    const taskEl = card.querySelector('.agent-card__task');
    if (taskEl) {
      const task = agent.currentTask || agent.task || '—';
      taskEl.textContent = task.length > 60 ? task.slice(0, 60) + '…' : task;
      taskEl.title = task;
    }

    // Expand button → show message history
    const expandBtn = document.createElement('button');
    expandBtn.className = 'btn btn--small agent-card__expand';
    expandBtn.type = 'button';
    expandBtn.textContent = 'Msgs';
    expandBtn.dataset.agentId = agent.id;
    const footer = card.querySelector('.card__footer');
    if (!footer) {
      const f = document.createElement('footer');
      f.className = 'card__footer';
      card.appendChild(f);
      f.appendChild(expandBtn);
    } else {
      footer.appendChild(expandBtn);
    }

    // Room badge (if present)
    if (agent.room) {
      const meta = card.querySelector('.kv');
      if (meta) {
        const dt = document.createElement('dt');
        dt.textContent = 'room';
        const dd = document.createElement('dd');
        dd.className = 'agent-card__room';
        dd.textContent = agent.room;
        meta.appendChild(dt);
        meta.appendChild(dd);
      }
    }

    return card;
  }

  // ---------------------------------------------------------------------------
  // Message history panel (fetch + show in expandable overlay)
  // ---------------------------------------------------------------------------
  function showMessageHistory(agentId) {
    // Remove existing panel
    const existing = document.getElementById('agent-msg-panel');
    if (existing) existing.remove();

    const panel = document.createElement('div');
    panel.id = 'agent-msg-panel';
    panel.className = 'modal-backdrop';
    panel.innerHTML = `
      <div class="modal" style="max-width:600px">
        <header class="modal__header">
          <h2>Messages — ${HiveDashboard.escapeHtml(agentId)}</h2>
          <button class="modal__close" type="button" aria-label="Close">×</button>
        </header>
        <div class="modal__body" id="agent-msg-list">
          <p class="muted">Loading…</p>
        </div>
      </div>`;

    document.body.appendChild(panel);

    panel.querySelector('.modal__close').addEventListener('click', () => panel.remove());
    panel.addEventListener('click', (e) => { if (e.target === panel) panel.remove(); });

    // Fetch last 10 messages
    HiveDashboard.api(`/api/agents/${encodeURIComponent(agentId)}/messages`)
      .then((msgs) => {
        const list = document.getElementById('agent-msg-list');
        if (!msgs || !msgs.length) {
          list.innerHTML = '<p class="muted">No messages recorded.</p>';
          return;
        }
        list.innerHTML = msgs
          .slice(-10)
          .reverse()
          .map((m) => {
            const role = HiveDashboard.escapeHtml(m.role || 'unknown');
            const time = HiveDashboard.formatTime(m.timestamp);
            const content = HiveDashboard.escapeHtml(m.content || m.text || '');
            const cls = role === 'hermes' ? 'msg--hermes' : role === 'user' ? 'msg--user' : 'msg--system';
            return `<div class="msg-line ${cls}">
              <span class="msg-line__time">${time}</span>
              <span class="msg-line__role">[${role}]</span>
              <span class="msg-line__text">${content}</span>
            </div>`;
          })
          .join('');
      })
      .catch(() => {
        const list = document.getElementById('agent-msg-list');
        if (list) list.innerHTML = '<p class="muted">Failed to load messages.</p>';
      });
  }

  // ---------------------------------------------------------------------------
  // Spawn Agent form
  // ---------------------------------------------------------------------------
  function showSpawnForm() {
    const existing = document.getElementById('agent-spawn-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'agent-spawn-modal';
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
      <div class="modal">
        <header class="modal__header">
          <h2>Spawn Agent</h2>
          <button class="modal__close" type="button" aria-label="Close">×</button>
        </header>
        <form class="modal__body" id="agent-spawn-form">
          <label class="form-row">
            <span>Name</span>
            <input name="name" type="text" placeholder="e.g. Analyst-Alpha" required />
          </label>
          <label class="form-row">
            <span>Role</span>
            <input name="role" type="text" placeholder="e.g. researcher, coder, planner" required />
          </label>
          <label class="form-row">
            <span>Model <small class="muted">(optional)</small></span>
            <input name="model" type="text" placeholder="e.g. gpt-4o, claude-3-opus" />
          </label>
          <div class="form-row form-row--right">
            <button class="btn" type="button" id="agent-spawn-cancel">Cancel</button>
            <button class="btn btn--primary" type="submit">Spawn</button>
          </div>
        </form>
      </div>`;

    document.body.appendChild(modal);
    modal.querySelector('.modal__close').addEventListener('click', () => modal.remove());
    modal.querySelector('#agent-spawn-cancel').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    modal.querySelector('#agent-spawn-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const payload = { name: fd.get('name'), role: fd.get('role') };
      const model = fd.get('model');
      if (model) payload.model = model;
      modal.remove();
      try {
        const result = await HiveDashboard.api('/api/agents/spawn', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        HiveDashboard.toast(`Agent "${result.id || payload.name}" spawned`, 'success');
        fetchAgents();
      } catch {
        HiveDashboard.toast('Failed to spawn agent', 'error');
      }
    });

    modal.querySelector('input[name="name"]').focus();
  }

  // ---------------------------------------------------------------------------
  // Event handlers
  // ---------------------------------------------------------------------------
  function onAgentUpdate(payload) {
    if (!payload || !payload.id) return;
    _agents.set(payload.id, payload);
    HiveDashboard.state.agents = _agents;
    render();
  }

  function onAgentMessage(payload) {
    // Real-time message — update the agent's last-message preview
    if (!payload || !payload.agentId) return;
    const agent = _agents.get(payload.agentId);
    if (agent) {
      agent.lastMessage = payload.content || payload.text || '';
      agent.messages = agent.messages || [];
      agent.messages.push(payload);
      // Keep last 5 previews
      if (agent.messages.length > 5) agent.messages.shift();
    }
    render();
  }

  function onGridClick(e) {
    // Expand button → message history
    const expandBtn = e.target.closest('.agent-card__expand');
    if (expandBtn) {
      showMessageHistory(expandBtn.dataset.agentId);
      return;
    }
    // Spawn button (if added in future)
    const spawnBtn = e.target.closest('.agent-card__spawn');
    if (spawnBtn) {
      showSpawnForm();
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  function setText(card, selector, text) {
    const el = card.querySelector(selector);
    if (el) el.textContent = text;
  }

  function cssForStatus(status) {
    const map = {
      online: 'success',
      busy: 'warn',
      idle: 'info',
      offline: 'error',
    };
    return map[status] || '';
  }

  // ---------------------------------------------------------------------------
  // Bootstrap when WS is ready
  // ---------------------------------------------------------------------------
  HiveDashboard.on('ws:open', init);
})();