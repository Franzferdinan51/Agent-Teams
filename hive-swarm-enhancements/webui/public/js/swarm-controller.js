(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Namespace
  // ---------------------------------------------------------------------------
  window.HiveSwarm = window.HiveSwarm || {};
  window.HiveSwarm.SwarmController = {
    init,
    render,
    _pollTimers: new Map(),
  };

  // ---------------------------------------------------------------------------
  // State (local copy — synced from HiveDashboard on each render pass)
  // ---------------------------------------------------------------------------

  /** @type {Map<string, object>} */
  let _swarms = new Map();

  // ---------------------------------------------------------------------------
  // Init — wire events and start polling
  // ---------------------------------------------------------------------------
  function init() {
    // React to HiveDashboard state changes
    HiveDashboard.on('swarm_update', onSwarmUpdate);
    HiveDashboard.on('swarm_create', onSwarmCreate);
    HiveDashboard.on('swarm_delete', onSwarmDelete);

    // Refresh button
    const refreshBtn = document.getElementById('btn-refresh-swarms');
    if (refreshBtn) refreshBtn.addEventListener('click', fetchSwarms);

    // New Swarm button → show inline form
    const newBtn = document.getElementById('btn-new-swarm');
    if (newBtn) newBtn.addEventListener('click', showCreateForm);

    // Delegate clicks inside the swarms list (kill buttons)
    const list = document.getElementById('swarms-list');
    if (list) list.addEventListener('click', onListClick);

    // Kick off
    fetchSwarms();
  }

  // ---------------------------------------------------------------------------
  // Fetch / sync
  // ---------------------------------------------------------------------------
  function fetchSwarms() {
    HiveDashboard.api('/api/swarms')
      .then((data) => {
        if (Array.isArray(data)) {
          _swarms = new Map(data.map((s) => [s.id, s]));
          HiveDashboard.state.swarms = _swarms;
          render();
          scheduleActivePolls();
        }
      })
      .catch(() => HiveDashboard.toast('Failed to load swarms', 'error'));
  }

  // ---------------------------------------------------------------------------
  // Render — rebuild the swarm list inside #swarms-list
  // ---------------------------------------------------------------------------
  function render() {
    const list = document.getElementById('swarms-list');
    if (!list) return;

    // Clear existing cards (keep empty-state sentinel)
    const existing = list.querySelectorAll('.card--swarm');
    existing.forEach((c) => c.remove());

    const empty = document.getElementById('swarms-empty');
    const tpl = document.getElementById('tpl-swarm-card');

    if (_swarms.size === 0) {
      if (empty) empty.hidden = false;
      return;
    }

    if (empty) empty.hidden = true;

    _swarms.forEach((swarm) => {
      const card = buildCard(swarm, tpl);
      list.appendChild(card);
    });
  }

  /** Build one swarm card from template + swarm data */
  function buildCard(swarm, tpl) {
    const card = tpl.content.firstElementChild.cloneNode(true);
    card.dataset.swarmId = swarm.id || '?';

    // Title / ID
    const titleEl = card.querySelector('.swarm-card__id');
    if (titleEl) titleEl.textContent = swarm.id || '?';

    // Emoji by status
    const emojiEl = card.querySelector('.swarm-card__emoji');
    if (emojiEl) emojiEl.textContent = emojiForStatus(swarm.status);

    // Status badge
    const badge = card.querySelector('.swarm-card__status');
    if (badge) {
      badge.textContent = swarm.status || 'unknown';
      badge.className = 'badge badge--' + cssStatus(swarm.status);
    }

    // Goal
    const goalEl = card.querySelector('.swarm-card__goal');
    if (goalEl) goalEl.textContent = swarm.goal || '—';

    // KV fields
    setText(card, '.swarm-card__workers', swarm.workers ? swarm.workers.length : 0);
    setText(card, '.swarm-card__subtasks', swarm.subtasks ? swarm.subtasks.length : 0);
    setText(card, '.swarm-card__updated', HiveDashboard.formatTime(swarm.updatedAt));

    // JSON details (collapsible)
    const jsonEl = card.querySelector('.swarm-card__json');
    if (jsonEl) {
      try {
        jsonEl.textContent = JSON.stringify(swarm, null, 2);
      } catch {
        jsonEl.textContent = String(swarm);
      }
    }

    // Progress bar for running swarms
    if (swarm.status === 'running' && swarm.subtasks && swarm.subtasks.length > 0) {
      const completed = swarm.subtasks.filter((t) => t.status === 'completed').length;
      const total = swarm.subtasks.length;
      const pct = Math.round((completed / total) * 100);
      const footer = card.querySelector('.card__footer');
      if (footer) {
        const bar = document.createElement('div');
        bar.className = 'progress-bar';
        bar.innerHTML = `<div class="progress-bar__fill" style="width:${pct}%"></div>
          <span class="progress-bar__label">${completed}/${total} subtasks (${pct}%)</span>`;
        footer.insertBefore(bar, footer.firstChild);
      }
    }

    // Kill button
    const killBtn = card.querySelector('.swarm-card__kill');
    if (killBtn) killBtn.dataset.swarmId = swarm.id;

    return card;
  }

  // ---------------------------------------------------------------------------
  // Swarm tree visualization (simple nested list under each card)
  // ---------------------------------------------------------------------------
  function renderTree(swarm) {
    if (!swarm.subtasks || !swarm.subtasks.length) return '';
    return (
      '<ul class="swarm-tree">' +
      swarm.subtasks
        .map((sub) => {
          const workers = sub.assignedTo ? sub.assignedTo.join(', ') : 'unassigned';
          return `<li>
            <span class="swarm-tree__node">${HiveDashboard.escapeHtml(sub.label || sub.id)}</span>
            <span class="swarm-tree__meta">[${sub.status || 'pending'}] ← ${HiveDashboard.escapeHtml(workers)}</span>
          </li>`;
        })
        .join('') +
      '</ul>'
    );
  }

  // ---------------------------------------------------------------------------
  // New Swarm form (modal dialog built inline)
  // ---------------------------------------------------------------------------
  function showCreateForm() {
    // Remove any existing modal
    const existing = document.getElementById('swarm-create-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'swarm-create-modal';
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
      <div class="modal">
        <header class="modal__header">
          <h2>Start New Swarm</h2>
          <button class="modal__close" type="button" aria-label="Close">×</button>
        </header>
        <form class="modal__body" id="swarm-create-form">
          <label class="form-row">
            <span>Goal</span>
            <input name="goal" type="text" placeholder="e.g. Research competitor products" required />
          </label>
          <label class="form-row">
            <span>Worker Count</span>
            <input name="count" type="number" min="1" max="20" value="3" required />
          </label>
          <label class="form-row">
            <span>Domain</span>
            <input name="domain" type="text" placeholder="e.g. research, coding, analysis" />
          </label>
          <div class="form-row form-row--right">
            <button class="btn" type="button" id="swarm-create-cancel">Cancel</button>
            <button class="btn btn--primary" type="submit">Start Swarm</button>
          </div>
        </form>
      </div>`;

    document.body.appendChild(modal);

    // Close on backdrop or cancel
    modal.querySelector('.modal__close').addEventListener('click', () => modal.remove());
    modal.querySelector('#swarm-create-cancel').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    // Submit
    modal.querySelector('#swarm-create-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const payload = {
        goal: fd.get('goal'),
        count: parseInt(fd.get('count'), 10),
        domain: fd.get('domain') || 'general',
      };
      modal.remove();
      try {
        const result = await HiveDashboard.api('/api/swarms', { method: 'POST', body: JSON.stringify(payload) });
        HiveDashboard.toast(`Swarm "${result.id}" started`, 'success');
        fetchSwarms();
      } catch {
        HiveDashboard.toast('Failed to start swarm', 'error');
      }
    });

    // Focus first input
    modal.querySelector('input[name="goal"]').focus();
  }

  // ---------------------------------------------------------------------------
  // Polling for active swarms (every 5 s)
  // ---------------------------------------------------------------------------
  function scheduleActivePolls() {
    // Clear existing timers
    HiveSwarm.SwarmController._pollTimers.forEach((t) => clearInterval(t));
    HiveSwarm.SwarmController._pollTimers.clear();

    _swarms.forEach((swarm, id) => {
      if (swarm.status === 'running' || swarm.status === 'pending') {
        const timer = setInterval(() => {
          HiveDashboard.api(`/api/swarms/${id}`)
            .then((updated) => {
              if (updated) {
                _swarms.set(id, updated);
                HiveDashboard.state.swarms = _swarms;
                render();
              }
            })
            .catch(() => {});
        }, 5000);
        HiveSwarm.SwarmController._pollTimers.set(id, timer);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Event handlers
  // ---------------------------------------------------------------------------
  function onSwarmUpdate(payload) {
    if (payload && payload.id) {
      _swarms.set(payload.id, payload);
      HiveDashboard.state.swarms = _swarms;
      render();
      scheduleActivePolls();
    }
  }

  function onSwarmCreate(payload) {
    if (payload && payload.id) {
      _swarms.set(payload.id, payload);
      HiveDashboard.state.swarms = _swarms;
      render();
      scheduleActivePolls();
    }
  }

  function onSwarmDelete(payload) {
    if (payload && payload.id) {
      _swarms.delete(payload.id);
      HiveDashboard.state.swarms = _swarms;
      render();
      scheduleActivePolls();
    }
  }

  function onListClick(e) {
    const killBtn = e.target.closest('.swarm-card__kill');
    if (!killBtn) return;
    const id = killBtn.dataset.swarmId;
    if (!id) return;
    if (!confirm(`Stop swarm ${id}?`)) return;
    HiveDashboard.api(`/api/swarms/${id}`, { method: 'DELETE' })
      .then(() => {
        HiveDashboard.toast(`Swarm ${id} stopped`, 'warn');
        _swarms.delete(id);
        HiveDashboard.state.swarms = _swarms;
        render();
      })
      .catch(() => HiveDashboard.toast('Failed to stop swarm', 'error'));
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  function setText(card, selector, text) {
    const el = card.querySelector(selector);
    if (el) el.textContent = text;
  }

  function emojiForStatus(status) {
    const map = {
      pending: '⏳',
      running: '🐝',
      completed: '✅',
      failed: '❌',
    };
    return map[status] || '❓';
  }

  function cssStatus(status) {
    const map = {
      pending: 'warn',
      running: 'info',
      completed: 'success',
      failed: 'error',
    };
    return map[status] || '';
  }

  // ---------------------------------------------------------------------------
  // Bootstrap when HiveDashboard WS is open
  // ---------------------------------------------------------------------------
  HiveDashboard.on('ws:open', init);
})();