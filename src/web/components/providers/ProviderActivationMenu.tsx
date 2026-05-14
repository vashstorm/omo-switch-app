import { useMemo, useState } from "react";
import {
  Box,
  Typography,
  Switch,
  IconButton,
  Tooltip,
  Dialog,
  DialogContent,
  TextField,
  InputAdornment,
  alpha,
  useTheme,
} from "@mui/material";
import { Settings2, X, Layers, Cpu, Search, CheckCircle2, CircleOff } from "lucide-react";
import { MONO_FONT } from "../../theme/typography";
import { lightTokens, darkTokens } from "../../theme/designTokens";
import { TRANSITIONS, DURATIONS, EASING } from "../../theme/motionTokens";
import type { CreateModelRequest } from "../../api/types";
import type { ProviderEntry } from "../../hooks/useProviders";
import type { ReferenceImpactEntry } from "../../providers/referenceImpact";
import { ProvidersEditor } from "./ProvidersEditor";

export interface ProviderActivationMenuProps {
  providerCatalog: string[];
  disabledProviders: string[];
  profileId: string;
  updateDisabledProviders: (profileId: string, disabledProviders: string[]) => void | Promise<void>;
  providersList: ProviderEntry[];
  providersLoading: boolean;
  providersError: string | null;
  onCreateProvider: (name: string) => Promise<void>;
  onCreateModel: (providerName: string, request: CreateModelRequest) => Promise<void>;
  onDeleteModel: (providerName: string, modelName: string) => Promise<void>;
  onDeleteProvider: (providerName: string) => Promise<void>;
  onReloadProviders: () => Promise<void>;
  onGetProviderImpact?: (providerName: string) => ReferenceImpactEntry[];
  onGetModelImpact?: (providerName: string, modelName: string) => ReferenceImpactEntry[];
}

