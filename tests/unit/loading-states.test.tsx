import React from "react";
import { render, screen, cleanup, act } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { App } from "../../src/web/index";
import { ThemeProvider } from "../../src/web/theme/ThemeContext";

vi.mock("../../src/web/api/client", () => ({
  listProfiles: vi.fn(),
  getProfile: vi.fn(),
  saveProfile: vi.fn(),
  copyProfile: vi.fn(),
  updateDisabledProviders: vi.fn(),
  getGlobalConfig: vi.fn(),
  updateGlobalConfig: vi.fn(),
  getErrorLogs: vi.fn(),
}));

import { listProfiles, getProfile, getGlobalConfig, getErrorLogs } from "../../src/web/api/client";

const mockListProfiles = vi.mocked(listProfiles);
const mockGetProfile = vi.mocked(getProfile);
const mockGetGlobalConfig = vi.mocked(getGlobalConfig);
const mockGetErrorLogs = vi.mocked(getErrorLogs);

function setupLoadingMocks() {
  mockListProfiles.mockImplementation(() => new Promise(() => {}));
  mockGetProfile.mockImplementation(() => new Promise(() => {}));
  mockGetGlobalConfig.mockImplementation(() => new Promise(() => {}));
  mockGetErrorLogs.mockImplementation(() => new Promise(() => {}));
}

describe("Loading States", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  test("displays skeleton loading state with aria-busy semantics", async () => {
    setupLoadingMocks();
    render(
      <ThemeProvider initialTheme="light">
        <App />
      </ThemeProvider>
    );
    
    const skeletons = screen.queryAllByTestId("loading-agents");
    expect(skeletons.length).toBeGreaterThan(0);
    expect(skeletons[0]).toHaveAttribute("aria-busy", "true");
  });
});
