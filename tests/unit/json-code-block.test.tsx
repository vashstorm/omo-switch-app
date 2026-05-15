import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { JsonCodeBlock } from "../../src/web/components/common/JsonCodeBlock";

describe("JsonCodeBlock", () => {
  it("renders pre element with data-testid", () => {
    render(<JsonCodeBlock data={{ enabled: true }} dataTestId="block" />);
    const el = screen.getByTestId("block");
    expect(el.tagName).toBe("PRE");
  });

  it("renders colored spans for tokens", () => {
    render(<JsonCodeBlock data={{ a: 1 }} isDark={false} />);
    const spans = document.querySelectorAll("span");
    expect(spans.length).toBeGreaterThan(0);
    const numSpan = Array.from(spans).find((s) => s.textContent === "1");
    expect(numSpan).toBeTruthy();
    expect(numSpan?.style.color).toBeTruthy();
  });

  it("renders dark theme colors when isDark is true", () => {
    render(<JsonCodeBlock data={{ x: "y" }} isDark={true} />);
    const spans = document.querySelectorAll("span");
    const strSpan = Array.from(spans).find((s) => s.textContent === '"y"');
    expect(strSpan).toBeTruthy();
    expect(strSpan?.style.color).toBeTruthy();
  });

  it("handles null data", () => {
    render(<JsonCodeBlock data={null} />);
    expect(screen.getByText("null")).toBeInTheDocument();
  });
});
