import type { ProfileConfigResult } from "../../src/web/hooks/useProfile";
import { groupModelsByProvider } from "../../src/shared/model-catalog";

/**
 * Overflow profile fixture for layout regression tests.
 * Contains enough entries to reliably trigger vertical overflow:
 *   - Agents >= 15
 *   - Categories >= 8
 *   - Misc sections >= 3
 */

const overflowAgents = {
  build: { model: "gpt-4o", variant: "high" },
  oracle: { model: "gpt-4o", variant: "low" },
  explore: { model: "claude-3-5-sonnet", variant: "medium" },
  librarian: { model: "claude-3-5-sonnet", variant: "low" },
  metis: { model: "gpt-4o-mini", variant: "high" },
  momus: { model: "gpt-4o-mini", variant: "medium" },
  deep: { model: "o1-preview", variant: "high" },
  quick: { model: "gpt-4o-mini", variant: "low" },
  planner: { model: "gpt-4o", variant: "medium" },
  reviewer: { model: "gpt-4o", variant: "high" },
  coder: { model: "claude-3-5-sonnet", variant: "high" },
  debugger: { model: "gpt-4o-mini", variant: "medium" },
  architect: { model: "o1-preview", variant: "high" },
  tester: { model: "gpt-4o", variant: "low" },
  documenter: { model: "claude-3-5-sonnet", variant: "low" },
};

const overflowCategories = {
  "visual-engineering": { model: "claude-3-5-sonnet", variant: "high" },
  ultrabrain: { model: "o1-preview", variant: "high" },
  "deep-research": { model: "claude-3-5-sonnet", variant: "medium" },
  artistry: { model: "gpt-4o", variant: "high" },
  "quick-fix": { model: "gpt-4o-mini", variant: "low" },
  writing: { model: "claude-3-5-sonnet", variant: "medium" },
  review: { model: "gpt-4o", variant: "low" },
  unspecified: { model: "gpt-4o-mini", variant: "medium" },
};

const overflowMiscEditable = {
  tmux: { enabled: true },
  git_master: { enabled: false },
};

const overflowMiscEffective = {
  tmux: {
    enabled: true,
    session_prefix: "omo",
    default_shell: "/bin/zsh",
    auto_attach: true,
  },
  git_master: {
    enabled: false,
    default_branch: "main",
    auto_push: false,
    sign_commits: true,
  },
  node_manager: {
    version: "20.11.0",
    package_manager: "bun",
    auto_install: true,
    strict_engines: false,
  },
};

export const overflowProfileDetail = {
  baseline: {
    agents: overflowAgents,
    categories: overflowCategories,
    misc: overflowMiscEditable,
  },
  editable: {
    agents: overflowAgents,
    categories: overflowCategories,
    misc: overflowMiscEditable,
  },
  effective: {
    agents: overflowAgents,
    categories: overflowCategories,
    misc: overflowMiscEffective,
  },
  readonlyTail: {},
  rawMisc: overflowMiscEffective,
  mtime: 9999999,
  errors: [],
  availableModels: [
    "gpt-4o",
    "gpt-4o-mini",
    "o1-preview",
    "claude-3-5-sonnet",
  ],
  availableModelGroups: groupModelsByProvider([
    "gpt-4o",
    "gpt-4o-mini",
    "o1-preview",
    "claude-3-5-sonnet",
  ]),
  disabledProviders: [],
  providerCatalog: ["openai", "anthropic"],
} satisfies ProfileConfigResult;

export const overflowMockProfiles = {
  profiles: [{ id: "overflow-profile", label: "Overflow Test Profile" }],
};
