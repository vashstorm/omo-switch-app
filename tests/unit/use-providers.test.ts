import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useProviders } from "../../src/web/hooks/useProviders";

vi.mock("../../src/web/api/client", () => ({
  getProviders: vi.fn(),
  createProvider: vi.fn(),
  createModel: vi.fn(),
  updateModel: vi.fn(),
  deleteModel: vi.fn(),
  deleteProvider: vi.fn(),
}));

import * as apiClient from "../../src/web/api/client";

const mockGetProviders = vi.mocked(apiClient.getProviders);
const mockCreateProvider = vi.mocked(apiClient.createProvider);
const mockCreateModel = vi.mocked(apiClient.createModel);
const mockUpdateModel = vi.mocked(apiClient.updateModel);
const mockDeleteModel = vi.mocked(apiClient.deleteModel);
const mockDeleteProvider = vi.mocked(apiClient.deleteProvider);

const mockProvidersResponse = {
  providers: {
    anthropic: {
      "claude-opus-4-5": {
        type: "anthropic",
        maxTokens: 64000,
      },
      "claude-sonnet-4": {
        type: "anthropic",
        maxTokens: 32000,
      },
    },
    openai: {
      "gpt-4": {
        type: "openai",
        maxTokens: 8192,
      },
    },
  },
};

describe("useProviders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchProviders", () => {
    it("loads providers on mount", async () => {
      mockGetProviders.mockResolvedValueOnce(mockProvidersResponse);

      const { result } = renderHook(() => useProviders());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.initialized).toBe(true);
      });

      expect(result.current.providers).toEqual(mockProvidersResponse.providers);
      expect(result.current.error).toBeNull();
    });

    it("returns sorted providersList on mount", async () => {
      mockGetProviders.mockResolvedValueOnce(mockProvidersResponse);

      const { result } = renderHook(() => useProviders());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const list = result.current.providersList;
      expect(list).toHaveLength(2);
      expect(list[0].name).toBe("anthropic");
      expect(list[1].name).toBe("openai");

      expect(list[0].models).toHaveLength(2);
      expect(list[0].models[0].name).toBe("claude-opus-4-5");
      expect(list[0].models[1].name).toBe("claude-sonnet-4");
    });

    it("surfaces error when fetch fails", async () => {
      mockGetProviders.mockRejectedValueOnce({
        code: "INTERNAL_ERROR",
        message: "Failed to fetch providers",
      });

      const { result } = renderHook(() => useProviders());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe("Failed to fetch providers");
      });

      expect(result.current.providers).toBeNull();
    });
  });

  describe("createProvider", () => {
    it("reloads after successful creation", async () => {
      mockGetProviders
        .mockResolvedValueOnce({ providers: {} })
        .mockResolvedValueOnce({
          providers: { "custom-provider": {} },
        });

      mockCreateProvider.mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useProviders());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.createProvider("custom-provider");
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.providers?.["custom-provider"]).toBeDefined();
      expect(mockGetProviders).toHaveBeenCalledTimes(2);
    });

    it("surfaces validation errors", async () => {
      mockGetProviders.mockResolvedValueOnce({ providers: {} });

      mockCreateProvider.mockRejectedValueOnce({
        code: "VALIDATION_ERROR",
        message: "Provider 'invalid' already exists",
      });

      const { result } = renderHook(() => useProviders());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(result.current.createProvider("invalid")).rejects.toThrow(
        "Provider 'invalid' already exists"
      );
    });
  });

  describe("createModel", () => {
    it("reloads after successful creation", async () => {
      mockGetProviders
        .mockResolvedValueOnce({ providers: { openai: {} } })
        .mockResolvedValueOnce({
          providers: {
            openai: {
              "gpt-5": { maxTokens: 128000 },
            },
          },
        });

      mockCreateModel.mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useProviders());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.createModel("openai", {
          name: "gpt-5",
          maxTokens: 128000,
        });
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.providers?.openai["gpt-5"]).toBeDefined();
      expect(mockGetProviders).toHaveBeenCalledTimes(2);
    });
  });

  describe("deleteModel", () => {
    it("reloads after successful deletion", async () => {
      mockGetProviders
        .mockResolvedValueOnce({
          providers: { openai: { "gpt-4": { maxTokens: 8192 } } },
        })
        .mockResolvedValueOnce({
          providers: { openai: {} },
        });

      mockDeleteModel.mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useProviders());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteModel("openai", "gpt-4");
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.providers?.openai["gpt-4"]).toBeUndefined();
      expect(mockGetProviders).toHaveBeenCalledTimes(2);
    });
  });

  describe("deleteProvider", () => {
    it("reloads after successful deletion", async () => {
      mockGetProviders
        .mockResolvedValueOnce({
          providers: { openai: { "gpt-4": { maxTokens: 8192 } } },
        })
        .mockResolvedValueOnce({
          providers: {},
        });

      mockDeleteProvider.mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useProviders());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteProvider("openai");
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.providers?.openai).toBeUndefined();
      expect(mockGetProviders).toHaveBeenCalledTimes(2);
    });
  });

  describe("updateModel", () => {
    it("reloads after successful update", async () => {
      mockGetProviders
        .mockResolvedValueOnce({
          providers: { openai: { "gpt-4": { maxTokens: 8192 } } },
        })
        .mockResolvedValueOnce({
          providers: { openai: { "gpt-4": { maxTokens: 16384 } } },
        });

      mockUpdateModel.mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useProviders());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.updateModel("openai", "gpt-4", {
          maxTokens: 16384,
        });
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.providers?.openai["gpt-4"].maxTokens).toBe(16384);
      expect(mockGetProviders).toHaveBeenCalledTimes(2);
    });
  });
});
