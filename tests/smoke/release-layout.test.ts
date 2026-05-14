import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const releaseRoot = path.resolve(process.cwd(), "dist");

async function expectPathExists(relativePath: string): Promise<void> {
  const absolutePath = path.resolve(releaseRoot, relativePath);
  await expect(fs.access(absolutePath)).resolves.toBeUndefined();
}

describe("release layout", () => {
  it("contains compiled binary, bundled web assets, and config files", async () => {
    await expectPathExists("omo-switch");
    await expectPathExists("web/index.html");
    await expectPathExists("web/index.js");
    await expectPathExists("web/fonts/geist-sans-variable.woff2");
    await expectPathExists("web/fonts/geist-mono-variable.woff2");
    await expectPathExists("config");
    await expectPathExists("config/profiles/default/opencode.jsonc");
  });
});
