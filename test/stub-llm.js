#!/usr/bin/env node
/**
 * Stub OpenAI-compatible LLM for tests — NEVER a real/paid API.
 *
 * Serves:
 *   GET  /v1/models            (and /models)
 *   POST /v1/chat/completions  (and /chat/completions) — canned assistant reply
 *   POST /v1/systemone         (and /systemone) — canned D1 decision answers,
 *                                shaped like the real LM Studio D1 readout
 *                                (pinned live 2026-11-26: choice answers carry
 *                                type/choice/probabilities/confidence; noul
 *                                answers carry only {type:'noul', noul:P(yes)})
 *   GET  /health
 *
 * Run standalone:  STUB_LLM_PORT=4899 node test/stub-llm.js
 * Or require() it and call createStubLlm().listen(port).
 */
const http = require('http');

const STUB_MODELS = [
  'stub-model',
  'qwen/qwen3.5-9b',
  'qwen3.6-35b-a3b',
  'qwen3.5-27b',
  'qwen3.5-9b',
  'qwen3.5-0.8b',
  'qwythos-9b-claude-mythos-5-1m',
  'd1-2b',
  'd1-omni-2b',
];

const CANNED_REPLY =
  'Stub council response: proceed with the proposal, weigh the main risks first, ' +
  'assign an owner to each action item, and review the outcome at the next session.';

function createStubLlm() {
  return http.createServer((req, res) => {
    const sendJson = (code, obj) => {
      res.writeHead(code, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(obj));
    };

    if (req.method === 'GET' && (req.url === '/health' || req.url === '/')) {
      return sendJson(200, { status: 'ok', service: 'stub-llm' });
    }

    if (req.method === 'GET' && (req.url === '/v1/models' || req.url === '/models')) {
      return sendJson(200, {
        object: 'list',
        data: STUB_MODELS.map((id) => ({ id, object: 'model', created: 0, owned_by: 'stub' })),
      });
    }

    if (req.method === 'POST' && (req.url === '/v1/chat/completions' || req.url === '/chat/completions')) {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        let model = 'stub-model';
        try { model = JSON.parse(body || '{}').model || model; } catch { /* keep default */ }
        sendJson(200, {
          id: 'chatcmpl-stub-1',
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model,
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: CANNED_REPLY },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
        });
      });
      return;
    }

    if (req.method === 'POST' && (req.url === '/v1/systemone' || req.url === '/systemone')) {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        let parsed = {};
        try { parsed = JSON.parse(body || '{}'); } catch { /* fall through with no questions */ }
        const answers = {};
        for (const [name, q] of Object.entries(parsed.questions || {})) {
          if (q && q.type === 'choice') {
            const keys = Object.keys(q.criteria || {});
            const nonDefer = keys.filter((k) => k !== '__defer__');
            const first = nonDefer[0] || keys[0];
            const others = keys.filter((k) => k !== first);
            const probabilities = {};
            probabilities[first] = others.length ? 0.9 : 1;
            for (const k of others) probabilities[k] = 0.1 / others.length;
            answers[name] = {
              type: 'choice',
              choice: first,
              probabilities,
              confidence: probabilities[first],
            };
          } else if (q && q.type === 'noul') {
            // Real D1 noul shape: {type:'noul', noul:<P(yes)>} and nothing else.
            answers[name] = { type: 'noul', noul: 0.88 };
          } else if (q && q.type === 'score') {
            answers[name] = { type: 'score', score: 0.5 };
          }
        }
        sendJson(200, {
          model: parsed.model || 'd1-2b',
          answers,
          usage: { input_tokens: 10, output_tokens: 0 },
        });
      });
      return;
    }

    sendJson(404, { error: { message: `stub-llm: no route for ${req.method} ${req.url}` } });
  });
}

if (require.main === module) {
  const port = parseInt(process.env.STUB_LLM_PORT || process.env.PORT || '4899', 10);
  createStubLlm().listen(port, '127.0.0.1', () => {
    console.log(`stub-llm listening on http://127.0.0.1:${port}/v1`);
  });
}

module.exports = { createStubLlm, CANNED_REPLY, STUB_MODELS };
