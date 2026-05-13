import type { AgentConfig, CategoryConfig } from "../hooks/useProfile";

export interface ReferenceImpactEntry {
  kind: "agent" | "category";
  id: string;
  field: "model" | "fallback_models" | "ultrawork_model";
  modelId: string;
}

export interface ReferenceImpactIndex {
  byProvider: Record<string, ReferenceImpactEntry[]>;
  byModel: Record<string, ReferenceImpactEntry[]>;
}

interface ScanConfig {
  agents: Record<string, AgentConfig | null>;
  categories: Record<string, CategoryConfig | null>;
}

function scanEntries(
  kind: "agent" | "category",
  entries: Record<string, AgentConfig | CategoryConfig | null>,
  matches: (modelId: string) => boolean,
): ReferenceImpactEntry[] {
  const results: ReferenceImpactEntry[] = [];

  for (const [id, entry] of Object.entries(entries)) {
    if (entry === null || entry === undefined) continue;

    const agent = entry as AgentConfig;
    const category = entry as CategoryConfig;

    // Check model field
    if (agent.model && matches(agent.model)) {
      results.push({ kind, id, field: "model", modelId: agent.model });
    }

    // Check fallback_models field
    if (agent.fallback_models && Array.isArray(agent.fallback_models)) {
      for (const modelId of agent.fallback_models) {
        if (matches(modelId)) {
          results.push({ kind, id, field: "fallback_models", modelId });
        }
      }
    }

    // Check ultrawork.model field (agents only)
    if (kind === "agent" && agent.ultrawork?.model && matches(agent.ultrawork.model)) {
      results.push({ kind, id, field: "ultrawork_model", modelId: agent.ultrawork.model });
    }
  }

  return results;
}

function pushIndexedEntry(index: ReferenceImpactIndex, entry: ReferenceImpactEntry): void {
  const slashIndex = entry.modelId.indexOf("/");
  const provider = slashIndex >= 0 ? entry.modelId.slice(0, slashIndex) : "";

  if (provider) {
    (index.byProvider[provider] ??= []).push(entry);
  }
  (index.byModel[entry.modelId] ??= []).push(entry);
}

function indexEntries(
  index: ReferenceImpactIndex,
  kind: "agent" | "category",
  entries: Record<string, AgentConfig | CategoryConfig | null>,
): void {
  for (const [id, entry] of Object.entries(entries)) {
    if (entry === null || entry === undefined) continue;

    const agent = entry as AgentConfig;

    if (agent.model) {
      pushIndexedEntry(index, { kind, id, field: "model", modelId: agent.model });
    }

    if (agent.fallback_models && Array.isArray(agent.fallback_models)) {
      for (const modelId of agent.fallback_models) {
        pushIndexedEntry(index, { kind, id, field: "fallback_models", modelId });
      }
    }

    if (kind === "agent" && agent.ultrawork?.model) {
      pushIndexedEntry(index, {
        kind,
        id,
        field: "ultrawork_model",
        modelId: agent.ultrawork.model,
      });
    }
  }
}

function sortEntries(entries: ReferenceImpactEntry[]): ReferenceImpactEntry[] {
  return entries.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
    if (a.id !== b.id) return a.id.localeCompare(b.id);
    return a.field.localeCompare(b.field);
  });
}

export function buildReferenceImpactIndex(config: ScanConfig): ReferenceImpactIndex {
  const index: ReferenceImpactIndex = {
    byProvider: {},
    byModel: {},
  };

  indexEntries(index, "agent", config.agents);
  indexEntries(index, "category", config.categories);

  for (const entries of Object.values(index.byProvider)) {
    sortEntries(entries);
  }
  for (const entries of Object.values(index.byModel)) {
    sortEntries(entries);
  }

  return index;
}

export function scanProviderReferences(
  config: ScanConfig,
  providerName: string,
): ReferenceImpactEntry[] {
  const prefix = providerName + "/";
  const matches = (modelId: string) => modelId.startsWith(prefix);

  const agentResults = scanEntries("agent", config.agents, matches);
  const categoryResults = scanEntries("category", config.categories, matches);

  return sortEntries([...agentResults, ...categoryResults]);
}

export function scanModelReferences(
  config: ScanConfig,
  providerName: string,
  modelName: string,
): ReferenceImpactEntry[] {
  const exactModelId = providerName + "/" + modelName;
  const matches = (modelId: string) => modelId === exactModelId;

  const agentResults = scanEntries("agent", config.agents, matches);
  const categoryResults = scanEntries("category", config.categories, matches);

  return sortEntries([...agentResults, ...categoryResults]);
}
