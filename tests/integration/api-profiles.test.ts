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

describe("api profiles", () => {
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

  it("returns profile list shape", async () => {
    const response = await fetch(`${baseUrl}/api/profiles`);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toEqual({
      profiles: [
        { id: "default", label: "default" },
        { id: "omo", label: "omo" },
      ],
    });
  });

  it("returns profile detail shape with mtime and availableModels", async () => {
    const response = await fetch(`${baseUrl}/api/profiles/default`);
    expect(response.status).toBe(200);

    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toHaveProperty("baseline");
    expect(body).toHaveProperty("editable");
    expect(body).toHaveProperty("readonlyTail");
    expect(body).toHaveProperty("effective");
    expect(body).toHaveProperty("errors");
    expect(body).toHaveProperty("mtime");
    expect(body).toHaveProperty("availableModels");
    expect(typeof body.mtime).toBe("number");
    expect(Array.isArray(body.availableModels)).toBe(true);
  });

  it("returns not found for unknown profile", async () => {
    const response = await fetch(`${baseUrl}/api/profiles/missing-profile`);
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body).toEqual({
      error: "NOT_FOUND",
      message: "Profile 'missing-profile' does not exist.",
    });
  });
});
