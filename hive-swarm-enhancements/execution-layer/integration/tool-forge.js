/**
 * @file tool-forge.js
 * @description Dynamic tool creation — agents can mint new tools at runtime.
 *              Ported from agnt's toolForgeTools.js + toolRegistry.js patterns.
 *
 *              A "tool" here is a JSON-serializable description of a function:
 *              { name, description, parameters, handler } where handler is a
 *              function the runtime can call. v1 only stores descriptions +
 *              validates; the actual execution happens in the agent runtime.
 *
 * Use cases:
 *   - Agent realizes it needs a custom API call, defines a tool, registers it
 *   - Skill evolver proposes a new tool, human approves, it gets forged
 *   - Hermes bridge creates a delegation tool on demand
 *
 * Safety: tools are stored in JSON (handler is a string reference, not code).
 *   Actual code lives in code modules that must be reviewed before use.
 *
 * @author Hive Swarm (HARVEST-4)
 * @version 1.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SWARM_ROOT = path.resolve(__dirname, '..', '..');
const TOOLS_DIR = path.join(SWARM_ROOT, 'execution-layer', 'storage', 'tools');
try { fs.mkdirSync(TOOLS_DIR, { recursive: true }); } catch (_) {}

function newId(prefix) { return prefix + '-' + Date.now() + '-' + crypto.randomBytes(3).toString('hex'); }
function nowIso() { return new Date().toISOString(); }
function safeJson(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return null; } }
function writeJson(p, data) {
  try {
    const tmp = p + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, p);
    return true;
  } catch (_) { return false; }
}

// Minimal JSON-schema-ish validator (no ajv dep). Good enough for tool params.
function validateParams(value, schema) {
  if (!schema || typeof schema !== 'object') return null; // no schema = anything goes
  if (schema.type === 'string' && typeof value !== 'string') return 'expected string';
  if (schema.type === 'number' && typeof value !== 'number') return 'expected number';
  if (schema.type === 'boolean' && typeof value !== 'boolean') return 'expected boolean';
  if (schema.type === 'object') {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return 'expected object';
    if (schema.required && Array.isArray(schema.required)) {
      for (const k of schema.required) {
        if (!(k in value)) return `missing required field: ${k}`;
      }
    }
    if (schema.properties && typeof schema.properties === 'object') {
      for (const k of Object.keys(value)) {
        const propSchema = schema.properties[k];
        if (propSchema) {
          const err = validateParams(value[k], propSchema);
          if (err) return `${k}: ${err}`;
        }
      }
    }
  }
  if (schema.enum && Array.isArray(schema.enum) && !schema.enum.includes(value)) {
    return `value not in enum: [${schema.enum.join(',')}]`;
  }
  return null;
}

class ToolForge {
  constructor(opts = {}) {
    this.opts = Object.assign({ autoApprove: false }, opts);
    this.tools = new Map();
    this._loadFromDisk();
  }

  _loadFromDisk() {
    try {
      if (!fs.existsSync(TOOLS_DIR)) return;
      for (const f of fs.readdirSync(TOOLS_DIR)) {
        if (!f.endsWith('.json')) continue;
        const t = safeJson(path.join(TOOLS_DIR, f));
        if (t && t.id) this.tools.set(t.id, t);
      }
    } catch (_) {}
  }

  _persist(tool) {
    writeJson(path.join(TOOLS_DIR, `${tool.id}.json`), tool);
  }

  /**
   * Forge a new tool.
   * @param {object} spec     { name, description, parameters (json-schema-ish), handlerRef (path:function or string-id) }
   * @param {object} [opts]   { approvedBy, risk }
   * @returns {{ id, status: 'pending'|'forged', tool }}
   */
  forge(spec, opts = {}) {
    if (!spec || !spec.name) throw new TypeError('spec.name is required');
    if (!spec.description) throw new TypeError('spec.description is required');
    if (!spec.handlerRef) throw new TypeError('spec.handlerRef is required (e.g. "module:functionName")');

    const id = newId('tool');
    const tool = {
      id,
      name: spec.name,
      description: spec.description,
      parameters: spec.parameters || { type: 'object', properties: {} },
      handlerRef: spec.handlerRef,
      status: this.opts.autoApprove || opts.approvedBy ? 'forged' : 'pending',
      risk: opts.risk || 'unknown',
      approvedBy: opts.approvedBy || null,
      createdAt: nowIso(),
      createdBy: opts.createdBy || 'tool-forge',
      invocationCount: 0,
      lastInvokedAt: null,
    };
    this.tools.set(id, tool);
    this._persist(tool);
    return { id, status: tool.status, tool };
  }

  approve(toolId, approver) {
    const t = this.tools.get(toolId);
    if (!t) throw new Error('tool not found: ' + toolId);
    if (!approver) throw new TypeError('approver required');
    t.status = 'forged';
    t.approvedBy = approver;
    t.approvedAt = nowIso();
    this._persist(t);
    return t;
  }

  reject(toolId, reason) {
    const t = this.tools.get(toolId);
    if (!t) throw new Error('tool not found: ' + toolId);
    t.status = 'rejected';
    t.rejectedAt = nowIso();
    t.rejectionReason = reason || 'no reason given';
    this._persist(t);
    return t;
  }

  list(filter = {}) {
    let arr = Array.from(this.tools.values());
    if (filter.status) arr = arr.filter(t => t.status === filter.status);
    if (filter.createdBy) arr = arr.filter(t => t.createdBy === filter.createdBy);
    return arr;
  }

  get(toolId) { return this.tools.get(toolId) || null; }

  /**
   * Invoke a forged tool — actually runs the handler with given params.
   * @param {string} toolId
   * @param {object} params
   * @returns {Promise<{ok, output, error?}>}
   */
  async invoke(toolId, params) {
    const t = this.tools.get(toolId);
    if (!t) throw new Error('tool not found: ' + toolId);
    if (t.status !== 'forged') throw new Error(`tool ${toolId} not forged (status: ${t.status})`);

    // Validate params
    const err = validateParams(params, t.parameters);
    if (err) throw new Error(`param validation failed: ${err}`);

    // Resolve handler
    const [modPath, fnName] = t.handlerRef.split(':');
    if (!modPath || !fnName) throw new Error(`invalid handlerRef: ${t.handlerRef}`);
    let handler;
    try {
      // Allow absolute or relative paths (relative to swarm root)
      const absMod = path.isAbsolute(modPath) ? modPath : path.join(SWARM_ROOT, modPath);
      const mod = require(absMod);
      handler = mod[fnName] || mod.default?.[fnName];
      if (typeof handler !== 'function') throw new Error(`handler not a function: ${t.handlerRef}`);
    } catch (e) {
      throw new Error(`failed to load handler ${t.handlerRef}: ${e.message}`);
    }

    t.invocationCount++;
    t.lastInvokedAt = nowIso();
    this._persist(t);
    return { ok: true, output: await handler(params) };
  }
}

const __version = '1.0.0';
module.exports = { ToolForge, forge: (spec, opts) => new ToolForge(opts).forge(spec, opts), __version };
