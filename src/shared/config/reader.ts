import { parse, type ParseError } from "jsonc-parser";
import fs from "node:fs/promises";
import path from "node:path";
import type { ResolvedProfile } from "../profiles/types";
import type {
  ProfileConfigResult,
  ProfileConfigWithSources,
  RawConfig,
  ConfigFieldError,
  BaselineConfig,
  EditableConfig,
  ModelSourceEntry,
} from "./types";
import {
  normalizeAgentConfig,
  normalizeCategoryConfig,
  normalizeMiscConfig,
  extractEditableAgentFields,
  extractEditableCategoryFields,
  extractEditableMiscFields,
  extractReadonlyTail,
  mergeEffective,
} from "./normalizer";
import { loggers } from "../logger";
import {
  groupModelsByProvider,
  buildProviderCatalog,
  buildProviderCatalogFromSources,
  filterModelsByDisabledProviders,
} from "../model-catalog";

async function readJsoncFile(filePath: string): Promise<{
  data: RawConfig;
  parseErrors: ParseError[];
}> {
  let exists = false;
  try {
    await fs.access(filePath);
    exists = true;
  } catch {
    exists = false;
  }

  if (!exists) {
    loggers.sharedConfigReader.debug(
      { operation: "config.read_optional_missing", filePath },
      "Optional file not found"
    );
    return { data: {}, parseErrors: [] };
  }

  try {
    const text = await fs.readFile(filePath, "utf-8");
    const parseErrors: ParseError[] = [];
    const data = parse(text, parseErrors) as RawConfig;

    if (parseErrors.length > 0) {
      loggers.sharedConfigReader.error(
        { operation: "config.read_parse_error", filePath, parseErrorCount: parseErrors.length },
        "JSONC parse error"
      );
    }

    if (data === null || data === undefined) {
      return { data: {}, parseErrors };
    }

    return { data, parseErrors };
  } catch (error) {
    loggers.sharedConfigReader.error(
      { operation: "config.read_failed", filePath, error: error instanceof Error ? error.message : String(error) },
      "Failed to read file"
    );
    throw error;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function getMiscSource(rawConfig: RawConfig): Record<string, unknown> {
  const nestedMisc = asRecord(rawConfig.misc);
  const miscSource: Record<string, unknown> = nestedMisc ? { ...nestedMisc } : {};

  for (const key of Object.keys(rawConfig)) {
    if (key === "agents" || key === "categories" || key === "misc" || key === "$schema") {
      continue;
    }
    miscSource[key] = rawConfig[key];
  }

  return miscSource;
}

function buildBaseline(
  opencodeData: RawConfig,
  errors: ConfigFieldError[],
): BaselineConfig {
  const baseline: BaselineConfig = {
    agents: {},
    categories: {},
    misc: {},
  };

  if (opencodeData.agents && typeof opencodeData.agents === "object") {
    for (const [agentName, rawAgent] of Object.entries(opencodeData.agents)) {
      if (agentName === "$schema") continue;
      const normalized = normalizeAgentConfig(rawAgent, agentName, errors);
      if (normalized) {
        baseline.agents[agentName] = normalized;
      }
    }
  }

  if (opencodeData.categories && typeof opencodeData.categories === "object") {
    for (const [categoryName, rawCategory] of Object.entries(
      opencodeData.categories,
    )) {
      if (categoryName === "$schema") continue;
      const normalized = normalizeCategoryConfig(
        rawCategory,
        categoryName,
        errors,
      );
      if (normalized) {
        baseline.categories[categoryName] = normalized;
      }
    }
  }

  const miscSource = getMiscSource(opencodeData);
  if (Object.keys(miscSource).length > 0) {
    baseline.misc = normalizeMiscConfig(miscSource);
  }

  return baseline;
}

function buildEditable(
  ohMyData: RawConfig,
  errors: ConfigFieldError[],
): EditableConfig {
  const editable: EditableConfig = {
    agents: {},
    categories: {},
    misc: {},
  };

  if (ohMyData.agents && typeof ohMyData.agents === "object") {
    for (const [agentName, rawAgent] of Object.entries(ohMyData.agents)) {
      if (agentName === "$schema") continue;
      if (rawAgent === null) {
        editable.agents[agentName] = null;
        continue;
      }
      const extracted = extractEditableAgentFields(rawAgent, agentName, errors);
      if (Object.keys(extracted).length > 0) {
        editable.agents[agentName] = extracted;
      }
    }
  }

  if (ohMyData.categories && typeof ohMyData.categories === "object") {
    for (const [categoryName, rawCategory] of Object.entries(
      ohMyData.categories,
    )) {
      if (categoryName === "$schema") continue;
      if (rawCategory === null) {
        editable.categories[categoryName] = null;
        continue;
      }
      const extracted = extractEditableCategoryFields(
        rawCategory,
        categoryName,
        errors,
      );
      if (Object.keys(extracted).length > 0) {
        editable.categories[categoryName] = extracted;
      }
    }
  }

  const miscSource = getMiscSource(ohMyData);
  if (Object.keys(miscSource).length > 0) {
    editable.misc = extractEditableMiscFields(miscSource);
  }

  return editable;
}

export function extractProviderModels(rawConfig: RawConfig): string[] {
  if (!rawConfig.provider || typeof rawConfig.provider !== "object") {
    return [];
  }

  const models: string[] = [];

  for (const [providerName, providerConfig] of Object.entries(rawConfig.provider)) {
    if (!providerConfig || typeof providerConfig !== "object") {
      continue;
    }

    const typedProviderConfig = providerConfig as Record<string, unknown>;
    if (!typedProviderConfig.models || typeof typedProviderConfig.models !== "object") {
      continue;
    }

    const modelsObj = typedProviderConfig.models as Record<string, unknown>;
    for (const modelId of Object.keys(modelsObj)) {
      models.push(`${providerName}/${modelId}`);
    }
  }

  return models;
}

export function mergeAvailableModels(
  baselineModels: string[],
  writableModels: string[],
): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const model of baselineModels) {
    if (!seen.has(model)) {
      seen.add(model);
      merged.push(model);
    }
  }

  for (const model of writableModels) {
    if (!seen.has(model)) {
      seen.add(model);
      merged.push(model);
    }
  }

  return merged;
}

