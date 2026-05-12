/**
 * API client for Tauri commands.
 * Centralizes all invoke() calls for the app frontend.
 */

import { invoke } from "@tauri-apps/api/core";
import type {
  ProfileListResult,
  ProfileConfigResult,
  SaveProfileResponse,
  CopyProfileResponse,
  GlobalConfigResult,
  GlobalConfigUpdate,
  UpdateGlobalConfigResponse,
  ErrorLogsResult,
  AppError,
  TauriErrorResponse,
  EditableConfig,
  ProvidersListResponse,
  CreateProviderRequest,
  CreateModelRequest,
  UpdateModelRequest,
  ProviderModelResponse,
  DeleteResponse,
} from "./types";

function mapTauriError(err: unknown): AppError {
  if (err && typeof err === "object" && "code" in err && "message" in err) {
    const tauriErr = err as TauriErrorResponse;
    return {
      code: tauriErr.code,
      message: tauriErr.message,
      conflictMtime: tauriErr.conflictMtime,
      validationErrors: tauriErr.validationErrors,
    };
  }
  return {
    code: "INTERNAL_ERROR",
    message: err instanceof Error ? err.message : String(err),
  };
}

export async function listProfiles(): Promise<ProfileListResult> {
  try {
    return await invoke<ProfileListResult>("list_profiles");
  } catch (err) {
    throw mapTauriError(err);
  }
}

export async function getProfile(id: string): Promise<ProfileConfigResult> {
  try {
    return await invoke<ProfileConfigResult>("get_profile", { profileId: id });
  } catch (err) {
    throw mapTauriError(err);
  }
}

export async function saveProfile(
  id: string,
  config: EditableConfig,
  expectedMtime: number | null
): Promise<SaveProfileResponse> {
  try {
    const request = {
      profileId: id,
      payload: config,
      expectedMtime: expectedMtime ?? 0,
    };
    return await invoke<SaveProfileResponse>("save_profile", { request });
  } catch (err) {
    throw mapTauriError(err);
  }
}

export async function copyProfile(
  sourceId: string,
  targetId: string
): Promise<CopyProfileResponse> {
  try {
    return await invoke<CopyProfileResponse>("copy_profile", {
      sourceId,
      targetId,
    });
  } catch (err) {
    throw mapTauriError(err);
  }
}

export async function updateDisabledProviders(
  id: string,
  disabledProviders: string[]
): Promise<ProfileConfigResult> {
  try {
    return await invoke<ProfileConfigResult>("update_disabled_providers", {
      profileId: id,
      disabledProviders,
    });
  } catch (err) {
    throw mapTauriError(err);
  }
}

export async function getGlobalConfig(): Promise<GlobalConfigResult> {
  try {
    return await invoke<GlobalConfigResult>("get_global_config");
  } catch (err) {
    throw mapTauriError(err);
  }
}

export async function updateGlobalConfig(
  updates: GlobalConfigUpdate
): Promise<UpdateGlobalConfigResponse> {
  try {
    return await invoke<UpdateGlobalConfigResponse>("update_global_config", updates);
  } catch (err) {
    try {
      return await invoke<UpdateGlobalConfigResponse>("update_global_config", {
        request: updates,
      });
    } catch (wrappedErr) {
      throw mapTauriError(wrappedErr);
    }
  }
}

export async function getErrorLogs(): Promise<ErrorLogsResult> {
  try {
    return await invoke<ErrorLogsResult>("get_error_logs");
  } catch (err) {
    throw mapTauriError(err);
  }
}

export async function getProviders(): Promise<ProvidersListResponse> {
  try {
    return await invoke<ProvidersListResponse>("get_providers");
  } catch (err) {
    throw mapTauriError(err);
  }
}

export async function createProvider(
  request: CreateProviderRequest
): Promise<ProviderModelResponse> {
  try {
    return await invoke<ProviderModelResponse>("create_provider", { request });
  } catch (err) {
    throw mapTauriError(err);
  }
}

export async function createModel(
  providerName: string,
  request: CreateModelRequest
): Promise<ProviderModelResponse> {
  try {
    return await invoke<ProviderModelResponse>("create_model", {
      providerName,
      request,
    });
  } catch (err) {
    throw mapTauriError(err);
  }
}

export async function updateModel(
  providerName: string,
  modelName: string,
  request: UpdateModelRequest
): Promise<ProviderModelResponse> {
  try {
    return await invoke<ProviderModelResponse>("update_model", {
      providerName,
      modelName,
      request,
    });
  } catch (err) {
    throw mapTauriError(err);
  }
}

export async function deleteModel(
  providerName: string,
  modelName: string
): Promise<DeleteResponse> {
  try {
    return await invoke<DeleteResponse>("delete_model", {
      providerName,
      modelName,
    });
  } catch (err) {
    throw mapTauriError(err);
  }
}

export async function deleteProvider(
  providerName: string
): Promise<DeleteResponse> {
  try {
    return await invoke<DeleteResponse>("delete_provider", { providerName });
  } catch (err) {
    throw mapTauriError(err);
  }
}
