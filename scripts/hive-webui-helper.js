#!/usr/bin/env node
/**
 * hive-webui-helper.js
 * CLI commands to manage the Hive Nation WebUI
 * 
 * Usage: node hive-webui-helper.js <command>
 * 
 * Commands:
 *   start [port]     Start the WebUI server (default port: 3131)
 *   stop             Stop the WebUI server
 *   status           Check if WebUI is running
 *   open             Open WebUI in browser
 *   restart [port]   Restart the WebUI server
 *   logs [lines]     View WebUI server logs
 *   pid              Show WebUI server PID
 */

const { execSync, spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const PID_FILE = path.join(PROJECT_ROOT, '.webui.pid');
const LOG_FILE = path.join(PROJECT_ROOT, '.webui.log');
const DEFAULT_PORT = 3131;

function pid() {
  if (fs.existsSync(PID_FILE)) {
    return parseInt(fs.readFileSync(PID_FILE, 'utf8').trim());
  }
  return null;
}

function isRunning(pidNum) {
  try {
    process.kill(pidNum, 0);
    return true;
  } catch {
    return false;
  }
}

function getPort() {
  const pidNum = pid();
  if (!pidNum) return DEFAULT_PORT;
  try {
    const out = execSync(`lsof -i :${DEFAULT_PORT} -t 2>/dev/null`, { encoding: 'utf8' });
    return out.trim() ? DEFAULT_PORT : DEFAULT_PORT;
  } catch {
    return DEFAULT_PORT;
  }
}

async function doStart(port) {
  const p = pid();
  if (p && isRunning(p)) {
    console.log(`\n  Hive WebUI is already running (PID ${p})\n`);
    console.log(`  URL: http://localhost:${port}/`);
    console.log(`  PID: ${p}\n`);
    return;
  }

  const serverPath = path.join(PROJECT_ROOT, 'webui', 'server.js');
  if (!fs.existsSync(serverPath)) {
    console.error(`\n  Error: server.js not found at ${serverPath}\n`);
    process.exit(1);
  }

  console.log(`\n  Starting Hive WebUI on port ${port}...`);

  const log = fs.openSync(LOG_FILE, 'a');
  const child = spawn('node', [serverPath], {
    cwd: PROJECT_ROOT,
    stdio: ['ignore', log, log],
    detached: true,
    env: { ...process.env, PORT: port }
  });

  child.unref();
  fs.writeFileSync(PID_FILE, String(child.pid));

  // Wait briefly for server to start
  const start = Date.now();
  while (Date.now() - start < 5000) {
    try {
      const req = http.request({ hostname: 'localhost', port: port, path: '/api/health', method: 'GET' }, () => {});
      req.on('error', () => {});
      req.end();
      break;
    } catch {}
  }

  console.log(`\n  Hive WebUI started\n`);
  console.log(`  URL:  http://localhost:${port}/`);
  console.log(`  PID:  ${child.pid}`);
  console.log(`  Logs: ${LOG_FILE}\n`);
}

function doStop() {
  const p = pid();
  if (!p || !isRunning(p)) {
    if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE);
    console.log('\n  Hive WebUI is not running.\n');
    return;
  }
  process.kill(p, 'SIGTERM');
  fs.unlinkSync(PID_FILE);
  console.log('\n  Hive WebUI stopped.\n');
}

function doStatus() {
  const p = pid();
  if (!p || !isRunning(p)) {
    console.log('\n  Hive WebUI: STOPPED\n');
    return;
  }
  const port = DEFAULT_PORT;
  let healthy = false;
  try {
    const req = http.get(`http://localhost:${port}/api/health`, (res) => {
      healthy = res.statusCode === 200;
    });
    req.on('error', () => {});
    req.end();
  } catch {}
  console.log(`\n  Hive WebUI: RUNNING`);
  console.log(`  PID:     ${p}`);
  console.log(`  URL:     http://localhost:${port}/`);
  console.log(`  Health:  ${healthy ? 'OK' : 'UNHEALTHY'}\n`);
}

function doOpen() {
  const port = DEFAULT_PORT;
  const p = pid();
  if (!p || !isRunning(p)) {
    console.log('\n  WebUI is not running. Starting first...\n');
    doStart(port);
  }
  const url = `http://localhost:${port}/`;
  console.log(`\n  Opening: ${url}`);
  spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
}

async function doRestart(port) {
  doStop();
  setTimeout(() => doStart(port || DEFAULT_PORT), 1000);
}

function doLogs(lines) {
  const n = parseInt(lines) || 50;
  if (!fs.existsSync(LOG_FILE)) {
    console.log('\n  No log file found.\n');
    return;
  }
  const content = fs.readFileSync(LOG_FILE, 'utf8');
  const allLines = content.split('\n');
  const last = allLines.slice(-n);
  console.log('\n  --- Hive WebUI Logs ---\n');
  console.log(last.join('\n'));
  console.log('\n');
}

// Main
(async () => {
const args = process.argv.slice(2);
const cmd = args[0] || 'help';
const arg = args[1];

if (cmd === 'start') {
  await doStart(parseInt(arg) || DEFAULT_PORT);
} else if (cmd === 'stop') {
  doStop();
} else if (cmd === 'status') {
  doStatus();
} else if (cmd === 'open') {
  doOpen();
} else if (cmd === 'restart') {
  await doRestart(parseInt(arg));
} else if (cmd === 'logs') {
  doLogs(arg);
} else if (cmd === 'pid') {
  const p = pid();
  console.log(p ? `\n  PID: ${p}\n` : '\n  Not running\n');
} else {
  console.log(`
  Hive WebUI Helper

  Usage: node hive-webui-helper.js <command>

  Commands:
    start [port]     Start the WebUI server (default: 3131)
    stop             Stop the WebUI server
    status           Check if WebUI is running
    open             Open WebUI in browser
    restart [port]   Restart the WebUI server
    logs [lines]     View server logs (default: 50 lines)
    pid              Show server PID

  Examples:
    node hive-webui-helper.js start
    node hive-webui-helper.js start 8080
    node hive-webui-helper.js status
    node hive-webui-helper.js open
    node hive-webui-helper.js restart
    node hive-webui-helper.js logs 100
  `);
}
})();
