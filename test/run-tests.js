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
const os = require('os');
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

const MEMORY_TEST_FILE = path.join(os.tmpdir(), `council-memory-test-${process.pid}.json`);

function cleanup(settingsBackup) {
  for (const child of children) {
    try { child.kill('SIGTERM'); } catch { /* already dead */ }
  }
  try { if (fs.existsSync(MEMORY_TEST_FILE)) fs.unlinkSync(MEMORY_TEST_FILE); } catch { /* best effort */ }
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
  start('api', ['council-api-server.cjs'], { PORT: String(apiPort), LMSTUDIO_URL: `${stubRoot}/v1`, DECISION_URL: `${stubRoot}/v1`, COUNCIL_MEMORY_FILE: MEMORY_TEST_FILE });

  try {
    // ── Boot / health ──────────────────────────────────────────────
    check('stub LLM health', await waitForHealth(`${stubRoot}/health`, 10000));
    check('council-server health', await waitForHealth(`${councilBase}/api/health`), 'GET /api/health on :3003');
    check('council-api health', await waitForHealth(`${apiBase}/api/health`), `GET /api/health on :${apiPort}`);

    // ── Council engine ─────────────────────────────────────────────
    const councilors = await fetchJson(`${councilBase}/api/councilors`);
    check('councilors count > 0', (councilors.json?.count || 0) > 0, `count=${councilors.json?.count}`);

    // ── Roster parity: both servers must serve the canonical councilors.json ──
    // council-api returns a bare array; council-server returns {councilors, count}.
    // (Runs before any test adds custom bots to the api server's settings.)
    const apiCouncilors = await fetchJson(`${apiBase}/api/councilors`);
    const canonicalIds = JSON.parse(fs.readFileSync(path.join(ROOT, 'councilors.json'), 'utf8'))
      .map((c) => c.id).sort();
    const engineIds = (councilors.json?.councilors || []).map((c) => c.id).sort();
    const apiIds = (Array.isArray(apiCouncilors.json) ? apiCouncilors.json : []).map((c) => c.id).sort();
    check('roster parity: engine serves canonical councilors.json ids',
      JSON.stringify(engineIds) === JSON.stringify(canonicalIds),
      `engine=${engineIds.length} canonical=${canonicalIds.length}`);
    check('roster parity: api serves canonical councilors.json ids',
      JSON.stringify(apiIds) === JSON.stringify(canonicalIds),
      `api=${apiIds.length} canonical=${canonicalIds.length}`);
    check('roster parity: engine and api id sets identical',
      JSON.stringify(engineIds) === JSON.stringify(apiIds),
      `engine=${engineIds.length} api=${apiIds.length}`);

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

    // Hard-fail (v2.2.2): with the provider pointed at a dead endpoint,
    // /api/ask must return 502 with an error — never canned responses.
    await fetchJson(`${apiBase}/api/providers/lmstudio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: 'http://127.0.0.1:1/v1', model: 'stub-model' }),
    });
    const deadAsk = await fetchJson(`${apiBase}/api/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'Unique dead-provider probe question 2.2.2?', mode: 'deliberation' }),
    });
    check('/api/ask hard-fails when the provider is down',
      deadAsk.status === 502 && typeof deadAsk.json?.error === 'string' && !deadAsk.json?.responses,
      `status=${deadAsk.status} error=${(deadAsk.json?.error || '').slice(0, 60)}`);
    await fetchJson(`${apiBase}/api/providers/lmstudio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: `${stubRoot}/v1`, model: 'stub-model' }),
    });

    // ── Decision service (D1 / SystemOne protocol, stub-backed) ────
    const decideOptions = [
      { label: 'Cheap simple route', description: 'Handle with the cheap simple route' },
      { label: 'Escalate to expensive expert route', description: 'Escalate to the expensive expert route' },
    ];
    const decide = await fetchJson(`${apiBase}/api/decide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'How should this support ticket be handled?',
        context: 'A support ticket says: my password reset email never arrived. It is not urgent and needs a simple standard fix.',
        options: decideOptions,
        criteria: 'Prefer the cheap simple route when the fix is simple and standard.',
      }),
    });
    const decideScoresSum = (decide.json?.scores || []).reduce((a, s) => a + s.probability, 0);
    check('/api/decide happy path returns a D1 verdict',
      decide.status === 200 && decide.json?.backend === 'd1'
        && decide.json?.chosen?.id === 'A' && decide.json?.chosen?.label === 'Cheap simple route'
        && decide.json?.scores?.length === decideOptions.length
        && Math.abs(decideScoresSum + (decide.json?.deferProbability || 0) - 1) < 0.02
        && typeof decide.json?.confidence === 'number'
        && decide.json?.band === 'act'
        && typeof decide.json?.readiness === 'number',
      `status=${decide.status} chosen=${decide.json?.chosen?.id} confidence=${decide.json?.confidence} readiness=${decide.json?.readiness} band=${decide.json?.band}`);

    const decideCouncil = await fetchJson(`${apiBase}/api/decide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'Unique council decide probe: should we adopt the phased rollout plan?',
        council: true,
        options: [
          { label: 'Adopt the phased rollout' },
          { label: 'Ship everything at once' },
        ],
      }),
    });
    const deliberationKeys = Object.keys(decideCouncil.json?.deliberation?.responses || {});
    check('/api/decide with council:true includes deliberation trace and verdict',
      decideCouncil.status === 200
        && ['speaker', 'technocrat', 'ethicist', 'pragmatist', 'skeptic'].every((k) => deliberationKeys.includes(k))
        && !!decideCouncil.json?.chosen && Array.isArray(decideCouncil.json?.scores),
      `status=${decideCouncil.status} responders=${deliberationKeys.join(',')} chosen=${decideCouncil.json?.chosen?.id}`);

    // Decision provider down → 502 with error, never a fabricated verdict.
    await fetchJson(`${apiBase}/api/providers/decision`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: 'http://127.0.0.1:1/v1', model: 'd1-2b' }),
    });
    const deadDecide = await fetchJson(`${apiBase}/api/decide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'How should this ticket be handled?', options: decideOptions }),
    });
    check('/api/decide hard-fails when the decision provider is down',
      deadDecide.status === 502 && typeof deadDecide.json?.error === 'string' && !deadDecide.json?.chosen,
      `status=${deadDecide.status} error=${(deadDecide.json?.error || '').slice(0, 60)}`);
    await fetchJson(`${apiBase}/api/providers/decision`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: `${stubRoot}/v1`, model: 'd1-2b' }),
    });

    const mcp = await fetchJson(`${apiBase}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    });
    const toolCount = mcp.json?.result?.tools?.length || 0;
    check('MCP tools/list count > 0', toolCount > 0, `tools=${toolCount}`);

    const toolNames = (mcp.json?.result?.tools || []).map((t) => t.name);
    check('MCP tools/list is 56 and includes council_decide',
      toolCount === 56 && toolNames.includes('council_decide'),
      `tools=${toolCount} council_decide=${toolNames.includes('council_decide')}`);

    const mcpDecide = await fetchJson(`${apiBase}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'council_decide',
          arguments: { question: 'How should this support ticket be handled?', options: decideOptions },
        },
      }),
    });
    let mcpVerdict = null;
    try { mcpVerdict = JSON.parse(mcpDecide.json?.result?.content?.[0]?.text || 'null'); } catch { /* leave null */ }
    check('MCP council_decide returns a verdict',
      !!mcpVerdict?.chosen && Array.isArray(mcpVerdict?.scores) && mcpVerdict.scores.length === decideOptions.length,
      `chosen=${mcpVerdict?.chosen?.id} scores=${mcpVerdict?.scores?.length} band=${mcpVerdict?.band}`);

    // ── Council memory store (server-side, file-backed) ───────────
    const memValue = { topic: 'test precedent', tags: ['alpha', 'beta'], nested: { n: 42 } };
    const memPut = await fetchJson(`${apiBase}/api/memory/test-key`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: memValue }),
    });
    check('memory PUT saves an entry',
      memPut.status === 200 && memPut.json?.key === 'test-key' && typeof memPut.json?.updatedAt === 'string',
      `status=${memPut.status} updatedAt=${memPut.json?.updatedAt}`);

    const memGet = await fetchJson(`${apiBase}/api/memory/test-key`);
    check('memory GET round-trips the PUT value',
      memGet.status === 200 && JSON.stringify(memGet.json?.value) === JSON.stringify(memValue),
      `status=${memGet.status} value=${JSON.stringify(memGet.json?.value)}`);

    const memList = await fetchJson(`${apiBase}/api/memory`);
    check('memory list contains the key',
      memList.status === 200 && !!memList.json?.entries?.['test-key']
        && JSON.stringify(memList.json.entries['test-key'].value) === JSON.stringify(memValue),
      `keys=${Object.keys(memList.json?.entries || {}).join(',')}`);

    check('memory file exists on disk after PUT', fs.existsSync(MEMORY_TEST_FILE), MEMORY_TEST_FILE);

    const memDel = await fetchJson(`${apiBase}/api/memory/test-key`, { method: 'DELETE' });
    const memGetAfterDel = await fetchJson(`${apiBase}/api/memory/test-key`);
    check('memory DELETE then GET is 404',
      memDel.status === 200 && memDel.json?.ok === true && memGetAfterDel.status === 404 && typeof memGetAfterDel.json?.error === 'string',
      `delete=${memDel.status} getAfter=${memGetAfterDel.status}`);

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
