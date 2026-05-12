import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { readProfileConfig } from "../../src/shared/config";
import type { ResolvedProfile } from "../../src/shared/profiles/types";

describe("read-only tail", () => {
  test("includes top-level fields from oh-my-opencode only", async () => {
    const resolvedProfile: ResolvedProfile = {
      id: "test",
      label: "Test Profile",
      opencodePath: path.resolve(
        __dirname,
        "../fixtures/config/full-opencode.jsonc",
      ),
      ohMyOpencodePath: path.resolve(
        __dirname,
        "../fixtures/config/with-unmanaged-fields.jsonc",
      ),
    };

    const result = await readProfileConfig(resolvedProfile);

    // From oh-my-openagent.jsonc
    expect(result.readonlyTail.top_level_unmanaged).toBe(
      "should be in readonlyTail",
    );

    // From opencode.jsonc - should NOT appear
    expect(result.readonlyTail.custom_field).toBeUndefined();
  });

  test("includes full agent fields from oh-my-opencode (including managed)", async () => {
    const resolvedProfile: ResolvedProfile = {
      id: "test",
      label: "Test Profile",
      opencodePath: path.resolve(
        __dirname,
        "../fixtures/config/minimal-opencode.jsonc",
      ),
      ohMyOpencodePath: path.resolve(
        __dirname,
        "../fixtures/config/with-unmanaged-fields.jsonc",
      ),
    };

    const result = await readProfileConfig(resolvedProfile);

    expect(result.readonlyTail.agents).toBeDefined();
    expect(result.readonlyTail.agents?.planner).toBeDefined();
    const planner = result.readonlyTail.agents?.planner as Record<string, unknown>;

    // Managed fields should NOW be included (full content)
    expect(planner.model).toBe("gpt-5");

    // Unmanaged fields still included
    expect(planner.custom_agent_field).toBe("unmanaged value");
    expect(planner.another_unmanaged).toBe(123);

    // Agents only in opencode.jsonc should NOT appear
    expect(result.readonlyTail.agents?.coder).toBeUndefined();
  });

  test("includes full category fields from oh-my-opencode (including managed)", async () => {
    const resolvedProfile: ResolvedProfile = {
      id: "test",
      label: "Test Profile",
      opencodePath: path.resolve(
        __dirname,
        "../fixtures/config/minimal-opencode.jsonc",
      ),
      ohMyOpencodePath: path.resolve(
        __dirname,
        "../fixtures/config/with-unmanaged-fields.jsonc",
      ),
    };

    const result = await readProfileConfig(resolvedProfile);

    expect(result.readonlyTail.categories).toBeDefined();
    expect(result.readonlyTail.categories?.backend).toBeDefined();
    const backend = result.readonlyTail.categories?.backend as Record<string, unknown>;

    // Managed fields should NOW be included (full content)
    expect(backend.model).toBe("gpt-4");

    // Unmanaged fields still included
    expect(backend.custom_category_field).toBe(true);
  });

  test("includes full misc fields from oh-my-opencode (including managed)", async () => {
    const resolvedProfile: ResolvedProfile = {
      id: "test",
      label: "Test Profile",
      opencodePath: path.resolve(
        __dirname,
        "../fixtures/config/minimal-opencode.jsonc",
      ),
      ohMyOpencodePath: path.resolve(
        __dirname,
        "../fixtures/config/with-unmanaged-fields.jsonc",
      ),
    };

    const result = await readProfileConfig(resolvedProfile);

    expect(result.readonlyTail.misc).toBeDefined();

    // tmux section - managed field should NOW be included
    const tmux = result.readonlyTail.misc?.tmux as Record<string, unknown> | undefined;
    expect(tmux?.enabled).toBe(true);
    expect(tmux?.custom_tmux_setting).toBe("value");

    // Unknown section in misc still shown
    expect(result.readonlyTail.misc?.unknown_section).toBeDefined();
    const unknownSection = result.readonlyTail.misc?.unknown_section as Record<string, unknown>;
    expect(unknownSection.some_field).toBe("value");

    // Misc sections only in opencode.jsonc should NOT appear
    expect(result.readonlyTail.misc?.git_master).toBeUndefined();
  });

  test("only oh-my-opencode content appears in readonlyTail", async () => {
    const resolvedProfile: ResolvedProfile = {
      id: "test",
      label: "Test Profile",
      opencodePath: path.resolve(
        __dirname,
        "../fixtures/config/full-opencode.jsonc",
      ),
      ohMyOpencodePath: path.resolve(
        __dirname,
        "../fixtures/config/with-unmanaged-fields.jsonc",
      ),
    };

    const result = await readProfileConfig(resolvedProfile);

    // Top-level: only from oh-my-opencode
    expect(result.readonlyTail.top_level_unmanaged).toBe(
      "should be in readonlyTail",
    );
    expect(result.readonlyTail.custom_field).toBeUndefined(); // from opencode, should NOT appear

    // Agents: only from oh-my-opencode
    const planner = result.readonlyTail.agents?.planner as Record<string, unknown>;
    expect(planner.model).toBe("gpt-5");
    expect(planner.custom_agent_field).toBe("unmanaged value");
    expect(result.readonlyTail.agents?.coder).toBeUndefined(); // only in opencode

    // Categories: only from oh-my-opencode
    const backend = result.readonlyTail.categories?.backend as Record<string, unknown>;
    expect(backend.model).toBe("gpt-4");
    expect(backend.custom_category_field).toBe(true);

    // Misc: only from oh-my-opencode
    expect(result.readonlyTail.misc?.tmux).toBeDefined();
    expect(result.readonlyTail.misc?.unknown_section).toBeDefined();
    expect(result.readonlyTail.misc?.git_master).toBeUndefined(); // only in opencode
  });

  test("$schema is preserved at top level but stripped from nested objects", async () => {
    const resolvedProfile: ResolvedProfile = {
      id: "test",
      label: "Test Profile",
      opencodePath: path.resolve(
        __dirname,
        "../fixtures/config/full-opencode.jsonc",
      ),
      ohMyOpencodePath: path.resolve(
        __dirname,
        "../fixtures/config/with-unmanaged-fields.jsonc",
      ),
    };

    const result = await readProfileConfig(resolvedProfile);

    expect(result.readonlyTail.$schema).toBe("https://example.com/oh-my-opencode.schema.json");

    for (const agent of Object.values(result.readonlyTail.agents || {})) {
      expect((agent as Record<string, unknown>).$schema).toBeUndefined();
    }

    for (const category of Object.values(result.readonlyTail.categories || {})) {
      expect((category as Record<string, unknown>).$schema).toBeUndefined();
    }

    for (const section of Object.values(result.readonlyTail.misc || {})) {
      if (typeof section === "object" && section !== null) {
        expect((section as Record<string, unknown>).$schema).toBeUndefined();
      }
    }
  });

  test("preserves primitive misc values (string, number, boolean, null, array)", async () => {
    const resolvedProfile: ResolvedProfile = {
      id: "test",
      label: "Test Profile",
      opencodePath: path.resolve(
        __dirname,
        "../fixtures/config/minimal-opencode.jsonc",
      ),
      ohMyOpencodePath: path.resolve(
        __dirname,
        "../fixtures/config/with-primitive-misc.jsonc",
      ),
    };

    const result = await readProfileConfig(resolvedProfile);

    expect(result.readonlyTail.misc).toBeDefined();

    // Primitive string value
    expect(result.readonlyTail.misc?.primitive_string).toBe("hello world");

    // Primitive number value
    expect(result.readonlyTail.misc?.primitive_number).toBe(42);

    // Primitive boolean value
    expect(result.readonlyTail.misc?.primitive_boolean).toBe(true);

    // Primitive null value
    expect(result.readonlyTail.misc?.primitive_null).toBeNull();

    // Array value
    expect(result.readonlyTail.misc?.array_value).toEqual(["item1", "item2"]);

    // Object section still works
    const objectSection = result.readonlyTail.misc?.object_section as Record<string, unknown>;
    expect(objectSection?.nested_field).toBe("nested value");

    // Known section (tmux) still works
    const tmux = result.readonlyTail.misc?.tmux as Record<string, unknown>;
    expect(tmux?.enabled).toBe(true);
  });
});