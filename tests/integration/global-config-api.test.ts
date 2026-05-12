import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

// Mock static routes to avoid importing the web bundle
vi.mock("../../src/server/routes/static", () => ({
  registerStaticRoute: () => {},
}));

import { createApp, type RunningApp } from "../../src/server/app";

describe("global config API integration", () => {
  let runningApp: RunningApp;
  let baseUrl = "";
  let tempDir: string;
  let tempConfigPath: string;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "omo-api-test-"));
    tempConfigPath = path.join(tempDir, "config.jsonc");

    runningApp = await createApp({
      autoOpen: false,
      configPath: tempConfigPath,
    });

    baseUrl = `http://127.0.0.1:${runningApp.port}`;
  });

  afterAll(async () => {
    runningApp?.stop();
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {}
  });

  beforeEach(async () => {
    try {
      await fs.rm(tempConfigPath, { force: true });
    } catch {}
  });

  it("GET /api/config/global returns syncReplaceEnabled: false when config missing", async () => {
    const response = await fetch(`${baseUrl}/api/config/global`);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ syncReplaceEnabled: false, appZoomPercent: 100, defaultProfile: null });
  });

  it("PUT /api/config/global writes true and subsequent GET returns true", async () => {
    const putResponse = await fetch(`${baseUrl}/api/config/global`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ syncReplaceEnabled: true }),
    });
    expect(putResponse.status).toBe(200);
    const putBody = await putResponse.json();
    expect(putBody).toEqual({ syncReplaceEnabled: true });

    const getResponse = await fetch(`${baseUrl}/api/config/global`);
    expect(getResponse.status).toBe(200);
    const getBody = await getResponse.json();
    expect(getBody).toEqual({ syncReplaceEnabled: true, appZoomPercent: 100, defaultProfile: null });
  });

  it("PUT /api/config/global writes false", async () => {
    await fetch(`${baseUrl}/api/config/global`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ syncReplaceEnabled: true }),
    });

    const response = await fetch(`${baseUrl}/api/config/global`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ syncReplaceEnabled: false }),
    });
    expect(response.status).toBe(200);

    const getResponse = await fetch(`${baseUrl}/api/config/global`);
    const getBody = await getResponse.json();
    expect(getBody).toEqual({ syncReplaceEnabled: false, appZoomPercent: 100, defaultProfile: null });
  });

  it("PUT /api/config/global writes app zoom percent", async () => {
    const putResponse = await fetch(`${baseUrl}/api/config/global`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appZoomPercent: 115 }),
    });
    expect(putResponse.status).toBe(200);
    const putBody = await putResponse.json();
    expect(putBody).toEqual({ appZoomPercent: 115 });

    const getResponse = await fetch(`${baseUrl}/api/config/global`);
    expect(getResponse.status).toBe(200);
    const getBody = await getResponse.json();
    expect(getBody).toEqual({ syncReplaceEnabled: false, appZoomPercent: 115, defaultProfile: null });
  });

  it("rejects invalid app zoom step", async () => {
    const response = await fetch(`${baseUrl}/api/config/global`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appZoomPercent: 113 }),
    });
    expect(response.status).toBe(400);
  });

  it("rejects invalid payload - not a boolean", async () => {
    const response = await fetch(`${baseUrl}/api/config/global`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ syncReplaceEnabled: "yes" }),
    });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it("rejects invalid payload - missing field", async () => {
    const response = await fetch(`${baseUrl}/api/config/global`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(response.status).toBe(400);
  });

  it("rejects invalid JSON body", async () => {
    const response = await fetch(`${baseUrl}/api/config/global`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    expect(response.status).toBe(400);
  });
});
