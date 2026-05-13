import { useCallback, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { alpha } from "@mui/material/styles";
import { Check, Copy } from "lucide-react";
import type { ProfileConfigResult } from "../../hooks/useProfile";
import { DURATIONS, EASING } from "../../theme/motionTokens";
import { MONO_FONT } from "../../theme/typography";
import { DialogFrame } from "./DialogFrame";

interface RawConfigDialogProps {
  open: boolean;
  onClose: () => void;
  profile: ProfileConfigResult | null;
  isDark: boolean;
  tokens: {
    colors: {
      neutral: {
        background: string;
        elevatedSurface: string;
        textPrimary: string;
        textSecondary: string;
        divider: string;
      };
      status: {
        success: string;
      };
    };
  };
  onCopyError: () => void;
}

const PREVIEW_KEY_ORDER = ["$schema", "agents", "categories", "tmux", "git_master"];

function buildSortedPreviewData(profile: ProfileConfigResult): Record<string, unknown> {
  const merged: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(profile.readonlyTail as Record<string, unknown>)) {
    if (key !== "agents" && key !== "categories" && key !== "misc") {
      merged[key] = val;
    }
  }

  if (Object.keys(profile.effective.agents).length > 0) {
    merged.agents = profile.effective.agents;
  }
  if (Object.keys(profile.effective.categories).length > 0) {
    merged.categories = profile.effective.categories;
  }

  const result: Record<string, unknown> = {};
  for (const key of PREVIEW_KEY_ORDER) {
    if (key in merged) {
      result[key] = merged[key];
    }
  }
  for (const key of Object.keys(merged).sort()) {
    if (!PREVIEW_KEY_ORDER.includes(key)) {
      result[key] = merged[key];
    }
  }

  return result;
}

export default function RawConfigDialog({
  open,
  onClose,
  profile,
  isDark,
  tokens,
  onCopyError,
}: RawConfigDialogProps) {
  const [copied, setCopied] = useState(false);

  const rawConfigText = useMemo(() => {
    if (!open) return "";
    return profile ? JSON.stringify(buildSortedPreviewData(profile), null, 2) : "No profile selected";
  }, [open, profile]);

  const handleClose = useCallback(() => {
    setCopied(false);
    onClose();
  }, [onClose]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(rawConfigText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      onCopyError();
    }
  }, [onCopyError, rawConfigText]);

  return (
    <DialogFrame
      open={open}
      onClose={handleClose}
      title="Raw Configuration"
      testId="raw-config-modal"
      closeTestId="raw-config-close"
      closeAriaLabel="Close raw configuration modal"
      headerExtra={
        <Tooltip title="Copy to clipboard">
          <IconButton
            size="small"
            onClick={handleCopy}
            data-testid="raw-config-copy"
            sx={{
              transition: `color ${DURATIONS.NORMAL}ms ${EASING.EASE_OUT}`,
              color: copied ? tokens.colors.status.success : "text.secondary",
              "&:hover": {
                bgcolor: alpha(tokens.colors.neutral.textSecondary, 0.08),
              },
            }}
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
          </IconButton>
        </Tooltip>
      }
      maxWidth="md"
    >
      <Box
        component="pre"
        data-testid="raw-config-content"
        sx={{
          fontFamily: MONO_FONT,
          fontSize: "0.8125rem",
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          bgcolor: isDark
            ? alpha(tokens.colors.neutral.elevatedSurface, 0.6)
            : alpha(tokens.colors.neutral.background, 0.8),
          color: tokens.colors.neutral.textPrimary,
          p: 2,
          borderRadius: 2,
          overflow: "auto",
          maxHeight: "60vh",
          border: `1px solid ${tokens.colors.neutral.divider}`,
        }}
      >
        {rawConfigText}
      </Box>
    </DialogFrame>
  );
}
