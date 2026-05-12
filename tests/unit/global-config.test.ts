import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  extractGlobalModels,
  extractGlobalModelSources,
  getAppZoomPercent,
  readGlobalConfig,
  getDisabledProviders,
  normalizeAppZoomPercent,
  resolveGlobalConfigPath,
  validateExplicitGlobalConfig,
} from "../../src/shared/config/global-config";

let tempDir: string;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "global-config-test-"));
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

function homeDir(): string {
  return process.env.HOME || process.env.USERPROFILE || os.homedir();
}

describe("resolveGlobalConfigPath", () => {
  it("expands home-relative explicit config path", () => {
    expect(resolveGlobalConfigPath("~/Library/Application Support/com.omo-switch.app/config.jsonc")).toBe(
      path.join(homeDir(), "Library/Application Support/com.omo-switch.app/config.jsonc"),
    );
  });
});

describe("readGlobalConfig", () => {
  it("returns empty object when file does not exist", async () => {
    const result = await readGlobalConfig(path.join(tempDir, "nonexistent.jsonc"));
    expect(result).toEqual({});
  });

  it("returns empty object when file has JSONC parse errors", async () => {
    const invalidPath = path.join(tempDir, "invalid.jsonc");
    await fs.writeFile(invalidPath, "{ invalid json {{{{", "utf-8");
    const result = await readGlobalConfig(invalidPath);
    expect(result).toEqual({});
  });

  it("returns parsed config when file is valid", async () => {
    const validPath = path.join(tempDir, "config.jsonc");
    await fs.writeFile(
      validPath,
      JSON.stringify({
        config_path: ["/some/path"],
        providers: {
          openai: {
            "gpt-4": { type: "gpt", maxTokens: 8192 },
          },
        },
      }),
      "utf-8",
    );
    const result = await readGlobalConfig(validPath);
    expect(result.config_path).toEqual(["/some/path"]);
    expect(result.providers?.openai?.["gpt-4"]).toBeDefined();
  });

  it("returns parsed config from actual config/config.jsonc", async () => {
    const result = await readGlobalConfig();
    expect(result).toHaveProperty("config_path");
    expect(result).toHaveProperty("providers");
  });

  it("throws when explicit config file has JSONC parse errors", async () => {
    const invalidPath = path.join(tempDir, "invalid-explicit.jsonc");
    await fs.writeFile(invalidPath, '{\n  "disabled_providers": {}\n  "ui_preferences": {}\n}', "utf-8");

    expect(() => validateExplicitGlobalConfig(invalidPath)).toThrow(/invalid JSONC/i);
  });

  it("accepts a valid explicit config file", async () => {
    const validPath = path.join(tempDir, "valid-explicit.jsonc");
    await fs.writeFile(validPath, '{\n  "config_path": ["./profiles"]\n}', "utf-8");

    expect(() => validateExplicitGlobalConfig(validPath)).not.toThrow();
  });
});

describe("extractGlobalModels", () => {
  it("returns empty array for empty config", () => {
    expect(extractGlobalModels({})).toEqual([]);
  });

  it("returns empty array when providers is empty", () => {
    expect(extractGlobalModels({ providers: {} })).toEqual([]);
  });

  it("extracts all provider/model strings from all providers without duplicates", () => {
    const config = {
      providers: {
        openai: {
          "gpt-5.4": { type: "gpt", maxTokens: 64000 },
          "gpt-5.3-codex": { type: "gpt", maxTokens: 64000 },
        },
        "alibaba-coding-plan-cn": {
          "kimi-k2.5": { type: "gpt", maxTokens: 64000 },
          "glm-5": { type: "gpt", maxTokens: 64000 },
        },
      },
    };
    const models = extractGlobalModels(config);
    expect(models).toContain("openai/gpt-5.4");
    expect(models).toContain("openai/gpt-5.3-codex");
    expect(models).toContain("alibaba-coding-plan-cn/kimi-k2.5");
    expect(models).toContain("alibaba-coding-plan-cn/glm-5");
    expect(models).toHaveLength(4);
  });

  it("keeps different provider/model strings even with same model ID", () => {
    const config = {
      providers: {
        providerA: { "shared-model": { type: "gpt" } },
        providerB: { "shared-model": { type: "gpt" } },
      },
    };
    const models = extractGlobalModels(config);
    expect(models).toEqual(["providerA/shared-model", "providerB/shared-model"]);
  });

  it("extracts models from actual config/config.jsonc", async () => {
    const gc = await readGlobalConfig();
    const models = extractGlobalModels(gc);
    expect(models.length).toBeGreaterThan(0);
    expect(models).toContain("openai/gpt-5.4");
  });
});

