/**
 * @file hermes-subagent-bridge.js
 * @description Multi-runtime, multi-harness delegation bridge.
 *
 *              Works in BOTH OpenClaw (🦞) AND Hermes Agent (⚕️) environments.
 *              The bridge detects which runtime is hosting it and uses the right
 *              envelope (URL, auth header, paths, transport) for each.
 *
 *              Supports ANY code harness via harness-registry.json:
 *              - CodingHarness (`ch`) — default, mature
 *              - Claude Code (`claude`) — deep reasoning
 *              - OpenCode (`opencode`) — model flexibility
 *              - Codex (`codex`) — OpenAI-optimized
 *              - Grok Build (`grok`) — fast xAI iteration
 *              + any other harness you add to the registry
 *
 *              Two-tier config:
 *              1. runtime-registry.json — which agent framework is hosting
 *              2. harness-registry.json — which code-harnesses are available
 *
 *              The bridge is honest about the runtime it lands in and the
 *              harness it picks. Every call writes a trace with `runtime`,
 *              `harness`, `mode`, `capabilities_used`.
 *
 * @author Hive Swarm (HARVEST-5: cross-runtime + multi-harness)
 * @version 2.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile, spawn } = require('child_process');
const crypto = require('crypto');

// --- paths --------------------------------------------------------------
const SWARM_ROOT = path.resolve(__dirname, '..', '..');
const INTEGRATION_DIR = path.join(SWARM_ROOT, 'execution-layer', 'integration');
const STORAGE = path.join(SWARM_ROOT, 'execution-layer', 'storage');
const TRACE_DIR = path.join(STORAGE, 'traces');
const RUNTIME_REG_PATH = path.join(INTEGRATION_DIR, 'runtime-registry.json');
const HARNESS_REG_PATH = path.join(INTEGRATION_DIR, 'harness-registry.json');
const HERMES_INBOX = path.join(os.homedir(), '.hermes', 'inbox');
const HERMES_OUTBOX = path.join(os.homedir(), '.hermes', 'outbox');
const OPENCLAW_INBOX = path.join(os.homedir(), '.openclaw', 'inbox');
const OPENCLAW_OUTBOX = path.join(os.homedir(), '.openclaw', 'outbox');
[TRACE_DIR, HERMES_INBOX, HERMES_OUTBOX, OPENCLAW_INBOX, OPENCLAW_OUTBOX].forEach(d => {
  try { fs.mkdirSync(d, { recursive: true }); } catch (_) {}
});

// --- helpers ------------------------------------------------------------
function nowIso() { return new Date().toISOString(); }
function newId(prefix) { return prefix + '-' + Date.now() + '-' + crypto.randomBytes(3).toString('hex'); }
function safeJson(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return null; } }
function loadJson(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return null; } }
function template(s, vars) {
  if (typeof s !== 'string') return s;
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars && k in vars) ? String(vars[k]) : '');
}
function deepGet(obj, path) {
  if (typeof path !== 'string') return obj;
  return path.split('||').map(p => p.trim()).map(p =>
    p.split('.').reduce((o, k) => (o == null ? o : o[k]), obj)
  ).find(v => v !== undefined && v !== null);
}

// --- registries ---------------------------------------------------------
class Registry {
  constructor(path) {
    this.path = path;
    this.data = loadJson(path) || {};
    this.loadedAt = nowIso();
  }
  get(key) { return this.data && this.data[key]; }
  list(prefix) {
    if (!this.data) return [];
    return Object.keys(this.data).filter(k => !prefix || k.startsWith(prefix));
  }
}

// --- runtime detector ---------------------------------------------------
class RuntimeDetector {
  constructor(runtimeReg) {
    this.reg = runtimeReg;
  }
  /**
   * Probe all known runtimes in parallel, return the first healthy one.
   * Returns { id, name, icon, baseUrl, envelope, ... } or { id: 'standalone' } if none.
   */
  async detect() {
    const order = (this.reg && this.reg.detection_order) || ['openclaw', 'hermes'];
    const results = await Promise.all(order.map(async id => {
      const rt = this.reg && this.reg.runtimes && this.reg.runtimes[id];
      if (!rt) return null;
      const ok = await this._probe(rt);
      return ok ? Object.assign({ id }, rt) : null;
    }));
    const found = results.find(Boolean);
    if (found) return found;
    // Fallback: standalone (no runtime host, file mode only)
    return {
      id: 'standalone',
      name: 'Standalone (no host runtime detected)',
      icon: '🧪',
      baseUrl: null,
      envelope: null,
    };
  }
  async _probe(rt) {
    if (!rt || !rt.probe || !Array.isArray(rt.probe.urls)) return false;
    for (const url of rt.probe.urls) {
      try {
        const r = await this._httpHead(url, rt.probe.timeoutMs || 1500);
        if (r && r.status < 500) return true;
      } catch (_) { /* try next */ }
    }
    return false;
  }
  _httpHead(url, timeoutMs) {
    return new Promise((resolve, reject) => {
      const u = new URL(url);
      const lib = u.protocol === 'https:' ? require('https') : require('http');
      const req = lib.request({
        hostname: u.hostname, port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: u.pathname + u.search, method: 'GET', timeout: timeoutMs,
      }, res => resolve({ status: res.statusCode }));
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
      req.end();
    });
  }
}

