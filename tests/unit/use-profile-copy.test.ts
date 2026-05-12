import { describe, expect, test, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useProfile } from "../../src/web/hooks/useProfile";

vi.mock("../../src/web/api/client", () => ({
  listProfiles: vi.fn(),
  copyProfile: vi.fn(),
}));

import { listProfiles, copyProfile } from "../../src/web/api/client";

const mockListProfiles = vi.mocked(listProfiles);
const mockCopyProfile = vi.mocked(copyProfile);

describe("useProfile.copyProfile", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockListProfiles.mockResolvedValue({ profiles: [] });
  });

  test("returns success with profile on successful copy", async () => {
    mockCopyProfile.mockResolvedValue({
      profile: { id: "new-profile", label: "new-profile" },
    });

    const { result } = renderHook(() => useProfile(null));

    await act(async () => {
      await Promise.resolve();
    });

    let copyResult!: Awaited<ReturnType<typeof result.current.copyProfile>>;
    await act(async () => {
      copyResult = await result.current.copyProfile("source", "new-profile");
    });

    expect(copyResult.success).toBe(true);
    expect(copyResult.profile?.id).toBe("new-profile");
    expect(copyResult.profile?.label).toBe("new-profile");
  });

  test("returns error with status on 409 conflict", async () => {
    mockCopyProfile.mockRejectedValue({
      code: "CONFLICT",
      message: "Profile already exists",
    });

    const { result } = renderHook(() => useProfile(null));

    await act(async () => {
      await Promise.resolve();
    });

    let copyResult!: Awaited<ReturnType<typeof result.current.copyProfile>>;
    await act(async () => {
      copyResult = await result.current.copyProfile("source", "existing");
    });

    expect(copyResult.success).toBe(false);
    expect(copyResult.status).toBe(409);
    expect(copyResult.error).toContain("already exists");
  });

  test("returns error on 400 validation failure", async () => {
    mockCopyProfile.mockRejectedValue({
      code: "VALIDATION_ERROR",
      message: "Invalid target ID",
    });

    const { result } = renderHook(() => useProfile(null));

    await act(async () => {
      await Promise.resolve();
    });

    let copyResult!: Awaited<ReturnType<typeof result.current.copyProfile>>;
    await act(async () => {
      copyResult = await result.current.copyProfile("source", "Bad Name");
    });

    expect(copyResult.success).toBe(false);
    expect(copyResult.status).toBe(400);
    expect(copyResult.error).toContain("Invalid target ID");
  });
});
