import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock static routes to avoid importing the web bundle
vi.mock("../../src/server/routes/static", () => ({
  registerStaticRoute: () => {},
}));

import { createApp, type RunningApp } from "../../src/server/app";

describe("config roundtrip regression", () => {
  let tempDir = "";
  let runningApp: RunningApp;
  let baseUrl = "";

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "omo-switch-regression-"));
  });

  afterEach(async () => {
    runningApp?.stop();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("missing oh-my-openagent.jsonc auto-create", () => {
    it("creates oh-my-openagent.jsonc when missing, leaving baseline untouched", async () => {
      // profilesRoot = tempDir, profile folder = tempDir/default
      const profileDir = path.join(tempDir, "default");
      await fs.mkdir(profileDir, { recursive: true });

      // Create baseline opencode.jsonc
      const baselineContent = {
        agents: {
          planner: { model: "gpt-4" },
        },
        categories: {},
        misc: {},
      };
      await fs.writeFile(
        path.join(profileDir, "opencode.jsonc"),
        JSON.stringify(baselineContent, null, 2),
        "utf-8",
      );

      // oh-my-openagent.jsonc does NOT exist
      const ohMyPath = path.join(profileDir, "oh-my-openagent.jsonc");
      await expect(fs.access(ohMyPath)).rejects.toThrow();

      // Start app with profilesRoot = tempDir (directory-based discovery)
      runningApp = await createApp({
        profilesRoot: tempDir,
        autoOpen: false,
      });
      baseUrl = `http://127.0.0.1:${runningApp.port}`;

      // Get profile detail
      const detailResponse = await fetch(`${baseUrl}/api/profiles/default`);
      const detail = await detailResponse.json();
      expect(detailResponse.status).toBe(200);

      // Save with managed fields
      const saveResponse = await fetch(`${baseUrl}/api/profiles/default`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          payload: {
            agents: {
              planner: { model: "gpt-5", variant: "high" },
            },
            categories: {},
            misc: {},
          },
          expectedMtime: detail.mtime,
        }),
      });

      expect(saveResponse.status).toBe(200);
      const saveResult = await saveResponse.json();
      expect(saveResult.success).toBe(true);

      // Verify oh-my-openagent.jsonc was created
      const ohMyExists = await fs.access(ohMyPath).then(() => true).catch(() => false);
      expect(ohMyExists).toBe(true);

      // Verify oh-my-openagent.jsonc contains only managed fields
      const ohMyContent = await fs.readFile(ohMyPath, "utf-8");
      const ohMyData = JSON.parse(ohMyContent);
      expect(ohMyData.agents.planner.model).toBe("gpt-5");
      expect(ohMyData.agents.planner.variant).toBe("high");

      // Verify baseline opencode.jsonc is untouched
      const baselineData = JSON.parse(await fs.readFile(path.join(profileDir, "opencode.jsonc"), "utf-8"));
      expect(baselineData.agents.planner.model).toBe("gpt-4");
    });
  });

  describe("unknown field retention", () => {
    it("preserves unmanaged custom fields during save", async () => {
      // profilesRoot = tempDir, profile folder = tempDir/default
      const profileDir = path.join(tempDir, "default");
      await fs.mkdir(profileDir, { recursive: true });

      // Create baseline opencode.jsonc
      await fs.writeFile(
        path.join(profileDir, "opencode.jsonc"),
        JSON.stringify({ agents: {}, categories: {}, misc: {} }, null, 2),
        "utf-8",
      );

      // Create oh-my-openagent.jsonc with unmanaged fields
      const ohMyPath = path.join(profileDir, "oh-my-openagent.jsonc");
      await fs.writeFile(
        ohMyPath,
        JSON.stringify(
          {
            agents: {
              planner: {
                model: "gpt-4",
                custom_unmanaged: "should be retained",
                another_custom: 123,
              },
            },
            categories: {
              backend: {
                model: "gpt-4",
                custom_category_field: true,
              },
            },
            misc: {
              tmux: {
                enabled: true,
                custom_misc_setting: "value",
              },
            },
            top_level_unmanaged: "top level value",
          },
          null,
          2,
        ),
        "utf-8",
      );

      runningApp = await createApp({
        profilesRoot: tempDir,
        autoOpen: false,
      });
      baseUrl = `http://127.0.0.1:${runningApp.port}`;

      // Get profile detail
      const detailResponse = await fetch(`${baseUrl}/api/profiles/default`);
      const detail = await detailResponse.json();

      // Save with changes to managed fields only
      const saveResponse = await fetch(`${baseUrl}/api/profiles/default`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          payload: {
            agents: {
              planner: { model: "gpt-5", variant: "low" },
            },
            categories: {},
            misc: {},
          },
          expectedMtime: detail.mtime,
        }),
      });

      expect(saveResponse.status).toBe(200);

      // Verify unmanaged fields are preserved
      const savedContent = await fs.readFile(ohMyPath, "utf-8");
      const savedData = JSON.parse(savedContent);

      // Managed field should be updated
      expect(savedData.agents.planner.model).toBe("gpt-5");
      expect(savedData.agents.planner.variant).toBe("low");

      // Unmanaged fields should be preserved
      expect(savedData.agents.planner.custom_unmanaged).toBe("should be retained");
      expect(savedData.agents.planner.another_custom).toBe(123);
      expect(savedData.categories.backend.custom_category_field).toBe(true);
      expect(savedData.misc.tmux.custom_misc_setting).toBe("value");
      expect(savedData.top_level_unmanaged).toBe("top level value");
    });
  });

  describe("bad JSONC error handling", () => {
    it("returns proper error for corrupt JSONC syntax", async () => {
      // profilesRoot = tempDir, profile folder = tempDir/default
      const profileDir = path.join(tempDir, "default");
      await fs.mkdir(profileDir, { recursive: true });

      // Create baseline opencode.jsonc
      await fs.writeFile(
        path.join(profileDir, "opencode.jsonc"),
        JSON.stringify({ agents: {}, categories: {}, misc: {} }, null, 2),
        "utf-8",
      );

      // Create oh-my-openagent.jsonc with bad JSONC syntax
      const ohMyPath = path.join(profileDir, "oh-my-openagent.jsonc");
      await fs.writeFile(
        ohMyPath,
        `{ agents: { planner: { model: "gpt-4" // missing closing braces`,
        "utf-8",
      );

      runningApp = await createApp({
        profilesRoot: tempDir,
        autoOpen: false,
      });
      baseUrl = `http://127.0.0.1:${runningApp.port}`;

      // Get profile detail - should return with errors
      const detailResponse = await fetch(`${baseUrl}/api/profiles/default`);
      expect(detailResponse.status).toBe(200);

      const detail = await detailResponse.json();

      // Should have parse errors
      expect(detail.errors).toBeDefined();
      expect(detail.errors.length).toBeGreaterThan(0);

      // Error should include path and message
      const jsoncError = detail.errors.find((e: { path: string }) =>
        e.path.includes("oh-my-openagent.jsonc"),
      );
      expect(jsoncError).toBeDefined();
      expect(jsoncError.message).toContain("JSONC");
    });

    it("returns proper error for invalid JSON in baseline", async () => {
      // profilesRoot = tempDir, profile folder = tempDir/default
      const profileDir = path.join(tempDir, "default");
      await fs.mkdir(profileDir, { recursive: true });

      // Create baseline opencode.jsonc with bad syntax
      await fs.writeFile(
        path.join(profileDir, "opencode.jsonc"),
        `{ invalid json: missing closing`,
        "utf-8",
      );

      // Create valid oh-my-openagent.jsonc
      await fs.writeFile(
        path.join(profileDir, "oh-my-openagent.jsonc"),
        JSON.stringify({ agents: {} }, null, 2),
        "utf-8",
      );

      runningApp = await createApp({
        profilesRoot: tempDir,
        autoOpen: false,
      });
      baseUrl = `http://127.0.0.1:${runningApp.port}`;

      // Get profile detail - should return with errors
      const detailResponse = await fetch(`${baseUrl}/api/profiles/default`);
      expect(detailResponse.status).toBe(200);

      const detail = await detailResponse.json();

      // Should have parse errors for baseline
      expect(detail.errors).toBeDefined();
      expect(detail.errors.length).toBeGreaterThan(0);

      const baselineError = detail.errors.find((e: { path: string }) =>
        e.path.includes("opencode.jsonc"),
      );
      expect(baselineError).toBeDefined();
    });
  });

  describe("comments preservation", () => {
    it("preserves JSONC comments during edit and save", async () => {
      // profilesRoot = tempDir, profile folder = tempDir/default
      const profileDir = path.join(tempDir, "default");
      await fs.mkdir(profileDir, { recursive: true });

      // Create baseline opencode.jsonc
      await fs.writeFile(
        path.join(profileDir, "opencode.jsonc"),
        JSON.stringify({ agents: {}, categories: {}, misc: {} }, null, 2),
        "utf-8",
      );

      // Create oh-my-openagent.jsonc with comments
      const ohMyPath = path.join(profileDir, "oh-my-openagent.jsonc");
      const originalContent = `{
  // This is a comment about agents
  "agents": {
    /* Multi-line
       comment for planner */
    "planner": {
      "model": "gpt-4" // inline comment
    }
  },
  // Category configuration
  "categories": {},
  "misc": {}
}`;
      await fs.writeFile(ohMyPath, originalContent, "utf-8");

      runningApp = await createApp({
        profilesRoot: tempDir,
        autoOpen: false,
      });
      baseUrl = `http://127.0.0.1:${runningApp.port}`;

      // Get profile detail
      const detailResponse = await fetch(`${baseUrl}/api/profiles/default`);
      const detail = await detailResponse.json();

      // Save with changes
      const saveResponse = await fetch(`${baseUrl}/api/profiles/default`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          payload: {
            agents: {
              planner: { model: "gpt-5", variant: "high" },
            },
            categories: {},
            misc: {},
          },
          expectedMtime: detail.mtime,
        }),
      });

      expect(saveResponse.status).toBe(200);

      // Verify comments are preserved
      const savedContent = await fs.readFile(ohMyPath, "utf-8");

      // Check that comments are still present
      expect(savedContent).toContain("// This is a comment about agents");
      expect(savedContent).toContain("/* Multi-line");
      expect(savedContent).toContain("comment for planner */");
      expect(savedContent).toContain("// Category configuration");

      // Verify the change was applied
      expect(savedContent).toContain('"model": "gpt-5"');
      expect(savedContent).toContain('"variant": "high"');
    });

    it("preserves comments and omits blank fields in roundtrip", async () => {
      const profileDir = path.join(tempDir, "default");
      await fs.mkdir(profileDir, { recursive: true });

      await fs.writeFile(
        path.join(profileDir, "opencode.jsonc"),
        JSON.stringify({ agents: {}, categories: {}, misc: {} }, null, 2),
        "utf-8",
      );

      const ohMyPath = path.join(profileDir, "oh-my-openagent.jsonc");
      const originalContent = `{
  // Top-level comment for agents
  "agents": {
    /* Planner agent block comment */
    "planner": {
      "model": "gpt-4",
      "variant": "medium"
    },
    // Another agent comment
    "builder": {
      "model": "claude-3"
    }
  },
  // Categories section
  "categories": {
    "dev": {
      "model": "gpt-3.5"
    }
  },
  "misc": {}
}`;
      await fs.writeFile(ohMyPath, originalContent, "utf-8");

      runningApp = await createApp({
        profilesRoot: tempDir,
        autoOpen: false,
      });
      baseUrl = `http://127.0.0.1:${runningApp.port}`;

      const detailResponse = await fetch(`${baseUrl}/api/profiles/default`);
      const detail = await detailResponse.json();

      // Save with payload containing blank fields (only fields that pass Zod validation)
      const payload = {
        agents: {
          planner: {
            temperature: 0,
            fallback_models: [],
          },
          builder: {
            model: "claude-3",
          },
        },
        categories: {
          dev: {
            temperature: 0,
            fallback_models: [],
          },
        },
        misc: {},
      } as unknown as import("../../src/shared/config/types").EditableConfig;

      const saveResponse = await fetch(`${baseUrl}/api/profiles/default`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          payload,
          expectedMtime: detail.mtime,
        }),
      });

      expect(saveResponse.status).toBe(200);

      const savedContent = await fs.readFile(ohMyPath, "utf-8");

      // Comments preserved
      expect(savedContent).toContain("// Top-level comment for agents");
      expect(savedContent).toContain("/* Planner agent block comment */");
      expect(savedContent).toContain("// Another agent comment");
      expect(savedContent).toContain("// Categories section");

      // Blank fields omitted (not in saved text)
      expect(savedContent).not.toContain('"temperature": 0');
      expect(savedContent).not.toContain('"fallback_models": []');

      // Builder agent model preserved (non-blank value)
      expect(savedContent).toContain('"model": "claude-3"');
    });
  });
});