// --- harness capability resolver ---------------------------------------
class HarnessResolver {
  constructor(harnessReg) {
    this.reg = harnessReg;
  }
  /**
   * Pick the best harness for a task.
   * @param {object} task       { kind?, capabilities?, model? }
   * @returns {object}          harness entry from registry
   */
  resolve(task = {}) {
    const all = (this.reg && this.reg.harnesses) || {};
    const installed = this._filterInstalled(all);
    if (installed.length === 0) {
      throw new Error('no installed harness — install one of: ' + Object.keys(all).join(', '));
    }
    // 1. explicit task.kind → task_routing lookup
    if (task.kind && this.reg.task_routing && this.reg.task_routing[task.kind]) {
      const preferred = this.reg.task_routing[task.kind];
      for (const id of preferred) {
        const h = installed.find(x => x.id === id);
        if (h) return h;
      }
    }
    // 2. capabilities intersection
    if (Array.isArray(task.capabilities) && task.capabilities.length) {
      const scored = installed.map(h => {
        const caps = (h.capabilities) || {};
        const hits = task.capabilities.filter(c => caps[c] === true).length;
        return { h, score: hits };
      }).sort((a, b) => b.score - a.score);
      if (scored[0] && scored[0].score > 0) return scored[0].h;
    }
    // 3. fallback chain
    const chain = (this.reg && this.reg.fallback_chain) || Object.keys(all);
    for (const id of chain) {
      const h = installed.find(x => x.id === id);
      if (h) return h;
    }
    return installed[0];
  }
  _filterInstalled(all) {
    const out = [];
    for (const id of Object.keys(all)) {
      const h = all[id];
      if (!h || !h.binary) continue;
      if (this._hasBinary(h.binary)) out.push(h);
    }
    return out;
  }
  _hasBinary(name) {
    try {
      const whichCmd = process.platform === 'win32' ? 'where' : 'which';
      require('child_process').execFileSync(whichCmd, [name], { stdio: 'ignore' });
      return true;
    } catch (_) { return false; }
  }
  /** List installed harnesses (for `ch doctor` / status) */
  listInstalled() {
    const all = (this.reg && this.reg.harnesses) || {};
    return Object.keys(all)
      .map(id => all[id])
      .filter(h => h && h.binary && this._hasBinary(h.binary))
      .map(h => ({
        id: h.id, name: h.name, binary: h.binary,
        modes: h.modes, capabilities: Object.keys(h.capabilities || {}).filter(k => h.capabilities[k]),
      }));
  }
}

// --- the bridge ---------------------------------------------------------
class HermesSubagentBridge {
  /**
   * @param {object} [opts]
   * @param {string} [opts.runtime='auto']    'auto' | 'openclaw' | 'hermes' | 'standalone'
   * @param {string} [opts.harness='auto']    'auto' | 'codingharness' | 'claude-code' | 'opencode' | 'codex' | 'grok-build' | custom id
   * @param {string} [opts.mode='auto']       'auto' | 'mcp' | 'headless-cli' | 'http' | 'file'
   * @param {number} [opts.timeoutMs=300000]  5 min default
   * @param {string} [opts.model]             model override (e.g. 'minimax/MiniMax-M2.7')
   * @param {string} [opts.registryDir]       override integration dir
   */
  constructor(opts = {}) {
    this.opts = Object.assign({
      runtime: 'auto',
      harness: 'auto',
      mode: 'auto',
      timeoutMs: 300000,
      model: null,
      registryDir: INTEGRATION_DIR,
    }, opts);
    this.runtimeReg = new Registry(path.join(this.opts.registryDir, 'runtime-registry.json'));
    this.harnessReg = new Registry(path.join(this.opts.registryDir, 'harness-registry.json'));
    this.runtime = null;     // resolved at first delegate()
    this.harness = null;     // resolved at first delegate()
    this._resolver = new HarnessResolver(this.harnessReg.data);
  }

