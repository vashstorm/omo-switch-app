import { describe, it, expect } from "vitest";
import {
  getBuiltinModels,
  getBuiltinModelIds,
  getModelInfo,
  isBuiltinModel,
  mergeModels,
  ModelInfo,
} from "../../src/shared";

describe("getBuiltinModels", () => {
  it("should return at least 10 models", () => {
    const models = getBuiltinModels();
    expect(models.length).toBeGreaterThanOrEqual(10);
  });

  it("should return models with required fields", () => {
    const models = getBuiltinModels();
    for (const model of models) {
      expect(model.id).toBeDefined();
      expect(model.id.length).toBeGreaterThan(0);
      expect(model.name).toBeDefined();
      expect(model.name.length).toBeGreaterThan(0);
      expect(model.provider).toBeDefined();
      expect(model.provider.length).toBeGreaterThan(0);
    }
  });

  it("should include expected OpenCode models", () => {
    const models = getBuiltinModels();
    const ids = models.map((m) => m.id);

    expect(ids).toContain("anthropic/claude-opus-4-5");
    expect(ids).toContain("anthropic/claude-sonnet-4-5");
    expect(ids).toContain("anthropic/claude-haiku-4-5");
    expect(ids).toContain("openai/gpt-4o");
    expect(ids).toContain("openai/gpt-4o-mini");
    expect(ids).toContain("openai/gpt-5");
    expect(ids).toContain("google/gemini-2.5-pro");
    expect(ids).toContain("google/gemini-2.5-flash");
    expect(ids).toContain("deepseek/deepseek-v3");
    expect(ids).toContain("deepseek/deepseek-r1");
    expect(ids).toContain("alibaba/qwen-max");
    expect(ids).toContain("alibaba/qwen-turbo");
  });

  it("should return a copy of the array", () => {
    const models1 = getBuiltinModels();
    const models2 = getBuiltinModels();
    expect(models1).not.toBe(models2);
    expect(models1).toEqual(models2);
  });
});

describe("getBuiltinModelIds", () => {
  it("should return all model ids", () => {
    const ids = getBuiltinModelIds();
    expect(ids.length).toBeGreaterThanOrEqual(10);
    expect(ids).toContain("anthropic/claude-opus-4-5");
    expect(ids).toContain("openai/gpt-4o");
    expect(ids).toContain("google/gemini-2.5-pro");
  });
});

describe("getModelInfo", () => {
  it("should return model info for builtin models", () => {
    const claudeOpus = getModelInfo("anthropic/claude-opus-4-5");
    expect(claudeOpus).toBeDefined();
    expect(claudeOpus?.name).toBe("Claude Opus 4.5");
    expect(claudeOpus?.provider).toBe("anthropic");

    const gpt4o = getModelInfo("openai/gpt-4o");
    expect(gpt4o).toBeDefined();
    expect(gpt4o?.name).toBe("GPT-4o");
    expect(gpt4o?.provider).toBe("openai");

    const gemini = getModelInfo("google/gemini-2.5-pro");
    expect(gemini).toBeDefined();
    expect(gemini?.provider).toBe("google");
  });

  it("should return undefined for unknown models", () => {
    expect(getModelInfo("unknown-model")).toBeUndefined();
    expect(getModelInfo("custom-llm")).toBeUndefined();
    expect(getModelInfo("")).toBeUndefined();
  });
});

describe("isBuiltinModel", () => {
  it("should return true for builtin models", () => {
    expect(isBuiltinModel("anthropic/claude-opus-4-5")).toBe(true);
    expect(isBuiltinModel("anthropic/claude-sonnet-4-5")).toBe(true);
    expect(isBuiltinModel("openai/gpt-4o")).toBe(true);
    expect(isBuiltinModel("openai/gpt-4o-mini")).toBe(true);
    expect(isBuiltinModel("google/gemini-2.5-pro")).toBe(true);
    expect(isBuiltinModel("deepseek/deepseek-v3")).toBe(true);
    expect(isBuiltinModel("alibaba/qwen-max")).toBe(true);
  });

  it("should return false for unknown models", () => {
    expect(isBuiltinModel("unknown-model")).toBe(false);
    expect(isBuiltinModel("custom-llm")).toBe(false);
    expect(isBuiltinModel("")).toBe(false);
    expect(isBuiltinModel("claude-fake")).toBe(false);
  });
});

describe("mergeModels", () => {
  it("should merge builtin and config models with builtins first", () => {
    const builtinList = ["gpt-4o", "claude-sonnet-4-5"];
    const fromConfig = ["custom-model", "gpt-4o"];
    const result = mergeModels(builtinList, fromConfig);
    expect(result).toEqual(["gpt-4o", "claude-sonnet-4-5", "custom-model"]);
  });

  it("should deduplicate models", () => {
    const builtinList = ["gpt-4o", "gpt-4o", "claude-sonnet-4-5"];
    const fromConfig = ["gpt-4o", "custom-model"];
    const result = mergeModels(builtinList, fromConfig);
    expect(result).toEqual(["gpt-4o", "claude-sonnet-4-5", "custom-model"]);
  });

  it("should handle empty lists", () => {
    expect(mergeModels([], [])).toEqual([]);
    expect(mergeModels(["gpt-4o"], [])).toEqual(["gpt-4o"]);
    expect(mergeModels([], ["custom-model"])).toEqual(["custom-model"]);
  });

  it("should preserve order with builtins first", () => {
    const builtinList = ["model-a", "model-b", "model-c"];
    const fromConfig = ["model-x", "model-y", "model-z"];
    const result = mergeModels(builtinList, fromConfig);
    expect(result).toEqual(["model-a", "model-b", "model-c", "model-x", "model-y", "model-z"]);
  });

  it("should handle config models that duplicate builtins", () => {
    const builtinList = ["gpt-4o", "claude-sonnet-4-5", "gemini-2.5-pro"];
    const fromConfig = ["gpt-4o", "gemini-2.5-pro", "custom-1", "custom-2"];
    const result = mergeModels(builtinList, fromConfig);
    expect(result).toEqual([
      "gpt-4o",
      "claude-sonnet-4-5",
      "gemini-2.5-pro",
      "custom-1",
      "custom-2",
    ]);
  });

  it("should work with real builtin models", () => {
    const builtinList = getBuiltinModelIds();
    const fromConfig = ["custom-local-model", "openai/gpt-4o", "another-custom"];
    const result = mergeModels(builtinList, fromConfig);

    expect(result.length).toBe(builtinList.length + 2);
    expect(result.slice(0, builtinList.length)).toEqual(builtinList);
    expect(result).toContain("custom-local-model");
    expect(result).toContain("another-custom");

    const gpt4oIndex = result.indexOf("openai/gpt-4o");
    expect(gpt4oIndex).toBeLessThan(builtinList.length);
    expect(result.lastIndexOf("openai/gpt-4o")).toBe(gpt4oIndex);
  });
});
