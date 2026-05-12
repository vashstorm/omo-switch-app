import { describe, expect, test } from "vitest";
import {
  filterJsonPreviewData,
  countJsonPreviewMatches,
  hasJsonPreviewMatches,
  stringifyJsonPreviewData,
  renderJsonWithLineNumbers,
} from "../../src/web/components/common/jsonPreviewUtils";

describe("jsonPreviewUtils", () => {
  const sampleData = {
    name: "test-profile",
    version: "1.0.0",
    agents: {
      agent1: {
        name: "Agent One",
        model: "gpt-4",
      },
      agent2: {
        name: "Agent Two",
        model: "claude-3",
      },
    },
    categories: ["dev", "prod"],
    nested: {
      deep: {
        value: "deep-value",
      },
    },
  };

  describe("filterJsonPreviewData", () => {
    test("returns original data when query is empty", () => {
      const result = filterJsonPreviewData(sampleData, "");
      expect(result.data).toEqual(sampleData);
      expect(result.matchCount).toBe(0);
      expect(result.hasMatches).toBe(true);
    });

    test("filters by key match", () => {
      const result = filterJsonPreviewData(sampleData, "agent");
      expect(result.hasMatches).toBe(true);
      expect(result.matchCount).toBeGreaterThan(0);
      expect(result.data).toHaveProperty("agents");
    });

    test("filters by value match", () => {
      const result = filterJsonPreviewData(sampleData, "gpt-4");
      expect(result.hasMatches).toBe(true);
      expect(result.matchCount).toBeGreaterThan(0);
    });

    test("preserves ancestor paths when child matches", () => {
      const result = filterJsonPreviewData(sampleData, "deep-value");
      expect(result.hasMatches).toBe(true);
      expect(result.data).toHaveProperty("nested");
      expect((result.data as typeof sampleData).nested).toHaveProperty("deep");
    });

    test("returns empty object when no matches", () => {
      const result = filterJsonPreviewData(sampleData, "nonexistent");
      expect(result.hasMatches).toBe(false);
      expect(result.matchCount).toBe(0);
      expect(result.data).toEqual({});
    });

    test("is case insensitive", () => {
      const result1 = filterJsonPreviewData(sampleData, "AGENT");
      const result2 = filterJsonPreviewData(sampleData, "agent");
      expect(result1.matchCount).toBe(result2.matchCount);
    });

    test("handles arrays correctly", () => {
      const result = filterJsonPreviewData(sampleData, "dev");
      expect(result.hasMatches).toBe(true);
      expect(result.data).toHaveProperty("categories");
    });

    test("handles null and undefined", () => {
      const result1 = filterJsonPreviewData(null, "test");
      expect(result1.hasMatches).toBe(false);

      const result2 = filterJsonPreviewData(undefined, "test");
      expect(result2.hasMatches).toBe(false);
    });

    test("handles primitive values", () => {
      const result = filterJsonPreviewData("test-string", "string");
      expect(result.hasMatches).toBe(true);
      expect(result.data).toBe("test-string");
    });
  });

  describe("countJsonPreviewMatches", () => {
    test("returns 0 for empty query", () => {
      expect(countJsonPreviewMatches(sampleData, "")).toBe(0);
    });

    test("counts key matches", () => {
      const count = countJsonPreviewMatches(sampleData, "agent");
      expect(count).toBeGreaterThan(0);
    });

    test("counts value matches", () => {
      const count = countJsonPreviewMatches(sampleData, "Agent");
      expect(count).toBeGreaterThan(0);
    });

    test("counts both key and value matches", () => {
      const count = countJsonPreviewMatches(sampleData, "name");
      expect(count).toBeGreaterThanOrEqual(3);
    });

    test("is case insensitive", () => {
      const count1 = countJsonPreviewMatches(sampleData, "AGENT");
      const count2 = countJsonPreviewMatches(sampleData, "agent");
      expect(count1).toBe(count2);
    });
  });

  describe("hasJsonPreviewMatches", () => {
    test("returns true for empty query", () => {
      expect(hasJsonPreviewMatches(sampleData, "")).toBe(true);
    });

    test("returns true when match exists", () => {
      expect(hasJsonPreviewMatches(sampleData, "agent1")).toBe(true);
    });

    test("returns false when no match", () => {
      expect(hasJsonPreviewMatches(sampleData, "nonexistent")).toBe(false);
    });

    test("is case insensitive", () => {
      expect(hasJsonPreviewMatches(sampleData, "AGENT1")).toBe(true);
      expect(hasJsonPreviewMatches(sampleData, "agent1")).toBe(true);
    });
  });

  describe("stringifyJsonPreviewData", () => {
    test("formats JSON with 2-space indentation", () => {
      const result = stringifyJsonPreviewData({ a: 1, b: 2 });
      expect(result).toContain("{\n  \"a\": 1,\n  \"b\": 2\n}");
    });

    test("handles nested objects", () => {
      const result = stringifyJsonPreviewData({ a: { b: 1 } });
      expect(result).toContain("{\n  \"a\": {\n    \"b\": 1\n  }\n}");
    });

    test("handles arrays", () => {
      const result = stringifyJsonPreviewData([1, 2, 3]);
      expect(result).toBe("[\n  1,\n  2,\n  3\n]");
    });
  });

  describe("renderJsonWithLineNumbers", () => {
    test("returns array with line numbers", () => {
      const result = renderJsonWithLineNumbers({ a: 1 });
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty("lineNumber");
      expect(result[0]).toHaveProperty("content");
      expect(result[0].lineNumber).toBe(1);
    });

    test("handles empty object", () => {
      const result = renderJsonWithLineNumbers({});
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ lineNumber: 1, content: "{}" });
    });

    test("handles primitives", () => {
      const result = renderJsonWithLineNumbers("test");
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ lineNumber: 1, content: '"test"' });
    });
  });
});
