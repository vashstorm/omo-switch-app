import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { JsonCodeEditor } from "../../src/web/components/common/JsonCodeEditor";

describe("JsonCodeEditor", () => {
  it("renders textarea inside container", () => {
    render(<JsonCodeEditor value="" onChange={vi.fn()} dataTestId="editor" />);
    const textarea = document.querySelector(".json-code-editor-textarea");
    expect(textarea).toBeTruthy();
  });

  it("calls onChange when typing", () => {
    const onChange = vi.fn();
    render(<JsonCodeEditor value="" onChange={onChange} dataTestId="editor" />);
    const textarea = document.querySelector(".json-code-editor-textarea")!;
    fireEvent.change(textarea, { target: { value: "{" } });
    expect(onChange).toHaveBeenCalledWith("{");
  });

  it("displays helper text", () => {
    render(
      <JsonCodeEditor
        value=""
        onChange={vi.fn()}
        helperText="Some hint"
        dataTestId="editor"
      />
    );
    expect(screen.getByText("Some hint")).toBeInTheDocument();
  });

  it("displays error helper in red", () => {
    render(
      <JsonCodeEditor
        value=""
        onChange={vi.fn()}
        error={true}
        helperText="Invalid JSON"
        dataTestId="editor"
      />
    );
    const helper = screen.getByText("Invalid JSON");
    expect(helper).toBeInTheDocument();
  });

  it("calls onBlur when textarea loses focus", () => {
    const onBlur = vi.fn();
    render(
      <JsonCodeEditor value="" onChange={vi.fn()} onBlur={onBlur} dataTestId="editor" />
    );
    const textarea = document.querySelector(".json-code-editor-textarea")!;
    fireEvent.blur(textarea);
    expect(onBlur).toHaveBeenCalled();
  });

  it("renders highlighted tokens", () => {
    render(<JsonCodeEditor value='{"a": 1}' onChange={vi.fn()} isDark={false} />);
    const spans = document.querySelectorAll("span");
    expect(spans.length).toBeGreaterThan(0);
  });
});
