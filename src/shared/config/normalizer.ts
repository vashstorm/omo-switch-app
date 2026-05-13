import { VariantSchema, TemperatureSchema } from "../schemas";
import {
  AGENT_MANAGED_FIELDS,
  CATEGORY_MANAGED_FIELDS,
  MISC_MANAGED_FIELDS,
  ULTRAWORK_MANAGED_FIELDS,
} from "../managed-fields";
import type { ConfigFieldError, RawConfig } from "./types";
import type { AgentConfig, CategoryConfig, MiscConfig, UltraworkConfig } from "../types";
import { loggers } from "../logger";

const MANAGED_AGENT_FIELDS = new Set(Object.keys(AGENT_MANAGED_FIELDS));
const MANAGED_CATEGORY_FIELDS = new Set(Object.keys(CATEGORY_MANAGED_FIELDS));
const MANAGED_MISC_TMUX_FIELDS = new Set(Object.keys(MISC_MANAGED_FIELDS.tmux));
const MANAGED_MISC_GIT_MASTER_FIELDS = new Set(
  Object.keys(MISC_MANAGED_FIELDS.git_master),
);
const MANAGED_ULTRAWORK_FIELDS = new Set(Object.keys(ULTRAWORK_MANAGED_FIELDS));

export function stripSchemaField<T extends Record<string, unknown>>(
  obj: T,
): Omit<T, "$schema"> {
  const result = { ...obj };
  delete (result as Record<string, unknown>)["$schema"];
  return result;
}

export function isManagedAgentField(field: string): boolean {
  return MANAGED_AGENT_FIELDS.has(field);
}

export function isManagedCategoryField(field: string): boolean {
  return MANAGED_CATEGORY_FIELDS.has(field);
}

export function isManagedMiscField(section: string, field: string): boolean {
  if (section === "tmux") {
    return MANAGED_MISC_TMUX_FIELDS.has(field);
  }
  if (section === "git_master") {
    return MANAGED_MISC_GIT_MASTER_FIELDS.has(field);
  }
  return false;
}

export function validateAgentField(
  agentName: string,
  field: string,
  value: unknown,
): ConfigFieldError | null {
  if (field === "variant" && value !== undefined) {
    const result = VariantSchema.safeParse(value);
    if (!result.success) {
        loggers.sharedConfigNormalizer.warn(
          { operation: "config.normalize_invalid_field", path: `agents.${agentName}.variant`, value, expected: "low|medium|high|xhigh|max" },
          "Invalid variant value"
        );
        return {
          path: `agents.${agentName}.variant`,
          message: `Invalid variant value "${value}". Must be one of: low, medium, high, xhigh, max`,
        };
    }
  }

  if (field === "temperature" && value !== undefined) {
    const result = TemperatureSchema.safeParse(value);
    if (!result.success) {
      loggers.sharedConfigNormalizer.warn(
        { operation: "config.normalize_invalid_field", path: `agents.${agentName}.temperature`, value, expected: "0-1" },
        "Invalid temperature value"
      );
      return {
        path: `agents.${agentName}.temperature`,
        message: `Invalid temperature value ${value}. Must be between 0 and 1 (inclusive)`,
      };
    }
  }

  if (field === "ultrawork" && value !== undefined && value !== null && typeof value === "object") {
    const ultraworkErrors = validateUltraworkField(agentName, value as Record<string, unknown>);
    return ultraworkErrors.length > 0 ? ultraworkErrors[0] : null;
  }

  return null;
}