export function extractOpencodeModelSources(
  rawConfig: RawConfig,
  configPath: string,
  profileId: string,
): ModelSourceEntry[] {
  if (!rawConfig.provider || typeof rawConfig.provider !== "object") {
    return [];
  }

  const sources: ModelSourceEntry[] = [];
  const seen = new Set<string>();
  const resolvedPath = path.resolve(configPath);

  for (const [providerName, providerConfig] of Object.entries(rawConfig.provider)) {
    if (!providerConfig || typeof providerConfig !== "object") {
      continue;
    }

    const typedProviderConfig = providerConfig as Record<string, unknown>;
    if (!typedProviderConfig.models || typeof typedProviderConfig.models !== "object") {
      continue;
    }

    const modelsObj = typedProviderConfig.models as Record<string, unknown>;
    for (const modelId of Object.keys(modelsObj)) {
      const fullId = `${providerName}/${modelId}`;
      if (!seen.has(fullId)) {
        seen.add(fullId);
        sources.push({
          model: fullId,
          sourceType: "profile-opencode",
          sourceLabel: "profile config (opencode.jsonc)",
          configPath: resolvedPath,
          profileId,
        });
      }
    }
  }

  return sources;
}

export function extractOhMyModelSources(
  rawConfig: RawConfig,
  configPath: string,
  profileId: string,
): ModelSourceEntry[] {
  const sources: ModelSourceEntry[] = [];
  const seen = new Set<string>();
  const resolvedPath = path.resolve(configPath);

  // Extract from agents.*.model
  if (rawConfig.agents && typeof rawConfig.agents === "object") {
    for (const [agentName, agentConfig] of Object.entries(rawConfig.agents)) {
      if (agentName === "$schema") continue;
      if (!agentConfig || typeof agentConfig !== "object") continue;

      const agent = agentConfig as Record<string, unknown>;

      // agents.*.model
      if (agent.model && typeof agent.model === "string") {
        if (!seen.has(agent.model)) {
          seen.add(agent.model);
          sources.push({
            model: agent.model,
            sourceType: "profile-oh-my-openagent",
            sourceLabel: "profile config (oh-my-openagent.jsonc)",
            configPath: resolvedPath,
            profileId,
          });
        }
      }

      // agents.*.ultrawork.model
      if (agent.ultrawork && typeof agent.ultrawork === "object") {
        const ultrawork = agent.ultrawork as Record<string, unknown>;
        if (ultrawork.model && typeof ultrawork.model === "string") {
          if (!seen.has(ultrawork.model)) {
            seen.add(ultrawork.model);
            sources.push({
              model: ultrawork.model,
              sourceType: "profile-oh-my-openagent",
              sourceLabel: "profile config (oh-my-openagent.jsonc)",
              configPath: resolvedPath,
              profileId,
            });
          }
        }
      }

      // agents.*.fallback_models[]
      if (agent.fallback_models && Array.isArray(agent.fallback_models)) {
        for (const fallbackModel of agent.fallback_models) {
          if (typeof fallbackModel === "string" && !seen.has(fallbackModel)) {
            seen.add(fallbackModel);
            sources.push({
              model: fallbackModel,
              sourceType: "profile-oh-my-openagent",
              sourceLabel: "profile config (oh-my-openagent.jsonc)",
              configPath: resolvedPath,
              profileId,
            });
          }
        }
      }
    }
  }

  // Extract from categories.*.model
  if (rawConfig.categories && typeof rawConfig.categories === "object") {
    for (const [categoryName, categoryConfig] of Object.entries(rawConfig.categories)) {
      if (categoryName === "$schema") continue;
      if (!categoryConfig || typeof categoryConfig !== "object") continue;

      const category = categoryConfig as Record<string, unknown>;

      // categories.*.model
      if (category.model && typeof category.model === "string") {
        if (!seen.has(category.model)) {
          seen.add(category.model);
          sources.push({
            model: category.model,
            sourceType: "profile-oh-my-openagent",
            sourceLabel: "profile config (oh-my-openagent.jsonc)",
            configPath: resolvedPath,
            profileId,
          });
        }
      }

      // categories.*.fallback_models[]
      if (category.fallback_models && Array.isArray(category.fallback_models)) {
        for (const fallbackModel of category.fallback_models) {
          if (typeof fallbackModel === "string" && !seen.has(fallbackModel)) {
            seen.add(fallbackModel);
            sources.push({
              model: fallbackModel,
              sourceType: "profile-oh-my-openagent",
              sourceLabel: "profile config (oh-my-openagent.jsonc)",
              configPath: resolvedPath,
              profileId,
            });
          }
        }
      }
    }
  }

  // Also extract from provider.*.models if present in oh-my-openagent.jsonc
  if (rawConfig.provider && typeof rawConfig.provider === "object") {
    for (const [providerName, providerConfig] of Object.entries(rawConfig.provider)) {
      if (!providerConfig || typeof providerConfig !== "object") continue;

      const typedProviderConfig = providerConfig as Record<string, unknown>;
      if (!typedProviderConfig.models || typeof typedProviderConfig.models !== "object") continue;

      const modelsObj = typedProviderConfig.models as Record<string, unknown>;
      for (const modelId of Object.keys(modelsObj)) {
        const fullId = `${providerName}/${modelId}`;
        if (!seen.has(fullId)) {
          seen.add(fullId);
          sources.push({
            model: fullId,
            sourceType: "profile-oh-my-openagent",
            sourceLabel: "profile config (oh-my-openagent.jsonc)",
            configPath: resolvedPath,
            profileId,
          });
        }
      }
    }
  }

  return sources;
}

