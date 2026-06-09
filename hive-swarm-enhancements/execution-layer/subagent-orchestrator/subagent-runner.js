#!/usr/bin/env node
/**
 * SubagentRunner v1.0.0 — Hive Swarm Enhancement
 *
 * Wraps a single task execution: builds the prompt, calls the LLM, handles
 * any tool calls, and captures a trace. Ported from the per-task logic in
 * agnt's TaskOrchestrator.executeTaskViaAgentChat
 * (backend/src/services/goal/TaskOrchestrator.js:305-389) and
 * processTaskResult (:390-432).
 *
 * We don't bind to AGNT's LlmExecutionService or its axios-based
 * LlmService — instead we use the worker-dispatcher when an agent is
 * reachable over the mesh, or fall back to a local HTTP shim that any
 * OpenAI-compatible endpoint (Ollama, vLLM, LM Studio, etc.) can satisfy.
 * Either way the run() contract is identical: { output, meta }.
 *
 * Every run writes a trace JSON to storage/traces/<traceId>.json for the
 * evolution layer to chew on later.
 *
 * Usage:
 *   const { SubagentRunner, run } = require('./subagent-runner');
 *   const r = new SubagentRunner({ dispatcher, llmEndpoint, model, provider });
 *   const { output, meta } = await r.run(task, agent);
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { EventEmitter } = require('events');

const VERSION = '1.0.0';

const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;          // 10 min per-task
const DEFAULT_TRACE_DIR  = path.resolve(
    __dirname, '..', '..', 'storage', 'traces'
);

const TOOL_CALL_DEADLINE_MS = 30 * 1000;            // 30s per tool invocation

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function safeStr(v, max = 4000) {
    if (v == null) return '';
    let s;
    if (typeof v === 'string') s = v;
    else {
        try { s = JSON.stringify(v); }
        catch (_) { s = String(v); }
    }
    if (s.length > max) return s.slice(0, max) + `… [+${s.length - max} chars]`;
    return s;
}

function buildPrompt(task, agent) {
    const systemPrompt = (agent && agent.systemPrompt) ||
        `You are ${agent && agent.name ? agent.name : 'an AI sub-agent'}` +
        `${agent && agent.role ? ` acting as a ${agent.role}` : ''}.` +
        ' Complete the assigned task precisely and report results.';

    const tools = Array.isArray(agent && agent.tools) ? agent.tools : [];
    const toolLine = tools.length
        ? `\n\nYou have access to these tools: ${tools.join(', ')}.\n` +
          'If you need a tool, respond with JSON: {"tool": "<name>", "args": {...}}'
        : '';

    const userPrompt = `TASK\n${safeStr(task && task.title, 200)}\n\n` +
        `DESCRIPTION\n${safeStr(task && task.description, 4000)}\n\n` +
        (task && task.context
            ? `CONTEXT\n${safeStr(task.context, 4000)}\n\n`
            : '') +
        `DELIVERABLES\n- Concrete results the orchestrator can pass to the next stage\n` +
        `- Brief, structured output (lists/JSON when possible)\n` +
        `- Note any blockers or follow-up work\n`;

    return { systemPrompt, userPrompt: userPrompt + toolLine };
}

function estimateTokens(text) {
    if (!text) return 0;
    // Rough heuristic: ~4 chars per token. Good enough for budgeting.
    return Math.ceil(String(text).length / 4);
}

// ────────────────────────────────────────────────────────────────────────────
// SubagentRunner
// ────────────────────────────────────────────────────────────────────────────

class SubagentRunner extends EventEmitter {
    /**
     * @param {object} [opts]
     * @param {object} [opts.dispatcher]    WorkerDispatcher instance (optional)
     * @param {string} [opts.llmEndpoint]   OpenAI-compatible /chat/completions URL
     * @param {string} [opts.provider]      'openai' | 'anthropic' | 'ollama' | 'custom'
     * @param {string} [opts.model]         Model name
     * @param {string} [opts.apiKey]        API key (env fallback honoured)
     * @param {number} [opts.timeoutMs]     Per-task timeout (default 10 min)
     * @param {string} [opts.traceDir]      Where to write traces
     * @param {boolean} [opts.persist]      Persist traces to disk
     * @param {Function} [opts.llmCaller]   Custom (messages, opts) => Promise<{content, toolCalls, usage}>
     */
    constructor(opts = {}) {
        super();

        this.dispatcher  = opts.dispatcher || null;
        this.llmEndpoint = opts.llmEndpoint || process.env.LLM_ENDPOINT || null;
        this.provider    = (opts.provider    || process.env.LLM_PROVIDER  || 'openai').toLowerCase();
        this.model       = opts.model       || process.env.LLM_MODEL     || 'gpt-4o-mini';
        this.apiKey      = opts.apiKey      || process.env.LLM_API_KEY   || process.env.OPENAI_API_KEY || '';
        this.timeoutMs   = opts.timeoutMs   || DEFAULT_TIMEOUT_MS;
        this.traceDir    = opts.traceDir    || DEFAULT_TRACE_DIR;
        this.persist     = opts.persist !== false;
        this.llmCaller   = opts.llmCaller   || null; // test seam

        if (this.persist) {
            try { fs.mkdirSync(this.traceDir, { recursive: true }); }
            catch (err) {
                console.error(`[SubagentRunner] ⚠️  cannot create ${this.traceDir}: ${err.message}`);
                this.persist = false;
            }
        }
    }

    // ─── Public ─────────────────────────────────────────────────────────────

    /**
     * Execute a single task as a sub-agent.
     * @param {object} task  — { id, title, description, requiredTools, context, requiredRole }
     * @param {object} agent — { id, name, role, capabilities, tools, systemPrompt, model }
     * @returns {Promise<{ output: any, meta: object }>}
     */
    async run(task, agent) {
        const startedAt = Date.now();
        const traceId = `trace-${startedAt}-${crypto.randomBytes(4).toString('hex')}`;

        const meta = {
            traceId,
            taskId:   task && task.id,
            agentId:  agent && agent.id,
            provider: this.provider,
            model:    agent && agent.model ? agent.model : this.model,
            startedAt: new Date(startedAt).toISOString(),
            endedAt:   null,
            durationMs: 0,
            tokens: { prompt: 0, completion: 0, total: 0 },
            toolCalls: [],
            error: null,
            status: 'running',
        };

        this.emit('run_started', { traceId, taskId: meta.taskId, agentId: meta.agentId });

        try {
            const { systemPrompt, userPrompt } = buildPrompt(task, agent);
            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user',   content: userPrompt   },
            ];
            meta.tokens.prompt = estimateTokens(systemPrompt + userPrompt);

            // Prefer mesh dispatch if we have a dispatcher; otherwise LLM call.
            let response;
            if (this.dispatcher && this._canUseDispatcher(agent)) {
                response = await this._runViaDispatcher(task, agent, messages, meta);
            } else {
                response = await this._runViaLlm(messages, meta);
            }

            // Optional tool-calling loop (single round for now — keeps complexity low)
            const tools = Array.isArray(agent && agent.tools) ? agent.tools : [];
            if (tools.length && response && Array.isArray(response.toolCalls) && response.toolCalls.length) {
                const toolResult = await this._executeToolCalls(
                    response.toolCalls, agent, task, meta
                );
                response = Object.assign({}, response, {
                    content: toolResult.content || response.content,
                    toolResults: toolResult.toolResults,
                });
            }

            meta.tokens.completion = estimateTokens(response.content);
            meta.tokens.total      = meta.tokens.prompt + meta.tokens.completion;
            meta.status = 'completed';

            const output = this._shapeOutput(response, agent, task);

            this._finalizeMeta(meta, startedAt, null);
            this._writeTrace(traceId, { task, agent, messages, response, meta, output });

            this.emit('run_completed', { traceId, taskId: meta.taskId, agentId: meta.agentId, meta });
            return { output, meta };
        } catch (err) {
            this._finalizeMeta(meta, startedAt, err);
            this._writeTrace(traceId, { task, agent, error: err.message, meta });

            this.emit('run_failed', { traceId, taskId: meta.taskId, agentId: meta.agentId, error: err.message, meta });
            const wrapped = new Error(`SubagentRunner[${agent && agent.id}]: ${err.message}`);
            wrapped.meta = meta;
            throw wrapped;
        }
    }

    // ─── Internals ──────────────────────────────────────────────────────────

    _canUseDispatcher(agent) {
        return agent && agent.meshAddress; // mesh agents are addressable; others stay local
    }

    async _runViaDispatcher(task, agent, messages, meta) {
        // Wrap the task as a single subtask and let worker-dispatcher handle
        // timeout, retries, and event plumbing. We synthesize a tiny prompt
        // the remote agent can re-interpret if it wants.
        const subtasks = [{
            id:        meta.taskId || `sub-${meta.traceId}`,
            title:     task.title,
            description: messages.map(m => `[${m.role}] ${m.content}`).join('\n\n'),
            room:      agent.room || 'coordination',
        }];
        const agents = [{
            id:           agent.id,
            name:         agent.name,
            role:         agent.role || 'sub-agent',
            room:         agent.room || 'coordination',
            capabilities: agent.capabilities || agent.tools || [],
        }];

        const { promises } = this.dispatcher.dispatch(subtasks, agents, { goal: task.goalId });
        const settled = await Promise.allSettled(promises);
        const first = settled[0];
        if (first.status === 'rejected') throw new Error(first.reason && first.reason.message || 'dispatcher failed');

        const r = first.value || {};
        return {
            content:    typeof r === 'string' ? r : (r.content || r.result || ''),
            toolCalls:  r.toolCalls  || [],
            usage:      r.usage      || null,
            source:     'dispatcher',
        };
    }

    async _runViaLlm(messages, meta) {
        if (typeof this.llmCaller === 'function') {
            return await this.llmCaller(messages, { provider: this.provider, model: meta.model, timeoutMs: this.timeoutMs });
        }
        if (!this.llmEndpoint) {
            throw new Error('No LLM endpoint configured. Pass llmEndpoint / set LLM_ENDPOINT, or provide a dispatcher + mesh-capable agent.');
        }
        return await this._callOpenAiCompatible(messages, meta);
    }

    async _callOpenAiCompatible(messages, meta) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
            const body = {
                model: meta.model,
                messages,
                temperature: 0.2,
            };
            const res = await fetch(this.llmEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type':  'application/json',
                    'Authorization': this.apiKey ? `Bearer ${this.apiKey}` : '',
                },
                body: JSON.stringify(body),
                signal: controller.signal,
            });
            if (!res.ok) {
                const text = await res.text().catch(() => '');
                throw new Error(`LLM ${res.status}: ${text.slice(0, 500)}`);
            }
            const data = await res.json();
            const choice = data.choices && data.choices[0];
            const content = choice && choice.message && choice.message.content || '';
            return {
                content,
                toolCalls: [],
                usage: data.usage || null,
                source: 'http',
            };
        } finally {
            clearTimeout(timer);
        }
    }

    async _executeToolCalls(toolCalls, agent, task, meta) {
        // Stub tool execution — real tool dispatch is owned by the
        // agent's own runtime. We record what was asked and return a
        // structured echo so the trace is still useful for the evolution
        // layer to analyse.
        const toolResults = [];
        let extra = '';
        for (const call of toolCalls.slice(0, 10)) {
            const entry = {
                name:   (call && (call.name || call.tool)) || 'unknown',
                args:   (call && (call.args || call.arguments)) || {},
                result: null,
                error:  null,
                ts:     Date.now(),
            };
            try {
                // SubagentRunner does not own tool execution — that lives in
                // the agent runtime reachable over the mesh. Emit a hint.
                entry.result = '(tool execution delegated to agent runtime)';
            } catch (err) {
                entry.error = err.message;
            }
            toolResults.push(entry);
            meta.toolCalls.push({ name: entry.name, args: entry.args });
        }
        return { content: extra, toolResults };
    }

    _shapeOutput(response, agent, task) {
        // Try to coerce string → structured JSON when the model returns a
        // JSON document. Otherwise return as-is so downstream stages can
        // choose how to handle it.
        if (typeof response.content === 'string') {
            const trimmed = response.content.trim();
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                try { return JSON.parse(trimmed); }
                catch (_) { /* fall through to string return */ }
            }
        }
        return {
            agent:    agent && agent.id,
            taskId:   task  && task.id,
            content:  response.content,
            tools:    (response.toolResults || []).map(t => ({ name: t.name, args: t.args })),
            source:   response.source || 'local',
        };
    }

    _finalizeMeta(meta, startedAt, err) {
        meta.endedAt    = new Date().toISOString();
        meta.durationMs = Date.now() - startedAt;
        if (err) {
            meta.status = 'failed';
            meta.error  = err.message || String(err);
        }
    }

    _writeTrace(traceId, payload) {
        if (!this.persist) return;
        try {
            const file = path.join(this.traceDir, `${traceId}.json`);
            fs.writeFileSync(file, JSON.stringify(payload, null, 2), 'utf8');
        } catch (err) {
            console.error(`[SubagentRunner] ⚠️  trace write failed: ${err.message}`);
        }
    }
}

// ────────────────────────────────────────────────────────────────────────────
// Functional shortcut
// ────────────────────────────────────────────────────────────────────────────

async function run(task, agent, opts) {
    return await new SubagentRunner(opts || {}).run(task, agent);
}

// ────────────────────────────────────────────────────────────────────────────
// Exports
// ────────────────────────────────────────────────────────────────────────────

module.exports = {
    SubagentRunner,
    run,
    __version: VERSION,
};
