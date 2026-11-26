/**
 * knowledgeService.ts — Chamber memory / knowledge store.
 *
 * Server-first (v2.3.0): council-api-server.cjs now exposes a persistent
 * memory API (GET/PUT/DELETE /api/memory/:key, file-backed at
 * data/council-memory.json). This service stores its two collections under
 * the server keys `chamber.memories.v1` and `chamber.botMemories.v1`.
 *
 * The exported API stays synchronous (the app's call sites read it inline),
 * so the flow is: in-memory caches seeded from localStorage (exactly the
 * pre-2.3.0 behavior), an async hydration fetch on first use — when the
 * server answers, its data becomes the source of truth and replaces the
 * cache; when the server has no entry yet, the local cache is pushed up so
 * existing local data migrates. Mutations update the cache + localStorage
 * immediately and write through to the server. When the server is
 * unreachable, everything silently falls back to the localStorage behavior
 * — offline use is unchanged and no error is surfaced to the user.
 *
 * The /api path is relative: the vite dev/preview proxy maps /api to the
 * council API on :3001, the same base the rest of the app uses.
 */

import { BotMemory, MemoryEntry, RAGDocument } from '../council-types';

const MEMORIES_KEY = 'ai_council_memories_v1';
const BOT_MEMORIES_KEY = 'ai_council_bot_memories_v1';
const SERVER_MEMORIES_KEY = 'chamber.memories.v1';
const SERVER_BOT_MEMORIES_KEY = 'chamber.botMemories.v1';

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

// ─── Server sync layer ──────────────────────────────────────────────────────

type ServerState = 'unknown' | 'online' | 'offline';
let serverState: ServerState = 'unknown';

interface MemoryResponse {
  key: string;
  value: unknown;
  updatedAt: string;
}

async function serverGet(key: string): Promise<{ found: boolean; value?: unknown }> {
  const res = await fetch(`/api/memory/${encodeURIComponent(key)}`);
  if (res.status === 404) return { found: false };
  if (!res.ok) throw new Error(`memory GET ${key} -> ${res.status}`);
  const body = (await res.json()) as MemoryResponse;
  return { found: true, value: body.value };
}

async function serverPut(key: string, value: unknown): Promise<void> {
  const res = await fetch(`/api/memory/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
  });
  if (!res.ok) throw new Error(`memory PUT ${key} -> ${res.status}`);
}

/**
 * One server-backed collection: a synchronous in-memory cache mirrored to
 * localStorage, hydrated from (and written through to) the council API.
 */
class ServerCollection<T> {
  private cache: T[];
  private hydrated = false;
  private hydrating = false;

  constructor(
    private localKey: string,
    private serverKey: string,
  ) {
    const seeded = readJson<T[]>(localKey, []);
    this.cache = Array.isArray(seeded) ? seeded : [];
  }

  /** Kick off the one-time server hydration; safe to call on every read. */
  private hydrate(): void {
    if (this.hydrated || this.hydrating || serverState === 'offline') return;
    this.hydrating = true;
    serverGet(this.serverKey)
      .then(({ found, value }) => {
        serverState = 'online';
        this.hydrated = true;
        if (found && Array.isArray(value)) {
          // Server is the source of truth once it answers with data.
          this.cache = value as T[];
          writeJson(this.localKey, this.cache);
        } else if (!found && this.cache.length > 0) {
          // Server has nothing yet: migrate the local data up.
          void this.push();
        }
      })
      .catch(() => {
        // Unreachable: stay on the localStorage-backed cache, silently.
        serverState = 'offline';
      })
      .finally(() => {
        this.hydrating = false;
      });
  }

  private async push(): Promise<void> {
    if (serverState === 'offline') return;
    try {
      await serverPut(this.serverKey, this.cache);
      serverState = 'online';
      this.hydrated = true;
    } catch {
      serverState = 'offline';
    }
  }

  get(): T[] {
    this.hydrate();
    return this.cache;
  }

  set(next: T[]): void {
    this.cache = next;
    writeJson(this.localKey, next);
    void this.push();
  }
}

const memoriesCollection = new ServerCollection<MemoryEntry>(MEMORIES_KEY, SERVER_MEMORIES_KEY);
const botMemoriesCollection = new ServerCollection<BotMemory>(BOT_MEMORIES_KEY, SERVER_BOT_MEMORIES_KEY);

// ─── Global memories (laws / precedents) ────────────────────────────────────

export function getMemories(): MemoryEntry[] {
  return memoriesCollection.get();
}

export function saveMemory(entry: MemoryEntry): void {
  const list = [...memoriesCollection.get()];
  const idx = list.findIndex(m => m.id === entry.id);
  if (idx >= 0) list[idx] = entry;
  else list.push(entry);
  memoriesCollection.set(list);
}

export function deleteMemory(id: string): void {
  memoriesCollection.set(memoriesCollection.get().filter(m => m.id !== id));
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
  return botMemoriesCollection.get().filter(m => m.botId === botId);
}

export function addBotMemory(botId: string, content: string, type: BotMemory['type']): BotMemory {
  const entry: BotMemory = {
    id: `botmem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    botId,
    type,
    content,
    timestamp: Date.now(),
  };
  botMemoriesCollection.set([...botMemoriesCollection.get(), entry]);
  return entry;
}

export function deleteBotMemory(id: string): void {
  botMemoriesCollection.set(botMemoriesCollection.get().filter(m => m.id !== id));
}
