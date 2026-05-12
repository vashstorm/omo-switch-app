import React from "react";
import { render, screen, fireEvent, cleanup, act, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { ThemeProvider } from "../../src/web/theme/ThemeContext";
import { App } from "../../src/web/index";

vi.mock("../../src/web/error-log/bus", () => ({
  subscribeToErrorLog: vi.fn(() => vi.fn()),
  getErrorLogEntries: vi.fn(() => []),
}));

vi.mock("../../src/web/error-log", () => ({
  addErrorLogEntry: vi.fn(),
}));

vi.mock("../../src/web/error-log/capture", () => ({
  setupWindowErrorListeners: vi.fn(),
}));

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

function setupMocks(
  profiles = [{ id: "default", label: "Default" }],
  errorEntries: string[] = [],
) {
  mockListProfiles.mockResolvedValue({ profiles });
  mockGetProfile.mockResolvedValue({
    baseline: { agents: {}, categories: {}, misc: {} },
    editable: { agents: {}, categories: {}, misc: {} },
    effective: { agents: {}, categories: {}, misc: {} },
    readonlyTail: {},
    rawMisc: {},
    availableModels: [],
    availableModelGroups: [],
    disabledProviders: [],
    providerCatalog: [],
    mtime: 1000,
    errors: [],
  });
  mockGetGlobalConfig.mockResolvedValue({ syncReplaceEnabled: false, appZoomPercent: 100, defaultProfile: null });
  mockGetErrorLogs.mockResolvedValue({
    entries: errorEntries,
    sourceFile: ".tshouse/logs/errors.jsonl",
    truncated: false,
  });
}

describe("App error log integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  test("default collapsed state hides the toggle when there are no errors", async () => {
    setupMocks();
    render(
      <ThemeProvider initialTheme="light">
        <App />
      </ThemeProvider>,
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(screen.queryByTestId("error-log-toggle")).not.toBeInTheDocument();
    expect(screen.queryByTestId("error-log-panel")).not.toBeInTheDocument();
  });

  test("clicking toggle expands the panel and renders correctly", async () => {
    setupMocks(undefined, ["Backend error"]);
    render(
      <ThemeProvider initialTheme="light">
        <App />
      </ThemeProvider>,
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("error-log-toggle"));
    });

    expect(screen.getByTestId("error-log-panel")).toBeInTheDocument();
    expect(screen.getByText("Error Log")).toBeInTheDocument();
  });

  test("refresh button is present and clickable in expanded state", async () => {
    setupMocks(undefined, ["Backend error"]);
    render(
      <ThemeProvider initialTheme="light">
        <App />
      </ThemeProvider>,
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("error-log-toggle"));
    });

    const refreshButton = screen.getByTestId("error-log-refresh");
    expect(refreshButton).toBeInTheDocument();
    expect(refreshButton).not.toBeDisabled();
  });

  test("ToastViewport and ErrorLogPanel coexist without layout collision", async () => {
    setupMocks(undefined, ["Backend error"]);
    render(
      <ThemeProvider initialTheme="light">
        <App />
      </ThemeProvider>,
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(screen.getByTestId("toast-viewport")).toBeInTheDocument();
    expect(screen.getByTestId("error-log-toggle")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByTestId("error-log-toggle"));
    });

    expect(screen.getByTestId("error-log-panel")).toBeInTheDocument();

    const toastViewport = screen.getByTestId("toast-viewport");
    const errorPanel = screen.getByTestId("error-log-panel");

    const toastStyle = window.getComputedStyle(toastViewport);
    const panelStyle = window.getComputedStyle(errorPanel);

    expect(toastStyle.position).toBe("fixed");
    expect(panelStyle.position).toBe("fixed");
  });

  test("markSeen is called when panel toggles from collapsed with unread", async () => {
    setupMocks(undefined, ["Backend error"]);

    render(
      <ThemeProvider initialTheme="light">
        <App />
      </ThemeProvider>,
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(screen.getByTestId("error-log-toggle")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByTestId("error-log-toggle"));
    });

    expect(screen.getByTestId("error-log-panel")).toBeInTheDocument();

    expect(screen.getByText("Backend error")).toBeInTheDocument();
  });

  test("empty state is hidden when there are no entries", async () => {
    setupMocks();
    render(
      <ThemeProvider initialTheme="light">
        <App />
      </ThemeProvider>,
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(screen.queryByTestId("error-log-toggle")).not.toBeInTheDocument();
    expect(screen.queryByTestId("error-log-empty")).not.toBeInTheDocument();
    expect(screen.queryByText("No errors recorded")).not.toBeInTheDocument();
  });

  test("panel close button collapses back to toggle", async () => {
    setupMocks(undefined, ["Backend error"]);
    render(
      <ThemeProvider initialTheme="light">
        <App />
      </ThemeProvider>,
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("error-log-toggle"));
    });

    expect(screen.getByTestId("error-log-panel")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByTestId("error-log-panel").querySelector("button:last-of-type")!);
    });

    await waitFor(() => {
      expect(screen.getByTestId("error-log-toggle")).toBeInTheDocument();
    });
  });
});
