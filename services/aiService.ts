/**
 * aiService.ts — Chamber AI provider service.
 *
 * Wiring (all real endpoints, no mocks):
 * - Chat: OpenAI-compatible POST {base}/chat/completions against the provider
 *   configured per-bot in Settings (LM Studio by default — the council
 *   servers' own configured provider, see council-api-server.cjs /
 *   council-server.js: LMSTUDIO_URL, default http://127.0.0.1:1234/v1).
 *   Supported authorTypes: lmstudio, ollama, jan_ai, openai_compatible,
 *   openrouter, gemini (via Google's OpenAI-compatible endpoint), zai,
 *   moonshot, minimax. Anything else throws a visible error.
 * - generateSpeech: Gemini TTS REST API (generativelanguage.googleapis.com)
 *   when a Gemini API key is available; returns base64 WAV. Without a key it
 *   returns null and the caller falls back to the browser's Web Speech API
 *   (window.speechSynthesis) — see council-app.tsx speakText().
 * - transcribeAudio: Gemini multimodal generateContent with inline audio.
 *   There is NO transcription endpoint on the council servers, so without a
 *   Gemini API key this throws an explanatory error (surfaced in the UI by
 *   MessageInput) instead of faking a transcript.
 */

import { AuthorType, BotConfig, Message, Settings } from '../council-types';
import { VOICE_MAP } from '../council-constants';

interface ResolvedProvider {
  baseUrl: string;
  apiKey?: string;
}

/** Accept either a base URL ("http://host:1234/v1") or a full chat URL
 *  ("http://host:1234/v1/chat/completions") as stored in Settings. */
function normalizeBaseUrl(raw?: string): string {
  if (!raw) return '';
  return raw.trim().replace(/\/chat\/completions\/?$/, '').replace(/\/+$/, '');
}

