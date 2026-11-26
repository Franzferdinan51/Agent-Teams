#!/usr/bin/env node
/**
 * Agent-Teams end-to-end test harness.
 *
 * Boots, against a stub OpenAI-compatible LLM (test/stub-llm.js, never a real API):
 *   - stub LLM            (ephemeral port)
 *   - council-server.js   (deliberation + MoA engine, hardcoded port 3003)
 *   - council-api-server.cjs (control plane + MCP, ephemeral PORT)
 *
 * Asserts the core loops, prints PASS/FAIL per check, exits non-zero on any
 * failure, and kills every child process on exit.
 *
 * Run: npm test   (or: node test/run-tests.js)
 */
const { spawn, execFile } = require('child_process');
const fs = require('fs');
const net = require('net');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SETTINGS_FILE = path.join(ROOT, 'settings.json');
const COUNCIL_PORT = 3003; // hardcoded in council-server.js

const children = [];
let failures = 0;
let total = 0;

function check(name, ok, detail = '') {
  total++;
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  return ok;
}

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
  });
}

function start(name, args, env) {
  const child = spawn(process.execPath, args, {
    cwd: ROOT,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (d) => process.stdout.write(`[${name}] ${d}`));
  child.stderr.on('data', (d) => process.stdout.write(`[${name}:err] ${d}`));
  children.push(child);
  return child;
}

async function fetchJson(url, opts = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* leave null */ }
    return { status: res.status, json, text };
  } finally {
    clearTimeout(timer);
  }
}

