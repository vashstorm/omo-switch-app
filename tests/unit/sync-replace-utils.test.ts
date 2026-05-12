import { describe, expect, test } from "vitest";
import { collectSyncReplaceImpact, applySyncReplace, applySyncReplaceOne, type SyncReplaceSource } from "../../src/web/sync-replace/modelSync";
import type { EditableConfig } from "../../src/web/hooks/useProfile";

describe("collectSyncReplaceImpact", () => {
  const baseConfig: EditableConfig = {
    agents: {
      agent1: { model: "model-a" },
      agent2: { model: "model-a" },
      agent3: { model: "model-b" },
      agent4: null,
    },
    categories: {
      cat1: { model: "model-a" },
      cat2: { model: "model-a" },
      cat3: { model: "model-b" },
      cat4: null,
    },
    misc: {},
  };

  test("excludes trigger agent from additionalAgents", () => {
    const source: SyncReplaceSource = {
      kind: "agent",
      id: "agent1",
      oldModel: "model-a",
      newModel: "model-b",
    };

    const impact = collectSyncReplaceImpact(baseConfig, source);

    expect(impact.additionalAgents).not.toContain("agent1");
    expect(impact.additionalAgents).toContain("agent2");
    expect(impact.additionalAgents).not.toContain("agent3");
  });

  test("excludes trigger category from additionalCategories", () => {
    const source: SyncReplaceSource = {
      kind: "category",
      id: "cat1",
      oldModel: "model-a",
      newModel: "model-b",
    };

    const impact = collectSyncReplaceImpact(baseConfig, source);

    expect(impact.additionalCategories).not.toContain("cat1");
    expect(impact.additionalCategories).toContain("cat2");
    expect(impact.additionalCategories).not.toContain("cat3");
  });

  test("does NOT include agents with fallback_models containing oldModel", () => {
    const configWithFallback: EditableConfig = {
      agents: {
        agent1: { model: "model-a", fallback_models: ["model-a", "model-c"] },
        agent2: { model: "model-b", fallback_models: ["model-a"] },
      },
      categories: {},
      misc: {},
    };

    const source: SyncReplaceSource = {
      kind: "agent",
      id: "agent1",
      oldModel: "model-a",
      newModel: "model-b",
    };

    const impact = collectSyncReplaceImpact(configWithFallback, source);

    expect(impact.additionalAgents).not.toContain("agent2");
  });

  test("does NOT include agents where ultrawork.model === oldModel", () => {
    const configWithUltrawork: EditableConfig = {
      agents: {
        agent1: { model: "model-a", ultrawork: { model: "model-a" } },
        agent2: { model: "model-b", ultrawork: { model: "model-a" } },
      },
      categories: {},
      misc: {},
    };

    const source: SyncReplaceSource = {
      kind: "agent",
      id: "agent1",
      oldModel: "model-a",
      newModel: "model-b",
    };

    const impact = collectSyncReplaceImpact(configWithUltrawork, source);

    expect(impact.additionalAgents).not.toContain("agent2");
  });

  test("correctly sets totalAdditionalCount", () => {
    const source: SyncReplaceSource = {
      kind: "agent",
      id: "agent1",
      oldModel: "model-a",
      newModel: "model-b",
    };

    const impact = collectSyncReplaceImpact(baseConfig, source);

    expect(impact.additionalAgents.length).toBe(1);
    expect(impact.additionalCategories.length).toBe(2);
    expect(impact.totalAdditionalCount).toBe(3);
  });

  test("skips null agents", () => {
    const config: EditableConfig = {
      agents: {
        agent1: { model: "model-a" },
        agent2: null,
        agent3: { model: "model-a" },
      },
      categories: {},
      misc: {},
    };

    const source: SyncReplaceSource = {
      kind: "agent",
      id: "agent1",
      oldModel: "model-a",
      newModel: "model-b",
    };

    const impact = collectSyncReplaceImpact(config, source);

    expect(impact.additionalAgents).toContain("agent3");
    expect(impact.additionalAgents.length).toBe(1);
  });

  test("skips null categories", () => {
    const config: EditableConfig = {
      agents: {},
      categories: {
        cat1: { model: "model-a" },
        cat2: null,
        cat3: { model: "model-a" },
      },
      misc: {},
    };

    const source: SyncReplaceSource = {
      kind: "category",
      id: "cat1",
      oldModel: "model-a",
      newModel: "model-b",
    };

    const impact = collectSyncReplaceImpact(config, source);

    expect(impact.additionalCategories).toContain("cat3");
    expect(impact.additionalCategories.length).toBe(1);
  });
});

