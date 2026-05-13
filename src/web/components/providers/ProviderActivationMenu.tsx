import { useState } from "react";
import {
  Box,
  Typography,
  Switch,
  IconButton,
  Tooltip,
  Dialog,
  DialogContent,
  alpha,
  useTheme,
} from "@mui/material";
import { Settings2, X, Layers, Cpu } from "lucide-react";
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
  const muiTheme = useTheme();
  const isDark = muiTheme.palette.mode === "dark";
  const tokens = isDark ? darkTokens : lightTokens;
  const providersColor = (muiTheme as any).sectionColors?.providers ?? "#6366F1";

  const filteredProviders = providerCatalog
    .filter((provider) => provider.toLowerCase() !== "none")
    .sort((a, b) => a.localeCompare(b));

  const enabledCount = filteredProviders.filter((p) => !disabledProviders.includes(p)).length;

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
        PaperProps={{
          sx: {
            borderRadius: 2.5,
            maxHeight: "min(90vh, 860px)",
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
            bgcolor: alpha(providersColor, isDark ? 0.06 : 0.03),
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
                  fontSize: "0.9375rem",
                  fontWeight: 700,
                  color: "text.primary",
                  letterSpacing: "-0.02em",
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
                {enabledCount} of {filteredProviders.length} enabled for{" "}
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
              width: { xs: "100%", md: 240 },
              flexShrink: 0,
              borderRight: { md: `1px solid ${alpha(providersColor, 0.1)}` },
              borderBottom: { xs: `1px solid ${alpha(providersColor, 0.1)}`, md: "none" },
              display: "flex",
              flexDirection: "column",
              bgcolor: alpha(providersColor, isDark ? 0.03 : 0.015),
            }}
          >
            {/* Section label */}
            <Box
              sx={{
                px: 2,
                pt: 1.75,
                pb: 1,
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
                  letterSpacing: "0.06em",
                  color: "text.secondary",
                  fontFamily: MONO_FONT,
                }}
              >
                Profile Activation
              </Typography>
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
              {filteredProviders.length === 0 ? (
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
              ) : (
                filteredProviders.map((provider) => {
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
                        py: 0.625,
                        pl: 1.25,
                        pr: 0.75,
                        borderRadius: 1.5,
                        cursor: "pointer",
                        transition: `all ${DURATIONS.FAST}ms ${EASING.EASE_OUT}`,
                        bgcolor: isEnabled
                          ? alpha(providersColor, isDark ? 0.12 : 0.07)
                          : "transparent",
                        border: `1px solid ${isEnabled
                          ? alpha(providersColor, 0.2)
                          : alpha(tokens.colors.neutral.textPrimary, 0.06)}`,
                        "&:hover": {
                          bgcolor: isEnabled
                            ? alpha(providersColor, isDark ? 0.18 : 0.1)
                            : alpha(tokens.colors.neutral.textPrimary, 0.04),
                        },
                      }}
                    >
                      <Typography
                        sx={{
                          fontFamily: MONO_FONT,
                          fontSize: "0.75rem",
                          fontWeight: isEnabled ? 600 : 400,
                          color: isEnabled ? providersColor : "text.secondary",
                          transition: `color ${DURATIONS.FAST}ms ${EASING.EASE_OUT}`,
                          userSelect: "none",
                        }}
                      >
                        {provider}
                      </Typography>
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
              p: 2,
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
