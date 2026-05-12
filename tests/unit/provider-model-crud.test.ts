import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parse } from "jsonc-parser";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  validateProviderName,
  validateModelName,
  validateMaxTokens,
} from "../../src/shared/config/global-config";
import {
  writeProvider,
  deleteProvider,
  writeModel,
  deleteModel,
  updateModelConfig,
  writeGlobalConfigValue,
} from "../../src/shared/config-writer/global-config-writer";

describe("provider model CRUD", () => {
  let tempDir = "";
  let configPath = "";

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "omo-provider-model-"));
    configPath = path.join(tempDir, "config.jsonc");
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("validation", () => {
    it("accepts valid provider names", () => {
      expect(() => validateProviderName("openai")).not.toThrow();
      expect(() => validateProviderName("my-provider")).not.toThrow();
      expect(() => validateProviderName("provider123")).not.toThrow();
    });

    it("rejects invalid provider names", () => {
      expect(() => validateProviderName("")).toThrow();
      expect(() => validateProviderName("Invalid-Name")).toThrow();
      expect(() => validateProviderName("my_provider")).toThrow();
      expect(() => validateProviderName("provider.name")).toThrow();
      expect(() => validateProviderName("my provider")).toThrow();
    });

    it("accepts valid model names", () => {
      expect(() => validateModelName("gpt-4")).not.toThrow();
      expect(() => validateModelName("claude-3-opus")).not.toThrow();
      expect(() => validateModelName("my model")).not.toThrow();
    });

    it("rejects invalid model names", () => {
      expect(() => validateModelName("")).toThrow();
      expect(() => validateModelName("   ")).toThrow();
      expect(() => validateModelName("provider/model")).toThrow();
    });

    it("validates maxTokens", () => {
      expect(() => validateMaxTokens(0)).not.toThrow();
      expect(() => validateMaxTokens(64000)).not.toThrow();
      expect(() => validateMaxTokens(1)).not.toThrow();

      expect(() => validateMaxTokens(-1)).toThrow();
      expect(() => validateMaxTokens(1.5)).toThrow();
      expect(() => validateMaxTokens("64000")).toThrow();
      expect(() => validateMaxTokens(null)).toThrow();
      expect(() => validateMaxTokens(undefined)).toThrow();
    });
  });

  it("creates provider in fresh config", async () => {
    await writeProvider(configPath, "openai", {
      "gpt-4": { type: "openai", maxTokens: 8192 },
    });

    const content = await fs.readFile(configPath, "utf-8");
    const data = parse(content) as Record<string, unknown>;

    expect(data.providers).toBeDefined();
    const providers = data.providers as Record<string, unknown>;
    expect(providers.openai).toBeDefined();
    const provider = providers.openai as Record<string, unknown>;
    expect(provider["gpt-4"]).toEqual({ type: "openai", maxTokens: 8192 });
  });

  it("creates model under provider", async () => {
    await writeProvider(configPath, "anthropic", {});
    await writeModel(configPath, "anthropic", "claude-3", {
      type: "anthropic",
      maxTokens: 4096,
    });

    const content = await fs.readFile(configPath, "utf-8");
    const data = parse(content) as Record<string, unknown>;
    const providers = data.providers as Record<string, unknown>;
    const provider = providers.anthropic as Record<string, unknown>;

    expect(provider["claude-3"]).toEqual({ type: "anthropic", maxTokens: 4096 });
  });

  it("updates model maxTokens while preserving unknown sibling fields", async () => {
    await writeModel(configPath, "openai", "gpt-4", {
      type: "openai",
      maxTokens: 8192,
      customField: "preserve-me",
    });

    await updateModelConfig(configPath, "openai", "gpt-4", { maxTokens: 16384 });

    const content = await fs.readFile(configPath, "utf-8");
    const data = parse(content) as Record<string, unknown>;
    const providers = data.providers as Record<string, unknown>;
    const provider = providers.openai as Record<string, unknown>;
    const model = provider["gpt-4"] as Record<string, unknown>;

    expect(model.maxTokens).toBe(16384);
    expect(model.customField).toBe("preserve-me");
    expect(model.type).toBe("openai");
  });

  it("preserves comments and unrelated top-level keys", async () => {
    const initialContent = `{
  // This is a comment that must be preserved
  "top_level_unmanaged": {
    "preserve": true
  },
  "providers": {}
}`;
    await fs.writeFile(configPath, initialContent, "utf-8");

    await writeModel(configPath, "openai", "gpt-4", { type: "openai", maxTokens: 8192 });

    const content = await fs.readFile(configPath, "utf-8");
    const data = parse(content) as Record<string, unknown>;

    expect(content).toContain("// This is a comment that must be preserved");
    expect(data.top_level_unmanaged).toEqual({ preserve: true });

    const providers = data.providers as Record<string, unknown>;
    const provider = providers.openai as Record<string, unknown>;
    expect(provider["gpt-4"]).toBeDefined();
  });

  it("deletes model preserves siblings", async () => {
    await writeModel(configPath, "openai", "gpt-4", { type: "openai" });
    await writeModel(configPath, "openai", "gpt-3.5", { type: "openai" });

    await deleteModel(configPath, "openai", "gpt-4");

    const content = await fs.readFile(configPath, "utf-8");
    const data = parse(content) as Record<string, unknown>;
    const providers = data.providers as Record<string, unknown>;
    const provider = providers.openai as Record<string, unknown>;

    expect(provider["gpt-4"]).toBeUndefined();
    expect(provider["gpt-3.5"]).toBeDefined();
  });

  it("deleting provider does not modify unrelated keys", async () => {
    await writeProvider(configPath, "openai", { "gpt-4": { type: "openai" } });
    await writeGlobalConfigValue(configPath, ["other_key"], "preserve");

    await deleteProvider(configPath, "openai");

    const content = await fs.readFile(configPath, "utf-8");
    const data = parse(content) as Record<string, unknown>;

    expect(data.other_key).toBe("preserve");
    expect((data.providers as Record<string, unknown>)?.openai).toBeUndefined();
  });

  it("deleting missing model is no-op", async () => {
    await writeProvider(configPath, "openai", { "gpt-4": { type: "openai" } });

    await deleteModel(configPath, "openai", "nonexistent");

    const content = await fs.readFile(configPath, "utf-8");
    const data = parse(content) as Record<string, unknown>;
    const providers = data.providers as Record<string, unknown>;
    const provider = providers.openai as Record<string, unknown>;

    expect(provider["gpt-4"]).toBeDefined();
  });

  it("deleting missing provider is no-op", async () => {
    await writeProvider(configPath, "openai", { "gpt-4": { type: "openai" } });

    await deleteProvider(configPath, "nonexistent");

    const content = await fs.readFile(configPath, "utf-8");
    const data = parse(content) as Record<string, unknown>;
    const providers = data.providers as Record<string, unknown>;

    expect(providers.openai).toBeDefined();
    expect(providers.nonexistent).toBeUndefined();
  });

  it("throws on duplicate model creation unless overwrite=true", async () => {
    await writeModel(configPath, "openai", "gpt-4", { type: "openai" });

    await expect(
      writeModel(configPath, "openai", "gpt-4", { type: "openai" }, { overwrite: false }),
    ).rejects.toThrow(/already exists/);

    await writeModel(configPath, "openai", "gpt-4", { type: "openai", maxTokens: 16384 }, { overwrite: true });

    const content = await fs.readFile(configPath, "utf-8");
    const data = parse(content) as Record<string, unknown>;
    const providers = data.providers as Record<string, unknown>;
    const provider = providers.openai as Record<string, unknown>;
    const model = provider["gpt-4"] as Record<string, unknown>;

    expect(model.maxTokens).toBe(16384);
  });

  it("maxTokens defaults to 64000 when not specified", async () => {
    await writeModel(configPath, "openai", "gpt-4", { type: "openai" });

    const content = await fs.readFile(configPath, "utf-8");
    const data = parse(content) as Record<string, unknown>;
    const providers = data.providers as Record<string, unknown>;
    const provider = providers.openai as Record<string, unknown>;
    const model = provider["gpt-4"] as Record<string, unknown>;

    expect(model.maxTokens).toBe(64000);
  });
});
