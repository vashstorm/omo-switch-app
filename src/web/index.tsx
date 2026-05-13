import { lazy, Suspense, useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useProfile, EditableConfig, AgentConfig } from "./hooks/useProfile";
import { useGlobalConfig } from "./hooks/useGlobalConfig";
import { useThemePreference } from "./theme/ThemeContext";
import { useKeyboardShortcut } from "./hooks/useKeyboardShortcut";
import { addErrorLogEntry } from "./error-log";
import { setupWindowErrorListeners } from "./error-log/capture";
import { AppShell } from "./components/AppShell";
import { ProfileSelector } from "./components/ProfileSelector";
import { SyncReplaceToggle } from "./components/sync-replace/SyncReplaceToggle";
import { ThemeToggle } from "./components/ThemeToggle";
import { ZoomControls } from "./components/ZoomControls";
import { MiscEditor } from "./components/misc/MiscEditor";
import { ProvidersEditor } from "./components/misc/ProvidersEditor";
import { useProviders } from "./hooks/useProviders";
import { AgentEditor } from "./components/agents/AgentEditor";
import { CategoryEditor } from "./components/categories/CategoryEditor";
import { ConfirmDialog } from "./components/common/ConfirmDialog";
import { LoadingPanel } from "./components/common/LoadingPanel";
import { ToastViewport } from "./components/common/ToastViewport";
import { useUnifiedErrorLog } from "./hooks/useUnifiedErrorLog";
import { collectSyncReplaceImpact, applySyncReplace, applySyncReplaceOne, SyncReplaceImpact } from "./sync-replace/modelSync";
import { buildReferenceImpactIndex, ReferenceImpactEntry } from "./providers/referenceImpact";
import { getModelDisplayInfo } from "../shared/model-catalog";
import { Copy, RefreshCw, Star, StarOff, X } from "lucide-react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import { alpha, useTheme } from "@mui/material/styles";
import { lightTokens, darkTokens } from "./theme/designTokens";
import {
  APP_ZOOM_STEP_PERCENT,
  DEFAULT_APP_ZOOM_PERCENT,
  applyAppZoomPercent,
  normalizeAppZoomPercent,
} from "./zoom/appZoom";

const LazyRawConfigDialog = lazy(() => import("./components/common/RawConfigDialog"));
const LazySyncReplacePreviewDialog = lazy(() =>
  import("./components/sync-replace/SyncReplacePreviewDialog").then((mod) => ({
    default: mod.SyncReplacePreviewDialog,
  })),
);
const LazyErrorLogPanel = lazy(() =>
  import("./components/common/ErrorLogPanel").then((mod) => ({
    default: mod.ErrorLogPanel,
  })),
);

interface Toast {
  id: number;
  type: "success" | "error";
  message: string;
}

let toastCounter = 0;

