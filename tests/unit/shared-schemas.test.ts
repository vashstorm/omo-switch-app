import { describe, it, expect } from "vitest";
import {
  VariantSchema,
  TemperatureSchema,
  AgentConfigSchema,
  CategoryConfigSchema,
  shouldOmitField,
  filterEmptyFields,
  AGENT_MANAGED_FIELDS,
  CATEGORY_MANAGED_FIELDS,
} from "../../src/shared";

describe("VariantSchema", () => {
  it("should accept valid variants", () => {
    expect(VariantSchema.parse("low")).toBe("low");
    expect(VariantSchema.parse("medium")).toBe("medium");
    expect(VariantSchema.parse("high")).toBe("high");
  });

  it("should reject invalid variants", () => {
    expect(() => VariantSchema.parse("invalid")).toThrow();
    expect(() => VariantSchema.parse("")).toThrow();
    expect(() => VariantSchema.parse("LOW")).toThrow();
    expect(() => VariantSchema.parse("Low")).toThrow();
  });
});

describe("TemperatureSchema", () => {
  it("should accept valid temperatures within range", () => {
    expect(TemperatureSchema.parse(0)).toBe(0);
    expect(TemperatureSchema.parse(1)).toBe(1);
    expect(TemperatureSchema.parse(0.5)).toBe(0.5);
  });

  it("should reject temperatures outside range", () => {
    expect(() => TemperatureSchema.parse(-0.1)).toThrow();
    expect(() => TemperatureSchema.parse(1.1)).toThrow();
    expect(() => TemperatureSchema.parse(-1)).toThrow();
    expect(() => TemperatureSchema.parse(2)).toThrow();
  });

  it("should reject non-numeric values", () => {
    expect(() => TemperatureSchema.parse("0.5")).toThrow();
    expect(() => TemperatureSchema.parse(null)).toThrow();
    expect(() => TemperatureSchema.parse(undefined)).toThrow();
  });
});

describe("AgentConfigSchema", () => {
  it("should validate minimal agent config", () => {
    const result = AgentConfigSchema.parse({ model: "gpt-4o" });
    expect(result.model).toBe("gpt-4o");
    expect(result.variant).toBeUndefined();
    expect(result.temperature).toBeUndefined();
    expect(result.prompt_append).toBeUndefined();
  });

  it("should validate full agent config", () => {
    const result = AgentConfigSchema.parse({
      model: "claude-sonnet-4-5",
      variant: "high",
      temperature: 0.7,
      prompt_append: "Be concise",
    });
    expect(result.model).toBe("claude-sonnet-4-5");
    expect(result.variant).toBe("high");
    expect(result.temperature).toBe(0.7);
    expect(result.prompt_append).toBe("Be concise");
  });

  it("should validate agent config without model", () => {
    const result = AgentConfigSchema.parse({});
    expect(result.model).toBeUndefined();
    expect(result.variant).toBeUndefined();
    expect(result.temperature).toBeUndefined();
    expect(result.prompt_append).toBeUndefined();
  });

  it("should reject invalid variant in agent config", () => {
    expect(() =>
      AgentConfigSchema.parse({ model: "gpt-4o", variant: "ultra" })
    ).toThrow();
  });

  it("should reject invalid temperature in agent config", () => {
    expect(() =>
      AgentConfigSchema.parse({ model: "gpt-4o", temperature: 1.5 })
    ).toThrow();
  });
});

