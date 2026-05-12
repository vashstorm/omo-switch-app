import { ReactNode } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { radii, spacing } from "../../theme/designTokens";
import { BODY_FONT } from "../../theme/typography";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  hint?: string;
  testId?: string;
  iconBg?: string;
  iconColor?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  hint,
  testId = "empty-state",
  iconBg = "action.hover",
  iconColor = "primary.main",
}: EmptyStateProps) {
  return (
    <Box
      data-testid={testId}
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: spacing[2],
        py: spacing[4],
        px: spacing[3],
        bgcolor: "action.hover",
        borderRadius: radii.card,
        mt: spacing[2],
        border: "1px dashed",
        borderColor: "divider",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 48,
          height: 48,
          borderRadius: radii.control,
          bgcolor: iconBg,
          color: iconColor,
        }}
      >
        {icon}
      </Box>

      <Typography
        sx={{
          fontSize: "1rem",
          fontWeight: 600,
          color: "text.primary",
          textAlign: "center",
        }}
      >
        {title}
      </Typography>

      <Typography
        sx={{
          fontFamily: BODY_FONT,
          fontSize: "0.875rem",
          color: "text.secondary",
          maxWidth: 280,
          textAlign: "center",
          lineHeight: 1.5,
        }}
      >
        {description}
      </Typography>

      {actionLabel && onAction && (
        <Button
          variant="contained"
          onClick={onAction}
          sx={{
            width: "100%",
            maxWidth: 200,
            borderRadius: radii.control,
            fontWeight: 600,
            textTransform: "none",
          }}
        >
          {actionLabel}
        </Button>
      )}

      {hint && (
        <Typography
          sx={{
            fontSize: "0.75rem",
            color: "text.disabled",
            textAlign: "center",
            fontStyle: "italic",
          }}
        >
          {hint}
        </Typography>
      )}
    </Box>
  );
}
