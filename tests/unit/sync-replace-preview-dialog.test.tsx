import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { SyncReplacePreviewDialog } from "../../src/web/components/sync-replace/SyncReplacePreviewDialog";
import type { SyncReplaceImpact } from "../../src/web/sync-replace/modelSync";

describe("SyncReplacePreviewDialog", () => {
  const mockImpact: SyncReplaceImpact = {
    trigger: {
      kind: "agent",
      id: "agent1",
      oldModel: "model-a",
      newModel: "model-b",
    },
    additionalAgents: ["agent2", "agent3"],
    additionalCategories: ["cat1"],
    totalAdditionalCount: 3,
  };

  const defaultProps = {
    open: true,
    impact: mockImpact,
    onConfirm: vi.fn(),
    onConfirmOne: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  test("renders dialog with correct title", () => {
    render(<SyncReplacePreviewDialog {...defaultProps} />);

    expect(screen.getByText("Sync Replace Models")).toBeInTheDocument();
    expect(screen.getByText("Review the changes before applying")).toBeInTheDocument();
  });

  test("renders trigger source and model transition", () => {
    render(<SyncReplacePreviewDialog {...defaultProps} />);

    expect(screen.getByText(/Trigger Source: agent1/)).toBeInTheDocument();
    expect(screen.getByText("model-a")).toBeInTheDocument();
    expect(screen.getByText("model-b")).toBeInTheDocument();
  });

  test("shows total affected count in header", () => {
    render(<SyncReplacePreviewDialog {...defaultProps} />);

    expect(screen.getByText("4 Affected")).toBeInTheDocument();
  });

  test("shows agents section with chips when additionalAgents present", () => {
    render(<SyncReplacePreviewDialog {...defaultProps} />);

    const agentHeaders = screen.getAllByText("Agents");
    expect(agentHeaders.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("agent2")).toBeInTheDocument();
    expect(screen.getByText("agent3")).toBeInTheDocument();
  });

  test("shows categories section with chips when additionalCategories present", () => {
    render(<SyncReplacePreviewDialog {...defaultProps} />);

    const categoryHeaders = screen.getAllByText("Categories");
    expect(categoryHeaders.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("cat1")).toBeInTheDocument();
  });

  test("calls onConfirm when 'Replace All' clicked", () => {
    render(<SyncReplacePreviewDialog {...defaultProps} />);

    fireEvent.click(screen.getByTestId("sync-replace-confirm"));

    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  test("calls onConfirmOne when 'Replace One' clicked", () => {
    render(<SyncReplacePreviewDialog {...defaultProps} />);

    fireEvent.click(screen.getByTestId("sync-replace-confirm-one"));

    expect(defaultProps.onConfirmOne).toHaveBeenCalledTimes(1);
  });

  test("calls onCancel when 'Cancel' clicked", () => {
    const onCancel = vi.fn();
    render(<SyncReplacePreviewDialog {...defaultProps} onCancel={onCancel} />);

    const cancelButton = screen.getByTestId("sync-replace-cancel");
    fireEvent.click(cancelButton);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test("does NOT render when impact is null", () => {
    const { container } = render(
      <SyncReplacePreviewDialog
        open={true}
        impact={null}
        onConfirm={vi.fn()}
        onConfirmOne={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  test("does not show agent chips when additionalAgents is empty", () => {
    const impactWithoutAgents: SyncReplaceImpact = {
      trigger: {
        kind: "category",
        id: "cat1",
        oldModel: "model-a",
        newModel: "model-b",
      },
      additionalAgents: [],
      additionalCategories: ["cat2"],
      totalAdditionalCount: 1,
    };

    render(<SyncReplacePreviewDialog {...defaultProps} impact={impactWithoutAgents} />);

    // Agent section header should not be shown when there are no agents
    expect(screen.queryByText("agent2")).not.toBeInTheDocument();
  });

  test("does not show category chips when additionalCategories is empty", () => {
    const impactWithoutCategories: SyncReplaceImpact = {
      trigger: {
        kind: "agent",
        id: "agent1",
        oldModel: "model-a",
        newModel: "model-b",
      },
      additionalAgents: ["agent2"],
      additionalCategories: [],
      totalAdditionalCount: 1,
    };

    render(<SyncReplacePreviewDialog {...defaultProps} impact={impactWithoutCategories} />);

    // Category section header should not be shown when there are no categories
    expect(screen.queryByText("cat2")).not.toBeInTheDocument();
  });

  test("does not show divider when only agents present", () => {
    const impactWithoutCategories: SyncReplaceImpact = {
      trigger: {
        kind: "agent",
        id: "agent1",
        oldModel: "model-a",
        newModel: "model-b",
      },
      additionalAgents: ["agent2"],
      additionalCategories: [],
      totalAdditionalCount: 1,
    };

    const { container } = render(<SyncReplacePreviewDialog {...defaultProps} impact={impactWithoutCategories} />);

    const dividers = container.querySelectorAll(".MuiDivider-root");
    expect(dividers.length).toBe(0);
  });

  test("does not show divider when only categories present", () => {
    const impactWithoutAgents: SyncReplaceImpact = {
      trigger: {
        kind: "category",
        id: "cat1",
        oldModel: "model-a",
        newModel: "model-b",
      },
      additionalAgents: [],
      additionalCategories: ["cat2"],
      totalAdditionalCount: 1,
    };

    const { container } = render(<SyncReplacePreviewDialog {...defaultProps} impact={impactWithoutAgents} />);

    const dividers = container.querySelectorAll(".MuiDivider-root");
    expect(dividers.length).toBe(0);
  });

  test("shows divider when both agents and categories present", () => {
    const { baseElement } = render(<SyncReplacePreviewDialog {...defaultProps} />);

    const dividers = baseElement.querySelectorAll("hr");
    expect(dividers.length).toBeGreaterThan(0);
  });
});