export function ProviderActivationMenu({
  providerCatalog,
  disabledProviders,
  profileId,
  updateDisabledProviders,
  providersList,
  providersLoading,
  providersError,
  onCreateProvider,
  onCreateModel,
  onDeleteModel,
  onDeleteProvider,
  onReloadProviders,
  onGetProviderImpact,
  onGetModelImpact,
}: ProviderActivationMenuProps) {
  const [open, setOpen] = useState(false);
  const [activationSearch, setActivationSearch] = useState("");
  const muiTheme = useTheme();
  const isDark = muiTheme.palette.mode === "dark";
  const tokens = isDark ? darkTokens : lightTokens;
  const providersColor = (muiTheme as any).sectionColors?.providers ?? "#6366F1";

  const activationProviders = useMemo(
    () =>
      providerCatalog
        .filter((provider) => provider.toLowerCase() !== "none")
        .sort((a, b) => a.localeCompare(b)),
    [providerCatalog],
  );

  const normalizedSearch = activationSearch.trim().toLowerCase();
  const visibleActivationProviders = useMemo(
    () =>
      normalizedSearch
        ? activationProviders.filter((provider) =>
            provider.toLowerCase().includes(normalizedSearch),
          )
        : activationProviders,
    [activationProviders, normalizedSearch],
  );

  const enabledCount = activationProviders.filter((p) => !disabledProviders.includes(p)).length;
  const disabledCount = activationProviders.length - enabledCount;

  const handleToggle = (provider: string) => {
    const isEnabled = !disabledProviders.includes(provider);
    const newDisabledProviders = isEnabled
      ? [...disabledProviders, provider]
      : disabledProviders.filter((p) => p !== provider);
    updateDisabledProviders(profileId, newDisabledProviders);
  };

  return (
    <>
      <Tooltip title="Providers">
        <IconButton
          data-testid="provider-activation-button"
          onClick={() => setOpen(true)}
          size="small"
          sx={{
            color: "text.disabled",
            p: 0.5,
            ml: 0.5,
            transition: TRANSITIONS.control,
            "&:hover": {
              bgcolor: alpha(tokens.colors.brand.main, 0.08),
              color: "text.secondary",
            },
          }}
        >
          <Settings2 style={{ width: 16, height: 16 }} />
        </IconButton>
      </Tooltip>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        data-testid="providers-panel-dialog"
        aria-labelledby="providers-panel-title"
        maxWidth="lg"
        fullWidth
        BackdropProps={{
          sx: {
            opacity: "1 !important",
            visibility: "visible !important",
            backgroundColor: isDark
              ? "rgba(0, 0, 0, 0.62) !important"
              : "rgba(29, 29, 31, 0.34) !important",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          },
        }}
        PaperProps={{
          sx: {
            borderRadius: 2.5,
            maxHeight: "min(90vh, 860px)",
            width: "min(1280px, calc(100vw - 64px))",
            bgcolor: "background.default",
            overflow: "hidden",
            boxShadow: isDark
              ? `0 24px 48px rgba(0,0,0,0.5), 0 0 0 1px ${alpha(providersColor, 0.15)}`
              : `0 24px 48px rgba(0,0,0,0.12), 0 0 0 1px ${alpha(providersColor, 0.12)}`,
          },
        }}
      >
        {/* Accent top bar */}
        <Box
          sx={{
            height: 3,
            background: `linear-gradient(90deg, ${providersColor} 0%, ${alpha(providersColor, 0.4)} 100%)`,
          }}
        />

        {/* Dialog Header */}
        <Box
          id="providers-panel-title"
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2.5,
            py: 1.5,
            borderBottom: `1px solid ${alpha(providersColor, 0.12)}`,
            bgcolor: isDark ? alpha(providersColor, 0.07) : alpha(providersColor, 0.035),
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <Box
              sx={{
                width: 30,
                height: 30,
                borderRadius: 1.5,
                bgcolor: providersColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Cpu style={{ width: 16, height: 16, color: "#fff" }} />
            </Box>
            <Box>
              <Typography
                component="h2"
                sx={{
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: "text.primary",
                  letterSpacing: 0,
                  lineHeight: 1.2,
                }}
              >
                Providers
              </Typography>
              <Typography
                sx={{
                  fontSize: "0.6875rem",
                  color: "text.secondary",
                  fontFamily: MONO_FONT,
                  lineHeight: 1.3,
                }}
              >
                {enabledCount} of {activationProviders.length} enabled for{" "}
                <Box component="span" sx={{ color: providersColor, fontWeight: 600 }}>
                  {profileId}
                </Box>
              </Typography>
            </Box>
          </Box>
          <IconButton
            aria-label="Close providers panel"
            data-testid="providers-panel-close"
            onClick={() => setOpen(false)}
            size="small"
            sx={{
              color: "text.secondary",
              transition: TRANSITIONS.control,
              "&:hover": {
                bgcolor: alpha(tokens.colors.neutral.textPrimary, 0.06),
                color: "text.primary",
              },
            }}
          >
            <X style={{ width: 18, height: 18 }} />
          </IconButton>
        </Box>

        {/* Two-column body */}
        <DialogContent
          sx={{
            p: 0,
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          {/* Left column — Profile Activation */}
          <Box
            sx={{
              width: { xs: "100%", md: 280 },
              flexShrink: 0,
              borderRight: { md: `1px solid ${alpha(providersColor, 0.1)}` },
              borderBottom: { xs: `1px solid ${alpha(providersColor, 0.1)}`, md: "none" },
              display: "flex",
              flexDirection: "column",
              bgcolor: isDark
                ? alpha(tokens.colors.neutral.elevatedSurface, 0.5)
                : alpha(tokens.colors.neutral.elevatedSurface, 0.45),
            }}
          >
            {/* Section label */}
            <Box
              sx={{
                px: 2,
                pt: 1.75,
                pb: 1.25,
                display: "flex",
                alignItems: "center",
                gap: 0.75,
              }}
            >
              <Layers style={{ width: 13, height: 13, color: alpha(muiTheme.palette.text.secondary as string, 0.7) }} />
              <Typography
                sx={{
                  fontSize: "0.6875rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: 0,
                  color: "text.secondary",
                  fontFamily: MONO_FONT,
                }}
              >
                Profile Activation
              </Typography>
            </Box>

            <Box sx={{ px: 1.5, pb: 1.25 }}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 0.75,
                  mb: 1,
                }}
              >
                <Box
                  sx={{
                    px: 1.25,
                    py: 0.875,
                    borderRadius: 1.5,
                    border: `1px solid ${alpha(providersColor, 0.14)}`,
                    bgcolor: alpha(providersColor, isDark ? 0.12 : 0.07),
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.625, mb: 0.25 }}>
                    <CheckCircle2 size={13} color={providersColor} />
                    <Typography
                      sx={{
                        color: "text.secondary",
                        fontFamily: MONO_FONT,
                        fontSize: "0.6875rem",
                        fontWeight: 600,
                      }}
                    >
                      Enabled
                    </Typography>
                  </Box>
                  <Typography
                    sx={{
                      color: "text.primary",
                      fontFamily: MONO_FONT,
                      fontSize: "1rem",
                      fontWeight: 700,
                      lineHeight: 1.1,
                    }}
                  >
                    {enabledCount}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    px: 1.25,
                    py: 0.875,
                    borderRadius: 1.5,
                    border: `1px solid ${alpha(tokens.colors.neutral.textPrimary, 0.08)}`,
                    bgcolor: alpha(tokens.colors.neutral.surface, isDark ? 0.16 : 0.55),
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.625, mb: 0.25 }}>
                    <CircleOff size={13} color={alpha(muiTheme.palette.text.secondary as string, 0.7)} />
                    <Typography
                      sx={{
                        color: "text.secondary",
                        fontFamily: MONO_FONT,
                        fontSize: "0.6875rem",
                        fontWeight: 600,
                      }}
                    >
                      Disabled
                    </Typography>
                  </Box>
                  <Typography
                    sx={{
                      color: "text.primary",
                      fontFamily: MONO_FONT,
                      fontSize: "1rem",
                      fontWeight: 700,
                      lineHeight: 1.1,
                    }}
                  >
                    {disabledCount}
                  </Typography>
                </Box>
              </Box>

              <TextField
                value={activationSearch}
                onChange={(event) => setActivationSearch(event.target.value)}
                placeholder="Search providers"
                size="small"
                fullWidth
                inputProps={{
                  "aria-label": "Search providers",
                  style: { fontFamily: MONO_FONT, fontSize: "0.75rem" },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={14} color={alpha(muiTheme.palette.text.secondary as string, 0.72)} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 1.5,
                    bgcolor: alpha(tokens.colors.neutral.surface, isDark ? 0.18 : 0.72),
                    "& fieldset": {
                      borderColor: alpha(tokens.colors.neutral.textPrimary, 0.1),
                    },
                    "&:hover fieldset": {
                      borderColor: alpha(providersColor, 0.35),
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: alpha(providersColor, 0.65),
                    },
                  },
                }}
              />
            </Box>

            {/* Toggle list */}
            <Box
              sx={{
                flex: 1,
                overflowY: "auto",
                px: 1.5,
                pb: 1.5,
                display: "flex",
                flexDirection: "column",
                gap: 0.5,
              }}
            >
              {activationProviders.length === 0 ? (
                <Typography
                  sx={{
                    color: "text.disabled",
                    fontSize: "0.8125rem",
                    fontStyle: "italic",
                    px: 0.5,
                    py: 1,
                  }}
                >
                  No providers configured
                </Typography>
              ) : visibleActivationProviders.length === 0 ? (
                <Typography
                  sx={{
                    color: "text.disabled",
                    fontSize: "0.75rem",
                    px: 0.75,
                    py: 1,
                    fontFamily: MONO_FONT,
                  }}
                >
                  No matching providers
                </Typography>
              ) : (
                visibleActivationProviders.map((provider) => {
                  const isEnabled = !disabledProviders.includes(provider);
                  return (
                    <Box
                      key={provider}
                      data-testid={`provider-activation-item-${provider}`}
                      onClick={() => handleToggle(provider)}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                        minHeight: 42,
                        py: 0.5,
                        pl: 1.25,
                        pr: 0.75,
                        borderRadius: 1.5,
                        cursor: "pointer",
                        transition: `all ${DURATIONS.FAST}ms ${EASING.EASE_OUT}`,
                        bgcolor: isEnabled
                          ? alpha(providersColor, isDark ? 0.12 : 0.07)
                          : "transparent",
                        border: `1px solid ${isEnabled
                          ? alpha(providersColor, 0.18)
                          : alpha(tokens.colors.neutral.textPrimary, 0.07)}`,
                        "&:hover": {
                          bgcolor: isEnabled
                            ? alpha(providersColor, isDark ? 0.18 : 0.1)
                            : alpha(tokens.colors.neutral.textPrimary, 0.04),
                          borderColor: isEnabled
                            ? alpha(providersColor, 0.28)
                            : alpha(tokens.colors.neutral.textPrimary, 0.11),
                        },
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.875, minWidth: 0 }}>
                        <Box
                          sx={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            bgcolor: isEnabled
                              ? providersColor
                              : alpha(muiTheme.palette.text.secondary as string, 0.36),
                            boxShadow: isEnabled ? `0 0 0 3px ${alpha(providersColor, 0.12)}` : "none",
                            flexShrink: 0,
                          }}
                        />
                        <Typography
                          sx={{
                            fontFamily: MONO_FONT,
                            fontSize: "0.75rem",
                            fontWeight: isEnabled ? 650 : 500,
                            color: isEnabled ? "text.primary" : "text.secondary",
                            transition: `color ${DURATIONS.FAST}ms ${EASING.EASE_OUT}`,
                            userSelect: "none",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {provider}
                        </Typography>
                      </Box>
                      <Switch
                        checked={isEnabled}
                        onChange={() => handleToggle(provider)}
                        size="small"
                        onClick={(e) => e.stopPropagation()}
                        sx={{
                          "& .MuiSwitch-switchBase.Mui-checked": {
                            color: providersColor,
                          },
                          "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                            bgcolor: alpha(providersColor, 0.5),
                          },
                        }}
                      />
                    </Box>
                  );
                })
              )}
            </Box>
          </Box>

          {/* Right column — Provider/Model Editor */}
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              overflowY: "auto",
              p: { xs: 1.5, md: 2 },
              bgcolor: alpha(tokens.colors.neutral.background, isDark ? 0.2 : 0.35),
            }}
          >
            <ProvidersEditor
              providersList={providersList}
              loading={providersLoading}
              error={providersError}
              onCreateProvider={onCreateProvider}
              onCreateModel={onCreateModel}
              onDeleteModel={onDeleteModel}
              onDeleteProvider={onDeleteProvider}
              onReload={onReloadProviders}
              onGetProviderImpact={onGetProviderImpact}
              onGetModelImpact={onGetModelImpact}
            />
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
}
