import { describe, expect, test, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useProfile } from "../../src/web/hooks/useProfile";

vi.mock("../../src/web/api/client", () => ({
  listProfiles: vi.fn(),
  getProfile: vi.fn(),
}));

import { listProfiles, getProfile } from "../../src/web/api/client";

const mockListProfiles = vi.mocked(listProfiles);
const mockGetProfile = vi.mocked(getProfile);

const mockProfileData = (models: string[], mtime: number) => ({
  baseline: { agents: {}, categories: {}, misc: {} },
  editable: { agents: {}, categories: {}, misc: {} },
  effective: { agents: {}, categories: {}, misc: {} },
  readonlyTail: {},
  rawMisc: {},
  mtime,
  errors: [],
  availableModels: models,
  availableModelGroups: [],
  disabledProviders: [],
  providerCatalog: [],
});

describe("useProfile profile switching", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test("clears currentProfile immediately when switching to different profile", async () => {
    mockListProfiles.mockResolvedValue({
      profiles: [{ id: "profile-a", label: "Profile A" }, { id: "profile-b", label: "Profile B" }],
    });

    mockGetProfile.mockResolvedValueOnce(mockProfileData(["model-a"], 1));

    const { result, rerender } = renderHook(({ id }) => useProfile(id), {
      initialProps: { id: "profile-a" as string | null },
    });

    await waitFor(() => {
      expect(result.current.currentProfile).not.toBeNull();
    });

    expect(result.current.currentProfile?.availableModels).toContain("model-a");

    mockGetProfile.mockResolvedValueOnce(mockProfileData(["model-b"], 2));

    rerender({ id: "profile-b" });

    expect(result.current.currentProfile).toBeNull();
    expect(result.current.isSwitching).toBe(true);

    await waitFor(() => {
      expect(result.current.isSwitching).toBe(false);
    });

    expect(result.current.currentProfile).not.toBeNull();
    expect(result.current.currentProfile?.availableModels).toContain("model-b");
  });

  test("sets isSwitching to true during profile switch", async () => {
    mockListProfiles.mockResolvedValue({
      profiles: [{ id: "profile-a", label: "Profile A" }],
    });

    mockGetProfile.mockResolvedValueOnce(mockProfileData([], 1));

    const { result } = renderHook(() => useProfile("profile-a"));

    await waitFor(() => {
      expect(result.current.isSwitching).toBe(false);
    });
  });

  test("ignores late response from previous profile request", async () => {
    mockListProfiles.mockResolvedValue({
      profiles: [{ id: "profile-a", label: "Profile A" }, { id: "profile-b", label: "Profile B" }],
    });

    mockGetProfile.mockResolvedValueOnce(mockProfileData(["model-a"], 1));

    const { result, rerender } = renderHook(({ id }) => useProfile(id), {
      initialProps: { id: "profile-a" as string | null },
    });

    await waitFor(() => {
      expect(result.current.currentProfile).not.toBeNull();
    });

    expect(result.current.currentProfile?.availableModels).toContain("model-a");

    let resolveProfileB: () => void;
    const profileBPromise = new Promise<void>((resolve) => {
      resolveProfileB = resolve;
    });

    mockGetProfile.mockImplementationOnce(() => {
      return profileBPromise.then(() => mockProfileData(["model-b"], 2));
    });

    rerender({ id: "profile-b" });

    expect(result.current.currentProfile).toBeNull();

    resolveProfileB!();

    await waitFor(() => {
      expect(result.current.currentProfile).not.toBeNull();
    });

    expect(result.current.currentProfile?.availableModels).toContain("model-b");
  });

  test("clears currentProfile when profileId becomes null", async () => {
    mockListProfiles.mockResolvedValue({
      profiles: [{ id: "profile-a", label: "Profile A" }],
    });

    mockGetProfile.mockResolvedValueOnce(mockProfileData([], 1));

    const { result, rerender } = renderHook(({ id }) => useProfile(id), {
      initialProps: { id: "profile-a" as string | null },
    });

    await waitFor(() => {
      expect(result.current.currentProfile).not.toBeNull();
    });

    rerender({ id: null });

    expect(result.current.currentProfile).toBeNull();
  });
});