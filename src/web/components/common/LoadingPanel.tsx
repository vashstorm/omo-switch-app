import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import { radii, spacing } from "../../theme/designTokens";

type LoadingVariant = "skeleton" | "spinner" | "section";

interface LoadingPanelProps {
  variant?: LoadingVariant;
  lines?: number;
  testId?: string;
}

export function LoadingPanel({
  variant = "skeleton",
  lines = 3,
  testId = "loading-panel",
}: LoadingPanelProps) {
  if (variant === "spinner") {
    return (
      <Box
        data-testid={testId}
        aria-busy="true"
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          py: spacing[6],
          gap: spacing[2],
        }}
      >
        <CircularProgress
          size={32}
          sx={{ color: "primary.main" }}
        />
        <Typography
          sx={{
            color: "text.secondary",
            fontSize: "0.875rem",
          }}
        >
          Loading...
        </Typography>
      </Box>
    );
  }

  if (variant === "section") {
    return (
      <Box
        data-testid={testId}
        aria-busy="true"
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: spacing[1],
          p: spacing[4],
        }}
      >
        <Skeleton
          variant="rectangular"
          height={28}
          width="40%"
          sx={{ borderRadius: radii.control, bgcolor: "action.hover" }}
        />
        <Stack spacing={spacing[1]}>
          {skeletonRows(Math.max(lines, 2))}
        </Stack>
      </Box>
    );
  }

  return (
    <Stack
      data-testid={testId}
      aria-busy="true"
      spacing={spacing[1]}
      sx={{ p: spacing[4] }}
    >
      <Skeleton
        variant="rectangular"
        height={28}
        width="60%"
        sx={{ borderRadius: radii.control, bgcolor: "action.hover" }}
      />
      {skeletonRows(lines)}
    </Stack>
  );
}

function skeletonRows(count: number) {
  return new Array(count).fill(null).map(() => {
    const id = crypto.randomUUID();
    return (
      <Skeleton
        key={id}
        variant="rectangular"
        height={64}
        sx={{ borderRadius: radii.card, bgcolor: "action.hover" }}
      />
    );
  });
}
