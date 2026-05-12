import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ThemeProvider as MuiThemeProvider, createTheme } from "@mui/material/styles";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { setupWindowErrorListeners } from "../../src/web/error-log/capture";

const baseProfile = {
  baseline: { agents: {}, categories: {}, misc: {} },
  editable: { agents: {}, categories: {}, misc: {} },
  effective: { agents: {}, categories: {}, misc: {} },
  readonlyTail: {},
  rawMisc: {},
  mtime: 1,
  errors: [],
  availableModels: ["model-a"],
  availableModelGroups: [],
  disabledProviders: [],
  providerCatalog: [],
};

interface AppMockOptions {
  profileError?: string | null;
  globalConfigError?: string | null;
  saveProfileResult?: Record<string, unknown>;
  copyProfileResult?: Record<string, unknown>;
}

function renderWithTheme(element: React.ReactElement) {
  return render(
    <MuiThemeProvider theme={createTheme()}>
      {element}
    </MuiThemeProvider>,
  );
}

async function loadMockedApp(options: AppMockOptions = {}) {
  vi.resetModules();

  const addErrorLogEntry = vi.fn();
  const setupWindowCleanup = vi.fn();
  const setupWindowErrorListenersMock = vi.fn(() => setupWindowCleanup);
  const saveProfile = vi.fn().mockResolvedValue(options.saveProfileResult ?? { success: true, mtime: 2 });
  const copyProfile = vi.fn().mockResolvedValue(
    options.copyProfileResult ?? { success: true, profile: { id: "copy-target", label: "copy-target" } },
  );
  const updateDisabledProviders = vi.fn();
  const refreshProfiles = vi.fn().mockResolvedValue(undefined);
  const reloadProfile = vi.fn();
  const setError = vi.fn();
  const updateSyncReplaceEnabled = vi.fn().mockResolvedValue(undefined);
  const updateDefaultProfile = vi.fn().mockResolvedValue(undefined);
  const reloadGlobalConfig = vi.fn().mockResolvedValue(undefined);

  vi.doMock("../../src/web/hooks/useProfile", () => ({
    useProfile: (profileId: string | null) => ({
      profiles: [{ id: "default", label: "Default" }],
      currentProfile: profileId ? baseProfile : null,
      loading: false,
      isSwitching: false,
      error: options.profileError ?? null,
      saveProfile,
      copyProfile,
      updateDisabledProviders,
      refreshProfiles,
      reloadProfile,
      setError,
    }),
  }));

  vi.doMock("../../src/web/hooks/useGlobalConfig", () => ({
    useGlobalConfig: () => ({
      syncReplaceEnabled: false,
      defaultProfile: null,
      loading: false,
      initialized: true,
      error: options.globalConfigError ?? null,
      updateSyncReplaceEnabled,
      updateDefaultProfile,
      reloadGlobalConfig,
    }),
  }));

  vi.doMock("../../src/web/theme/ThemeContext", () => ({
    useThemePreference: () => ({ resolvedTheme: "light", setTheme: vi.fn() }),
  }));

  vi.doMock("../../src/web/hooks/useKeyboardShortcut", () => ({
    useKeyboardShortcut: vi.fn(),
  }));

  vi.doMock("../../src/web/error-log", () => ({
    addErrorLogEntry,
  }));

  vi.doMock("../../src/web/error-log/capture", () => ({
    setupWindowErrorListeners: setupWindowErrorListenersMock,
  }));

  vi.doMock("../../src/web/components/AppShell", () => ({
    AppShell: (props: any) => (
      <div data-testid="app-shell">
        <button type="button" data-testid="save-trigger" onClick={props.onSave}>
          Save
        </button>
        {props.profileSelector}
        {props.copyProfileButton}
        {props.conflictBanner}
        {props.agentsSection}
        {props.categoriesSection}
        {props.miscSection}
      </div>
    ),
  }));

  vi.doMock("../../src/web/components/ProfileSelector", () => ({
    ProfileSelector: () => <div data-testid="profile-selector" />,
  }));

  vi.doMock("../../src/web/components/sync-replace/SyncReplaceToggle", () => ({
    SyncReplaceToggle: () => <div data-testid="sync-replace-toggle" />,
  }));

  vi.doMock("../../src/web/components/ThemeToggle", () => ({
    ThemeToggle: () => <div data-testid="theme-toggle" />,
  }));

  vi.doMock("../../src/web/components/misc/MiscEditor", () => ({
    MiscEditor: () => <div data-testid="misc-editor" />,
  }));

  vi.doMock("../../src/web/components/agents/AgentEditor", () => ({
    AgentEditor: ({ onChange }: { onChange: (nextConfig: Record<string, { model: string }>) => void }) => (
      <button
        type="button"
        data-testid="dirty-trigger"
        onClick={() => onChange({ agentA: { model: "model-b" } })}
      >
        Dirty
      </button>
    ),
  }));

  vi.doMock("../../src/web/components/categories/CategoryEditor", () => ({
    CategoryEditor: () => <div data-testid="category-editor" />,
  }));

  vi.doMock("../../src/web/components/common", () => ({
    ConfirmDialog: () => null,
    LoadingPanel: () => <div data-testid="loading-panel" />,
    ToastViewport: ({ toasts }: { toasts: Array<{ id: number; message: string }> }) => (
      <div data-testid="toast-viewport">{toasts.map((toast) => <span key={toast.id}>{toast.message}</span>)}</div>
    ),
    DialogFrame: ({ open, headerExtra, children }: { open: boolean; headerExtra?: React.ReactNode; children?: React.ReactNode }) => (
      open ? <div data-testid="dialog-frame">{headerExtra}{children}</div> : null
    ),
    ErrorLogPanel: () => <div data-testid="error-log-panel" />,
  }));

  vi.doMock("../../src/web/components/sync-replace/SyncReplacePreviewDialog", () => ({
    SyncReplacePreviewDialog: () => null,
  }));

  vi.doMock("../../src/web/sync-replace/modelSync", () => ({
    collectSyncReplaceImpact: vi.fn(() => ({ totalAdditionalCount: 0 })),
    applySyncReplace: vi.fn((config) => config),
    applySyncReplaceOne: vi.fn((config) => config),
  }));

  vi.doMock("../../src/shared/model-catalog", () => ({
    getModelDisplayInfo: (model: string) => ({ fullId: model }),
  }));

  const { App } = await import("../../src/web/index");

  return {
    App,
    addErrorLogEntry,
    setupWindowCleanup,
    setupWindowErrorListenersMock,
    saveProfile,
    copyProfile,
  };
}

