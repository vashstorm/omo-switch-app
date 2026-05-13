import { useState, useCallback, useEffect, useMemo } from "react";
import * as apiClient from "../api/client";
import type { AppError, CreateModelRequest, ModelConfig, UpdateModelRequest } from "../api/types";
import type { ProvidersListResponse } from "../api/types";

export interface ProviderEntry {
  name: string;
  models: { name: string; config: ModelConfig }[];
}

function normalizeProviderModels(models: ProvidersListResponse["providers"][string]): ProviderEntry["models"] {
  return (Array.isArray(models) ? models : [])
    .map((name) => ({ name, config: {} }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function useProviders() {
  const [providers, setProviders] = useState<ProvidersListResponse["providers"] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [initialized, setInitialized] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProviders = useCallback(async (background = false) => {
    try {
      if (!background) setLoading(true);
      setError(null);
      const data = await apiClient.getProviders();
      setProviders(data.providers);
    } catch (err: unknown) {
      const appError = err as AppError;
      setError(appError.message);
    } finally {
      if (!background) setLoading(false);
      setInitialized(true);
    }
  }, []);

  const reloadProviders = useCallback(async (background = false) => {
    await fetchProviders(background);
  }, [fetchProviders]);

  const createProvider = useCallback(
    async (name: string) => {
      try {
        await apiClient.createProvider({ name });
        await reloadProviders(true);
      } catch (err: unknown) {
        const appError = err as AppError;
        throw new Error(appError.message);
      }
    },
    [reloadProviders]
  );

  const createModel = useCallback(
    async (providerName: string, request: CreateModelRequest) => {
      try {
        await apiClient.createModel(providerName, request);
        await reloadProviders(true);
      } catch (err: unknown) {
        const appError = err as AppError;
        throw new Error(appError.message);
      }
    },
    [reloadProviders]
  );

  const updateModel = useCallback(
    async (providerName: string, modelName: string, request: UpdateModelRequest) => {
      try {
        await apiClient.updateModel(providerName, modelName, request);
        await reloadProviders(true);
      } catch (err: unknown) {
        const appError = err as AppError;
        throw new Error(appError.message);
      }
    },
    [reloadProviders]
  );

  const deleteModel = useCallback(
    async (providerName: string, modelName: string) => {
      try {
        await apiClient.deleteModel(providerName, modelName);
        await reloadProviders(true);
      } catch (err: unknown) {
        const appError = err as AppError;
        throw new Error(appError.message);
      }
    },
    [reloadProviders]
  );

  const deleteProvider = useCallback(
    async (providerName: string) => {
      try {
        await apiClient.deleteProvider(providerName);
        await reloadProviders(true);
      } catch (err: unknown) {
        const appError = err as AppError;
        throw new Error(appError.message);
      }
    },
    [reloadProviders]
  );

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const providersList: ProviderEntry[] = useMemo(() => (
    providers
      ? Object.entries(providers)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([name, models]) => ({
            name,
            models: normalizeProviderModels(models),
          }))
      : []
  ), [providers]);

  return {
    providers,
    providersList,
    loading,
    initialized,
    error,
    createProvider,
    createModel,
    updateModel,
    deleteModel,
    deleteProvider,
    reloadProviders,
  };
}
