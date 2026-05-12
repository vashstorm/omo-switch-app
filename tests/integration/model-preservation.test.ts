import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parse } from "jsonc-parser";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { readProfileConfig } from "../../src/shared/config";
import { writeProfileConfig } from "../../src/shared/config-writer";
import {
  AGENT_MANAGED_FIELDS,
  CATEGORY_MANAGED_FIELDS,
  MISC_MANAGED_FIELDS,
} from "../../src/shared/managed-fields";
import type { EditableConfig } from "../../src/shared/config/types";
import type { ResolvedProfile } from "../../src/shared/profiles/types";

describe("model preservation during save", () => {
  let tempDir = "";
  let resolvedProfile: ResolvedProfile;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "omo-switch-preserve-"));

    const profileDir = path.join(tempDir, "default");
    await fs.mkdir(profileDir, { recursive: true });

    const opencodePath = path.join(profileDir, "opencode.jsonc");
    const ohMyOpencodePath = path.join(profileDir, "oh-my-openagent.jsonc");

    await fs.writeFile(
      opencodePath,
      JSON.stringify(
        {
          provider: {
            baselineProvider: {
              models: {
                "gpt-5.3-codex": { name: "Baseline" },
              },
            },
          },
          agents: {
            planner: {
              model: "baselineProvider/gpt-5.3-codex",
            },
          },
        },
        null,
        2,
      ),
      "utf-8",
    );

    await fs.writeFile(
      ohMyOpencodePath,
      JSON.stringify(
        {
          provider: {
            writableProvider: {
              models: {
                "gpt-5.4": { name: "Writable model" },
              },
            },
          },
          agents: {
            planner: {
              model: "baselineProvider/gpt-5.3-codex",
              variant: "low",
            },
          },
        },
        null,
        2,
      ),
      "utf-8",
    );

    resolvedProfile = {
      id: "default",
      label: "default",
      opencodePath,
      ohMyOpencodePath,
    };
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("keeps provider.models untouched and still discoverable after save", async () => {
    expect(Object.keys(AGENT_MANAGED_FIELDS)).not.toContain("provider");
    expect(Object.keys(CATEGORY_MANAGED_FIELDS)).not.toContain("provider");
    expect(Object.keys(MISC_MANAGED_FIELDS)).not.toContain("provider");

    const beforeRead = await readProfileConfig(resolvedProfile);
    expect(beforeRead.availableModels).toEqual([
      "baselineProvider/gpt-5.3-codex",
      "writableProvider/gpt-5.4",
    ]);

    const payload: EditableConfig = {
      agents: {
        planner: {
          model: "baselineProvider/gpt-5.3-codex",
          variant: "high",
        },
      },
      categories: {},
      misc: {},
    };

    const writeResult = await writeProfileConfig(
      resolvedProfile,
      payload,
      beforeRead.mtime,
    );
    expect(writeResult.success).toBe(true);

    const savedText = await fs.readFile(resolvedProfile.ohMyOpencodePath, "utf-8");
    const savedData = parse(savedText) as {
      provider: {
        writableProvider: {
          models: Record<string, unknown>;
        };
      };
    };
    expect(savedData.provider.writableProvider.models["gpt-5.4"]).toBeDefined();

    const afterRead = await readProfileConfig(resolvedProfile);
    expect(afterRead.availableModels).toEqual([
      "baselineProvider/gpt-5.3-codex",
      "writableProvider/gpt-5.4",
    ]);
  });

  it("returns availableModelGroups alongside availableModels", async () => {
    const result = await readProfileConfig(resolvedProfile);

    expect(result.availableModels).toEqual([
      "baselineProvider/gpt-5.3-codex",
      "writableProvider/gpt-5.4",
    ]);
    expect(result.availableModelGroups).toBeDefined();
    expect(Array.isArray(result.availableModelGroups)).toBe(true);
    expect(result.availableModelGroups.length).toBeGreaterThan(0);

    const group = result.availableModelGroups[0];
    expect(group).toHaveProperty("provider");
    expect(group).toHaveProperty("label");
    expect(group).toHaveProperty("models");
    expect(Array.isArray(group.models)).toBe(true);

    const modelOption = group.models[0];
    expect(modelOption).toHaveProperty("id");
    expect(modelOption).toHaveProperty("label");
    expect(modelOption).toHaveProperty("provider");
  });
});