function resolveProvider(bot: BotConfig, settings: Settings): ResolvedProvider {
  const p = settings.providers;
  if (bot.endpoint) {
    return { baseUrl: normalizeBaseUrl(bot.endpoint), apiKey: bot.apiKey };
  }
  switch (bot.authorType) {
    case AuthorType.LM_STUDIO:
      return { baseUrl: normalizeBaseUrl(p.lmStudioEndpoint), apiKey: bot.apiKey };
    case AuthorType.OLLAMA:
      return { baseUrl: normalizeBaseUrl(p.ollamaEndpoint), apiKey: bot.apiKey };
    case AuthorType.JAN_AI:
      return { baseUrl: normalizeBaseUrl(p.janAiEndpoint), apiKey: bot.apiKey };
    case AuthorType.OPENAI_COMPATIBLE:
      return { baseUrl: normalizeBaseUrl(p.genericOpenAIEndpoint), apiKey: bot.apiKey || p.genericOpenAIKey };
    case AuthorType.OPENROUTER:
      return { baseUrl: 'https://openrouter.ai/api/v1', apiKey: bot.apiKey || p.openRouterKey };
    case AuthorType.GEMINI:
      return { baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', apiKey: bot.apiKey || p.geminiApiKey };
    case AuthorType.ZAI:
      return { baseUrl: normalizeBaseUrl(p.zaiEndpoint || 'https://api.zai.com/v1'), apiKey: bot.apiKey || p.zaiApiKey };
    case AuthorType.MOONSHOT:
      return { baseUrl: normalizeBaseUrl(p.moonshotEndpoint || 'https://api.moonshot.cn/v1'), apiKey: bot.apiKey || p.moonshotApiKey };
    case AuthorType.MINIMAX:
      return { baseUrl: normalizeBaseUrl(p.minimaxEndpoint || 'https://api.minimax.io/v1'), apiKey: bot.apiKey || p.minimaxApiKey };
    default:
      throw new Error(`No chat provider configured for bot "${bot.name}" (authorType: ${bot.authorType}).`);
  }
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<Record<string, unknown>>;
}

function buildMessages(bot: BotConfig, history: Message[], systemPrompt: string, settings: Settings): ChatMessage[] {
  let turns = history;
  if (settings.cost?.contextPruning && settings.cost.maxContextTurns > 0) {
    turns = history.slice(-settings.cost.maxContextTurns);
  }

  const messages: ChatMessage[] = [{ role: 'system', content: systemPrompt }];

  turns.forEach((m, idx) => {
    const isLast = idx === turns.length - 1;
    const role: 'user' | 'assistant' = m.authorType === AuthorType.HUMAN ? 'user' : 'assistant';
    const images = (m.attachments || []).filter(a => a.type === 'file' || a.type === 'image');
    if (isLast && role === 'user' && images.length > 0) {
      const parts: Array<Record<string, unknown>> = [{ type: 'text', text: `${m.author}: ${m.content}` }];
      for (const img of images) {
        const url = img.data.startsWith('data:') ? img.data : `data:${img.mimeType || 'image/png'};base64,${img.data}`;
        parts.push({ type: 'image_url', image_url: { url } });
      }
      messages.push({ role, content: parts });
    } else {
      messages.push({ role, content: `${m.author}: ${m.content}` });
    }
  });

  // The bot whose turn it is speaks next; make that explicit to the model.
  messages.push({ role: 'user', content: `You are ${bot.name}. Respond now, in character, following the system instruction.` });
  return messages;
}

async function chatCompletion(
  bot: BotConfig,
  history: Message[],
  systemPrompt: string,
  settings: Settings,
  stream: boolean,
): Promise<Response> {
  const { baseUrl, apiKey } = resolveProvider(bot, settings);
  if (!baseUrl) {
    throw new Error(`No endpoint configured for bot "${bot.name}" (${bot.authorType}). Set one in Settings → Providers.`);
  }
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: bot.model,
      messages: buildMessages(bot, history, systemPrompt, settings),
      temperature: settings.audio?.temperature ?? 0.7,
      stream,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Provider error ${res.status} from ${baseUrl}: ${detail.slice(0, 200)}`);
  }
  return res;
}

function extractContent(data: any): string {
  const msg = data?.choices?.[0]?.message;
  return msg?.content || msg?.reasoning_content || data?.choices?.[0]?.text || '';
}

/** Single (non-streaming) bot response. Throws on provider failure. */
export async function getBotResponse(
  bot: BotConfig,
  history: Message[],
  systemPrompt: string,
  settings: Settings,
): Promise<string> {
  const res = await chatCompletion(bot, history, systemPrompt, settings, false);
  const data = await res.json();
  return extractContent(data);
}

/**
 * Streaming bot response. Calls onChunk with the accumulated text so far.
 * Falls back to a single JSON parse when the provider does not answer with
 * an SSE stream (some OpenAI-compatible servers ignore `stream: true`).
 * Returns the full response text. Throws on provider failure.
 */
export async function streamBotResponse(
  bot: BotConfig,
  history: Message[],
  systemPrompt: string,
  settings: Settings,
  onChunk: (accumulated: string) => void,
): Promise<string> {
  const res = await chatCompletion(bot, history, systemPrompt, settings, true);
  const contentType = res.headers.get('content-type') || '';

  if (!contentType.includes('text/event-stream') || !res.body) {
    const data = await res.json();
    const full = extractContent(data);
    if (full) onChunk(full);
    return full;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  const handleLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) return;
    const payload = trimmed.slice(5).trim();
    if (payload === '[DONE]') return;
    try {
      const json = JSON.parse(payload);
      const delta = json?.choices?.[0]?.delta;
      const piece = delta?.content || delta?.reasoning_content || '';
      if (piece) {
        full += piece;
        onChunk(full);
      }
    } catch { /* keep-alive / partial line — ignore */ }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    lines.forEach(handleLine);
  }
  if (buffer) handleLine(buffer);
  return full;
}

// ─── Speech generation (Gemini TTS → base64 WAV; null = use Web Speech) ────

function pcm16ToWavBase64(pcmBase64: string, sampleRate = 24000): string {
  const binary = atob(pcmBase64);
  const pcm = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) pcm[i] = binary.charCodeAt(i);

  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const writeStr = (offset: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i)); };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + pcm.length, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, pcm.length, true);

  const wav = new Uint8Array(44 + pcm.length);
  wav.set(new Uint8Array(header), 0);
  wav.set(pcm, 44);
  let out = '';
  wav.forEach(b => { out += String.fromCharCode(b); });
  return btoa(out);
}

/**
 * Generate speech audio for `text` using the Gemini TTS API.
 * Returns base64-encoded WAV audio, or null when no Gemini API key is
 * available / the API fails — the caller then falls back to the browser
 * Web Speech API. Never fabricates audio.
 */
export async function generateSpeech(text: string, role: string, apiKey: string): Promise<string | null> {
  if (!apiKey) return null;
  const voiceName = VOICE_MAP[role] || 'Kore';
  try {
    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
          },
        }),
      },
    );
    if (!res.ok) {
      console.warn(`Gemini TTS failed (${res.status}); falling back to browser speech synthesis.`);
      return null;
    }
    const data = await res.json();
    const pcmBase64 = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!pcmBase64) return null;
    return pcm16ToWavBase64(pcmBase64);
  } catch (e) {
    console.warn('Gemini TTS unavailable; falling back to browser speech synthesis.', e);
    return null;
  }
}

// ─── Audio transcription (Gemini multimodal; no server endpoint exists) ────

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1] || '');
    reader.onerror = () => reject(new Error('Could not read recorded audio.'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Transcribe recorded audio via the Gemini multimodal API.
 * Throws a descriptive error when no Gemini API key is configured — the
 * council servers expose no transcription endpoint, and inventing a
 * transcript would be worse than failing visibly.
 */
export async function transcribeAudio(audioBlob: Blob, apiKey: string): Promise<string> {
  if (!apiKey) {
    throw new Error(
      'Voice transcription is not available: no Gemini API key is configured ' +
      '(set VITE_API_KEY or add one in Settings → Providers), and the council servers expose no transcription endpoint.',
    );
  }
  const data = await blobToBase64(audioBlob);
  const res = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: 'Transcribe this audio exactly, word for word. Return only the transcript.' },
            { inlineData: { mimeType: audioBlob.type || 'audio/wav', data } },
          ],
        }],
      }),
    },
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Transcription failed (${res.status}): ${detail.slice(0, 200)}`);
  }
  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('').trim();
  if (!text) throw new Error('Transcription returned no text.');
  return text;
}
