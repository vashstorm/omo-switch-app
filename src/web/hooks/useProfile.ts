import { useState, useCallback, useEffect, useRef } from "react";
import type { ModelGroup } from "../../shared/config/types";
import * as apiClient from "../api/client";
import type { AppError, ProfileConfigResult as ApiProfileConfigResult } from "../api/types";

export interface ProfileItem {
  id: string;
  label: string;
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

export interface MiscConfig {
  tmux?: { enabled?: boolean };
  git_master?: { enabled?: boolean; commit_footer?: boolean; include_co_authored_by?: boolean; git_env_prefix?: string };
  [key: string]: unknown;
}

export interface EditableConfig {
  agents: Record<string, Partial<AgentConfig> | null>;
  categories: Record<string, Partial<CategoryConfig> | null>;
  misc?: Partial<MiscConfig>;
}

export type ProfileConfigResult = ApiProfileConfigResult;

export interface CopyProfileResult {
  success: boolean;
  profile?: { id: string; label: string };
  error?: string;
  status?: number;
}

export function useProfile(profileId: string | null) {
  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const [currentProfile, setCurrentProfile] = useState<ProfileConfigResult | null>(null);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const fetchProfiles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.listProfiles();
      setProfiles(data.profiles || []);
    } catch (err: unknown) {
      const appError = err as AppError;
      setError(appError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProfileDetail = useCallback(async (id: string) => {
    const requestId = ++requestIdRef.current;
    try {
      setLoading(true);
      setIsSwitching(true);
      setError(null);
      setCurrentProfile(null);
      setCurrentProfileId(null);
      const data = await apiClient.getProfile(id);
      if (requestId === requestIdRef.current) {
        setCurrentProfile(data);
        setCurrentProfileId(id);
      }
    } catch (err: unknown) {
      if (requestId === requestIdRef.current) {
        const appError = err as AppError;
        setError(appError.message);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setIsSwitching(false);
      }
    }
  }, []);

  const saveProfile = useCallback(async (id: string, payload: EditableConfig, expectedMtime: number) => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiClient.saveProfile(id, payload, expectedMtime);
      setCurrentProfile((prev) => prev ? { ...prev, mtime: result.mtime ?? 0, editable: payload } : prev);
      return { success: true, mtime: result.mtime };
    } catch (err: unknown) {
      const appError = err as AppError;
      return { success: false, error: appError.message, status: appError.code === "CONFLICT" ? 409 : 400 };
    } finally {
      setLoading(false);
    }
  }, []);

  const copyProfile = useCallback(async (sourceId: string, targetId: string): Promise<CopyProfileResult> => {
    try {
      const result = await apiClient.copyProfile(sourceId, targetId);
      return { success: true, profile: { id: result.profile.id, label: result.profile.label } };
    } catch (err: unknown) {
      const appError = err as AppError;
      return { success: false, error: appError.message, status: appError.code === "CONFLICT" ? 409 : 400 };
    }
  }, []);

  const updateDisabledProviders = useCallback(async (profileId: string, disabledProviders: string[]): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.updateDisabledProviders(profileId, disabledProviders);
      setCurrentProfile(data);
    } catch (err: unknown) {
      const appError = err as AppError;
      setError(appError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  useEffect(() => {
    if (profileId) {
      fetchProfileDetail(profileId);
    } else {
      setCurrentProfile(null);
      setCurrentProfileId(null);
    }
  }, [profileId, fetchProfileDetail]);

  const visibleCurrentProfile =
    profileId !== null && currentProfileId === profileId
      ? currentProfile
      : null;

  return {
    profiles,
    currentProfile: visibleCurrentProfile,
    loading,
    isSwitching,
    error,
    saveProfile,
    copyProfile,
    updateDisabledProviders,
    refreshProfiles: fetchProfiles,
    reloadProfile: () => profileId ? fetchProfileDetail(profileId) : undefined,
    setError
  };
}
