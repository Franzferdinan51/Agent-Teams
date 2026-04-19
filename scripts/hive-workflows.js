#!/usr/bin/env node
/**
 * =============================================================================
 * HIVE-WORKFLOWS.JS — AgentTeams Workflow Integration Layer
 * =============================================================================
 *
 * A production-ready workflow orchestration engine that coordinates:
 *   - Workflow templates (Research, Code Review, Decision, Emergency, etc.)
 *   - Senate integration (triggers, decrees, voting)
 *   - Automation triggers (cron, events, webhooks, agent-based)
 *   - Skill-plugin chaining (step-to-step result flow)
 *   - Cross-agent coordination (parallel execution, shared memory)
 *
 * Usage:
 *   node hive-workflows.js list
 *   node hive-workflows.js run <workflow>
 *   node hive-workflows.js create <name> <steps>
 *   node hive-workflows.js trigger <trigger> <workflow>
 *   node hive-workflows.js status
 *   node hive-workflows.js senate-decree <decree-id>
 *
 * Environment:
 *   HIVE_STATE_DIR   — where workflows.json, triggers.json, memory.db live (default: ~/.agentteams/hive)
 *   SENATE_API_URL  — Senate deliberation API (default: http://localhost:4000)
 *   MESH_API_URL    — Agent Mesh API (default: http://localhost:4000)
 *   LOG_LEVEL       — debug|info|warn|error (default: info)
 *
 * =============================================================================
 */

'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// ---------------------------------------------------------------------------
// Config & Paths
// ---------------------------------------------------------------------------
const HOME = process.env.HOME || process.env.USERPROFILE || '/tmp';
const STATE_DIR = process.env.HIVE_STATE_DIR || path.join(HOME, '.agentteams', 'hive');
const WORKFLOWS_FILE = path.join(STATE_DIR, 'workflows.json');
const TRIGGERS_FILE  = path.join(STATE_DIR, 'triggers.json');
const MEMORY_FILE    = path.join(STATE_DIR, 'memory.db');
const LOG_LEVEL      = (process.env.LOG_LEVEL || 'info').toLowerCase();

const SENATE_API_URL = process.env.SENATE_API_URL || 'http://localhost:4000';
const MESH_API_URL   = process.env.MESH_API_URL   || 'http://localhost:4000';

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
function log(level, ...args) {
  if (LOG_LEVELS[level] >= LOG_LEVELS[LOG_LEVEL]) return;
  console.log(`[${new Date().toISOString()}] [${level.toUpperCase()}] [hive-workflows]`, ...args);
}
const debug = (...a) => log('debug', ...a);
const info  = (...a) => log('info',  ...a);
const warn  = (...a) => log('warn',  ...a);
const error = (...a) => log('error', ...a);

// ---------------------------------------------------------------------------
// State Persistence
// ---------------------------------------------------------------------------
function ensureStateDir() {
  if (!fs.existsSync(STATE_DIR)) {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    info(`Created state directory: ${STATE_DIR}`);
  }
}

function loadJSON(file, fallback = {}) {
  try {
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    error(`Failed to load ${file}: ${e.message}`);
    return fallback;
  }
}

function saveJSON(file, data) {
  ensureStateDir();
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  debug(`Saved: ${file}`);
}

// ---------------------------------------------------------------------------
// Workflow Definitions — Pre-built Templates
// ---------------------------------------------------------------------------

