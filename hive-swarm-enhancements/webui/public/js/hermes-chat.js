(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Namespace
  // ---------------------------------------------------------------------------
  window.HiveSwarm = window.HiveSwarm || {};
  window.HiveSwarm.HermesChat = { init, addMessage, clearHistory };

  // ---------------------------------------------------------------------------
  // Config
  // ---------------------------------------------------------------------------
  const MAX_HISTORY = 50;
  const ROOM_HERMES = 'hermes';

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  /** @type {Array<{role:string, content:string, timestamp:number}>} */
  let _history = [];

  // ---------------------------------------------------------------------------
  // DOM refs (lazily resolved after DOM ready)
  // ---------------------------------------------------------------------------
  function getForm()     { return document.getElementById('chat-form'); }
  function getInput()    { return document.getElementById('chat-input'); }
  function getSendBtn()  { return document.getElementById('chat-send'); }
  function getHint()     { return document.getElementById('chat-hint'); }

  // ---------------------------------------------------------------------------
  // Init — wire the bottom chat bar
  // ---------------------------------------------------------------------------
  function init() {
    const form = getForm();
    if (!form) return;

    // Submit on Enter (without Shift), Shift+Enter = newline
    const input = getInput();
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          submitMessage();
        }
      });
      // Auto-resize textarea height
      input.addEventListener('input', autoResize);
    }

    // Form submit via button too
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      submitMessage();
    });

    // Hint text
    updateHint('Hermes will relay your message to the Agent Mesh.');

    // Subscribe to 'hermes' room via WebSocket once connected
    HiveDashboard.on('ws:open', () => {
      HiveDashboard.send({ type: 'subscribe', room: ROOM_HERMES });
    });

    // Listen for incoming hermes messages (routed from mesh)
    HiveDashboard.on('hermes_message', onHermesMessage);
    HiveDashboard.on('message', onAnyMessage); // catch-all for mesh messages

    // Add a welcome message from Hermes
    addMessage({
      role: 'hermes',
      content: '🐝 Hermes online. How can I help the swarm today?',
      timestamp: Date.now(),
    });
  }

  // ---------------------------------------------------------------------------
  // Submit user message
  // ---------------------------------------------------------------------------
  function submitMessage() {
    const input = getInput();
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    // Add to local history
    addMessage({ role: 'user', content: text, timestamp: Date.now() });

    // Clear input
    input.value = '';
    autoResize.call(input);

    // Send via WebSocket
    HiveDashboard.send({
      type: 'message',
      room: ROOM_HERMES,
      content: text,
      from: 'dashboard',
      timestamp: Date.now(),
    });
  }

  // ---------------------------------------------------------------------------
  // Add a message to the history and re-render the chat log
  // ---------------------------------------------------------------------------
  function addMessage(msg) {
    if (!msg || !msg.content) return;
    _history.push({
      role: msg.role || 'system',
      content: msg.content,
      timestamp: msg.timestamp || Date.now(),
    });

    // Trim oldest when over limit
    while (_history.length > MAX_HISTORY) _history.shift();

    renderHistory();
  }

  // ---------------------------------------------------------------------------
  // Render — rebuild a scrollable chat log above the input bar.
  // We inject a <div id="chat-history"> just above the footer.
  // ---------------------------------------------------------------------------
  function renderHistory() {
    let container = document.getElementById('chat-history');
    if (!container) {
      // Create it between <main> and <footer class="chat-bar">
      const footer = document.querySelector('.chat-bar');
      if (!footer) return;
      container = document.createElement('div');
      container.id = 'chat-history';
      container.className = 'chat-history';
      footer.parentNode.insertBefore(container, footer);
    }

    container.innerHTML = _history
      .map((m) => {
        const time = HiveDashboard.formatTime(m.timestamp);
        const content = HiveDashboard.escapeHtml(m.content);
        const role = HiveDashboard.escapeHtml(m.role);
        const cls = 'chat-history__msg chat-history__msg--' + role;
        return `<div class="${cls}">
          <span class="chat-history__time">${time}</span>
          <span class="chat-history__role">[${role}]</span>
          <span class="chat-history__text">${content}</span>
        </div>`;
      })
      .join('');

    // Auto-scroll to bottom
    container.scrollTop = container.scrollHeight;
  }

  // ---------------------------------------------------------------------------
  // Clear history
  // ---------------------------------------------------------------------------
  function clearHistory() {
    _history = [];
    renderHistory();
  }

  // ---------------------------------------------------------------------------
  // Incoming message handlers
  // ---------------------------------------------------------------------------
  function onHermesMessage(payload) {
    if (!payload) return;
    const content = payload.content || payload.text || '';
    if (!content) return;
    addMessage({
      role: 'hermes',
      content: content,
      timestamp: payload.timestamp || Date.now(),
    });
  }

  function onAnyMessage(payload) {
    // Catch other mesh messages — route by room if needed
    if (!payload || !payload.room) return;
    if (payload.room === ROOM_HERMES || payload.room === 'mesh') {
      // Only add if not from self (avoid echo)
      if (payload.from !== 'dashboard') {
        addMessage({
          role: payload.role || 'hermes',
          content: payload.content || payload.text || '',
          timestamp: payload.timestamp || Date.now(),
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  function updateHint(text) {
    const hint = getHint();
    if (hint) hint.textContent = text;
  }

  /** Auto-resize textarea to fit content */
  function autoResize() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
  }

  // ---------------------------------------------------------------------------
  // Bootstrap when HiveDashboard is initialised
  // ---------------------------------------------------------------------------
  if (typeof HiveDashboard !== 'undefined') {
    HiveDashboard.on('ws:open', init);
  } else {
    // Fallback: poll until HiveDashboard exists
    const wait = setInterval(() => {
      if (typeof HiveDashboard !== 'undefined') {
        clearInterval(wait);
        HiveDashboard.on('ws:open', init);
      }
    }, 100);
  }
})();