export function mergeModelSources(
  globalSources: ModelSourceEntry[],
  opencodeSources: ModelSourceEntry[],
  ohMySources: ModelSourceEntry[],
): ModelSourceEntry[] {
  const merged: ModelSourceEntry[] = [];

  for (const source of globalSources) {
    merged.push(source);
  }

  for (const source of opencodeSources) {
    merged.push(source);
  }

  for (const source of ohMySources) {
    merged.push(source);
  }

  return merged;
}

export function sourcesToAvailableModels(sources: ModelSourceEntry[]): string[] {
  const seen = new Set<string>();
  const models: string[] = [];

  for (const source of sources) {
    if (!seen.has(source.model)) {
      seen.add(source.model);
      models.push(source.model);
    }
  }

  return models.sort((a, b) => a.localeCompare(b));
}

export async function readProfileConfig(
  resolvedProfile: ResolvedProfile,
  globalModels?: string[],
  disabledProviders: string[] = [],
): Promise<ProfileConfigResult> {
  const errors: ConfigFieldError[] = [];
  let mtime = 0;

  try {
    const stat = await fs.stat(resolvedProfile.ohMyOpencodePath);
    mtime = stat.mtimeMs;
  } catch {
    mtime = 0;
  }

  const [opencodeResult, ohMyResult] = await Promise.all([
    readJsoncFile(resolvedProfile.opencodePath),
    readJsoncFile(resolvedProfile.ohMyOpencodePath),
  ]);

  if (opencodeResult.parseErrors.length > 0) {
    errors.push({
      path: "opencode.jsonc",
      message: "JSONC syntax error in opencode.jsonc",
    });
  }

  if (ohMyResult.parseErrors.length > 0) {
    errors.push({
      path: "oh-my-openagent.jsonc",
      message: "JSONC syntax error in oh-my-openagent.jsonc",
    });
  }

  const opencodeData = opencodeResult.data || {};
  const ohMyData = ohMyResult.data || {};

  const baseline = buildBaseline(opencodeData, errors);
  const editable = buildEditable(ohMyData, errors);
  const readonlyTail = extractReadonlyTail(opencodeData, ohMyData);
  const effective = mergeEffective(baseline, editable);
  const profileModels = mergeAvailableModels(
    extractProviderModels(opencodeData),
    extractProviderModels(ohMyData),
  );
  const mergedModels =
    globalModels && globalModels.length > 0
      ? mergeAvailableModels(globalModels, profileModels)
      : profileModels;

  const providerCatalog = buildProviderCatalog(mergedModels);
  const filteredModels = filterModelsByDisabledProviders(mergedModels, disabledProviders);
  const availableModels = filteredModels.sort((a, b) => a.localeCompare(b));
  const availableModelGroups = groupModelsByProvider(availableModels);

  const rawMisc = getMiscSource(ohMyData);

  if (errors.length > 0) {
    loggers.sharedConfigReader.warn(
      { operation: "config.read_validation_warnings", profileId: resolvedProfile.id, errorCount: errors.length },
      "Config validation warnings"
    );
  }

  return {
    baseline,
    editable,
    readonlyTail,
    effective,
    rawMisc,
    availableModels,
    availableModelGroups,
    disabledProviders,
    providerCatalog,
    mtime,
    errors,
  };
}

