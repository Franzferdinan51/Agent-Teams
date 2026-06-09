(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Namespace
  // ---------------------------------------------------------------------------
  window.HiveSwarm = window.HiveSwarm || {};
  window.HiveSwarm.ConsensusPanel = { init, render, _pollTimers: new Map() };

  // ---------------------------------------------------------------------------
  // Local state
  // ---------------------------------------------------------------------------
  /** @type {Map<string, object>} */
  let _polls = new Map();

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------
  function init() {
    HiveDashboard.on('poll_update', onPollUpdate);
    HiveDashboard.on('poll_create', onPollCreate);
    HiveDashboard.on('poll_resolve', onPollResolve);

    const newBtn = document.getElementById('btn-new-poll');
    if (newBtn) newBtn.addEventListener('click', showCreateForm);

    const list = document.getElementById('polls-list');
    if (list) list.addEventListener('click', onListClick);

    fetchPolls();
  }

  // ---------------------------------------------------------------------------
  // Fetch
  // ---------------------------------------------------------------------------
  function fetchPolls() {
    HiveDashboard.api('/api/consensus/polls')
      .then((data) => {
        if (Array.isArray(data)) {
          _polls = new Map(data.map((p) => [p.id, p]));
          HiveDashboard.state.polls = _polls;
          render();
          scheduleActivePolls();
        }
      })
      .catch(() => HiveDashboard.toast('Failed to load polls', 'error'));
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  function render() {
    const list = document.getElementById('polls-list');
    if (!list) return;

    list.querySelectorAll('.card--poll').forEach((c) => c.remove());

    const empty = document.getElementById('polls-empty');
    const tpl = document.getElementById('tpl-poll-card');

    if (_polls.size === 0) {
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;

    _polls.forEach((poll) => list.appendChild(buildCard(poll, tpl)));
  }

  /** Build one poll card */
  function buildCard(poll, tpl) {
    const card = tpl.content.firstElementChild.cloneNode(true);
    card.dataset.pollId = poll.id || '?';

    // Question
    const qEl = card.querySelector('.poll-card__question');
    if (qEl) qEl.textContent = poll.topic || poll.question || '?';

    // Status badge
    const badge = card.querySelector('.poll-card__status');
    if (badge) {
      badge.textContent = poll.status || 'open';
      badge.className = 'badge badge--' + cssForPollStatus(poll.status);
    }

    // Choices list
    const choicesEl = card.querySelector('.poll-card__choices');
    if (choicesEl && Array.isArray(poll.options)) {
      const total = poll.options.reduce((s, o) => s + (o.votes || 0), 0);

      poll.options.forEach((opt) => {
        const pct = total > 0 ? Math.round((opt.votes / total) * 100) : 0;
        const li = document.createElement('li');
        li.className = 'poll-card__choice';
        li.innerHTML = `
          <span class="poll-card__choice-label">${HiveDashboard.escapeHtml(opt.label || opt.text || opt)}</span>
          <span class="poll-card__choice-count">${opt.votes || 0}</span>
          <div class="poll-card__bar-wrap">
            <div class="poll-card__bar" style="width:${pct}%"></div>
          </div>
          <span class="poll-card__choice-pct">${pct}%</span>
          <button class="btn btn--small poll-card__vote"
                  data-poll-id="${poll.id}"
                  data-option="${HiveDashboard.escapeHtml(opt.label || String(opt))}">
            Vote
          </button>`;
        choicesEl.appendChild(li);
      });

      // Confidence bar
      if (total > 0) {
        const confidence = calcConfidence(poll.options, total);
        const confBar = document.createElement('div');
        confBar.className = 'consensus-confidence';
        confBar.innerHTML = `
          <span class="consensus-confidence__label">Confidence</span>
          <div class="consensus-confidence__bar">
            <div class="consensus-confidence__fill" style="width:${confidence}%"></div>
          </div>
          <span class="consensus-confidence__pct">${confidence}%</span>`;
        choicesEl.appendChild(confBar);
      }
    }

    // Voter list
    if (poll.voters && poll.voters.length) {
      const voterDiv = document.createElement('div');
      voterDiv.className = 'poll-card__voters';
      voterDiv.innerHTML = '<span class="muted">Voters: </span>' +
        poll.voters.map((v) => HiveDashboard.escapeHtml(v)).join(', ');
      choicesEl.appendChild(voterDiv);
    }

    // Resolve button (only for open polls)
    if (poll.status === 'open') {
      const footer = card.querySelector('.card__footer');
      if (!footer) {
        const f = document.createElement('footer');
        f.className = 'card__footer';
        card.appendChild(f);
      }
      const resolveBtn = document.createElement('button');
      resolveBtn.className = 'btn btn--small poll-card__resolve';
      resolveBtn.type = 'button';
      resolveBtn.textContent = 'Resolve';
      resolveBtn.dataset.pollId = poll.id;
      card.querySelector('.card__footer').appendChild(resolveBtn);
    }

    return card;
  }

  // ---------------------------------------------------------------------------
  // Create Poll form
  // ---------------------------------------------------------------------------
  function showCreateForm() {
    const existing = document.getElementById('poll-create-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'poll-create-modal';
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
      <div class="modal">
        <header class="modal__header">
          <h2>New Consensus Poll</h2>
          <button class="modal__close" type="button" aria-label="Close">×</button>
        </header>
        <form class="modal__body" id="poll-create-form">
          <label class="form-row">
            <span>Topic / Question</span>
            <input name="topic" type="text" placeholder="e.g. Which model should we use?" required />
          </label>
          <label class="form-row">
            <span>Options <small class="muted">(one per line)</small></span>
            <textarea name="options" rows="4" placeholder="Option A&#10;Option B&#10;Option C" required></textarea>
          </label>
          <label class="form-row">
            <span>Quorum <small class="muted">(optional)</small></span>
            <input name="quorum" type="number" min="2" max="100" placeholder="e.g. 3" />
          </label>
          <div class="form-row form-row--right">
            <button class="btn" type="button" id="poll-create-cancel">Cancel</button>
            <button class="btn btn--primary" type="submit">Create Poll</button>
          </div>
        </form>
      </div>`;

    document.body.appendChild(modal);
    modal.querySelector('.modal__close').addEventListener('click', () => modal.remove());
    modal.querySelector('#poll-create-cancel').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    modal.querySelector('#poll-create-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const options = fd.get('options')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      const payload = { topic: fd.get('topic'), options };
      const quorum = fd.get('quorum');
      if (quorum) payload.quorum = parseInt(quorum, 10);
      modal.remove();
      try {
        const result = await HiveDashboard.api('/api/consensus/polls', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        HiveDashboard.toast('Poll created', 'success');
        fetchPolls();
      } catch {
        HiveDashboard.toast('Failed to create poll', 'error');
      }
    });

    modal.querySelector('input[name="topic"]').focus();
  }

  // ---------------------------------------------------------------------------
  // Polling for active polls (every 3 s)
  // ---------------------------------------------------------------------------
  function scheduleActivePolls() {
    HiveSwarm.ConsensusPanel._pollTimers.forEach((t) => clearInterval(t));
    HiveSwarm.ConsensusPanel._pollTimers.clear();

    _polls.forEach((poll, id) => {
      if (poll.status === 'open') {
        const timer = setInterval(() => {
          HiveDashboard.api(`/api/consensus/polls/${id}`)
            .then((updated) => {
              if (updated) {
                _polls.set(id, updated);
                HiveDashboard.state.polls = _polls;
                render();
              }
            })
            .catch(() => {});
        }, 3000);
        HiveSwarm.ConsensusPanel._pollTimers.set(id, timer);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Event handlers
  // ---------------------------------------------------------------------------
  function onPollUpdate(payload) {
    if (!payload || !payload.id) return;
    _polls.set(payload.id, payload);
    HiveDashboard.state.polls = _polls;
    render();
    scheduleActivePolls();
  }

  function onPollCreate(payload) {
    if (!payload || !payload.id) return;
    _polls.set(payload.id, payload);
    HiveDashboard.state.polls = _polls;
    render();
    scheduleActivePolls();
  }

  function onPollResolve(payload) {
    if (!payload || !payload.id) return;
    _polls.set(payload.id, payload);
    HiveDashboard.state.polls = _polls;
    render();
    scheduleActivePolls();
  }

  function onListClick(e) {
    // Vote button
    const voteBtn = e.target.closest('.poll-card__vote');
    if (voteBtn) {
      const pollId = voteBtn.dataset.pollId;
      const option = voteBtn.dataset.option;
      castVote(pollId, option);
      return;
    }
    // Resolve button
    const resolveBtn = e.target.closest('.poll-card__resolve');
    if (resolveBtn) {
      resolvePoll(resolveBtn.dataset.pollId);
    }
  }

  // ---------------------------------------------------------------------------
  // Vote & Resolve
  // ---------------------------------------------------------------------------
  function castVote(pollId, option) {
    HiveDashboard.api(`/api/consensus/polls/${pollId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ option }),
    })
      .then(() => {
        HiveDashboard.toast(`Voted for "${option}"`, 'success');
        // Refresh the poll
        HiveDashboard.api(`/api/consensus/polls/${pollId}`).then((updated) => {
          if (updated) {
            _polls.set(pollId, updated);
            HiveDashboard.state.polls = _polls;
            render();
          }
        });
      })
      .catch(() => HiveDashboard.toast('Failed to cast vote', 'error'));
  }

  function resolvePoll(pollId) {
    HiveDashboard.api(`/api/consensus/polls/${pollId}/resolve`, { method: 'POST' })
      .then((resolved) => {
        HiveDashboard.toast('Poll resolved', 'success');
        if (resolved) {
          _polls.set(pollId, resolved);
          HiveDashboard.state.polls = _polls;
          render();
        }
      })
      .catch(() => HiveDashboard.toast('Failed to resolve poll', 'error'));
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  function cssForPollStatus(status) {
    const map = { open: 'info', closed: 'success', resolved: 'success', failed: 'error' };
    return map[status] || '';
  }

  /** Simple confidence: how much the leading option dominates */
  function calcConfidence(options, total) {
    if (!options || !total) return 0;
    const leading = Math.max(...options.map((o) => o.votes || 0));
    return Math.round((leading / total) * 100);
  }

  // ---------------------------------------------------------------------------
  // Bootstrap when WS is ready
  // ---------------------------------------------------------------------------
  HiveDashboard.on('ws:open', init);
})();