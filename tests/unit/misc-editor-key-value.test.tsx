import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, test, afterEach } from "vitest";
import { MiscEditor } from "../../src/web/components/misc/MiscEditor";

const miscData = {
  tmux: { enabled: true, prefix_key: "Ctrl+B" },
  git_master: { enabled: false, max_depth: 5 },
};

describe("MiscEditor key-value display", () => {
  afterEach(() => {
    cleanup();
  });

  test("renders all sections from miscData", () => {
    render(<MiscEditor miscData={miscData} />);
    expect(screen.getByTestId("misc-section-tmux")).toBeInTheDocument();
    expect(screen.getByTestId("misc-section-git_master")).toBeInTheDocument();
  });

  test("displays boolean fields as read-only text", () => {
    render(<MiscEditor miscData={miscData} />);
    const field = screen.getByTestId("misc-kv-tmux-enabled-readonly");
    expect(field).toHaveTextContent("enabled:");
    expect(field).toHaveTextContent("true");
  });

  test("displays string fields as read-only text", () => {
    render(<MiscEditor miscData={miscData} />);
    const readonlyField = screen.getByTestId("misc-kv-tmux-prefix_key-readonly");
    expect(readonlyField).toHaveTextContent("prefix_key:");
    expect(readonlyField).toHaveTextContent("Ctrl+B");
  });

  test("displays number fields as read-only text", () => {
    render(<MiscEditor miscData={miscData} />);
    const readonlyField = screen.getByTestId("misc-kv-git_master-max_depth-readonly");
    expect(readonlyField).toHaveTextContent("max_depth:");
    expect(readonlyField).toHaveTextContent("5");
  });

  test("sections are sorted alphabetically", () => {
    render(<MiscEditor miscData={miscData} />);
    const sections = screen.getAllByTestId(/misc-section-/);
    expect(sections[0]).toHaveAttribute("data-testid", "misc-section-git_master");
    expect(sections[1]).toHaveAttribute("data-testid", "misc-section-tmux");
  });
});