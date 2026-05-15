import { describe, it, expect } from "vitest";
import {
  tokenizeJson,
  getRenderedTokens,
  jsonColorThemes,
} from "../../src/web/utils/jsonHighlighter";

describe("tokenizeJson", () => {
  it("tokenizes simple object with key detection", () => {
    const tokens = tokenizeJson('{\n  "enabled": true\n}');
    const nonWhitespace = tokens.filter((t) => t.type !== "whitespace");
    expect(nonWhitespace).toEqual([
      { type: "punctuation", value: "{" },
      { type: "key", value: '"enabled"' },
      { type: "punctuation", value: ":" },
      { type: "boolean", value: "true" },
      { type: "punctuation", value: "}" },
    ]);
  });

  it("tokenizes nested object", () => {
    const tokens = tokenizeJson('{"a": {"b": 123}}');
    const nonWhitespace = tokens.filter((t) => t.type !== "whitespace");
    expect(nonWhitespace).toEqual([
      { type: "punctuation", value: "{" },
      { type: "key", value: '"a"' },
      { type: "punctuation", value: ":" },
      { type: "punctuation", value: "{" },
      { type: "key", value: '"b"' },
      { type: "punctuation", value: ":" },
      { type: "number", value: "123" },
      { type: "punctuation", value: "}" },
      { type: "punctuation", value: "}" },
    ]);
  });

  it("tokenizes array with mixed types", () => {
    const tokens = tokenizeJson('["hello", 42, false, null]');
    const nonWhitespace = tokens.filter((t) => t.type !== "whitespace");
    expect(nonWhitespace).toEqual([
      { type: "punctuation", value: "[" },
      { type: "string", value: '"hello"' },
      { type: "punctuation", value: "," },
      { type: "number", value: "42" },
      { type: "punctuation", value: "," },
      { type: "boolean", value: "false" },
      { type: "punctuation", value: "," },
      { type: "null", value: "null" },
      { type: "punctuation", value: "]" },
    ]);
  });

  it("tokenizes escaped strings", () => {
    const tokens = tokenizeJson('"hello\\nworld"');
    expect(tokens).toEqual([{ type: "string", value: '"hello\\nworld"' }]);
  });

  it("tokenizes scientific notation numbers", () => {
    const tokens = tokenizeJson('1.5e10');
    expect(tokens).toEqual([{ type: "number", value: "1.5e10" }]);
  });

  it("does not misdetect array strings as keys", () => {
    const tokens = tokenizeJson('["a", "b"]');
    const strings = tokens.filter((t) => t.type === "string" || t.type === "key");
    expect(strings.every((t) => t.type === "string")).toBe(true);
  });

  it("handles empty object and array", () => {
    expect(tokenizeJson('{}').filter((t) => t.type !== "whitespace")).toEqual([
      { type: "punctuation", value: "{" },
      { type: "punctuation", value: "}" },
    ]);
    expect(tokenizeJson('[]').filter((t) => t.type !== "whitespace")).toEqual([
      { type: "punctuation", value: "[" },
      { type: "punctuation", value: "]" },
    ]);
  });

  it("gracefully handles invalid JSON", () => {
    const tokens = tokenizeJson('"unclosed');
    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens[0].type).toBe("string");
  });
});

describe("getRenderedTokens", () => {
  it("assigns correct colors for light theme", () => {
    const tokens = tokenizeJson('{"key": "value", "num": 42}');
    const rendered = getRenderedTokens(tokens, jsonColorThemes.light);
    const keyToken = rendered.find((t) => t.value === '"key"');
    const stringToken = rendered.find((t) => t.value === '"value"');
    const numToken = rendered.find((t) => t.value === "42");
    expect(keyToken?.color).toBe(jsonColorThemes.light.key);
    expect(stringToken?.color).toBe(jsonColorThemes.light.string);
    expect(numToken?.color).toBe(jsonColorThemes.light.number);
  });

  it("whitespace tokens have inherit color", () => {
    const tokens = tokenizeJson(' ');
    const rendered = getRenderedTokens(tokens, jsonColorThemes.dark);
    expect(rendered[0].color).toBe("inherit");
  });
});
