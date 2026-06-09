'use strict';

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const fsp = require('fs').promises;

const BUILD_LOGS_DIR = path.join(__dirname, '..', '..', 'build-logs');
const LOGS_FILE = path.join(BUILD_LOGS_DIR, 'dashboard.log');
const DECOMP_DIR = path.join(BUILD_LOGS_DIR, 'decompositions');
const DISPATCH_DIR = path.join(BUILD_LOGS_DIR, 'dispatches');

function ts() {
  return new Date().toISOString();
}

function log(level, msg, meta) {
  const line = `[${ts()}] [${level}] ${msg}` +
    (meta !== undefined ? ' ' + JSON.stringify(meta) : '');
  if (level === 'ERROR') {
    console.error(line);
  } else {
    console.log(line);
  }
  try {
    fs.appendFileSync(LOGS_FILE, line + '\n', 'utf8');
  } catch (e) { /* best-effort */ }
}

function sendJson(res, status, body) {
  res.status(status).json(body);
}

/**
 * GET /api/logs
 * Return last N lines from build-logs/dashboard.log (query: ?limit=200)
 */
router.get('/', asyncHandler(async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(parseInt(req.query.limit || '200', 10) || 200, 5000));
    if (!fs.existsSync(LOGS_FILE)) {
      return sendJson(res, 200, { count: 0, logs: [], file: LOGS_FILE });
    }
    const content = fs.readFileSync(LOGS_FILE, 'utf8');
    const lines = content.split('\n').filter((l) => l.trim().length > 0);
    const tail = lines.slice(-limit);
    sendJson(res, 200, { count: tail.length, limit, logs: tail });
  } catch (e) {
    log('ERROR', `GET /api/logs failed: ${e.message}`);
    sendJson(res, 500, { error: 'internal', message: e.message });
  }
}));

/**
 * GET /api/logs/decompositions
 * List all decomposition JSON files in build-logs/decompositions/
 */
router.get('/decompositions', asyncHandler(async (req, res) => {
  try {
    if (!fs.existsSync(DECOMP_DIR)) {
      return sendJson(res, 200, { count: 0, files: [] });
    }
    const entries = await fsp.readdir(DECOMP_DIR);
    const jsonFiles = entries.filter((f) => f.endsWith('.json'));
    sendJson(res, 200, { count: jsonFiles.length, files: jsonFiles });
  } catch (e) {
    log('ERROR', `GET /api/logs/decompositions failed: ${e.message}`);
    sendJson(res, 500, { error: 'internal', message: e.message });
  }
}));

/**
 * GET /api/logs/decompositions/:file
 * Read a specific decomposition file.
 */
router.get('/decompositions/:file', asyncHandler(async (req, res) => {
  try {
    const fileName = req.params.file;
    // Sanitize — prevent path traversal
    if (!/^[a-zA-Z0-9_-]+\.json$/.test(fileName)) {
      return sendJson(res, 400, { error: 'invalid filename' });
    }
    const filePath = path.join(DECOMP_DIR, fileName);
    if (!filePath.startsWith(DECOMP_DIR)) {
      return sendJson(res, 403, { error: 'forbidden' });
    }
    if (!fs.existsSync(filePath)) {
      return sendJson(res, 404, { error: 'file not found' });
    }
    const content = fs.readFileSync(filePath, 'utf8');
    let data;
    try {
      data = JSON.parse(content);
    } catch {
      data = { raw: content };
    }
    sendJson(res, 200, { file: fileName, data });
  } catch (e) {
    log('ERROR', `GET /api/logs/decompositions/:file failed: ${e.message}`);
    sendJson(res, 500, { error: 'internal', message: e.message });
  }
}));

/**
 * GET /api/logs/dispatches
 * List all dispatch JSON files in build-logs/dispatches/
 */
router.get('/dispatches', asyncHandler(async (req, res) => {
  try {
    if (!fs.existsSync(DISPATCH_DIR)) {
      return sendJson(res, 200, { count: 0, files: [] });
    }
    const entries = await fsp.readdir(DISPATCH_DIR);
    const jsonFiles = entries.filter((f) => f.endsWith('.json'));
    sendJson(res, 200, { count: jsonFiles.length, files: jsonFiles });
  } catch (e) {
    log('ERROR', `GET /api/logs/dispatches failed: ${e.message}`);
    sendJson(res, 500, { error: 'internal', message: e.message });
  }
}));

/**
 * GET /api/logs/dispatches/:file
 * Read a specific dispatch file.
 */
router.get('/dispatches/:file', asyncHandler(async (req, res) => {
  try {
    const fileName = req.params.file;
    // Sanitize — prevent path traversal
    if (!/^[a-zA-Z0-9_-]+\.json$/.test(fileName)) {
      return sendJson(res, 400, { error: 'invalid filename' });
    }
    const filePath = path.join(DISPATCH_DIR, fileName);
    if (!filePath.startsWith(DISPATCH_DIR)) {
      return sendJson(res, 403, { error: 'forbidden' });
    }
    if (!fs.existsSync(filePath)) {
      return sendJson(res, 404, { error: 'file not found' });
    }
    const content = fs.readFileSync(filePath, 'utf8');
    let data;
    try {
      data = JSON.parse(content);
    } catch {
      data = { raw: content };
    }
    sendJson(res, 200, { file: fileName, data });
  } catch (e) {
    log('ERROR', `GET /api/logs/dispatches/:file failed: ${e.message}`);
    sendJson(res, 500, { error: 'internal', message: e.message });
  }
}));

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = router;