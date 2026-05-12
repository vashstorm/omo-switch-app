import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, test, vi, afterEach } from "vitest";
import { AgentEditor } from "../../src/web/components/agents/AgentEditor";

const agents = {
  prometheus: { model: "openai/gpt-4" },
  atlas: { model: "anthropic/claude-3" },
};
const mockModels = ["openai/gpt-4", "anthropic/claude-3"];
const onChange = vi.fn();

describe("AgentEditor collapse", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("agents are expanded by default", () => {
    render(<AgentEditor agents={agents} availableModels={mockModels} onChange={onChange} />);
    expect(screen.getByTestId("toggle-agent-prometheus")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("toggle-agent-atlas")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText("Collapse agent prometheus")).toBeInTheDocument();
    expect(screen.getByLabelText("Collapse agent atlas")).toBeInTheDocument();
  });

  test("clicking toggle collapses an agent card", () => {
    render(<AgentEditor agents={agents} availableModels={mockModels} onChange={onChange} />);
    fireEvent.click(screen.getByTestId("toggle-agent-prometheus"));
    expect(screen.getByTestId("toggle-agent-prometheus")).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByTestId("toggle-agent-atlas")).toHaveAttribute("aria-expanded", "true");
  });

  test("globalCollapseKey collapses all agents", () => {
    const { rerender } = render(
      <AgentEditor agents={agents} availableModels={mockModels} onChange={onChange} globalCollapseKey={0} />
    );
    rerender(
      <AgentEditor agents={agents} availableModels={mockModels} onChange={onChange} globalCollapseKey={1} />
    );
    expect(screen.getByTestId("toggle-agent-prometheus")).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByTestId("toggle-agent-atlas")).toHaveAttribute("aria-expanded", "false");
  });

  test("initial mount with non-zero globalCollapseKey starts collapsed", () => {
    render(<AgentEditor agents={agents} availableModels={mockModels} onChange={onChange} globalCollapseKey={1} />);
    expect(screen.getByTestId("toggle-agent-prometheus")).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByTestId("toggle-agent-atlas")).toHaveAttribute("aria-expanded", "false");
  });

  test("remount with non-zero globalCollapseKey remains collapsed", () => {
    const first = render(
      <AgentEditor agents={agents} availableModels={mockModels} onChange={onChange} globalCollapseKey={1} />
    );
    expect(screen.getByTestId("toggle-agent-prometheus")).toHaveAttribute("aria-expanded", "false");
    first.unmount();

    render(<AgentEditor agents={agents} availableModels={mockModels} onChange={onChange} globalCollapseKey={1} />);
    expect(screen.getByTestId("toggle-agent-prometheus")).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByTestId("toggle-agent-atlas")).toHaveAttribute("aria-expanded", "false");
  });

  test("globalExpandKey expands all agents", () => {
    const { rerender } = render(
      <AgentEditor agents={agents} availableModels={mockModels} onChange={onChange} globalCollapseKey={1} />
    );
    rerender(
      <AgentEditor agents={agents} availableModels={mockModels} onChange={onChange} globalCollapseKey={1} globalExpandKey={1} />
    );
    expect(screen.getByTestId("toggle-agent-prometheus")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("toggle-agent-atlas")).toHaveAttribute("aria-expanded", "true");
  });

  test("expandTargetId expands a specific collapsed agent", () => {
    const { rerender } = render(
      <AgentEditor agents={agents} availableModels={mockModels} onChange={onChange} globalCollapseKey={1} />
    );
    rerender(
      <AgentEditor agents={agents} availableModels={mockModels} onChange={onChange} globalCollapseKey={1} expandTargetId="prometheus" />
    );
    expect(screen.getByTestId("toggle-agent-prometheus")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("toggle-agent-atlas")).toHaveAttribute("aria-expanded", "false");
  });
});