  /**
   * Resolve runtime + harness if not already done. Called automatically by delegate().
   * Exposed for `ch doctor`-style status commands.
   */
  async init() {
    if (!this.runtime) {
      const det = new RuntimeDetector(this.runtimeReg.data);
      if (this.opts.runtime === 'auto') {
        this.runtime = await det.detect();
      } else if (this.opts.runtime === 'standalone') {
        this.runtime = { id: 'standalone', icon: '🧪', name: 'Standalone' };
      } else {
        const rt = (this.runtimeReg.data.runtimes || {})[this.opts.runtime];
        this.runtime = rt ? Object.assign({ id: this.opts.runtime }, rt) : { id: this.opts.runtime, name: this.opts.runtime };
      }
    }
    if (!this.harness) {
      if (this.opts.harness === 'auto') {
        // Only auto-resolve if a harness is actually installed
        const installed = this._resolver.listInstalled();
        if (installed.length > 0) {
          this.harness = this._resolver.resolve({ model: this.opts.model });
        } else {
          this.harness = null; // no harness installed — delegate() will error clearly
        }
      } else {
        const h = (this.harnessReg.data.harnesses || {})[this.opts.harness];
        this.harness = h ? Object.assign({ id: this.opts.harness }, h) : { id: this.opts.harness, name: this.opts.harness };
      }
    }
    return { runtime: this.runtime, harness: this.harness };
  }

  /** Status / doctor — list detected runtime + installed harnesses */
  async status() {
    await this.init();
    return {
      runtime: { id: this.runtime.id, name: this.runtime.name, icon: this.runtime.icon, baseUrl: this.runtime.baseUrl || null },
      harness: this.harness ? { id: this.harness.id, name: this.harness.name, binary: this.harness.binary, modes: this.harness.modes } : null,
      installed_harnesses: this._resolver.listInstalled(),
      registries: {
        runtime: RUNTIME_REG_PATH,
        harness: HARNESS_REG_PATH,
      },
    };
  }

  /**
   * Delegate a task to a sub-agent through the best harness.
   * @param {object} task     { prompt, system?, model?, sessionId?, kind?, capabilities? }
   * @returns {Promise<{output, sessionId, durationMs, runtime, harness, mode, meta}>}
   */
  async delegate(task) {
    if (!task || !task.prompt) throw new TypeError('task.prompt is required');
    await this.init();
    // Re-resolve harness per-task if task hints differ from constructor
    const taskHarness = (task.harness && task.harness !== 'auto')
      ? (this.harnessReg.get('harnesses')[task.harness] || { id: task.harness, name: task.harness })
      : (task.kind || task.capabilities
          ? this._resolver.resolve({ kind: task.kind, capabilities: task.capabilities, model: task.opts_model || task.model })
          : this.harness);
    const mode = this.opts.mode === 'auto' ? this._pickMode(taskHarness) : this.opts.mode;
    const t0 = Date.now();
    let result;
    try {
      result = await this._dispatch(task, taskHarness, mode);
    } catch (e) {
      this._writeTrace({
        kind: 'subagent-delegate', task, mode, harness: taskHarness.id,
        runtime: this.runtime.id, status: 'failed',
        error: String(e && e.message || e), durationMs: Date.now() - t0, createdAt: nowIso(),
      });
      throw e;
    }
    this._writeTrace({
      kind: 'subagent-delegate', task, mode, harness: taskHarness.id,
      runtime: this.runtime.id, status: 'ok',
      durationMs: Date.now() - t0,
      sessionId: result.sessionId,
      createdAt: nowIso(),
    });
    return Object.assign({
      durationMs: Date.now() - t0,
      runtime: this.runtime.id,
      harness: taskHarness.id,
      mode,
      meta: { runtime_name: this.runtime.name, harness_name: taskHarness.name },
    }, result);
  }

  _pickMode(harness) {
    // Prefer mcp if harness supports it AND we have a runtime envelope for mcp_proxy
    if (harness.mcp && this.runtime && this.runtime.envelope && this.runtime.envelope.mcp_proxy) {
      return 'mcp';
    }
    if (harness.headless) return 'headless-cli';
    return 'file';
  }

