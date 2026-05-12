import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock static routes to avoid importing the web bundle
vi.mock("../../src/server/routes/static", () => ({
  registerStaticRoute: () => {},
}));

import { createApp, type RunningApp } from "../../src/server/app";

let tempDir = "";
let runningApp: RunningApp;
let baseUrl = "";
let profilesRoot = "";

async function createTempProfilesRoot(dir: string): Promise<string> {
  const root = path.join(dir, "profiles");
  const profileDir = path.join(root, "default");
  await fs.mkdir(profileDir, { recursive: true });
  await fs.writeFile(
    path.join(profileDir, "opencode.jsonc"),
    '{ "agents": { "planner": { "model": "gpt-5" } } }',
    "utf-8",
  );
  await fs.writeFile(
    path.join(profileDir, "oh-my-openagent.jsonc"),
    '{ "agents": {} }',
    "utf-8",
  );
  return root;
}

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "api-copy-test-"));
  profilesRoot = await createTempProfilesRoot(tempDir);

  runningApp = await createApp({
    profilesRoot,
    autoOpen: false,
  });
  baseUrl = `http://127.0.0.1:${runningApp.port}`;
});

afterEach(async () => {
  runningApp?.stop();
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe("api copy profile", () => {
  it("copies a profile to a new directory and returns profile metadata", async () => {
    const response = await fetch(`${baseUrl}/api/profiles/default/copy`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ targetId: "copy-smoke" }),
    });

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.profile.id).toBe("copy-smoke");
    expect(body.profile.label).toBe("copy-smoke");

    const opencodeExists = await fs
      .access(path.join(profilesRoot, "copy-smoke", "opencode.jsonc"))
      .then(() => true)
      .catch(() => false);
    const ohMyExists = await fs
      .access(path.join(profilesRoot, "copy-smoke", "oh-my-openagent.jsonc"))
      .then(() => true)
      .catch(() => false);

    expect(opencodeExists).toBe(true);
    expect(ohMyExists).toBe(true);
  });

  it("returns 409 when target already exists", async () => {
    await fetch(`${baseUrl}/api/profiles/default/copy`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ targetId: "copy-smoke" }),
    });

    const response = await fetch(`${baseUrl}/api/profiles/default/copy`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ targetId: "copy-smoke" }),
    });

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe("CONFLICT");
  });

  it("returns 400 for invalid target id", async () => {
    const response = await fetch(`${baseUrl}/api/profiles/default/copy`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ targetId: "Bad Name!" }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  it("returns 404 when source profile does not exist", async () => {
    const response = await fetch(`${baseUrl}/api/profiles/nonexistent/copy`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ targetId: "new-profile" }),
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("NOT_FOUND");
  });

  it("returns 400 for missing targetId in request body", async () => {
    const response = await fetch(`${baseUrl}/api/profiles/default/copy`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("VALIDATION_ERROR");
  });
});
