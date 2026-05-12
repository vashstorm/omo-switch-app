import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

vi.mock("../../src/server/routes/static", () => ({
  registerStaticRoute: () => {},
}));

import { createApp, type RunningApp } from "../../src/server/app";

describe("provider/model API integration", () => {
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

  describe("GET /api/config/providers", () => {
    it("returns empty providers when no providers exist", async () => {
      const response = await fetch(`${baseUrl}/api/config/providers`);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ providers: {} });
    });
  });

  describe("POST /api/config/providers", () => {
    it("creates a provider with valid name", async () => {
      const response = await fetch(`${baseUrl}/api/config/providers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "test-provider" }),
      });
      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body).toEqual({ name: "test-provider", models: {} });
    });

    it("returns 400 for invalid provider name", async () => {
      const response = await fetch(`${baseUrl}/api/config/providers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Invalid_Name" }),
      });
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("VALIDATION_ERROR");
    });

    it("returns 409 for duplicate provider", async () => {
      await fetch(`${baseUrl}/api/config/providers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "dup-provider" }),
      });

      const response = await fetch(`${baseUrl}/api/config/providers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "dup-provider" }),
      });
      expect(response.status).toBe(409);
      const body = await response.json();
      expect(body.error).toBe("DUPLICATE");
    });
  });

  describe("PUT /api/config/providers/:provider", () => {
    it("updates provider models", async () => {
      await fetch(`${baseUrl}/api/config/providers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "update-provider" }),
      });

      const response = await fetch(`${baseUrl}/api/config/providers/update-provider`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ models: { "model-a": { type: "openai", maxTokens: 4000 } } }),
      });
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.name).toBe("update-provider");
      expect(body.models).toEqual({ "model-a": { type: "openai", maxTokens: 4000 } });
    });

    it("returns 404 for missing provider", async () => {
      const response = await fetch(`${baseUrl}/api/config/providers/nonexistent`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ models: {} }),
      });
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe("NOT_FOUND");
    });
  });

  describe("DELETE /api/config/providers/:provider", () => {
    it("deletes a provider", async () => {
      await fetch(`${baseUrl}/api/config/providers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "delete-provider" }),
      });

      const response = await fetch(`${baseUrl}/api/config/providers/delete-provider`, {
        method: "DELETE",
      });
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.deleted).toBe("delete-provider");

      const getResponse = await fetch(`${baseUrl}/api/config/providers`);
      const getBody = await getResponse.json();
      expect(getBody.providers).not.toHaveProperty("delete-provider");
    });

    it("returns 404 for missing provider", async () => {
      const response = await fetch(`${baseUrl}/api/config/providers/nonexistent`, {
        method: "DELETE",
      });
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe("NOT_FOUND");
    });
  });

  describe("POST /api/config/providers/:provider/models", () => {
    it("creates a model with valid config", async () => {
      await fetch(`${baseUrl}/api/config/providers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "model-test-provider" }),
      });

      const response = await fetch(`${baseUrl}/api/config/providers/model-test-provider/models`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "gpt-4", type: "openai", maxTokens: 8000 }),
      });
      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.name).toBe("gpt-4");
      expect(body.type).toBe("openai");
      expect(body.maxTokens).toBe(8000);
    });

    it("returns 400 for invalid model name", async () => {
      const response = await fetch(`${baseUrl}/api/config/providers/some-provider/models`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "" }),
      });
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("VALIDATION_ERROR");
    });

    it("returns 400 for model name with slash", async () => {
      const response = await fetch(`${baseUrl}/api/config/providers/some-provider/models`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "openai/gpt-4" }),
      });
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("VALIDATION_ERROR");
    });

    it("returns 400 for invalid maxTokens", async () => {
      const response = await fetch(`${baseUrl}/api/config/providers/some-provider/models`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "valid-model", maxTokens: -1 }),
      });
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("VALIDATION_ERROR");
    });

    it("returns 409 for duplicate model", async () => {
      await fetch(`${baseUrl}/api/config/providers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "dup-model-provider" }),
      });

      await fetch(`${baseUrl}/api/config/providers/dup-model-provider/models`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "my-model" }),
      });

      const response = await fetch(`${baseUrl}/api/config/providers/dup-model-provider/models`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "my-model" }),
      });
      expect(response.status).toBe(409);
      const body = await response.json();
      expect(body.error).toBe("DUPLICATE");
    });
  });

  describe("PUT /api/config/providers/:provider/models/:model", () => {
    it("updates model maxTokens", async () => {
      await fetch(`${baseUrl}/api/config/providers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "update-model-provider" }),
      });

      await fetch(`${baseUrl}/api/config/providers/update-model-provider/models`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "update-model", maxTokens: 1000 }),
      });

      const response = await fetch(`${baseUrl}/api/config/providers/update-model-provider/models/update-model`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxTokens: 5000 }),
      });
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.maxTokens).toBe(5000);
    });

    it("preserves unknown fields", async () => {
      await fetch(`${baseUrl}/api/config/providers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "preserve-provider" }),
      });

      await fetch(`${baseUrl}/api/config/providers/preserve-provider/models`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "preserve-model", type: "custom", customField: "value" }),
      });

      const response = await fetch(`${baseUrl}/api/config/providers/preserve-provider/models/preserve-model`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxTokens: 3000 }),
      });
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.type).toBe("custom");
      expect(body.customField).toBe("value");
      expect(body.maxTokens).toBe(3000);
    });

    it("returns 404 for missing model", async () => {
      await fetch(`${baseUrl}/api/config/providers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "missing-provider" }),
      });

      const response = await fetch(`${baseUrl}/api/config/providers/missing-provider/models/nonexistent`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxTokens: 1000 }),
      });
      expect(response.status).toBe(404);
    });
  });

  describe("DELETE /api/config/providers/:provider/models/:model", () => {
    it("deletes a model", async () => {
      await fetch(`${baseUrl}/api/config/providers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "delete-model-provider" }),
      });

      await fetch(`${baseUrl}/api/config/providers/delete-model-provider/models`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "to-delete" }),
      });

      const response = await fetch(`${baseUrl}/api/config/providers/delete-model-provider/models/to-delete`, {
        method: "DELETE",
      });
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.deleted).toBe("to-delete");

      const getResponse = await fetch(`${baseUrl}/api/config/providers`);
      const getBody = await getResponse.json();
      expect(getBody.providers["delete-model-provider"]).not.toHaveProperty("to-delete");
    });

    it("returns 404 for missing model", async () => {
      await fetch(`${baseUrl}/api/config/providers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "missing-model-provider" }),
      });

      const response = await fetch(`${baseUrl}/api/config/providers/missing-model-provider/models/nonexistent`, {
        method: "DELETE",
      });
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe("NOT_FOUND");
    });
  });

  describe("Full CRUD round-trip", () => {
    it("create provider -> create model -> get -> update -> get -> delete model -> get -> delete provider -> get", async () => {
      await fetch(`${baseUrl}/api/config/providers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "roundtrip-provider" }),
      });

      await fetch(`${baseUrl}/api/config/providers/roundtrip-provider/models`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "roundtrip-model", maxTokens: 1000 }),
      });

      let providers = await (await fetch(`${baseUrl}/api/config/providers`)).json();
      expect(providers.providers["roundtrip-provider"]).toHaveProperty("roundtrip-model");

      await fetch(`${baseUrl}/api/config/providers/roundtrip-provider/models/roundtrip-model`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxTokens: 2000 }),
      });

      providers = await (await fetch(`${baseUrl}/api/config/providers`)).json();
      expect(providers.providers["roundtrip-provider"]["roundtrip-model"].maxTokens).toBe(2000);

      await fetch(`${baseUrl}/api/config/providers/roundtrip-provider/models/roundtrip-model`, {
        method: "DELETE",
      });

      providers = await (await fetch(`${baseUrl}/api/config/providers`)).json();
      expect(providers.providers["roundtrip-provider"]).not.toHaveProperty("roundtrip-model");

      await fetch(`${baseUrl}/api/config/providers/roundtrip-provider`, {
        method: "DELETE",
      });

      providers = await (await fetch(`${baseUrl}/api/config/providers`)).json();
      expect(providers.providers).not.toHaveProperty("roundtrip-provider");
    });
  });
});
