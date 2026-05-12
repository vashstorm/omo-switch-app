import { render, screen, fireEvent, cleanup, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { describe, expect, test, vi, afterEach, beforeEach } from "vitest";
import type { ModelGroup } from "../../src/shared/config/types";

import { GroupedModelPicker } from "../../src/web/components/models/GroupedModelPicker";

const mockGroups: ModelGroup[] = [
  {
    provider: "anthropic",
    label: "anthropic",
    models: [
      { id: "anthropic/claude-opus-4-5", label: "claude-opus-4-5", provider: "anthropic" },
      { id: "anthropic/claude-sonnet-4-5", label: "claude-sonnet-4-5", provider: "anthropic" },
    ],
  },
  {
    provider: "openai",
    label: "openai",
    models: [
      { id: "openai/gpt-4o", label: "gpt-4o", provider: "openai" },
      { id: "openai/gpt-5", label: "gpt-5", provider: "openai" },
    ],
  },
];

describe("GroupedModelPicker — single-select", () => {
  afterEach(() => {
    cleanup();
  });

  test("renders trigger button with placeholder text", () => {
    const onChange = vi.fn();
    render(
      <GroupedModelPicker
        groups={mockGroups}
        value={null}
        multiple={false}
        onChange={onChange}
        label="Model"
        placeholder="Select a model"
        testId="picker-test"
      />,
    );

    const trigger = screen.getByTestId("picker-test-trigger");
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent("Select a model");
  });

  test("trigger shows selected model label (single-select)", () => {
    const onChange = vi.fn();
    render(
      <GroupedModelPicker
        groups={mockGroups}
        value="anthropic/claude-opus-4-5"
        multiple={false}
        onChange={onChange}
        label="Model"
        placeholder="Select a model"
        testId="picker-test"
      />,
    );

    const trigger = screen.getByTestId("picker-test-trigger");
    expect(trigger).toHaveTextContent("claude-opus-4-5");
  });

  test("trigger has aria-expanded=false when closed", () => {
    const onChange = vi.fn();
    render(
      <GroupedModelPicker
        groups={mockGroups}
        value={null}
        multiple={false}
        onChange={onChange}
        label="Model"
        placeholder="Select a model"
        testId="picker-test"
      />,
    );

    const trigger = screen.getByTestId("picker-test-trigger");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  test("opens popover when trigger is clicked", async () => {
    const onChange = vi.fn();
    render(
      <GroupedModelPicker
        groups={mockGroups}
        value={null}
        multiple={false}
        onChange={onChange}
        label="Model"
        placeholder="Select a model"
        testId="picker-test"
      />,
    );

    const trigger = screen.getByTestId("picker-test-trigger");
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByTestId("picker-test-popover")).toBeInTheDocument();
    });

    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  test("shows provider list in first pane after opening", async () => {
    const onChange = vi.fn();
    render(
      <GroupedModelPicker
        groups={mockGroups}
        value={null}
        multiple={false}
        onChange={onChange}
        label="Model"
        placeholder="Select a model"
        testId="picker-test"
      />,
    );

    fireEvent.click(screen.getByTestId("picker-test-trigger"));

    await waitFor(() => {
      expect(screen.getByTestId("picker-test-provider-anthropic")).toBeInTheDocument();
      expect(screen.getByTestId("picker-test-provider-openai")).toBeInTheDocument();
    });
  });

  test("hovering over a provider item activates the model pane", async () => {
    const onChange = vi.fn();
    render(
      <GroupedModelPicker
        groups={mockGroups}
        value={null}
        multiple={false}
        onChange={onChange}
        label="Model"
        placeholder="Select a model"
        testId="picker-test"
      />,
    );

    fireEvent.click(screen.getByTestId("picker-test-trigger"));

    await waitFor(() => {
      expect(screen.getByTestId("picker-test-provider-anthropic")).toBeInTheDocument();
    });

    fireEvent.mouseEnter(screen.getByTestId("picker-test-provider-anthropic"));

    await waitFor(() => {
      expect(screen.getByTestId("picker-test-model-anthropic/claude-opus-4-5")).toBeInTheDocument();
      expect(screen.getByTestId("picker-test-model-anthropic/claude-sonnet-4-5")).toBeInTheDocument();
    });
  });

  test("Enter on a model item calls onChange and closes the popover (single-select)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <GroupedModelPicker
        groups={mockGroups}
        value={null}
        multiple={false}
        onChange={onChange}
        label="Model"
        placeholder="Select a model"
        testId="picker-test"
      />,
    );

    fireEvent.click(screen.getByTestId("picker-test-trigger"));

    await waitFor(() => {
      expect(screen.getByTestId("picker-test-provider-anthropic")).toBeInTheDocument();
    });

    fireEvent.mouseEnter(screen.getByTestId("picker-test-provider-anthropic"));

    await waitFor(() => {
      expect(screen.getByTestId("picker-test-model-anthropic/claude-opus-4-5")).toBeInTheDocument();
    });

    const modelItem = screen.getByTestId("picker-test-model-anthropic/claude-opus-4-5");
    fireEvent.click(modelItem);

    expect(onChange).toHaveBeenCalledWith("anthropic/claude-opus-4-5");

    await waitFor(() => {
      expect(screen.queryByTestId("picker-test-popover")).not.toBeInTheDocument();
    });
  });

  test("shows a None option that clears the current selection", async () => {
    const onChange = vi.fn();
    render(
      <GroupedModelPicker
        groups={mockGroups}
        value="anthropic/claude-opus-4-5"
        multiple={false}
        onChange={onChange}
        label="Model"
        placeholder="None"
        testId="picker-test"
      />,
    );

    fireEvent.click(screen.getByTestId("picker-test-trigger"));

    await waitFor(() => {
      expect(screen.getByTestId("picker-test-none-option")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("picker-test-none-option"));

    expect(onChange).toHaveBeenCalledWith("");

    await waitFor(() => {
      expect(screen.queryByTestId("picker-test-popover")).not.toBeInTheDocument();
    });
  });

  test("Escape closes the popover without calling onChange", async () => {
    const onChange = vi.fn();
    render(
      <GroupedModelPicker
        groups={mockGroups}
        value={null}
        multiple={false}
        onChange={onChange}
        label="Model"
        placeholder="Select a model"
        testId="picker-test"
      />,
    );

    fireEvent.click(screen.getByTestId("picker-test-trigger"));

    await waitFor(() => {
      expect(screen.getByTestId("picker-test-popover")).toBeInTheDocument();
    });

    fireEvent.keyDown(screen.getByTestId("picker-test-popover"), { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByTestId("picker-test-popover")).not.toBeInTheDocument();
    });

    expect(onChange).not.toHaveBeenCalled();
  });

  test("ArrowDown/ArrowUp navigate within provider pane", async () => {
    const onChange = vi.fn();
    render(
      <GroupedModelPicker
        groups={mockGroups}
        value={null}
        multiple={false}
        onChange={onChange}
        label="Model"
        placeholder="Select a model"
        testId="picker-test"
      />,
    );

    fireEvent.click(screen.getByTestId("picker-test-trigger"));

    await waitFor(() => {
      expect(screen.getByTestId("picker-test-provider-anthropic")).toBeInTheDocument();
    });

    const providerPane = screen.getByTestId("picker-test-provider-pane");

    fireEvent.keyDown(providerPane, { key: "ArrowDown" });
    await waitFor(() => {
      expect(screen.getByTestId("picker-test-provider-anthropic")).toHaveAttribute("aria-selected", "true");
    });

    fireEvent.keyDown(providerPane, { key: "ArrowDown" });
    await waitFor(() => {
      expect(screen.getByTestId("picker-test-provider-openai")).toHaveAttribute("aria-selected", "true");
    });

    fireEvent.keyDown(providerPane, { key: "ArrowUp" });
    await waitFor(() => {
      expect(screen.getByTestId("picker-test-provider-anthropic")).toHaveAttribute("aria-selected", "true");
    });
  });

  test("ArrowRight key from provider pane moves focus to model pane", async () => {
    const onChange = vi.fn();
    render(
      <GroupedModelPicker
        groups={mockGroups}
        value={null}
        multiple={false}
        onChange={onChange}
        label="Model"
        placeholder="Select a model"
        testId="picker-test"
      />,
    );

    fireEvent.click(screen.getByTestId("picker-test-trigger"));

    await waitFor(() => {
      expect(screen.getByTestId("picker-test-provider-anthropic")).toBeInTheDocument();
    });

    fireEvent.mouseEnter(screen.getByTestId("picker-test-provider-anthropic"));

    await waitFor(() => {
      expect(screen.getByTestId("picker-test-model-pane")).toBeInTheDocument();
    });

    const providerPane = screen.getByTestId("picker-test-provider-pane");
    fireEvent.keyDown(providerPane, { key: "ArrowRight" });

    await waitFor(() => {
      const modelPane = screen.getByTestId("picker-test-model-pane");
      expect(modelPane).toHaveFocus();
    });
  });

  test("ArrowLeft key from model pane returns focus to provider pane", async () => {
    const onChange = vi.fn();
    render(
      <GroupedModelPicker
        groups={mockGroups}
        value={null}
        multiple={false}
        onChange={onChange}
        label="Model"
        placeholder="Select a model"
        testId="picker-test"
      />,
    );

    fireEvent.click(screen.getByTestId("picker-test-trigger"));

    await waitFor(() => {
      expect(screen.getByTestId("picker-test-provider-anthropic")).toBeInTheDocument();
    });

    fireEvent.mouseEnter(screen.getByTestId("picker-test-provider-anthropic"));

    await waitFor(() => {
      expect(screen.getByTestId("picker-test-model-pane")).toBeInTheDocument();
    });

    // Navigate into model pane
    const providerPane2 = screen.getByTestId("picker-test-provider-pane");
    fireEvent.keyDown(providerPane2, { key: "ArrowRight" });

    const modelPane = screen.getByTestId("picker-test-model-pane");
    fireEvent.keyDown(modelPane, { key: "ArrowLeft" });

    await waitFor(() => {
      expect(screen.getByTestId("picker-test-provider-pane")).toHaveFocus();
    });
  });

  test("ArrowDown/ArrowUp navigate within model pane", async () => {
    const onChange = vi.fn();
    render(
      <GroupedModelPicker
        groups={mockGroups}
        value={null}
        multiple={false}
        onChange={onChange}
        label="Model"
        placeholder="Select a model"
        testId="picker-test"
      />,
    );

    fireEvent.click(screen.getByTestId("picker-test-trigger"));

    await waitFor(() => {
      expect(screen.getByTestId("picker-test-provider-anthropic")).toBeInTheDocument();
    });

    fireEvent.mouseEnter(screen.getByTestId("picker-test-provider-anthropic"));

    await waitFor(() => {
      expect(screen.getByTestId("picker-test-model-pane")).toBeInTheDocument();
    });

    const modelPane = screen.getByTestId("picker-test-model-pane");

    fireEvent.keyDown(modelPane, { key: "ArrowDown" });
    await waitFor(() => {
      expect(
        screen.getByTestId("picker-test-model-anthropic/claude-opus-4-5"),
      ).toHaveAttribute("aria-selected", "true");
    });

    fireEvent.keyDown(modelPane, { key: "ArrowDown" });
    await waitFor(() => {
      expect(
        screen.getByTestId("picker-test-model-anthropic/claude-sonnet-4-5"),
      ).toHaveAttribute("aria-selected", "true");
    });
  });

  test("trigger has aria-controls pointing to popover id", async () => {
    const onChange = vi.fn();
    render(
      <GroupedModelPicker
        groups={mockGroups}
        value={null}
        multiple={false}
        onChange={onChange}
        label="Model"
        placeholder="Select a model"
        testId="picker-test"
      />,
    );

    const trigger = screen.getByTestId("picker-test-trigger");
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByTestId("picker-test-popover")).toBeInTheDocument();
    });

    const popoverId = screen.getByTestId("picker-test-popover").id;
    expect(trigger).toHaveAttribute("aria-controls", popoverId);
  });

  test("provider items have role=option", async () => {
    const onChange = vi.fn();
    render(
      <GroupedModelPicker
        groups={mockGroups}
        value={null}
        multiple={false}
        onChange={onChange}
        label="Model"
        placeholder="Select a model"
        testId="picker-test"
      />,
    );

    fireEvent.click(screen.getByTestId("picker-test-trigger"));

    await waitFor(() => {
      const providerItem = screen.getByTestId("picker-test-provider-anthropic");
      expect(providerItem).toHaveAttribute("role", "option");
    });
  });
});

