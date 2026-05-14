export type Variant = "low" | "medium" | "high" | "xhigh" | "max";

export type Temperature = number;

export interface UltraworkConfig {
  model?: string;
  variant?: Variant;
  prompt_append?: string;
}

export interface AgentConfig {
  model?: string;
  variant?: Variant;
  temperature?: Temperature;
  prompt_append?: string;
  fallback_models?: string[];
  ultrawork?: UltraworkConfig | null;
  maxTokens?: number;
  category?: string;
}

export interface CategoryConfig {
  model?: string;
  variant?: Variant;
  temperature?: Temperature;
  description?: string;
  prompt_append?: string;
  fallback_models?: string[];
}

export interface TmuxConfig {
  enabled?: boolean;
}

export interface GitMasterConfig {
  enabled?: boolean;
  commit_footer?: boolean;
  include_co_authored_by?: boolean;
  git_env_prefix?: string;
}

export interface MiscConfig {
  tmux?: TmuxConfig;
  git_master?: GitMasterConfig;
  [key: string]: unknown;
}

export interface ProfileEntry {
  name: string;
  path: string;
}

export interface ProfileManifest {
  profiles: ProfileEntry[];
}

export interface ManagedFieldDefinition {
  required: boolean;
  omitWhenEmpty: boolean;
}

export interface ManagedFields {
  agent: Record<string, ManagedFieldDefinition>;
  category: Record<string, ManagedFieldDefinition>;
  misc: {
    tmux: Record<string, ManagedFieldDefinition>;
    git_master: Record<string, ManagedFieldDefinition>;
  };
}

export interface EffectiveConfig {
  agents: Record<string, AgentConfig>;
  categories: Record<string, CategoryConfig>;
  misc: MiscConfig;
}

export interface EditableAgentPayload {
  model?: string;
  variant?: Variant;
  temperature?: Temperature;
  prompt_append?: string;
  fallback_models?: string[];
  ultrawork?: UltraworkConfig | null;
  maxTokens?: number;
  category?: string;
}

export interface EditableCategoryPayload {
  model?: string;
  variant?: Variant;
  temperature?: Temperature;
  description?: string;
  prompt_append?: string;
  fallback_models?: string[];
}

export interface EditableMiscPayload {
  tmux?: TmuxConfig;
  git_master?: GitMasterConfig;
  [key: string]: unknown;
}

export interface EditablePayload {
  agents: Record<string, EditableAgentPayload>;
  categories: Record<string, EditableCategoryPayload>;
  misc: EditableMiscPayload;
}

export interface AgentRoleInfo {
  id: string;
  name: string;
  description: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
}
