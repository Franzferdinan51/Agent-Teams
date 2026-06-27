/**
 * Agent Teams MoA — OpenClaw Plugin
 *
 * Exposes Mixture of Agents (MoA) as native OpenClaw tools.
 * Calls the council-server.js REST API (default: localhost:3007).
 *
 * Based on Hermes Agent MoA design by Nous Research.
 * https://github.com/nousresearch/hermes-agent
 */

import { Type } from "typebox";
import { defineToolPlugin } from "openclaw/plugin-sdk/tool-plugin";

// ─── Config ──────────────────────────────────────────────────────────────────

interface PluginConfig {
  councilUrl?: string;  // e.g. "http://localhost:3007"
  defaultPreset?: string;
}

function getCouncilUrl(config: PluginConfig): string {
  return (config.councilUrl || process.env.COUNCIL_SERVER_URL || "http://localhost:3007").replace(/\/$/, "");
}

// ─── REST helpers ─────────────────────────────────────────────────────────────

async function councilGet<T = unknown>(path: string, config: PluginConfig): Promise<T> {
  const url = `${getCouncilUrl(config)}${path}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Council GET ${path} → ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

async function councilPost<T = unknown>(path: string, body: unknown, config: PluginConfig): Promise<T> {
  const url = `${getCouncilUrl(config)}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Council POST ${path} → ${res.status}: ${(json as {error?:string}).error ?? res.statusText}`);
  return json as Promise<T>;
}

// ─── API response types ───────────────────────────────────────────────────────

interface PresetSummary {
  name: string;
  enabled: boolean;
  ref_count: number;
  aggregator: string;
  reference_temperature: number;
  aggregator_temperature: number;
}

interface PresetDetail {
  reference_models: Array<{ provider: string; model: string }>;
  aggregator: { provider: string; model: string };
  reference_temperature: number;
  aggregator_temperature: number;
  reference_max_tokens: number;
  enabled: boolean;
  description?: string;
}

interface MoaRunResult {
  response: string;
  references: Array<{ label: string; text: string }>;
  preset: string;
  aggregator: string;
}

// ─── Plugin definition ────────────────────────────────────────────────────────

export default defineToolPlugin({
  id: "agent-teams-mo",
  name: "Agent Teams MoA",
  description:
    "Run Mixture of Agents (MoA) — multiple reference models analyze in parallel, an aggregator synthesizes their advice. " +
    "Based on Hermes Agent MoA by Nous Research. Requires council-server.js running (default: localhost:3007).",

  configSchema: Type.Object({
    councilUrl: Type.Optional(
      Type.String({ description: "Council server URL. Default: http://localhost:3007" }),
    ),
    defaultPreset: Type.Optional(
      Type.String({ description: "Default MoA preset. Default: 'default'" }),
    ),
  }),

  tools: (tool) => [
    // ── moa_run ──────────────────────────────────────────────────────────────
    tool({
      name: "moa_run",
      label: "Run MoA",
      description:
        "Run Mixture of Agents: reference models analyze the task in parallel, the aggregator synthesizes their advice into one response. " +
        "Specify a preset to choose which models and temperature settings to use. Pass conversation history for multi-turn context.",
      parameters: Type.Object({
        prompt: Type.String({ description: "The task or question to ask MoA." }),
        preset: Type.Optional(
          Type.String({ description: "Preset name ('tiny', 'default', 'coding', 'security'). Default: 'default'." }),
        ),
        history: Type.Optional(
          Type.Array(
            Type.Object({
              role: Type.String(),
              content: Type.String(),
            }),
            { description: "Conversation history for multi-turn context. Each entry: {role, content}." },
          ),
        ),
      }),
      async execute({ prompt, preset, history }, config) {
        const presetName = preset || (config as PluginConfig).defaultPreset || "default";
        try {
          const result = await councilPost<MoaRunResult>(
            "/api/moa/run",
            { prompt, preset: presetName, history: history || [] },
            config as PluginConfig,
          );

          const refLines = result.references
            .map((r, i) => `[${i + 1}] ${r.label}: ${r.text.slice(0, 300)}${r.text.length > 300 ? "…" : ""}`)
            .join("\n");

          const text = result.references.length > 0
            ? `Preset: ${result.preset}\nAggregator: ${result.aggregator}\n\nReferences:\n${refLines}\n\nAggregator:\n${result.response}`
            : `No references available. Aggregator response:\n${result.response}`;

          return { content: [{ type: "text", text }] };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          // Friendly error if council-server is not running
          if (msg.includes("fetch") || msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND")) {
            return {
              content: [
                {
                  type: "text",
                  text: `Cannot reach council-server at ${getCouncilUrl(config as PluginConfig)}. ` +
                    `Is it running? Start with: node council-server.js`,
                },
              ],
            };
          }
          return { content: [{ type: "text", text: `MoA error: ${msg}` }] };
        }
      },
    }),

    // ── moa_list_presets ───────────────────────────────────────────────────
    tool({
      name: "moa_list_presets",
      label: "List MoA Presets",
      description: "List all available MoA presets with their model counts and aggregator info.",
      parameters: Type.Object({}),
      async execute(_, config) {
        try {
          const body = await councilGet<{ presets: PresetSummary[] }>(
            "/api/moa/presets",
            config as PluginConfig,
          );
          const lines = body.presets
            .map(p => `${p.name}  [${p.enabled ? "ON" : "OFF"}]  ${p.ref_count} refs → ${p.aggregator}`)
            .join("\n");
          return { content: [{ type: "text", text: `MoA Presets:\n${lines}` }] };
        } catch (err) {
          return {
            content: [
              {
                type: "text",
                text: `Failed to list presets: ${err instanceof Error ? err.message : String(err)}. ` +
                  `Is council-server.js running?`,
              },
            ],
          };
        }
      },
    }),

    // ── moa_get_preset ─────────────────────────────────────────────────────
    tool({
      name: "moa_get_preset",
      label: "Get MoA Preset",
      description: "Get the full configuration of a named MoA preset.",
      parameters: Type.Object({
        name: Type.String({ description: "Preset name (e.g. 'tiny', 'default', 'coding')." }),
      }),
      async execute({ name }, config) {
        try {
          const body = await councilGet<{ preset: PresetDetail }>(
            `/api/moa/presets/${encodeURIComponent(name)}`,
            config as PluginConfig,
          );
          if (!body.preset) {
            return { content: [{ type: "text", text: `Preset '${name}' not found.` }] };
          }
          const p = body.preset;
          const refs = p.reference_models.map(m => `  - ${m.provider}:${m.model}`).join("\n");
          return {
            content: [
              {
                type: "text",
                text:
                  `Preset: ${name}\n` +
                  `Description: ${p.description ?? "—"}\n` +
                  `Enabled: ${p.enabled}\n` +
                  `Reference temperature: ${p.reference_temperature}\n` +
                  `Aggregator temperature: ${p.aggregator_temperature}\n` +
                  `Max tokens: ${p.reference_max_tokens}\n` +
                  `References (${p.reference_models.length}):\n${refs}\n` +
                  `Aggregator: ${p.aggregator.provider}:${p.aggregator.model}`,
              },
            ],
          };
        } catch (err) {
          return {
            content: [
              {
                type: "text",
                text: `Failed to get preset '${name}': ${err instanceof Error ? err.message : String(err)}`,
              },
            ],
          };
        }
      },
    }),

    // ── moa_save_preset ────────────────────────────────────────────────────
    tool({
      name: "moa_save_preset",
      label: "Save MoA Preset",
      description:
        "Create or update an MoA preset. Requires full preset configuration including reference models and aggregator.",
      parameters: Type.Object({
        name: Type.String({ description: "Preset name to create or overwrite." }),
        preset_config: Type.Object({
          description: Type.Optional(Type.String()),
          reference_models: Type.Array(
            Type.Object({
              provider: Type.String(),
              model: Type.String(),
            }),
          ),
          aggregator: Type.Object({
            provider: Type.String(),
            model: Type.String(),
          }),
          reference_temperature: Type.Optional(Type.Number()),
          aggregator_temperature: Type.Optional(Type.Number()),
          reference_max_tokens: Type.Optional(Type.Number()),
          enabled: Type.Optional(Type.Boolean()),
        }),
      }),
      async execute({ name, preset_config }, config) {
        try {
          const body = await councilPost<{ message: string }>(
            "/api/moa/presets",
            { preset_name: name, preset_config },
            config as PluginConfig,
          );
          return { content: [{ type: "text", text: `✅ ${body.message}` }] };
        } catch (err) {
          return {
            content: [
              {
                type: "text",
                text: `Failed to save preset '${name}': ${err instanceof Error ? err.message : String(err)}`,
              },
            ],
          };
        }
      },
    }),

    // ── moa_delete_preset ─────────────────────────────────────────────────
    tool({
      name: "moa_delete_preset",
      label: "Delete MoA Preset",
      description: "Delete a named MoA preset. Built-in presets (tiny, default, coding, security) cannot be deleted.",
      parameters: Type.Object({
        name: Type.String({ description: "Preset name to delete." }),
      }),
      async execute({ name }, config) {
        try {
          const body = await councilPost<{ message: string }>(
            `/api/moa/presets/${encodeURIComponent(name)}`,
            {},
            config as PluginConfig,
          );
          return { content: [{ type: "text", text: body.message }] };
        } catch (err) {
          return {
            content: [
              {
                type: "text",
                text: `Failed to delete preset '${name}': ${err instanceof Error ? err.message : String(err)}`,
              },
            ],
          };
        }
      },
    }),
  ],
});
