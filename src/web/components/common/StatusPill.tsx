import React from "react";
import { Chip, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { AlertCircle, Sparkles, Check, Info } from "lucide-react";
import { keyframes } from "@mui/system";
import { BODY_FONT } from "../../theme/typography";
import { lightTokens, darkTokens } from "../../theme/designTokens";

type StatusPillType = "error" | "warning" | "success" | "info" | "dirty";

interface StatusPillProps {
  type: StatusPillType;
  label: string;
  icon?: React.ReactElement;
  pulse?: boolean;
}

const pulseAnimation = keyframes({
  "0%, 100%": { opacity: 1 },
  "50%": { opacity: 0.6 },
});

const successPulseAnimation = keyframes({
  "0%": { transform: "scale(1)" },
  "50%": { transform: "scale(1.08)" },
  "100%": { transform: "scale(1)" },
});

export function StatusPill({ type, label, icon, pulse = false }: StatusPillProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const colors = isDark ? darkTokens.colors : lightTokens.colors;

  const configMap: Record<StatusPillType, { icon: React.ReactElement; bg: string; border: string; color: string; variant: "filled" | "outlined" }> = {
    error: {
      icon: <AlertCircle size={14} />,
      bg: alpha(colors.status.error, isDark ? 0.12 : 0.08),
      border: colors.status.error,
      color: colors.status.error,
      variant: "outlined",
    },
    warning: {
      icon: <Sparkles size={14} />,
      bg: alpha(colors.status.warning, isDark ? 0.18 : 0.14),
      border: "transparent",
      color: colors.status.warning,
      variant: "filled",
    },
    success: {
      icon: <Check size={14} />,
      bg: alpha(colors.status.success, isDark ? 0.15 : 0.1),
      border: "transparent",
      color: colors.status.success,
      variant: "filled",
    },
    info: {
      icon: <Info size={14} />,
      bg: "transparent",
      border: isDark ? colors.neutral.textSecondary : colors.neutral.divider,
      color: colors.neutral.textSecondary,
      variant: "outlined",
    },
    dirty: {
      icon: <Sparkles size={14} />,
      bg: alpha(colors.status.warning, isDark ? 0.12 : 0.08),
      border: alpha(colors.status.warning, 0.3),
      color: colors.status.warning,
      variant: "outlined",
    },
  };

  const config = configMap[type];
  const displayIcon = icon || config.icon;
  const isPulse = pulse && (type === "success" || type === "dirty");

  return (
    <Chip
      icon={displayIcon as React.ReactElement}
      label={label}
      variant={config.variant}
      data-testid={`status-${type}`}
      sx={{
        height: 28,
        padding: "0 10px 0 4px",
        fontFamily: BODY_FONT,
        fontSize: "0.75rem",
        fontWeight: 400,
        backgroundColor: config.bg,
        color: config.color,
        borderColor: config.border,
        borderWidth: config.variant === "outlined" ? "1px" : 0,
        borderStyle: config.variant === "outlined" ? "solid" : "none",
        gap: 0.5,
        ...(isPulse &&
          type === "dirty" && {
            animation: `${pulseAnimation} 2s ease-in-out infinite`,
          }),
        ...(isPulse &&
          type === "success" && {
            animation: `${successPulseAnimation} 400ms ease-in-out`,
          }),
        "& .MuiChip-icon": {
          margin: "0 4px 0 0 !important",
          fontSize: 14,
          width: 14,
          minWidth: 14,
        },
        "& .MuiChip-label": {
          padding: "0",
        },
      }}
    />
  );
}