describe("applySyncReplace", () => {
  const baseConfig: EditableConfig = {
    agents: {
      agent1: { model: "model-a", variant: "high" },
      agent2: { model: "model-b" },
      agent3: { model: "model-a" },
      agent4: null,
    },
    categories: {
      cat1: { model: "model-a", description: "Category 1" },
      cat2: { model: "model-b" },
      cat3: { model: "model-a" },
      cat4: null,
    },
    misc: { tmux: { enabled: true } },
  };

  test("only changes .model fields equal to oldModel", () => {
    const result = applySyncReplace(baseConfig, "model-a", "model-new");

    expect(result.agents.agent1?.model).toBe("model-new");
    expect(result.agents.agent2?.model).toBe("model-b");
    expect(result.agents.agent3?.model).toBe("model-new");
    expect(result.categories.cat1?.model).toBe("model-new");
    expect(result.categories.cat2?.model).toBe("model-b");
    expect(result.categories.cat3?.model).toBe("model-new");
  });

  test("does NOT change fallback_models", () => {
    const configWithFallback: EditableConfig = {
      agents: {
        agent1: { model: "model-a", fallback_models: ["model-a", "model-c"] },
      },
      categories: {},
      misc: {},
    };

    const result = applySyncReplace(configWithFallback, "model-a", "model-new");

    expect(result.agents.agent1?.fallback_models).toEqual(["model-a", "model-c"]);
  });

  test("does NOT change ultrawork.model", () => {
    const configWithUltrawork: EditableConfig = {
      agents: {
        agent1: { model: "model-a", ultrawork: { model: "model-a" } },
      },
      categories: {},
      misc: {},
    };

    const result = applySyncReplace(configWithUltrawork, "model-a", "model-new");

    expect(result.agents.agent1?.ultrawork?.model).toBe("model-a");
  });

  test("returns a new object (original unchanged)", () => {
    const original: EditableConfig = {
      agents: {
        agent1: { model: "model-a" },
      },
      categories: {},
      misc: {},
    };

    const result = applySyncReplace(original, "model-a", "model-new");

    expect(result).not.toBe(original);
    expect(result.agents).not.toBe(original.agents);
    expect(original.agents.agent1?.model).toBe("model-a");
    expect(result.agents.agent1?.model).toBe("model-new");
  });

  test("preserves other agent properties", () => {
    const result = applySyncReplace(baseConfig, "model-a", "model-new");

    expect(result.agents.agent1?.variant).toBe("high");
    expect(result.categories.cat1?.description).toBe("Category 1");
    expect(result.misc?.tmux?.enabled).toBe(true);
  });

  test("removes model fields when replacing with None", () => {
    const result = applySyncReplace(baseConfig, "model-a", "");

    expect(result.agents.agent1).toEqual({ variant: "high" });
    expect(result.agents.agent3).toEqual({});
    expect(result.categories.cat1).toEqual({ description: "Category 1" });
    expect(result.categories.cat3).toEqual({});
  });

  test("skips null agents", () => {
    const result = applySyncReplace(baseConfig, "model-a", "model-new");

    expect(result.agents.agent4).toBe(null);
  });

  test("skips null categories", () => {
    const result = applySyncReplace(baseConfig, "model-a", "model-new");

    expect(result.categories.cat4).toBe(null);
  });
});

describe("applySyncReplaceOne", () => {
  const baseConfig: EditableConfig = {
    agents: {
      agent1: { model: "model-a" },
      agent2: { model: "model-a" },
      agent3: { model: "model-b" },
      agent4: null,
    },
    categories: {
      cat1: { model: "model-a" },
      cat2: { model: "model-a" },
      cat3: { model: "model-b" },
      cat4: null,
    },
    misc: {},
  };

  test("only replaces the selected agent model", () => {
    const source: SyncReplaceSource = {
      kind: "agent",
      id: "agent1",
      oldModel: "model-a",
      newModel: "model-new",
    };

    const result = applySyncReplaceOne(baseConfig, source);

    expect(result.agents.agent1?.model).toBe("model-new");
    expect(result.agents.agent2?.model).toBe("model-a");
    expect(result.agents.agent3?.model).toBe("model-b");
  });

  test("only replaces the selected category model", () => {
    const source: SyncReplaceSource = {
      kind: "category",
      id: "cat1",
      oldModel: "model-a",
      newModel: "model-new",
    };

    const result = applySyncReplaceOne(baseConfig, source);

    expect(result.categories.cat1?.model).toBe("model-new");
    expect(result.categories.cat2?.model).toBe("model-a");
    expect(result.categories.cat3?.model).toBe("model-b");
  });

  test("does not replace agent if model does not match oldModel", () => {
    const source: SyncReplaceSource = {
      kind: "agent",
      id: "agent3",
      oldModel: "model-a",
      newModel: "model-new",
    };

    const result = applySyncReplaceOne(baseConfig, source);

    expect(result.agents.agent3?.model).toBe("model-b");
  });

  test("removes model field when replacing with empty string", () => {
    const source: SyncReplaceSource = {
      kind: "agent",
      id: "agent1",
      oldModel: "model-a",
      newModel: "",
    };

    const result = applySyncReplaceOne(baseConfig, source);

    expect(result.agents.agent1).toEqual({});
    expect(result.agents.agent2?.model).toBe("model-a");
  });

  test("returns a new object (original unchanged)", () => {
    const source: SyncReplaceSource = {
      kind: "agent",
      id: "agent1",
      oldModel: "model-a",
      newModel: "model-new",
    };

    const result = applySyncReplaceOne(baseConfig, source);

    expect(result).not.toBe(baseConfig);
    expect(result.agents).not.toBe(baseConfig.agents);
    expect(baseConfig.agents.agent1?.model).toBe("model-a");
  });

  test("skips null agents", () => {
    const source: SyncReplaceSource = {
      kind: "agent",
      id: "agent4",
      oldModel: "model-a",
      newModel: "model-new",
    };

    const result = applySyncReplaceOne(baseConfig, source);

    expect(result.agents.agent4).toBe(null);
  });

  test("skips null categories", () => {
    const source: SyncReplaceSource = {
      kind: "category",
      id: "cat4",
      oldModel: "model-a",
      newModel: "model-new",
    };

    const result = applySyncReplaceOne(baseConfig, source);

    expect(result.categories.cat4).toBe(null);
  });
});
