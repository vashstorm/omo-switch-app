import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ThemeToggle } from "../../src/web/components/ThemeToggle";

describe("ThemeToggle", () => {
  afterEach(() => {
    cleanup();
  });

  test("renders compact button with accessibility label", () => {
    render(<ThemeToggle theme="dark" setTheme={() => {}} />);

    const button = screen.getByRole("button", { name: "Toggle theme" });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("data-testid", "theme-toggle");
  });

  test("button is clickable", () => {
    const setTheme = vi.fn();
    render(<ThemeToggle theme="dark" setTheme={setTheme} />);

    const button = screen.getByTestId("theme-toggle");
    fireEvent.click(button);

    expect(button).toBeInTheDocument();
  });
});
