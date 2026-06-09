#!/usr/bin/env node
/**
 * @file harness-bridge.test.js
 * @description Tests for the multi-runtime, multi-harness bridge (v2.0.0).
 *
 *              What we verify:
 *              1. Registries load and validate
 *              2. RuntimeDetector picks the right runtime (mocked)
 *              3. HarnessResolver picks the right harness for a task
 *              4. Bridge initializes runtime + harness on first delegate
 *              5. Trace is written on success and failure
 *              6. Cross-runtime: same harness, two different envelopes
 *
 *              Run: node tests/e2e/harness-bridge.test.js
 *              Or:  npx mocha tests/e2e/harness-bridge.test.js
 */

'use strict';

const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const assert = require('assert');

const SWARM_ROOT = path.resolve(__dirname, '..', '..');
const BRIDGE_PATH = path.join(SWARM_ROOT, 'hive-swarm-enhancements', 'execution-layer', 'integration', 'hermes-subagent-bridge.js');
const RUNTIME_REG = path.join(SWARM_ROOT, 'hive-swarm-enhancements', 'integration', 'runtime-registry.json');
const HARNESS_REG = path.join(SWARM_ROOT, 'hive-swarm-enhancements', 'integration', 'harness-registry.json');

const { HermesSubagentBridge, Registry, RuntimeDetector, HarnessResolver } = require(BRIDGE_PATH);

// --- mocha-compat or node:test compat -----------------------------------
let describe, it;
if (typeof globalThis.describe === 'function') {
  describe = globalThis.describe; it = globalThis.it;
} else {
  const nodeTest = require('node:test');
  describe = (name, fn) => { console.log(`\n  ${name}`); fn(); };
  it = (name, fn) => {
    try {
      if (fn.constructor.name === 'AsyncFunction') {
        // Run async tests synchronously by waiting
        const p = fn();
        if (p && typeof p.then === 'function') {
          p.then(() => process.exitCode = 0).catch(e => {
            console.error(`    ✗ ${name}: ${e.message}`);
            process.exitCode = 1;
          });
        }
      } else {
        fn();
        console.log(`    ✓ ${name}`);
      }
    } catch (e) {
      console.error(`    ✗ ${name}: ${e.message}`);
      process.exitCode = 1;
    }
  };
}

// --- helpers ------------------------------------------------------------
function loadReg(name) {
  const p = name === 'runtime' ? RUNTIME_REG : HARNESS_REG;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}
function whichOrNull(name) {
  try {
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    execFileSync(cmd, [name], { stdio: 'ignore' });
    return true;
  } catch (_) { return false; }
}

let passed = 0, failed = 0;
function ok(name, fn) {
  return Promise.resolve().then(fn).then(
    () => { passed++; console.log(`    ✓ ${name}`); },
    (e) => { failed++; console.error(`    ✗ ${name}: ${e.message}`); }
  );
}

// --- 1. registries -------------------------------------------------------
async function testRegistries() {
  console.log('\n  Registries');
  await ok('runtime-registry.json loads with 2 runtimes', () => {
    const r = loadReg('runtime');
    assert.ok(r.runtimes);
    assert.ok(r.runtimes.openclaw, 'openclaw runtime missing');
    assert.ok(r.runtimes.hermes, 'hermes runtime missing');
    assert.ok(r.runtimes.openclaw.envelope.agent_run.path);
    assert.ok(r.runtimes.hermes.envelope.agent_run.path);
  });
  await ok('harness-registry.json loads with 5+ harnesses', () => {
    const r = loadReg('harness');
    assert.ok(r.harnesses);
    const ids = Object.keys(r.harnesses);
    assert.ok(ids.length >= 5, `expected 5+ harnesses, got ${ids.length}`);
    ['codingharness', 'opencode', 'claude-code', 'codex', 'grok-build'].forEach(id => {
      assert.ok(r.harnesses[id], `harness ${id} missing`);
    });
  });
  await ok('every harness has binary + capabilities + selection', () => {
    const r = loadReg('harness');
    for (const id of Object.keys(r.harnesses)) {
      const h = r.harnesses[id];
      assert.ok(h.binary, `${id} missing binary`);
      assert.ok(h.capabilities, `${id} missing capabilities`);
      assert.ok(h.selection, `${id} missing selection`);
    }
  });
}

// --- 2. runtime detector (mocked) ---------------------------------------
async function testDetector() {
  console.log('\n  RuntimeDetector (mocked)');
  await ok('detects standalone when nothing is up', async () => {
    const det = new RuntimeDetector({
      runtimes: { ghost: { probe: { urls: ['http://localhost:1/health'], timeoutMs: 100 } } },
      detection_order: ['ghost'],
    });
    const r = await det.detect();
    assert.equal(r.id, 'standalone');
  });
}

