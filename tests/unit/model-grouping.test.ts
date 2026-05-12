import { describe, it, expect } from "vitest";
import {
  groupModelsByProvider,
  splitModelId,
  getModelDisplayInfo,
} from "../../src/shared/model-catalog";
import type { ModelGroup, ModelOption } from "../../src/shared/config/types";

describe("groupModelsByProvider", () => {
  it("groups a single model into one group", () => {
    const models = ["openai/gpt-4o"];
    const result = groupModelsByProvider(models);

    expect(result).toEqual([
      {
        provider: "openai",
        label: "openai",
        models: [
          { id: "openai/gpt-4o", label: "gpt-4o", provider: "openai" },
        ],
      },
    ]);
  });

  it("groups multiple models from same provider into one group", () => {
    const models = ["anthropic/claude-3-5", "anthropic/claude-3"];
    const result = groupModelsByProvider(models);

    expect(result).toHaveLength(1);
    expect(result[0].provider).toBe("anthropic");
    expect(result[0].models).toHaveLength(2);
    expect(result[0].models).toEqual([
      { id: "anthropic/claude-3-5", label: "claude-3-5", provider: "anthropic" },
      { id: "anthropic/claude-3", label: "claude-3", provider: "anthropic" },
    ]);
  });

  it("creates separate groups for different providers sorted alphabetically", () => {
    const models = ["openai/gpt-4o", "anthropic/claude"];
    const result = groupModelsByProvider(models);

    expect(result).toHaveLength(2);
    expect(result[0].provider).toBe("anthropic");
    expect(result[1].provider).toBe("openai");
  });

  it("handles models without slash without crashing", () => {
    const models = ["no-slash-model"];
    const result = groupModelsByProvider(models);

    expect(result).toEqual([
      {
        provider: "Unknown",
        label: "Unknown",
        models: [
          { id: "no-slash-model", label: "no-slash-model", provider: "Unknown" },
        ],
      },
    ]);
  });

  it("returns empty array for empty input", () => {
    const models: string[] = [];
    const result = groupModelsByProvider(models);

    expect(result).toEqual([]);
  });
});

describe("splitModelId", () => {
  it("splits a standard provider/model-id format", () => {
    const result = splitModelId("openai/gpt-4o");

    expect(result).toEqual({
      provider: "openai",
      modelName: "gpt-4o",
    });
  });

  it("handles model without slash by returning Unknown provider", () => {
    const result = splitModelId("no-slash");

    expect(result).toEqual({
      provider: "Unknown",
      modelName: "no-slash",
    });
  });

  it("splits on first slash only, keeping rest in modelName", () => {
    const result = splitModelId("a/b/c");

    expect(result).toEqual({
      provider: "a",
      modelName: "b/c",
    });
  });
});

describe("getModelDisplayInfo", () => {
  it("returns display info for standard provider/model-id", () => {
    const result = getModelDisplayInfo("openai/gpt-4o");

    expect(result).toEqual({
      providerLabel: "openai",
      modelLabel: "gpt-4o",
      fullId: "openai/gpt-4o",
    });
  });

  it("handles model without slash without crashing", () => {
    const result = getModelDisplayInfo("no-slash");

    expect(result).toEqual({
      providerLabel: "Unknown",
      modelLabel: "no-slash",
      fullId: "no-slash",
    });
  });
});

describe("ModelGroup and ModelOption type compatibility", () => {
  it("ModelGroup type accepts valid group structure", () => {
    const group: ModelGroup = {
      provider: "openai",
      label: "OpenAI",
      models: [
        { id: "openai/gpt-4o", label: "GPT-4o", provider: "openai" },
      ],
    };

    expect(group.provider).toBe("openai");
    expect(group.label).toBe("OpenAI");
    expect(group.models).toHaveLength(1);
  });

  it("ModelOption type accepts valid model structure", () => {
    const model: ModelOption = {
      id: "anthropic/claude-3",
      label: "Claude 3",
      provider: "anthropic",
    };

    expect(model.id).toBe("anthropic/claude-3");
    expect(model.label).toBe("Claude 3");
    expect(model.provider).toBe("anthropic");
  });
});