function validateUltraworkField(
  agentName: string,
  ultrawork: Record<string, unknown>,
): ConfigFieldError[] {
  const errors: ConfigFieldError[] = [];

  for (const [key, value] of Object.entries(ultrawork)) {
    if (key === "variant" && value !== undefined) {
      const result = VariantSchema.safeParse(value);
      if (!result.success) {
        loggers.sharedConfigNormalizer.warn(
          { operation: "config.normalize_invalid_field", path: `agents.${agentName}.ultrawork.variant`, value, expected: "low|medium|high|xhigh|max" },
          "Invalid ultrawork variant value"
        );
        errors.push({
          path: `agents.${agentName}.ultrawork.variant`,
          message: `Invalid ultrawork variant value "${value}". Must be one of: low, medium, high, xhigh, max`,
        });
      }
    }

    if (key === "temperature" && value !== undefined) {
      const result = TemperatureSchema.safeParse(value);
      if (!result.success) {
        loggers.sharedConfigNormalizer.warn(
          { operation: "config.normalize_invalid_field", path: `agents.${agentName}.ultrawork.temperature`, value, expected: "0-1" },
          "Invalid ultrawork temperature value"
        );
        errors.push({
          path: `agents.${agentName}.ultrawork.temperature`,
          message: `Invalid ultrawork temperature value ${value}. Must be between 0 and 1 (inclusive)`,
        });
      }
    }
  }

  return errors;
}

export function validateCategoryField(
  categoryName: string,
  field: string,
  value: unknown,
): ConfigFieldError | null {
  if (field === "variant" && value !== undefined) {
    const result = VariantSchema.safeParse(value);
    if (!result.success) {
      loggers.sharedConfigNormalizer.warn(
        { operation: "config.normalize_invalid_field", path: `categories.${categoryName}.variant`, value, expected: "low|medium|high|xhigh|max" },
        "Invalid category variant value"
      );
      return {
        path: `categories.${categoryName}.variant`,
        message: `Invalid variant value "${value}". Must be one of: low, medium, high, xhigh, max`,
      };
    }
  }

  if (field === "temperature" && value !== undefined) {
    const result = TemperatureSchema.safeParse(value);
    if (!result.success) {
      loggers.sharedConfigNormalizer.warn(
        { operation: "config.normalize_invalid_field", path: `categories.${categoryName}.temperature`, value, expected: "0-1" },
        "Invalid category temperature value"
      );
      return {
        path: `categories.${categoryName}.temperature`,
        message: `Invalid temperature value ${value}. Must be between 0 and 1 (inclusive)`,
      };
    }
  }

  return null;
}

function normalizeUltraworkConfig(
  raw: unknown,
  _agentName: string,
  _errors: ConfigFieldError[],
): UltraworkConfig | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const rawObj = raw as Record<string, unknown>;
  const config: Partial<UltraworkConfig> = {};

  for (const [key, value] of Object.entries(rawObj)) {
    if (key === "$schema") continue;

    if (MANAGED_ULTRAWORK_FIELDS.has(key)) {
      (config as Record<string, unknown>)[key] = value;
    }
  }

  return config as UltraworkConfig;
}

export function normalizeAgentConfig(
  raw: unknown,
  agentName: string,
  errors: ConfigFieldError[],
): AgentConfig | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const rawObj = raw as Record<string, unknown>;
  const config: Partial<AgentConfig> = {};

  for (const [key, value] of Object.entries(rawObj)) {
    if (key === "$schema") continue;

    const error = validateAgentField(agentName, key, value);
    if (error) {
      errors.push(error);
    } else if (isManagedAgentField(key)) {
      if (key === "ultrawork" && value && typeof value === "object") {
        const ultraworkConfig = normalizeUltraworkConfig(value, agentName, errors);
        if (ultraworkConfig && Object.keys(ultraworkConfig).length > 0) {
          (config as Record<string, unknown>)[key] = ultraworkConfig;
        }
      } else {
        (config as Record<string, unknown>)[key] = value;
      }
    }
  }

  return config as AgentConfig;
}

export function normalizeCategoryConfig(
  raw: unknown,
  categoryName: string,
  errors: ConfigFieldError[],
): CategoryConfig | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const rawObj = raw as Record<string, unknown>;
  const config: Partial<CategoryConfig> = {};

  for (const [key, value] of Object.entries(rawObj)) {
    if (key === "$schema") continue;

    const error = validateCategoryField(categoryName, key, value);
    if (error) {
      errors.push(error);
    } else if (isManagedCategoryField(key)) {
      (config as Record<string, unknown>)[key] = value;
    }
  }

  return config as CategoryConfig;
}

