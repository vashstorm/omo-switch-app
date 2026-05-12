import { useState, useCallback, useEffect } from "react";
import * as apiClient from "../api/client";
import type { AppError, ModelConfig, CreateModelRequest, UpdateModelRequest } from "../api/types";
import type { ProvidersListResponse } from "../api/types";

export interface ProviderEntry {
  name: string;
  models: { name: string; config: ModelConfig }[];
}

export function useProviders() {
  const [providers, setProviders] = useState<ProvidersListResponse["providers"] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [initialized, setInitialized] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProviders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getProviders();
      setProviders(data.providers);
    } catch (err: unknown) {
      const appError = err as AppError;
      setError(appError.message);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, []);

  const reloadProviders = useCallback(async () => {
    await fetchProviders();
  }, [fetchProviders]);

  const createProvider = useCallback(
    async (name: string) => {
      try {
        await apiClient.createProvider({ name });
        await reloadProviders();
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
        await reloadProviders();
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
        await reloadProviders();
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
        await reloadProviders();
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
        await reloadProviders();
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

  const providersList: ProviderEntry[] = providers
    ? Object.entries(providers)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, models]) => ({
          name,
          models: Object.entries(models)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([modelName, config]) => ({ name: modelName, config })),
        }))
    : [];

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
