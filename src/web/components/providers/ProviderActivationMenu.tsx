import { useState } from "react";
import {
  Box,
  Typography,
  Switch,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  Divider,
  alpha,
  useTheme,
} from "@mui/material";
import { Settings2, X } from "lucide-react";
import { MONO_FONT } from "../../theme/typography";
import { lightTokens, darkTokens } from "../../theme/designTokens";
import type { CreateModelRequest, UpdateModelRequest } from "../../api/types";
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
  onUpdateModel: (providerName: string, modelName: string, request: UpdateModelRequest) => Promise<void>;
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
  onUpdateModel,
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

  const filteredProviders = providerCatalog
    .filter((provider) => provider.toLowerCase() !== "none")
    .sort((a, b) => a.localeCompare(b));

  const handleClick = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleToggle = (provider: string) => {
    const isEnabled = !disabledProviders.includes(provider);
    let newDisabledProviders: string[];

    if (isEnabled) {
      newDisabledProviders = [...disabledProviders, provider];
    } else {
      newDisabledProviders = disabledProviders.filter((p) => p !== provider);
    }

    updateDisabledProviders(profileId, newDisabledProviders);
  };

  return (
    <>
      <Tooltip title="Providers">
        <IconButton
          data-testid="provider-activation-button"
          onClick={handleClick}
          size="small"
          sx={{
            color: "text.disabled",
            p: 0.5,
            ml: 0.5,
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
        onClose={handleClose}
        data-testid="providers-panel-dialog"
        aria-labelledby="providers-panel-title"
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxHeight: "min(88vh, 820px)",
            bgcolor: "background.default",
          },
        }}
      >
        <DialogTitle
          id="providers-panel-title"
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            px: 2.5,
            py: 1.75,
          }}
        >
          <Typography component="span" sx={{ fontSize: "1rem", fontWeight: 700 }}>
            Providers
          </Typography>
          <IconButton
            aria-label="Close providers panel"
            data-testid="providers-panel-close"
            onClick={handleClose}
            size="small"
            sx={{
              color: "text.secondary",
              "&:hover": {
                bgcolor: alpha(tokens.colors.brand.main, 0.08),
                color: "text.primary",
              },
            }}
          >
            <X style={{ width: 18, height: 18 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent
          sx={{
            px: 2.5,
            pb: 2.5,
            pt: 0,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <Box
            sx={{
              bgcolor: "background.paper",
              borderRadius: 2,
              p: 1.5,
              border: `1px solid ${alpha(tokens.colors.neutral.textPrimary, 0.08)}`,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "text.secondary",
                mb: 1,
                display: "block",
              }}
            >
              Enabled for this profile
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
              {filteredProviders.map((provider) => {
                const isEnabled = !disabledProviders.includes(provider);
                return (
                  <Box
                    key={provider}
                    data-testid={`provider-activation-item-${provider}`}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1,
                      py: 0.5,
                      pl: 1,
                      pr: 0.5,
                      borderRadius: 1,
                      minWidth: 180,
                      bgcolor: isEnabled
                        ? alpha(tokens.colors.brand.main, 0.04)
                        : alpha(tokens.colors.neutral.textPrimary, 0.03),
                      border: `1px solid ${isEnabled
                        ? alpha(tokens.colors.brand.main, 0.12)
                        : alpha(tokens.colors.neutral.textPrimary, 0.08)}`,
                      "&:hover": {
                        bgcolor: alpha(tokens.colors.brand.main, 0.06),
                      },
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: MONO_FONT,
                        fontSize: "0.8rem",
                        fontWeight: isEnabled ? 500 : 400,
                        color: isEnabled ? "text.primary" : "text.secondary",
                      }}
                    >
                      {provider}
                    </Typography>
                    <Switch
                      checked={isEnabled}
                      onChange={() => handleToggle(provider)}
                      size="small"
                      sx={{
                        "& .MuiSwitch-switchBase.Mui-checked": {
                          color: tokens.colors.brand.main,
                        },
                        "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                          bgcolor: alpha(tokens.colors.brand.main, 0.5),
                        },
                      }}
                    />
                  </Box>
                );
              })}
              {filteredProviders.length === 0 && (
                <Typography
                  sx={{
                    color: "text.disabled",
                    fontSize: "0.8125rem",
                    fontStyle: "italic",
                    px: 0.5,
                    py: 0.75,
                  }}
                >
                  No providers available
                </Typography>
              )}
            </Box>
          </Box>
          <Divider />
          <ProvidersEditor
            providersList={providersList}
            loading={providersLoading}
            error={providersError}
            onCreateProvider={onCreateProvider}
            onCreateModel={onCreateModel}
            onUpdateModel={onUpdateModel}
            onDeleteModel={onDeleteModel}
            onDeleteProvider={onDeleteProvider}
            onReload={onReloadProviders}
            onGetProviderImpact={onGetProviderImpact}
            onGetModelImpact={onGetModelImpact}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
