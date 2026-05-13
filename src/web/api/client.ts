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

function hasTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function mapHttpError(payload: any, status: number): AppError {
  return {
    code: payload?.code ?? payload?.error ?? (status === 409 ? "CONFLICT" : "INTERNAL_ERROR"),
    message: payload?.message ?? `Request failed with status ${status}`,
    conflictMtime: payload?.conflictMtime,
    validationErrors: payload?.validationErrors,
  };
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw mapHttpError(payload, response.status);
  }

  return payload as T;
}

export async function listProfiles(): Promise<ProfileListResult> {
  if (!hasTauriRuntime()) {
    return requestJson<ProfileListResult>("/api/profiles");
  }

  try {
    return await invoke<ProfileListResult>("list_profiles");
  } catch (err) {
    throw mapTauriError(err);
  }
}

export async function getProfile(id: string): Promise<ProfileConfigResult> {
  if (!hasTauriRuntime()) {
    return requestJson<ProfileConfigResult>(`/api/profiles/${encodeURIComponent(id)}`);
  }

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
  if (!hasTauriRuntime()) {
    return requestJson<SaveProfileResponse>(`/api/profiles/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify({
        payload: config,
        expectedMtime: expectedMtime ?? 0,
      }),
    });
  }

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
  if (!hasTauriRuntime()) {
    return requestJson<CopyProfileResponse>(`/api/profiles/${encodeURIComponent(sourceId)}/copy`, {
      method: "POST",
      body: JSON.stringify({ targetId }),
    });
  }

  try {
    return await invoke<CopyProfileResponse>("copy_profile", {
      request: {
        sourceId,
        targetId,
      },
    });
  } catch (err) {
    throw mapTauriError(err);
  }
}

export async function updateDisabledProviders(
  id: string,
  disabledProviders: string[]
): Promise<ProfileConfigResult> {
  if (!hasTauriRuntime()) {
    return requestJson<ProfileConfigResult>(`/api/profiles/${encodeURIComponent(id)}/disabled-providers`, {
      method: "PUT",
      body: JSON.stringify({ disabledProviders }),
    });
  }

  try {
    return await invoke<ProfileConfigResult>("update_disabled_providers", {
      request: {
        profileId: id,
        disabledProviders,
      },
    });
  } catch (err) {
    throw mapTauriError(err);
  }
}

export async function getGlobalConfig(): Promise<GlobalConfigResult> {
  if (!hasTauriRuntime()) {
    return requestJson<GlobalConfigResult>("/api/config/global");
  }

  try {
    return await invoke<GlobalConfigResult>("get_global_config");
  } catch (err) {
    throw mapTauriError(err);
  }
}

export async function updateGlobalConfig(
  updates: GlobalConfigUpdate
): Promise<UpdateGlobalConfigResponse> {
  if (!hasTauriRuntime()) {
    return requestJson<UpdateGlobalConfigResponse>("/api/config/global", {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  try {
    return await invoke<UpdateGlobalConfigResponse>("update_global_config", {
      request: updates,
    });
  } catch (err) {
    throw mapTauriError(err);
  }
}

export async function getErrorLogs(): Promise<ErrorLogsResult> {
  if (!hasTauriRuntime()) {
    return requestJson<ErrorLogsResult>("/api/logs/errors");
  }

  try {
    return await invoke<ErrorLogsResult>("get_error_logs");
  } catch (err) {
    throw mapTauriError(err);
  }
}

export async function getProviders(): Promise<ProvidersListResponse> {
  if (!hasTauriRuntime()) {
    return requestJson<ProvidersListResponse>("/api/config/providers");
  }

  try {
    return await invoke<ProvidersListResponse>("get_providers");
  } catch (err) {
    throw mapTauriError(err);
  }
}

export async function createProvider(
  request: CreateProviderRequest
): Promise<ProviderModelResponse> {
  if (!hasTauriRuntime()) {
    return requestJson<ProviderModelResponse>("/api/config/providers", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

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
  if (!hasTauriRuntime()) {
    return requestJson<ProviderModelResponse>(
      `/api/config/providers/${encodeURIComponent(providerName)}/models`,
      {
        method: "POST",
        body: JSON.stringify(request),
      },
    );
  }

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
  if (!hasTauriRuntime()) {
    return requestJson<ProviderModelResponse>(
      `/api/config/providers/${encodeURIComponent(providerName)}/models/${encodeURIComponent(modelName)}`,
      {
        method: "PUT",
        body: JSON.stringify(request),
      },
    );
  }

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
  if (!hasTauriRuntime()) {
    return requestJson<DeleteResponse>(
      `/api/config/providers/${encodeURIComponent(providerName)}/models/${encodeURIComponent(modelName)}`,
      { method: "DELETE" },
    );
  }

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
  if (!hasTauriRuntime()) {
    return requestJson<DeleteResponse>(
      `/api/config/providers/${encodeURIComponent(providerName)}`,
      { method: "DELETE" },
    );
  }

  try {
    return await invoke<DeleteResponse>("delete_provider", { providerName });
  } catch (err) {
    throw mapTauriError(err);
  }
}
