import { useState } from "react";
import {
  Box,
  Typography,
  Switch,
  IconButton,
  Tooltip,
  Popover,
  alpha,
  useTheme,
} from "@mui/material";
import { Settings2 } from "lucide-react";
import { MONO_FONT } from "../../theme/typography";
import { lightTokens, darkTokens } from "../../theme/designTokens";

interface ProviderActivationMenuProps {
  providerCatalog: string[];
  disabledProviders: string[];
  profileId: string;
  updateDisabledProviders: (profileId: string, disabledProviders: string[]) => void;
}

export function ProviderActivationMenu({
  providerCatalog,
  disabledProviders,
  profileId,
  updateDisabledProviders,
}: ProviderActivationMenuProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const muiTheme = useTheme();
  const isDark = muiTheme.palette.mode === "dark";
  const tokens = isDark ? darkTokens : lightTokens;

  const filteredProviders = providerCatalog
    .filter((provider) => provider.toLowerCase() !== "none")
    .sort((a, b) => a.localeCompare(b));

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
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

  const open = Boolean(anchorEl);

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
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            p: 1.5,
            minWidth: 200,
            maxHeight: 320,
          },
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
          Providers
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
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
                  py: 0.75,
                  px: 1,
                  borderRadius: 1,
                  bgcolor: isEnabled
                    ? alpha(tokens.colors.brand.main, 0.04)
                    : alpha(tokens.colors.brand.main, 0.02),
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
        </Box>
      </Popover>
    </>
  );
}