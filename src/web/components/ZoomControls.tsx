import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { Minus, Plus, RotateCcw } from "lucide-react";
import {
  APP_ZOOM_STEP_PERCENT,
  DEFAULT_APP_ZOOM_PERCENT,
  MAX_APP_ZOOM_PERCENT,
  MIN_APP_ZOOM_PERCENT,
} from "../zoom/appZoom";
import { darkTokens, lightTokens } from "../theme/designTokens";
import { DURATIONS, EASING } from "../theme/motionTokens";

interface ZoomControlsProps {
  zoomPercent: number;
  loading?: boolean;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onReset: () => void;
}

export function ZoomControls({
  zoomPercent,
  loading = false,
  onZoomOut,
  onZoomIn,
  onReset,
}: ZoomControlsProps) {
  const theme = useTheme();
  const tokens = theme.palette.mode === "dark" ? darkTokens : lightTokens;
  const disabled = loading;
  const canZoomOut = zoomPercent > MIN_APP_ZOOM_PERCENT;
  const canZoomIn = zoomPercent < MAX_APP_ZOOM_PERCENT;
  const canReset = zoomPercent !== DEFAULT_APP_ZOOM_PERCENT;
  const transition = `all ${DURATIONS.FAST}ms ${EASING.EASE_OUT}`;

  const buttonSx = {
    p: 0.45,
    color: tokens.colors.neutral.textSecondary,
    transition,
    "&:hover": {
      color: tokens.colors.brand.main,
      bgcolor: alpha(tokens.colors.brand.main, 0.08),
    },
    "&.Mui-disabled": {
      color: "text.disabled",
      bgcolor: "transparent",
    },
  };

  return (
    <Box
      role="group"
      aria-label="App zoom controls"
      data-testid="zoom-controls"
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.25,
        px: 0.375,
        py: 0.25,
        border: `1px solid ${tokens.colors.neutral.divider}`,
        borderRadius: 1,
        bgcolor: alpha(tokens.colors.neutral.elevatedSurface, 0.58),
      }}
    >
      <Tooltip title={`Zoom Out ${APP_ZOOM_STEP_PERCENT}%`}>
        <span>
          <IconButton
            aria-label="Zoom Out"
            data-testid="zoom-out-button"
            size="small"
            disabled={disabled || !canZoomOut}
            onClick={onZoomOut}
            sx={buttonSx}
          >
            <Minus size={15} />
          </IconButton>
        </span>
      </Tooltip>
      <Typography
        aria-live="polite"
        data-testid="zoom-percent"
        sx={{
          width: 42,
          textAlign: "center",
          fontSize: "0.75rem",
          fontWeight: 700,
          lineHeight: 1,
          color: tokens.colors.neutral.textPrimary,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {zoomPercent}%
      </Typography>
      <Tooltip title={`Zoom In ${APP_ZOOM_STEP_PERCENT}%`}>
        <span>
          <IconButton
            aria-label="Zoom In"
            data-testid="zoom-in-button"
            size="small"
            disabled={disabled || !canZoomIn}
            onClick={onZoomIn}
            sx={buttonSx}
          >
            <Plus size={15} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Reset Zoom">
        <span>
          <IconButton
            aria-label="Reset Zoom"
            data-testid="zoom-reset-button"
            size="small"
            disabled={disabled || !canReset}
            onClick={onReset}
            sx={buttonSx}
          >
            <RotateCcw size={15} />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
}