  async _dispatch(task, harness, mode) {
    if (mode === 'mcp') return this._delegateMcp(task, harness);
    if (mode === 'headless-cli') return this._delegateHeadless(task, harness);
    if (mode === 'http' && this.runtime && this.runtime.envelope) return this._delegateRuntimeHttp(task);
    if (mode === 'file') return this._delegateFile(task, harness);
    throw new Error(`unsupported mode: ${mode}`);
  }

  // --- mode: mcp (runtime-aware proxy) --------------------------------
  // The host runtime (OpenClaw or Hermes) proxies the MCP call to the
  // harness. The bridge just shapes the JSON-RPC envelope per runtime.
  async _delegateMcp(task, harness) {
    const env = this.runtime.envelope;
    if (!env || !env.mcp_proxy) {
      // No runtime proxy → spawn harness MCP stdio directly
      return this._delegateMcpDirect(task, harness);
    }
    const params = {
      name: 'agent_run',
      arguments: {
        prompt: task.prompt,
        system: task.system,
        model: this.opts.model || task.model,
        session_id: task.sessionId,
      },
    };
    const body = template(JSON.stringify(env.mcp_proxy.body), {
      harness: harness.id, method: 'tools/call', params: JSON.stringify(params),
    });
    const url = (env.baseUrl || '') + env.mcp_proxy.path;
    const r = await this._httpRequest(env.mcp_proxy.method, url, body, env);
    if (!r.ok) throw new Error(`${this.runtime.id} mcp proxy ${r.status}: ${String(r.body).slice(0, 400)}`);
    return this._parseRpcResult(r.body, task);
  }

  _delegateMcpDirect(task, harness) {
    // Standalone: spawn harness's MCP stdio server directly, send tools/call
    return new Promise((resolve, reject) => {
      if (!harness.mcp) return reject(new Error(`harness ${harness.id} has no mcp config`));
      const child = spawn(harness.mcp.command, harness.mcp.args || [], { stdio: ['pipe', 'pipe', 'pipe'] });
      const requestId = newId('rpc');
      const jsonrpcMsg = JSON.stringify({
        jsonrpc: '2.0', id: requestId, method: 'tools/call',
        params: {
          name: 'agent_run',
          arguments: {
            prompt: task.prompt, system: task.system,
            model: this.opts.model || task.model, session_id: task.sessionId,
          },
        },
      });
      let out = '', err = '';
      const timer = setTimeout(() => { try { child.kill('SIGKILL'); } catch(_){} reject(new Error(`mcp direct timeout ${this.opts.timeoutMs}ms`)); }, this.opts.timeoutMs);
      child.stdout.on('data', d => {
        out += d;
        if (out.includes('\n')) {
          try { const parsed = JSON.parse(out); clearTimeout(timer); child.kill();
            const result = parsed.result || {};
            const content = Array.isArray(result.content) ? result.content.map(c => c.text || '').join('\n') : (result.output || out);
            resolve({ output: content, sessionId: result.session_id || result.sessionId || task.sessionId || null });
          } catch (_) { /* wait for more */ }
        }
      });
      child.stderr.on('data', d => err += d);
      child.on('error', e => { clearTimeout(timer); reject(e); });
      child.on('close', code => { clearTimeout(timer); if (code !== 0 && !out) reject(new Error(`mcp direct exit ${code}: ${err.slice(0,300)}`)); });
      child.stdin.write(jsonrpcMsg + '\n');
    });
  }

