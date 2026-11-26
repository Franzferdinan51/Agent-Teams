/**
 * knowledgeService.ts — Chamber memory / knowledge store.
 *
 * Backend reality (verified in council-api-server.cjs and council-server.js):
 * neither council server exposes a memory or knowledge API. The :3001 MCP
 * surface has session/settings/councilor tools only — no memory_* tools —
 * and settings persistence (settings.json) carries bots/providers/ui/audio,
 * not precedents or per-bot memories. The standalone mcp-server.js memory_*
 * tools proxy a separate agent-api service that is not part of the council
 * backends and is not running for the Chamber.
 *
 * So this service is the Chamber's client-side store, persisted in
 * localStorage — the same persistence model council-app.tsx already uses
 * for messages and settings. Data is real (entered by the user / saved from
 * actual passed proposals) and survives reloads; it is NOT synced to a
 * server, and nothing here fabricates entries.
 */

import { BotMemory, MemoryEntry, RAGDocument } from '../council-types';

const MEMORIES_KEY = 'ai_council_memories_v1';
const BOT_MEMORIES_KEY = 'ai_council_bot_memories_v1';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`knowledgeService: could not persist ${key}`, e);
  }
}

function terms(query: string): string[] {
  return query.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 2);
}

function scoreText(text: string, queryTerms: string[]): number {
  const lower = text.toLowerCase();
  return queryTerms.reduce((acc, t) => acc + (lower.includes(t) ? 1 : 0), 0);
}

// ─── Global memories (laws / precedents) ────────────────────────────────────

export function getMemories(): MemoryEntry[] {
  const list = readJson<MemoryEntry[]>(MEMORIES_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function saveMemory(entry: MemoryEntry): void {
  const list = getMemories();
  const idx = list.findIndex(m => m.id === entry.id);
  if (idx >= 0) list[idx] = entry;
  else list.push(entry);
  writeJson(MEMORIES_KEY, list);
}

export function deleteMemory(id: string): void {
  writeJson(MEMORIES_KEY, getMemories().filter(m => m.id !== id));
}

/** Keyword search over saved precedents. Returns best matches first. */
export function searchMemories(query: string): MemoryEntry[] {
  const all = getMemories();
  const q = terms(query);
  if (q.length === 0) return all;
  return all
    .map(m => ({ m, score: scoreText(`${m.topic} ${m.content} ${(m.tags || []).join(' ')}`, q) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(x => x.m);
}

// ─── Knowledge-base documents (RAG) ─────────────────────────────────────────

/**
 * Search the user's own knowledge documents (Settings → Knowledge) for
 * snippets relevant to `query`. Only active documents are searched, and
 * only chunks that actually match query terms are returned — no matches
 * means no snippets, never filler text.
 */
export function searchDocuments(documents: RAGDocument[], query: string): string[] {
  const q = terms(query);
  if (q.length === 0) return [];
  const snippets: { text: string; score: number }[] = [];

  for (const doc of documents || []) {
    if (!doc.active) continue;
    const chunks = doc.content.split(/\n\s*\n/).map(c => c.trim()).filter(Boolean);
    for (const chunk of chunks) {
      const score = scoreText(chunk, q);
      if (score > 0) {
        snippets.push({ text: `[${doc.title}] ${chunk.slice(0, 500)}`, score });
      }
    }
  }
  return snippets.sort((a, b) => b.score - a.score).slice(0, 5).map(s => s.text);
}

// ─── Per-bot memories ───────────────────────────────────────────────────────

export function getBotMemories(botId: string): BotMemory[] {
  const all = readJson<BotMemory[]>(BOT_MEMORIES_KEY, []);
  return (Array.isArray(all) ? all : []).filter(m => m.botId === botId);
}

export function addBotMemory(botId: string, content: string, type: BotMemory['type']): BotMemory {
  const all = readJson<BotMemory[]>(BOT_MEMORIES_KEY, []);
  const entry: BotMemory = {
    id: `botmem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    botId,
    type,
    content,
    timestamp: Date.now(),
  };
  writeJson(BOT_MEMORIES_KEY, [...(Array.isArray(all) ? all : []), entry]);
  return entry;
}

export function deleteBotMemory(id: string): void {
  const all = readJson<BotMemory[]>(BOT_MEMORIES_KEY, []);
  writeJson(BOT_MEMORIES_KEY, (Array.isArray(all) ? all : []).filter(m => m.id !== id));
}
