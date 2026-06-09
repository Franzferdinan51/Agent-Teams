/**
 * @file hermes-subagent-bridge.js
 * @description Native port of agnt's hermes-subagent pattern — delegate heavy work
 *              to a Hermes Agent sub-process running in the user's own environment.
 *
 *              This is the "agents on top of agents" pattern: a Hive Swarm subagent
 *              can hand off a complex task to Hermes, which has its own toolset,
 *              persistent memory, and skills. When Hermes finishes, we get the
 *              result back via stdout/file.
 *
 * Why native instead of calling the agnt sandbox? Because:
 *   1. We don't have agnt's Electron sandbox on this machine
 *   2. We have Hermes already running via `hermes` CLI / API
 *   3. Native = no extra deps, no VM, no Python venv
 *
 * Verified invocation patterns (adapted from agnt's hermes-subagent skill):
 *   - Direct subprocess: `hermes run "task"` with --output json
 *   - HTTP API: POST to hermes gateway (localhost:8765 or wherever)
 *   - File-based: write prompt to .hermes/inbox/, poll for response
 *
 * @author Hive Swarm (HARVEST-4, ported from agnt.gg hermes-subagent skill)
 * @version 1.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile, spawn } = require('child_process');
const crypto = require('crypto');

// --- paths --------------------------------------------------------------
const SWARM_ROOT = path.resolve(__dirname, '..', '..');
const STORAGE = path.join(SWARM_ROOT, 'execution-layer', 'storage');
const TRACE_DIR = path.join(STORAGE, 'traces');
const HERMES_INBOX = path.join(os.homedir(), '.hermes', 'inbox');
const HERMES_OUTBOX = path.join(os.homedir(), '.hermes', 'outbox');
try { fs.mkdirSync(TRACE_DIR, { recursive: true }); } catch (_) {}
try { fs.mkdirSync(HERMES_INBOX, { recursive: true }); } catch (_) {}
try { fs.mkdirSync(HERMES_OUTBOX, { recursive: true }); } catch (_) {}

// --- helpers ------------------------------------------------------------
function nowIso() { return new Date().toISOString(); }
function newId(prefix) { return prefix + '-' + Date.now() + '-' + crypto.randomBytes(3).toString('hex'); }
function safeJson(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return null; } }

// --- class --------------------------------------------------------------
class HermesSubagentBridge {
  /**
   * @param {object} [opts]
   * @param {string} [opts.mode='auto']   'auto' | 'cli' | 'http' | 'file'
   * @param {string} [opts.cliPath]       path to hermes CLI (default: 'hermes' on PATH)
   * @param {string} [opts.httpUrl]       hermes HTTP gateway (default: http://localhost:8765)
   * @param {number} [opts.timeoutMs=300000]  5 min default
   * @param {string} [opts.model]         model override (e.g. 'minimax/MiniMax-M2.7')
   */
  constructor(opts = {}) {
    this.opts = Object.assign({
      mode: 'auto',
      cliPath: 'hermes',
      httpUrl: process.env.HERMES_GATEWAY_URL || 'http://localhost:8765',
      timeoutMs: 300000,
      model: null,
    }, opts);
  }

  /**
   * Delegate a task to a Hermes sub-agent.
   * @param {object} task     { prompt, system?, model?, tools?, sessionId? }
   * @returns {Promise<{output, sessionId, durationMs, meta}>}
   */
  async delegate(task) {
    if (!task || !task.prompt) throw new TypeError('task.prompt is required');
    const mode = this.opts.mode === 'auto' ? await this._detectMode() : this.opts.mode;
    const t0 = Date.now();
    let result;
    try {
      if (mode === 'cli') result = await this._delegateCli(task);
      else if (mode === 'http') result = await this._delegateHttp(task);
      else if (mode === 'file') result = await this._delegateFile(task);
      else throw new Error(`unknown delegation mode: ${mode}`);
    } catch (e) {
      // Capture the failure as a trace so the evolution engine can learn
      this._writeTrace({
        kind: 'hermes-delegate',
        task,
        mode,
        status: 'failed',
        error: String(e && e.message || e),
        durationMs: Date.now() - t0,
        createdAt: nowIso(),
      });
      throw e;
    }
    this._writeTrace({
      kind: 'hermes-delegate',
      task,
      mode,
      status: 'ok',
      durationMs: Date.now() - t0,
      sessionId: result.sessionId,
      createdAt: nowIso(),
    });
    return Object.assign({ durationMs: Date.now() - t0 }, result);
  }

  async _detectMode() {
    // Prefer HTTP if reachable, else CLI, else file
    try {
      const r = await this._httpGet(this.opts.httpUrl + '/health', 1500);
      if (r && r.ok) return 'http';
    } catch (_) { /* fallthrough */ }
    try {
      await this._which(this.opts.cliPath);
      return 'cli';
    } catch (_) { /* fallthrough */ }
    return 'file';
  }

  // --- CLI mode -------------------------------------------------------
  _delegateCli(task) {
    return new Promise((resolve, reject) => {
      const args = ['run', '--output', 'json', '--no-stream'];
      if (this.opts.model || task.model) args.push('--model', this.opts.model || task.model);
      if (task.sessionId) args.push('--session', task.sessionId);
      if (task.system) args.push('--system', task.system);
      args.push(task.prompt);
      const t0 = Date.now();
      const child = spawn(this.opts.cliPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let out = '';
      let err = '';
      const timer = setTimeout(() => {
        try { child.kill('SIGKILL'); } catch (_) {}
        reject(new Error(`hermes cli timeout after ${this.opts.timeoutMs}ms`));
      }, this.opts.timeoutMs);
      child.stdout.on('data', d => out += d);
      child.stderr.on('data', d => err += d);
      child.on('error', e => { clearTimeout(timer); reject(e); });
      child.on('close', code => {
        clearTimeout(timer);
        if (code !== 0) return reject(new Error(`hermes cli exit ${code}: ${err.slice(0, 400)}`));
        try {
          const parsed = JSON.parse(out);
          resolve({ output: parsed.output || parsed.content || parsed.text || out, sessionId: parsed.session_id || parsed.sessionId || null });
        } catch (_) {
          resolve({ output: out, sessionId: null });
        }
      });
    });
  }

  // --- HTTP mode ------------------------------------------------------
  async _delegateHttp(task) {
    const body = JSON.stringify({
      prompt: task.prompt,
      system: task.system,
      model: this.opts.model || task.model,
      session_id: task.sessionId,
    });
    const r = await this._httpPost(this.opts.httpUrl + '/v1/agent/run', body, this.opts.timeoutMs);
    if (!r.ok) throw new Error(`hermes http ${r.status}: ${String(r.body).slice(0, 400)}`);
    const parsed = (() => { try { return JSON.parse(r.body); } catch (_) { return {}; } })();
    return { output: parsed.output || parsed.content || parsed.text || r.body, sessionId: parsed.session_id || parsed.sessionId || null };
  }

  // --- File mode (fallback) -------------------------------------------
  async _delegateFile(task) {
    // Write prompt to inbox, poll for response in outbox
    const id = newId('hermes');
    const inboxPath = path.join(HERMES_INBOX, id + '.json');
    const outboxPath = path.join(HERMES_OUTBOX, id + '.json');
    fs.writeFileSync(inboxPath, JSON.stringify({ id, task, requestedAt: nowIso() }, null, 2));
    const deadline = Date.now() + this.opts.timeoutMs;
    const pollMs = 1500;
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, pollMs));
      if (fs.existsSync(outboxPath)) {
        const resp = safeJson(outboxPath) || {};
        try { fs.unlinkSync(outboxPath); } catch (_) {}
        return { output: resp.output || resp.content || '', sessionId: resp.session_id || resp.sessionId || null };
      }
    }
    try { fs.unlinkSync(inboxPath); } catch (_) {}
    throw new Error(`hermes file-mode timeout after ${this.opts.timeoutMs}ms (inbox=${inboxPath})`);
  }

  // --- http helpers (no fetch dep) -----------------------------------
  _httpGet(url, timeoutMs = 3000) {
    return new Promise((resolve, reject) => {
      const u = new URL(url);
      const lib = u.protocol === 'https:' ? require('https') : require('http');
      const req = lib.request({ hostname: u.hostname, port: u.port || (u.protocol === 'https:' ? 443 : 80), path: u.pathname + u.search, method: 'GET', timeout: timeoutMs }, res => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => resolve({ ok: res.statusCode < 500, status: res.statusCode, body }));
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
      req.end();
    });
  }
  _httpPost(url, body, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
      const u = new URL(url);
      const lib = u.protocol === 'https:' ? require('https') : require('http');
      const req = lib.request({ hostname: u.hostname, port: u.port || (u.protocol === 'https:' ? 443 : 80), path: u.pathname, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }, timeout: timeoutMs }, res => {
        let data = '';
        res.on('data', d => data += d);
        res.on('end', () => resolve({ ok: res.statusCode < 500, status: res.statusCode, body: data }));
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
      req.write(body);
      req.end();
    });
  }

  _which(cmd) {
    return new Promise((resolve, reject) => {
      const whichCmd = process.platform === 'win32' ? 'where' : 'which';
      execFile(whichCmd, [cmd], (err) => err ? reject(err) : resolve(cmd));
    });
  }

  _writeTrace(trace) {
    try {
      const id = newId('trace');
      fs.writeFileSync(path.join(TRACE_DIR, id + '.json'), JSON.stringify(Object.assign({ id }, trace), null, 2));
    } catch (_) { /* non-fatal */ }
  }
}

const __version = '1.0.0';
module.exports = { HermesSubagentBridge, delegate: (task, opts) => new HermesSubagentBridge(opts).delegate(task), __version };
