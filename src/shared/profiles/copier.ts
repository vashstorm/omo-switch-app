import fs from "node:fs/promises";
import path from "node:path";

import type { ResolvedProfile } from "./types";
import { loggers } from "../logger";

const TARGET_ID_PATTERN = /^[a-z0-9][a-z0-9\-_]*$/;

export interface CopyProfileResult {
  success: true;
  profile: ResolvedProfile;
}

export interface CopyProfileError {
  success: false;
  code: "INVALID_TARGET_ID" | "SOURCE_NOT_FOUND" | "TARGET_EXISTS" | "COPY_ERROR";
  message: string;
}

export type CopyProfileOutcome = CopyProfileResult | CopyProfileError;

export async function copyProfile(
  profilesRoot: string,
  sourceId: string,
  targetId: string,
): Promise<CopyProfileOutcome> {
  loggers.sharedProfilesCopier.debug(
    { operation: "profiles.copy_start", sourceId, targetId },
    "Starting profile copy"
  );

  if (!TARGET_ID_PATTERN.test(targetId)) {
    loggers.sharedProfilesCopier.warn(
      { operation: "profiles.copy_invalid_target", sourceId, targetId },
      "Invalid target ID"
    );
    return {
      success: false,
      code: "INVALID_TARGET_ID",
      message: `Invalid target id '${targetId}'. Must match ^[a-z0-9][a-z0-9-_]*$`,
    };
  }

  const sourceDir = path.join(profilesRoot, sourceId);
  const sourceOpencodePath = path.join(sourceDir, "opencode.jsonc");

  try {
    await fs.access(sourceOpencodePath);
  } catch {
    loggers.sharedProfilesCopier.warn(
      { operation: "profiles.copy_source_missing", sourceId, targetId },
      "Source profile not found"
    );
    return {
      success: false,
      code: "SOURCE_NOT_FOUND",
      message: `Source profile '${sourceId}' does not exist or is missing opencode.jsonc`,
    };
  }

  const targetDir = path.join(profilesRoot, targetId);

  try {
    await fs.access(targetDir);
    loggers.sharedProfilesCopier.warn(
      { operation: "profiles.copy_target_exists", sourceId, targetId },
      "Target profile already exists"
    );
    return {
      success: false,
      code: "TARGET_EXISTS",
      message: `Profile '${targetId}' already exists`,
    };
  } catch {
  }

  try {
    await fs.mkdir(targetDir, { recursive: true });
    await fs.copyFile(sourceOpencodePath, path.join(targetDir, "opencode.jsonc"));

    const sourceOhMyPath = path.join(sourceDir, "oh-my-openagent.jsonc");
    const targetOhMyPath = path.join(targetDir, "oh-my-openagent.jsonc");

    try {
      await fs.access(sourceOhMyPath);
      await fs.copyFile(sourceOhMyPath, targetOhMyPath);
    } catch {
      await fs.writeFile(targetOhMyPath, "{}\n", "utf-8");
    }

    const profile: ResolvedProfile = {
      id: targetId,
      label: targetId,
      opencodePath: path.join(targetDir, "opencode.jsonc"),
      ohMyOpencodePath: targetOhMyPath,
    };

    loggers.sharedProfilesCopier.info(
      { operation: "profiles.copy_success", sourceId, targetId },
      "Profile copied successfully"
    );

    return { success: true, profile };
  } catch (error) {
    loggers.sharedProfilesCopier.error(
      { operation: "profiles.copy_failed", sourceId, targetId, error: error instanceof Error ? error.message : String(error) },
      "Profile copy failed"
    );
    return {
      success: false,
      code: "COPY_ERROR",
      message: error instanceof Error ? error.message : "Unknown error during copy",
    };
  }
}
