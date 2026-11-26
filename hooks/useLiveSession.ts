/**
 * useLiveSession.ts — live session state for LiveWatcher.
 *
 * Backend reality (verified): neither council server offers an SSE stream
 * for chamber sessions. council-api-server.cjs (:3001) keeps a single
 * session-state object — POST /api/session/start registers {topic, mode},
 * GET /api/session returns it — and council-server.js (:3003) runs its own
 * deliberations. The Chamber app registers its session on :3001 when a
 * session starts (see council-app.tsx startSSESession), so this hook POLLS
 * :3001 (GET /api/session + GET /api/councilors, via the Vite proxy) and
 * reflects exactly what the server holds:
 * - topic/mode come from the registered session;
 * - messages/votes appear only if the server-side session carries them
 *   (browser-run deliberation messages are not mirrored by any endpoint —
 *   there is no message-ingest route — so the stream honestly shows the
 *   registered session and roster, not invented activity);
 * - viewerCount is null: no endpoint reports viewers, and LiveWatcher
 *   renders "—" rather than a fabricated number.
 */

import { useEffect, useRef, useState } from 'react';
import { PredictionData, VoteData } from '../council-types';

export interface LiveMessage {
  id: string;
  author: string;
  authorType: string;
  content: string;
  roleLabel?: string;
  color?: string;
  timestamp?: number;
  thinking?: string;
  voteData?: VoteData;
  predictionData?: PredictionData;
}

export interface LiveCouncilor {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'speaking' | 'done';
}

export interface LiveSessionState {
  connected: boolean;
  phase: string;
  topic: string | null;
  mode: string | null;
  messages: LiveMessage[];
  councilors: LiveCouncilor[];
  stats: { messages: number; yeas: number; nays: number };
  elapsed: number;
  viewerCount: number | null;
  voteData: VoteData | null;
}

const IDLE_STATE: LiveSessionState = {
  connected: false,
  phase: 'idle',
  topic: null,
  mode: null,
  messages: [],
  councilors: [],
  stats: { messages: 0, yeas: 0, nays: 0 },
  elapsed: 0,
  viewerCount: null,
  voteData: null,
};

function mapVotes(votes: Record<string, number> | undefined, topic: string): { yeas: number; nays: number; voteData: VoteData | null } {
  if (!votes || Object.keys(votes).length === 0) return { yeas: 0, nays: 0, voteData: null };
  const yeas = votes['YEA'] ?? votes['yea'] ?? votes['yes'] ?? 0;
  const nays = votes['NAY'] ?? votes['nay'] ?? votes['no'] ?? 0;
  if (yeas + nays === 0) return { yeas: 0, nays: 0, voteData: null };
  return {
    yeas,
    nays,
    voteData: {
      topic,
      yeas,
      nays,
      result: yeas > nays ? 'PASSED' : 'REJECTED',
      avgConfidence: 0,
      consensusScore: Math.round((Math.abs(yeas - nays) / (yeas + nays)) * 100),
      consensusLabel: 'Server tally',
      votes: Object.entries(votes).map(([option, count]) => ({
        voter: option,
        choice: (option.toUpperCase().includes('YEA') || option.toUpperCase().includes('YES') ? 'YEA' : 'NAY') as 'YEA' | 'NAY',
        confidence: 0,
        reason: `${count} vote(s) recorded on the server`,
        color: 'from-slate-500 to-slate-600',
      })),
    },
  };
}

export function useLiveSession(pollMs = 2000): LiveSessionState {
  const [state, setState] = useState<LiveSessionState>(IDLE_STATE);
  const sessionStartRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const [sessionRes, councilorsRes] = await Promise.all([
          fetch('/api/session'),
          fetch('/api/councilors'),
        ]);
        if (!sessionRes.ok) throw new Error(`session ${sessionRes.status}`);
        const session = await sessionRes.json();
        const registry = councilorsRes.ok ? await councilorsRes.json() : [];

        if (cancelled) return;

        const hasSession = Boolean(session && session.id);
        if (hasSession) {
          const parsed = /^session_(\d+)$/.exec(session.id);
          sessionStartRef.current = parsed ? parseInt(parsed[1], 10) : (sessionStartRef.current ?? Date.now());
        } else {
          sessionStartRef.current = null;
        }

        const rawMessages: any[] = Array.isArray(session?.messages) ? session.messages : [];
        const messages: LiveMessage[] = rawMessages.map((m: any, i: number) => ({
          id: m.id || `srv-msg-${i}`,
          author: m.author || m.name || 'Councilor',
          authorType: m.authorType || 'gemini',
          content: m.content || m.text || '',
          roleLabel: m.roleLabel || m.role,
          color: m.color,
          timestamp: m.timestamp,
          thinking: m.thinking,
          voteData: m.voteData,
          predictionData: m.predictionData,
        }));

        const spokenAuthors = new Set(messages.map(m => m.author));
        const councilors: LiveCouncilor[] = (Array.isArray(registry) ? registry : []).map((c: any) => ({
          id: c.id,
          name: c.name,
          role: c.role || 'councilor',
          status: spokenAuthors.has(c.name) ? 'done' as const : 'idle' as const,
        }));

        const { yeas, nays, voteData } = mapVotes(session?.votes, session?.topic || '');

        setState({
          connected: true,
          phase: !hasSession ? 'idle' : messages.length > 0 ? 'debating' : 'opening',
          topic: session?.topic || null,
          mode: session?.mode || null,
          messages,
          councilors,
          stats: { messages: messages.length, yeas, nays },
          elapsed: sessionStartRef.current ? Date.now() - sessionStartRef.current : 0,
          viewerCount: null,
          voteData,
        });
      } catch {
        if (!cancelled) setState(prev => ({ ...prev, connected: false }));
      }
    };

    poll();
    const timer = setInterval(poll, pollMs);
    return () => { cancelled = true; clearInterval(timer); };
  }, [pollMs]);

  return state;
}

export default useLiveSession;
