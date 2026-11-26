/**
 * CouncilOrchestrationService.ts — coordination-pattern engine for the Chamber.
 *
 * There is no orchestration backend on the council servers (:3001 exposes
 * delegate_to / coordinate_agents MCP tools, but they return static
 * "queued"/"in_progress" acknowledgements without executing anything, so
 * wiring the panel to them would fake orchestration). This service is
 * therefore a real client-side engine: councilor selection is a transparent
 * keyword heuristic over the actual roster, and runByPattern() executes real
 * councilor turns through the caller's processBotTurn (which goes through
 * aiService to the configured LLM provider). Events are emitted for the
 * OrchestrationPanel's live status display. Nothing is simulated: if no
 * turn runner is supplied, runByPattern throws.
 */

import { BotConfig, Message, SessionMode, Settings, AuthorType } from '../council-types';

export type CoordinationPattern =
  | 'orchestrator-subagent'
  | 'agent-teams'
  | 'generator-verifier'
  | 'message-bus'
  | 'shared-state';

export const COORDINATION_PATTERNS: CoordinationPattern[] = [
  'orchestrator-subagent',
  'agent-teams',
  'generator-verifier',
  'message-bus',
  'shared-state',
];

/** Recommended pattern per session mode (also used for the panel label). */
const MODE_PATTERN: Partial<Record<SessionMode, CoordinationPattern>> = {
  [SessionMode.SWARM_CODING]: 'orchestrator-subagent',
  [SessionMode.GOVERNMENT]: 'orchestrator-subagent',
  [SessionMode.RESEARCH]: 'orchestrator-subagent',
  [SessionMode.SWARM]: 'agent-teams',
  [SessionMode.PREDICTION]: 'agent-teams',
  [SessionMode.INSPECTOR]: 'generator-verifier',
  [SessionMode.INQUIRY]: 'message-bus',
  [SessionMode.PROPOSAL]: 'shared-state',
  [SessionMode.DELIBERATION]: 'shared-state',
};

export interface OrchestratorSession {
  id: string;
  pattern: CoordinationPattern;
  topic: string;
  mode: SessionMode;
  phase: string;
  startedAt: number;
  councilorIds: string[];
}

export interface OrchestrationEvent {
  type: string;
  data: any;
  timestamp: number;
}

export interface OrchestrationDashboard {
  activeSession: OrchestratorSession | null;
  eventLogCount: number;
  sharedStateKeys: string[];
  patterns: CoordinationPattern[];
}

type EventHandler = (event: OrchestrationEvent) => void;
type ProcessBotTurn = (
  bot: BotConfig,
  history: Message[],
  systemPrompt: string,
  roleLabel?: string,
) => Promise<string>;

const COUNCILOR_TEMPLATE =
  'TOPIC UNDER DELIBERATION: {{TOPIC}}\n\nPresent your position to the council: your analysis, ' +
  'your reasoning, and a clear stance. Address the strongest counter-argument you expect.';

const VERIFIER_TEMPLATE =
  'TOPIC UNDER DELIBERATION: {{TOPIC}}\n\nYou are the verifier. Review the councilor statements ' +
  'in the transcript: flag unsupported claims, contradictions, and gaps, then state what survives scrutiny.';

export class CouncilOrchestrationService {
  private handlers = new Map<string, Set<EventHandler>>();
  private session: OrchestratorSession | null = null;
  private eventLog: OrchestrationEvent[] = [];
  private sharedState = new Map<string, unknown>();

