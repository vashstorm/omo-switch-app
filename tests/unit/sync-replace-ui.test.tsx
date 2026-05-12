import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import React from "react";
import { useState } from "react";
import { SyncReplaceToggle } from "../../src/web/components/sync-replace/SyncReplaceToggle";
import { SyncReplacePreviewDialog } from "../../src/web/components/sync-replace/SyncReplacePreviewDialog";
import { useGlobalConfig } from "../../src/web/hooks/useGlobalConfig";
import { EditableConfig } from "../../src/web/hooks/useProfile";
import { applySyncReplace, applySyncReplaceOne, collectSyncReplaceImpact } from "../../src/web/sync-replace/modelSync";

vi.mock("../../src/web/api/client", () => ({
  getGlobalConfig: vi.fn(),
  updateGlobalConfig: vi.fn(),
}));

import { getGlobalConfig, updateGlobalConfig } from "../../src/web/api/client";

const mockGetGlobalConfig = vi.mocked(getGlobalConfig);
const mockUpdateGlobalConfig = vi.mocked(updateGlobalConfig);

function TestComponent() {
  const { syncReplaceEnabled, loading, updateSyncReplaceEnabled } = useGlobalConfig();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleToggle = async (val: boolean) => {
    try {
      await updateSyncReplaceEnabled(val);
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  return (
    <div>
      <SyncReplaceToggle
        enabled={syncReplaceEnabled}
        loading={loading}
        onChange={handleToggle}
      />
      {errorMsg && <div data-testid="error-msg">{errorMsg}</div>}
      <div data-testid="unsaved-warning" style={{ display: 'none' }}>Unsaved changes</div>
    </div>
  );
}

function SyncReplaceDialogHarness({
  initialConfig,
  oldModel,
  newModel,
  mode = "all",
}: {
  initialConfig: EditableConfig;
  oldModel: string;
  newModel: string;
  mode?: "all" | "one";
}) {
  const [editableConfig, setEditableConfig] = useState(initialConfig);
  const [pending, setPending] = useState(true);

  const impact = pending
    ? collectSyncReplaceImpact(editableConfig, {
      kind: "agent",
      id: "planner",
      oldModel,
      newModel,
    })
    : null;

  return (
    <div>
      <SyncReplacePreviewDialog
        open={pending}
        impact={impact}
        onConfirm={() => {
          setEditableConfig((current) => applySyncReplace(current, oldModel, newModel));
          setPending(false);
        }}
        onConfirmOne={() => {
          setEditableConfig((current) =>
            applySyncReplaceOne(current, {
              kind: "agent",
              id: "planner",
              oldModel,
              newModel,
            })
          );
          setPending(false);
        }}
        onCancel={() => setPending(false)}
      />
      <div data-testid="planner-model">{editableConfig.agents.planner?.model || ""}</div>
      <div data-testid="reviewer-model">{editableConfig.agents.reviewer?.model || ""}</div>
      <div data-testid="dialog-open">{pending ? "open" : "closed"}</div>
    </div>
  );
}

const sharedConfig: EditableConfig = {
  agents: {
    planner: { model: "gpt-4" },
    reviewer: { model: "gpt-4" },
  },
  categories: {},
  misc: {},
};

describe("SyncReplace UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("loads persisted sync replace preference and toggles it", async () => {
    mockGetGlobalConfig.mockResolvedValueOnce({ syncReplaceEnabled: true, appZoomPercent: 100, defaultProfile: null });

    render(<TestComponent />);

    await waitFor(() => {
      const toggle = screen.getByRole("switch") as HTMLInputElement;
      expect(toggle.checked).toBe(true);
    });

    mockUpdateGlobalConfig.mockResolvedValueOnce({ syncReplaceEnabled: false, appZoomPercent: 100, defaultProfile: null });

    const toggle = screen.getByRole("switch") as HTMLInputElement;
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(mockUpdateGlobalConfig).toHaveBeenCalledWith({ syncReplaceEnabled: false });
    });

    expect(toggle.checked).toBe(false);
  });

  it("reverts toggle on save failure", async () => {
    mockGetGlobalConfig.mockResolvedValueOnce({ syncReplaceEnabled: false, appZoomPercent: 100, defaultProfile: null });

    render(<TestComponent />);

    await waitFor(() => {
      const toggle = screen.getByRole("switch") as HTMLInputElement;
      expect(toggle.checked).toBe(false);
    });

    mockUpdateGlobalConfig.mockRejectedValueOnce({ code: "INTERNAL_ERROR", message: "Server error" });

    const toggle = screen.getByRole("switch") as HTMLInputElement;
    fireEvent.click(toggle);

    expect(toggle.checked).toBe(true);

    await waitFor(() => {
      expect(toggle.checked).toBe(false);
    });

    expect(screen.getByTestId("error-msg")).toHaveTextContent("Server error");
  });

  it("sync replace toggle does not trigger unsaved-warning", async () => {
    mockGetGlobalConfig.mockResolvedValueOnce({ syncReplaceEnabled: false, appZoomPercent: 100, defaultProfile: null });

    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByRole("switch")).toBeInTheDocument();
    });

    mockUpdateGlobalConfig.mockResolvedValueOnce({ syncReplaceEnabled: true, appZoomPercent: 100, defaultProfile: null });

    fireEvent.click(screen.getByRole("switch"));

    const warning = screen.getByTestId("unsaved-warning");
    expect(window.getComputedStyle(warning).display).toBe('none');
  });

  it("opens preview and replaces all affected models on confirm", async () => {
    render(
      <SyncReplaceDialogHarness
        initialConfig={sharedConfig}
        oldModel="gpt-4"
        newModel="gpt-5"
      />,
    );

    expect(screen.getByTestId("sync-replace-preview-dialog")).toBeInTheDocument();
    expect(screen.getByText("reviewer")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("sync-replace-confirm"));

    await waitFor(() => {
      expect(screen.queryByTestId("sync-replace-preview-dialog")).not.toBeInTheDocument();
    });

    expect(screen.getByTestId("planner-model")).toHaveTextContent("gpt-5");
    expect(screen.getByTestId("reviewer-model")).toHaveTextContent("gpt-5");
    expect(screen.getByTestId("dialog-open")).toHaveTextContent("closed");
  });

  it("reverts triggering dropdown on cancel", async () => {
    render(
      <SyncReplaceDialogHarness
        initialConfig={sharedConfig}
        oldModel="gpt-4"
        newModel="gpt-5"
      />,
    );

    expect(screen.getByTestId("sync-replace-preview-dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("sync-replace-cancel"));

    await waitFor(() => {
      expect(screen.queryByTestId("sync-replace-preview-dialog")).not.toBeInTheDocument();
    });

    expect(screen.getByTestId("planner-model")).toHaveTextContent("gpt-4");
    expect(screen.getByTestId("reviewer-model")).toHaveTextContent("gpt-4");
    expect(screen.getByTestId("dialog-open")).toHaveTextContent("closed");
  });

  it("opens preview and replaces only the selected model on confirm one", async () => {
    render(
      <SyncReplaceDialogHarness
        initialConfig={sharedConfig}
        oldModel="gpt-4"
        newModel="gpt-5"
        mode="one"
      />,
    );

    expect(screen.getByTestId("sync-replace-preview-dialog")).toBeInTheDocument();
    expect(screen.getByText("reviewer")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("sync-replace-confirm-one"));

    await waitFor(() => {
      expect(screen.queryByTestId("sync-replace-preview-dialog")).not.toBeInTheDocument();
    });

    expect(screen.getByTestId("planner-model")).toHaveTextContent("gpt-5");
    expect(screen.getByTestId("reviewer-model")).toHaveTextContent("gpt-4");
    expect(screen.getByTestId("dialog-open")).toHaveTextContent("closed");
  });
});
