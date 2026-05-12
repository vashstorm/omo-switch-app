import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { copyProfile } from "../../src/shared/profiles/copier";

let tempDir: string;
let profilesRoot: string;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "profile-copier-test-"));
  profilesRoot = path.join(tempDir, "profiles");

  const sourceDir = path.join(profilesRoot, "source-profile");
  await fs.mkdir(sourceDir, { recursive: true });
  await fs.writeFile(path.join(sourceDir, "opencode.jsonc"), '{ "agents": {} }', "utf-8");
  await fs.writeFile(
    path.join(sourceDir, "oh-my-openagent.jsonc"),
    '{ "agents": {} }',
    "utf-8",
  );
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe("copyProfile", () => {
  it("copies opencode.jsonc and oh-my-openagent.jsonc to new target directory", async () => {
    const result = await copyProfile(profilesRoot, "source-profile", "new-profile");

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.profile.id).toBe("new-profile");
    expect(result.profile.label).toBe("new-profile");

    const opencodeExists = await fs
      .access(path.join(profilesRoot, "new-profile", "opencode.jsonc"))
      .then(() => true)
      .catch(() => false);
    const ohMyExists = await fs
      .access(path.join(profilesRoot, "new-profile", "oh-my-openagent.jsonc"))
      .then(() => true)
      .catch(() => false);

    expect(opencodeExists).toBe(true);
    expect(ohMyExists).toBe(true);
  });

  it("creates empty oh-my-openagent.jsonc when source does not have one", async () => {
    const sourceDir = path.join(profilesRoot, "minimal-profile");
    await fs.mkdir(sourceDir, { recursive: true });
    await fs.writeFile(path.join(sourceDir, "opencode.jsonc"), '{ "agents": {} }', "utf-8");

    const result = await copyProfile(profilesRoot, "minimal-profile", "minimal-copy");

    expect(result.success).toBe(true);

    const ohMyContent = await fs.readFile(
      path.join(profilesRoot, "minimal-copy", "oh-my-openagent.jsonc"),
      "utf-8",
    );
    expect(ohMyContent.trim()).toBe("{}");
  });

  it("returns INVALID_TARGET_ID error for invalid target id", async () => {
    const result = await copyProfile(profilesRoot, "source-profile", "Bad Name!");
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.code).toBe("INVALID_TARGET_ID");
  });

  it("returns INVALID_TARGET_ID for target id starting with non-alphanumeric", async () => {
    const result = await copyProfile(profilesRoot, "source-profile", "-bad-start");
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.code).toBe("INVALID_TARGET_ID");
  });

  it("returns SOURCE_NOT_FOUND when source profile does not exist", async () => {
    const result = await copyProfile(profilesRoot, "nonexistent", "target");
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.code).toBe("SOURCE_NOT_FOUND");
  });

  it("returns TARGET_EXISTS when target directory already exists", async () => {
    const targetDir = path.join(profilesRoot, "existing-target");
    await fs.mkdir(targetDir, { recursive: true });

    const result = await copyProfile(profilesRoot, "source-profile", "existing-target");
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.code).toBe("TARGET_EXISTS");
  });

  it("preserves content of copied opencode.jsonc", async () => {
    const content = '{ "agents": { "test": { "model": "gpt-5" } } }';
    await fs.writeFile(
      path.join(profilesRoot, "source-profile", "opencode.jsonc"),
      content,
      "utf-8",
    );

    const result = await copyProfile(profilesRoot, "source-profile", "content-check");
    expect(result.success).toBe(true);

    const copied = await fs.readFile(
      path.join(profilesRoot, "content-check", "opencode.jsonc"),
      "utf-8",
    );
    expect(copied).toBe(content);
  });
});
