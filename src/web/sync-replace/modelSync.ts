import type { EditableConfig } from "../hooks/useProfile";

export interface SyncReplaceSource {
  kind: "agent" | "category";
  id: string;
  oldModel: string;
  newModel: string;
}

export interface SyncReplaceImpact {
  trigger: SyncReplaceSource;
  additionalAgents: string[];
  additionalCategories: string[];
  totalAdditionalCount: number;
}

export function collectSyncReplaceImpact(
  config: EditableConfig,
  source: SyncReplaceSource,
): SyncReplaceImpact {
  const additionalAgents: string[] = [];
  const additionalCategories: string[] = [];

  for (const [id, agent] of Object.entries(config.agents)) {
    if (agent === null || agent === undefined) continue;
    if (agent.model !== source.oldModel) continue;
    if (source.kind === "agent" && id === source.id) continue;
    additionalAgents.push(id);
  }

  for (const [id, category] of Object.entries(config.categories)) {
    if (category === null || category === undefined) continue;
    if (category.model !== source.oldModel) continue;
    if (source.kind === "category" && id === source.id) continue;
    additionalCategories.push(id);
  }

  return {
    trigger: source,
    additionalAgents,
    additionalCategories,
    totalAdditionalCount: additionalAgents.length + additionalCategories.length,
  };
}

export function applySyncReplace(
  config: EditableConfig,
  oldModel: string,
  newModel: string,
): EditableConfig {
  const updatedAgents = { ...config.agents };
  for (const [id, agent] of Object.entries(updatedAgents)) {
    if (agent === null || agent === undefined) continue;
    if (agent.model === oldModel) {
      if (newModel) {
        updatedAgents[id] = { ...agent, model: newModel };
      } else {
        const { model: _model, ...rest } = agent;
        updatedAgents[id] = rest;
      }
    }
  }

  const updatedCategories = { ...config.categories };
  for (const [id, category] of Object.entries(updatedCategories)) {
    if (category === null || category === undefined) continue;
    if (category.model === oldModel) {
      if (newModel) {
        updatedCategories[id] = { ...category, model: newModel };
      } else {
        const { model: _model, ...rest } = category;
        updatedCategories[id] = rest;
      }
    }
  }

  return {
    ...config,
    agents: updatedAgents,
    categories: updatedCategories,
  };
}

export function applySyncReplaceOne(
  config: EditableConfig,
  source: SyncReplaceSource,
): EditableConfig {
  const updatedAgents = { ...config.agents };
  const updatedCategories = { ...config.categories };

  if (source.kind === "agent") {
    const agent = updatedAgents[source.id];
    if (agent && agent.model === source.oldModel) {
      if (source.newModel) {
        updatedAgents[source.id] = { ...agent, model: source.newModel };
      } else {
        const { model: _model, ...rest } = agent;
        updatedAgents[source.id] = rest;
      }
    }
  } else if (source.kind === "category") {
    const category = updatedCategories[source.id];
    if (category && category.model === source.oldModel) {
      if (source.newModel) {
        updatedCategories[source.id] = { ...category, model: source.newModel };
      } else {
        const { model: _model, ...rest } = category;
        updatedCategories[source.id] = rest;
      }
    }
  }

  return {
    ...config,
    agents: updatedAgents,
    categories: updatedCategories,
  };
}
