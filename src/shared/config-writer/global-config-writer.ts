import fs from "node:fs/promises";
import path from "node:path";
import { applyEdits, modify, parse } from "jsonc-parser";

import { resolveGlobalConfigPath, validateModelName, validateProviderName } from "../config/global-config";

const MODIFY_OPTIONS = {
  formattingOptions: {
    tabSize: 2,
    insertSpaces: true,
  },
};

export async function writeGlobalConfigValue(
  configPath: string | undefined,
  pathSegments: string[],
  value: unknown,
): Promise<void> {
  const resolvedPath = resolveGlobalConfigPath(configPath);

  let existingContent = "{}";
  try {
    existingContent = await fs.readFile(resolvedPath, "utf-8");
  } catch (error) {
    const typedError = error as NodeJS.ErrnoException;
    if (typedError.code !== "ENOENT") {
      throw new Error(`Failed to read config file: ${typedError.message}`);
    }

    const dir = path.dirname(resolvedPath);
    await fs.mkdir(dir, { recursive: true });
  }

  const edits = modify(existingContent, pathSegments, value, MODIFY_OPTIONS);
  const newContent = applyEdits(existingContent, edits);

  try {
    await fs.writeFile(resolvedPath, newContent, "utf-8");
  } catch (error) {
    const typedError = error as NodeJS.ErrnoException;
    throw new Error(`Failed to write config file: ${typedError.message}`);
  }
}

export async function writeSyncReplaceEnabled(
  configPath: string | undefined,
  value: boolean,
): Promise<void> {
  return writeGlobalConfigValue(configPath, ["ui_preferences", "sync_replace_enabled"], value);
}

export async function writeAppZoomPercent(
  configPath: string | undefined,
  value: number,
): Promise<void> {
  return writeGlobalConfigValue(configPath, ["ui_preferences", "zoom_percent"], value);
}

export async function writeDefaultProfile(
  configPath: string | undefined,
  profileId: string | null,
): Promise<void> {
  return writeGlobalConfigValue(configPath, ["default_profile"], profileId);
}

export async function writeDisabledProviders(
  configPath: string | undefined,
  profileId: string,
  disabledProviders: string[],
): Promise<void> {
  return writeGlobalConfigValue(configPath, ["disabled_providers", profileId], disabledProviders);
}

export async function writeProvider(
  configPath: string | undefined,
  providerName: string,
  models: string[],
): Promise<void> {
  validateProviderName(providerName);
  return writeGlobalConfigValue(configPath, ["providers", providerName], models);
}

export async function deleteProvider(
  configPath: string | undefined,
  providerName: string,
): Promise<void> {
  validateProviderName(providerName);
  return writeGlobalConfigValue(configPath, ["providers", providerName], undefined);
}

export async function writeModel(
  configPath: string | undefined,
  providerName: string,
  modelName: string,
  opts?: { overwrite?: boolean },
): Promise<void> {
  validateProviderName(providerName);
  validateModelName(modelName);

  const overwrite = opts?.overwrite ?? true;

  const resolvedPath = resolveGlobalConfigPath(configPath);
  let existingContent = "{}";
  try {
    existingContent = await fs.readFile(resolvedPath, "utf-8");
  } catch (error) {
    const typedError = error as NodeJS.ErrnoException;
    if (typedError.code !== "ENOENT") {
      throw new Error(`Failed to read config file: ${typedError.message}`);
    }
  }

  const existing = parse(existingContent) as Record<string, unknown>;
  const providers = existing?.providers as Record<string, unknown> | undefined;
  const provider = providers?.[providerName] as unknown[] | Record<string, unknown> | undefined;
  const isObjectProvider = provider !== undefined && provider !== null && !Array.isArray(provider) && typeof provider === "object";

  if (!overwrite) {
    const exists = Array.isArray(provider)
      ? provider.includes(modelName)
      : isObjectProvider && Object.prototype.hasOwnProperty.call(provider, modelName);
    if (exists) {
      throw new Error(`Model "${modelName}" already exists under provider "${providerName}"`);
    }
  }

  if (isObjectProvider) {
    return writeGlobalConfigValue(
      configPath,
      ["providers", providerName, modelName],
      {},
    );
  }

  const newModels = Array.isArray(provider) ? [...provider] : [];
  if (!newModels.includes(modelName)) {
    newModels.push(modelName);
  }

  return writeGlobalConfigValue(configPath, ["providers", providerName], newModels);
}

export async function deleteModel(
  configPath: string | undefined,
  providerName: string,
  modelName: string,
): Promise<void> {
  validateProviderName(providerName);
  validateModelName(modelName);

  const resolvedPath = resolveGlobalConfigPath(configPath);
  let existingContent = "{}";
  try {
    existingContent = await fs.readFile(resolvedPath, "utf-8");
  } catch (error) {
    const typedError = error as NodeJS.ErrnoException;
    if (typedError.code !== "ENOENT") {
      throw new Error(`Failed to read config file: ${typedError.message}`);
    }
  }

  const existing = parse(existingContent) as Record<string, unknown>;
  const providers = existing?.providers as Record<string, unknown> | undefined;
  const provider = providers?.[providerName] as unknown[] | undefined;

  if (!Array.isArray(provider)) {
    return;
  }

  const newModels = provider.filter((item) => item !== modelName);
  return writeGlobalConfigValue(configPath, ["providers", providerName], newModels);
}

export async function updateModelConfig(
  configPath: string | undefined,
  providerName: string,
  modelName: string,
  _updates: Record<string, unknown>,
): Promise<void> {
  validateProviderName(providerName);
  validateModelName(modelName);

  const resolvedPath = resolveGlobalConfigPath(configPath);
  let existingContent = "{}";
  try {
    existingContent = await fs.readFile(resolvedPath, "utf-8");
  } catch (error) {
    const typedError = error as NodeJS.ErrnoException;
    if (typedError.code !== "ENOENT") {
      throw new Error(`Failed to read config file: ${typedError.message}`);
    }
    const dir = path.dirname(resolvedPath);
    await fs.mkdir(dir, { recursive: true });
  }

  const existing = parse(existingContent) as Record<string, unknown>;
  const providers = (existing?.providers ?? {}) as Record<string, unknown>;
  const provider = providers[providerName] as unknown[] | Record<string, unknown> | undefined;

  if (Array.isArray(provider)) {
    throw new Error(
      `Cannot update model config for array-format provider "${providerName}"`,
    );
  }

  const modelConfig = (provider?.[modelName] ?? {}) as Record<string, unknown>;
  const merged = { ...modelConfig, ..._updates };

  return writeGlobalConfigValue(
    configPath,
    ["providers", providerName, modelName],
    merged,
  );
}
