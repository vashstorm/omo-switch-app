import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";
import {
  listProfiles,
  getProfile,
  saveProfile,
  copyProfile,
  updateDisabledProviders,
  getGlobalConfig,
  updateGlobalConfig,
  getErrorLogs,
  getProviders,
} from "@/web/api/client";
import type { AppError } from "@/web/api/types";

describe("API client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "__TAURI_INTERNALS__", {
      value: {},
      configurable: true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("listProfiles", () => {
    it("returns profile list on success", async () => {
      vi.mocked(invoke).mockResolvedValueOnce({
        profiles: [
          { id: "default", label: "Default" },
          { id: "work", label: "Work" },
        ],
      });

      const result = await listProfiles();
      expect(result.profiles).toHaveLength(2);
      expect(result.profiles[0].id).toBe("default");
      expect(result.profiles[0].label).toBe("Default");
      expect(invoke).toHaveBeenCalledWith("list_profiles");
    });

    it("throws mapped error on failure", async () => {
      vi.mocked(invoke).mockRejectedValueOnce({
        code: "INTERNAL_ERROR",
        message: "Failed to list profiles",
      });

      await expect(listProfiles()).rejects.toMatchObject({
        code: "INTERNAL_ERROR",
        message: "Failed to list profiles",
      });
    });
  });

  describe("getProfile", () => {
    it("returns profile config on success", async () => {
      vi.mocked(invoke).mockResolvedValueOnce({
        baseline: { agents: {}, categories: {}, misc: {} },
        editable: { agents: {}, categories: {}, misc: {} },
        effective: { agents: {}, categories: {}, misc: {} },
        readonlyTail: {},
        rawMisc: {},
        availableModels: ["model-a"],
        availableModelGroups: [],
        disabledProviders: [],
        providerCatalog: [],
        mtime: 12345,
        errors: [],
      });

      const result = await getProfile("default");
      expect(result.mtime).toBe(12345);
      expect(result.availableModels).toContain("model-a");
      expect(invoke).toHaveBeenCalledWith("get_profile", { profileId: "default" });
    });

    it("throws NOT_FOUND error when profile missing", async () => {
      vi.mocked(invoke).mockRejectedValueOnce({
        code: "NOT_FOUND",
        message: "Profile not found",
      });

      await expect(getProfile("nonexistent")).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: "Profile not found",
      });
    });
  });

  describe("saveProfile", () => {
    it("returns save response on success", async () => {
      const config = {
        agents: { build: { model: "claude" } },
        categories: {},
        misc: undefined,
      };
      vi.mocked(invoke).mockResolvedValueOnce({
        success: true,
        mtime: 12350,
      });

      const result = await saveProfile("default", config, 12345);
      expect(result.success).toBe(true);
      expect(result.mtime).toBe(12350);
      expect(invoke).toHaveBeenCalledWith("save_profile", {
        request: {
          profileId: "default",
          payload: config,
          expectedMtime: 12345,
        },
      });
    });

    it("throws CONFLICT error with conflictMtime", async () => {
      vi.mocked(invoke).mockRejectedValueOnce({
        code: "CONFLICT",
        message: "Profile modified by another process",
        conflictMtime: 12346,
      });

      const config = { agents: {}, categories: {}, misc: undefined };
      await expect(saveProfile("default", config, 12345)).rejects.toMatchObject({
        code: "CONFLICT",
        message: "Profile modified by another process",
        conflictMtime: 12346,
      });
    });

    it("throws VALIDATION_ERROR error", async () => {
      vi.mocked(invoke).mockRejectedValueOnce({
        code: "VALIDATION_ERROR",
        message: "Invalid config",
        validationErrors: ["model is required"],
      });

      const config = { agents: {}, categories: {}, misc: undefined };
      await expect(saveProfile("default", config, null)).rejects.toMatchObject({
        code: "VALIDATION_ERROR",
        message: "Invalid config",
        validationErrors: ["model is required"],
      });
    });
  });

  describe("copyProfile", () => {
    it("returns new profile on success", async () => {
      vi.mocked(invoke).mockResolvedValueOnce({
        profile: {
          id: "new-profile",
          label: "new-profile",
        },
      });

      const result = await copyProfile("default", "new-profile");
      expect(result.profile.id).toBe("new-profile");
      expect(result.profile.label).toBe("new-profile");
      expect(invoke).toHaveBeenCalledWith("copy_profile", {
        sourceId: "default",
        targetId: "new-profile",
      });
    });

    it("throws NOT_FOUND error when source missing", async () => {
      vi.mocked(invoke).mockRejectedValueOnce({
        code: "NOT_FOUND",
        message: "Source profile not found",
      });

      await expect(copyProfile("nonexistent", "target")).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: "Source profile not found",
      });
    });
  });

  describe("updateDisabledProviders", () => {
    it("returns profile config on success", async () => {
      vi.mocked(invoke).mockResolvedValueOnce({
        baseline: { agents: {}, categories: {}, misc: {} },
        editable: { agents: {}, categories: {}, misc: {} },
        effective: { agents: {}, categories: {}, misc: {} },
        readonlyTail: {},
        rawMisc: {},
        availableModels: [],
        availableModelGroups: [],
        disabledProviders: ["openai"],
        providerCatalog: [],
        mtime: 12345,
        errors: [],
      });

      const result = await updateDisabledProviders("default", ["openai"]);
      expect(result.disabledProviders).toEqual(["openai"]);
      expect(invoke).toHaveBeenCalledWith("update_disabled_providers", {
        profileId: "default",
        disabledProviders: ["openai"],
      });
    });
  });

  describe("getGlobalConfig", () => {
    it("returns global config on success", async () => {
      vi.mocked(invoke).mockResolvedValueOnce({
        syncReplaceEnabled: true,
        defaultProfile: "work",
      });

      const result = await getGlobalConfig();
      expect(result.syncReplaceEnabled).toBe(true);
      expect(result.defaultProfile).toBe("work");
      expect(invoke).toHaveBeenCalledWith("get_global_config");
    });
  });

  describe("updateGlobalConfig", () => {
    it("returns updated config on success", async () => {
      vi.mocked(invoke).mockResolvedValueOnce({
        syncReplaceEnabled: false,
        defaultProfile: null,
      });

      const result = await updateGlobalConfig({
        syncReplaceEnabled: false,
        defaultProfile: null,
      });
      expect(result.syncReplaceEnabled).toBe(false);
      expect(result.defaultProfile).toBeNull();
      expect(invoke).toHaveBeenCalledWith("update_global_config", {
        syncReplaceEnabled: false,
        defaultProfile: null,
      });
    });

    it("retries wrapped request payload when flat payload is rejected", async () => {
      vi.mocked(invoke)
        .mockRejectedValueOnce({
          code: "VALIDATION_ERROR",
          message: "At least one field must be provided",
        })
        .mockResolvedValueOnce({
          appZoomPercent: 105,
        });

      const result = await updateGlobalConfig({ appZoomPercent: 105 });

      expect(result.appZoomPercent).toBe(105);
      expect(invoke).toHaveBeenNthCalledWith(1, "update_global_config", {
        appZoomPercent: 105,
      });
      expect(invoke).toHaveBeenNthCalledWith(2, "update_global_config", {
        request: {
          appZoomPercent: 105,
        },
      });
    });
  });

  describe("getErrorLogs", () => {
    it("returns error logs on success", async () => {
      vi.mocked(invoke).mockResolvedValueOnce({
        entries: ["Error 1: something failed", "Error 2: another failure"],
        sourceFile: "/path/to/error.log",
        truncated: false,
      });

      const result = await getErrorLogs();
      expect(result.entries).toHaveLength(2);
      expect(result.sourceFile).toBe("/path/to/error.log");
      expect(result.truncated).toBe(false);
      expect(invoke).toHaveBeenCalledWith("get_error_logs");
    });
  });

  describe("error mapping", () => {
    it("maps unknown error to INTERNAL_ERROR", async () => {
      vi.mocked(invoke).mockRejectedValueOnce(new Error("Network failed"));

      await expect(listProfiles()).rejects.toMatchObject({
        code: "INTERNAL_ERROR",
        message: "Network failed",
      });
    });

    it("maps non-Error object to INTERNAL_ERROR", async () => {
      vi.mocked(invoke).mockRejectedValueOnce("Something went wrong");

      await expect(listProfiles()).rejects.toMatchObject({
        code: "INTERNAL_ERROR",
        message: "Something went wrong",
      });
    });
  });

  describe("HTTP fallback", () => {
    it("uses fetch outside the Tauri runtime", async () => {
      Reflect.deleteProperty(window, "__TAURI_INTERNALS__");
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          providers: {
            openai: {
              "gpt-4": { maxTokens: 8192 },
            },
          },
        }),
      });
      vi.stubGlobal("fetch", fetchMock);

      const result = await getProviders();

      expect(invoke).not.toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/config/providers",
        expect.objectContaining({
          headers: expect.objectContaining({
            "content-type": "application/json",
          }),
        })
      );
      expect(result.providers.openai["gpt-4"].maxTokens).toBe(8192);
    });
  });
});
