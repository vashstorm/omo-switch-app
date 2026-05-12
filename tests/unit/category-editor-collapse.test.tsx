import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, test, vi, afterEach } from "vitest";
import { CategoryEditor } from "../../src/web/components/categories/CategoryEditor";

const categories = {
  quick: { model: "openai/gpt-4" },
  deep: { model: "anthropic/claude-3" },
};
const mockModels = ["openai/gpt-4", "anthropic/claude-3"];
const onChange = vi.fn();
const onDirty = vi.fn();

describe("CategoryEditor collapse", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("categories are expanded by default", () => {
    render(<CategoryEditor categories={categories} availableModels={mockModels} onChange={onChange} onDirty={onDirty} />);
    expect(screen.getByTestId("toggle-category-quick")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("toggle-category-deep")).toHaveAttribute("aria-expanded", "true");
  });

  test("clicking toggle collapses a category card", () => {
    render(<CategoryEditor categories={categories} availableModels={mockModels} onChange={onChange} onDirty={onDirty} />);
    fireEvent.click(screen.getByTestId("toggle-category-quick"));
    expect(screen.getByTestId("toggle-category-quick")).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByTestId("toggle-category-deep")).toHaveAttribute("aria-expanded", "true");
  });

  test("globalCollapseKey collapses all categories", () => {
    const { rerender } = render(
      <CategoryEditor categories={categories} availableModels={mockModels} onChange={onChange} onDirty={onDirty} globalCollapseKey={0} />
    );
    rerender(
      <CategoryEditor categories={categories} availableModels={mockModels} onChange={onChange} onDirty={onDirty} globalCollapseKey={1} />
    );
    expect(screen.getByTestId("toggle-category-quick")).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByTestId("toggle-category-deep")).toHaveAttribute("aria-expanded", "false");
  });

  test("initial mount with non-zero globalCollapseKey starts collapsed", () => {
    render(
      <CategoryEditor categories={categories} availableModels={mockModels} onChange={onChange} onDirty={onDirty} globalCollapseKey={1} />
    );
    expect(screen.getByTestId("toggle-category-quick")).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByTestId("toggle-category-deep")).toHaveAttribute("aria-expanded", "false");
  });

  test("remount with non-zero globalCollapseKey remains collapsed", () => {
    const first = render(
      <CategoryEditor categories={categories} availableModels={mockModels} onChange={onChange} onDirty={onDirty} globalCollapseKey={1} />
    );
    expect(screen.getByTestId("toggle-category-quick")).toHaveAttribute("aria-expanded", "false");
    first.unmount();

    render(
      <CategoryEditor categories={categories} availableModels={mockModels} onChange={onChange} onDirty={onDirty} globalCollapseKey={1} />
    );
    expect(screen.getByTestId("toggle-category-quick")).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByTestId("toggle-category-deep")).toHaveAttribute("aria-expanded", "false");
  });

  test("globalExpandKey expands all categories", () => {
    const { rerender } = render(
      <CategoryEditor categories={categories} availableModels={mockModels} onChange={onChange} onDirty={onDirty} globalCollapseKey={1} />
    );
    rerender(
      <CategoryEditor categories={categories} availableModels={mockModels} onChange={onChange} onDirty={onDirty} globalCollapseKey={1} globalExpandKey={1} />
    );
    expect(screen.getByTestId("toggle-category-quick")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("toggle-category-deep")).toHaveAttribute("aria-expanded", "true");
  });

  test("expandTargetId expands a specific collapsed category", () => {
    const { rerender } = render(
      <CategoryEditor categories={categories} availableModels={mockModels} onChange={onChange} onDirty={onDirty} globalCollapseKey={1} />
    );
    rerender(
      <CategoryEditor categories={categories} availableModels={mockModels} onChange={onChange} onDirty={onDirty} globalCollapseKey={1} expandTargetId="quick" />
    );
    expect(screen.getByTestId("toggle-category-quick")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("toggle-category-deep")).toHaveAttribute("aria-expanded", "false");
  });
});
