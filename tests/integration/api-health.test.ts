import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Mock static routes to avoid importing the web bundle
vi.mock("../../src/server/routes/static", () => ({
  registerStaticRoute: () => {},
}));

import { createApp, type RunningApp } from "../../src/server/app";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("api health", () => {
  let runningApp: RunningApp;
  let baseUrl = "";

  beforeAll(async () => {
    const profilesRoot = path.resolve(
      __dirname,
      "../fixtures/discovery-root",
    );

    runningApp = await createApp({
      profilesRoot,
      autoOpen: false,
    });

    baseUrl = `http://127.0.0.1:${runningApp.port}`;
  });

  afterAll(() => {
    runningApp?.stop();
  });

  it("starts on dynamic local port and returns health payload", async () => {
    expect(runningApp.port).toBeGreaterThan(0);
    expect(runningApp.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);

    const response = await fetch(`${baseUrl}/api/health`);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toEqual({
      status: "ok",
      version: "0.1.0",
    });
  });
});
