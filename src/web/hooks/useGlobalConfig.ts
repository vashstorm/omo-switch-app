import { useState, useCallback, useEffect } from "react";
import * as apiClient from "../api/client";
import type { AppError } from "../api/types";
import { DEFAULT_APP_ZOOM_PERCENT, normalizeAppZoomPercent } from "../zoom/appZoom";

export function useGlobalConfig() {
  const [syncReplaceEnabled, setSyncReplaceEnabled] = useState<boolean>(false);
  const [appZoomPercent, setAppZoomPercent] = useState<number>(DEFAULT_APP_ZOOM_PERCENT);
  const [defaultProfile, setDefaultProfile] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [initialized, setInitialized] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGlobalConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getGlobalConfig();
      setSyncReplaceEnabled(data.syncReplaceEnabled);
      setAppZoomPercent(normalizeAppZoomPercent(data.appZoomPercent));
      setDefaultProfile(data.defaultProfile ?? null);
    } catch (err: unknown) {
      const appError = err as AppError;
      setError(appError.message);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, []);

  const reloadGlobalConfig = useCallback(async () => {
    await fetchGlobalConfig();
  }, [fetchGlobalConfig]);

  const updateSyncReplaceEnabled = useCallback(async (value: boolean) => {
    const oldValue = syncReplaceEnabled;
    setSyncReplaceEnabled(value);
    try {
      await apiClient.updateGlobalConfig({ syncReplaceEnabled: value });
    } catch (err: unknown) {
      setSyncReplaceEnabled(oldValue);
      const appError = err as AppError;
      throw new Error(appError.message);
    }
  }, [syncReplaceEnabled]);

  const updateAppZoomPercent = useCallback(async (value: number) => {
    const normalizedValue = normalizeAppZoomPercent(value);
    const oldValue = appZoomPercent;
    setAppZoomPercent(normalizedValue);
    try {
      const result = await apiClient.updateGlobalConfig({ appZoomPercent: normalizedValue });
      setAppZoomPercent(normalizeAppZoomPercent(result.appZoomPercent ?? normalizedValue));
    } catch (err: unknown) {
      setAppZoomPercent(oldValue);
      const appError = err as AppError;
      throw new Error(appError.message);
    }
  }, [appZoomPercent]);

  const updateDefaultProfile = useCallback(async (profileId: string | null) => {
    const oldValue = defaultProfile;
    setDefaultProfile(profileId);
    try {
      const result = await apiClient.updateGlobalConfig({ defaultProfile: profileId });
      setDefaultProfile(result.defaultProfile ?? null);
    } catch (err: unknown) {
      setDefaultProfile(oldValue);
      const appError = err as AppError;
      throw new Error(appError.message);
    }
  }, [defaultProfile]);

  useEffect(() => {
    fetchGlobalConfig();
  }, [fetchGlobalConfig]);

  return {
    syncReplaceEnabled,
    appZoomPercent,
    defaultProfile,
    loading,
    initialized,
    error,
    updateSyncReplaceEnabled,
    updateAppZoomPercent,
    updateDefaultProfile,
    reloadGlobalConfig,
  };
}
