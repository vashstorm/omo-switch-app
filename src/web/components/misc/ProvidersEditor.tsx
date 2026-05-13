import React, { memo, useState, useCallback } from "react";
import {
  Card,
  Box,
  Typography,
  Collapse,
  ButtonBase,
  TextField,
  Button,
  IconButton,
  Stack,
  Chip,
  CircularProgress,
  Alert,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import {
  ChevronRight,
  ChevronDown,
  Trash2,
  Plus,
} from "lucide-react";
import { TRANSITIONS } from "../../theme/motionTokens";
import { radii } from "../../theme/designTokens";
import { MONO_FONT } from "../../theme/typography";
import { ConfirmDialog } from "../common/ConfirmDialog";
import type { CreateModelRequest, UpdateModelRequest } from "../../api/types";
import type { ProviderEntry } from "../../hooks/useProviders";
import { validateProviderName, validateModelName, validateMaxTokens } from "../../../shared/config/validators";
import type { ReferenceImpactEntry } from "../../providers/referenceImpact";

interface ProvidersEditorProps {
  providersList: ProviderEntry[];
  loading: boolean;
  error: string | null;
  onCreateProvider: (name: string) => Promise<void>;
  onCreateModel: (providerName: string, request: CreateModelRequest) => Promise<void>;
  onUpdateModel: (providerName: string, modelName: string, request: UpdateModelRequest) => Promise<void>;
  onDeleteModel: (providerName: string, modelName: string) => Promise<void>;
  onDeleteProvider: (providerName: string) => Promise<void>;
  onReload: () => Promise<void>;
  onGetProviderImpact?: (providerName: string) => ReferenceImpactEntry[];
  onGetModelImpact?: (providerName: string, modelName: string) => ReferenceImpactEntry[];
}

interface ConfirmState {
  open: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
}

function ProvidersEditorComponent({
  providersList,
  loading,
  error,
  onCreateProvider,
  onCreateModel,
  onUpdateModel,
  onDeleteModel,
  onDeleteProvider,
  onReload,
  onGetProviderImpact,
  onGetModelImpact,
}: ProvidersEditorProps) {
  const theme = useTheme();
  const providersColor = (theme as any).sectionColors?.providers ?? "#6366F1";

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    open: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });

  const [newProviderName, setNewProviderName] = useState("");
  const [newProviderError, setNewProviderError] = useState<string | null>(null);
  const [isCreatingProvider, setIsCreatingProvider] = useState(false);

  const [newModelStates, setNewModelStates] = useState<
    Record<string, { name: string; maxTokens: string; error: string | null }>
  >({});

  const [editingMaxTokens, setEditingMaxTokens] = useState<
    Record<string, { value: string; error: string | null }>
  >({});

  const handleToggleSection = useCallback((providerName: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [providerName]: !prev[providerName],
    }));
  }, []);

  const handleCreateProvider = useCallback(async () => {
    try {
      validateProviderName(newProviderName);
    } catch (err: unknown) {
      setNewProviderError(err instanceof Error ? err.message : "Invalid provider name");
      return;
    }

    setNewProviderError(null);
    setIsCreatingProvider(true);
    try {
      await onCreateProvider(newProviderName);
      setNewProviderName("");
    } catch (err: unknown) {
      setNewProviderError(err instanceof Error ? err.message : "Failed to create provider");
    } finally {
      setIsCreatingProvider(false);
    }
  }, [newProviderName, onCreateProvider]);

  const handleCreateModel = useCallback(
    async (providerName: string) => {
      const modelState = newModelStates[providerName] || { name: "", maxTokens: "64000", error: null };

      try {
        validateModelName(modelState.name);
        validateMaxTokens(parseInt(modelState.maxTokens, 10));
      } catch (err: unknown) {
        setNewModelStates((prev) => ({
          ...prev,
          [providerName]: { ...modelState, error: err instanceof Error ? err.message : "Invalid input" },
        }));
        return;
      }

      setNewModelStates((prev) => ({
        ...prev,
        [providerName]: { ...modelState, error: null },
      }));

      try {
        await onCreateModel(providerName, {
          name: modelState.name,
          maxTokens: parseInt(modelState.maxTokens, 10),
        });
        setNewModelStates((prev) => ({
          ...prev,
          [providerName]: { name: "", maxTokens: "64000", error: null },
        }));
      } catch (err: unknown) {
        setNewModelStates((prev) => ({
          ...prev,
          [providerName]: { ...modelState, error: err instanceof Error ? err.message : "Failed to create model" },
        }));
      }
    },
    [newModelStates, onCreateModel]
  );

  const handleNewModelNameChange = useCallback((providerName: string, name: string) => {
    setNewModelStates((prev) => ({
      ...prev,
      [providerName]: { ...(prev[providerName] || { maxTokens: "64000", error: null }), name, error: null },
    }));
  }, []);

  const handleNewModelMaxTokensChange = useCallback((providerName: string, value: string) => {
    setNewModelStates((prev) => ({
      ...prev,
      [providerName]: { ...(prev[providerName] || { name: "", error: null }), maxTokens: value, error: null },
    }));
  }, []);

  const handleDeleteProvider = useCallback(
    (providerName: string) => {
      const entries = onGetProviderImpact?.(providerName) ?? [];
      let description = `Delete provider "${providerName}" and all its models?`;
      if (entries.length > 0) {
        const lines = entries.map(e => `  - ${e.kind} "${e.id}" uses "${e.modelId}"`);
        description += `\n\nReferenced by:\n${lines.join("\n")}`;
      }
      setConfirmState({
        open: true,
        title: "Delete Provider",
        description,
        onConfirm: async () => {
          try {
            await onDeleteProvider(providerName);
          } catch (err: unknown) {
            // Error handled by hook
          }
          setConfirmState((prev) => ({ ...prev, open: false }));
        },
      });
    },
    [onDeleteProvider, onGetProviderImpact]
  );

  const handleDeleteModel = useCallback(
    (providerName: string, modelName: string) => {
      const entries = onGetModelImpact?.(providerName, modelName) ?? [];
      let description = `Delete model "${modelName}" from provider "${providerName}"?`;
      if (entries.length > 0) {
        const lines = entries.map(e => `  - ${e.kind} "${e.id}" uses "${e.modelId}"`);
        description += `\n\nReferenced by:\n${lines.join("\n")}`;
      }
      setConfirmState({
        open: true,
        title: "Delete Model",
        description,
        onConfirm: async () => {
          try {
            await onDeleteModel(providerName, modelName);
          } catch (err: unknown) {
            // Error handled by hook
          }
          setConfirmState((prev) => ({ ...prev, open: false }));
        },
      });
    },
    [onDeleteModel, onGetModelImpact]
  );

  const handleSaveMaxTokens = useCallback(
    async (providerName: string, modelName: string) => {
      const editKey = `${providerName}/${modelName}`;
      const editState = editingMaxTokens[editKey];
      if (!editState) return;

      const parsed = parseInt(editState.value, 10);
      try {
        validateMaxTokens(parsed);
      } catch (err: unknown) {
        setEditingMaxTokens((prev) => ({
          ...prev,
          [editKey]: { ...editState, error: err instanceof Error ? err.message : "Invalid maxTokens" },
        }));
        return;
      }

      setEditingMaxTokens((prev) => ({
        ...prev,
        [editKey]: { ...editState, error: null },
      }));

      try {
        await onUpdateModel(providerName, modelName, { maxTokens: parsed });
        setEditingMaxTokens((prev) => {
          const next = { ...prev };
          delete next[editKey];
          return next;
        });
      } catch (err: unknown) {
        setEditingMaxTokens((prev) => ({
          ...prev,
          [editKey]: { ...editState, error: err instanceof Error ? err.message : "Failed to update" },
        }));
      }
    },
    [editingMaxTokens, onUpdateModel]
  );

  const startEditingMaxTokens = useCallback(
    (providerName: string, modelName: string, currentValue: number | undefined) => {
      const editKey = `${providerName}/${modelName}`;
      setEditingMaxTokens((prev) => ({
        ...prev,
        [editKey]: { value: String(currentValue ?? 64000), error: null },
      }));
    },
    []
  );

  if (loading) {
    return (
      <Box
        data-testid="providers-editor"
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          p: 3,
          bgcolor: "background.paper",
          borderRadius: 3,
        }}
      >
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Box
      data-testid="providers-editor"
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1,
        bgcolor: "background.paper",
        borderRadius: 3,
        p: 1.5,
        transition: TRANSITIONS.control,
      }}
    >
      {error && (
        <Alert severity="error" sx={{ mb: 1 }}>
          {error}
        </Alert>
      )}

      {/* Add Provider Form */}
      <Card
        sx={{
          overflow: "visible",
          transition: TRANSITIONS.control,
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
        }}
        data-testid="provider-create-section"
      >
        <Box
          sx={{
            height: 2,
            bgcolor: providersColor,
            opacity: 0.85,
          }}
        />
        <Box
          sx={{
            p: 1.5,
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          <Typography
            sx={{
              fontSize: "0.8125rem",
              fontWeight: 600,
              fontFamily: MONO_FONT,
              color: "text.primary",
              letterSpacing: "-0.01em",
            }}
          >
            Add Provider
          </Typography>
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <TextField
              size="small"
              placeholder="Provider name (e.g. my-provider)"
              value={newProviderName}
              onChange={(e) => {
                setNewProviderName(e.target.value);
                setNewProviderError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newProviderName) {
                  handleCreateProvider();
                }
              }}
              error={!!newProviderError}
              helperText={newProviderError}
              disabled={isCreatingProvider}
              inputProps={{ "data-testid": "provider-create-input" }}
              sx={{ flex: 1 }}
            />
            <Button
              variant="contained"
              size="small"
              onClick={handleCreateProvider}
              disabled={!newProviderName || isCreatingProvider}
              data-testid="provider-create-submit"
              startIcon={isCreatingProvider ? <CircularProgress size={16} /> : <Plus size={16} />}
            >
              Add
            </Button>
          </Stack>
        </Box>
      </Card>

      {/* Provider Sections */}
      {providersList.map((provider) => {
        const collapsed = !!collapsedSections[provider.name];
        const modelState = newModelStates[provider.name] || { name: "", maxTokens: "64000", error: null };

        return (
          <Card
            key={provider.name}
            sx={{
              overflow: "hidden",
              transition: TRANSITIONS.control,
              boxShadow: collapsed ? "none" : "0 2px 12px rgba(0, 0, 0, 0.06)",
              "&:hover": {
                boxShadow: collapsed ? "0 2px 8px rgba(0, 0, 0, 0.04)" : "0 4px 16px rgba(0, 0, 0, 0.08)",
              },
            }}
            data-testid={`provider-section-${provider.name}`}
            id={`provider-${provider.name}`}
          >
            <Box
              sx={{
                height: 2,
                bgcolor: collapsed ? "transparent" : providersColor,
                transition: TRANSITIONS.control,
                opacity: 0.85,
              }}
            />
            <Box
              sx={{
                py: 0.25,
                px: 1,
                bgcolor: collapsed ? "transparent" : alpha(providersColor, 0.02),
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 0.5,
                transition: TRANSITIONS.control,
              }}
            >
              <ButtonBase
                onClick={() => handleToggleSection(provider.name)}
                data-testid={`toggle-provider-${provider.name}`}
                aria-expanded={!collapsed}
                aria-controls={`provider-body-${provider.name}`}
                aria-label={`${collapsed ? "Expand" : "Collapse"} provider ${provider.name}`}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.25,
                  flex: 1,
                  justifyContent: "flex-start",
                  borderRadius: 1.5,
                  p: "6px 8px",
                  "&:hover": { bgcolor: alpha(providersColor, 0.04) },
                  "&:focus-visible": {
                    outline: `2px solid ${alpha(providersColor, 0.5)}`,
                    outlineOffset: 1,
                  },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 24,
                    height: 24,
                    borderRadius: 1.5,
                    bgcolor: collapsed ? alpha(providersColor, 0.08) : providersColor,
                    color: collapsed ? "text.secondary" : "common.white",
                    transition: TRANSITIONS.control,
                  }}
                >
                  {collapsed ? (
                    <ChevronRight style={{ width: 16, height: 16 }} />
                  ) : (
                    <ChevronDown style={{ width: 16, height: 16 }} />
                  )}
                </Box>
                <Typography
                  component="h4"
                  sx={{
                    fontSize: "0.8125rem",
                    fontWeight: 500,
                    fontFamily: MONO_FONT,
                    color: "text.primary",
                    letterSpacing: "-0.01em",
                    transition: TRANSITIONS.control,
                  }}
                >
                  {provider.name}
                </Typography>
                <Chip
                  label={String(provider.models.length)}
                  size="small"
                  sx={{
                    fontSize: "0.6875rem",
                    fontFamily: MONO_FONT,
                    bgcolor: alpha(providersColor, 0.1),
                    color: providersColor,
                    fontWeight: 500,
                  }}
                />
              </ButtonBase>
              <IconButton
                size="small"
                onClick={() => handleDeleteProvider(provider.name)}
                data-testid={`provider-delete-${provider.name}`}
                sx={{
                  color: "text.secondary",
                  "&:hover": { color: "error.main", bgcolor: alpha(theme.palette.error.main, 0.08) },
                }}
              >
                <Trash2 size={16} />
              </IconButton>
            </Box>
            <Collapse in={!collapsed} unmountOnExit>
              <Box
                id={`provider-body-${provider.name}`}
                sx={{
                  borderTop: `1px solid ${alpha(providersColor, 0.2)}`,
                  borderBottomLeftRadius: radii.card,
                  borderBottomRightRadius: radii.card,
                  bgcolor: alpha(providersColor, 0.01),
                }}
              >
                {/* Models List */}
                {provider.models.map((model) => {
                  const editKey = `${provider.name}/${model.name}`;
                  const editState = editingMaxTokens[editKey];
                  const isEditing = !!editState;
                  const displayMaxTokens = isEditing ? editState.value : String(model.config.maxTokens ?? 64000);

                  return (
                    <Box
                      key={model.name}
                      sx={{
                        px: 2,
                        py: 1,
                        borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                      data-testid={`model-row-${provider.name}-${model.name}`}
                    >
                      <Typography
                        sx={{
                          fontFamily: MONO_FONT,
                          fontWeight: 500,
                          color: "text.primary",
                          fontSize: "0.75rem",
                          flex: 1,
                        }}
                      >
                        {model.name}
                      </Typography>

                      {isEditing ? (
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <TextField
                            size="small"
                            type="number"
                            value={editState.value}
                            onChange={(e) =>
                              setEditingMaxTokens((prev) => ({
                                ...prev,
                                [editKey]: { ...prev[editKey]!, value: e.target.value, error: null },
                              }))
                            }
                            error={!!editState.error}
                            helperText={editState.error}
                            inputProps={{
                              "data-testid": `model-max-tokens-${provider.name}-${model.name}`,
                              min: 0,
                            }}
                            sx={{ width: 120 }}
                          />
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleSaveMaxTokens(provider.name, model.name)}
                            data-testid={`model-save-${provider.name}-${model.name}`}
                          >
                            Save
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() =>
                              setEditingMaxTokens((prev) => {
                                const next = { ...prev };
                                delete next[editKey];
                                return next;
                              })
                            }
                          >
                            Cancel
                          </Button>
                        </Stack>
                      ) : (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() =>
                            startEditingMaxTokens(provider.name, model.name, model.config.maxTokens)
                          }
                          data-testid={`model-max-tokens-${provider.name}-${model.name}`}
                          sx={{
                            fontSize: "0.6875rem",
                            fontFamily: MONO_FONT,
                            minWidth: "auto",
                          }}
                        >
                          {displayMaxTokens}
                        </Button>
                      )}

                      <IconButton
                        size="small"
                        onClick={() => handleDeleteModel(provider.name, model.name)}
                        data-testid={`model-delete-${provider.name}-${model.name}`}
                        sx={{
                          color: "text.secondary",
                          "&:hover": { color: "error.main", bgcolor: alpha(theme.palette.error.main, 0.08) },
                        }}
                      >
                        <Trash2 size={14} />
                      </IconButton>
                    </Box>
                  );
                })}

                {/* Add Model Form */}
                <Box
                  sx={{
                    px: 2,
                    py: 1.5,
                    borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                    bgcolor: alpha(providersColor, 0.02),
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.6875rem",
                      fontWeight: 500,
                      fontFamily: MONO_FONT,
                      color: "text.secondary",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Add Model
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="flex-start">
                    <TextField
                      size="small"
                      placeholder="Model name"
                      value={modelState.name}
                      onChange={(e) => handleNewModelNameChange(provider.name, e.target.value)}
                      inputProps={{ "data-testid": `model-create-input-${provider.name}` }}
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      size="small"
                      type="number"
                      label="maxTokens"
                      value={modelState.maxTokens}
                      onChange={(e) => handleNewModelMaxTokensChange(provider.name, e.target.value)}
                      inputProps={{
                        "data-testid": `model-max-tokens-${provider.name}-new`,
                        min: 0,
                      }}
                      sx={{ width: 100 }}
                    />
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => handleCreateModel(provider.name)}
                      disabled={!modelState.name}
                      data-testid={`model-create-submit-${provider.name}`}
                      startIcon={<Plus size={14} />}
                    >
                      Add
                    </Button>
                  </Stack>
                  {modelState.error && (
                    <Typography
                      sx={{
                        fontSize: "0.6875rem",
                        color: "error.main",
                        fontFamily: MONO_FONT,
                      }}
                    >
                      {modelState.error}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Collapse>
          </Card>
        );
      })}

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        severity="error"
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((prev) => ({ ...prev, open: false }))}
      />
    </Box>
  );
}

export const ProvidersEditor = memo(ProvidersEditorComponent);
