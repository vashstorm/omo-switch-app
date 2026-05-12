import { useState } from "react";
import {
  Box,
  Paper,
  IconButton,
  Typography,
  Chip,
  useTheme,
  Collapse,
} from "@mui/material";
import { alpha } from "@mui/system";
import {
  AlertCircle,
  RefreshCw,
  X,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { BODY_FONT, MONO_FONT } from "../../theme/typography";
import { EASING, DURATIONS } from "../../theme/motionTokens";
import { lightTokens, darkTokens } from "../../theme/designTokens";
import type { ErrorLogEntry, ErrorLogSource } from "../../error-log/types";

export interface ErrorLogPanelProps {
  entries: ErrorLogEntry[];
  loading: boolean;
  readError: string | null;
  hasUnread: boolean;
  onRefresh: () => void;
  onMarkSeen: () => void;
  onToggle: () => void;
  isExpanded: boolean;
}

const sourceBadgeConfig: Record<
  ErrorLogSource,
  { label: string; colorKey: "error" | "warning" | "info" | "secondary" }
> = {
  "frontend-request": { label: "Request", colorKey: "warning" },
  "frontend-runtime": { label: "Runtime", colorKey: "error" },
  "frontend-startup": { label: "Startup", colorKey: "info" },
  "backend-log": { label: "Backend", colorKey: "secondary" },
};

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function ErrorLogPanel({
  entries,
  loading,
  readError,
  hasUnread,
  onRefresh,
  onMarkSeen,
  onToggle,
  isExpanded,
}: ErrorLogPanelProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const colors = isDark ? darkTokens.colors : lightTokens.colors;
  const hasVisibleContent = entries.length > 0 || Boolean(readError);

  const unreadCount = hasUnread ? entries.length : 0;
  const recentCount = entries.length;

  if (!hasVisibleContent) {
    return null;
  }

  if (!isExpanded) {
    return (
      <Box
        data-testid="error-log-toggle"
        onClick={() => {
          onToggle();
          if (hasUnread) {
            onMarkSeen();
          }
        }}
        sx={{
          position: "fixed",
          bottom: 16,
          right: 16,
          zIndex: 9998,
          width: 48,
          height: 48,
          borderRadius: "24px",
          backgroundColor: isDark
            ? alpha(colors.neutral.surface, 0.92)
            : alpha(colors.neutral.surface, 0.92),
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)"}`,
          boxShadow: isDark
            ? "0 8px 32px rgba(0, 0, 0, 0.4)"
            : "0 8px 32px rgba(0, 0, 0, 0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: `all ${DURATIONS.NORMAL}ms ${EASING.EASE_OUT}`,
          "&:hover": {
            transform: "scale(1.05)",
            boxShadow: isDark
              ? "0 12px 40px rgba(0, 0, 0, 0.5)"
              : "0 12px 40px rgba(0, 0, 0, 0.12)",
          },
        }}
      >
        <Box
          sx={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AlertCircle
            size={22}
            color={hasVisibleContent ? colors.status.error : colors.neutral.textSecondary}
          />
          {unreadCount > 0 && (
            <Box
              sx={{
                position: "absolute",
                top: -4,
                right: -4,
                minWidth: 18,
                height: 18,
                borderRadius: "9px",
                backgroundColor: colors.status.error,
                color: "#fff",
                fontSize: "0.625rem",
                fontWeight: 600,
                fontFamily: BODY_FONT,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 4px",
              }}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Box>
          )}
        </Box>
        {recentCount > 0 && (
          <Typography
            sx={{
              position: "absolute",
              bottom: -2,
              right: 4,
              fontSize: "0.5rem",
              fontFamily: BODY_FONT,
              color: colors.neutral.textSecondary,
              fontWeight: 500,
            }}
          >
            {recentCount}
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Paper
      data-testid="error-log-panel"
      elevation={4}
      sx={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 9998,
        minWidth: 360,
        maxWidth: 480,
        maxHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        borderRadius: "12px",
        backgroundColor: isDark
          ? "rgba(28, 28, 30, 0.92)"
          : "rgba(255, 255, 255, 0.92)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)"}`,
        boxShadow: isDark
          ? "0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2)"
          : "0 8px 32px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          py: 1.5,
          borderBottom: `1px solid ${colors.neutral.divider}`,
          flexShrink: 0,
        }}
      >
        <Typography
          sx={{
            fontFamily: BODY_FONT,
            fontSize: "0.9375rem",
            fontWeight: 600,
            color: colors.neutral.textPrimary,
          }}
        >
          Error Log
        </Typography>
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <IconButton
            data-testid="error-log-refresh"
            size="small"
            onClick={onRefresh}
            disabled={loading}
            sx={{
              color: colors.neutral.textSecondary,
              p: 0.5,
              "&:hover": {
                backgroundColor: alpha(colors.neutral.textPrimary, 0.06),
              },
              "&.Mui-disabled": {
                opacity: 0.5,
              },
            }}
          >
            <RefreshCw
              size={16}
              style={loading ? { animation: `spin 1s linear infinite` } : {}}
            />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => {
              onToggle();
            }}
            sx={{
              color: colors.neutral.textSecondary,
              p: 0.5,
              "&:hover": {
                backgroundColor: alpha(colors.neutral.textPrimary, 0.06),
              },
            }}
          >
            <X size={16} />
          </IconButton>
        </Box>
      </Box>

      <Box
        sx={{
          flex: 1,
          overflow: "auto",
          p: 2,
        }}
      >
        {readError ? (
          <Box
            data-testid="error-log-error-state"
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1.5,
              py: 4,
            }}
          >
            <AlertCircle size={32} color={colors.status.error} />
            <Typography
              sx={{
                fontFamily: BODY_FONT,
                fontSize: "0.8125rem",
                color: colors.status.error,
                textAlign: "center",
                maxWidth: 280,
              }}
            >
              {readError}
            </Typography>
            <IconButton
              size="small"
              onClick={onRefresh}
              disabled={loading}
              sx={{
                color: colors.brand.main,
                "&:hover": {
                  backgroundColor: alpha(colors.brand.main, 0.08),
                },
              }}
            >
              <RefreshCw size={16} />
            </IconButton>
          </Box>
        ) : entries.length === 0 ? (
          <Box
            data-testid="error-log-empty"
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
              py: 6,
            }}
          >
            <AlertCircle size={32} color={colors.neutral.textSecondary} />
            <Typography
              sx={{
                fontFamily: BODY_FONT,
                fontSize: "0.8125rem",
                color: colors.neutral.textSecondary,
              }}
            >
              No errors recorded
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
            }}
          >
            {entries.map((entry, index) => (
              <ErrorLogEntryRow
                key={entry.id}
                entry={entry}
                index={index}
                colors={colors}
                isDark={isDark}
              />
            ))}
          </Box>
        )}
      </Box>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Paper>
  );
}

interface ErrorLogEntryRowProps {
  entry: ErrorLogEntry;
  index: number;
  colors: typeof lightTokens.colors;
  isDark: boolean;
}

function ErrorLogEntryRow({
  entry,
  index,
  colors,
  isDark,
}: ErrorLogEntryRowProps) {
  const [detailExpanded, setDetailExpanded] = useState(false);
  const badgeConfig = sourceBadgeConfig[entry.source];

  const getBadgeColor = () => {
    switch (badgeConfig.colorKey) {
      case "error":
        return colors.status.error;
      case "warning":
        return colors.status.warning;
      case "info":
        return colors.brand.main;
      case "secondary":
        return colors.neutral.textSecondary;
      default:
        return colors.neutral.textSecondary;
    }
  };

  const badgeColor = getBadgeColor();

  return (
    <Box
      data-testid={`error-log-entry-${index}`}
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1,
        pb: 1.5,
        borderBottom: `1px solid ${colors.neutral.divider}`,
        "&:last-child": {
          borderBottom: "none",
          pb: 0,
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 1,
          flexWrap: "wrap",
        }}
      >
        <Chip
          label={badgeConfig.label}
          size="small"
          sx={{
            height: 22,
            padding: "0 8px",
            fontFamily: BODY_FONT,
            fontSize: "0.6875rem",
            fontWeight: 500,
            backgroundColor: alpha(badgeColor, isDark ? 0.12 : 0.08),
            color: badgeColor,
            border: `1px solid ${alpha(badgeColor, 0.2)}`,
            borderRadius: "4px",
          }}
        />
        <Typography
          sx={{
            fontFamily: BODY_FONT,
            fontSize: "0.6875rem",
            color: colors.neutral.textSecondary,
            fontWeight: 400,
          }}
        >
          {formatRelativeTime(entry.timestamp)}
        </Typography>
        {entry.module && (
          <Typography
            sx={{
              fontFamily: MONO_FONT,
              fontSize: "0.6875rem",
              color: colors.neutral.textSecondary,
              fontWeight: 400,
            }}
          >
            {entry.module}
          </Typography>
        )}
        {entry.occurrences > 1 && (
          <Chip
            label={`x${entry.occurrences}`}
            size="small"
            sx={{
              height: 20,
              padding: "0 6px",
              fontFamily: BODY_FONT,
              fontSize: "0.625rem",
              fontWeight: 600,
              backgroundColor: alpha(colors.status.warning, isDark ? 0.15 : 0.1),
              color: colors.status.warning,
              borderRadius: "4px",
            }}
          />
        )}
      </Box>

      <Typography
        sx={{
          fontFamily: BODY_FONT,
          fontSize: "0.8125rem",
          lineHeight: 1.5,
          color: colors.neutral.textPrimary,
          wordBreak: "break-word",
        }}
      >
        {entry.message}
      </Typography>

      {entry.detail && (
        <>
          <Box
            onClick={() => setDetailExpanded(!detailExpanded)}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              cursor: "pointer",
              color: colors.brand.main,
              fontSize: "0.75rem",
              fontFamily: BODY_FONT,
              fontWeight: 500,
              "&:hover": {
                opacity: 0.8,
              },
            }}
          >
            {detailExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <Typography
              sx={{
                fontFamily: BODY_FONT,
                fontSize: "0.75rem",
                color: colors.brand.main,
                fontWeight: 500,
              }}
            >
              {detailExpanded ? "Hide details" : "Show details"}
            </Typography>
          </Box>
          <Collapse in={detailExpanded}>
            <Box
              sx={{
                backgroundColor: isDark
                  ? alpha(colors.neutral.textPrimary, 0.04)
                  : alpha(colors.neutral.textPrimary, 0.03),
                borderRadius: "6px",
                p: 1.5,
                mt: 0.5,
              }}
            >
              <Typography
                sx={{
                  fontFamily: MONO_FONT,
                  fontSize: "0.75rem",
                  lineHeight: 1.6,
                  color: colors.neutral.textPrimary,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {entry.detail}
              </Typography>
            </Box>
          </Collapse>
        </>
      )}
    </Box>
  );
}
