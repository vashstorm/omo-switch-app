import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock static routes to avoid importing the web bundle
vi.mock("../../src/server/routes/static", () => ({
  registerStaticRoute: () => {},
}));

import { createApp, type RunningApp } from "../../src/server/app";

async function createTempProfilesRoot(tempDir: string): Promise<string> {
  const profilesRoot = path.join(tempDir, "profiles");
  const profileDir = path.join(profilesRoot, "default");

  await fs.mkdir(profileDir, { recursive: true });

  await fs.writeFile(
    path.join(profileDir, "opencode.jsonc"),
    JSON.stringify(
      {
        agents: {
          planner: {
            model: "gpt-5",
          },
        },
      },
      null,
      2,
    ),
    "utf-8",
  );

  await fs.writeFile(
    path.join(profileDir, "oh-my-openagent.jsonc"),
    JSON.stringify(
      {
        agents: {
          planner: {
            model: "gpt-5",
            variant: "low",
          },
        },
      },
      null,
      2,
    ),
    "utf-8",
  );

  return profilesRoot;
}

describe("api save", () => {
  let tempDir = "";
  let runningApp: RunningApp;
  let baseUrl = "";
  let ohMyPath = "";

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "omo-switch-api-save-"));
    const profilesRoot = await createTempProfilesRoot(tempDir);
    ohMyPath = path.join(profilesRoot, "default/oh-my-openagent.jsonc");

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

  it("saves valid payload successfully", async () => {
    const detailResponse = await fetch(`${baseUrl}/api/profiles/default`);
    const detail = await detailResponse.json();

    const response = await fetch(`${baseUrl}/api/profiles/default`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        payload: {
          agents: {
            planner: {
              model: "gpt-5-mini",
              variant: "medium",
            },
          },
          categories: {},
          misc: {},
        },
        expectedMtime: detail.mtime,
      }),
    });

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(typeof body.mtime).toBe("number");

    const savedContent = await fs.readFile(ohMyPath, "utf-8");
    expect(savedContent).toContain("gpt-5-mini");
    expect(savedContent).toContain("medium");
  });

  it("returns validation error for invalid payload", async () => {
    const detailResponse = await fetch(`${baseUrl}/api/profiles/default`);
    const detail = await detailResponse.json();

    const response = await fetch(`${baseUrl}/api/profiles/default`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        payload: {
          agents: {
            planner: {
              model: "gpt-5-mini",
              variant: "ultra",
            },
          },
          categories: {},
          misc: {},
        },
        expectedMtime: detail.mtime,
      }),
    });

    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe("VALIDATION_ERROR");
    expect(String(body.message)).toContain("variant");
  });

  it("saves agent with fallback_models successfully", async () => {
    const detailResponse = await fetch(`${baseUrl}/api/profiles/default`);
    const detail = await detailResponse.json();

    const response = await fetch(`${baseUrl}/api/profiles/default`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        payload: {
          agents: {
            planner: {
              model: "gpt-5",
              fallback_models: ["gpt-4", "gpt-3.5"],
            },
          },
          categories: {},
          misc: {},
        },
        expectedMtime: detail.mtime,
      }),
    });

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);

    const savedContent = await fs.readFile(ohMyPath, "utf-8");
    const savedJson = JSON.parse(savedContent);
    expect(savedJson.agents.planner.model).toBe("gpt-5");
    expect(savedJson.agents.planner.fallback_models).toEqual(["gpt-4", "gpt-3.5"]);
  });

  it("returns conflict error when mtime mismatches", async () => {
    const detailResponse = await fetch(`${baseUrl}/api/profiles/default`);
    const detail = await detailResponse.json();

    await fs.writeFile(
      ohMyPath,
      JSON.stringify(
        {
          agents: {
            planner: {
              model: "external-change",
            },
          },
        },
        null,
        2,
      ),
      "utf-8",
    );

    const futureTime = new Date(Math.floor(detail.mtime) + 2_000);
    await fs.utimes(ohMyPath, futureTime, futureTime);

    const response = await fetch(`${baseUrl}/api/profiles/default`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        payload: {
          agents: {
            planner: {
              model: "should-not-save",
            },
          },
          categories: {},
          misc: {},
        },
        expectedMtime: detail.mtime,
      }),
    });

    expect(response.status).toBe(409);

    const body = await response.json();
    expect(body).toEqual({
      error: "CONFLICT",
      message: "File modified externally. Please reload.",
    });
  });
});
