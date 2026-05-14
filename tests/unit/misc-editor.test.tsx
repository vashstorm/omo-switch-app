import React from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, test, afterEach, vi } from "vitest";
import { MiscEditor } from "../../src/web/components/misc/MiscEditor";

describe("MiscEditor", () => {
  afterEach(() => {
    cleanup();
  });

  test("renders sections from miscData", () => {
    const miscData = {
      tmux: { enabled: false },
      git_master: { enabled: true },
    };

    render(<MiscEditor miscData={miscData} />);

    expect(screen.getByTestId("misc-section-tmux")).toBeInTheDocument();
    expect(screen.getByTestId("misc-section-git_master")).toBeInTheDocument();
  });

  test("renders boolean fields as read-only text", () => {
    const miscData = {
      tmux: { enabled: false },
    };

    render(<MiscEditor miscData={miscData} />);

    const field = screen.getByTestId("misc-kv-tmux-enabled-readonly");
    expect(field).toBeInTheDocument();
    expect(field).toHaveTextContent("enabled:");
    expect(field).toHaveTextContent("false");
  });

  test("renders string fields as read-only text", () => {
    const miscData = {
      custom_section: { name: "test-value" },
    };

    render(<MiscEditor miscData={miscData} />);

    const field = screen.getByTestId("misc-kv-custom_section-name-readonly");
    expect(field).toBeInTheDocument();
    expect(field).toHaveTextContent("name:");
    expect(field).toHaveTextContent("test-value");
  });

  test("renders number fields as read-only text", () => {
    const miscData = {
      custom_section: { count: 42 },
    };

    render(<MiscEditor miscData={miscData} />);

    const field = screen.getByTestId("misc-kv-custom_section-count-readonly");
    expect(field).toBeInTheDocument();
    expect(field).toHaveTextContent("count:");
    expect(field).toHaveTextContent("42");
  });

  test("renders object fields as JSON", () => {
    const miscData = {
      custom_section: { nested: { key: "value" } },
    };

    render(<MiscEditor miscData={miscData} />);

    const field = screen.getByTestId("misc-kv-custom_section-nested-readonly");
    expect(field).toBeInTheDocument();
    expect(field).toHaveTextContent("nested:");
    expect(field).toHaveTextContent('"key": "value"');
  });

  test("sections are sorted alphabetically", () => {
    const miscData = {
      z_section: { value: 1 },
      a_section: { value: 2 },
      m_section: { value: 3 },
    };

    render(<MiscEditor miscData={miscData} />);

    const sections = screen.getAllByTestId(/misc-section-/);
    expect(sections[0]).toHaveAttribute("data-testid", "misc-section-a_section");
    expect(sections[1]).toHaveAttribute("data-testid", "misc-section-m_section");
    expect(sections[2]).toHaveAttribute("data-testid", "misc-section-z_section");
  });

  test("renders nothing when miscData is empty", () => {
    render(<MiscEditor miscData={{}} />);

    expect(screen.queryByTestId(/misc-section-/)).not.toBeInTheDocument();
  });

  test("renders nothing when miscData is undefined", () => {
    render(<MiscEditor />);

    expect(screen.queryByTestId(/misc-section-/)).not.toBeInTheDocument();
  });

  test("renders primitive string value as a section", () => {
    const miscData = {
      primitive_string: "hello world",
    };

    render(<MiscEditor miscData={miscData} />);

    expect(screen.getByTestId("misc-section-primitive_string")).toBeInTheDocument();
    expect(screen.getByTestId("misc-primitive-primitive_string")).toBeInTheDocument();
    expect(screen.getByTestId("misc-primitive-primitive_string")).toHaveTextContent("value:");
    expect(screen.getByTestId("misc-primitive-primitive_string")).toHaveTextContent("hello world");
  });

  test("renders primitive number value as a section", () => {
    const miscData = {
      primitive_number: 42,
    };

    render(<MiscEditor miscData={miscData} />);

    expect(screen.getByTestId("misc-section-primitive_number")).toBeInTheDocument();
    expect(screen.getByTestId("misc-primitive-primitive_number")).toBeInTheDocument();
    expect(screen.getByTestId("misc-primitive-primitive_number")).toHaveTextContent("value:");
    expect(screen.getByTestId("misc-primitive-primitive_number")).toHaveTextContent("42");
  });

  test("renders primitive boolean value as a section", () => {
    const miscData = {
      primitive_boolean: true,
    };

    render(<MiscEditor miscData={miscData} />);

    expect(screen.getByTestId("misc-section-primitive_boolean")).toBeInTheDocument();
    expect(screen.getByTestId("misc-primitive-primitive_boolean")).toBeInTheDocument();
    expect(screen.getByTestId("misc-primitive-primitive_boolean")).toHaveTextContent("value:");
    expect(screen.getByTestId("misc-primitive-primitive_boolean")).toHaveTextContent("true");
  });

  test("renders primitive null value as a section", () => {
    const miscData = {
      primitive_null: null,
    };

    render(<MiscEditor miscData={miscData} />);

    expect(screen.getByTestId("misc-section-primitive_null")).toBeInTheDocument();
    expect(screen.getByTestId("misc-primitive-primitive_null")).toBeInTheDocument();
    expect(screen.getByTestId("misc-primitive-primitive_null")).toHaveTextContent("value:");
    expect(screen.getByTestId("misc-primitive-primitive_null")).toHaveTextContent("null");
  });

  test("renders array value as a section", () => {
    const miscData = {
      array_value: ["item1", "item2"],
    };

    render(<MiscEditor miscData={miscData} />);

    expect(screen.getByTestId("misc-section-array_value")).toBeInTheDocument();
    expect(screen.getByTestId("misc-array-array_value")).toBeInTheDocument();
    expect(screen.getByTestId("misc-array-array_value")).toHaveTextContent("value:");
    expect(screen.getByTestId("misc-array-array_value")).toHaveTextContent('"item1"');
    expect(screen.getByTestId("misc-array-array_value")).toHaveTextContent('"item2"');
  });

  test("renders mixed primitive and object sections", () => {
    const miscData = {
      primitive_string: "hello",
      tmux: { enabled: true },
      primitive_number: 42,
    };

    render(<MiscEditor miscData={miscData} />);

    expect(screen.getByTestId("misc-section-primitive_number")).toBeInTheDocument();
    expect(screen.getByTestId("misc-section-primitive_string")).toBeInTheDocument();
    expect(screen.getByTestId("misc-section-tmux")).toBeInTheDocument();

    expect(screen.getByTestId("misc-primitive-primitive_number")).toBeInTheDocument();
    expect(screen.getByTestId("misc-primitive-primitive_string")).toBeInTheDocument();
    expect(screen.getByTestId("misc-kv-tmux-enabled-readonly")).toBeInTheDocument();
  });

  test("edits string values as key-value entries", () => {
    const onChange = vi.fn();

    render(<MiscEditor miscData={{ custom_prompt: "hello" }} onChange={onChange} />);

    fireEvent.change(screen.getByTestId("misc-custom_prompt-value"), {
      target: { value: "updated" },
    });

    expect(onChange).toHaveBeenCalledWith({ custom_prompt: "updated" });
  });

  test("edits boolean values as key-value entries", () => {
    const onChange = vi.fn();

    render(<MiscEditor miscData={{ feature_enabled: true }} onChange={onChange} />);

    fireEvent.click(screen.getByTestId("misc-feature_enabled-value-checkbox"));

    expect(onChange).toHaveBeenCalledWith({ feature_enabled: false });
  });

  test("edits object values as JSON key-value entries", () => {
    const onChange = vi.fn();

    render(
      <MiscEditor
        miscData={{ tmux: { enabled: true, prefix_key: "Ctrl+B" } }}
        onChange={onChange}
      />,
    );

    const input = screen.getByTestId("misc-tmux-value-json");
    fireEvent.change(input, {
      target: { value: '{ "enabled": false, "prefix_key": "Ctrl+A" }' },
    });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith({
      tmux: { enabled: false, prefix_key: "Ctrl+A" },
    });
  });

  test("edits array values as JSON key-value entries", () => {
    const onChange = vi.fn();

    render(<MiscEditor miscData={{ tools: ["one"] }} onChange={onChange} />);

    const input = screen.getByTestId("misc-tools-value-json");
    fireEvent.change(input, {
      target: { value: '["one", "two"]' },
    });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith({ tools: ["one", "two"] });
  });
});
