export interface ManagedFieldDefinition {
  required: boolean;
  omitWhenEmpty: boolean;
}

export const ULTRAWORK_MANAGED_FIELDS: Record<string, ManagedFieldDefinition> = {
  model: { required: false, omitWhenEmpty: true },
  variant: { required: false, omitWhenEmpty: true },
  prompt_append: { required: false, omitWhenEmpty: true },
};

export const AGENT_MANAGED_FIELDS: Record<string, ManagedFieldDefinition> = {
  model: { required: false, omitWhenEmpty: true },
  variant: { required: false, omitWhenEmpty: true },
  temperature: { required: false, omitWhenEmpty: true },
  prompt_append: { required: false, omitWhenEmpty: true },
  fallback_models: { required: false, omitWhenEmpty: true },
  ultrawork: { required: false, omitWhenEmpty: true },
  maxTokens: { required: false, omitWhenEmpty: true },
  category: { required: false, omitWhenEmpty: true },
};

export const CATEGORY_MANAGED_FIELDS: Record<string, ManagedFieldDefinition> = {
  model: { required: false, omitWhenEmpty: true },
  variant: { required: false, omitWhenEmpty: true },
  temperature: { required: false, omitWhenEmpty: true },
  description: { required: false, omitWhenEmpty: true },
  prompt_append: { required: false, omitWhenEmpty: true },
  fallback_models: { required: false, omitWhenEmpty: true },
};

export const TMUX_MANAGED_FIELDS: Record<string, ManagedFieldDefinition> = {
  enabled: { required: false, omitWhenEmpty: false },
};

export const GIT_MASTER_MANAGED_FIELDS: Record<string, ManagedFieldDefinition> = {
  enabled: { required: false, omitWhenEmpty: false },
  commit_footer: { required: false, omitWhenEmpty: false },
  include_co_authored_by: { required: false, omitWhenEmpty: false },
  git_env_prefix: { required: false, omitWhenEmpty: false },
};

export const MISC_MANAGED_FIELDS = {
  tmux: TMUX_MANAGED_FIELDS,
  git_master: GIT_MASTER_MANAGED_FIELDS,
};

export function shouldOmitField(
  value: unknown,
  definition: ManagedFieldDefinition,
  fieldName?: string
): boolean {
  if (!definition.omitWhenEmpty) {
    return false;
  }

  if (value === undefined || value === null) {
    return true;
  }

  if (typeof value === "string" && value === "") {
    return true;
  }

  if (Array.isArray(value) && value.length === 0) {
    return true;
  }

  // Temperature === 0 is considered default value, omit from JSON output
  if (fieldName === "temperature" && typeof value === "number" && value === 0) {
    return true;
  }

  return false;
}

export function filterEmptyFields<T extends Record<string, unknown>>(
  obj: T,
  managedFields: Record<string, ManagedFieldDefinition>
): Partial<T> {
  const result: Partial<T> = {};

  for (const [key, value] of Object.entries(obj)) {
    const definition = managedFields[key];
    if (!definition) {
      continue;
    }

    if (!shouldOmitField(value, definition, key)) {
      (result as Record<string, unknown>)[key] = value;
    }
  }

  return result;
}
