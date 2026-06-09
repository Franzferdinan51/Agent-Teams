'use strict';

/**
 * @file Shared in-memory state store for the API router modules.
 * Exported as a singleton so multiple routers share the same Maps.
 */

const swarms = new Map();
const polls = new Map();
const recentLogs = [];

module.exports = { swarms, polls, recentLogs };