export function App() {
  const { resolvedTheme, setTheme } = useThemePreference();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const tokens = isDark ? darkTokens : lightTokens;
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editableConfig, setEditableConfig] = useState<EditableConfig | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [copyTargetId, setCopyTargetId] = useState("");
  const [copyLoading, setCopyLoading] = useState(false);
  const [copyDialogError, setCopyDialogError] = useState<string | null>(null);
  const [showRawModal, setShowRawModal] = useState(false);
  const [globalCollapseKey, setGlobalCollapseKey] = useState(0);
  const [globalExpandKey, setGlobalExpandKey] = useState(0);
  const [expandAgentTarget, setExpandAgentTarget] = useState<string | null>(null);
  const [expandCategoryTarget, setExpandCategoryTarget] = useState<string | null>(null);
  const [expandMiscTarget, setExpandMiscTarget] = useState<string | null>(null);
  const [agentsCollapsed, setAgentsCollapsed] = useState(false);
  const [categoriesCollapsed, setCategoriesCollapsed] = useState(false);
  const [miscCollapsed, setMiscCollapsed] = useState(false);
  const [pendingProfileId, setPendingProfileId] = useState<string | null>(null);
  const [pendingReload, setPendingReload] = useState(false);
  const [pendingTotalReload, setPendingTotalReload] = useState(false);
  const [pendingSyncReplace, setPendingSyncReplace] = useState<{
    kind: "agent" | "category";
    id: string;
    previousModel: string;
    nextModel: string;
  } | null>(null);
  const copyInputRef = useRef<HTMLInputElement>(null);
  const [respectsMotion, setRespectsMotion] = useState(true);
  const [errorLogExpanded, setErrorLogExpanded] = useState(false);
  const {
    entries: errorLogEntries,
    loading: errorLogLoading,
    readError: errorLogReadError,
    refresh: errorLogRefresh,
    hasUnread: errorLogHasUnread,
    markSeen: errorLogMarkSeen,
  } = useUnifiedErrorLog();

  useEffect(() => {
    if (typeof window.matchMedia !== "function" && typeof window.matchMedia !== "object") return;
    try {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      setRespectsMotion(!mq.matches);
      const handler = (e: MediaQueryListEvent) => setRespectsMotion(!e.matches);
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    } catch {
      // matchMedia not available in test environment, assume motion is respected
    }
  }, []);

  const {
    profiles,
    currentProfile,
    loading,
    isSwitching,
    error,
    saveProfile,
    copyProfile,
    updateDisabledProviders,
    refreshProfiles,
    reloadProfile,
    setError
  } = useProfile(selectedProfileId);

  const {
    syncReplaceEnabled,
    appZoomPercent,
    defaultProfile,
    loading: globalConfigLoading,
    initialized: globalConfigInitialized,
    error: globalConfigError,
    updateSyncReplaceEnabled,
    updateAppZoomPercent,
    updateDefaultProfile,
    reloadGlobalConfig,
  } = useGlobalConfig();

  const {
    providersList,
    loading: providersLoading,
    error: providersError,
    createProvider,
    createModel,
    updateModel,
    deleteModel: deleteModelFn,
    deleteProvider: deleteProviderFn,
    reloadProviders,
  } = useProviders();

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: "success" | "error", message: string) => {
    const id = ++toastCounter;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const handleCreateProvider = useCallback(async (name: string) => {
    await createProvider(name);
    reloadProfile();
  }, [createProvider, reloadProfile]);

  const handleCreateModel = useCallback(async (providerName: string, request: Parameters<typeof createModel>[1]) => {
    await createModel(providerName, request);
    reloadProfile();
  }, [createModel, reloadProfile]);

  const handleUpdateModel = useCallback(async (providerName: string, modelName: string, request: Parameters<typeof updateModel>[2]) => {
    await updateModel(providerName, modelName, request);
    reloadProfile();
  }, [updateModel, reloadProfile]);

  const handleDeleteModel = useCallback(async (providerName: string, modelName: string) => {
    await deleteModelFn(providerName, modelName);
    reloadProfile();
  }, [deleteModelFn, reloadProfile]);

  const handleDeleteProvider = useCallback(async (providerName: string) => {
    await deleteProviderFn(providerName);
    reloadProfile();
  }, [deleteProviderFn, reloadProfile]);

  useEffect(() => {
    if (!error) return;

    addErrorLogEntry("frontend-request", error, null, "useProfile");
  }, [error]);

  useEffect(() => {
    if (!conflictError) return;

    addErrorLogEntry("frontend-request", conflictError, null, "profile-save");
  }, [conflictError]);

  useEffect(() => {
    if (!copyDialogError) return;

    addErrorLogEntry("frontend-request", copyDialogError, null, "profile-copy");
  }, [copyDialogError]);

  useEffect(() => {
    if (!globalConfigError) return;

    addErrorLogEntry("frontend-startup", globalConfigError, null, "useGlobalConfig");
  }, [globalConfigError]);

  useEffect(() => setupWindowErrorListeners(addErrorLogEntry), []);

  const switchToProfile = useCallback((nextProfileId: string) => {
    setSuccessMessage(null);
    setConflictError(null);
    setEditableConfig(null);
    setIsDirty(false);
    setSelectedProfileId(nextProfileId);
  }, []);

  useEffect(() => {
    if (profiles.length > 0 && !selectedProfileId && globalConfigInitialized) {
      const targetProfile = defaultProfile && profiles.some(p => p.id === defaultProfile)
        ? defaultProfile
        : profiles[0].id;
      switchToProfile(targetProfile);
    }
  }, [profiles, selectedProfileId, defaultProfile, globalConfigInitialized, switchToProfile]);

  useEffect(() => {
    if (currentProfile && !isSwitching) {
      setEditableConfig(currentProfile.editable);
      setConflictError(null);
      setError(null);
      setIsDirty(false);
      return;
    }

    if (!currentProfile) {
      setEditableConfig(null);
      setIsDirty(false);
    }
  }, [currentProfile, isSwitching, setError]);

  useEffect(() => {
    if (showCopyDialog && copyInputRef.current) {
      copyInputRef.current.focus();
    }
  }, [showCopyDialog]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const handleSyncReplaceToggle = useCallback(async (value: boolean) => {
    try {
      await updateSyncReplaceEnabled(value);
    } catch {
      addToast("error", "Failed to save Sync Replace preference");
    }
  }, [updateSyncReplaceEnabled, addToast]);

  useEffect(() => {
    void applyAppZoomPercent(appZoomPercent);
  }, [appZoomPercent]);

  const handleAppZoomChange = useCallback(async (value: number) => {
    const nextValue = normalizeAppZoomPercent(value);
    try {
      await updateAppZoomPercent(nextValue);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save zoom preference";
      addToast("error", `Failed to save zoom preference: ${message}`);
    }
  }, [updateAppZoomPercent, addToast]);

  const handleZoomOut = useCallback(() => {
    void handleAppZoomChange(appZoomPercent - APP_ZOOM_STEP_PERCENT);
  }, [appZoomPercent, handleAppZoomChange]);

  const handleZoomIn = useCallback(() => {
    void handleAppZoomChange(appZoomPercent + APP_ZOOM_STEP_PERCENT);
  }, [appZoomPercent, handleAppZoomChange]);

  const handleZoomReset = useCallback(() => {
    void handleAppZoomChange(DEFAULT_APP_ZOOM_PERCENT);
  }, [handleAppZoomChange]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) {
        return;
      }

      if (event.key === "0" || event.code === "Numpad0") {
        event.preventDefault();
        handleZoomReset();
        return;
      }

      if (event.key === "-" || event.code === "NumpadSubtract") {
        event.preventDefault();
        handleZoomOut();
        return;
      }

      if (event.key === "+" || event.key === "=" || event.code === "NumpadAdd") {
        event.preventDefault();
        handleZoomIn();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleZoomIn, handleZoomOut, handleZoomReset]);

  const handleTotalReload = () => {
    if (isDirty) {
      setPendingTotalReload(true);
      return;
    }
    performTotalReload();
  };

  const performTotalReload = async () => {
    setSuccessMessage(null);
    setConflictError(null);
    setError(null);
    
    await reloadGlobalConfig();
    await refreshProfiles();
    
    if (selectedProfileId) {
      const profileStillExists = profiles.some(p => p.id === selectedProfileId);
      if (profileStillExists) {
        reloadProfile();
      } else {
        const newDefault = defaultProfile && profiles.some(p => p.id === defaultProfile)
          ? defaultProfile
          : profiles[0]?.id ?? null;
        if (newDefault) {
          switchToProfile(newDefault);
        } else {
          setSelectedProfileId(null);
          setEditableConfig(null);
        }
      }
    }
    
    addToast("success", "All configurations reloaded");
  };

  const handleTotalReloadConfirm = () => {
    performTotalReload();
    setPendingTotalReload(false);
  };

  const handleTotalReloadCancel = () => {
    setPendingTotalReload(false);
  };

  const handleSetDefaultProfile = async () => {
    if (!selectedProfileId) return;
    try {
      await updateDefaultProfile(selectedProfileId);
      addToast("success", `Profile "${selectedProfileId}" set as default`);
    } catch {
      addToast("error", "Failed to set default profile");
    }
  };

  const handleProfileChange = (id: string) => {
    if (isDirty) {
      setPendingProfileId(id);
      return;
    }
    switchToProfile(id);
  };

  const handleProfileSwitchConfirm = () => {
    if (pendingProfileId !== null) {
      switchToProfile(pendingProfileId);
      setPendingProfileId(null);
    }
  };

  const handleProfileSwitchCancel = () => {
    setPendingProfileId(null);
  };

  const handleSave = async () => {
    if (!selectedProfileId || !currentProfile || !editableConfig) return;

    setError(null);
    setConflictError(null);
    setSuccessMessage(null);
    setIsSaving(true);
    setSaveSuccess(false);

    const result = await saveProfile(selectedProfileId, editableConfig, currentProfile.mtime);

    setIsSaving(false);

    if (result.success) {
      setIsDirty(false);
      setSuccessMessage("Saved successfully");
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 800);
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      if (result.status === 409) {
        setConflictError(result.error || "Conflict: File modified externally.");
      } else {
        setError(result.error || "Validation error");
      }
    }
  };

  useKeyboardShortcut({
    onTrigger: handleSave,
    enabled: isDirty && !loading && !!selectedProfileId
  });

  const handleReset = () => {
    setConflictError(null);
    setError(null);
    setSuccessMessage(null);
    if (currentProfile) {
      setEditableConfig(currentProfile.editable);
      setIsDirty(false);
    }
  };

  const handleReload = () => {
    if (isDirty) {
      setPendingReload(true);
      return;
    }
    setSuccessMessage(null);
    reloadProfile();
  };

  const handleReloadConfirm = () => {
    setSuccessMessage(null);
    reloadProfile();
    setPendingReload(false);
  };

  const handleReloadCancel = () => {
    setPendingReload(false);
  };

  const handleAgentsChange = useCallback((newAgentsConfig: Record<string, Partial<AgentConfig> | null>) => {
    setEditableConfig((current) => {
      if (!current) return current;
      return {
        ...current,
        agents: newAgentsConfig,
      };
    });
    setIsDirty(true);
  }, []);

  const handleCreateAgent = (id: string) => {
    if (!editableConfig) return;
    handleAgentsChange({
      ...editableConfig.agents,
      [id]: { model: availableModels[0] || "" }
    });
    setAgentsCollapsed(false);
    setExpandAgentTarget(id);
    setTimeout(() => setExpandAgentTarget(null), 100);
  };

  const handleCategoriesChange = useCallback((newCategoriesConfig: EditableConfig["categories"]) => {
    setEditableConfig((current) => {
      if (!current) return current;
      return {
        ...current,
        categories: newCategoriesConfig,
      };
    });
    setIsDirty(true);
  }, []);

  const applyModelChange = useCallback((
    kind: "agent" | "category",
    id: string,
    nextModel: string,
  ) => {
    if (!editableConfig) return;

    const { model: _, ...rest } = (kind === "agent"
      ? editableConfig.agents[id]
      : editableConfig.categories[id]) as Record<string, unknown> || {};
    const updated = nextModel ? { ...rest, model: nextModel } : rest;

    if (kind === "agent") {
      handleAgentsChange({
        ...editableConfig.agents,
        [id]: updated,
      });
    } else {
      handleCategoriesChange({
        ...editableConfig.categories,
        [id]: updated,
      });
    }
  }, [editableConfig, handleAgentsChange, handleCategoriesChange]);

  const handleModelChangeIntent = useCallback((
    kind: "agent" | "category",
    id: string,
    previousModel: string,
    nextModel: string,
  ) => {
    if (!editableConfig) return;

    if (!syncReplaceEnabled) {
      applyModelChange(kind, id, nextModel);
      return;
    }

    const impact = collectSyncReplaceImpact(editableConfig, {
      kind,
      id,
      oldModel: previousModel,
      newModel: nextModel,
    });

    if (impact.totalAdditionalCount === 0) {
      applyModelChange(kind, id, nextModel);
      return;
    }

    setPendingSyncReplace({ kind, id, previousModel, nextModel });
  }, [editableConfig, syncReplaceEnabled, applyModelChange]);

  const handleCreateCategory = (id: string) => {
    if (!editableConfig) return;
    handleCategoriesChange({
      ...editableConfig.categories,
      [id]: {}
    });
    setIsDirty(true);
    setCategoriesCollapsed(false);
    setExpandCategoryTarget(id);
    setTimeout(() => setExpandCategoryTarget(null), 100);
  };

  const markDirty = () => {
    setIsDirty(true);
  };

  const handleCollapseAll = () => {
    setGlobalCollapseKey((k) => k + 1);
    setAgentsCollapsed(true);
    setCategoriesCollapsed(true);
    setMiscCollapsed(true);
  };

  const handleExpandAll = () => {
    setGlobalExpandKey((k) => k + 1);
    setAgentsCollapsed(false);
    setCategoriesCollapsed(false);
    setMiscCollapsed(false);
  };

  const handleNavToAgent = (id: string) => {
    setAgentsCollapsed(false);
    setExpandAgentTarget(id);
    setTimeout(() => setExpandAgentTarget(null), 100);
  };

  const handleNavToCategory = (id: string) => {
    setCategoriesCollapsed(false);
    setExpandCategoryTarget(id);
    setTimeout(() => setExpandCategoryTarget(null), 100);
  };

  const handleNavToMisc = (name: string) => {
    setMiscCollapsed(false);
    setExpandMiscTarget(name);
    setTimeout(() => setExpandMiscTarget(null), 100);
  };

  const handleOpenCopyDialog = () => {
    setCopyTargetId("");
    setCopyDialogError(null);
    setShowCopyDialog(true);
  };

  const handleCopySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfileId || !copyTargetId.trim()) return;

    const targetId = copyTargetId.trim();
    if (profiles.some(p => p.id === targetId)) {
      setCopyDialogError(`Profile "${targetId}" already exists`);
      return;
    }

    setCopyLoading(true);
    setCopyDialogError(null);
    const result = await copyProfile(selectedProfileId, targetId);
    setCopyLoading(false);
    if (result.success && result.profile) {
      setShowCopyDialog(false);
      setCopyTargetId("");
      await refreshProfiles();
      switchToProfile(result.profile.id);
      addToast("success", `Profile "${result.profile.id}" created successfully`);
    } else {
      const msg = result.error || "Failed to copy profile";
      setCopyDialogError(msg);
      addToast("error", msg);
    }
  };

  const availableModels = currentProfile
    ? (currentProfile.availableModels ?? [])
    : [];
  const availableModelGroups = currentProfile
    ? (currentProfile.availableModelGroups ?? [])
    : [];
  const disabledProviders = currentProfile
    ? (currentProfile.disabledProviders ?? [])
    : [];
  const providerCatalog = currentProfile
    ? (currentProfile.providerCatalog ?? [])
    : [];

  const displayAgents = useMemo(() =>
    mergeDisplayConfig(currentProfile?.effective?.agents, editableConfig?.agents),
    [currentProfile, editableConfig]);

  const displayCategories = useMemo(() =>
    mergeDisplayConfig(currentProfile?.effective?.categories, editableConfig?.categories),
    [currentProfile, editableConfig]);

  const agentIds = useMemo(() =>
    Object.keys(displayAgents).filter(id => displayAgents[id] !== null),
    [displayAgents]);

  const categoryIds = useMemo(() =>
    Object.keys(displayCategories).filter(id => displayCategories[id] !== null),
    [displayCategories]);

  const agentModelMap = useMemo(() =>
    buildModelMap(displayAgents),
    [displayAgents]);

  const categoryModelMap = useMemo(() =>
    buildModelMap(displayCategories),
    [displayCategories]);

  const referenceImpactIndex = useMemo(() =>
    buildReferenceImpactIndex({ agents: displayAgents, categories: displayCategories }),
    [displayAgents, displayCategories]);

  const getProviderImpact = useCallback((providerName: string): ReferenceImpactEntry[] => {
    return referenceImpactIndex.byProvider[providerName] ?? [];
  }, [referenceImpactIndex]);

  const getModelImpact = useCallback((providerName: string, modelName: string): ReferenceImpactEntry[] => {
    return referenceImpactIndex.byModel[`${providerName}/${modelName}`] ?? [];
  }, [referenceImpactIndex]);

  const effectiveMiscSectionNames = currentProfile?.effective?.misc
    ? Object.keys(currentProfile.effective.misc as Record<string, unknown>).sort()
    : [];

  const sharedMiscData = useMemo(() => {
    if (!currentProfile) return undefined;
    return currentProfile.rawMisc;
  }, [currentProfile]);

  const pendingSyncReplaceImpact = useMemo<SyncReplaceImpact | null>(() => {
    if (!pendingSyncReplace || !editableConfig) return null;

    return collectSyncReplaceImpact(editableConfig, {
      kind: pendingSyncReplace.kind,
      id: pendingSyncReplace.id,
      oldModel: pendingSyncReplace.previousModel,
      newModel: pendingSyncReplace.nextModel,
    });
  }, [pendingSyncReplace, editableConfig]);

  const handleSyncReplaceConfirm = useCallback(() => {
    setPendingSyncReplace((pending) => {
      if (!pending) return null;
      setEditableConfig((current) => {
        if (!current) return current;
        return applySyncReplace(current, pending.previousModel, pending.nextModel);
      });
      setIsDirty(true);
      return null;
    });
  }, []);

  const handleSyncReplaceConfirmOne = useCallback(() => {
    setPendingSyncReplace((pending) => {
      if (!pending) return null;
      setEditableConfig((current) => {
        if (!current) return current;
        return applySyncReplaceOne(current, {
          kind: pending.kind,
          id: pending.id,
          oldModel: pending.previousModel,
          newModel: pending.nextModel,
        });
      });
      setIsDirty(true);
      return null;
    });
  }, []);

  const handleSyncReplaceCancel = useCallback(() => {
    setPendingSyncReplace(null);
  }, []);

  const miscSectionNames = useMemo(() => {
    const names = sharedMiscData ? Object.keys(sharedMiscData).sort() : [];
    return [...names, "providers"];
  }, [sharedMiscData]);

  return (
    <>
      <AppShell
        themeToggle={<ThemeToggle theme={resolvedTheme} setTheme={setTheme} />}
        syncReplaceToggle={
          <SyncReplaceToggle
            enabled={syncReplaceEnabled}
            loading={globalConfigLoading}
            onChange={handleSyncReplaceToggle}
          />
        }
        zoomControls={
          <ZoomControls
            zoomPercent={appZoomPercent}
            loading={globalConfigLoading}
            onZoomOut={handleZoomOut}
            onZoomIn={handleZoomIn}
            onReset={handleZoomReset}
          />
        }
        profileSelector={
          <ProfileSelector
            profiles={profiles}
            selectedId={selectedProfileId}
            onChange={handleProfileChange}
            disabled={loading && profiles.length === 0}
          />
        }
        copyProfileButton={
          <IconButton
            data-testid="copy-profile-button"
            onClick={handleOpenCopyDialog}
            disabled={(loading && !isSwitching) || !selectedProfileId}
            aria-label="Copy Profile"
            size="small"
          >
            <Copy style={{ width: 18, height: 18 }} />
          </IconButton>
        }
        totalReloadButton={
          <IconButton
            data-testid="total-reload-button"
            onClick={handleTotalReload}
            disabled={loading}
            aria-label="Total Reload"
            size="small"
            title="Total Reload"
          >
            <RefreshCw style={{ width: 18, height: 18 }} />
          </IconButton>
        }
        setDefaultProfileButton={
          <IconButton
            data-testid="set-default-profile-button"
            onClick={handleSetDefaultProfile}
            disabled={!selectedProfileId}
            aria-label={defaultProfile === selectedProfileId ? "Already Default" : "Set as Default"}
            size="small"
            title={defaultProfile === selectedProfileId ? "Already Default" : "Set as Default"}
            color={defaultProfile === selectedProfileId ? "primary" : "default"}
          >
            {defaultProfile === selectedProfileId ? (
              <Star style={{ width: 18, height: 18, color: tokens.colors.status.warning, fill: tokens.colors.status.warning }} />
            ) : (
              <StarOff style={{ width: 18, height: 18 }} />
            )}
          </IconButton>
        }
        loading={loading}
        error={error}
        isDirty={isDirty}
        onSave={handleSave}
        onReset={handleReset}
        successMessage={successMessage}
        conflictBanner={
          conflictError ? (
            <Alert
              severity="error"
              data-testid="conflict-banner"
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={handleReload}
                  data-testid="reload-button"
                >
                  Reload
                </Button>
              }
            >
              {conflictError}
            </Alert>
          ) : null
        }
        agentIds={agentIds}
        categoryIds={categoryIds}
        miscSectionNames={miscSectionNames}
        agentModelMap={agentModelMap}
        categoryModelMap={categoryModelMap}
        agentsEmpty={agentIds.length === 0 && !!editableConfig}
        categoriesEmpty={categoryIds.length === 0 && !!editableConfig}
        onRawConfigOpen={() => setShowRawModal(true)}
        onCollapseAll={handleCollapseAll}
        onExpandAll={handleExpandAll}
        onNavToAgent={handleNavToAgent}
        onNavToCategory={handleNavToCategory}
        onNavToMisc={handleNavToMisc}
        agentsCollapsed={agentsCollapsed}
        categoriesCollapsed={categoriesCollapsed}
        miscCollapsed={miscCollapsed}
        onToggleAgents={() => setAgentsCollapsed(c => !c)}
        onToggleCategories={() => setCategoriesCollapsed(c => !c)}
        onToggleMisc={() => setMiscCollapsed(c => !c)}
        onCreateAgent={handleCreateAgent}
        onCreateCategory={handleCreateCategory}
        providerCatalog={providerCatalog}
        disabledProviders={disabledProviders}
        profileId={selectedProfileId ?? undefined}
        updateDisabledProviders={updateDisabledProviders}
        agentsSection={
          editableConfig ? (
            <AgentEditor
              agents={displayAgents}
              availableModels={availableModels}
              availableModelGroups={availableModelGroups}
              onChange={handleAgentsChange}
              onModelChangeIntent={handleModelChangeIntent}
              globalCollapseKey={globalCollapseKey}
              globalExpandKey={globalExpandKey}
              expandTargetId={expandAgentTarget}
              categoryIds={categoryIds}
            />
          ) : (
            <LoadingPanel variant="section" testId="loading-agents" />
          )
        }
        categoriesSection={
          editableConfig ? (
            <CategoryEditor
              categories={displayCategories}
              availableModels={availableModels}
              availableModelGroups={availableModelGroups}
              onChange={handleCategoriesChange}
              onDirty={markDirty}
              onModelChangeIntent={handleModelChangeIntent}
              globalCollapseKey={globalCollapseKey}
              globalExpandKey={globalExpandKey}
              expandTargetId={expandCategoryTarget}
            />
          ) : (
            <LoadingPanel variant="section" testId="loading-categories" />
          )
        }
        miscSection={
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {editableConfig ? (
              <MiscEditor
                miscData={sharedMiscData}
                globalCollapseKey={globalCollapseKey}
                globalExpandKey={globalExpandKey}
                expandTargetId={expandMiscTarget}
              />
            ) : (
              <LoadingPanel variant="section" testId="loading-misc" />
            )}
            <ProvidersEditor
              providersList={providersList}
              loading={providersLoading}
              error={providersError}
              onCreateProvider={handleCreateProvider}
              onCreateModel={handleCreateModel}
              onUpdateModel={handleUpdateModel}
              onDeleteModel={handleDeleteModel}
              onDeleteProvider={handleDeleteProvider}
              onReload={reloadProviders}
              onGetProviderImpact={getProviderImpact}
              onGetModelImpact={getModelImpact}
            />
          </Box>
        }
        respectsMotion={respectsMotion}
        isSaving={isSaving}
        saveSuccess={saveSuccess}
      />

      {showRawModal && (
        <Suspense fallback={null}>
          <LazyRawConfigDialog
            open={showRawModal}
            onClose={() => setShowRawModal(false)}
            profile={currentProfile}
            isDark={isDark}
            tokens={tokens}
            onCopyError={() => addToast("error", "Failed to copy to clipboard")}
          />
        </Suspense>
      )}

      <Dialog
        open={showCopyDialog}
        onClose={() => setShowCopyDialog(false)}
        data-testid="copy-profile-dialog"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="copy-dialog-title" sx={{ pr: 6 }}>
          Copy Profile
        </DialogTitle>
        <IconButton
          aria-label="Close dialog"
          onClick={() => setShowCopyDialog(false)}
          sx={{
            position: "absolute",
            right: 12,
            top: 12,
            color: "text.secondary",
            "&:hover": {
              backgroundColor: alpha(tokens.colors.neutral.textPrimary, 0.08),
            },
          }}
          data-testid="copy-profile-close"
        >
          <X size={20} />
        </IconButton>
        <DialogContent>
          <Box component="form" onSubmit={handleCopySubmit} sx={{ mt: 1 }}>
            <TextField
              ref={copyInputRef}
              id="copy-target-id"
              name="copy-target-id"
              label="New Profile Name"
              value={copyTargetId}
              onChange={(e) => setCopyTargetId(e.target.value)}
              placeholder="e.g. my-new-profile"
              fullWidth
              autoFocus
              disabled={copyLoading}
              error={!!copyDialogError}
              helperText={copyDialogError}
              slotProps={{
                htmlInput: {
                  "data-testid": "copy-profile-name-input",
                  pattern: "^[a-z0-9][a-z0-9\\-_]*$",
                },
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            data-testid="copy-profile-cancel"
            onClick={() => setShowCopyDialog(false)}
            disabled={copyLoading}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            data-testid="copy-profile-submit"
            disabled={copyLoading || !copyTargetId.trim()}
            onClick={handleCopySubmit}
          >
            {copyLoading ? "Copying..." : "Copy"}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={pendingProfileId !== null}
        title="Unsaved Changes"
        description="You have unsaved changes. Are you sure you want to switch profiles?"
        confirmLabel="Switch Profile"
        cancelLabel="Cancel"
        onConfirm={handleProfileSwitchConfirm}
        onCancel={handleProfileSwitchCancel}
        severity="warning"
      />

      <ConfirmDialog
        open={pendingReload}
        title="Unsaved Changes"
        description="You have unsaved changes. Are you sure you want to reload?"
        confirmLabel="Reload"
        cancelLabel="Cancel"
        onConfirm={handleReloadConfirm}
        onCancel={handleReloadCancel}
        severity="warning"
      />

      <ConfirmDialog
        open={pendingTotalReload}
        title="Unsaved Changes"
        description="You have unsaved changes. Are you sure you want to reload all configurations?"
        confirmLabel="Total Reload"
        cancelLabel="Cancel"
        onConfirm={handleTotalReloadConfirm}
        onCancel={handleTotalReloadCancel}
        severity="warning"
      />

      {pendingSyncReplace !== null && (
        <Suspense fallback={null}>
          <LazySyncReplacePreviewDialog
            open
            impact={pendingSyncReplaceImpact}
            onConfirm={handleSyncReplaceConfirm}
            onConfirmOne={handleSyncReplaceConfirmOne}
            onCancel={handleSyncReplaceCancel}
          />
        </Suspense>
      )}

      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
      <Suspense fallback={null}>
        <LazyErrorLogPanel
          entries={errorLogEntries}
          loading={errorLogLoading}
          readError={errorLogReadError}
          hasUnread={errorLogHasUnread}
          onRefresh={errorLogRefresh}
          onMarkSeen={errorLogMarkSeen}
          onToggle={() => setErrorLogExpanded((expanded) => !expanded)}
          isExpanded={errorLogExpanded}
        />
      </Suspense>
    </>
  );
}

export default App;

function mergeDisplayConfig<T>(
  effective: Record<string, T> | undefined,
  editable: Record<string, Partial<T> | null> | undefined,
): Record<string, Partial<T> | null> {
  if (!effective) return {};
  const result: Record<string, Partial<T> | null> = {};
  for (const [id, config] of Object.entries(effective)) {
    result[id] = config as Partial<T>;
  }
  if (editable) {
    for (const [id, config] of Object.entries(editable)) {
      if (config === null) {
        delete result[id];
      } else {
        result[id] = { ...result[id], ...config };
      }
    }
  }
  return result;
}

function buildModelMap(displayMap: Record<string, { model?: string } | null>): Record<string, string | undefined> {
  const map: Record<string, string | undefined> = {};
  for (const [id, cfg] of Object.entries(displayMap)) {
    if (cfg && cfg.model) {
      map[id] = getModelDisplayInfo(cfg.model).fullId;
    }
  }
  return map;
}
