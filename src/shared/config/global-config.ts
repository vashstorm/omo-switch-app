import { parse, type ParseError } from "jsonc-parser";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import type { ModelSourceEntry } from "./types";
import { normalizeAppZoomPercent } from "./app-zoom";
export {
  APP_ZOOM_STEP_PERCENT,
  DEFAULT_APP_ZOOM_PERCENT,
  MAX_APP_ZOOM_PERCENT,
  MIN_APP_ZOOM_PERCENT,
  normalizeAppZoomPercent,
} from "./app-zoom";
export {
  PROVIDER_NAME_REGEX,
  validateProviderName,
  validateModelName,
  validateMaxTokens,
} from "./validators";

export interface GlobalConfig {
  config_path?: string[];
  log_path?: string;
  providers?: Record<string, Record<string, { type?: string; maxTokens?: number; name?: string }>>;
  ui_preferences?: {
    sync_replace_enabled?: boolean;
    zoom_percent?: number;
  };
  default_profile?: string;
  disabled_providers?: Record<string, string[]>;
}

export function getSyncReplaceEnabled(config: GlobalConfig): boolean {
  return config.ui_preferences?.sync_replace_enabled ?? false;
}

export function getAppZoomPercent(config: GlobalConfig): number {
  return normalizeAppZoomPercent(config.ui_preferences?.zoom_percent);
}

export function getDefaultProfile(config: GlobalConfig): string | null {
  return config.default_profile ?? null;
}

export function getDisabledProviders(config: GlobalConfig, profileId: string): string[] {
  return config.disabled_providers?.[profileId] ?? [];
}

function getHomeDir(): string {
  return process.env.HOME || process.env.USERPROFILE || os.homedir();
}

export function resolveGlobalConfigPath(configPath?: string): string {
  if (configPath) {
    return expandHomePath(configPath);
  }

  return path.join(
    getHomeDir(),
    "Library",
    "Application Support",
    "com.omo-switch.app",
    "config.jsonc",
  );
}

export function expandHomePath(inputPath: string): string {
  if (inputPath === "~") {
    return getHomeDir();
  }

  if (inputPath.startsWith("~/") || inputPath.startsWith("~\\")) {
    return path.join(getHomeDir(), inputPath.slice(2));
  }

  return inputPath;
}

export function validateExplicitGlobalConfig(configPath: string): void {
  const resolvedPath = resolveGlobalConfigPath(configPath);

  if (!existsSync(resolvedPath)) {
    throw new Error(`Explicit config file is not readable: ${resolvedPath}`);
  }

  let text: string;
  try {
    text = readFileSync(resolvedPath, "utf-8");
  } catch {
    throw new Error(`Explicit config file is not readable: ${resolvedPath}`);
  }

  const parseErrors: ParseError[] = [];
  const data = parse(text, parseErrors) as GlobalConfig;

  if (parseErrors.length > 0) {
    throw new Error(`Explicit config file contains invalid JSONC: ${resolvedPath}`);
  }

  if (data === null || data === undefined || typeof data !== "object") {
    throw new Error(`Explicit config file must contain a JSON object: ${resolvedPath}`);
  }
}

function parseGlobalConfig(text: string): GlobalConfig {
  const parseErrors: ParseError[] = [];
  const data = parse(text, parseErrors) as GlobalConfig;

  if (parseErrors.length > 0) {
    return {};
  }

  if (data === null || data === undefined || typeof data !== "object") {
    return {};
  }

  return data;
}

export async function readGlobalConfig(configPath?: string): Promise<GlobalConfig> {
  const resolvedPath = resolveGlobalConfigPath(configPath);

  try {
    await fs.access(resolvedPath);
  } catch {
    return {};
  }

  let text: string;
  try {
    text = await fs.readFile(resolvedPath, "utf-8");
  } catch {
    return {};
  }

  return parseGlobalConfig(text);
}

export function readGlobalConfigSync(configPath?: string): GlobalConfig {
  const resolvedPath = resolveGlobalConfigPath(configPath);

  if (!existsSync(resolvedPath)) {
    return {};
  }

  try {
    const text = readFileSync(resolvedPath, "utf-8");
    return parseGlobalConfig(text);
  } catch {
    return {};
  }
}

export function extractGlobalModels(config: GlobalConfig): string[] {
  if (!config.providers || typeof config.providers !== "object") {
    return [];
  }

  const models: string[] = [];
  const seen = new Set<string>();

  for (const [providerName, providerModels] of Object.entries(config.providers)) {
    if (!providerModels || typeof providerModels !== "object") {
      continue;
    }
    for (const modelId of Object.keys(providerModels)) {
      const fullId = `${providerName}/${modelId}`;
      if (!seen.has(fullId)) {
        seen.add(fullId);
        models.push(fullId);
      }
    }
  }

  return models;
}

export function extractGlobalModelSources(
  config: GlobalConfig,
  configPath: string,
): ModelSourceEntry[] {
  if (!config.providers || typeof config.providers !== "object") {
    return [];
  }

  const sources: ModelSourceEntry[] = [];
  const seen = new Set<string>();
  const resolvedPath = path.resolve(configPath);

  for (const [providerName, providerModels] of Object.entries(config.providers)) {
    if (!providerModels || typeof providerModels !== "object") {
      continue;
    }
    for (const modelId of Object.keys(providerModels)) {
      const fullId = `${providerName}/${modelId}`;
      if (!seen.has(fullId)) {
        seen.add(fullId);
        sources.push({
          model: fullId,
          sourceType: "global",
          sourceLabel: "global config (config.jsonc)",
          configPath: resolvedPath,
        });
      }
    }
  }

  return sources;
}