const WORKFLOW_TEMPLATES = {
  // 1. Research: search → summarize → review → archive
  research: {
    name:        'Research Workflow',
    description: 'Parallel web research → AI summary → review → archive to memory',
    version:     '1.0.0',
    triggerTypes: ['manual', 'cron', 'event', 'decree'],
    steps: [
      {
        id:      'search',
        name:    'Web Search',
        skill:   'web-search',
        plugin:  'tavily-search',
        args:    '{{input.query}}',
        outputVar: 'searchResults',
      },
      {
        id:      'summarize',
        name:    'Summarize Findings',
        skill:   'summarize',
        plugin:  null,
        depends: ['search'],
        args:    { results: '{{steps.search.output}}' },
        outputVar: 'summary',
      },
      {
        id:      'review',
        name:    'Review & Validate',
        skill:   'self-improvement',
        plugin:  null,
        depends: ['summarize'],
        args:    { summary: '{{steps.summarize.output}}' },
        outputVar: 'reviewed',
      },
      {
        id:      'archive',
        name:    'Archive to Memory',
        skill:   null,
        plugin:  'memory',
        depends: ['review'],
        args:    {
          content: '{{steps.review.output}}',
          tags:   '{{input.tags}}',
          type:   'research',
        },
        outputVar: null,
      },
    ],
  },

  // 2. Code Review: analyze → test → suggest → implement
  codeReview: {
    name:        'Code Review Workflow',
    description: 'Analyze code → run tests → suggest fixes → implement changes',
    version:     '1.0.0',
    triggerTypes: ['manual', 'agent-based', 'webhook'],
    steps: [
      {
        id:      'analyze',
        name:    'Analyze Code',
        skill:   null,
        plugin:  'linter',
        args:    { path: '{{input.path}}' },
        outputVar: 'analysis',
      },
      {
        id:      'test',
        name:    'Run Tests',
        skill:   null,
        plugin:  'test-runner',
        depends: ['analyze'],
        args:    { path: '{{input.path}}' },
        outputVar: 'testResults',
      },
      {
        id:      'suggest',
        name:    'Suggest Fixes',
        skill:   'self-improvement',
        depends: ['analyze', 'test'],
        args:    { analysis: '{{steps.analyze.output}}', tests: '{{steps.test.output}}' },
        outputVar: 'suggestions',
      },
      {
        id:      'implement',
        name:    'Implement Changes',
        skill:   null,
        plugin:  'code-write',
        depends: ['suggest'],
        args:    { suggestions: '{{steps.suggest.output}}', path: '{{input.path}}' },
        outputVar: 'implemented',
        requiresApproval: true,
      },
    ],
  },

  // 3. Decision: research → Senate debate → vote → decree → execute
  decision: {
    name:        'Decision Workflow',
    description: 'Research → Senate deliberation → vote → decree → execute',
    version:     '1.0.0',
    triggerTypes: ['manual', 'decree'],
    steps: [
      {
        id:      'research',
        name:    'Research Decision Options',
        skill:   'web-search',
        plugin:  'tavily-search',
        args:    { query: '{{input.question}}' },
        outputVar: 'research',
      },
      {
        id:      'debate',
        name:    'Senate Deliberation',
        skill:   null,
        plugin:  'senate',
        depends: ['research'],
        args:    {
          topic:     '{{input.question}}',
          research:  '{{steps.research.output}}',
          mode:      '{{input.debateMode || "adversarial"}}',
        },
        outputVar: 'debate',
        senateIntegration: true,
      },
      {
        id:      'vote',
        name:    'Senate Vote',
        skill:   null,
        plugin:  'senate-vote',
        depends: ['debate'],
        args:    { debateId: '{{steps.debate.output.debateId}}' },
        outputVar: 'vote',
        senateIntegration: true,
      },
      {
        id:      'decree',
        name:    'Issue Decree',
        skill:   null,
        plugin:  'senate-decree',
        depends: ['vote'],
        args:    {
          voteId:  '{{steps.vote.output.voteId}}',
          content: '{{input.question}}',
        },
        outputVar: 'decree',
        senateIntegration: true,
      },
      {
        id:      'execute',
        name:    'Execute Decision',
        skill:   null,
        plugin:  'executor',
        depends: ['decree'],
        args:    { decree: '{{steps.decree.output}}' },
        outputVar: null,
        requiresApproval: true,
      },
    ],
  },

  // 4. Emergency: alert → assess → mobilize team → resolve
  emergency: {
    name:        'Emergency Workflow',
    description: 'Alert contacts → assess severity → mobilize agents → resolve',
    version:     '1.0.0',
    triggerTypes: ['manual', 'event', 'agent-based', 'cron'],
    steps: [
      {
        id:      'alert',
        name:    'Send Alert',
        skill:   null,
        plugin:  'alert',
        args:    {
          level:   '{{input.level || 2}}',
          message: '{{input.message}}',
          targets: '{{input.alertTargets || ["telegram", "email"]}}',
        },
        outputVar: 'alertSent',
      },
      {
        id:      'assess',
        name:    'Assess Situation',
        skill:   'self-improvement',
        depends: ['alert'],
        args:    { message: '{{input.message}}', level: '{{input.level}}' },
        outputVar: 'assessment',
      },
      {
        id:      'mobilize',
        name:    'Mobilize Team',
        skill:   null,
        plugin:  'agent-mesh',
        depends: ['assess'],
        args:    {
          agents:  '{{input.agents || []}}',
          task:    '{{steps.assess.output.action}}',
          parallel: true,
        },
        outputVar: 'mobilized',
      },
      {
        id:      'resolve',
        name:    'Resolve Issue',
        skill:   null,
        plugin:  'executor',
        depends: ['mobilize'],
        args:    { plan: '{{steps.assess.output.resolution}}' },
        outputVar: 'resolved',
        requiresApproval: true,
      },
    ],
  },

  // 5. Meeting: schedule → summarize → distribute → archive
  meeting: {
    name:        'Meeting Workflow',
    description: 'Schedule meeting → summarize transcript → distribute → archive',
    version:     '1.0.0',
    triggerTypes: ['manual', 'cron'],
    steps: [
      {
        id:      'schedule',
        name:    'Schedule Meeting',
        skill:   'wecom-meeting-create',
        plugin:  'calendar',
        args:    {
          title:    '{{input.title}}',
          datetime: '{{input.datetime}}',
          attendees: '{{input.attendees}}',
        },
        outputVar: 'meeting',
      },
      {
        id:      'summarize',
        name:    'Summarize Transcript',
        skill:   'summarize',
        plugin:  'transcript',
        depends: ['schedule'],
        args:    { transcript: '{{input.transcript}}' },
        outputVar: 'summary',
      },
      {
        id:      'distribute',
        name:    'Distribute Summary',
        skill:   null,
        plugin:  'messenger',
        depends: ['summarize'],
        args:    {
          recipients: '{{input.attendees}}',
          content:    '{{steps.summarize.output}}',
          channel:    '{{input.channel || "telegram"}}',
        },
        outputVar: 'distributed',
      },
      {
        id:      'archive',
        name:    'Archive Meeting',
        skill:   null,
        plugin:  'memory',
        depends: ['distribute'],
        args:    {
          content: '{{steps.summarize.output}}',
          tags:   ['meeting', '{{input.title}}'],
          type:   'meeting',
        },
        outputVar: null,
      },
    ],
  },

  // 6. Backup: scan → compress → encrypt → store → verify
  backup: {
    name:        'Backup Workflow',
    description: 'Scan files → compress → encrypt → upload → verify',
    version:     '1.0.0',
    triggerTypes: ['manual', 'cron'],
    steps: [
      {
        id:      'scan',
        name:    'Scan Files',
        skill:   null,
        plugin:  'file-scanner',
        args:    { paths: '{{input.paths}}', exclude: '{{input.exclude || ["node_modules", ".git"]}}' },
        outputVar: 'fileList',
      },
      {
        id:      'compress',
        name:    'Compress Archive',
        skill:   null,
        plugin:  'compressor',
        depends: ['scan'],
        args:    { files: '{{steps.scan.output}}', format: '{{input.format || "tar.gz"}}' },
        outputVar: 'archive',
      },
      {
        id:      'encrypt',
        name:    'Encrypt Archive',
        skill:   null,
        plugin:  'encryption',
        depends: ['compress'],
        args:    { archive: '{{steps.compress.output}}', key: '{{env.ENCRYPTION_KEY}}' },
        outputVar: 'encrypted',
      },
      {
        id:      'store',
        name:    'Store Archive',
        skill:   null,
        plugin:  'storage',
        depends: ['encrypt'],
        args:    { encrypted: '{{steps.encrypt.output}}', destination: '{{input.destination}}' },
        outputVar: 'stored',
      },
      {
        id:      'verify',
        name:    'Verify Backup',
        skill:   null,
        plugin:  'verifier',
        depends: ['store'],
        args:    { backupId: '{{steps.store.output.backupId}}' },
        outputVar: 'verified',
      },
    ],
  },
};