describe("GroupedModelPicker — multi-select", () => {
  afterEach(() => {
    cleanup();
  });

  test("multi-select: selecting a model does NOT close the popover", async () => {
    const onChange = vi.fn();
    render(
      <GroupedModelPicker
        groups={mockGroups}
        value={[]}
        multiple={true}
        onChange={onChange}
        label="Fallback Models"
        placeholder="Select fallback models"
        testId="picker-multi"
      />,
    );

    fireEvent.click(screen.getByTestId("picker-multi-trigger"));

    await waitFor(() => {
      expect(screen.getByTestId("picker-multi-popover")).toBeInTheDocument();
    });

    fireEvent.mouseEnter(screen.getByTestId("picker-multi-provider-anthropic"));

    await waitFor(() => {
      expect(screen.getByTestId("picker-multi-model-anthropic/claude-opus-4-5")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("picker-multi-model-anthropic/claude-opus-4-5"));

    expect(onChange).toHaveBeenCalledWith(["anthropic/claude-opus-4-5"]);

    expect(screen.getByTestId("picker-multi-popover")).toBeInTheDocument();
  });

  test("multi-select: selecting multiple models accumulates values", async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <GroupedModelPicker
        groups={mockGroups}
        value={[]}
        multiple={true}
        onChange={onChange}
        label="Fallback Models"
        placeholder="Select fallback models"
        testId="picker-multi"
      />,
    );

    fireEvent.click(screen.getByTestId("picker-multi-trigger"));

    await waitFor(() => {
      expect(screen.getByTestId("picker-multi-provider-anthropic")).toBeInTheDocument();
    });

    fireEvent.mouseEnter(screen.getByTestId("picker-multi-provider-anthropic"));

    await waitFor(() => {
      expect(screen.getByTestId("picker-multi-model-anthropic/claude-opus-4-5")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("picker-multi-model-anthropic/claude-opus-4-5"));

    expect(onChange).toHaveBeenCalledWith(["anthropic/claude-opus-4-5"]);

    rerender(
      <GroupedModelPicker
        groups={mockGroups}
        value={["anthropic/claude-opus-4-5"]}
        multiple={true}
        onChange={onChange}
        label="Fallback Models"
        placeholder="Select fallback models"
        testId="picker-multi"
      />,
    );

    fireEvent.mouseEnter(screen.getByTestId("picker-multi-provider-openai"));

    await waitFor(() => {
      expect(screen.getByTestId("picker-multi-model-openai/gpt-4o")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("picker-multi-model-openai/gpt-4o"));

    expect(onChange).toHaveBeenCalledWith(["anthropic/claude-opus-4-5", "openai/gpt-4o"]);
  });

  test("multi-select: trigger shows chip list for selected models", () => {
    const onChange = vi.fn();
    render(
      <GroupedModelPicker
        groups={mockGroups}
        value={["anthropic/claude-opus-4-5", "openai/gpt-5"]}
        multiple={true}
        onChange={onChange}
        label="Fallback Models"
        placeholder="Select fallback models"
        testId="picker-multi"
      />,
    );

    const trigger = screen.getByTestId("picker-multi-trigger");
    expect(trigger).toHaveTextContent("claude-opus-4-5");
    expect(trigger).toHaveTextContent("gpt-5");

    const selectedChip = within(trigger).getByText("anthropic/claude-opus-4-5").closest(".MuiChip-root");
    expect(selectedChip).toHaveStyle({ fontWeight: "400" });
  });

  test("multi-select: Escape closes popover without clearing selection", async () => {
    const onChange = vi.fn();
    render(
      <GroupedModelPicker
        groups={mockGroups}
        value={["anthropic/claude-opus-4-5"]}
        multiple={true}
        onChange={onChange}
        label="Fallback Models"
        placeholder="Select fallback models"
        testId="picker-multi"
      />,
    );

    fireEvent.click(screen.getByTestId("picker-multi-trigger"));

    await waitFor(() => {
      expect(screen.getByTestId("picker-multi-popover")).toBeInTheDocument();
    });

    fireEvent.keyDown(screen.getByTestId("picker-multi-popover"), { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByTestId("picker-multi-popover")).not.toBeInTheDocument();
    });

    expect(onChange).not.toHaveBeenCalled();

    expect(screen.getByTestId("picker-multi-trigger")).toHaveTextContent("claude-opus-4-5");
  });

  test("multi-select: selected model items are aria-selected=true", async () => {
    const onChange = vi.fn();
    render(
      <GroupedModelPicker
        groups={mockGroups}
        value={["anthropic/claude-opus-4-5"]}
        multiple={true}
        onChange={onChange}
        label="Fallback Models"
        placeholder="Select fallback models"
        testId="picker-multi"
      />,
    );

    fireEvent.click(screen.getByTestId("picker-multi-trigger"));

    await waitFor(() => {
      expect(screen.getByTestId("picker-multi-provider-anthropic")).toBeInTheDocument();
    });

    fireEvent.mouseEnter(screen.getByTestId("picker-multi-provider-anthropic"));

    await waitFor(() => {
      const item = screen.getByTestId("picker-multi-model-anthropic/claude-opus-4-5");
      expect(item).toHaveAttribute("aria-selected", "true");
      expect(within(item).getByText("claude-opus-4-5")).toHaveStyle({ fontWeight: "400" });
    });
  });

  test("multi-select: model items have role=option", async () => {
    const onChange = vi.fn();
    render(
      <GroupedModelPicker
        groups={mockGroups}
        value={[]}
        multiple={true}
        onChange={onChange}
        label="Fallback Models"
        placeholder="Select fallback models"
        testId="picker-multi"
      />,
    );

    fireEvent.click(screen.getByTestId("picker-multi-trigger"));

    await waitFor(() => {
      expect(screen.getByTestId("picker-multi-provider-anthropic")).toBeInTheDocument();
    });

    fireEvent.mouseEnter(screen.getByTestId("picker-multi-provider-anthropic"));

    await waitFor(() => {
      const item = screen.getByTestId("picker-multi-model-anthropic/claude-opus-4-5");
      expect(item).toHaveAttribute("role", "option");
    });
  });

  test("multi-select: clicking chip delete button removes the model", async () => {
    const onChange = vi.fn();
    render(
      <GroupedModelPicker
        groups={mockGroups}
        value={["anthropic/claude-opus-4-5", "openai/gpt-4o"]}
        multiple={true}
        onChange={onChange}
        label="Fallback Models"
        placeholder="Select fallback models"
        testId="picker-multi"
      />,
    );

    const trigger = screen.getByTestId("picker-multi-trigger");
    expect(trigger).toHaveTextContent("claude-opus-4-5");
    expect(trigger).toHaveTextContent("gpt-4o");

    const deleteButtons = trigger.querySelectorAll('[class*="MuiChip-deleteIcon"]');
    expect(deleteButtons.length).toBe(2);

    fireEvent.click(deleteButtons[0]);

    expect(onChange).toHaveBeenCalledWith(["openai/gpt-4o"]);
  });

  test("multi-select: deleting last model leaves empty array", async () => {
    const onChange = vi.fn();
    render(
      <GroupedModelPicker
        groups={mockGroups}
        value={["anthropic/claude-opus-4-5"]}
        multiple={true}
        onChange={onChange}
        label="Fallback Models"
        placeholder="Select fallback models"
        testId="picker-multi"
      />,
    );

    const trigger = screen.getByTestId("picker-multi-trigger");
    expect(trigger).toHaveTextContent("claude-opus-4-5");

    const deleteButton = trigger.querySelector('[class*="MuiChip-deleteIcon"]');
    expect(deleteButton).toBeTruthy();

    fireEvent.click(deleteButton!);

    expect(onChange).toHaveBeenCalledWith([]);
  });
});

describe("GroupedModelPicker — disabled state", () => {
  afterEach(() => {
    cleanup();
  });

  test("disabled trigger is not clickable", async () => {
    const onChange = vi.fn();
    render(
      <GroupedModelPicker
        groups={mockGroups}
        value={null}
        multiple={false}
        onChange={onChange}
        label="Model"
        placeholder="Select a model"
        testId="picker-disabled"
        disabled={true}
      />,
    );

    const trigger = screen.getByTestId("picker-disabled-trigger");
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.queryByTestId("picker-disabled-popover")).not.toBeInTheDocument();
    });

    expect(onChange).not.toHaveBeenCalled();
  });
});
