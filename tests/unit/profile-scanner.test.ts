import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { scanProfiles } from "../../src/shared/profiles";

async function writeOpencodeConfig(profileDir: string): Promise<void> {
  await fs.mkdir(profileDir, { recursive: true });
  await fs.writeFile(path.join(profileDir, "opencode.jsonc"), "{}", "utf-8");
}

describe("profile scanner", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "omo-switch-profile-scan-"));
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("discovers valid direct-child profiles only with stable sorting", async () => {
    await writeOpencodeConfig(path.join(tempDir, "default"));
    await writeOpencodeConfig(path.join(tempDir, "omo"));
    await writeOpencodeConfig(path.join(tempDir, "omor"));
    await writeOpencodeConfig(path.join(tempDir, ".hidden"));

    await fs.mkdir(path.join(tempDir, "missing-opencode"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "plain-file.txt"), "x", "utf-8");

    const nestedParent = path.join(tempDir, "nested-parent");
    await fs.mkdir(path.join(nestedParent, "child"), { recursive: true });
    await fs.writeFile(
      path.join(nestedParent, "child", "opencode.jsonc"),
      "{}",
      "utf-8",
    );

    let symlinkCreated = false;
    const symlinkPath = path.join(tempDir, "linked-default");
    try {
      await fs.symlink(
        path.join(tempDir, "default"),
        symlinkPath,
        os.platform() === "win32" ? "junction" : "dir",
      );
      symlinkCreated = true;
    } catch {}

    const result = await scanProfiles(tempDir);
    const resultIds = result.map((profile) => profile.id);

    expect(resultIds).toEqual(["default", "omo", "omor"]);
    expect(result.every((profile) => profile.id === profile.label)).toBe(true);

    const defaultProfile = result.find((profile) => profile.id === "default");
    const omoProfile = result.find((profile) => profile.id === "omo");
    const omorProfile = result.find((profile) => profile.id === "omor");

    expect(defaultProfile).toBeDefined();
    expect(defaultProfile?.opencodePath).toBe(
      path.join(tempDir, "default", "opencode.jsonc"),
    );
    expect(defaultProfile?.ohMyOpencodePath).toBe(
      path.join(tempDir, "default", "oh-my-openagent.jsonc"),
    );

    expect(omoProfile).toBeDefined();
    expect(omoProfile?.opencodePath).toBe(path.join(tempDir, "omo", "opencode.jsonc"));
    expect(omoProfile?.ohMyOpencodePath).toBe(
      path.join(tempDir, "omo", "oh-my-openagent.jsonc"),
    );

    expect(omorProfile).toBeDefined();
    expect(omorProfile?.opencodePath).toBe(path.join(tempDir, "omor", "opencode.jsonc"));
    expect(omorProfile?.ohMyOpencodePath).toBe(
      path.join(tempDir, "omor", "oh-my-openagent.jsonc"),
    );

    if (symlinkCreated) {
      expect(resultIds).not.toContain("linked-default");
    }
    expect(resultIds).not.toContain(".hidden");
    expect(resultIds).not.toContain("missing-opencode");
    expect(resultIds).not.toContain("nested-parent");
  });

  it("does not create oh-my-openagent.jsonc during scan", async () => {
    const profileDir = path.join(tempDir, "default");
    await writeOpencodeConfig(profileDir);

    const ohMyPath = path.join(profileDir, "oh-my-openagent.jsonc");
    await expect(fs.access(ohMyPath)).rejects.toThrow();

    const result = await scanProfiles(tempDir);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: "default",
      label: "default",
      opencodePath: path.join(profileDir, "opencode.jsonc"),
      ohMyOpencodePath: ohMyPath,
    });

    await expect(fs.access(ohMyPath)).rejects.toThrow();
  });

  it("sorts with case-insensitive primary and case-sensitive tie-break", async () => {
    const readdirSpy = vi.spyOn(fs, "readdir");
    const lstatSpy = vi.spyOn(fs, "lstat");
    const accessSpy = vi.spyOn(fs, "access");

    readdirSpy.mockResolvedValue([
      {
        name: "beta",
        isDirectory: () => true,
      } as unknown as Awaited<ReturnType<typeof fs.readdir>>[number],
      {
        name: "alpha",
        isDirectory: () => true,
      } as unknown as Awaited<ReturnType<typeof fs.readdir>>[number],
      {
        name: "Alpha",
        isDirectory: () => true,
      } as unknown as Awaited<ReturnType<typeof fs.readdir>>[number],
    ]);

    lstatSpy.mockImplementation(async (targetPath) => {
      if (typeof targetPath === "string" && targetPath.endsWith("opencode.jsonc")) {
        return {
          isFile: () => true,
          isSymbolicLink: () => false,
        } as Awaited<ReturnType<typeof fs.lstat>>;
      }

      return {
        isFile: () => false,
        isSymbolicLink: () => false,
      } as Awaited<ReturnType<typeof fs.lstat>>;
    });

    accessSpy.mockResolvedValue(undefined);

    const result = await scanProfiles(tempDir);
    expect(result.map((profile) => profile.id)).toEqual(["Alpha", "alpha", "beta"]);

  });
});
