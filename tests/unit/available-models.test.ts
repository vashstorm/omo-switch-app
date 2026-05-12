import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  extractProviderModels,
  mergeAvailableModels,
  readProfileConfig,
  extractOpencodeModelSources,
  extractOhMyModelSources,
  mergeModelSources,
  sourcesToAvailableModels,
  readProfileConfigWithSources,
} from "../../src/shared/config/reader";
import type { RawConfig } from "../../src/shared/config/types";
import type { ResolvedProfile } from "../../src/shared/profiles/types";

describe("available models", () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map((dir) => fs.rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  it("extracts provider/model strings from provider.*.models keys", () => {
    const rawConfig: RawConfig = {
      provider: {
        anthropic: {
          models: {
            "claude-sonnet-4-6": { name: "Claude Sonnet 4.6" },
            "claude-opus-4-5": { name: "Claude Opus 4.5" },
          },
        },
        openai: {
          models: {
            "gpt-5.3-codex": { name: "GPT-5.3 Codex" },
          },
        },
      },
    };

    expect(extractProviderModels(rawConfig)).toEqual([
      "anthropic/claude-sonnet-4-6",
      "anthropic/claude-opus-4-5",
      "openai/gpt-5.3-codex",
    ]);
  });

  it("returns empty list for missing or invalid provider/models shape", () => {
    const noProvider: RawConfig = {};
    const invalidProvider: RawConfig = {
      provider: {
        broken: "value",
        noModels: {},
        invalidModels: {
          models: "not-an-object",
        },
      },
    };

    expect(extractProviderModels(noProvider)).toEqual([]);
    expect(extractProviderModels(invalidProvider)).toEqual([]);
  });

  it("merges baseline-first and deduplicates writable overlaps", () => {
    const baselineModels = ["openai/gpt-5.3-codex", "anthropic/claude-sonnet-4-6", "openai/gpt-5.3-codex-dup"];
    const writableModels = ["anthropic/claude-sonnet-4-6", "openai/gpt-5.4", "openai/gpt-5.4-mini"];

    expect(mergeAvailableModels(baselineModels, writableModels)).toEqual([
      "openai/gpt-5.3-codex",
      "anthropic/claude-sonnet-4-6",
      "openai/gpt-5.3-codex-dup",
      "openai/gpt-5.4",
      "openai/gpt-5.4-mini",
    ]);
  });

  it("returns availableModels sorted alphabetically from both config files", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "omo-switch-models-"));
    tempDirs.push(tempDir);

    const opencodePath = path.join(tempDir, "opencode.jsonc");
    const ohMyPath = path.join(tempDir, "oh-my-openagent.jsonc");

    await fs.writeFile(
      opencodePath,
      JSON.stringify(
        {
          provider: {
            baseProvider: {
              models: {
                "gpt-5.3-codex": { name: "GPT-5.3 Codex" },
                "claude-sonnet-4-6": { name: "Claude Sonnet 4.6" },
              },
            },
          },
        },
        null,
        2,
      ),
      "utf-8",
    );

    await fs.writeFile(
      ohMyPath,
      JSON.stringify(
        {
          provider: {
            writableProvider: {
              models: {
                "claude-sonnet-4-6": { name: "Overlap" },
                "gpt-5.4": { name: "Writable Only" },
              },
            },
          },
        },
        null,
        2,
      ),
      "utf-8",
    );

    const resolvedProfile: ResolvedProfile = {
      id: "default",
      label: "default",
      opencodePath,
      ohMyOpencodePath: ohMyPath,
    };

    const result = await readProfileConfig(resolvedProfile);
    expect(result.availableModels).toEqual([
      "baseProvider/claude-sonnet-4-6",
      "baseProvider/gpt-5.3-codex",
      "writableProvider/claude-sonnet-4-6",
      "writableProvider/gpt-5.4",
    ]);
  });
});