describe("setupWindowErrorListeners", () => {
  test("captures window error events", () => {
    const addErrorLogEntry = vi.fn();
    const cleanupListeners = setupWindowErrorListeners(addErrorLogEntry);

    window.dispatchEvent(new ErrorEvent("error", {
      message: "Window exploded",
      error: new Error("Window exploded"),
      filename: "src/web/index.tsx",
    }));

    expect(addErrorLogEntry).toHaveBeenCalledWith(
      "frontend-runtime",
      "Window exploded",
      expect.stringContaining("Window exploded"),
      "src/web/index.tsx",
    );

    cleanupListeners();
  });

  test("captures unhandled rejections and removes listeners on cleanup", () => {
    const addListenerSpy = vi.spyOn(window, "addEventListener");
    const removeListenerSpy = vi.spyOn(window, "removeEventListener");
    const addErrorLogEntry = vi.fn();
    const cleanupListeners = setupWindowErrorListeners(addErrorLogEntry);

    const rejectionEvent = new Event("unhandledrejection") as PromiseRejectionEvent;
    Object.defineProperty(rejectionEvent, "reason", {
      value: new Error("Promise exploded"),
      configurable: true,
    });

    window.dispatchEvent(rejectionEvent);

    expect(addErrorLogEntry).toHaveBeenCalledWith(
      "frontend-runtime",
      "Promise exploded",
      expect.stringContaining("Promise exploded"),
      null,
    );
    expect(addListenerSpy).toHaveBeenCalledWith("error", expect.any(Function));
    expect(addListenerSpy).toHaveBeenCalledWith("unhandledrejection", expect.any(Function));

    addErrorLogEntry.mockClear();
    cleanupListeners();

    expect(removeListenerSpy).toHaveBeenCalledWith("error", expect.any(Function));
    expect(removeListenerSpy).toHaveBeenCalledWith("unhandledrejection", expect.any(Function));

    window.dispatchEvent(new ErrorEvent("error", { message: "after cleanup" }));

    const secondRejectionEvent = new Event("unhandledrejection") as PromiseRejectionEvent;
    Object.defineProperty(secondRejectionEvent, "reason", {
      value: "after cleanup",
      configurable: true,
    });
    window.dispatchEvent(secondRejectionEvent);

    expect(addErrorLogEntry).not.toHaveBeenCalled();
  });
});

describe("App error log capture", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  test("captures profile request and global startup errors", async () => {
    const { App, addErrorLogEntry } = await loadMockedApp({
      profileError: "Failed to fetch profiles",
      globalConfigError: "Failed to fetch global config",
    });

    renderWithTheme(<App />);

    await waitFor(() => {
      expect(addErrorLogEntry).toHaveBeenCalledWith(
        "frontend-request",
        "Failed to fetch profiles",
        null,
        "useProfile",
      );
    });

    expect(addErrorLogEntry).toHaveBeenCalledWith(
      "frontend-startup",
      "Failed to fetch global config",
      null,
      "useGlobalConfig",
    );
  });

  test("captures conflict and copy dialog errors", async () => {
    const { App, addErrorLogEntry } = await loadMockedApp({
      saveProfileResult: { success: false, status: 409, error: "Conflict from save" },
      copyProfileResult: { success: false, error: "Copy failed" },
    });

    renderWithTheme(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("dirty-trigger")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("dirty-trigger"));
    fireEvent.click(screen.getByTestId("save-trigger"));

    await waitFor(() => {
      expect(addErrorLogEntry).toHaveBeenCalledWith(
        "frontend-request",
        "Conflict from save",
        null,
        "profile-save",
      );
    });

    expect(screen.getByTestId("conflict-banner")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("copy-profile-button"));
    fireEvent.change(screen.getByTestId("copy-profile-name-input"), {
      target: { value: "copy-target" },
    });
    fireEvent.click(screen.getByTestId("copy-profile-submit"));

    await waitFor(() => {
      expect(addErrorLogEntry).toHaveBeenCalledWith(
        "frontend-request",
        "Copy failed",
        null,
        "profile-copy",
      );
    });

    expect(screen.getByTestId("copy-profile-dialog")).toBeInTheDocument();
  });

  test("cleans up the App-level window listener effect on unmount", async () => {
    const { App, setupWindowCleanup, setupWindowErrorListenersMock } = await loadMockedApp();
    const view = renderWithTheme(<App />);

    await waitFor(() => {
      expect(setupWindowErrorListenersMock).toHaveBeenCalledTimes(1);
    });

    view.unmount();

    expect(setupWindowCleanup).toHaveBeenCalledTimes(1);
  });
});
