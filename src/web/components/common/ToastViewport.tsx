import { Box, IconButton, Paper, Typography, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { X, CheckCircle, AlertCircle } from "lucide-react";
import { keyframes } from "@mui/system";
import { BODY_FONT } from "../../theme/typography";
import { EASING, DURATIONS } from "../../theme/motionTokens";
import { lightTokens, darkTokens } from "../../theme/designTokens";

export interface ToastItem {
  id: number;
  type: "success" | "error";
  message: string;
}

interface ToastViewportProps {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}

const slideIn = keyframes({
  from: {
    opacity: 0,
    transform: "translateX(100%)",
  },
  to: {
    opacity: 1,
    transform: "translateX(0)",
  },
});

const slideOutDown = keyframes({
  from: {
    opacity: 1,
    transform: "translateY(0)",
  },
  to: {
    opacity: 0,
    transform: "translateY(8px)",
  },
});

export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const colors = isDark ? darkTokens.colors : lightTokens.colors;
  const maxVisible = 3;
  const visible = toasts.slice(-maxVisible).reverse();

  return (
    <Box
      data-testid="toast-viewport"
      sx={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        pointerEvents: "none",
      }}
    >
      {visible.map((toast, index) => {
        const borderColor =
          toast.type === "error" ? colors.status.error : colors.status.success;
        const icon =
          toast.type === "error" ? (
            <AlertCircle size={18} />
          ) : (
            <CheckCircle size={18} />
          );
        const isExiting = index >= 2;

        return (
          <Paper
            key={toast.id}
            data-testid={`toast-${toast.type}`}
            elevation={3}
            sx={{
              display: "flex",
              alignItems: "flex-start",
              gap: 1.5,
              p: "12px 16px",
              pr: 12,
              borderRadius: "12px",
              minWidth: 280,
              maxWidth: 380,
              backgroundColor: isDark
                ? "rgba(28, 28, 30, 0.92)"
                : "rgba(255, 255, 255, 0.92)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)"}`,
              borderLeft: `4px solid ${borderColor}`,
              boxShadow: isDark
                ? "0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2)"
                : "0 8px 32px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)",
              animation: isExiting
                ? `${slideOutDown} ${DURATIONS.NORMAL}ms ${EASING.EASE_OUT}`
                : `${slideIn} ${DURATIONS.NORMAL}ms ${EASING.EASE_OUT}`,
              pointerEvents: "auto",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                mt: 0.5,
                color: borderColor,
                flexShrink: 0,
              }}
            >
              {icon}
            </Box>
            <Typography
              sx={{
                fontFamily: BODY_FONT,
                fontSize: "0.8125rem",
                lineHeight: 1.5,
                color: theme.palette.text.primary,
                flex: 1,
                wordBreak: "break-word",
              }}
            >
              {toast.message}
            </Typography>
            <IconButton
              size="small"
              onClick={() => onDismiss(toast.id)}
              sx={{
                position: "absolute",
                right: 8,
                top: 8,
                color: "text.secondary",
                p: 0.5,
                "&:hover": {
                  backgroundColor: alpha(theme.palette.text.primary, 0.06),
                },
              }}
            >
              <X size={14} />
            </IconButton>
          </Paper>
        );
      })}
    </Box>
  );
}
