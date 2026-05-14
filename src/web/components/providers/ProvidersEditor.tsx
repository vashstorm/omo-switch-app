import { memo, useState, useCallback, useMemo } from "react";
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
  Tooltip,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import {
  ChevronRight,
  Trash2,
  Plus,
  Search,
  XCircle,
  Server,
} from "lucide-react";
import { TRANSITIONS, DURATIONS, EASING } from "../../theme/motionTokens";
import { radii } from "../../theme/designTokens";
import { MONO_FONT } from "../../theme/typography";
import { ConfirmDialog } from "../common/ConfirmDialog";
import type { CreateModelRequest } from "../../api/types";
import type { ProviderEntry } from "../../hooks/useProviders";
import { validateProviderName, validateModelName } from "../../../shared/config/validators";
import type { ReferenceImpactEntry } from "../../providers/referenceImpact";

interface ProvidersEditorProps {
  providersList: ProviderEntry[];
  loading: boolean;
  error: string | null;
  onCreateProvider: (name: string) => Promise<void>;
  onCreateModel: (providerName: string, request: CreateModelRequest) => Promise<void>;
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
  onDeleteModel,
  onDeleteProvider,
  onGetProviderImpact,
  onGetModelImpact,
}: ProvidersEditorProps) {
  const theme = useTheme();
  const providersColor = (theme as any).sectionColors?.providers ?? "#6366F1";
  const isDark = theme.palette.mode === "dark";
  const subtleBorder = alpha(theme.palette.text.primary, isDark ? 0.14 : 0.08);
  const quietBorder = alpha(theme.palette.text.primary, isDark ? 0.1 : 0.055);
  const softPaper = alpha(theme.palette.background.paper, isDark ? 0.72 : 0.88);

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    open: false, title: "", description: "", onConfirm: () => {},
  });
  const [newProviderName, setNewProviderName] = useState("");
  const [newProviderError, setNewProviderError] = useState<string | null>(null);
  const [isCreatingProvider, setIsCreatingProvider] = useState(false);
  const [newModelStates, setNewModelStates] = useState<
    Record<string, { name: string; error: string | null }>
  >({});
  const [providerSearch, setProviderSearch] = useState("");

  const handleToggleSection = useCallback((name: string) => {
    setCollapsedSections((prev) => ({ ...prev, [name]: !prev[name] }));
  }, []);

  const normalizedProviderSearch = providerSearch.trim().toLowerCase();
  const filteredProviders = useMemo(() => {
    if (!normalizedProviderSearch) return providersList;
    return providersList.filter((provider) =>
      provider.name.toLowerCase().includes(normalizedProviderSearch)
    );
  }, [providersList, normalizedProviderSearch]);

  const handleCreateProvider = useCallback(async () => {
    try { validateProviderName(newProviderName); } catch (err: unknown) {
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

  const handleCreateModel = useCallback(async (providerName: string) => {
    const modelState = newModelStates[providerName] || { name: "", error: null };
    try {
      validateModelName(modelState.name);
    } catch (err: unknown) {
      setNewModelStates((prev) => ({
        ...prev,
        [providerName]: { ...modelState, error: err instanceof Error ? err.message : "Invalid input" },
      }));
      return;
    }
    try {
      await onCreateModel(providerName, { name: modelState.name });
      setNewModelStates((prev) => ({
        ...prev,
        [providerName]: { name: "", error: null },
      }));
    } catch (err: unknown) {
      setNewModelStates((prev) => ({
        ...prev,
        [providerName]: { ...modelState, error: err instanceof Error ? err.message : "Failed to create model" },
      }));
    }
  }, [newModelStates, onCreateModel]);

  const handleDeleteProvider = useCallback((providerName: string) => {
    const entries = onGetProviderImpact?.(providerName) ?? [];
    let description = `Delete provider "${providerName}" and all its models?`;
    if (entries.length > 0) {
      description += `\n\nReferenced by:\n${entries.map(e => `  - ${e.kind} "${e.id}" uses "${e.modelId}"`).join("\n")}`;
    }
    setConfirmState({
      open: true, title: "Delete Provider", description,
      onConfirm: async () => {
        try {
          await onDeleteProvider(providerName);
          setCollapsedSections((prev) => {
            const next = { ...prev };
            delete next[providerName];
            return next;
          });
          setNewModelStates((prev) => {
            const next = { ...prev };
            delete next[providerName];
            return next;
          });
        } catch {}
        setConfirmState((prev) => ({ ...prev, open: false }));
      },
    });
  }, [onDeleteProvider, onGetProviderImpact]);

  const handleDeleteModel = useCallback((providerName: string, modelName: string) => {
    const entries = onGetModelImpact?.(providerName, modelName) ?? [];
    let description = `Delete model "${modelName}" from provider "${providerName}"?`;
    if (entries.length > 0) {
      description += `\n\nReferenced by:\n${entries.map(e => `  - ${e.kind} "${e.id}" uses "${e.modelId}"`).join("\n")}`;
    }
    setConfirmState({
      open: true, title: "Delete Model", description,
      onConfirm: async () => {
        try { await onDeleteModel(providerName, modelName); } catch {}
        setConfirmState((prev) => ({ ...prev, open: false }));
      },
    });
  }, [onDeleteModel, onGetModelImpact]);

  if (loading && providersList.length === 0) {
    return (
      <Box data-testid="providers-editor" sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress size={22} sx={{ color: providersColor }} />
      </Box>
    );
  }

  return (
    <Box
      data-testid="providers-editor"
      sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}
    >
      {error && <Alert severity="error" sx={{ mb: 0.5, fontSize: "0.8rem" }}>{error}</Alert>}

      {/* Sticky Toolbar: Search + Add Provider */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          bgcolor: alpha(theme.palette.background.default, isDark ? 0.2 : 0.35),
          backdropFilter: "blur(8px)",
          pb: 1.5,
          pt: 0.5,
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        {/* Provider Search */}
        {providersList.length > 0 && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              px: 1,
              py: 0.625,
              borderRadius: 1.5,
              border: `1px solid ${alpha(providersColor, 0.12)}`,
              bgcolor: softPaper,
              transition: TRANSITIONS.control,
              "&:focus-within": {
                borderColor: alpha(providersColor, 0.35),
                boxShadow: `0 0 0 3px ${alpha(providersColor, 0.06)}`,
              },
            }}
          >
            <Search size={14} color={alpha(theme.palette.text.secondary as string, 0.72)} />
            <TextField
              size="small"
              placeholder="Filter providers…"
              value={providerSearch}
              onChange={(e) => setProviderSearch(e.target.value)}
              fullWidth
              variant="standard"
              InputProps={{
                disableUnderline: true,
                endAdornment: normalizedProviderSearch ? (
                  <IconButton
                    size="small"
                    onClick={() => setProviderSearch("")}
                    sx={{ p: 0.25, color: "text.secondary", "&:hover": { color: "text.primary" } }}
                  >
                    <XCircle size={14} />
                  </IconButton>
                ) : null,
              }}
              inputProps={{
                style: { fontFamily: MONO_FONT, fontSize: "0.78rem", padding: "4px 0" },
              }}
              sx={{
                "& .MuiInputBase-root": {
                  bgcolor: "transparent",
                  "&::before, &::after": { display: "none" },
                },
              }}
            />
            {normalizedProviderSearch && (
              <Typography
                sx={{
                  fontSize: "0.65rem",
                  fontFamily: MONO_FONT,
                  color: "text.secondary",
                  whiteSpace: "nowrap",
                  px: 0.5,
                }}
              >
                {filteredProviders.length} / {providersList.length}
              </Typography>
            )}
          </Box>
        )}

        {/* Add Provider Form */}
        <Box
          data-testid="provider-create-section"
          sx={{
            display: "flex",
            alignItems: "flex-start",
            gap: 1,
            p: 1,
            borderRadius: 2,
            border: `1px solid ${alpha(providersColor, 0.16)}`,
            bgcolor: softPaper,
            transition: TRANSITIONS.control,
            "&:focus-within": {
              borderColor: alpha(providersColor, 0.38),
              bgcolor: alpha(theme.palette.background.paper, isDark ? 0.86 : 0.96),
              boxShadow: `0 0 0 3px ${alpha(providersColor, 0.08)}`,
            },
          }}
        >
          <TextField
            size="small"
            placeholder="New provider name…"
            value={newProviderName}
            onChange={(e) => { setNewProviderName(e.target.value); setNewProviderError(null); }}
            onKeyDown={(e) => { if (e.key === "Enter" && newProviderName) handleCreateProvider(); }}
            error={!!newProviderError}
            helperText={newProviderError}
            disabled={isCreatingProvider}
            inputProps={{ "data-testid": "provider-create-input" }}
            sx={{
              flex: 1,
              "& .MuiOutlinedInput-root": {
                borderRadius: 1.5,
                bgcolor: alpha(theme.palette.background.default, 0.5),
                "& fieldset": { borderColor: subtleBorder },
                "&:hover fieldset": { borderColor: alpha(providersColor, 0.3) },
                "&.Mui-focused fieldset": { borderColor: alpha(providersColor, 0.62) },
              },
              "& .MuiInputBase-input": { fontFamily: MONO_FONT, fontSize: "0.8rem" },
            }}
          />
          <Button
            variant="contained"
            size="small"
            onClick={handleCreateProvider}
            disabled={!newProviderName || isCreatingProvider}
            data-testid="provider-create-submit"
            startIcon={isCreatingProvider ? <CircularProgress size={14} color="inherit" /> : <Plus size={14} />}
            sx={{
              bgcolor: providersColor,
              "&:hover": { bgcolor: alpha(providersColor, 0.85) },
              boxShadow: "none",
              borderRadius: 1.5,
              fontWeight: 600,
              fontSize: "0.75rem",
              whiteSpace: "nowrap",
              minWidth: 86,
              height: 40,
            }}
          >
            Add
          </Button>
        </Box>
      </Box>

      {/* Empty state */}
      {providersList.length === 0 && (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 1.25,
            py: 6,
            color: "text.disabled",
          }}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              bgcolor: alpha(providersColor, isDark ? 0.1 : 0.06),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mb: 0.5,
            }}
          >
            <Server size={24} strokeWidth={1.25} color={providersColor} />
          </Box>
          <Typography sx={{ fontSize: "0.875rem", fontWeight: 600, color: "text.secondary" }}>
            No providers yet
          </Typography>
          <Typography sx={{ fontSize: "0.75rem", color: "text.disabled", textAlign: "center", maxWidth: 260 }}>
            Create a provider above to start adding AI models
          </Typography>
        </Box>
      )}

      {/* No search results */}
      {providersList.length > 0 && filteredProviders.length === 0 && (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
            py: 5,
            color: "text.disabled",
          }}
        >
          <Search size={28} strokeWidth={1.25} />
          <Typography sx={{ fontSize: "0.8125rem", fontFamily: MONO_FONT }}>
            No providers match "{providerSearch}"
          </Typography>
          <Button
            size="small"
            onClick={() => setProviderSearch("")}
            sx={{ color: providersColor, fontSize: "0.75rem", textTransform: "none" }}
          >
            Clear search
          </Button>
        </Box>
      )}

      {/* Provider Sections */}
      {filteredProviders.map((provider) => {
        const collapsed = !!collapsedSections[provider.name];
        const modelState = newModelStates[provider.name] || { name: "", error: null };

        return (
          <Card
            key={provider.name}
            sx={{
              overflow: "hidden",
              transition: TRANSITIONS.control,
              borderRadius: 2,
              backgroundImage: "none",
              bgcolor: softPaper,
              boxShadow: collapsed
                ? `0 1px 3px ${alpha(theme.palette.common.black, isDark ? 0.15 : 0.04)}`
                : `0 8px 24px ${alpha(theme.palette.common.black, isDark ? 0.2 : 0.06)}`,
              border: `1px solid ${collapsed ? subtleBorder : alpha(providersColor, 0.18)}`,
              "&:hover": {
                borderColor: alpha(providersColor, 0.28),
                boxShadow: collapsed
                  ? `0 2px 6px ${alpha(theme.palette.common.black, isDark ? 0.2 : 0.06)}`
                  : `0 10px 28px ${alpha(theme.palette.common.black, isDark ? 0.24 : 0.08)}`,
              },
            }}
            data-testid={`provider-section-${provider.name}`}
            id={`provider-${provider.name}`}
          >
            {/* Accent top bar — always visible, dims when collapsed */}
            <Box
              sx={{
                height: 1,
                bgcolor: providersColor,
                opacity: collapsed ? 0.18 : 0.5,
                transition: `opacity ${DURATIONS.NORMAL}ms ${EASING.EASE_OUT}`,
              }}
            />

            {/* Provider header row */}
            <Box
              sx={{
                py: 0.75,
                px: 1,
                bgcolor: collapsed ? "transparent" : alpha(providersColor, isDark ? 0.045 : 0.028),
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
                  minWidth: 0,
                  p: "6px 8px",
                  "&:hover": { bgcolor: alpha(providersColor, 0.05) },
                  "&:focus-visible": {
                    outline: `2px solid ${alpha(providersColor, 0.5)}`,
                    outlineOffset: 1,
                  },
                }}
              >
                {/* Animated chevron */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 24,
                    height: 24,
                    borderRadius: 1.25,
                    bgcolor: collapsed ? alpha(providersColor, 0.06) : alpha(providersColor, 0.14),
                    color: providersColor,
                    border: `1px solid ${alpha(providersColor, collapsed ? 0.1 : 0.24)}`,
                    transition: TRANSITIONS.control,
                    "& svg": {
                      transition: `transform ${DURATIONS.NORMAL}ms ${EASING.EASE_OUT}`,
                      transform: collapsed ? "rotate(0deg)" : "rotate(90deg)",
                    },
                  }}
                >
                  <ChevronRight style={{ width: 14, height: 14 }} />
                </Box>

                <Typography
                  component="h4"
                  sx={{
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    fontFamily: MONO_FONT,
                    color: collapsed ? "text.secondary" : "text.primary",
                    letterSpacing: 0,
                    transition: `color ${DURATIONS.NORMAL}ms ${EASING.EASE_OUT}`,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {provider.name}
                </Typography>

                <Chip
                  label={`${provider.models.length} model${provider.models.length !== 1 ? "s" : ""}`}
                  size="small"
                  sx={{
                    fontSize: "0.625rem",
                    fontFamily: MONO_FONT,
                    height: 20,
                    bgcolor: collapsed ? alpha(theme.palette.text.primary, isDark ? 0.08 : 0.04) : alpha(providersColor, 0.12),
                    color: collapsed ? "text.secondary" : providersColor,
                    border: `1px solid ${alpha(collapsed ? theme.palette.text.secondary : providersColor, collapsed ? 0.1 : 0.18)}`,
                    fontWeight: 600,
                    transition: TRANSITIONS.control,
                    "& .MuiChip-label": { px: 0.875 },
                  }}
                />
              </ButtonBase>

              <Tooltip title="Delete provider" placement="left">
                <IconButton
                  size="small"
                  onClick={() => handleDeleteProvider(provider.name)}
                  data-testid={`provider-delete-${provider.name}`}
                  sx={{
                    color: alpha(theme.palette.text.secondary, 0.5),
                    transition: TRANSITIONS.control,
                    p: 0.625,
                    "&:hover": { color: "error.main", bgcolor: alpha(theme.palette.error.main, 0.08) },
                  }}
                >
                  <Trash2 size={14} />
                </IconButton>
              </Tooltip>
            </Box>

            <Collapse in={!collapsed} unmountOnExit>
              <Box
                id={`provider-body-${provider.name}`}
                sx={{
                  borderTop: `1px solid ${subtleBorder}`,
                  borderBottomLeftRadius: radii.card,
                  borderBottomRightRadius: radii.card,
                  bgcolor: alpha(theme.palette.background.default, isDark ? 0.26 : 0.36),
                }}
              >
                {/* Models List */}
                {provider.models.length === 0 && (
                  <Box
                    sx={{
                      mx: 1,
                      mt: 1,
                      px: 1.25,
                      py: 1,
                      borderRadius: 1.5,
                      border: `1px dashed ${subtleBorder}`,
                      bgcolor: alpha(theme.palette.background.paper, 0.48),
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      color: "text.disabled",
                    }}
                  >
                    <Typography sx={{ fontSize: "0.75rem", fontFamily: MONO_FONT, fontStyle: "italic" }}>
                      No models — add one below
                    </Typography>
                  </Box>
                )}

                {provider.models.map((model, modelIndex) => {
                  const modelName = model.name;

                  return (
                    <Box
                      key={modelName}
                      data-testid={`model-row-${provider.name}-${modelName}`}
                      sx={{
                        mx: 1,
                        mt: modelIndex === 0 ? 1 : 0.5,
                        px: 1.25,
                        py: 0.625,
                        minHeight: 36,
                        borderRadius: 1.5,
                        border: `1px solid ${quietBorder}`,
                        bgcolor: alpha(theme.palette.background.paper, 0.72),
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        transition: TRANSITIONS.control,
                        "&:hover": {
                          borderColor: alpha(providersColor, 0.22),
                          bgcolor: alpha(theme.palette.background.paper, 0.96),
                        },
                      }}
                    >
                      {/* Model name */}
                      <Typography
                        sx={{
                          fontFamily: MONO_FONT,
                          fontWeight: 500,
                          color: "text.primary",
                          fontSize: "0.75rem",
                          flex: 1,
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {modelName}
                      </Typography>

                      {/* Delete action — always visible */}
                      <Tooltip title="Delete model">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteModel(provider.name, modelName)}
                          data-testid={`model-delete-${provider.name}-${modelName}`}
                          sx={{
                            color: alpha(theme.palette.text.secondary, 0.6),
                            transition: TRANSITIONS.control,
                            p: 0.375,
                            "&:hover": { color: "error.main", bgcolor: alpha(theme.palette.error.main, 0.08) },
                          }}
                        >
                          <Trash2 size={13} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  );
                })}

                {/* Add Model Form */}
                <Box
                  sx={{
                    px: 1,
                    pt: provider.models.length > 0 ? 0.75 : 1,
                    pb: 1,
                    bgcolor: "transparent",
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.75,
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={0.75}
                    alignItems="flex-start"
                    sx={{
                      p: 0.75,
                      borderRadius: 1.5,
                      border: `1px solid ${quietBorder}`,
                      bgcolor: alpha(theme.palette.background.paper, 0.58),
                      transition: TRANSITIONS.control,
                      "&:focus-within": {
                        borderColor: alpha(providersColor, 0.36),
                        boxShadow: `0 0 0 3px ${alpha(providersColor, 0.07)}`,
                      },
                    }}
                  >
                    <TextField
                      size="small"
                      placeholder="Model name"
                      value={modelState.name}
                      onChange={(e) =>
                        setNewModelStates((prev) => ({
                          ...prev,
                          [provider.name]: { ...(prev[provider.name] || { error: null }), name: e.target.value, error: null },
                        }))
                      }
                      onKeyDown={(e) => { if (e.key === "Enter" && modelState.name) handleCreateModel(provider.name); }}
                      inputProps={{
                        "data-testid": `model-create-input-${provider.name}`,
                        style: { fontFamily: MONO_FONT, fontSize: "0.75rem" },
                      }}
                      sx={{
                        flex: 1,
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 1.25,
                          bgcolor: alpha(theme.palette.background.default, 0.42),
                          "& fieldset": { borderColor: subtleBorder },
                          "&:hover fieldset": { borderColor: alpha(providersColor, 0.32) },
                          "&.Mui-focused fieldset": { borderColor: alpha(providersColor, 0.58) },
                        },
                      }}
                    />
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleCreateModel(provider.name)}
                      disabled={!modelState.name}
                      data-testid={`model-create-submit-${provider.name}`}
                      startIcon={<Plus size={13} />}
                      sx={{
                        fontSize: "0.7rem",
                        color: providersColor,
                        borderColor: alpha(providersColor, 0.35),
                        fontWeight: 600,
                        borderRadius: 1.25,
                        minWidth: 74,
                        height: 38,
                        "&:hover": {
                          bgcolor: alpha(providersColor, 0.06),
                          borderColor: alpha(providersColor, 0.6),
                        },
                      }}
                    >
                      Add
                    </Button>
                  </Stack>
                  {modelState.error && (
                    <Typography sx={{ fontSize: "0.6875rem", color: "error.main", fontFamily: MONO_FONT }}>
                      {modelState.error}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Collapse>
          </Card>
        );
      })}

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
