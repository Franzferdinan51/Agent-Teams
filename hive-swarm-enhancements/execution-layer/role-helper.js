'use strict';

/**
 * @file role-helper.js
 * @description Hierarchical role taxonomy helper for the Agent-Teams registry.
 *
 * Provides a lightweight API for classifying agents into one of three tiers
 * (executive / director / specialist) and for recommending agents against
 * ad-hoc task requirements.
 *
 * Tiers are inspired by agnt.gg's role-based swarm model
 * (CEO / CTO / CFO / PM / Lead / Specialist, etc.).
 *
 * @module role-helper
 * @version 1.0.0
 * @author Agent-Teams (ROLES-1 sub-agent)
 */

const __version = '1.0.0';

/**
 * Ordered list of role tiers, from highest to lowest authority.
 * @constant {ReadonlyArray<string>}
 */
const TIERS = Object.freeze(['executive', 'director', 'specialist']);

/**
 * Executive-tier keywords. If any of these appear as a logical whole word
 * (case-insensitive) in an agent's key or display name, it is classified
 * as `executive`. See {@link _tokens} for tokenization rules.
 * @private
 */
const EXECUTIVE_KEYWORDS = ['CEO', 'CTO', 'CFO', 'COO', 'CMO', 'Chief'];

/**
 * Director-tier keywords. If any of these appear as a logical whole word
 * in an agent's key or display name, it is classified as `director`
 * (assuming no executive match took precedence).
 * @private
 */
const DIRECTOR_KEYWORDS = ['Director', 'Lead', 'Manager', 'Producer'];

/**
 * Display-friendly descriptions for each tier. Mirrors the
 * `role_taxonomy.tiers` block in `agent-registry.json`.
 * @private
 */
const TIER_DESCRIPTIONS = Object.freeze({
  executive: 'C-suite strategic leadership',
  director: 'Mid-level strategic direction',
  specialist: 'Hands-on execution experts',
});

/**
 * Tokenize a string into a set of "logical words", splitting on:
 *   - non-alphanumeric characters (kebab-case, snake_case, spaces)
 *   - camelCase / PascalCase boundaries ("ProductManager" → Product, Manager)
 *   - letter↔digit boundaries ("iOS18" → iOS, 18)
 *
 * This is used as a case-insensitive whole-word check for keywords like
 * "Manager" inside "ProductManager" (true match) while still avoiding
 * false positives like "cto" inside "director" (no match).
 *
 * @private
 * @param {string} s
 * @returns {Set<string>} lowercased tokens
 */
function _tokens(s) {
  if (!s) return new Set();
  // Insert space at camelCase boundaries: aA → a A, ABCd → A B Cd
  const split = s
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  return new Set(split);
}

/**
 * Check whether `haystack` contains `word` as a logical whole word.
 * See {@link _tokens} for tokenization rules.
 *
 * @private
 * @param {string} haystack - The string to search in.
 * @param {string} word - The word to look for (case-insensitive).
 * @returns {boolean}
 */
function _containsWord(haystack, word) {
  if (!haystack || !word) return false;
  return _tokens(haystack).has(word.toLowerCase());
}

/**
 * Classify a single agent (by its registry key OR display name) into a
 * hierarchical tier.
 *
 * Heuristics, evaluated in order (whole-word, case-insensitive matches):
 *   1. Contains "CEO" / "CTO" / "CFO" / "COO" / "CMO" / "Chief" → `executive`
 *   2. Contains "Director" / "Lead" / "Manager" / "Producer" → `director`
 *   3. Otherwise → `specialist`
 *
 * Whole-word matching is used so that e.g. "cto" does not match inside
 * "director" (dire**cto**r).
 *
 * @param {string} agentName - Either the agent's registry key (e.g. "tech-director")
 *                             or its human-readable name (e.g. "Technical Director").
 *                             Both are checked.
 * @returns {'executive' | 'director' | 'specialist'} The inferred tier.
 *
 * @example
 *   getTier('CEO');                          // 'executive'
 *   getTier('tech-director');                // 'director'  (whole-word "Director")
 *   getTier('Security Lead');                // 'director'  (whole-word "Lead")
 *   getTier('backend-dev');                  // 'specialist'
 *   getTier('Mobile Specialist');            // 'specialist'
 */
function getTier(agentName) {
  if (typeof agentName !== 'string' || agentName.length === 0) {
    return 'specialist';
  }
  // 1) Executive check first (more specific / higher authority)
  for (const kw of EXECUTIVE_KEYWORDS) {
    if (_containsWord(agentName, kw)) return 'executive';
  }
  // 2) Director check
  for (const kw of DIRECTOR_KEYWORDS) {
    if (_containsWord(agentName, kw)) return 'director';
  }
  // 3) Default
  return 'specialist';
}

