import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "jsonc-parser";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { writeProfileConfig, writeDisabledProviders, writeModel, deleteModel, updateModelConfig } from "../../src/shared/config-writer";
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

  it("updates managed agent/category fields and writes misc values as whole key-value entries", async () => {
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
    expect(data.misc.tmux.custom_misc).toBeUndefined();

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
    expect(data.tmux.custom_misc).toBeUndefined();
    expect(data.git_master.enabled).toBe(true);
    expect(data.git_master.branch).toBeUndefined();
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
    expect(data.misc.tmux.custom_misc).toBeUndefined();
    expect(data.misc.git_master.enabled).toBe(true);
    expect(data.tmux).toBeUndefined();
    expect(data.git_master).toBeUndefined();
  });

  it("removes existing null values from config file", async () => {
    const initialContent = `{
  "agents": {
    "planner": {
      "model": null,
      "variant": "low"
    }
  }
}`;
    await fs.writeFile(configPath, initialContent, "utf-8");
    const initialStat = await fs.stat(configPath);

    const payload: EditableConfig = {
      agents: {},
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

    expect(data.agents.planner.model).toBeUndefined();
    expect(data.agents.planner.variant).toBe("low");
  });

  it("removes existing empty arrays from config file", async () => {
    const initialContent = `{
  "agents": {
    "planner": {
      "fallback_models": [],
      "model": "gpt-4"
    }
  }
}`;
    await fs.writeFile(configPath, initialContent, "utf-8");
    const initialStat = await fs.stat(configPath);

    const payload: EditableConfig = {
      agents: {},
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

    expect(data.agents.planner.fallback_models).toBeUndefined();
    expect(data.agents.planner.model).toBe("gpt-4");
  });

  it("removes existing empty strings from config file", async () => {
    const initialContent = `{
  "agents": {
    "planner": {
      "prompt_append": "",
      "model": "gpt-4"
    }
  }
}`;
    await fs.writeFile(configPath, initialContent, "utf-8");
    const initialStat = await fs.stat(configPath);

    const payload: EditableConfig = {
      agents: {},
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

    expect(data.agents.planner.prompt_append).toBeUndefined();
    expect(data.agents.planner.model).toBe("gpt-4");
  });

  it("removes nested null values", async () => {
    const initialContent = `{
  "agents": {
    "planner": {
      "ultrawork": {
        "model": null,
        "variant": "low"
      }
    }
  }
}`;
    await fs.writeFile(configPath, initialContent, "utf-8");
    const initialStat = await fs.stat(configPath);

    const payload: EditableConfig = {
      agents: {},
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

    expect(data.agents.planner.ultrawork.model).toBeUndefined();
    expect(data.agents.planner.ultrawork.variant).toBe("low");
  });

  it("omits ultrawork when payload marks it disabled", async () => {
    const initialContent = `{
  "agents": {
    "sisyphus": {
      "model": "anthropic/claude",
      "ultrawork": {
        "model": "openai/gpt-5",
        "variant": "medium"
      }
    }
  }
}`;
    await fs.writeFile(configPath, initialContent, "utf-8");
    const initialStat = await fs.stat(configPath);

    const payload: EditableConfig = {
      agents: {
        sisyphus: {
          model: "anthropic/claude",
          ultrawork: null,
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

    expect(data.agents.sisyphus.ultrawork).toBeUndefined();
    expect(saved).not.toContain('"ultrawork": null');
  });

  it("handles null in unmanaged fields", async () => {
    const initialContent = `{
  "agents": {
    "planner": {
      "model": "gpt-4",
      "custom_field": null
    }
  },
  "top_level_null": null
}`;
    await fs.writeFile(configPath, initialContent, "utf-8");
    const initialStat = await fs.stat(configPath);

    const payload: EditableConfig = {
      agents: {},
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

    expect(data.agents.planner.custom_field).toBeUndefined();
    expect(data.top_level_null).toBeUndefined();
    expect(data.agents.planner.model).toBe("gpt-4");
  });

  it("preserves comments while cleaning empty values", async () => {
    const initialContent = `{
  // Agent configuration
  "agents": {
    // Planner agent
    "planner": {
      "model": null, // should be cleaned
      "variant": "low" // keep this
    }
  }
}`;
    await fs.writeFile(configPath, initialContent, "utf-8");
    const initialStat = await fs.stat(configPath);

    const payload: EditableConfig = {
      agents: {},
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

    expect(saved).toContain("// Agent configuration");
    expect(saved).toContain("// Planner agent");
    expect(saved).toContain("// keep this");
    expect(data.agents.planner.model).toBeUndefined();
    expect(data.agents.planner.variant).toBe("low");
  });

  it("cleans empty values while applying normal updates", async () => {
    const initialContent = `{
  "agents": {
    "planner": {
      "model": null,
      "fallback_models": [],
      "prompt_append": "",
      "variant": "low"
    }
  }
}`;
    await fs.writeFile(configPath, initialContent, "utf-8");
    const initialStat = await fs.stat(configPath);

    const payload: EditableConfig = {
      agents: {
        planner: {
          model: "gpt-5",
          variant: "low",
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

    expect(data.agents.planner.model).toBe("gpt-5");
    expect(data.agents.planner.fallback_models).toBeUndefined();
    expect(data.agents.planner.prompt_append).toBeUndefined();
    expect(data.agents.planner.variant).toBe("low");
  });

  it("omits model field when payload has null", async () => {
    const initialContent = `{
  // Agent configuration
  "agents": {
    "planner": {
      "variant": "high"
    }
  }
}`;
    await fs.writeFile(configPath, initialContent, "utf-8");
    const initialStat = await fs.stat(configPath);

    const payload = {
      agents: {
        planner: {
          model: null,
          variant: "high",
        },
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

    expect(data.agents.planner.model).toBeUndefined();
    expect(data.agents.planner.variant).toBe("high");
    expect(saved).toContain("// Agent configuration");
  });

  it("omits variant field when payload has empty string", async () => {
    const initialContent = `{
  // Agent settings
  "agents": {
    "planner": {
      "model": "gpt-4"
    }
  }
}`;
    await fs.writeFile(configPath, initialContent, "utf-8");
    const initialStat = await fs.stat(configPath);

    const payload = {
      agents: {
        planner: {
          model: "gpt-4",
          variant: "",
        },
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

    expect(data.agents.planner.variant).toBeUndefined();
    expect(data.agents.planner.model).toBe("gpt-4");
    expect(saved).toContain("// Agent settings");
  });

  it("omits temperature field when payload has zero (agent)", async () => {
    const initialContent = `{
  // Temperature settings
  "agents": {
    "planner": {
      "model": "gpt-4"
    }
  },
  "categories": {
    "backend": {
      "model": "gpt-3"
    }
  }
}`;
    await fs.writeFile(configPath, initialContent, "utf-8");
    const initialStat = await fs.stat(configPath);

    const payload: EditableConfig = {
      agents: {
        planner: {
          model: "gpt-4",
          temperature: 0,
        },
      },
      categories: {
        backend: {
          model: "gpt-3",
          temperature: 0,
        },
      },
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

    expect(data.agents.planner.temperature).toBeUndefined();
    expect(data.categories.backend.temperature).toBeUndefined();
    expect(saved).toContain("// Temperature settings");
  });

  it("omits fallback_models field when payload has empty array", async () => {
    const initialContent = `{
  // Fallback configuration
  "agents": {
    "planner": {
      "model": "gpt-4"
    }
  },
  "categories": {
    "backend": {
      "model": "gpt-3"
    }
  }
}`;
    await fs.writeFile(configPath, initialContent, "utf-8");
    const initialStat = await fs.stat(configPath);

    const payload: EditableConfig = {
      agents: {
        planner: {
          model: "gpt-4",
          fallback_models: [],
        },
      },
      categories: {
        backend: {
          model: "gpt-3",
          fallback_models: [],
        },
      },
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

    expect(data.agents.planner.fallback_models).toBeUndefined();
    expect(data.categories.backend.fallback_models).toBeUndefined();
    expect(saved).toContain("// Fallback configuration");
  });

  it("preserves comments when omitting default fields in payload", async () => {
    const initialContent = `{
  // Top-level comment
  "agents": {
    // Agent block comment
    "planner": {
      // Planner field comment
      "model": "gpt-4", // inline model comment
      "variant": "medium" // keep variant
    }
  },
  "categories": {
    // Category block comment
    "backend": {
      "model": "gpt-3",
      "description": "backend services"
    }
  }
}`;
    await fs.writeFile(configPath, initialContent, "utf-8");
    const initialStat = await fs.stat(configPath);

    const payload = {
      agents: {
        planner: {
          model: null,
          variant: "",
          temperature: 0,
          fallback_models: [],
        },
      },
      categories: {
        backend: {
          model: "gpt-3",
          fallback_models: [],
        },
      },
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

    // All default/empty fields should be omitted
    expect(data.agents.planner.model).toBeUndefined();
    expect(data.agents.planner.variant).toBeUndefined();
    expect(data.agents.planner.temperature).toBeUndefined();
    expect(data.agents.planner.fallback_models).toBeUndefined();
    expect(data.categories.backend.fallback_models).toBeUndefined();

    // Comments should be preserved
    expect(saved).toContain("// Top-level comment");
    expect(saved).toContain("// Agent block comment");
    expect(saved).toContain("// Category block comment");
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


describe("writeModel", () => {
  let tempDir = "";
  let configPath = "";

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "omo-switch-write-model-"));
    configPath = path.join(tempDir, "config.jsonc");
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("creates model in array-format provider and preserves existing models", async () => {
    const initialContent = `{
  "providers": {
    "openai": [
      "gpt-5.4",
      "gpt-5.3-codex"
    ]
  }
}`;
    await fs.writeFile(configPath, initialContent, "utf-8");

    await writeModel(configPath, "openai", "gpt-5.5");

    const saved = await fs.readFile(configPath, "utf-8");
    const data = parse(saved) as Record<string, any>;

    expect(data.providers.openai).toEqual(["gpt-5.4", "gpt-5.3-codex", "gpt-5.5"]);
  });

  it("creates model when provider does not exist", async () => {
    const initialContent = `{}`;
    await fs.writeFile(configPath, initialContent, "utf-8");

    await writeModel(configPath, "openai", "gpt-5");

    const saved = await fs.readFile(configPath, "utf-8");
    const data = parse(saved) as Record<string, any>;

    expect(data.providers.openai).toEqual(["gpt-5"]);
  });

  it("does not duplicate model when adding existing model", async () => {
    const initialContent = `{
  "providers": {
    "openai": ["gpt-5"]
  }
}`;
    await fs.writeFile(configPath, initialContent, "utf-8");

    await writeModel(configPath, "openai", "gpt-5");

    const saved = await fs.readFile(configPath, "utf-8");
    const data = parse(saved) as Record<string, any>;

    expect(data.providers.openai).toEqual(["gpt-5"]);
  });

  it("throws when model already exists and overwrite is false", async () => {
    const initialContent = `{
  "providers": {
    "openai": ["gpt-5"]
  }
}`;
    await fs.writeFile(configPath, initialContent, "utf-8");

    await expect(
      writeModel(configPath, "openai", "gpt-5", { overwrite: false })
    ).rejects.toThrow('Model "gpt-5" already exists under provider "openai"');
  });

  it("throws when provider name is invalid", async () => {
    await expect(writeModel(configPath, "", "gpt-5")).rejects.toThrow();
  });

  it("throws when model name is invalid", async () => {
    await expect(writeModel(configPath, "openai", "")).rejects.toThrow();
  });
});

describe("deleteModel", () => {
  let tempDir = "";
  let configPath = "";

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "omo-switch-delete-model-"));
    configPath = path.join(tempDir, "config.jsonc");
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("deletes model from array-format provider and preserves others", async () => {
    const initialContent = `{
  "providers": {
    "openai": [
      "gpt-5.4",
      "gpt-5.3-codex",
      "gpt-5.5"
    ]
  }
}`;
    await fs.writeFile(configPath, initialContent, "utf-8");

    await deleteModel(configPath, "openai", "gpt-5.3-codex");

    const saved = await fs.readFile(configPath, "utf-8");
    const data = parse(saved) as Record<string, any>;

    expect(data.providers.openai).toEqual(["gpt-5.4", "gpt-5.5"]);
  });

  it("handles deleting non-existent model gracefully", async () => {
    const initialContent = `{
  "providers": {
    "openai": ["gpt-5.4"]
  }
}`;
    await fs.writeFile(configPath, initialContent, "utf-8");

    await deleteModel(configPath, "openai", "non-existent");

    const saved = await fs.readFile(configPath, "utf-8");
    const data = parse(saved) as Record<string, any>;

    expect(data.providers.openai).toEqual(["gpt-5.4"]);
  });

  it("handles deleting from non-array provider gracefully", async () => {
    const initialContent = `{
  "providers": {
    "openai": { "gpt-5.4": {} }
  }
}`;
    await fs.writeFile(configPath, initialContent, "utf-8");

    await deleteModel(configPath, "openai", "gpt-5.4");

    const saved = await fs.readFile(configPath, "utf-8");
    const data = parse(saved) as Record<string, any>;

    // 对象格式下不处理，保持原样
    expect(data.providers.openai).toEqual({ "gpt-5.4": {} });
  });

  it("throws when provider name is invalid", async () => {
    await expect(deleteModel(configPath, "", "gpt-5")).rejects.toThrow();
  });

  it("throws when model name is invalid", async () => {
    await expect(deleteModel(configPath, "openai", "")).rejects.toThrow();
  });
});

describe("updateModelConfig", () => {
  let tempDir = "";
  let configPath = "";

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "omo-switch-update-model-"));
    configPath = path.join(tempDir, "config.jsonc");
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("throws for array-format provider", async () => {
    const initialContent = `{
  "providers": {
    "openai": [
      "gpt-5.4",
      "gpt-5.3-codex"
    ]
  }
}`;
    await fs.writeFile(configPath, initialContent, "utf-8");

    await expect(
      updateModelConfig(configPath, "openai", "gpt-5.4", { maxTokens: 256000 })
    ).rejects.toThrow('Cannot update model config for array-format provider "openai"');
  });

  it("updates model config in object-format provider", async () => {
    const initialContent = `{
  "providers": {
    "openai": {
      "gpt-5.4": { "type": "chat" }
    }
  }
}`;
    await fs.writeFile(configPath, initialContent, "utf-8");

    await updateModelConfig(configPath, "openai", "gpt-5.4", { maxTokens: 64000 });

    const saved = await fs.readFile(configPath, "utf-8");
    const data = parse(saved) as Record<string, any>;

    expect(data.providers.openai["gpt-5.4"]).toEqual({ type: "chat", maxTokens: 64000 });
  });

  it("throws when provider name is invalid", async () => {
    await expect(updateModelConfig(configPath, "", "gpt-5", {})).rejects.toThrow();
  });

  it("throws when model name is invalid", async () => {
    await expect(updateModelConfig(configPath, "openai", "", {})).rejects.toThrow();
  });
});
