import fs from "node:fs/promises";
import path from "node:path";

import type { ResolvedProfile } from "./types";
import { loggers } from "../logger";

function compareFolderName(a: string, b: string): number {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();

  if (aLower < bLower) {
    return -1;
  }
  if (aLower > bLower) {
    return 1;
  }

  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }

  return 0;
}

export async function scanProfiles(profilesRoot: string): Promise<ResolvedProfile[]> {
  loggers.sharedProfilesScanner.debug(
    { operation: "profiles.scan_start", profilesRoot },
    "Starting profile scan"
  );

  try {
    const entries = await fs.readdir(profilesRoot, { withFileTypes: true });
    const profiles: ResolvedProfile[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      if (entry.name.startsWith(".")) {
        continue;
      }

      const folderName = entry.name;
      const profileDir = path.join(profilesRoot, folderName);
      const profileDirStat = await fs.lstat(profileDir);
      if (profileDirStat.isSymbolicLink()) {
        continue;
      }

      const opencodePath = path.join(profileDir, "opencode.jsonc");
      let opencodeStat: Awaited<ReturnType<typeof fs.lstat>>;
      try {
        await fs.access(opencodePath);
        opencodeStat = await fs.lstat(opencodePath);
      } catch {
        continue;
      }

      if (!opencodeStat.isFile() || opencodeStat.isSymbolicLink()) {
        continue;
      }

      const ohMyOpencodePath = path.join(profileDir, "oh-my-openagent.jsonc");
      try {
        await fs.access(ohMyOpencodePath);
      } catch {}

      profiles.push({
        id: folderName,
        label: folderName,
        opencodePath,
        ohMyOpencodePath,
      });
    }

    profiles.sort((left, right) => compareFolderName(left.id, right.id));

    loggers.sharedProfilesScanner.debug(
      { operation: "profiles.scan_complete", profilesRoot, profileCount: profiles.length },
      "Profile scan completed"
    );

    return profiles;
  } catch (error) {
    loggers.sharedProfilesScanner.error(
      { operation: "profiles.scan_failed", profilesRoot, error: error instanceof Error ? error.message : String(error) },
      "Profile scan failed"
    );
    throw error;
  }
}