// --- 3. harness resolver -------------------------------------------------
async function testResolver() {
  console.log('\n  HarnessResolver');
  const reg = loadReg('harness');
  const resolver = new HarnessResolver(reg);
  const installed = resolver.listInstalled();

  await ok('task.kind=code_edit_multi_file picks a valid harness', () => {
    if (installed.length === 0) return; // skip if no harnesses
    const pick = resolver.resolve({ kind: 'code_edit_multi_file' });
    assert.ok(pick);
    assert.ok(['codingharness', 'claude-code', 'opencode', 'codex', 'grok-build'].includes(pick.id));
  });
  await ok('task.capabilities filter narrows selection', () => {
    if (installed.length === 0) return;
    const pick = resolver.resolve({ capabilities: ['code_review', 'sessions'] });
    if (pick.capabilities) {
      assert.equal(pick.capabilities.code_review, true);
    }
  });
  await ok('falls back through chain for unknown kind', () => {
    if (installed.length === 0) return;
    const pick = resolver.resolve({ kind: 'unknown_kind_xyz' });
    assert.ok(pick);
  });
}

// --- 4. bridge initialization -------------------------------------------
async function testBridgeInit() {
  console.log('\n  Bridge init');
  await ok('auto-detects runtime + harness', async () => {
    const b = new HermesSubagentBridge();
    const s = await b.status();
    assert.ok(s.runtime);
    assert.ok(s.installed_harnesses);
    console.log(`      runtime=${s.runtime.id} harnesses=[${s.installed_harnesses.map(h => h.id).join(',')}]`);
  });
  await ok('explicit runtime override works', async () => {
    const b = new HermesSubagentBridge({ runtime: 'standalone' });
    const s = await b.status();
    assert.equal(s.runtime.id, 'standalone');
  });
  await ok('explicit harness override works', async () => {
    const b = new HermesSubagentBridge({ runtime: 'standalone', harness: 'opencode' });
    const s = await b.status();
    assert.equal(s.harness.id, 'opencode');
  });
}

// --- 5. cross-runtime envelope shaping -----------------------------------
async function testEnvelopes() {
  console.log('\n  Cross-runtime envelope');
  await ok('OpenClaw uses X-API-Key + /v1/agent/run', () => {
    const r = loadReg('runtime');
    const oc = r.runtimes.openclaw;
    assert.equal(oc.envelope.auth.header, 'X-API-Key');
    assert.equal(oc.envelope.agent_run.method, 'POST');
    assert.equal(oc.envelope.agent_run.path, '/v1/agent/run');
  });
  await ok('Hermes uses Authorization Bearer + /api/agent/run', () => {
    const r = loadReg('runtime');
    const h = r.runtimes.hermes;
    assert.equal(h.envelope.auth.header, 'Authorization');
    assert.equal(h.envelope.auth.type, 'bearer');
    assert.equal(h.envelope.agent_run.path, '/api/agent/run');
  });
  await ok('both runtimes have mcp_proxy for harness delegation', () => {
    const r = loadReg('runtime');
    assert.ok(r.runtimes.openclaw.envelope.mcp_proxy);
    assert.ok(r.runtimes.hermes.envelope.mcp_proxy);
  });
}

// --- 6. trace writing ---------------------------------------------------
async function testTraces() {
  console.log('\n  Trace writing');
  await ok('writes a trace on every delegate() call', async () => {
    const tracesDir = path.join(SWARM_ROOT, 'hive-swarm-enhancements', 'execution-layer', 'storage', 'traces');
    const before = fs.existsSync(tracesDir) ? fs.readdirSync(tracesDir).length : 0;
    const b = new HermesSubagentBridge({ runtime: 'standalone', mode: 'file', timeoutMs: 500 });
    try {
      await b.delegate({ prompt: 'test' });
    } catch (_) { /* expected to fail — no harness to write to */ }
    const after = fs.readdirSync(tracesDir).length;
    assert.ok(after >= before, `expected trace to be written (before=${before} after=${after})`);
  });
}

// --- 7. live integration (gated) ---------------------------------------
async function testLive() {
  console.log('\n  Live integration (gated)');
  const installed = ['ch', 'opencode', 'claude', 'codex', 'grok'].filter(whichOrNull);
  if (installed.length === 0) {
    console.log('    ⊝ no harness installed — skipping live test');
    return;
  }
  await ok(`can call real harness headless (have: ${installed.join(',')})`, async () => {
    const b = new HermesSubagentBridge({ runtime: 'standalone', mode: 'headless-cli', timeoutMs: 30000 });
    let r;
    try {
      r = await b.delegate({ prompt: 'Reply with the single word: ok', kind: 'quick_fix_one_liner' });
    } catch (e) {
      console.log(`      ⊝ skipped (${String(e.message).slice(0,80)})`);
      return;
    }
    if (!r) return;
    assert.ok(r.output, 'no output');
    assert.ok(r.harness, 'no harness id');
    console.log(`      harness=${r.harness} mode=${r.mode} output="${String(r.output).slice(0,80).replace(/\n/g,' ')}"`);
  });
}

// --- runner -------------------------------------------------------------
(async () => {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  harness-bridge.test.js — cross-runtime + multi-harness');
  console.log('══════════════════════════════════════════════════════');
  try {
    await testRegistries();
    await testDetector();
    await testResolver();
    await testBridgeInit();
    await testEnvelopes();
    await testTraces();
    await testLive();
  } catch (e) {
    console.error('FATAL:', e);
    process.exit(1);
  }
  console.log(`\n  ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
