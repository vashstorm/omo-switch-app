import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  getAppZoomPercent,
  getSyncReplaceEnabled,
  readGlobalConfig,
} from "../../src/shared/config/global-config";
import {
  writeAppZoomPercent,
  writeSyncReplaceEnabled,
} from "../../src/shared/config-writer/global-config-writer";

describe("global config sync replace integration", () => {
  let tempDir: string;
  let tempConfigPath: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "omo-sync-replace-test-"));
    tempConfigPath = path.join(tempDir, "config.jsonc");
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
    }
  });

  it("writes sync_replace_enabled true to existing file", async () => {
    const initial = JSON.stringify({
      providers: { openai: { "gpt-5.4": { maxTokens: 64000 } } },
    });
    await fs.writeFile(tempConfigPath, initial, "utf-8");

    await writeSyncReplaceEnabled(tempConfigPath, true);

    const config = await readGlobalConfig(tempConfigPath);
    expect(getSyncReplaceEnabled(config)).toBe(true);
  });

  it("writes sync_replace_enabled false to existing file", async () => {
    const initial = `{ "ui_preferences": { "sync_replace_enabled": true } }`;
    await fs.writeFile(tempConfigPath, initial, "utf-8");

    await writeSyncReplaceEnabled(tempConfigPath, false);

    const config = await readGlobalConfig(tempConfigPath);
    expect(getSyncReplaceEnabled(config)).toBe(false);
    expect(config.ui_preferences?.sync_replace_enabled).toBe(false);
  });

  it("creates config file when missing", async () => {
    const nonExistentPath = path.join(tempDir, "subdir", "config.jsonc");

    await writeSyncReplaceEnabled(nonExistentPath, true);

    const config = await readGlobalConfig(nonExistentPath);
    expect(getSyncReplaceEnabled(config)).toBe(true);
  });

  it("preserves existing provider configuration", async () => {
    const initial = JSON.stringify({
      providers: {
        openai: { "gpt-5.4": { maxTokens: 64000 } },
        "aliyun-cp": { "glm-5": { maxTokens: 64000 } },
      },
      config_path: ["/some/path"],
    });
    await fs.writeFile(tempConfigPath, initial, "utf-8");

    await writeSyncReplaceEnabled(tempConfigPath, true);

    const config = await readGlobalConfig(tempConfigPath);
    expect(getSyncReplaceEnabled(config)).toBe(true);
    expect(config.providers?.openai?.["gpt-5.4"]?.maxTokens).toBe(64000);
    expect(config.providers?.["aliyun-cp"]?.["glm-5"]?.maxTokens).toBe(64000);
    expect(config.config_path).toEqual(["/some/path"]);
  });

  it("writes zoom_percent to ui preferences", async () => {
    await fs.writeFile(tempConfigPath, `{ "ui_preferences": { "sync_replace_enabled": true } }`, "utf-8");

    await writeAppZoomPercent(tempConfigPath, 115);

    const config = await readGlobalConfig(tempConfigPath);
    expect(getSyncReplaceEnabled(config)).toBe(true);
    expect(getAppZoomPercent(config)).toBe(115);
    expect(config.ui_preferences?.zoom_percent).toBe(115);
  });
});