describe("CategoryConfigSchema", () => {
  it("should validate minimal category config", () => {
    const result = CategoryConfigSchema.parse({ model: "gpt-4o" });
    expect(result.model).toBe("gpt-4o");
    expect(result.variant).toBeUndefined();
    expect(result.fallback_models).toBeUndefined();
  });

  it("should validate full category config", () => {
    const result = CategoryConfigSchema.parse({
      model: "claude-opus-4-5",
      variant: "high",
      temperature: 0.8,
      description: "Visual engineering tasks",
      prompt_append: "Focus on UI/UX",
      fallback_models: ["gpt-4o", "gemini-2.5-pro"],
    });
    expect(result.model).toBe("claude-opus-4-5");
    expect(result.variant).toBe("high");
    expect(result.temperature).toBe(0.8);
    expect(result.description).toBe("Visual engineering tasks");
    expect(result.prompt_append).toBe("Focus on UI/UX");
    expect(result.fallback_models).toEqual(["gpt-4o", "gemini-2.5-pro"]);
  });

  it("should validate category config without model", () => {
    const result = CategoryConfigSchema.parse({});
    expect(result.model).toBeUndefined();
    expect(result.variant).toBeUndefined();
    expect(result.fallback_models).toBeUndefined();
  });

  it("should reject invalid fallback_models", () => {
    expect(() =>
      CategoryConfigSchema.parse({
        model: "gpt-4o",
        fallback_models: "gpt-4o",
      })
    ).toThrow();
  });
});

describe("shouldOmitField", () => {
  it("should return false for fields with values", () => {
    const def = { required: false, omitWhenEmpty: true };
    expect(shouldOmitField("", def)).toBe(true);
    expect(shouldOmitField(undefined, def)).toBe(true);
    expect(shouldOmitField(null, def)).toBe(true);
  });

  it("should return true for undefined/null when omitWhenEmpty is true", () => {
    const def = { required: false, omitWhenEmpty: true };
    expect(shouldOmitField(undefined, def)).toBe(true);
    expect(shouldOmitField(null, def)).toBe(true);
  });

  it("should return true for empty string when omitWhenEmpty is true", () => {
    const def = { required: false, omitWhenEmpty: true };
    expect(shouldOmitField("", def)).toBe(true);
  });

  it("should return true for empty array when omitWhenEmpty is true", () => {
    const def = { required: false, omitWhenEmpty: true };
    expect(shouldOmitField([], def)).toBe(true);
  });

  it("should return false for non-empty values", () => {
    const def = { required: false, omitWhenEmpty: true };
    expect(shouldOmitField("text", def)).toBe(false);
    expect(shouldOmitField(1, def)).toBe(false);
    expect(shouldOmitField(false, def)).toBe(false);
    expect(shouldOmitField(["item"], def)).toBe(false);
    expect(shouldOmitField({ key: "value" }, def)).toBe(false);
  });

  it("should return true for temperature === 0 (default value)", () => {
    const def = { required: false, omitWhenEmpty: true };
    expect(shouldOmitField(0, def, "temperature")).toBe(true);
    expect(shouldOmitField(0.5, def, "temperature")).toBe(false);
    expect(shouldOmitField(0, def, "otherField")).toBe(false);
  });
});

describe("filterEmptyFields", () => {
  it("should filter empty optional fields from agent config", () => {
    const input = {
      model: undefined,
      variant: undefined,
      temperature: 0.7,
      prompt_append: "",
    };
    const result = filterEmptyFields(input, AGENT_MANAGED_FIELDS);
    expect(result).toEqual({ temperature: 0.7 });
  });

  it("should keep all non-empty fields", () => {
    const input = {
      model: "claude-sonnet-4-5",
      variant: "high" as const,
      temperature: 0.8,
      prompt_append: "Be helpful",
    };
    const result = filterEmptyFields(input, AGENT_MANAGED_FIELDS);
    expect(result).toEqual(input);
  });

  it("should filter empty fallback_models from category config", () => {
    const input = {
      model: undefined,
      variant: undefined,
      temperature: undefined,
      description: "",
      prompt_append: "",
      fallback_models: [],
    };
    const result = filterEmptyFields(input, CATEGORY_MANAGED_FIELDS);
    expect(result).toEqual({});
  });

  it("should keep non-empty fallback_models", () => {
    const input = {
      model: undefined,
      fallback_models: ["claude-sonnet-4-5"],
    };
    const result = filterEmptyFields(input, CATEGORY_MANAGED_FIELDS);
    expect(result).toEqual({ fallback_models: ["claude-sonnet-4-5"] });
  });
});
