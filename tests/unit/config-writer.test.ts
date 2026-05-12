import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "jsonc-parser";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { writeProfileConfig, writeDisabledProviders } from "../../src/shared/config-writer";
import type { EditableConfig } from "../../src/shared/config/types";
import type { ResolvedProfile } from "../../src/shared/profiles/types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("config writer", () => {
  let tempDir = "";
  let configPath = "";
  let resolvedProfile: ResolvedProfile;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "omo-switch-writer-"));
    configPath = path.join(tempDir, "oh-my-openagent.jsonc");

    const initialContent = `{
  // Keep comments and unmanaged fields
  "agents": {
    "planner": {
      "model": "gpt-5",
      "variant": "medium",
      "temperature": 0.2,
      "prompt_append": "baseline prompt",
      "custom_unmanaged": "stay"
    }
  },
  "categories": {
    "backend": {
      "model": "gpt-4",
      "description": "backend",
      "custom_setting": "keep"
    }
  },
  "misc": {
    "tmux": {
      "enabled": true,
      "custom_misc": "keep"
    }
  },
  "top_level_unmanaged": {
    "preserve": true
  }
}`;

    await fs.writeFile(configPath, initialContent, "utf-8");

    resolvedProfile = {
      id: "test",
      label: "Test",
      opencodePath: path.join(__dirname, "../fixtures/config/minimal-opencode.jsonc"),
      ohMyOpencodePath: configPath,
    };
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("only updates managed fields and preserves unmanaged fields", async () => {
    const initialStat = await fs.stat(configPath);

    const payload: EditableConfig = {
      agents: {
        planner: {
          model: "gpt-5-mini",
          temperature: 0.1,
          prompt_append: "",
        },
      },
      categories: {
        backend: {
          model: "gpt-4.1",
          description: "",
        },
      },
      misc: {
        tmux: {
          enabled: false,
        },
      },
    };

    const result = await writeProfileConfig(
      resolvedProfile,
      payload,
      initialStat.mtimeMs,
    );

    expect(result.success).toBe(true);

    const saved = await fs.readFile(configPath, "utf-8");
    const data = parse(saved) as Record<string, any>;

    expect(data.agents.planner.model).toBe("gpt-5-mini");
    expect(data.agents.planner.temperature).toBe(0.1);
    expect(data.agents.planner.prompt_append).toBeUndefined();
    expect(data.agents.planner.custom_unmanaged).toBe("stay");

    expect(data.categories.backend.model).toBe("gpt-4.1");
    expect(data.categories.backend.description).toBeUndefined();
    expect(data.categories.backend.custom_setting).toBe("keep");

    expect(data.misc.tmux.enabled).toBe(false);
    expect(data.misc.tmux.custom_misc).toBe("keep");

    expect(data.top_level_unmanaged.preserve).toBe(true);
  });

  it("removes a managed object when payload value is null", async () => {
    const initialStat = await fs.stat(configPath);

    const payload = {
      agents: {
        planner: null,
      },
      categories: {},
      misc: {},
    } as unknown as EditableConfig;

    const result = await writeProfileConfig(
      resolvedProfile,
      payload,
      initialStat.mtimeMs,
    );

    expect(result.success).toBe(true);

    const saved = await fs.readFile(configPath, "utf-8");
    const data = parse(saved) as Record<string, any>;

    expect(data.agents.planner).toBeUndefined();
    expect(data.top_level_unmanaged.preserve).toBe(true);
  });

  it("deletes existing managed fields when omitted in payload", async () => {
    const initialStat = await fs.stat(configPath);

    const payload: EditableConfig = {
      agents: {
        planner: {
          model: "gpt-5-mini",
        },
      },
      categories: {},
      misc: {},
    };

    const result = await writeProfileConfig(
      resolvedProfile,
      payload,
      initialStat.mtimeMs,
    );

    expect(result.success).toBe(true);

    const saved = await fs.readFile(configPath, "utf-8");
    const data = parse(saved) as Record<string, any>;

    expect(data.agents.planner.model).toBe("gpt-5-mini");
    expect(data.agents.planner.variant).toBeUndefined();
    expect(data.agents.planner.temperature).toBeUndefined();
    expect(data.agents.planner.prompt_append).toBeUndefined();
    expect(data.agents.planner.custom_unmanaged).toBe("stay");
  });

  it("writes misc fields to top-level section when top-level section already exists", async () => {
    const initialContent = `{
  "tmux": {
    "enabled": true,
    "custom_misc": "keep"
  },
  "git_master": {
    "enabled": false,
    "branch": "master"
  },
  "top_level_unmanaged": {
    "preserve": true
  }
}`;
    await fs.writeFile(configPath, initialContent, "utf-8");

    const initialStat = await fs.stat(configPath);

    const payload: EditableConfig = {
      agents: {},
      categories: {},
      misc: {
        tmux: {
          enabled: false,
        },
        git_master: {
          enabled: true,
        },
      },
    };

    const result = await writeProfileConfig(
      resolvedProfile,
      payload,
      initialStat.mtimeMs,
    );

    expect(result.success).toBe(true);

    const saved = await fs.readFile(configPath, "utf-8");
    const data = parse(saved) as Record<string, any>;

    expect(data.tmux.enabled).toBe(false);
    expect(data.tmux.custom_misc).toBe("keep");
    expect(data.git_master.enabled).toBe(true);
    expect(data.git_master.branch).toBe("master");
    expect(data.misc).toBeUndefined();
    expect(data.top_level_unmanaged.preserve).toBe(true);
  });

  it("writes misc fields under misc when top-level section does not exist", async () => {
    const initialContent = `{
  "misc": {
    "tmux": {
      "enabled": true,
      "custom_misc": "keep"
    }
  }
}`;
    await fs.writeFile(configPath, initialContent, "utf-8");

    const initialStat = await fs.stat(configPath);

    const payload: EditableConfig = {
      agents: {},
      categories: {},
      misc: {
        tmux: {
          enabled: false,
        },
        git_master: {
          enabled: true,
        },
      },
    };

    const result = await writeProfileConfig(
      resolvedProfile,
      payload,
      initialStat.mtimeMs,
    );

    expect(result.success).toBe(true);

    const saved = await fs.readFile(configPath, "utf-8");
    const data = parse(saved) as Record<string, any>;

    expect(data.misc.tmux.enabled).toBe(false);
    expect(data.misc.tmux.custom_misc).toBe("keep");
    expect(data.misc.git_master.enabled).toBe(true);
    expect(data.tmux).toBeUndefined();
    expect(data.git_master).toBeUndefined();
  });
});

