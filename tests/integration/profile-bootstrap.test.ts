import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { describe, expect, test } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { scanProfiles } from "../../src/shared/profiles";

describe("profile bootstrap integration", () => {
  test("discovers sample profiles from config/profiles directory", async () => {
    const profilesRoot = path.resolve(__dirname, "../../config/profiles");

    const profiles = await scanProfiles(profilesRoot);

    expect(profiles.length).toBeGreaterThan(0);

    const defaultProfile = profiles.find((profile) => profile.id === "default");
    expect(defaultProfile).toBeDefined();

    expect(defaultProfile).toEqual({
      id: "default",
      label: "default",
      opencodePath: path.resolve(profilesRoot, "default/opencode.jsonc"),
      ohMyOpencodePath: path.resolve(profilesRoot, "default/oh-my-openagent.jsonc"),
    });

    expect(fs.existsSync(defaultProfile!.opencodePath)).toBe(true);
  });
});
