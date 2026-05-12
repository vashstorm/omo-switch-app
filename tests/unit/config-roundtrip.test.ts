import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "jsonc-parser";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { writeProfileConfig } from "../../src/shared/config-writer";
import type { EditableConfig } from "../../src/shared/config/types";
import type { ResolvedProfile } from "../../src/shared/profiles/types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("config writer roundtrip", () => {
  let tempDir = "";
  let configPath = "";
  let resolvedProfile: ResolvedProfile;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "omo-switch-roundtrip-"));
    configPath = path.join(tempDir, "oh-my-openagent.jsonc");

    const content = `{
  // top-level comment should remain
  "agents": {
    // planner comment should remain
    "planner": {
      "model": "gpt-5",
      "variant": "medium",
      "unknown_agent_field": "preserve-me"
    }
  },
  "custom": {
    "deep": {
      "value": 123
    }
  }
}`;

    await fs.writeFile(configPath, content, "utf-8");

    resolvedProfile = {
      id: "test",
      label: "Test",
      opencodePath: path.join(__dirname, "../fixtures/config/minimal-opencode.jsonc"),
      ohMyOpencodePath: configPath,
    };
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("preserves unknown fields and comments while updating managed fields", async () => {
    const initialStat = await fs.stat(configPath);

    const payload: EditableConfig = {
      agents: {
        planner: {
          model: "gpt-5-mini",
        },
      },
      categories: {},
      misc: {},
    };

    const result = await writeProfileConfig(
      resolvedProfile,
      payload,
      initialStat.mtimeMs,
    );

    expect(result.success).toBe(true);

    const saved = await fs.readFile(configPath, "utf-8");
    const data = parse(saved) as Record<string, any>;

    expect(data.agents.planner.model).toBe("gpt-5-mini");
    expect(data.agents.planner.unknown_agent_field).toBe("preserve-me");
    expect(data.custom.deep.value).toBe(123);

    expect(saved).toContain("// top-level comment should remain");
    expect(saved).toContain("// planner comment should remain");
  });

  it("omits empty-string category from serialized JSON", async () => {
    const initialStat = await fs.stat(configPath);

    const payload: EditableConfig = {
      agents: {
        "sisyphus-junior": {
          model: "gpt-5",
          category: "", // Empty string = None sentinel
        },
      },
      categories: {},
      misc: {},
    };

    const result = await writeProfileConfig(
      resolvedProfile,
      payload,
      initialStat.mtimeMs,
    );

    expect(result.success).toBe(true);

    const saved = await fs.readFile(configPath, "utf-8");
    const data = parse(saved) as Record<string, any>;

    // sisyphus-junior should exist with model but NO category key
    expect(data.agents["sisyphus-junior"]).toBeDefined();
    expect(data.agents["sisyphus-junior"].model).toBe("gpt-5");
    expect(data.agents["sisyphus-junior"].category).toBeUndefined();
    // Verify category key is not present at all (not just undefined)
    expect("category" in data.agents["sisyphus-junior"]).toBe(false);
  });

  it("preserves valid non-empty category string in serialized JSON", async () => {
    const initialStat = await fs.stat(configPath);

    const payload: EditableConfig = {
      agents: {
        "sisyphus-junior": {
          model: "gpt-5",
          category: "visual-engineering",
        },
      },
      categories: {},
      misc: {},
    };

    const result = await writeProfileConfig(
      resolvedProfile,
      payload,
      initialStat.mtimeMs,
    );

    expect(result.success).toBe(true);

    const saved = await fs.readFile(configPath, "utf-8");
    const data = parse(saved) as Record<string, any>;

    // sisyphus-junior should have category preserved
    expect(data.agents["sisyphus-junior"]).toBeDefined();
    expect(data.agents["sisyphus-junior"].category).toBe("visual-engineering");
  });
});
