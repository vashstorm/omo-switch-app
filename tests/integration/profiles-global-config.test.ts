import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Mock static routes to avoid importing the web bundle
vi.mock("../../src/server/routes/static", () => ({
  registerStaticRoute: () => {},
}));

import { createApp, type RunningApp } from "../../src/server/app";

describe("profiles global config integration", () => {
  let runningApp: RunningApp;
  let baseUrl = "";
  let tempDir = "";
  let tempConfigPath = "";
  const testDir = path.dirname(fileURLToPath(import.meta.url));

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "omo-profiles-global-"));
    tempConfigPath = path.join(tempDir, "config.jsonc");
    const profilesRoot = path.resolve(testDir, "../../config/profiles");
    const configContent = JSON.stringify(
      {
        config_path: [profilesRoot],
        providers: {
          openai: {
            "gpt-5.4": {
              maxTokens: 64000,
            },
          },
          google: {
            "gemini-3-flash-preview": {
              maxTokens: 1000000,
            },
          },
        },
      },
      null,
      2,
    );
    await fs.writeFile(tempConfigPath, configContent, "utf8");

    runningApp = await createApp({
      autoOpen: false,
      configPath: tempConfigPath,
    });

    baseUrl = `http://127.0.0.1:${runningApp.port}`;
  });

  afterAll(async () => {
    runningApp?.stop();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("discovers profiles root from config/config.jsonc when no explicit root given", async () => {
    const response = await fetch(`${baseUrl}/api/profiles`);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body.profiles)).toBe(true);
    expect(body.profiles.length).toBeGreaterThan(0);
    expect(body.profiles.map((profile: { id: string }) => profile.id)).toContain("omor");
  });

  it("returns availableModels from passed configPath global config for profile detail", async () => {
    const listResponse = await fetch(`${baseUrl}/api/profiles`);
    const listBody = await listResponse.json();
    const firstId = listBody.profiles[0].id;

    const detailResponse = await fetch(`${baseUrl}/api/profiles/${firstId}`);
    expect(detailResponse.status).toBe(200);

    const detail = await detailResponse.json();
    expect(Array.isArray(detail.availableModels)).toBe(true);
    expect(detail.availableModels.length).toBeGreaterThan(0);
    expect(detail.availableModels).toContain("openai/gpt-5.4");
    expect(detail.availableModels).toContain("google/gemini-3-flash-preview");
  });

  it("returns disabledProviders and providerCatalog in profile detail", async () => {
    const listResponse = await fetch(`${baseUrl}/api/profiles`);
    const listBody = await listResponse.json();
    const firstId = listBody.profiles[0].id;

    const detailResponse = await fetch(`${baseUrl}/api/profiles/${firstId}`);
    expect(detailResponse.status).toBe(200);

    const detail = await detailResponse.json();
    expect(Array.isArray(detail.disabledProviders)).toBe(true);
    expect(Array.isArray(detail.providerCatalog)).toBe(true);
    expect(detail.providerCatalog.length).toBeGreaterThan(0);
    expect(detail.providerCatalog).toContain("openai");
    expect(detail.providerCatalog).toContain("google");
  });

  it("PUT disabled-providers writes and returns updated profile with filtered models", async () => {
    const listResponse = await fetch(`${baseUrl}/api/profiles`);
    const listBody = await listResponse.json();
    const firstId = listBody.profiles[0].id;

    const putResponse = await fetch(`${baseUrl}/api/profiles/${firstId}/disabled-providers`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disabledProviders: ["openai"] }),
    });
    expect(putResponse.status).toBe(200);

    const updatedProfile = await putResponse.json();
    expect(updatedProfile.disabledProviders).toEqual(["openai"]);
    expect(updatedProfile.availableModels).not.toContain("openai/gpt-5.4");
    expect(updatedProfile.availableModels).toContain("google/gemini-3-flash-preview");
    expect(updatedProfile.providerCatalog).toContain("openai");
    expect(updatedProfile.providerCatalog).toContain("google");

    const reReadResponse = await fetch(`${baseUrl}/api/profiles/${firstId}`);
    expect(reReadResponse.status).toBe(200);
    const reReadProfile = await reReadResponse.json();
    expect(reReadProfile.disabledProviders).toEqual(["openai"]);
    expect(reReadProfile.availableModels).not.toContain("openai/gpt-5.4");
  });

  it("PUT disabled-providers rejects malformed payload with 400", async () => {
    const listResponse = await fetch(`${baseUrl}/api/profiles`);
    const listBody = await listResponse.json();
    const firstId = listBody.profiles[0].id;

    const invalidResponse = await fetch(`${baseUrl}/api/profiles/${firstId}/disabled-providers`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invalidKey: ["openai"] }),
    });
    expect(invalidResponse.status).toBe(400);

    const errorBody = await invalidResponse.json();
    expect(errorBody.error).toBe("VALIDATION_ERROR");
  });

  it("PUT disabled-providers returns 404 for non-existent profile", async () => {
    const notFoundResponse = await fetch(`${baseUrl}/api/profiles/nonexistent-profile/disabled-providers`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disabledProviders: ["openai"] }),
    });
    expect(notFoundResponse.status).toBe(404);

    const errorBody = await notFoundResponse.json();
    expect(errorBody.error).toBe("NOT_FOUND");
  });
});