export function normalizeMiscConfig(raw: unknown): MiscConfig {
  if (!raw || typeof raw !== "object") {
    return {};
  }

  const rawObj = raw as Record<string, unknown>;
  const config: MiscConfig = {};

  for (const [sectionName, sectionValue] of Object.entries(rawObj)) {
    if (sectionName === "$schema") continue;

    // Preserve primitive values (string, number, boolean, null)
    if (
      sectionValue === null ||
      typeof sectionValue === "string" ||
      typeof sectionValue === "number" ||
      typeof sectionValue === "boolean"
    ) {
      (config as Record<string, unknown>)[sectionName] = sectionValue;
      continue;
    }

    // Preserve arrays
    if (Array.isArray(sectionValue)) {
      (config as Record<string, unknown>)[sectionName] = sectionValue;
      continue;
    }

    // Preserve object sections
    if (sectionValue && typeof sectionValue === "object") {
      const sectionRaw = sectionValue as Record<string, unknown>;
      const sectionConfig: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(sectionRaw)) {
        if (key !== "$schema") {
          sectionConfig[key] = value;
        }
      }

      if (Object.keys(sectionConfig).length > 0) {
        (config as Record<string, unknown>)[sectionName] = sectionConfig;
      }
    }
  }

  return config;
}

export function extractEditableAgentFields(
  raw: unknown,
  agentName: string,
  errors: ConfigFieldError[],
): Partial<AgentConfig> {
  if (!raw || typeof raw !== "object") {
    return {};
  }

  const rawObj = raw as Record<string, unknown>;
  const editable: Partial<AgentConfig> = {};

  for (const [key, value] of Object.entries(rawObj)) {
    if (key === "$schema") continue;

    if (!isManagedAgentField(key)) continue;

    const error = validateAgentField(agentName, key, value);
    if (error) {
      errors.push(error);
    } else {
      if (key === "ultrawork" && value === null) {
        (editable as Record<string, unknown>)[key] = null;
      } else if (key === "ultrawork" && value && typeof value === "object") {
        const ultraworkConfig = normalizeUltraworkConfig(value, agentName, errors);
        if (ultraworkConfig && Object.keys(ultraworkConfig).length > 0) {
          (editable as Record<string, unknown>)[key] = ultraworkConfig;
        }
      } else {
        (editable as Record<string, unknown>)[key] = value;
      }
    }
  }

  return editable;
}

export function extractEditableCategoryFields(
  raw: unknown,
  categoryName: string,
  errors: ConfigFieldError[],
): Partial<CategoryConfig> {
  if (!raw || typeof raw !== "object") {
    return {};
  }

  const rawObj = raw as Record<string, unknown>;
  const editable: Partial<CategoryConfig> = {};

  for (const [key, value] of Object.entries(rawObj)) {
    if (key === "$schema") continue;

    if (!isManagedCategoryField(key)) continue;

    const error = validateCategoryField(categoryName, key, value);
    if (error) {
      errors.push(error);
    } else {
      (editable as Record<string, unknown>)[key] = value;
    }
  }

  return editable;
}

export function extractEditableMiscFields(raw: unknown): Partial<MiscConfig> {
  if (!raw || typeof raw !== "object") {
    return {};
  }

  const rawObj = raw as Record<string, unknown>;
  const editable: Partial<MiscConfig> = {};

  for (const [sectionName, sectionValue] of Object.entries(rawObj)) {
    if (sectionName === "$schema") continue;

    const sectionManagedFields =
      MISC_MANAGED_FIELDS[sectionName as keyof typeof MISC_MANAGED_FIELDS];
    if (!sectionManagedFields) continue;

    if (sectionValue && typeof sectionValue === "object") {
      const sectionRaw = sectionValue as Record<string, unknown>;
      const sectionConfig: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(sectionRaw)) {
        if (key === "$schema") continue;
        if (!(key in sectionManagedFields)) continue;
        sectionConfig[key] = value;
      }

      if (Object.keys(sectionConfig).length > 0) {
        (editable as Record<string, unknown>)[sectionName] = sectionConfig;
      }
    }
  }

  return editable;
}

