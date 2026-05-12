import fs from "node:fs/promises";
import { applyEdits, modify, parse } from "jsonc-parser";
import {
  AGENT_MANAGED_FIELDS,
  CATEGORY_MANAGED_FIELDS,
  shouldOmitField,
  type ManagedFieldDefinition,
} from "../managed-fields";
import type { EditableConfig } from "../config/types";
import type { ResolvedProfile } from "../profiles/types";
import { loggers } from "../logger";

export interface WriteResult {
  success: true;
  mtime: number;
}

export interface WriteConflictError {
  success: false;
  conflict: true;
  message: string;
}

export interface WriteValidationError {
  success: false;
  conflict: false;
  message: string;
}

export type WriteProfileResult =
  | WriteResult
  | WriteConflictError
  | WriteValidationError;

const MODIFY_OPTIONS = {
  formattingOptions: {
    tabSize: 2,
    insertSpaces: true,
  },
};

type ManagedObject = Record<string, ManagedFieldDefinition>;

function applyModify(content: string, path: (string | number)[], value: unknown): string {
  const edits = modify(content, path, value, MODIFY_OPTIONS);
  return applyEdits(content, edits);
}

function applyManagedFields(
  content: string,
  rootPath: (string | number)[],
  source: Record<string, unknown>,
  current: Record<string, unknown>,
  managedFields: ManagedObject,
): string {
  let nextContent = content;

  for (const [field, definition] of Object.entries(managedFields)) {
    if (!Object.hasOwn(source, field)) {
      if (Object.hasOwn(current, field)) {
        const path = [...rootPath, field];
        nextContent = applyModify(nextContent, path, undefined);
      }
      continue;
    }

    const fieldValue = source[field];
    const path = [...rootPath, field];

    if (shouldOmitField(fieldValue, definition)) {
      nextContent = applyModify(nextContent, path, undefined);
      continue;
    }

    nextContent = applyModify(nextContent, path, fieldValue);
  }

  return nextContent;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") {
    return {};
  }

  return value as Record<string, unknown>;
}

function getRecordAtPath(
  root: Record<string, unknown>,
  path: (string | number)[],
): Record<string, unknown> {
  let current: unknown = root;

  for (const segment of path) {
    if (!current || typeof current !== "object") {
      return {};
    }

    current = (current as Record<string, unknown>)[String(segment)];
  }

  return asRecord(current);
}

function getMiscWritePath(
  existingData: Record<string, unknown>,
  sectionName: string,
): (string | number)[] {
  const topLevelSection = existingData[sectionName];
  if (
    topLevelSection &&
    typeof topLevelSection === "object" &&
    !Array.isArray(topLevelSection)
  ) {
    return [sectionName];
  }

  return ["misc", sectionName];
}

export async function writeProfileConfig(
  resolvedProfile: ResolvedProfile,
  payload: EditableConfig,
  expectedMtime: number,
): Promise<WriteProfileResult> {
  loggers.sharedConfigWriter.debug(
    { operation: "config.write_attempt", filePath: resolvedProfile.ohMyOpencodePath, profileId: resolvedProfile.id, expectedMtime },
    "Attempting to write profile config"
  );

  let existingContent = "{}";
  let fileExists = false;

  try {
    existingContent = await fs.readFile(resolvedProfile.ohMyOpencodePath, "utf-8");
    fileExists = true;
  } catch (error) {
    const typedError = error as NodeJS.ErrnoException;
    if (typedError.code !== "ENOENT") {
      loggers.sharedConfigWriter.error(
        { operation: "config.write_failed", filePath: resolvedProfile.ohMyOpencodePath, profileId: resolvedProfile.id, error: typedError.message },
        "Failed to read config file"
      );
      return {
        success: false,
        conflict: false,
        message: `Failed to read config file: ${typedError.message}`,
      };
    }
  }

  if (fileExists) {
    try {
      const fileStat = await fs.stat(resolvedProfile.ohMyOpencodePath);
      if (
        expectedMtime !== 0 &&
        Math.floor(fileStat.mtimeMs) !== Math.floor(expectedMtime)
      ) {
        loggers.sharedConfigWriter.warn(
          { operation: "config.write_conflict", filePath: resolvedProfile.ohMyOpencodePath, profileId: resolvedProfile.id, expectedMtime, actualMtime: fileStat.mtimeMs },
          "File modified externally"
        );
        return {
          success: false,
          conflict: true,
          message: "File modified externally. Please reload.",
        };
      }
    } catch (error) {
      const typedError = error as NodeJS.ErrnoException;
      if (typedError.code !== "ENOENT") {
        loggers.sharedConfigWriter.error(
          { operation: "config.write_failed", filePath: resolvedProfile.ohMyOpencodePath, profileId: resolvedProfile.id, error: typedError.message },
          "Failed to check file timestamp"
        );
        return {
          success: false,
          conflict: false,
          message: `Failed to check file timestamp: ${typedError.message}`,
        };
      }
    }
  }

  const existingData = asRecord(parse(existingContent));
  let nextContent = existingContent;

  const agentPayload = asRecord(payload.agents);
  for (const [agentId, value] of Object.entries(agentPayload)) {
    if (value === null) {
      nextContent = applyModify(nextContent, ["agents", agentId], undefined);
      continue;
    }

    nextContent = applyManagedFields(
      nextContent,
      ["agents", agentId],
      asRecord(value),
      getRecordAtPath(existingData, ["agents", agentId]),
      AGENT_MANAGED_FIELDS,
    );
  }

  const categoryPayload = asRecord(payload.categories);
  for (const [categoryId, value] of Object.entries(categoryPayload)) {
    if (value === null) {
      nextContent = applyModify(nextContent, ["categories", categoryId], undefined);
      continue;
    }

    nextContent = applyManagedFields(
      nextContent,
      ["categories", categoryId],
      asRecord(value),
      getRecordAtPath(existingData, ["categories", categoryId]),
      CATEGORY_MANAGED_FIELDS,
    );
  }

  const miscPayload = asRecord(payload.misc);
  for (const [miscSection, sectionValue] of Object.entries(miscPayload)) {
    const sectionPath = getMiscWritePath(existingData, miscSection);

    if (sectionValue === null) {
      nextContent = applyModify(nextContent, sectionPath, undefined);
      continue;
    }

    const sectionData = asRecord(sectionValue);

    let nextSectionContent = nextContent;
    for (const [field, fieldValue] of Object.entries(sectionData)) {
      const path = [...sectionPath, field];
      nextSectionContent = applyModify(nextSectionContent, path, fieldValue);
    }
    nextContent = nextSectionContent;
  }

  try {
    await fs.writeFile(resolvedProfile.ohMyOpencodePath, nextContent, "utf-8");
    const newFileStat = await fs.stat(resolvedProfile.ohMyOpencodePath);

    loggers.sharedConfigWriter.info(
      { operation: "config.write_success", filePath: resolvedProfile.ohMyOpencodePath, profileId: resolvedProfile.id, mtime: newFileStat.mtimeMs },
      "Profile config saved successfully"
    );

    return {
      success: true,
      mtime: newFileStat.mtimeMs,
    };
  } catch (error) {
    const typedError = error as NodeJS.ErrnoException;
    loggers.sharedConfigWriter.error(
      { operation: "config.write_failed", filePath: resolvedProfile.ohMyOpencodePath, profileId: resolvedProfile.id, error: typedError.message },
      "Failed to write config file"
    );
    return {
      success: false,
      conflict: false,
      message: `Failed to write config file: ${typedError.message}`,
    };
  }
}
