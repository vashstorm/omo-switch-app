import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import os from "node:os";
import { describe, expect, test } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { readProfileConfig } from "../../src/shared/config";
import {
  buildProviderCatalog,
  filterModelsByDisabledProviders,
} from "../../src/shared/model-catalog";
import type { ResolvedProfile } from "../../src/shared/profiles/types";

describe("config reader", () => {
  test("reads both opencode.jsonc and oh-my-opencode.jsonc", async () => {
    const resolvedProfile: ResolvedProfile = {
      id: "test",
      label: "Test Profile",
      opencodePath: path.resolve(
        __dirname,
        "../fixtures/config/full-opencode.jsonc",
      ),
      ohMyOpencodePath: path.resolve(
        __dirname,
        "../fixtures/config/partial-oh-my-openagent.jsonc",
      ),
    };

    const result = await readProfileConfig(resolvedProfile);

    expect(result.errors).toHaveLength(0);

    // Verify baseline from opencode.jsonc
    expect(result.baseline.agents).toHaveProperty("planner");
    expect(result.baseline.agents.planner.model).toBe("gpt-5");
    expect(result.baseline.agents.planner.variant).toBe("medium");
    expect(result.baseline.agents.planner.temperature).toBe(0.2);

    // Verify editable from oh-my-opencode.jsonc
    expect(result.editable.agents).toHaveProperty("planner");
    expect(result.editable.agents.planner!.model).toBe("gpt-5-mini");
    expect(result.editable.agents.planner!.variant).toBe("low");
    expect(result.editable.agents.planner!.temperature).toBe(0.1);

    // Verify effective is merged correctly
    expect(result.effective.agents.planner.model).toBe("gpt-5-mini");
    expect(result.effective.agents.planner.variant).toBe("low");
    expect(result.effective.agents.planner.temperature).toBe(0.1);
    expect(result.effective.agents.planner.prompt_append).toBe(
      "Prefer concise outputs.",
    );
  });

  test("treats missing oh-my-opencode.jsonc as empty object", async () => {
    const resolvedProfile: ResolvedProfile = {
      id: "test",
      label: "Test Profile",
      opencodePath: path.resolve(
        __dirname,
        "../fixtures/config/minimal-opencode.jsonc",
      ),
      ohMyOpencodePath: path.resolve(
        __dirname,
        "../fixtures/config/non-existent.jsonc",
      ),
    };

    const result = await readProfileConfig(resolvedProfile);

    expect(result.errors).toHaveLength(0);
    expect(result.editable.agents).toEqual({});
    expect(result.editable.categories).toEqual({});
    expect(result.editable.misc).toEqual({});
    expect(result.effective.agents.planner.model).toBe("gpt-5");
  });

  test("treats editable ultrawork null as explicit disable", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "omo-switch-reader-ultrawork-"));
    try {
      const opencodePath = path.join(tempDir, "opencode.jsonc");
      const ohMyOpencodePath = path.join(tempDir, "oh-my-openagent.jsonc");

      await fs.writeFile(
        opencodePath,
        JSON.stringify({
          agents: {
            sisyphus: {
              model: "anthropic/claude",
              ultrawork: { model: "openai/gpt-5", variant: "medium" },
            },
          },
        }),
        "utf-8",
      );
      await fs.writeFile(
        ohMyOpencodePath,
        JSON.stringify({
          agents: {
            sisyphus: {
              ultrawork: null,
            },
          },
        }),
        "utf-8",
      );

      const result = await readProfileConfig({
        id: "test",
        label: "Test Profile",
        opencodePath,
        ohMyOpencodePath,
      });

      expect(result.editable.agents.sisyphus!.ultrawork).toBeNull();
      expect(result.effective.agents.sisyphus.ultrawork).toBeUndefined();
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  test("normalizes agent fields correctly", async () => {
    const resolvedProfile: ResolvedProfile = {
      id: "test",
      label: "Test Profile",
      opencodePath: path.resolve(
        __dirname,
        "../fixtures/config/full-opencode.jsonc",
      ),
      ohMyOpencodePath: path.resolve(
        __dirname,
        "../fixtures/config/partial-oh-my-openagent.jsonc",
      ),
    };

    const result = await readProfileConfig(resolvedProfile);

    // Baseline should have all agents from opencode
    expect(Object.keys(result.baseline.agents)).toContain("planner");
    expect(Object.keys(result.baseline.agents)).toContain("coder");

    // Baseline agent should have all fields
    const baselinePlanner = result.baseline.agents.planner;
    expect(baselinePlanner.model).toBe("gpt-5");
    expect(baselinePlanner.variant).toBe("medium");
    expect(baselinePlanner.temperature).toBe(0.2);
    expect(baselinePlanner.prompt_append).toBe("Always explain trade-offs.");
  });

  test("normalizes category fields correctly", async () => {
    const resolvedProfile: ResolvedProfile = {
      id: "test",
      label: "Test Profile",
      opencodePath: path.resolve(
        __dirname,
        "../fixtures/config/full-opencode.jsonc",
      ),
      ohMyOpencodePath: path.resolve(
        __dirname,
        "../fixtures/config/partial-oh-my-openagent.jsonc",
      ),
    };

    const result = await readProfileConfig(resolvedProfile);

    // Baseline should have categories
    expect(result.baseline.categories).toHaveProperty("backend");
    const baselineBackend = result.baseline.categories.backend;
    expect(baselineBackend.model).toBe("gpt-4");
    expect(baselineBackend.variant).toBe("medium");
    expect(baselineBackend.temperature).toBe(0.3);
    expect(baselineBackend.description).toBe("Backend development tasks");
    expect(baselineBackend.fallback_models).toEqual(["gpt-3.5-turbo"]);

    // Editable should have overrides
    expect(result.editable.categories.backend!.model).toBe("gpt-4-turbo");

    // Effective should merge
    expect(result.effective.categories.backend.model).toBe("gpt-4-turbo");
    expect(result.effective.categories.backend.variant).toBe("medium");
  });

  test("normalizes misc fields correctly", async () => {
    const resolvedProfile: ResolvedProfile = {
      id: "test",
      label: "Test Profile",
      opencodePath: path.resolve(
        __dirname,
        "../fixtures/config/full-opencode.jsonc",
      ),
      ohMyOpencodePath: path.resolve(
        __dirname,
        "../fixtures/config/partial-oh-my-openagent.jsonc",
      ),
    };

    const result = await readProfileConfig(resolvedProfile);

    // Baseline misc
    expect(result.baseline.misc.tmux?.enabled).toBe(true);
    expect(result.baseline.misc.git_master?.enabled).toBe(false);

    // Editable misc override
    expect(result.editable.misc.tmux?.enabled).toBe(false);

    // Effective misc merged
    expect(result.effective.misc.tmux?.enabled).toBe(false);
    expect(result.effective.misc.git_master?.enabled).toBe(false);
  });

  test("$schema is preserved in readonlyTail but stripped from nested objects", async () => {
    const resolvedProfile: ResolvedProfile = {
      id: "test",
      label: "Test Profile",
      opencodePath: path.resolve(
        __dirname,
        "../fixtures/config/full-opencode.jsonc",
      ),
      ohMyOpencodePath: path.resolve(
        __dirname,
        "../fixtures/config/partial-oh-my-openagent.jsonc",
      ),
    };

    const result = await readProfileConfig(resolvedProfile);

    expect(result.readonlyTail.$schema).toBe("https://example.com/oh-my-opencode.schema.json");

    for (const agent of Object.values(result.readonlyTail.agents || {})) {
      expect((agent as Record<string, unknown>).$schema).toBeUndefined();
    }
  });

  test("handles empty oh-my-opencode.jsonc gracefully", async () => {
    const resolvedProfile: ResolvedProfile = {
      id: "test",
      label: "Test Profile",
      opencodePath: path.resolve(
        __dirname,
        "../fixtures/config/minimal-opencode.jsonc",
      ),
      ohMyOpencodePath: path.resolve(
        __dirname,
        "../fixtures/config/non-existent.jsonc",
      ),
    };

    const result = await readProfileConfig(resolvedProfile);

    // Should not have any errors for missing oh-my-opencode
    const fileNotFoundErrors = result.errors.filter(
      (e) => e.path === "oh-my-opencode.jsonc" && e.message.includes("syntax"),
    );
    expect(fileNotFoundErrors).toHaveLength(0);

    // Effective should equal baseline
    expect(result.effective).toEqual(result.baseline);
  });

  test("supports top-level misc sections and prefers top-level over nested", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "omo-switch-reader-"));
    const opencodePath = path.join(tempDir, "opencode.jsonc");
    const ohMyPath = path.join(tempDir, "oh-my-opencode.jsonc");

    await fs.writeFile(
      opencodePath,
      JSON.stringify({
        misc: {
          tmux: { enabled: false, nested_only: true },
          git_master: { enabled: false },
        },
        tmux: { enabled: true, socket_name: "baseline-socket" },
        git_master: { enabled: true, main_branch: "master" },
      }),
      "utf-8",
    );

    await fs.writeFile(
      ohMyPath,
      JSON.stringify({
        misc: {
          tmux: { enabled: false },
          git_master: { enabled: false, strategy: "rebase" },
        },
        tmux: { enabled: true, socket_name: "editable-socket" },
      }),
      "utf-8",
    );

    try {
      const resolvedProfile: ResolvedProfile = {
        id: "test",
        label: "Test Profile",
        opencodePath,
        ohMyOpencodePath: ohMyPath,
      };

      const result = await readProfileConfig(resolvedProfile);

      expect(result.errors).toHaveLength(0);

      expect(result.baseline.misc.tmux).toEqual({
        enabled: true,
        socket_name: "baseline-socket",
      });
      expect(result.baseline.misc.git_master).toEqual({
        enabled: true,
        main_branch: "master",
      });

      expect(result.editable.misc.tmux).toEqual({
        enabled: true,
      });
      expect(result.editable.misc.git_master).toEqual({
        enabled: false,
      });

      expect(result.effective.misc.tmux).toEqual({
        enabled: true,
      });
      expect(result.effective.misc.git_master).toEqual({
        enabled: false,
      });
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });
});