describe("extractGlobalModelSources", () => {
  it("returns empty array for empty config", () => {
    const sources = extractGlobalModelSources({}, "/path/to/config.jsonc");
    expect(sources).toEqual([]);
  });

  it("returns empty array when providers is empty", () => {
    const sources = extractGlobalModelSources({ providers: {} }, "/path/to/config.jsonc");
    expect(sources).toEqual([]);
  });

  it("extracts structured source entries with correct provenance", () => {
    const config = {
      providers: {
        openai: {
          "gpt-5.4": { type: "gpt", maxTokens: 64000 },
        },
        anthropic: {
          "claude-sonnet-4-6": { type: "claude", maxTokens: 100000 },
        },
      },
    };
    const sources = extractGlobalModelSources(config, "/custom/path/config.jsonc");

    expect(sources).toHaveLength(2);
    expect(sources[0]).toEqual({
      model: "openai/gpt-5.4",
      sourceType: "global",
      sourceLabel: "global config (config.jsonc)",
      configPath: "/custom/path/config.jsonc",
    });
    expect(sources[1]).toEqual({
      model: "anthropic/claude-sonnet-4-6",
      sourceType: "global",
      sourceLabel: "global config (config.jsonc)",
      configPath: "/custom/path/config.jsonc",
    });
  });

  it("deduplicates models within same provider", () => {
    const config = {
      providers: {
        openai: {
          "gpt-5.4": { type: "gpt", maxTokens: 32000 },
        },
      },
    };
    const sources = extractGlobalModelSources(config, "/path/config.jsonc");
    expect(sources).toHaveLength(1);
    expect(sources[0].model).toBe("openai/gpt-5.4");
  });

  it("resolves relative config path to absolute", () => {
    const config = {
      providers: {
        openai: { "gpt-5.4": { type: "gpt" } },
      },
    };
    const sources = extractGlobalModelSources(config, "config/config.jsonc");
    expect(sources[0].configPath).toBe(path.resolve("config/config.jsonc"));
  });
});

describe("getDisabledProviders", () => {
  it("returns empty array when disabled_providers field is missing", () => {
    expect(getDisabledProviders({}, "profile-1")).toEqual([]);
  });

  it("returns empty array when profile key is missing", () => {
    const config = {
      disabled_providers: {
        "profile-2": ["anthropic", "openai"],
      },
    };
    expect(getDisabledProviders(config, "profile-1")).toEqual([]);
  });

  it("returns existing disabled providers array for profile", () => {
    const config = {
      disabled_providers: {
        "profile-1": ["anthropic", "openai", "google"],
        "profile-2": ["mistral"],
      },
    };
    expect(getDisabledProviders(config, "profile-1")).toEqual(["anthropic", "openai", "google"]);
    expect(getDisabledProviders(config, "profile-2")).toEqual(["mistral"]);
  });
});

describe("getAppZoomPercent", () => {
  it("returns default zoom when ui preference is missing", () => {
    expect(getAppZoomPercent({})).toBe(100);
  });

  it("returns configured zoom percent", () => {
    expect(getAppZoomPercent({ ui_preferences: { zoom_percent: 115 } })).toBe(115);
  });

  it("normalizes arbitrary zoom values to 5 percent steps within bounds", () => {
    expect(normalizeAppZoomPercent(113)).toBe(115);
    expect(normalizeAppZoomPercent(10)).toBe(50);
    expect(normalizeAppZoomPercent(350)).toBe(200);
    expect(normalizeAppZoomPercent("115")).toBe(100);
  });
});
