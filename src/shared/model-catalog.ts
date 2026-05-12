export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
}

export interface ModelOption {
  id: string;
  label: string;
  provider: string;
}

export interface ModelGroup {
  provider: string;
  label: string;
  models: ModelOption[];
}

const BUILTIN_MODELS: ModelInfo[] = [
  { id: "anthropic/claude-opus-4-5", name: "Claude Opus 4.5", provider: "anthropic" },
  { id: "anthropic/claude-sonnet-4-5", name: "Claude Sonnet 4.5", provider: "anthropic" },
  { id: "anthropic/claude-haiku-4-5", name: "Claude Haiku 4.5", provider: "anthropic" },
  { id: "openai/gpt-4o", name: "GPT-4o", provider: "openai" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", provider: "openai" },
  { id: "openai/gpt-5", name: "GPT-5", provider: "openai" },
  { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "google" },
  { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "google" },
  { id: "deepseek/deepseek-v3", name: "DeepSeek V3", provider: "deepseek" },
  { id: "deepseek/deepseek-r1", name: "DeepSeek R1", provider: "deepseek" },
  { id: "alibaba/qwen-max", name: "Qwen Max", provider: "alibaba" },
  { id: "alibaba/qwen-turbo", name: "Qwen Turbo", provider: "alibaba" },
];

export function getBuiltinModels(): ModelInfo[] {
  return [...BUILTIN_MODELS];
}

export function getBuiltinModelIds(): string[] {
  return BUILTIN_MODELS.map((m) => m.id);
}

export function getModelInfo(modelId: string): ModelInfo | undefined {
  const fullMatch = BUILTIN_MODELS.find((m) => m.id === modelId);
  if (fullMatch) return fullMatch;
  return BUILTIN_MODELS.find((m) => m.id.endsWith(`/${modelId}`));
}

export function isBuiltinModel(modelId: string): boolean {
  if (BUILTIN_MODELS.some((m) => m.id === modelId)) return true;
  return BUILTIN_MODELS.some((m) => m.id.endsWith(`/${modelId}`));
}

export function mergeModels(
  builtinList: string[],
  fromConfig: string[]
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const model of builtinList) {
    if (!seen.has(model)) {
      seen.add(model);
      result.push(model);
    }
  }

  for (const model of fromConfig) {
    if (!seen.has(model)) {
      seen.add(model);
      result.push(model);
    }
  }

  return result;
}

export function splitModelId(id: string): { provider: string; modelName: string } {
  const slashIndex = id.indexOf("/");
  if (slashIndex === -1) {
    return { provider: "Unknown", modelName: id };
  }
  return {
    provider: id.slice(0, slashIndex),
    modelName: id.slice(slashIndex + 1),
  };
}

export function buildProviderCatalog(models: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const modelId of models) {
    const { provider } = splitModelId(modelId);
    if (!seen.has(provider)) {
      seen.add(provider);
      result.push(provider);
    }
  }

  return result;
}

/**
 * Build provider catalog from ModelSourceEntry[] in first-appearance order.
 * This preserves the merge order from sources (global → opencode → oh-my-openagent)
 * without alphabetical sorting.
 */
export function buildProviderCatalogFromSources<T extends { model: string }>(
  sources: T[]
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const source of sources) {
    const { provider } = splitModelId(source.model);
    if (!seen.has(provider)) {
      seen.add(provider);
      result.push(provider);
    }
  }

  return result;
}

export function filterModelsByDisabledProviders(
  models: string[],
  disabledProviders: string[],
): string[] {
  const disabledSet = new Set(disabledProviders);
  return models.filter((modelId) => {
    const { provider } = splitModelId(modelId);
    return !disabledSet.has(provider);
  });
}

export function getModelDisplayInfo(fullId: string): { providerLabel: string; modelLabel: string; fullId: string } {
  const { provider, modelName } = splitModelId(fullId);
  return {
    providerLabel: provider,
    modelLabel: modelName,
    fullId,
  };
}

export function groupModelsByProvider(models: string[]): ModelGroup[] {
  const groupMap = new Map<string, ModelGroup>();

  for (const modelId of models) {
    const { provider, modelName } = splitModelId(modelId);

    if (!groupMap.has(provider)) {
      groupMap.set(provider, {
        provider,
        label: provider,
        models: [],
      });
    }

    groupMap.get(provider)!.models.push({
      id: modelId,
      label: modelName,
      provider,
    });
  }

  const groups = Array.from(groupMap.values()).sort((a, b) =>
    a.provider.localeCompare(b.provider)
  );

  return groups;
}