  // --- mode: headless-cli --------------------------------------------
  async _delegateHeadless(task, harness) {
    if (!harness.headless) throw new Error(`harness ${harness.id} has no headless config`);
    const vars = {
      prompt: task.prompt,
      model: this.opts.model || task.model || 'default',
      sessionId: task.sessionId || '',
    };
    const args = (harness.headless.args || []).map(a => template(a, vars));
    return new Promise((resolve, reject) => {
      const t0 = Date.now();
      const child = spawn(harness.headless.command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let out = '', err = '';
      const timer = setTimeout(() => { try { child.kill('SIGKILL'); } catch(_){} reject(new Error(`${harness.id} headless timeout ${this.opts.timeoutMs}ms`)); }, this.opts.timeoutMs);
      child.stdout.on('data', d => out += d);
      child.stderr.on('data', d => err += d);
      child.on('error', e => { clearTimeout(timer); reject(e); });
      child.on('close', code => {
        clearTimeout(timer);
        if (code !== 0) return reject(new Error(`${harness.id} headless exit ${code}: ${err.slice(0,300)}`));
        // Try JSON parse, fall back to text
        let output = out, sessionId = task.sessionId || null;
        try {
          const parsed = JSON.parse(out);
          output = deepGet(parsed, 'output || content || text || body') || out;
          sessionId = deepGet(parsed, 'session_id || sessionId') || sessionId;
        } catch (_) { /* not JSON, use raw */ }
        resolve({ output, sessionId });
      });
    });
  }

  // --- mode: http (runtime-aware, no harness) -------------------------
  async _delegateRuntimeHttp(task) {
    const env = this.runtime.envelope;
    const spec = env.agent_run;
    const body = template(JSON.stringify(spec.body), {
      prompt: task.prompt, system: task.system || '',
      model: this.opts.model || task.model || '',
      sessionId: task.sessionId || '',
    });
    const url = env.baseUrl + spec.path;
    const r = await this._httpRequest(spec.method, url, body, env);
    if (!r.ok) throw new Error(`${this.runtime.id} http ${r.status}: ${String(r.body).slice(0, 400)}`);
    const parsed = (() => { try { return JSON.parse(r.body); } catch (_) { return {}; } })();
    return {
      output: deepGet(parsed, spec.response.output) || r.body,
      sessionId: deepGet(parsed, spec.response.session_id) || task.sessionId || null,
    };
  }

  // --- mode: file (offline fallback) ---------------------------------
  async _delegateFile(task, harness) {
    const useOpenClawDirs = (this.runtime && this.runtime.id === 'openclaw');
    const inbox = useOpenClawDirs ? OPENCLAW_INBOX : HERMES_INBOX;
    const outbox = useOpenClawDirs ? OPENCLAW_OUTBOX : HERMES_OUTBOX;
    const id = newId('bridge');
    const inboxPath = path.join(inbox, id + '.json');
    const outboxPath = path.join(outbox, id + '.json');
    fs.writeFileSync(inboxPath, JSON.stringify({
      id, task, harness: harness && harness.id, runtime: this.runtime && this.runtime.id, requestedAt: nowIso(),
    }, null, 2));
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
    throw new Error(`bridge file-mode timeout after ${this.opts.timeoutMs}ms (inbox=${inboxPath})`);
  }

  // --- http helper, runtime-aware auth --------------------------------
  async _httpRequest(method, url, body, env) {
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? require('https') : require('http');
    const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    if (body) headers['Content-Length'] = Buffer.byteLength(body);
    if (env && env.auth) {
      const value = template(env.auth.value || '', process.env);
      if (value) headers[env.auth.header] = env.auth.type === 'bearer' ? `Bearer ${value}` : value;
    }
    return new Promise((resolve, reject) => {
      const req = lib.request({
        hostname: u.hostname, port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: u.pathname + u.search, method, headers, timeout: this.opts.timeoutMs,
      }, res => {
        let data = '';
        res.on('data', d => data += d);
        res.on('end', () => resolve({ ok: res.statusCode < 500, status: res.statusCode, body: data }));
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
      if (body) req.write(body);
      req.end();
    });
  }

  _parseRpcResult(raw, task) {
    const parsed = (() => { try { return JSON.parse(raw); } catch (_) { return {}; } })();
    if (parsed.error) throw new Error(`JSON-RPC error: ${JSON.stringify(parsed.error)}`);
    const result = parsed.result || {};
    const content = Array.isArray(result.content)
      ? result.content.map(c => c.text || '').join('\n')
      : (result.output || raw);
    return { output: content, sessionId: result.session_id || result.sessionId || task.sessionId || null };
  }

  _writeTrace(trace) {
    try {
      const id = newId('trace');
      fs.writeFileSync(path.join(TRACE_DIR, id + '.json'), JSON.stringify(Object.assign({ id }, trace), null, 2));
    } catch (_) { /* non-fatal */ }
  }
}

const __version = '2.0.0';
module.exports = {
  HermesSubagentBridge,
  Registry,
  RuntimeDetector,
  HarnessResolver,
  delegate: (task, opts) => new HermesSubagentBridge(opts).delegate(task),
  status: (opts) => new HermesSubagentBridge(opts).status(),
  __version,
};