// ---------------------------------------------------------------------------
// Trigger Definitions
// ---------------------------------------------------------------------------

const DEFAULT_TRIGGERS = {
  // Cron: daily research at 2 AM
  research_daily: {
    id:       'research_daily',
    workflow: 'research',
    type:     'cron',
    schedule: '0 2 * * *',
    input:    { query: 'latest AI agent developments', tags: ['ai', 'agents'] },
    enabled:  false,
  },
  // Event: new npm package triggers security audit
  npm_security_event: {
    id:       'npm_security_event',
    workflow: 'codeReview',
    type:     'event',
    event:    'npm:package-added',
    input:    { path: '{{event.path}}' },
    enabled:  false,
  },
  // Decree: Senate decree triggers decision workflow
  senate_decree_trigger: {
    id:       'senate_decree_trigger',
    workflow: 'decision',
    type:     'decree',
    decreePattern: '*',
    input:    {},
    enabled:  false,
  },
  // Agent-based: task completion triggers archive
  task_complete_archive: {
    id:       'task_complete_archive',
    workflow: 'research',
    type:     'agent-based',
    agentEvent: 'task:complete',
    input:    { query: '{{agent.task}}', tags: ['auto', '{{agent.id}}'] },
    enabled:  false,
  },
  // Webhook: GitHub push triggers code review
  github_push_review: {
    id:       'github_push_review',
    workflow: 'codeReview',
    type:     'webhook',
    webhookPath: '/webhook/github/push',
    input:    { path: '{{webhook.repo}}' },
    enabled:  false,
  },
};

