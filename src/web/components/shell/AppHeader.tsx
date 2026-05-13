import { ReactNode } from "react";
import {
  Menu, ChevronsUpDown, ChevronsDownUp, Eye, RotateCcw, Save, Check, Loader2
} from "lucide-react";
import {
  Box, Typography, Chip, IconButton, Button, Stack, Divider,
  Tooltip
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import { keyframes } from "@mui/system";
import { DURATIONS, EASING } from "../../theme/motionTokens";
import { lightTokens, darkTokens } from "../../theme/designTokens";
import { StatusPill } from "../common/StatusPill";
import { ProviderActivationMenu, type ProviderActivationMenuProps } from "../providers/ProviderActivationMenu";

const spin = keyframes({
  from: { transform: "rotate(0deg)" },
  to: { transform: "rotate(360deg)" },
});

interface AppHeaderProps {
  title: string;
  themeToggle?: ReactNode;
  syncReplaceToggle?: ReactNode;
  zoomControls?: ReactNode;
  profileSelector: ReactNode;
  copyProfileButton?: ReactNode;
  totalReloadButton?: ReactNode;
  setDefaultProfileButton?: ReactNode;
  error: string | null;
  isDirty: boolean;
  successMessage?: string | null;
  isMobile?: boolean;
  loading: boolean;
  onSave: () => void;
  onReset: () => void;
  onRawConfigOpen?: () => void;
  isAllCollapsed: boolean;
  onToggleAll: () => void;
  onMobileNavToggle: () => void;
  isNavOpen: boolean;
  agentIds: string[];
  categoryIds: string[];
  miscSectionNames: string[];
  agentModelMap: Record<string, string | undefined>;
  categoryModelMap: Record<string, string | undefined>;
  isSaving?: boolean;
  saveSuccess?: boolean;
  providerPanelProps?: ProviderActivationMenuProps;
}

export function AppHeader({
  title,
  themeToggle,
  syncReplaceToggle,
  zoomControls,
  profileSelector,
  copyProfileButton,
  totalReloadButton,
  setDefaultProfileButton,
  error,
  isDirty,
  successMessage,
  loading,
  onSave,
  onReset,
  onRawConfigOpen,
  isAllCollapsed,
  onToggleAll,
  onMobileNavToggle,
  isNavOpen,
  isSaving = false,
  saveSuccess = false,
  isMobile = false,
  providerPanelProps,
}: AppHeaderProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const tokens = isDark ? darkTokens : lightTokens;

  const agentColor = tokens.colors.section.agentPrimary;
  const categoryColor = tokens.colors.section.categoryPrimary;
  const miscColor = tokens.colors.section.miscPrimary;

  const hoverTransition = `all ${DURATIONS.FAST}ms ${EASING.EASE_OUT}`;

  return (
    <>
      <Box
        component="header"
        sx={{
          flexShrink: 0,
          zIndex: 40,
          width: "100%",
          bgcolor: "background.paper",
        }}
      >
        <Box
          sx={{
            display: "flex",
            height: { xs: "56px", sm: "52px" },
            alignItems: "center",
            justifyContent: "space-between",
            px: { xs: 2, lg: 3 },
            bgcolor: isDark ? "rgba(0, 0, 0, 0.8)" : "rgba(255, 255, 255, 0.72)",
            backdropFilter: "saturate(180%) blur(20px)",
            borderBottom: "1px solid",
            borderColor: "divider",
            position: "sticky",
            top: 0,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <IconButton
              onClick={onMobileNavToggle}
              aria-label="Toggle navigation"
              data-testid="mobile-nav-toggle"
              aria-controls="app-nav"
              aria-expanded={isNavOpen}
              sx={{
                display: { xs: "flex", lg: "none" },
                p: 0.5,
              }}
            >
              <Menu style={{ width: 20, height: 20 }} />
            </IconButton>
            <Typography
              component="h1"
              sx={{
                fontSize: { xs: "1rem", sm: "1.125rem" },
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: tokens.colors.neutral.textPrimary,
                display: { xs: "none", sm: "block" },
              }}
            >
              {title}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.375 }}>
              {themeToggle}
              <Tooltip title={isAllCollapsed ? "Expand All Sections" : "Collapse All Sections"}>
                <IconButton
                  onClick={onToggleAll}
                  data-testid="toggle-all-button"
                  size="small"
                  sx={{
                    color: isAllCollapsed ? tokens.colors.brand.main : tokens.colors.neutral.textSecondary,
                    transition: hoverTransition,
                    bgcolor: isAllCollapsed ? alpha(tokens.colors.brand.main, 0.08) : "transparent",
                    p: 0.5,
                    "&:hover": {
                      color: tokens.colors.brand.main,
                      bgcolor: alpha(tokens.colors.brand.main, 0.12),
                    },
                  }}
                >
                  {isAllCollapsed ? (
                    <ChevronsUpDown style={{ width: 18, height: 18 }} />
                  ) : (
                    <ChevronsDownUp style={{ width: 18, height: 18 }} />
                  )}
                </IconButton>
              </Tooltip>
              {providerPanelProps && <ProviderActivationMenu {...providerPanelProps} />}
            </Box>
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            {(error || isDirty || successMessage) && (
              <Box
                data-testid="status-bar"
                sx={{
                  display: { xs: "none", md: "flex" },
                  alignItems: "center",
                  gap: 1,
                  mr: 1.5,
                }}
              >
                {error && (
                  <StatusPill type="error" label={error} />
                )}
                {isDirty && (
                  <Box data-testid="unsaved-warning">
                    <StatusPill type="dirty" label="Unsaved Changes" pulse />
                  </Box>
                )}
                {successMessage && (
                  <StatusPill type="success" label={successMessage} pulse />
                )}
              </Box>
            )}

            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {syncReplaceToggle}
              {isMobile ? (
                <Box
                  sx={{
                    transform: "scale(0.85)",
                    transformOrigin: "right center",
                  }}
                >
                  {profileSelector}
                </Box>
              ) : (
                profileSelector
              )}
            </Box>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, height: 24, my: "auto", display: { xs: "none", sm: "flex" }, opacity: 0.6 }} />

            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ display: { xs: "none", sm: "flex" } }}>
              {zoomControls}
              {setDefaultProfileButton}
              {copyProfileButton}
              {totalReloadButton}
              <Tooltip title="Preview Raw Config">
                <IconButton
                  onClick={onRawConfigOpen}
                  data-testid="raw-config-open"
                  size="small"
                  sx={{
                    color: tokens.colors.neutral.textSecondary,
                    transition: hoverTransition,
                    p: 0.5,
                    "&:hover": {
                      color: tokens.colors.brand.main,
                      bgcolor: alpha(tokens.colors.brand.main, 0.08),
                    },
                  }}
                >
                  <Eye style={{ width: 17, height: 17 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Discard Changes">
                <IconButton
                  onClick={onReset}
                  disabled={loading || !isDirty}
                  data-testid="reset-button"
                  size="small"
                  sx={{
                    transition: hoverTransition,
                    p: 0.5,
                    "&:hover": {
                      color: tokens.colors.status.error,
                      bgcolor: alpha(tokens.colors.status.error, 0.08),
                    },
                    "&.Mui-disabled": {
                      color: "text.disabled",
                      bgcolor: "transparent",
                    },
                  }}
                >
                  <RotateCcw style={{ width: 17, height: 17 }} />
                </IconButton>
              </Tooltip>
            </Stack>

            <Tooltip title={isSaving ? "Saving..." : saveSuccess ? "Saved" : "Save Changes"}>
              <IconButton
                onClick={onSave}
                disabled={loading || !isDirty || isSaving}
                data-testid="save-button"
                size="small"
                sx={{
                  transition: hoverTransition,
                  p: 0.5,
                  color: saveSuccess ? tokens.colors.status.success : tokens.colors.brand.main,
                  "&:hover": {
                    color: tokens.colors.brand.main,
                    bgcolor: alpha(tokens.colors.brand.main, 0.08),
                  },
                  "&.Mui-disabled": {
                    color: "text.disabled",
                    bgcolor: "transparent",
                  },
                }}
              >
                {isSaving ? (
                  <Loader2 style={{ width: 17, height: 17, animation: `${spin} 1s linear infinite` }} />
                ) : saveSuccess ? (
                  <Check style={{ width: 17, height: 17 }} />
                ) : (
                  <Save style={{ width: 17, height: 17 }} />
                )}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Box
          sx={{
            display: { xs: "flex", md: "none" },
            alignItems: "center",
            flexWrap: "wrap",
            gap: 1,
            px: 2,
            py: 0.75,
            borderBottom: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          {loading && (
            <Chip
              label="Loading..."
              size="small"
              color="primary"
              variant="outlined"
              sx={{ fontSize: "0.6875rem", height: 24 }}
            />
          )}
          {error && (
            <Chip
              label={error}
              size="small"
              color="error"
              variant="outlined"
              sx={{ fontSize: "0.6875rem", height: 24 }}
            />
          )}
          {successMessage && (
            <Chip
              icon={<Save size={12} />}
              label={successMessage}
              size="small"
              sx={{
                fontSize: "0.6875rem",
                height: 24,
                bgcolor: alpha(tokens.colors.status.success, 0.08),
                color: tokens.colors.status.success,
              }}
            />
          )}
        </Box>
      </Box>
    </>
  );
}