describe("writeDisabledProviders", () => {
  let tempDir = "";
  let configPath = "";

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "omo-switch-disabled-providers-"));
    configPath = path.join(tempDir, "config.jsonc");
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("writes disabled providers for a profile without affecting other profile keys", async () => {
    // Initial config with existing profile keys
    const initialContent = `{
  "disabled_providers": {
    "profile-1": ["anthropic", "openai"],
    "profile-2": ["google"]
  }
}`;
    await fs.writeFile(configPath, initialContent, "utf-8");

    // Write new array for profile-1
    await writeDisabledProviders(configPath, "profile-1", ["mistral", "deepseek"]);

    const saved = await fs.readFile(configPath, "utf-8");
    const data = parse(saved) as Record<string, any>;

    // profile-1 should have new values
    expect(data.disabled_providers["profile-1"]).toEqual(["mistral", "deepseek"]);
    // profile-2 should remain unchanged
    expect(data.disabled_providers["profile-2"]).toEqual(["google"]);
  });

  it("preserves the key when writing empty array", async () => {
    const initialContent = `{
  "disabled_providers": {
    "profile-1": ["anthropic"]
  }
}`;
    await fs.writeFile(configPath, initialContent, "utf-8");

    // Write empty array
    await writeDisabledProviders(configPath, "profile-1", []);

    const saved = await fs.readFile(configPath, "utf-8");
    const data = parse(saved) as Record<string, any>;

    // Key should still exist with empty array
    expect(data.disabled_providers["profile-1"]).toEqual([]);
    expect(saved).toContain('"profile-1": []');
  });

  it("creates disabled_providers object if it doesn't exist", async () => {
    const initialContent = `{}`;
    await fs.writeFile(configPath, initialContent, "utf-8");

    await writeDisabledProviders(configPath, "new-profile", ["provider1", "provider2"]);

    const saved = await fs.readFile(configPath, "utf-8");
    const data = parse(saved) as Record<string, any>;

    expect(data.disabled_providers["new-profile"]).toEqual(["provider1", "provider2"]);
  });
});
