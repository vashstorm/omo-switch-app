import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, test, vi } from "vitest";
import { AgentCard } from "../../src/web/components/agents/AgentCard";
import { CategoryCard } from "../../src/web/components/categories/CategoryCard";
import { ThemeProvider } from "../../src/web/theme/ThemeContext";

describe("Agent and category numeric fields", () => {
  afterEach(() => {
    cleanup();
  });

  test("renders sisyphus temperature and maxTokens values as visible text inputs", () => {
    const onChange = vi.fn();

    render(
      <ThemeProvider initialTheme="light">
        <AgentCard
          id="sisyphus"
          agent={{ model: "openai/gpt-5.3-codex", temperature: 0.1, maxTokens: 64000 }}
          availableModels={["openai/gpt-5.3-codex"]}
          availableModelGroups={[]}
          onChange={onChange}
          onDelete={vi.fn()}
        />
      </ThemeProvider>,
    );

    const temperature = screen.getByTestId("agent-temperature-sisyphus");
    const maxTokens = screen.getByTestId("agent-maxTokens-sisyphus");

    expect(temperature).toHaveValue("0.1");
    expect(temperature).toHaveAttribute("type", "text");
    expect(temperature).toHaveAttribute("inputmode", "decimal");

    expect(maxTokens).toHaveValue("64000");
    expect(maxTokens).toHaveAttribute("type", "text");
    expect(maxTokens).toHaveAttribute("inputmode", "numeric");

    expect(screen.getByTestId("agent-temperature-sisyphus-increase")).toBeInTheDocument();
    expect(screen.getByTestId("agent-temperature-sisyphus-decrease")).toBeInTheDocument();
    expect(screen.getByTestId("agent-maxTokens-sisyphus-increase")).toBeInTheDocument();
    expect(screen.getByTestId("agent-maxTokens-sisyphus-decrease")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("agent-temperature-sisyphus-increase"));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ temperature: 0.2 }));

    fireEvent.click(screen.getByTestId("agent-maxTokens-sisyphus-decrease"));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ maxTokens: 63000 }));
  });

  test("renders category temperature value as a visible text input", () => {
    const onChange = vi.fn();

    render(
      <ThemeProvider initialTheme="light">
        <CategoryCard
          id="review"
          category={{ model: "openai/gpt-5.4", temperature: 0.3 }}
          availableModels={["openai/gpt-5.4"]}
          availableModelGroups={[]}
          onChange={onChange}
          onDelete={vi.fn()}
        />
      </ThemeProvider>,
    );

    const temperature = screen.getByTestId("category-temperature-review");

    expect(temperature).toHaveValue("0.3");
    expect(temperature).toHaveAttribute("type", "text");
    expect(temperature).toHaveAttribute("inputmode", "decimal");

    expect(screen.getByTestId("category-temperature-review-increase")).toBeInTheDocument();
    expect(screen.getByTestId("category-temperature-review-decrease")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("category-temperature-review-increase"));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ temperature: 0.4 }));
  });
});
