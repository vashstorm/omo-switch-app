import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { writeProfileConfig } from "../../src/shared/config-writer";
import type { EditableConfig } from "../../src/shared/config/types";
import type { ResolvedProfile } from "../../src/shared/profiles/types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("save conflict", () => {
  let tempDir = "";
  let configPath = "";
  let resolvedProfile: ResolvedProfile;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "omo-switch-conflict-"));
    configPath = path.join(tempDir, "oh-my-openagent.jsonc");

    await fs.writeFile(
      configPath,
      '{\n  "agents": {\n    "planner": {\n      "model": "gpt-5"\n    }\n  }\n}',
      "utf-8",
    );

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

  it("returns conflict when mtime no longer matches and does not overwrite file", async () => {
    const originalStat = await fs.stat(configPath);

    const firstPayload: EditableConfig = {
      agents: {
        planner: {
          model: "gpt-5-mini",
        },
      },
      categories: {},
      misc: {},
    };

    const firstResult = await writeProfileConfig(
      resolvedProfile,
      firstPayload,
      originalStat.mtimeMs,
    );

    expect(firstResult.success).toBe(true);
    if (!firstResult.success) {
      return;
    }

    const externalContent = '{\n  "agents": {\n    "planner": {\n      "model": "external-change"\n    }\n  }\n}';
    await fs.writeFile(configPath, externalContent, "utf-8");
    const bumpedTime = new Date(Math.floor(firstResult.mtime) + 2_000);
    await fs.utimes(configPath, bumpedTime, bumpedTime);

    const secondPayload: EditableConfig = {
      agents: {
        planner: {
          model: "should-not-be-saved",
        },
      },
      categories: {},
      misc: {},
    };

    const conflictResult = await writeProfileConfig(
      resolvedProfile,
      secondPayload,
      firstResult.mtime,
    );

    expect(conflictResult).toEqual({
      success: false,
      conflict: true,
      message: "File modified externally. Please reload.",
    });

    const finalContent = await fs.readFile(configPath, "utf-8");
    expect(finalContent).toBe(externalContent);
    expect(finalContent).not.toContain("should-not-be-saved");
  });
});
