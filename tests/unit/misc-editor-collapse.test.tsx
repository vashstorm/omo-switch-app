import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, test, afterEach } from "vitest";
import { MiscEditor } from "../../src/web/components/misc/MiscEditor";

const miscData = { tmux: { enabled: true }, git_master: { enabled: false } };

describe("MiscEditor collapse", () => {
  afterEach(() => {
    cleanup();
  });

  test("misc sections are expanded by default", () => {
    render(<MiscEditor miscData={miscData} />);
    expect(screen.getByTestId("toggle-misc-tmux")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("toggle-misc-git_master")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText("Collapse misc section tmux")).toBeInTheDocument();
    expect(screen.getByLabelText("Collapse misc section git_master")).toBeInTheDocument();
  });

  test("clicking toggle collapses a misc section", () => {
    render(<MiscEditor miscData={miscData} />);
    fireEvent.click(screen.getByTestId("toggle-misc-tmux"));
    expect(screen.getByTestId("toggle-misc-tmux")).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByTestId("toggle-misc-git_master")).toHaveAttribute("aria-expanded", "true");
  });

  test("collapsed section hides its fields", () => {
    render(<MiscEditor miscData={miscData} />);
    expect(screen.getByTestId("misc-kv-tmux-enabled-readonly")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("toggle-misc-tmux"));
    expect(screen.getByTestId("toggle-misc-tmux")).toHaveAttribute("aria-expanded", "false");
  });

  test("globalCollapseKey collapses all misc sections", () => {
    const { rerender } = render(
      <MiscEditor miscData={miscData} globalCollapseKey={0} />
    );
    rerender(
      <MiscEditor miscData={miscData} globalCollapseKey={1} />
    );
    expect(screen.getByTestId("toggle-misc-tmux")).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByTestId("toggle-misc-git_master")).toHaveAttribute("aria-expanded", "false");
  });

  test("initial mount with non-zero globalCollapseKey starts collapsed", () => {
    render(<MiscEditor miscData={miscData} globalCollapseKey={1} />);
    expect(screen.getByTestId("toggle-misc-tmux")).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByTestId("toggle-misc-git_master")).toHaveAttribute("aria-expanded", "false");
  });

  test("remount with non-zero globalCollapseKey remains collapsed", () => {
    const first = render(<MiscEditor miscData={miscData} globalCollapseKey={1} />);
    expect(screen.getByTestId("toggle-misc-tmux")).toHaveAttribute("aria-expanded", "false");
    first.unmount();

    render(<MiscEditor miscData={miscData} globalCollapseKey={1} />);
    expect(screen.getByTestId("toggle-misc-tmux")).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByTestId("toggle-misc-git_master")).toHaveAttribute("aria-expanded", "false");
  });

  test("globalExpandKey expands all misc sections", () => {
    const { rerender } = render(
      <MiscEditor miscData={miscData} globalCollapseKey={1} />
    );
    rerender(
      <MiscEditor miscData={miscData} globalCollapseKey={1} globalExpandKey={1} />
    );
    expect(screen.getByTestId("toggle-misc-tmux")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("toggle-misc-git_master")).toHaveAttribute("aria-expanded", "true");
  });

  test("expandTargetId expands a specific collapsed misc section", () => {
    const { rerender } = render(
      <MiscEditor miscData={miscData} globalCollapseKey={1} />
    );
    rerender(
      <MiscEditor miscData={miscData} globalCollapseKey={1} expandTargetId="tmux" />
    );
    expect(screen.getByTestId("toggle-misc-tmux")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("toggle-misc-git_master")).toHaveAttribute("aria-expanded", "false");
  });

  test("misc section has correct id for scroll targeting", () => {
    render(<MiscEditor miscData={miscData} />);
    expect(document.getElementById("misc-tmux")).toBeInTheDocument();
    expect(document.getElementById("misc-git_master")).toBeInTheDocument();
  });
});
