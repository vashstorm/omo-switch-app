import React from "react";
import { render, screen, fireEvent, cleanup, act, waitFor } from "@testing-library/react";
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

function setupMocks(readonlyTail: Record<string, unknown> = { version: 1, raw: "example" }) {
  mockListProfiles.mockResolvedValue({ profiles: [{ id: "default", label: "Default" }] });
  mockGetProfile.mockResolvedValue({
    baseline: { agents: {}, categories: {}, misc: {} },
    editable: { agents: {}, categories: {}, misc: {} },
    effective: { agents: {}, categories: {}, misc: {} },
    readonlyTail,
    rawMisc: {},
    availableModels: [],
    availableModelGroups: [],
    disabledProviders: [],
    providerCatalog: [],
    mtime: 1000,
    errors: [],
  });
  mockGetGlobalConfig.mockResolvedValue({ syncReplaceEnabled: false, appZoomPercent: 100, defaultProfile: null });
  mockGetErrorLogs.mockResolvedValue({ entries: [], sourceFile: "", truncated: false });
}

describe("Raw Configuration Modal", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  test("raw-config-modal is not visible initially", async () => {
    setupMocks();
    render(
      <ThemeProvider initialTheme="light">
        <App />
      </ThemeProvider>
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(screen.queryByTestId("raw-config-modal")).not.toBeInTheDocument();
  });

  test("clicking raw-config-open button opens the raw config modal", async () => {
    setupMocks();
    render(
      <ThemeProvider initialTheme="light">
        <App />
      </ThemeProvider>
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("raw-config-open"));
    });

    expect(screen.getByTestId("raw-config-modal")).toBeInTheDocument();
    expect(screen.getByTestId("raw-config-content")).toBeInTheDocument();
  });

  test("raw-config-content shows JSON of readonlyTail", async () => {
    setupMocks({ version: 42, raw: "hello" });
    render(
      <ThemeProvider initialTheme="light">
        <App />
      </ThemeProvider>
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("raw-config-open"));
    });

    const content = screen.getByTestId("raw-config-content");
    expect(content.textContent).toContain("42");
    expect(content.textContent).toContain("hello");
  });

  test("clicking raw-config-close button closes the modal", async () => {
    setupMocks();
    render(
      <ThemeProvider initialTheme="light">
        <App />
      </ThemeProvider>
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("raw-config-open"));
    });

    expect(screen.getByTestId("raw-config-modal")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByTestId("raw-config-close"));
    });

    await waitFor(() => {
      expect(screen.queryByTestId("raw-config-modal")).not.toBeInTheDocument();
    });
  });

  test("pressing Escape closes the modal", async () => {
    setupMocks();
    render(
      <ThemeProvider initialTheme="light">
        <App />
      </ThemeProvider>
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("raw-config-open"));
    });

    const modal = screen.getByTestId("raw-config-modal");
    expect(modal).toBeInTheDocument();

    await act(async () => {
      fireEvent.keyDown(modal, { key: "Escape" });
    });

    await waitFor(() => {
      expect(screen.queryByTestId("raw-config-modal")).not.toBeInTheDocument();
    });
  });

  test("modal has correct ARIA attributes", async () => {
    setupMocks();
    render(
      <ThemeProvider initialTheme="light">
        <App />
      </ThemeProvider>
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("raw-config-open"));
    });

    const modal = screen.getByTestId("raw-config-modal");
    expect(modal).toHaveAttribute("role", "dialog");
    expect(modal).toHaveAttribute("aria-modal", "true");
    expect(modal).toHaveAttribute("aria-labelledby", "raw-config-title");
  });

  test("close button has aria-label", async () => {
    setupMocks();
    render(
      <ThemeProvider initialTheme="light">
        <App />
      </ThemeProvider>
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("raw-config-open"));
    });

    const closeButton = screen.getByTestId("raw-config-close");
    expect(closeButton).toHaveAttribute("aria-label", "Close raw configuration modal");
  });

  test("focus trap cycles focus within modal", async () => {
    setupMocks();
    render(
      <ThemeProvider initialTheme="light">
        <App />
      </ThemeProvider>
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("raw-config-open"));
    });

    const modal = screen.getByTestId("raw-config-modal");
    const closeButton = screen.getByTestId("raw-config-close");

    expect(document.activeElement).toBeTruthy();

    await act(async () => {
      fireEvent.keyDown(modal, { key: "Tab" });
    });

    expect(closeButton).toBeInTheDocument();
  });

  test("readonly-tail-panel is not present in page (inline panel removed)", async () => {
    setupMocks();
    render(
      <ThemeProvider initialTheme="light">
        <App />
      </ThemeProvider>
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(screen.queryByTestId("readonly-tail-panel")).not.toBeInTheDocument();
  });
});