/**
 * Filter a registry down to agents in a specific tier.
 *
 * The registry is expected to be the JSON object loaded from
 * `agent-registry.json` (i.e. `{ role_taxonomy, agents: { key: {name, tier, role, ...} } }`).
 *
 * The returned objects include the registry key as `name` (for consistency
 * with other lookups), the classified `tier`, and the agent's own `role`
 * string. If the agent has a numeric `tier` field, it is preserved as
 * `numeric_tier` so callers can correlate the two systems.
 *
 * @param {Object} registry - The loaded agent registry.
 * @param {'executive'|'director'|'specialist'} tier - The tier to filter by.
 * @returns {Array<{name: string, tier: string, role: string, numeric_tier?: number}>}
 *
 * @example
 *   const reg = require('../../agent-swarm-system/agent-registry.json');
 *   const directors = getAgentsByTier(reg, 'director');
 *   // => [{name: 'tech-director', tier: 'director', role: '...'}, ...]
 */
function getAgentsByTier(registry, tier) {
  if (!registry || typeof registry !== 'object' || !registry.agents) {
    return [];
  }
  if (TIERS.indexOf(tier) === -1) {
    throw new Error(`getAgentsByTier: unknown tier '${tier}'. Valid: ${TIERS.join(', ')}`);
  }
  const results = [];
  const agents = registry.agents;
  for (const key of Object.keys(agents)) {
    const agent = agents[key];
    const inferred = agent.role_tier || getTier(key);
    if (inferred === tier) {
      const entry = {
        name: key,
        tier: inferred,
        role: agent.role || '',
      };
      // Preserve the original numeric tier (1 = director-level, 2 = specialist)
      // so consumers can correlate the two classification systems.
      if (typeof agent.tier === 'number') entry.numeric_tier = agent.tier;
      results.push(entry);
    }
  }
  return results;
}

/**
 * Recommend the top N agents for a given task.
 *
 * Scoring is intentionally simple and fast (no embeddings / LLM call):
 *   - +3  for every keyword in `taskRequirements` that appears in the agent's
 *         name (key or display name), case-insensitive
 *   - +2  for every keyword that appears in the agent's `role` string
 *   - +1  for every keyword that appears in any of the agent's `delivers`
 *         entries
 *   - +1  bonus if the agent is a `director` (mid-level coordination)
 *   - +2  bonus if the agent is an `executive` (strategic oversight)
 *   - 0   (but still eligible) for `specialist` tier
 *
 * Ties are broken by (a) higher tier, then (b) alphabetical key.
 *
 * @param {Object} registry - The loaded agent registry.
 * @param {string[]|string} taskRequirements - An array of keywords/phrases
 *        describing what the task needs (e.g. ["backend", "api", "database"]).
 *        A single string is also accepted and will be split on whitespace.
 * @param {number} [topN=5] - Maximum number of agents to return.
 * @returns {Array<{name: string, tier: string, score: number, role: string}>}
 *          The top-N recommended agents, highest score first.
 *
 * @example
 *   const reg = require('../../agent-swarm-system/agent-registry.json');
 *   const team = recommendAgentsForTask(reg, ['security', 'audit', 'owasp'], 5);
 */
function recommendAgentsForTask(registry, taskRequirements, topN = 5) {
  if (!registry || typeof registry !== 'object' || !registry.agents) {
    return [];
  }
  // Normalize requirements to a lowercased array of non-empty tokens
  let reqs;
  if (Array.isArray(taskRequirements)) {
    reqs = taskRequirements.filter(Boolean).map(s => String(s).toLowerCase());
  } else if (typeof taskRequirements === 'string') {
    reqs = taskRequirements.toLowerCase().split(/[\s,]+/).filter(Boolean);
  } else {
    reqs = [];
  }
  if (reqs.length === 0) {
    return [];
  }

  const tierBonus = { executive: 2, director: 1, specialist: 0 };
  const scored = [];

  for (const [key, agent] of Object.entries(registry.agents)) {
    const nameHay = `${key} ${agent.name || ''}`.toLowerCase();
    const roleHay = (agent.role || '').toLowerCase();
    const deliversHay = (agent.delivers || []).join(' ').toLowerCase();

    let score = 0;
    for (const r of reqs) {
      if (nameHay.indexOf(r) !== -1) score += 3;
      if (roleHay.indexOf(r) !== -1) score += 2;
      if (deliversHay.indexOf(r) !== -1) score += 1;
    }
    if (score === 0) continue;

    const tier = agent.role_tier || getTier(key);
    score += tierBonus[tier] || 0;

    scored.push({
      name: key,
      tier,
      score,
      role: agent.role || '',
    });
  }

  // Sort: score desc, then tier (executive > director > specialist), then alpha
  const tierOrder = { executive: 0, director: 1, specialist: 2 };
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (tierOrder[a.tier] !== tierOrder[b.tier]) return tierOrder[a.tier] - tierOrder[b.tier];
    return a.name.localeCompare(b.name);
  });

  return scored.slice(0, Math.max(0, topN | 0));
}

module.exports = {
  getTier,
  getAgentsByTier,
  recommendAgentsForTask,
  TIERS,
  __version,
};
