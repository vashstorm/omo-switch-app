/**
 * @vitest-environment node
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import os from "node:os";
import { afterEach, describe, expect, it, vi, beforeAll, afterAll } from "vitest";
import { Hono } from "hono";

import { registerProfileRoutes } from "../../src/server/routes/profiles";
import { loggers } from "../../src/shared/logger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("api profile model logging", () => {
  let tempDir: string;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let app: Hono;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "omo-switch-logging-"));

    const profileDir = path.join(tempDir, "test-profile");
    await fs.mkdir(profileDir, { recursive: true });

    await fs.writeFile(
      path.join(profileDir, "opencode.jsonc"),
      JSON.stringify({
        provider: {
          testProvider: {
            models: {
              "model-a": { name: "Model A" },
            },
          },
        },
      }),
      "utf-8",
    );

    await fs.writeFile(
      path.join(profileDir, "oh-my-openagent.jsonc"),
      JSON.stringify({
        agents: {
          planner: { model: "openai/gpt-5.4" },
          coder: { model: "anthropic/claude-sonnet-4-6", fallback_models: ["openai/gpt-5.3-codex"] },
        },
        categories: {
          backend: { model: "openai/gpt-5.4" },
        },
      }),
      "utf-8",
    );

    logSpy = vi.spyOn(loggers.serverRoutesProfiles, "info");

    app = new Hono();
    registerProfileRoutes(app, { profilesRoot: tempDir });
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    logSpy?.mockRestore();
  });

  it("logs model source entries when loading profile", async () => {
    const response = await app.request("/api/profiles/test-profile");
    expect(response.status).toBe(200);

    const calls = logSpy.mock.calls as Array<[Record<string, unknown>, string]>;
    const modelSourceLogs = calls.filter(
      (call: [Record<string, unknown>, string]) => call[0]?.operation === "profiles.model_source_loaded",
    );

    expect(modelSourceLogs.length).toBeGreaterThan(0);

    const firstLog = modelSourceLogs[0];
    expect(firstLog[0]).toHaveProperty("model");
    expect(firstLog[0]).toHaveProperty("sourceType");
    expect(firstLog[0]).toHaveProperty("sourceLabel");
    expect(firstLog[0]).toHaveProperty("configPath");
    expect(firstLog[1]).toBe("Profile model source loaded");
  });

  it("logs summary with unique model count", async () => {
    logSpy.mockClear();
    const response = await app.request("/api/profiles/test-profile");
    expect(response.status).toBe(200);

    const calls = logSpy.mock.calls as Array<[Record<string, unknown>, string]>;
    const summaryLogs = calls.filter(
      (call: [Record<string, unknown>, string]) => call[0]?.operation === "profiles.model_source_summary",
    );

    expect(summaryLogs.length).toBe(1);
    expect(summaryLogs[0][0]).toHaveProperty("uniqueModelCount");
    expect(summaryLogs[0][0]).toHaveProperty("sourceEntryCount");
    expect(summaryLogs[0][1]).toBe("Profile model sources initialized");
  });

  it("includes correct source labels in logs", async () => {
    logSpy.mockClear();
    const response = await app.request("/api/profiles/test-profile");
    expect(response.status).toBe(200);

    const calls = logSpy.mock.calls as Array<[Record<string, unknown>, string]>;
    const modelSourceLogs = calls.filter(
      (call: [Record<string, unknown>, string]) => call[0]?.operation === "profiles.model_source_loaded",
    );

    const sourceLabels = modelSourceLogs.map((call: [Record<string, unknown>, string]) => call[0]?.sourceLabel as string);

    expect(sourceLabels.some((label: string) => label === "profile config (opencode.jsonc)")).toBe(true);
    expect(sourceLabels.some((label: string) => label === "profile config (oh-my-openagent.jsonc)")).toBe(true);
  });

  it("logs models from agents and categories references", async () => {
    logSpy.mockClear();
    const response = await app.request("/api/profiles/test-profile");
    expect(response.status).toBe(200);

    const calls = logSpy.mock.calls as Array<[Record<string, unknown>, string]>;
    const modelSourceLogs = calls.filter(
      (call: [Record<string, unknown>, string]) => call[0]?.operation === "profiles.model_source_loaded",
    );

    const models = modelSourceLogs.map((call: [Record<string, unknown>, string]) => call[0]?.model as string);

    expect(models.some((m: string) => m === "openai/gpt-5.4")).toBe(true);
    expect(models.some((m: string) => m === "anthropic/claude-sonnet-4-6")).toBe(true);
    expect(models.some((m: string) => m === "openai/gpt-5.3-codex")).toBe(true);
    expect(models.some((m: string) => m === "testProvider/model-a")).toBe(true);
  });
});