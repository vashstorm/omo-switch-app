import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import {
  THEME_STORAGE_KEY,
  resolveThemePreference,
  useThemePreference,
} from "../../src/web/hooks/useThemePreference";

describe("useThemePreference", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  afterEach(() => {
    cleanup();
  });

  test("defaults to light and applies to document", async () => {
    const { result } = renderHook(() => useThemePreference());

    await waitFor(() => {
      expect(result.current.theme).toBe("light");
    });
    expect(result.current.resolvedTheme).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  test("reads dark theme from localStorage", async () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");

    expect(resolveThemePreference()).toBe("dark");

    const { result } = renderHook(() => useThemePreference());

    await waitFor(() => {
      expect(result.current.theme).toBe("dark");
    });
    expect(result.current.resolvedTheme).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  test("falls back to light for invalid localStorage value", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "invalid-theme");
    expect(resolveThemePreference()).toBe("light");
  });

  test("setTheme updates theme and persists to localStorage", async () => {
    const { result } = renderHook(() => useThemePreference());

    act(() => {
      result.current.setTheme("dark");
    });

    await waitFor(() => {
      expect(result.current.theme).toBe("dark");
    });
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });
});