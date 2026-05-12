import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, test, vi, afterEach } from "vitest";
import { AppShell } from "../../src/web/components/AppShell";

const baseProps = {
  profileSelector: <div>selector</div>,
  loading: false,
  error: null,
  isDirty: false,
  onSave: vi.fn(),
  onReset: vi.fn(),
};

describe("AppShell collapse controls", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("renders toggle-all-button", () => {
    render(<AppShell {...baseProps} />);
    expect(screen.getByTestId("toggle-all-button")).toBeInTheDocument();
  });

  test("toggle-all-button calls onCollapseAll when sections are expanded", () => {
    const onCollapseAll = vi.fn();
    render(
      <AppShell
        {...baseProps}
        onCollapseAll={onCollapseAll}
        agentsCollapsed={false}
        categoriesCollapsed={false}
        miscCollapsed={false}
      />
    );
    fireEvent.click(screen.getByTestId("toggle-all-button"));
    expect(onCollapseAll).toHaveBeenCalledTimes(1);
  });

  test("toggle-all-button calls onExpandAll when all sections are collapsed", () => {
    const onExpandAll = vi.fn();
    render(
      <AppShell
        {...baseProps}
        onExpandAll={onExpandAll}
        agentsCollapsed={true}
        categoriesCollapsed={true}
        miscCollapsed={true}
      />
    );
    fireEvent.click(screen.getByTestId("toggle-all-button"));
    expect(onExpandAll).toHaveBeenCalledTimes(1);
  });

  test("nav agent sub-item calls onNavToAgent with id", () => {
    const onNavToAgent = vi.fn();
    render(<AppShell {...baseProps} agentIds={["prometheus"]} onNavToAgent={onNavToAgent} />);
    fireEvent.click(screen.getByTestId("nav-link-agent-prometheus"));
    expect(onNavToAgent).toHaveBeenCalledWith("prometheus");
  });

  test("nav category sub-item calls onNavToCategory with id", () => {
    const onNavToCategory = vi.fn();
    render(<AppShell {...baseProps} categoryIds={["quick"]} onNavToCategory={onNavToCategory} />);
    fireEvent.click(screen.getByTestId("nav-link-category-quick"));
    expect(onNavToCategory).toHaveBeenCalledWith("quick");
  });

  test("nav misc sub-item calls onNavToMisc with name", () => {
    const onNavToMisc = vi.fn();
    render(<AppShell {...baseProps} miscSectionNames={["tmux"]} onNavToMisc={onNavToMisc} />);
    fireEvent.click(screen.getByTestId("nav-link-misc-tmux"));
    expect(onNavToMisc).toHaveBeenCalledWith("tmux");
  });
});
