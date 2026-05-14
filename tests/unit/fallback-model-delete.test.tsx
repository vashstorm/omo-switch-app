import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { ModelGroup } from "../../src/shared/config/types";
import { AgentCard } from "../../src/web/components/agents/AgentCard";
import { CategoryCard } from "../../src/web/components/categories/CategoryCard";
import { ThemeProvider } from "../../src/web/theme/ThemeContext";

const modelGroups: ModelGroup[] = [
  {
    provider: "openai",
    label: "openai",
    models: [
      { id: "openai/gpt-4o", label: "gpt-4o", provider: "openai" },
      { id: "openai/gpt-4o-mini", label: "gpt-4o-mini", provider: "openai" },
    ],
  },
];

function clickFirstChipDelete(testId: string) {
  const trigger = screen.getByTestId(testId);
  const deleteButton = trigger.querySelector('[class*="MuiChip-deleteIcon"]');
  expect(deleteButton).toBeTruthy();
  fireEvent.click(deleteButton!);
}

describe("fallback model delete", () => {
  afterEach(() => {
    cleanup();
  });

  test("agent preserves an explicit empty fallback_models array after deleting the last chip", () => {
    const onChange = vi.fn();

    render(
      <ThemeProvider initialTheme="light">
        <AgentCard
          id="planner"
          agent={{ model: "openai/gpt-4o", fallback_models: ["openai/gpt-4o-mini"] }}
          availableModels={["openai/gpt-4o", "openai/gpt-4o-mini"]}
          availableModelGroups={modelGroups}
          onChange={onChange}
          onDelete={vi.fn()}
        />
      </ThemeProvider>,
    );

    clickFirstChipDelete("agent-fallback-planner-trigger");

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      fallback_models: [],
    }));
  });

  test("category preserves an explicit empty fallback_models array after deleting the last chip", () => {
    const onChange = vi.fn();

    render(
      <ThemeProvider initialTheme="light">
        <CategoryCard
          id="code"
          category={{ model: "openai/gpt-4o", fallback_models: ["openai/gpt-4o-mini"] }}
          availableModels={["openai/gpt-4o", "openai/gpt-4o-mini"]}
          availableModelGroups={modelGroups}
          onChange={onChange}
          onDelete={vi.fn()}
        />
      </ThemeProvider>,
    );

    clickFirstChipDelete("category-fallback-code-trigger");

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      fallback_models: [],
    }));
  });
});