async function waitForHealth(url, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetchJson(url, {}, 2000);
      if (r.status === 200) return true;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

function cleanup(settingsBackup) {
  for (const child of children) {
    try { child.kill('SIGTERM'); } catch { /* already dead */ }
  }
  // Restore settings.json to its pre-test state (runtime state of the api server)
  try {
    if (settingsBackup === null) {
      if (fs.existsSync(SETTINGS_FILE)) fs.unlinkSync(SETTINGS_FILE);
    } else {
      fs.writeFileSync(SETTINGS_FILE, settingsBackup);
    }
  } catch { /* best effort */ }
}

async function main() {
  const settingsBackup = fs.existsSync(SETTINGS_FILE) ? fs.readFileSync(SETTINGS_FILE, 'utf8') : null;

  const stubPort = await freePort();
  const apiPort = await freePort();
  const stubRoot = `http://127.0.0.1:${stubPort}`;
  const councilBase = `http://127.0.0.1:${COUNCIL_PORT}`;
  const apiBase = `http://127.0.0.1:${apiPort}`;

  console.log(`stub LLM: ${stubRoot}/v1 | council-server: ${councilBase} | council-api: ${apiBase}\n`);

  start('stub', [path.join(__dirname, 'stub-llm.js')], { STUB_LLM_PORT: String(stubPort) });
  // council-server.js appends /v1 itself (LMSTUDIO_URL) and moa-runtime reads
  // LM_STUDIO_URL the same way — both get the stub root WITHOUT /v1.
  start('council', ['council-server.js'], { LMSTUDIO_URL: stubRoot, LM_STUDIO_URL: stubRoot });
  start('api', ['council-api-server.cjs'], { PORT: String(apiPort), LMSTUDIO_URL: `${stubRoot}/v1` });

  try {
    // ── Boot / health ──────────────────────────────────────────────
    check('stub LLM health', await waitForHealth(`${stubRoot}/health`, 10000));
    check('council-server health', await waitForHealth(`${councilBase}/api/health`), 'GET /api/health on :3003');
    check('council-api health', await waitForHealth(`${apiBase}/api/health`), `GET /api/health on :${apiPort}`);

    // ── Council engine ─────────────────────────────────────────────
    const councilors = await fetchJson(`${councilBase}/api/councilors`);
    check('councilors count > 0', (councilors.json?.count || 0) > 0, `count=${councilors.json?.count}`);

    const providers = await fetchJson(`${councilBase}/api/providers`);
    check('council providers list', Array.isArray(providers.json?.providers) && providers.json.providers.includes('lmstudio'),
      `providers=${JSON.stringify(providers.json?.providers)}`);

    const startRes = await fetchJson(`${councilBase}/api/session/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: 'Should we adopt the stub test plan?', mode: 'standard' }),
    });
    const sessionId = startRes.json?.session_id;
    check('deliberation session start', !!sessionId && startRes.json?.status === 'complete',
      `session_id=${sessionId} status=${startRes.json?.status}`);

    let sessionText = '';
    if (sessionId) {
      const session = await fetchJson(`${councilBase}/api/session/${sessionId}`);
      const result = session.json?.result;
      sessionText = typeof result === 'string'
        ? result
        : result?.choices?.[0]?.message?.content || '';
      check('deliberation session completed with content',
        session.json?.status === 'complete' && sessionText.includes('Stub council response'),
        `excerpt="${sessionText.slice(0, 80)}"`);
    } else {
      check('deliberation session completed with content', false, 'no session_id');
    }

    const presets = await fetchJson(`${councilBase}/api/moa/presets`);
    const presetNames = (presets.json?.presets || []).map((p) => p.name);
    check('moa presets listed', presetNames.includes('tiny') && presetNames.length >= 2,
      `presets=${presetNames.join(',')}`);

    const moaRun = await fetchJson(`${councilBase}/api/moa/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Give one tip for a healthy houseplant', preset: 'tiny' }),
    });
    check('moa run returns aggregator response',
      typeof moaRun.json?.response === 'string' && moaRun.json.response.includes('Stub council response'),
      `preset=${moaRun.json?.preset} refs=${moaRun.json?.references?.length}`);

    // ── Council API (control plane) ────────────────────────────────
    const apiProviders = await fetchJson(`${apiBase}/api/providers`);
    check('api providers list', !!apiProviders.json?.lmstudio, `keys=${Object.keys(apiProviders.json || {}).join(',')}`);

    // Point the api server's lmstudio provider at the stub
    const putProvider = await fetchJson(`${apiBase}/api/providers/lmstudio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: `${stubRoot}/v1`, model: 'stub-model' }),
    });
    check('api set lmstudio endpoint to stub', putProvider.json?.ok === true);

    const setProvider = await fetchJson(`${apiBase}/api/llm/provider`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'lmstudio' }),
    });
    check('POST /api/llm/provider sets active provider',
      setProvider.json?.success === true && setProvider.json?.provider === 'lmstudio');

    const llmTest = await fetchJson(`${apiBase}/api/llm/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    check('POST /api/llm/test succeeds against stub',
      llmTest.json?.success === true && (llmTest.json?.modelCount || 0) > 0,
      `modelCount=${llmTest.json?.modelCount} latencyMs=${llmTest.json?.latencyMs}`);

    const ask = await fetchJson(`${apiBase}/api/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'Should we water the garden on Saturday morning?', mode: 'deliberation' }),
    });
    const askResponses = ask.json?.responses || {};
    const askValues = Object.values(askResponses);
    check('/api/ask returns responses',
      askValues.length >= 3 && askValues.every((v) => typeof v === 'string' && v.includes('Stub council response')),
      `responders=${Object.keys(askResponses).join(',')}`);

    const mcp = await fetchJson(`${apiBase}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    });
    const toolCount = mcp.json?.result?.tools?.length || 0;
    check('MCP tools/list count > 0', toolCount > 0, `tools=${toolCount}`);

    // ── CLI smoke (COUNCIL_API env points the CLI at the api server) ──
    const cliEnv = { ...process.env, COUNCIL_API: apiBase };
    const runCli = (cliArgs) => new Promise((resolve) => {
      execFile(process.execPath, ['council-cli.js', ...cliArgs], { cwd: ROOT, env: cliEnv, timeout: 15000 },
        (err, stdout) => resolve({ code: err ? (err.code ?? 1) : 0, stdout: stdout || '' }));
    });
    const cliHealth = await runCli(['health']);
    check('CLI health', cliHealth.code === 0 && cliHealth.stdout.includes('healthy'),
      cliHealth.stdout.trim().split('\n')[0] || `exit=${cliHealth.code}`);
    const cliCouncilors = await runCli(['councilors']);
    check('CLI councilors', cliCouncilors.code === 0 && /Councilors/.test(cliCouncilors.stdout),
      cliCouncilors.stdout.trim().split('\n')[0] || `exit=${cliCouncilors.code}`);
  } finally {
    cleanup(settingsBackup);
  }

  console.log(`\n${total - failures}/${total} checks passed${failures ? ` — ${failures} FAILED` : ''}`);
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error('harness error:', err);
  process.exit(1);
});