export async function readProfileConfigWithSources(
  resolvedProfile: ResolvedProfile,
  globalSources?: ModelSourceEntry[],
  disabledProviders: string[] = [],
): Promise<ProfileConfigWithSources> {
  const errors: ConfigFieldError[] = [];
  let mtime = 0;

  try {
    const stat = await fs.stat(resolvedProfile.ohMyOpencodePath);
    mtime = stat.mtimeMs;
  } catch {
    mtime = 0;
  }

  const [opencodeResult, ohMyResult] = await Promise.all([
    readJsoncFile(resolvedProfile.opencodePath),
    readJsoncFile(resolvedProfile.ohMyOpencodePath),
  ]);

  if (opencodeResult.parseErrors.length > 0) {
    errors.push({
      path: "opencode.jsonc",
      message: "JSONC syntax error in opencode.jsonc",
    });
  }

  if (ohMyResult.parseErrors.length > 0) {
    errors.push({
      path: "oh-my-openagent.jsonc",
      message: "JSONC syntax error in oh-my-openagent.jsonc",
    });
  }

  const opencodeData = opencodeResult.data || {};
  const ohMyData = ohMyResult.data || {};

  const baseline = buildBaseline(opencodeData, errors);
  const editable = buildEditable(ohMyData, errors);
  const readonlyTail = extractReadonlyTail(opencodeData, ohMyData);
  const effective = mergeEffective(baseline, editable);

  // Extract model sources from all config files
  const opencodeSources = extractOpencodeModelSources(
    opencodeData,
    resolvedProfile.opencodePath,
    resolvedProfile.id,
  );
  const ohMySources = extractOhMyModelSources(
    ohMyData,
    resolvedProfile.ohMyOpencodePath,
    resolvedProfile.id,
  );

  // Merge all sources
  const mergedSources = mergeModelSources(
    globalSources || [],
    opencodeSources,
    ohMySources,
  );

  const providerCatalog = buildProviderCatalogFromSources(mergedSources);
  const unfilteredModels = sourcesToAvailableModels(mergedSources);
  const filteredModels = filterModelsByDisabledProviders(unfilteredModels, disabledProviders);
  const availableModelGroups = groupModelsByProvider(filteredModels);

  const rawMisc = getMiscSource(ohMyData);

  if (errors.length > 0) {
    loggers.sharedConfigReader.warn(
      { operation: "config.read_validation_warnings", profileId: resolvedProfile.id, errorCount: errors.length },
      "Config validation warnings"
    );
  }

  return {
    baseline,
    editable,
    readonlyTail,
    effective,
    rawMisc,
    availableModels: filteredModels,
    availableModelGroups,
    disabledProviders,
    providerCatalog,
    mtime,
    errors,
    modelSources: mergedSources,
  };
}
