import { describe, expect, it } from "vitest";
import entry from "./index.js";
import { getToolPluginMetadata } from "openclaw/plugin-sdk/tool-plugin";

describe("agent-teams-mo", () => {
  it("declares tool metadata", () => {
    expect(getToolPluginMetadata(entry)?.tools.map((tool) => tool.name)).toEqual([
      "moa_run",
      "moa_list_presets",
      "moa_get_preset",
      "moa_save_preset",
      "moa_delete_preset",
    ]);
  });
});
