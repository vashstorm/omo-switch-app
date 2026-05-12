import { describe, it, expect } from "vitest";
import { scanProviderReferences, scanModelReferences, ReferenceImpactEntry } from "../../src/web/providers/referenceImpact";
import type { AgentConfig, CategoryConfig } from "../../src/web/hooks/useProfile";

function makeConfig(
  agents: Record<string, AgentConfig | null> = {},
  categories: Record<string, CategoryConfig | null> = {},
) {
  return { agents, categories };
}

describe("scanProviderReferences", () => {
  it("provider prefix match matches openai/gpt-4 and openai/gpt-5 but not openai-other/x", () => {
    const config = makeConfig({
      a1: { model: "openai/gpt-4" },
      a2: { model: "openai/gpt-5" },
      a3: { model: "openai-other/x" },
    });
    const result = scanProviderReferences(config, "openai");
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("a1");
    expect(result[1].id).toBe("a2");
  });

  it("scans agent model field", () => {
    const config = makeConfig({
      assistant: { model: "openai/gpt-4" },
    });
    const result = scanProviderReferences(config, "openai");
    expect(result).toContainEqual({
      kind: "agent",
      id: "assistant",
      field: "model",
      modelId: "openai/gpt-4",
    });
  });

  it("scans agent fallback_models", () => {
    const config = makeConfig({
      assistant: { model: "anthropic/claude", fallback_models: ["openai/gpt-4", "openai/gpt-3.5"] },
    });
    const result = scanProviderReferences(config, "openai");
    expect(result).toContainEqual({
      kind: "agent",
      id: "assistant",
      field: "fallback_models",
      modelId: "openai/gpt-4",
    });
    expect(result).toContainEqual({
      kind: "agent",
      id: "assistant",
      field: "fallback_models",
      modelId: "openai/gpt-3.5",
    });
  });

  it("scans agent ultrawork model", () => {
    const config = makeConfig({
      assistant: { model: "anthropic/claude", ultrawork: { model: "openai/gpt-5" } },
    });
    const result = scanProviderReferences(config, "openai");
    expect(result).toContainEqual({
      kind: "agent",
      id: "assistant",
      field: "ultrawork_model",
      modelId: "openai/gpt-5",
    });
  });

  it("scans category model field", () => {
    const config = makeConfig({}, {
      code: { model: "openai/gpt-4" },
    });
    const result = scanProviderReferences(config, "openai");
    expect(result).toContainEqual({
      kind: "category",
      id: "code",
      field: "model",
      modelId: "openai/gpt-4",
    });
  });

  it("scans category fallback_models", () => {
    const config = makeConfig({}, {
      code: { model: "anthropic/claude", fallback_models: ["openai/gpt-4"] },
    });
    const result = scanProviderReferences(config, "openai");
    expect(result).toContainEqual({
      kind: "category",
      id: "code",
      field: "fallback_models",
      modelId: "openai/gpt-4",
    });
  });

  it("ignores null entries", () => {
    const config = makeConfig(
      { deleted: null, active: { model: "openai/gpt-4" } },
      { removed: null, active: { model: "openai/gpt-4" } },
    );
    const result = scanProviderReferences(config, "openai");
    expect(result).toHaveLength(2);
    expect(result.every(r => r.id === "active")).toBe(true);
  });

  it("returns empty for no matches", () => {
    const config = makeConfig({
      a1: { model: "anthropic/claude" },
    }, {
      c1: { model: "anthropic/claude-3" },
    });
    const result = scanProviderReferences(config, "openai");
    expect(result).toHaveLength(0);
  });

  it("returns empty when fallback_models is undefined", () => {
    const config = makeConfig({
      a1: { model: "anthropic/claude" },
    });
    const result = scanProviderReferences(config, "openai");
    expect(result).toHaveLength(0);
  });

  it("sorts by kind then id then field", () => {
    const config = makeConfig({
      zebra: { model: "openai/gpt-4", fallback_models: ["openai/gpt-3.5"] },
      alpha: { model: "openai/gpt-5" },
    }, {
      code: { model: "openai/gpt-4" },
    });
    const result = scanProviderReferences(config, "openai");
    const kinds = result.map(r => r.kind);
    expect(kinds[0]).toBe("agent");
    expect(kinds[kinds.length - 1]).toBe("category");

    const agentEntries = result.filter(r => r.kind === "agent");
    expect(agentEntries[0].id).toBe("alpha");
    expect(agentEntries[1].id).toBe("zebra");
  });
});

describe("scanModelReferences", () => {
  it("model exact match matches only openai/gpt-5 not openai/gpt-5-mini", () => {
    const config = makeConfig({
      a1: { model: "openai/gpt-5" },
      a2: { model: "openai/gpt-5-mini" },
      a3: { model: "openai/gpt-5" },
    });
    const result = scanModelReferences(config, "openai", "gpt-5");
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("a1");
    expect(result[1].id).toBe("a3");
  });

  it("scans agent model field for exact match", () => {
    const config = makeConfig({
      assistant: { model: "openai/gpt-4" },
    });
    const result = scanModelReferences(config, "openai", "gpt-4");
    expect(result).toHaveLength(1);
    expect(result[0].field).toBe("model");
  });

  it("scans agent fallback_models for exact match", () => {
    const config = makeConfig({
      assistant: { model: "anthropic/claude", fallback_models: ["openai/gpt-4", "anthropic/haiku"] },
    });
    const result = scanModelReferences(config, "openai", "gpt-4");
    expect(result).toHaveLength(1);
    expect(result[0].field).toBe("fallback_models");
    expect(result[0].modelId).toBe("openai/gpt-4");
  });

  it("scans agent ultrawork model for exact match", () => {
    const config = makeConfig({
      assistant: { ultrawork: { model: "openai/gpt-5" } },
    });
    const result = scanModelReferences(config, "openai", "gpt-5");
    expect(result).toHaveLength(1);
    expect(result[0].field).toBe("ultrawork_model");
  });

  it("scans category model field for exact match", () => {
    const config = makeConfig({}, {
      code: { model: "openai/gpt-4" },
    });
    const result = scanModelReferences(config, "openai", "gpt-4");
    expect(result).toContainEqual({
      kind: "category",
      id: "code",
      field: "model",
      modelId: "openai/gpt-4",
    });
  });

  it("scans category fallback_models for exact match", () => {
    const config = makeConfig({}, {
      code: { fallback_models: ["openai/gpt-4", "anthropic/claude"] },
    });
    const result = scanModelReferences(config, "openai", "gpt-4");
    expect(result).toHaveLength(1);
    expect(result[0].modelId).toBe("openai/gpt-4");
  });

  it("ignores null entries", () => {
    const config = makeConfig(
      { deleted: null, active: { model: "openai/gpt-4" } },
      { removed: null },
    );
    const result = scanModelReferences(config, "openai", "gpt-4");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("active");
  });

  it("returns empty for no matches", () => {
    const config = makeConfig({
      a1: { model: "openai/gpt-4" },
    }, {
      c1: { model: "openai/gpt-3.5" },
    });
    const result = scanModelReferences(config, "openai", "gpt-5");
    expect(result).toHaveLength(0);
  });
});
