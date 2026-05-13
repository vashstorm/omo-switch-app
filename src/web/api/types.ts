/**
 * Tauri command request/response type definitions.
 *
 * These interfaces mirror the Rust structs in src-tauri/src/contracts.rs
 * and must remain in sync with the backend API contracts.
 */

export interface AppErrorPayload {
  code: string;
  message: string;
}

export interface HealthResponse {
  status: string;
}

export interface ProfileItem {
  id: string;
  label: string;
}

export interface ListProfilesResponse {
  profiles: ProfileItem[];
}

export interface UltraworkConfig {
  model?: string;
  variant?: string;
  prompt_append?: string;
}

export interface AgentConfig {
  model?: string;
  variant?: string;
  temperature?: number;
  prompt_append?: string;
  fallback_models?: string[];
  ultrawork?: UltraworkConfig | null;
  maxTokens?: number;
  category?: string;
  [key: string]: unknown;
}

export interface CategoryConfig {
  model?: string;
  variant?: string;
  temperature?: number;
  description?: string;
  prompt_append?: string;
  fallback_models?: string[];
  [key: string]: unknown;
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
}

export interface EditableConfig {
  agents: Record<string, AgentConfig | null>;
  categories: Record<string, CategoryConfig | null>;
  misc?: Partial<MiscConfig>;
}

export interface BaselineConfig {
  agents: Record<string, AgentConfig>;
  categories: Record<string, CategoryConfig>;
  misc: MiscConfig;
}

export interface EffectiveConfig {
  agents: Record<string, AgentConfig>;
  categories: Record<string, CategoryConfig>;
  misc: MiscConfig;
}

export interface ReadonlyTailConfig {
  [key: string]: unknown;
}

export interface ConfigFieldError {
  path: string;
  message: string;
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

export interface ProfileConfigResult {
  baseline: BaselineConfig;
  editable: EditableConfig;
  readonlyTail: ReadonlyTailConfig;
  effective: EffectiveConfig;
  rawMisc: Record<string, unknown>;
  availableModels: string[];
  availableModelGroups: ModelGroup[];
  disabledProviders: string[];
  providerCatalog: string[];
  mtime: number;
  errors: ConfigFieldError[];
}

export interface SaveProfileRequest {
  profileId: string;
  payload: EditableConfig;
  expectedMtime: number;
}

export interface SaveProfileResponse {
  success: boolean;
  mtime?: number;
}

export interface UpdateDisabledProvidersRequest {
  profileId: string;
  disabledProviders: string[];
}

export interface CopyProfileRequest {
  sourceId: string;
  targetId: string;
}

export interface CopyProfileResponse {
  profile: ProfileItem;
}

export interface GlobalConfigResponse {
  syncReplaceEnabled: boolean;
  appZoomPercent: number;
  defaultProfile: string | null;
}

export interface UpdateGlobalConfigRequest {
  syncReplaceEnabled?: boolean;
  appZoomPercent?: number;
  defaultProfile?: string | null;
}

export interface UpdateGlobalConfigResponse {
  syncReplaceEnabled?: boolean;
  appZoomPercent?: number;
  defaultProfile?: string | null;
}

export interface BackendErrorLogEntry {
  timestamp?: string;
  level?: string;
  module?: string;
  message?: string;
  detail?: string | null;
}

export interface ErrorLogsResponse {
  entries: Array<string | BackendErrorLogEntry>;
  sourceFile: string;
  truncated: boolean;
  readError?: string;
}

export const ERROR_CODES = {
  SCAN_ERROR: "SCAN_ERROR",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  CONFLICT: "CONFLICT",
  WRITE_ERROR: "WRITE_ERROR",
  COPY_ERROR: "COPY_ERROR",
  READ_ERROR: "READ_ERROR",
  INVALID_JSON: "INVALID_JSON",
  PROFILE_NOT_FOUND: "PROFILE_NOT_FOUND",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export interface AppError {
  code: ErrorCode;
  message: string;
  conflictMtime?: number;
  validationErrors?: string[];
}

export interface TauriErrorResponse {
  code: ErrorCode;
  message: string;
  conflictMtime?: number;
  validationErrors?: string[];
}

export type ProfileListResult = ListProfilesResponse;

export type CopyResult = { id: string; label: string };

export type GlobalConfigResult = GlobalConfigResponse;

export interface GlobalConfigUpdate {
  syncReplaceEnabled?: boolean;
  appZoomPercent?: number;
  defaultProfile?: string | null;
  disabledProviders?: string[];
  [key: string]: unknown;
}

export interface ModelConfig {
  type?: string;
  maxTokens?: number;
  [key: string]: unknown;
}

export type ProviderModels = string[];

export interface ProvidersListResponse {
  providers: Record<string, ProviderModels>;
}

export interface CreateProviderRequest {
  name: string;
}

export interface CreateModelRequest {
  name: string;
  maxTokens?: number;
  [key: string]: unknown;
}

export interface UpdateModelRequest {
  maxTokens?: number;
  [key: string]: unknown;
}

export interface ProviderModelResponse {
  success: boolean;
}

export interface DeleteResponse {
  success: boolean;
}

export interface ErrorLogsResult {
  entries: Array<string | BackendErrorLogEntry>;
  sourceFile: string;
  truncated: boolean;
  readError?: string;
}