describe("model provenance extraction", () => {
  it("extracts opencode provider models with correct provenance", () => {
    const rawConfig: RawConfig = {
      provider: {
        anthropic: {
          models: {
            "claude-sonnet-4-6": { name: "Claude Sonnet 4.6" },
          },
        },
      },
    };

    const sources = extractOpencodeModelSources(rawConfig, "/path/to/opencode.jsonc", "test-profile");

    expect(sources).toHaveLength(1);
    expect(sources[0]).toEqual({
      model: "anthropic/claude-sonnet-4-6",
      sourceType: "profile-opencode",
      sourceLabel: "profile config (opencode.jsonc)",
      configPath: "/path/to/opencode.jsonc",
      profileId: "test-profile",
    });
  });

  it("extracts oh-my-openagent referenced models from agents", () => {
    const rawConfig: RawConfig = {
      agents: {
        planner: {
          model: "openai/gpt-5.4",
          fallback_models: ["anthropic/claude-sonnet-4-6"],
          ultrawork: {
            model: "openai/gpt-5.3-codex",
          },
        },
      },
    };

    const sources = extractOhMyModelSources(rawConfig, "/path/to/oh-my-openagent.jsonc", "test-profile");

    expect(sources).toHaveLength(3);
    expect(sources.map((s) => s.model)).toEqual([
      "openai/gpt-5.4",
      "openai/gpt-5.3-codex",
      "anthropic/claude-sonnet-4-6",
    ]);
    expect(sources[0].sourceType).toBe("profile-oh-my-openagent");
    expect(sources[0].sourceLabel).toBe("profile config (oh-my-openagent.jsonc)");
  });

  it("extracts oh-my-openagent referenced models from categories", () => {
    const rawConfig: RawConfig = {
      categories: {
        backend: {
          model: "openai/gpt-5.4",
          fallback_models: ["anthropic/claude-sonnet-4-6"],
        },
      },
    };

    const sources = extractOhMyModelSources(rawConfig, "/path/to/oh-my-openagent.jsonc", "test-profile");

    expect(sources).toHaveLength(2);
    expect(sources.map((s) => s.model)).toEqual([
      "openai/gpt-5.4",
      "anthropic/claude-sonnet-4-6",
    ]);
  });

  it("deduplicates models within oh-my-openagent extraction", () => {
    const rawConfig: RawConfig = {
      agents: {
        planner: { model: "openai/gpt-5.4" },
        coder: { model: "openai/gpt-5.4" },
      },
    };

    const sources = extractOhMyModelSources(rawConfig, "/path/to/oh-my-openagent.jsonc", "test-profile");

    expect(sources).toHaveLength(1);
    expect(sources[0].model).toBe("openai/gpt-5.4");
  });

  it("merges model sources preserving all entries", () => {
    const globalSources = [
      { model: "openai/gpt-5.4", sourceType: "global" as const, sourceLabel: "global config", configPath: "/global" },
    ];
    const opencodeSources = [
      { model: "anthropic/claude-sonnet-4-6", sourceType: "profile-opencode" as const, sourceLabel: "opencode", configPath: "/opencode", profileId: "test" },
    ];
    const ohMySources = [
      { model: "openai/gpt-5.4", sourceType: "profile-oh-my-openagent" as const, sourceLabel: "oh-my", configPath: "/oh-my", profileId: "test" },
    ];

    const merged = mergeModelSources(globalSources, opencodeSources, ohMySources);

    expect(merged).toHaveLength(3);
    expect(merged[0].sourceType).toBe("global");
    expect(merged[1].sourceType).toBe("profile-opencode");
    expect(merged[2].sourceType).toBe("profile-oh-my-openagent");
  });

  it("converts sources to sorted unique availableModels", () => {
    const sources = [
      { model: "openai/gpt-5.4", sourceType: "global" as const, sourceLabel: "global", configPath: "/global" },
      { model: "anthropic/claude-sonnet-4-6", sourceType: "profile-opencode" as const, sourceLabel: "opencode", configPath: "/opencode", profileId: "test" },
      { model: "openai/gpt-5.4", sourceType: "profile-oh-my-openagent" as const, sourceLabel: "oh-my", configPath: "/oh-my", profileId: "test" },
    ];

    const models = sourcesToAvailableModels(sources);

    expect(models).toEqual(["anthropic/claude-sonnet-4-6", "openai/gpt-5.4"]);
  });

  it("readProfileConfigWithSources returns modelSources with provenance", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "omo-switch-provenance-"));

    const opencodePath = path.join(tempDir, "opencode.jsonc");
    const ohMyPath = path.join(tempDir, "oh-my-openagent.jsonc");

    await fs.writeFile(
      opencodePath,
      JSON.stringify({
        provider: {
          baseProvider: {
            models: {
              "gpt-5.3-codex": { name: "GPT-5.3 Codex" },
            },
          },
        },
      }),
      "utf-8",
    );

    await fs.writeFile(
      ohMyPath,
      JSON.stringify({
        agents: {
          planner: { model: "openai/gpt-5.4" },
        },
      }),
      "utf-8",
    );

    const resolvedProfile: ResolvedProfile = {
      id: "test-profile",
      label: "Test Profile",
      opencodePath,
      ohMyOpencodePath: ohMyPath,
    };

    const result = await readProfileConfigWithSources(resolvedProfile);

    expect(result.modelSources).toHaveLength(2);
    expect(result.modelSources[0].sourceType).toBe("profile-opencode");
    expect(result.modelSources[1].sourceType).toBe("profile-oh-my-openagent");
    expect(result.availableModels).toEqual(["baseProvider/gpt-5.3-codex", "openai/gpt-5.4"]);

    await fs.rm(tempDir, { recursive: true, force: true });
  });
});