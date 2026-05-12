import type { AgentConfig, CategoryConfig, MiscConfig } from "../types";
import type { ModelGroup, ModelOption } from "../model-catalog";

export type { GlobalConfig } from "./global-config";
export type { ModelGroup, ModelOption };

export interface ConfigFieldError {
  path: string;
  message: string;
}

export interface BaselineConfig {
  agents: Record<string, AgentConfig>;
  categories: Record<string, CategoryConfig>;
  misc: MiscConfig;
}

export interface EditableConfig {
  agents: Record<string, Partial<AgentConfig>>;
  categories: Record<string, Partial<CategoryConfig>>;
  misc: Partial<MiscConfig>;
}

export interface ReadonlyTailConfig {
  [key: string]: unknown;
  agents?: Record<string, unknown>;
  categories?: Record<string, unknown>;
  misc?: Record<string, unknown>;
}

export interface EffectiveConfig {
  agents: Record<string, AgentConfig>;
  categories: Record<string, CategoryConfig>;
  misc: MiscConfig;
}

export interface ProfileConfigResult {
  baseline: BaselineConfig;
  editable: EditableConfig;
  readonlyTail: ReadonlyTailConfig;
  effective: EffectiveConfig;
  rawMisc: Record<string, unknown>;
  availableModels: string[];
  availableModelGroups: ModelGroup[];
  /** Providers disabled globally (passed in from caller) */
  disabledProviders: string[];
  /** All unique provider names extracted from merged models, in first-appearance order */
  providerCatalog: string[];
  mtime: number;
  errors: ConfigFieldError[];
}

export interface RawConfig {
  $schema?: string;
  agents?: Record<string, unknown>;
  categories?: Record<string, unknown>;
  misc?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Model source provenance entry for logging.
 * Tracks where each model was loaded from configuration.
 */
export interface ModelSourceEntry {
  /** Model ID in format: provider/model-id */
  model: string;
  /** Source type classification */
  sourceType: "global" | "profile-opencode" | "profile-oh-my-openagent";
  /** Human-readable source label for logs */
  sourceLabel: string;
  /** Absolute path to the config file */
  configPath: string;
  /** Profile ID (only for profile-level sources) */
  profileId?: string;
}

/**
 * Extended profile config result with model provenance.
 */
export interface ProfileConfigWithSources extends ProfileConfigResult {
  /** Structured model source entries for logging */
  modelSources: ModelSourceEntry[];
}