describe("buildProviderCatalog", () => {
  test("returns unique providers in first-appearance order", () => {
    const models = [
      "anthropic/claude-opus",
      "openai/gpt-4",
      "anthropic/claude-sonnet",
      "google/gemini-pro",
      "openai/gpt-3.5",
    ];
    const catalog = buildProviderCatalog(models);
    expect(catalog).toEqual(["anthropic", "openai", "google"]);
  });

  test("handles models without slash (Unknown provider)", () => {
    const models = ["custom-model", "anthropic/claude", "other-model"];
    const catalog = buildProviderCatalog(models);
    expect(catalog).toEqual(["Unknown", "anthropic"]);
  });

  test("returns empty array for empty input", () => {
    expect(buildProviderCatalog([])).toEqual([]);
  });
});

describe("filterModelsByDisabledProviders", () => {
  test("filters out models from disabled providers", () => {
    const models = [
      "anthropic/claude-opus",
      "openai/gpt-4",
      "google/gemini-pro",
      "anthropic/claude-sonnet",
    ];
    const filtered = filterModelsByDisabledProviders(models, ["openai"]);
    expect(filtered).toEqual([
      "anthropic/claude-opus",
      "google/gemini-pro",
      "anthropic/claude-sonnet",
    ]);
  });

  test("handles multiple disabled providers", () => {
    const models = [
      "anthropic/claude-opus",
      "openai/gpt-4",
      "google/gemini-pro",
      "deepseek/r1",
    ];
    const filtered = filterModelsByDisabledProviders(models, [
      "openai",
      "deepseek",
    ]);
    expect(filtered).toEqual([
      "anthropic/claude-opus",
      "google/gemini-pro",
    ]);
  });

  test("returns all models when no providers disabled", () => {
    const models = ["anthropic/claude", "openai/gpt-4"];
    const filtered = filterModelsByDisabledProviders(models, []);
    expect(filtered).toEqual(models);
  });

  test("handles Unknown provider models", () => {
    const models = ["custom-model", "anthropic/claude"];
    const filtered = filterModelsByDisabledProviders(models, ["Unknown"]);
    expect(filtered).toEqual(["anthropic/claude"]);
  });
});