  onEvent(type: string, handler: EventHandler): () => void {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler);
    return () => this.handlers.get(type)?.delete(handler);
  }

  private emit(type: string, data: any): void {
    const event: OrchestrationEvent = { type, data, timestamp: Date.now() };
    this.eventLog.push(event);
    this.handlers.get(type)?.forEach(h => h(event));
  }

  getSession(): OrchestratorSession | null {
    return this.session;
  }

  getPatterns(): CoordinationPattern[] {
    return [...COORDINATION_PATTERNS];
  }

  recommendedPattern(mode: SessionMode): CoordinationPattern {
    return MODE_PATTERN[mode] || 'shared-state';
  }

  getDashboard(): OrchestrationDashboard {
    return {
      activeSession: this.session,
      eventLogCount: this.eventLog.length,
      sharedStateKeys: [...this.sharedState.keys()],
      patterns: this.getPatterns(),
    };
  }

  /**
   * Select councilors for a topic. Speaker and moderator are always seated;
   * the remaining seats are ranked by keyword overlap between the topic and
   * each councilor's name/role/persona. Emits a 'councilor' event with the
   * selection (the panel renders it).
   */
  selectCouncilorsForTopic(councilors: BotConfig[], topic: string, mode: SessionMode): BotConfig[] {
    const enabled = councilors.filter(c => c.enabled);
    const leadership = enabled.filter(c => c.role === 'speaker' || c.role === 'moderator');
    const rest = enabled.filter(c => c.role !== 'speaker' && c.role !== 'moderator');

    const topicTerms = topic.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 2);
    const scored = rest.map(bot => {
      const haystack = `${bot.name} ${bot.role} ${bot.persona}`.toLowerCase();
      const score = topicTerms.reduce((acc, t) => acc + (haystack.includes(t) ? 1 : 0), 0);
      return { bot, score };
    });
    scored.sort((a, b) => b.score - a.score);

    const selected = [...leadership, ...scored.map(s => s.bot)];
    this.emit('councilor', { selected, topic, mode });
    return selected;
  }

  /**
   * Run a deliberation under the currently recommended pattern for `mode`,
   * executing real turns via the caller's processBotTurn.
   * Returns the messages produced (also appended to the running history).
   */
  async runByPattern(
    topic: string,
    councilors: BotConfig[],
    speaker: BotConfig | undefined,
    history: Message[],
    settings: Settings,
    mode: SessionMode,
    injectTopic: (template: string) => string,
    processBotTurn: ProcessBotTurn,
  ): Promise<Message[]> {
    if (typeof processBotTurn !== 'function') {
      throw new Error('CouncilOrchestrationService.runByPattern requires a processBotTurn runner (aiService-backed).');
    }
    const pattern = this.recommendedPattern(mode);
    const seated = councilors.filter(c => c.enabled && c.role !== 'speaker' && c.role !== 'moderator');
    const produced: Message[] = [];
    const runningHistory = [...history];

    this.session = {
      id: `orch-${Date.now()}`,
      pattern,
      topic,
      mode,
      phase: 'plan',
      startedAt: Date.now(),
      councilorIds: seated.map(c => c.id),
    };
    this.emit('phase', { phase: 'plan' });
    this.emit('councilor', { selected: seated, topic, mode });

    const runTurn = async (bot: BotConfig): Promise<void> => {
      const res = await processBotTurn(
        bot,
        runningHistory,
        `${injectTopic(COUNCILOR_TEMPLATE)} Persona: ${bot.persona}`,
        bot.role.toUpperCase(),
      );
      const msg: Message = {
        id: `orch-${bot.id}-${Date.now()}`,
        author: bot.name,
        authorType: bot.authorType || AuthorType.LM_STUDIO,
        content: res,
        roleLabel: bot.role,
      };
      runningHistory.push(msg);
      produced.push(msg);
      this.sharedState.set(`statement:${bot.id}`, res);
      this.emit('task', { status: 'done', botId: bot.id });
    };

    this.session.phase = 'execute';
    this.emit('phase', { phase: 'execute' });

    if (pattern === 'agent-teams' || pattern === 'message-bus') {
      // Parallel: every councilor speaks from the same starting transcript.
      const baseHistory = [...runningHistory];
      await Promise.all(seated.map(async bot => {
        const res = await processBotTurn(
          bot,
          baseHistory,
          `${injectTopic(COUNCILOR_TEMPLATE)} Persona: ${bot.persona}`,
          bot.role.toUpperCase(),
        );
        const msg: Message = {
          id: `orch-${bot.id}-${Date.now()}`,
          author: bot.name,
          authorType: bot.authorType || AuthorType.LM_STUDIO,
          content: res,
          roleLabel: bot.role,
        };
        produced.push(msg);
        this.sharedState.set(`statement:${bot.id}`, res);
        this.emit('task', { status: 'done', botId: bot.id });
      }));
    } else {
      // Sequential patterns (orchestrator-subagent, generator-verifier,
      // shared-state): each councilor hears the previous statements.
      for (const bot of seated) {
        await runTurn(bot);
      }
    }

    if (pattern === 'generator-verifier' && speaker) {
      this.session.phase = 'critic';
      this.emit('phase', { phase: 'critic' });
      const verdict = await processBotTurn(
        speaker,
        runningHistory,
        `${injectTopic(VERIFIER_TEMPLATE)} Persona: ${speaker.persona}`,
        'VERIFIER',
      );
      produced.push({
        id: `orch-verify-${Date.now()}`,
        author: speaker.name,
        authorType: speaker.authorType,
        content: verdict,
        roleLabel: 'VERIFIER',
      });
      this.emit('task', { status: 'done', botId: speaker.id });
    }

    this.session.phase = 'learn';
    this.emit('meta', { phase: 'learn', pattern, statements: produced.length });
    this.emit('phase', { phase: 'learn' });
    void settings; // settings are consumed by processBotTurn; kept for signature parity with the panel.
    return produced;
  }
}