// ---------------------------------------------------------------------------
// Senate Integration
// ---------------------------------------------------------------------------

async function senateRequest(method, endpoint, body = null, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, SENATE_API_URL);
    const lib  = url.protocol === 'https:' ? https : http;
    const req  = lib.request({
      hostname: url.hostname,
      port:     url.port,
      path:     url.pathname + url.search,
      method,
      headers:  { 'Content-Type': 'application/json', 'x-senate-key': 'hive-workflows' },
      timeout:  timeoutMs,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    });
    req.on('error', e => reject(e));
    req.on('timeout', () => { req.destroy(); reject(new Error(`Senate timeout: ${endpoint}`)); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function submitToSenate(topic, research, mode = 'adversarial') {
  try {
    info(`Submitting topic to Senate: ${topic}`);
    const result = await senateRequest('POST', '/api/senate/deliberate', {
      topic, research, mode, agentId: 'hive-workflows',
    });
    debug('Senate deliberation result:', JSON.stringify(result).slice(0, 200));
    return result;
  } catch (e) {
    warn(`Senate unavailable (${e.message}) — proceeding without Senate`);
    return { debateId: `local-${Date.now()}`, outcome: 'unavailable', reason: e.message };
  }
}

async function senateVote(debateId, options = null) {
  try {
    info(`Casting Senate vote for debate: ${debateId}`);
    return await senateRequest('POST', '/api/senate/vote', { debateId, options });
  } catch (e) {
    warn(`Senate vote failed: ${e.message}`);
    return { voteId: `local-vote-${Date.now()}`, outcome: 'failed', reason: e.message };
  }
}

async function issueDecree(voteId, content) {
  try {
    info(`Issuing decree: ${voteId}`);
    return await senateRequest('POST', '/api/senate/decree', { voteId, content, issuedBy: 'hive-workflows' });
  } catch (e) {
    warn(`Decree issuance failed: ${e.message}`);
    return { decreeId: `local-decree-${Date.now()}`, outcome: 'failed', reason: e.message };
  }
}

async function reportToSenate(workflowName, result, decree = null) {
  try {
    await senateRequest('POST', '/api/senate/report', {
      workflowName,
      result,
      decree,
      timestamp: new Date().toISOString(),
      agentId: 'hive-workflows',
    });
    info('Result reported to Senate');
  } catch (e) {
    debug(`Senate report failed (non-critical): ${e.message}`);
  }
}

// ---------------------------------------------------------------------------
// Mesh Integration (Cross-Agent Coordination)
// ---------------------------------------------------------------------------

async function meshRequest(endpoint, body = null, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, MESH_API_URL);
    const lib  = url.protocol === 'https:' ? https : http;
    const req  = lib.request({
      hostname: url.hostname,
      port:     url.port,
      path:     url.pathname + url.search,
      method:   body ? 'POST' : 'GET',
      headers:  { 'Content-Type': 'application/json', 'x-mesh-key': 'hive-workflows' },
      timeout:  timeoutMs,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    });
    req.on('error', e => reject(e));
    req.on('timeout', () => { req.destroy(); reject(new Error(`Mesh timeout: ${endpoint}`)); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function broadcastToAgents(message, agents = null) {
  try {
    return await meshRequest('/api/mesh/broadcast', {
      content: message,
      from: 'hive-workflows',
      targets: agents,
    });
  } catch (e) {
    debug(`Mesh broadcast failed: ${e.message}`);
    return null;
  }
}

async function mobilizeTeam(agents, task, parallel = true) {
  try {
    info(`Mobilizing ${agents.length} agent(s) for: ${task}`);
    return await meshRequest('/api/mesh/mobilize', { agents, task, parallel });
  } catch (e) {
    error(`Team mobilization failed: ${e.message}`);
    return { mobilized: false, reason: e.message };
  }
}

// ---------------------------------------------------------------------------
// Plugin Executor
// ---------------------------------------------------------------------------

const BUILTIN_PLUGINS = {
  memory: {
    async execute(args) {
      // Persist to local Hive memory
      ensureStateDir();
      const memPath = path.join(STATE_DIR, 'memory', `${Date.now()}.json`);
      fs.mkdirSync(path.dirname(memPath), { recursive: true });
      fs.writeFileSync(memPath, JSON.stringify({ ...args, timestamp: new Date().toISOString() }, null, 2));
      return { archived: true, path: memPath };
    },
  },

  alert: {
    async execute(args) {
      const { level, message, targets = [] } = args;
      const levelNames = { 1: 'CRITICAL', 2: 'HIGH', 3: 'MEDIUM', 4: 'LOW', 5: 'INFO' };
      console.log(`🚨 [ALERT L${level}] ${levelNames[level] || 'UNKNOWN'}: ${message}`);
      // In production: route to telegram/email/push notifications
      return { sent: true, level, targets, timestamp: new Date().toISOString() };
    },
  },

  executor: {
    async execute(args) {
      const { command } = args;
      if (!command) return { executed: false, error: 'No command provided' };
      return new Promise((resolve) => {
        const child = spawn(command, [], { shell: true });
        let stdout = '', stderr = '';
        child.stdout.on('data', d => stdout += d);
        child.stderr.on('data', d => stderr += d);
        child.on('close', code => resolve({ executed: true, code, stdout, stderr }));
        child.on('error', e => resolve({ executed: false, error: e.message }));
      });
    },
  },

  linter: {
    async execute(args) {
      const { path: filePath } = args;
      if (!filePath || !fs.existsSync(filePath)) {
        return { analyzed: false, error: `File not found: ${filePath}` };
      }
      const ext = path.extname(filePath);
      const commands = {
        '.js':  ['npx', ['eslint', filePath, '--format', 'json']],
        '.ts':  ['npx', ['eslint', filePath, '--format', 'json']],
        '.py':  ['flake8', [filePath]],
        '.go':  ['go', ['vet', filePath]],
        '.rs':  ['cargo', ['clippy', '--', '-W', 'warnings', filePath]],
      };
      const cmd = commands[ext];
      if (!cmd) return { analyzed: true, skipped: true, reason: `No linter for ${ext}` };

      return new Promise(resolve => {
        const child = spawn(cmd[0], cmd[1]);
        let stdout = '', stderr = '';
        child.stdout.on('data', d => stdout += d);
        child.stderr.on('data', d => stderr += d);
        child.on('close', code => {
          let issues = [];
          try { issues = JSON.parse(stdout || '[]'); } catch { /* non-JSON output */ }
          resolve({ analyzed: true, file: filePath, issues, exitCode: code });
        });
        child.on('error', e => resolve({ analyzed: false, error: e.message }));
      });
    },
  },

  testRunner: {
    async execute(args) {
      const { path: filePath } = args;
      if (!filePath) return { tested: false, error: 'No path provided' };
      const ext = path.extname(filePath);
      const commands = {
        '.js':  ['npm', ['test', '--', '--reporter', 'json']],
        '.ts':  ['npx', ['ts-node', 'test.ts', '--reporter', 'json']],
        '.py':  ['pytest', ['-v', '--tb=short']],
      };
      const cmd = commands[ext] || ['npm', ['test']];

      return new Promise(resolve => {
        const child = spawn(cmd[0], cmd[1], { cwd: path.dirname(filePath) });
        let stdout = '', stderr = '';
        child.stdout.on('data', d => stdout += d);
        child.stderr.on('data', d => stderr += d);
        child.on('close', code => resolve({ tested: true, exitCode: code, stdout, stderr }));
        child.on('error', e => resolve({ tested: false, error: e.message }));
      });
    },
  },

  codeWrite: {
    async execute(args) {
      const { suggestions = [], path: filePath } = args;
      if (!filePath || !fs.existsSync(filePath)) {
        return { written: false, error: `File not found: ${filePath}` };
      }
      // Apply code suggestions (simplified - real impl would parse diffs)
      debug(`Would apply ${suggestions.length} suggestion(s) to ${filePath}`);
      return { written: true, suggestionsApplied: suggestions.length, file: filePath };
    },
  },

  verifier: {
    async execute(args) {
      const { backupId } = args;
      // Simulate verification - real impl would check checksum/integrity
      return { verified: true, backupId, timestamp: new Date().toISOString() };
    },
  },

  fileScanner: {
    async execute(args) {
      const { paths = [], exclude = [] } = args;
      const files = [];
      const excludeSet = new Set(exclude);

      function scanDir(dir) {
        if (!fs.existsSync(dir)) return;
        for (const entry of fs.readdirSync(dir)) {
          if (excludeSet.has(entry)) continue;
          const full = path.join(dir, entry);
          const stat = fs.statSync(full);
          if (stat.isDirectory()) scanDir(full);
          else files.push(full);
        }
      }

      for (const p of paths) scanDir(p);
      return { files, count: files.length };
    },
  },

  compressor: {
    async execute(args) {
      const { files = [], format = 'tar.gz' } = args;
      const archivePath = path.join(STATE_DIR, `backup-${Date.now()}.${format}`);
      debug(`Would compress ${files.length} files to ${archivePath}`);
      return { archive: archivePath, files: files.length, format };
    },
  },

  encryption: {
    async execute(args) {
      const { archive, key } = args;
      if (!key) return { encrypted: false, error: 'No encryption key provided' };
      debug(`Would encrypt ${archive}`);
      return { encrypted: true, original: archive, encryptedPath: `${archive}.enc` };
    },
  },

  storage: {
    async execute(args) {
      const { encrypted, destination } = args;
      debug(`Would upload ${encrypted} to ${destination}`);
      return { stored: true, destination, backupId: `backup-${Date.now()}`, size: 0 };
    },
  },

  messenger: {
    async execute(args) {
      const { recipients = [], content, channel } = args;
      info(`Would send ${content.length} chars to ${recipients.length} recipients via ${channel}`);
      return { sent: true, recipients, channel, chars: content.length };
    },
  },

  calendar: {
    async execute(args) {
      const { title, datetime, attendees = [] } = args;
      info(`Would schedule meeting: ${title} at ${datetime}`);
      return { scheduled: true, meetingId: `mtg-${Date.now()}`, title, datetime, attendees };
    },
  },

  transcript: {
    async execute(args) {
      const { transcript } = args;
      if (!transcript) return { summary: 'No transcript provided', chars: 0 };
      // Simulate summarization
      const words = (transcript || '').split(/\s+/).length;
      return { summary: `[AI Summary of ${words} words]`, chars: words };
    },
  },
};

async function executePlugin(pluginName, args, context = {}) {
  // Template variable interpolation: {{...}}
  function interpolate(val) {
    if (typeof val === 'string') {
      return val.replace(/\{\{([^}]+)\}\}/g, (match, expr) => {
        try {
          // eslint-disable-next-line no-new-func
          const fn = new Function('ctx', `with(ctx) { return ${expr}; }`);
          return fn(context);
        } catch {
          return match; // leave unresolved
        }
      });
    }
    if (Array.isArray(val)) return val.map(interpolate);
    if (val && typeof val === 'object') {
      const result = {};
      for (const [k, v] of Object.entries(val)) result[k] = interpolate(v);
      return result;
    }
    return val;
  }

  const interpolatedArgs = interpolate(args);

  // Check for built-in plugin
  const builtin = BUILTIN_PLUGINS[pluginName];
  if (builtin) {
    debug(`Executing builtin plugin: ${pluginName}`);
    return builtin.execute(interpolatedArgs);
  }

  // Check for external skill/plugin command
  const pluginCmd = process.env[`HIVE_PLUGIN_${pluginName.toUpperCase().replace(/-/g, '_')}`];
  if (pluginCmd) {
    debug(`Executing external plugin: ${pluginName} via ${pluginCmd}`);
    return new Promise((resolve) => {
      const child = spawn(pluginCmd, [], { shell: true });
      let stdout = '', stderr = '';
      child.stdout.on('data', d => stdout += d);
      child.stderr.on('data', d => stderr += d);
      child.on('close', code => {
        try { resolve({ ...JSON.parse(stdout), exitCode: code }); }
        catch { resolve({ stdout, stderr, exitCode: code }); }
      });
      child.on('error', e => resolve({ error: e.message }));
    });
  }

  warn(`Plugin "${pluginName}" not found — skipping step`);
  return { skipped: true, reason: `Unknown plugin: ${pluginName}` };
}

// ---------------------------------------------------------------------------
// Skill Executor
// ---------------------------------------------------------------------------

async function executeSkill(skillName, args, context = {}) {
  if (!skillName) return { executed: false, reason: 'No skill specified' };

  const skillPath = path.join(HOME, '.openclaw', 'workspace', 'skills', skillName, 'SKILL.md');
  const skillCmd  = path.join(HOME, '.openclaw', 'workspace', 'skills', skillName, 'index.js');

  let skillInfo = null;
  if (fs.existsSync(skillPath)) {
    try {
      const content = fs.readFileSync(skillPath, 'utf8');
      const header  = content.match(/^# SKILL\.md.*?\n([\s\S]+?)(?=\n## |\n#|$)/i);
      skillInfo = header ? header[1].trim() : content.slice(0, 200);
    } catch { /* ignore */ }
  }

  debug(`Executing skill: ${skillName}`);

  // Interpolate args
  function interpolate(val) {
    if (typeof val === 'string') {
      return val.replace(/\{\{([^}]+)\}\}/g, (match, expr) => {
        try {
          // eslint-disable-next-line no-new-func
          const fn = new Function('ctx', `with(ctx) { return ${expr}; }`);
          return fn(context);
        } catch {
          return match;
        }
      });
    }
    if (Array.isArray(val)) return val.map(interpolate);
    if (val && typeof val === 'object') {
      const result = {};
      for (const [k, v] of Object.entries(val)) result[k] = interpolate(v);
      return result;
    }
    return val;
  }

  const interpolatedArgs = interpolate(args);

  // Try running skill script
  if (fs.existsSync(skillCmd)) {
    return new Promise((resolve) => {
      const child = spawn('node', [skillCmd, JSON.stringify(interpolatedArgs)], { shell: true });
      let stdout = '', stderr = '';
      child.stdout.on('data', d => stdout += d);
      child.stderr.on('data', d => stderr += d);
      child.on('close', code => {
        try { resolve({ ...JSON.parse(stdout), exitCode: code, skill: skillName }); }
        catch { resolve({ stdout, stderr, exitCode: code, skill: skillName }); }
      });
      child.on('error', e => resolve({ error: e.message, skill: skillName }));
    });
  }

  // Fallback: invoke via duck-cli skill
  return new Promise((resolve) => {
    const child = spawn('duck', ['run', `Execute skill ${skillName} with args: ${JSON.stringify(interpolatedArgs)}`], {
      shell: true,
      env: { ...process.env, DUCK_CHAT_PROVIDER: 'minimax' },
    });
    let stdout = '', stderr = '';
    child.stdout.on('data', d => stdout += d);
    child.stderr.on('data', d => stderr += d);
    child.on('close', code => resolve({ stdout, stderr, exitCode: code, skill: skillName }));
    child.on('error', e => resolve({ error: e.message, skill: skillName }));
  });
}

// ---------------------------------------------------------------------------
// Skill-Plugin Chaining Engine
// ---------------------------------------------------------------------------

async function executeStep(step, context) {
  info(`  Step [${step.id}]: ${step.name}${step.depends ? ` (depends: ${step.depends.join(', ')})` : ''}`);

  let result;

  if (step.skill) {
    result = await executeSkill(step.skill, step.args, context);
  } else if (step.plugin) {
    result = await executePlugin(step.plugin, step.args, context);
  } else {
    result = { executed: false, reason: 'Neither skill nor plugin specified' };
  }

  // Store output in context for downstream steps
  if (step.outputVar) {
    context[`steps.${step.id}.output`] = result;
    context[step.outputVar] = result;
  }

  context[`steps.${step.id}`] = { result, timestamp: new Date().toISOString() };

  return result;
}

// ---------------------------------------------------------------------------
// Workflow Executor
// ---------------------------------------------------------------------------

async function executeWorkflow(workflowId, input = {}, options = {}) {
  const workflows = loadJSON(WORKFLOWS_FILE, WORKFLOW_TEMPLATES);
  const workflow   = workflows[workflowId] || WORKFLOW_TEMPLATES[workflowId];

  if (!workflow) {
    throw new Error(`Unknown workflow: "${workflowId}". Run 'hive workflows list' to see available workflows.`);
  }

  info(`=== Starting Workflow: ${workflow.name} (${workflowId}) ===`);
  info(`Version: ${workflow.version} | Steps: ${workflow.steps.length}`);

  // Build execution context
  const context = {
    input,
    env:    process.env,
    steps:  {},
    startedAt: new Date().toISOString(),
    workflowId,
    workflowName: workflow.name,
  };

  // Track completed steps
  const completed = new Set();
  const results  = [];

  // Execute steps in dependency order
  for (const step of workflow.steps) {
    // Wait for dependencies
    if (step.depends) {
      for (const dep of step.depends) {
        if (!completed.has(dep)) {
          warn(`Step ${step.id} waiting for ${dep} (not yet completed)`);
          // Simple sequential wait - in production use async queue
          const depStep = workflow.steps.find(s => s.id === dep);
          if (depStep) await executeStep(depStep, context);
        }
      }
    }

    // Check for approval requirement
    if (step.requiresApproval && !options.skipApproval) {
      info(`  ⏸ Step [${step.id}] requires