export function extractReadonlyTail(
  _opencodeRaw: RawConfig,
  ohMyRaw: RawConfig,
): Record<string, unknown> {
  const readonlyTail: Record<string, unknown> = {};

  for (const key of Object.keys(ohMyRaw)) {
    if (key === "agents" || key === "categories" || key === "misc") continue;

    readonlyTail[key] = ohMyRaw[key];
  }

  const ohMyAgents = ohMyRaw.agents || {};

  for (const agentName of Object.keys(ohMyAgents)) {
    const ohMyAgent = ohMyAgents[agentName] as Record<string, unknown> | undefined;

    if (!ohMyAgent) continue;

    const readonlyAgentFields: Record<string, unknown> = {};

    for (const field of Object.keys(ohMyAgent)) {
      if (field === "$schema") continue;
      readonlyAgentFields[field] = ohMyAgent[field];
    }

    if (Object.keys(readonlyAgentFields).length > 0) {
      if (!readonlyTail.agents) {
        readonlyTail.agents = {};
      }
      (readonlyTail.agents as Record<string, unknown>)[agentName] = readonlyAgentFields;
    }
  }

  const ohMyCategories = ohMyRaw.categories || {};

  for (const categoryName of Object.keys(ohMyCategories)) {
    const ohMyCategory = ohMyCategories[categoryName] as Record<string, unknown> | undefined;

    if (!ohMyCategory) continue;

    const readonlyCategoryFields: Record<string, unknown> = {};

    for (const field of Object.keys(ohMyCategory)) {
      if (field === "$schema") continue;
      readonlyCategoryFields[field] = ohMyCategory[field];
    }

    if (Object.keys(readonlyCategoryFields).length > 0) {
      if (!readonlyTail.categories) {
        readonlyTail.categories = {};
      }
      (readonlyTail.categories as Record<string, unknown>)[categoryName] = readonlyCategoryFields;
    }
  }

  const readonlyMisc: Record<string, unknown> = {};

  const ohMyMisc = ohMyRaw.misc || {};
  for (const section of Object.keys(ohMyMisc)) {
    if (section === "$schema") continue;
    readonlyMisc[section] = (ohMyMisc as Record<string, unknown>)[section];
  }

  for (const key of Object.keys(ohMyRaw)) {
    if (key === "agents" || key === "categories" || key === "misc" || key === "$schema") {
      continue;
    }
    readonlyMisc[key] = ohMyRaw[key];
  }

  if (Object.keys(readonlyMisc).length > 0) {
    readonlyTail.misc = readonlyMisc;
  }

  return readonlyTail;
}

export function mergeEffective(
  baseline: { agents: Record<string, AgentConfig>; categories: Record<string, CategoryConfig>; misc: MiscConfig },
  editable: { agents: Record<string, Partial<AgentConfig> | null>; categories: Record<string, Partial<CategoryConfig> | null>; misc: Partial<MiscConfig> },
): { agents: Record<string, AgentConfig>; categories: Record<string, CategoryConfig>; misc: MiscConfig } {
  const effective = {
    agents: { ...baseline.agents },
    categories: { ...baseline.categories },
    misc: { ...baseline.misc },
  };

  for (const [agentName, editableAgent] of Object.entries(editable.agents)) {
    if (editableAgent === null) {
      delete effective.agents[agentName];
      continue;
    }

    if (effective.agents[agentName]) {
      effective.agents[agentName] = {
        ...effective.agents[agentName],
        ...editableAgent,
      };
    } else {
      const fullConfig: AgentConfig = {
        ...editableAgent,
      };
      effective.agents[agentName] = fullConfig;
    }

    if (editableAgent.ultrawork === null) {
      delete effective.agents[agentName].ultrawork;
    }
  }

  for (const [categoryName, editableCategory] of Object.entries(
    editable.categories,
  )) {
    if (editableCategory === null) {
      delete effective.categories[categoryName];
      continue;
    }

    if (effective.categories[categoryName]) {
      effective.categories[categoryName] = {
        ...effective.categories[categoryName],
        ...editableCategory,
      };
    } else {
      const fullConfig: CategoryConfig = {
        ...editableCategory,
      };
      effective.categories[categoryName] = fullConfig;
    }
  }

  if (editable.misc.tmux !== undefined) {
    effective.misc.tmux = editable.misc.tmux;
  }
  if (editable.misc.git_master !== undefined) {
    effective.misc.git_master = editable.misc.git_master;
  }

  return effective;
}
