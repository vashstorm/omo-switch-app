import {
  Button,
  Typography,
  Stack,
  Box,
  Paper,
  Chip,
  Divider,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { lightTokens, darkTokens } from "../../theme/designTokens";
import {
  AlertTriangle,
  Layers,
  ArrowRight,
  Bot,
  Tag,
  X,
  RefreshCw,
} from "lucide-react";
import type { SyncReplaceImpact } from "../../sync-replace/modelSync";
import { DialogFrame } from "../common/DialogFrame";

interface SyncReplacePreviewDialogProps {
  open: boolean;
  impact: SyncReplaceImpact | null;
  onConfirm: () => void;
  onConfirmOne: () => void;
  onCancel: () => void;
}

export function SyncReplacePreviewDialog({
  open,
  impact,
  onConfirm,
  onConfirmOne,
  onCancel,
}: SyncReplacePreviewDialogProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const tokens = isDark ? darkTokens : lightTokens;

  if (!impact) return null;

  const { trigger, additionalAgents, additionalCategories } = impact;
  const totalImpact = 1 + additionalAgents.length + additionalCategories.length;

  const affectedChip = (
    <Chip
      label={`${totalImpact} Affected`}
      size="small"
      color="warning"
      sx={{
        fontWeight: 600,
        bgcolor: alpha(theme.palette.warning.main, 0.1),
        color: theme.palette.warning.dark,
      }}
    />
  );

  return (
    <DialogFrame
      open={open}
      title="Sync Replace Models"
      subtitle="Review the changes before applying"
      testId="sync-replace-preview-dialog"
      icon={
        <Box
          sx={{
            p: 0.5,
            borderRadius: 1.5,
            bgcolor: alpha(theme.palette.warning.main, 0.1),
            display: "flex",
          }}
        >
          <AlertTriangle size={20} color={theme.palette.warning.main} />
        </Box>
      }
      headerExtra={affectedChip}
      onClose={onCancel}
      maxWidth="sm"
      actions={
        <>
          <Button
            onClick={onCancel}
            data-testid="sync-replace-cancel"
            variant="outlined"
            color="secondary"
            startIcon={<X size={18} />}
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirmOne}
            variant="outlined"
            color="primary"
            data-testid="sync-replace-confirm-one"
            startIcon={<RefreshCw size={18} />}
            sx={{ borderRadius: 2, px: 2 }}
          >
            Replace One
          </Button>
          <Button
            onClick={onConfirm}
            variant="contained"
            color="warning"
            data-testid="sync-replace-confirm"
            startIcon={<RefreshCw size={18} />}
            sx={{ borderRadius: 2, px: 3 }}
          >
            Replace All
          </Button>
        </>
      }
    >
        <Stack spacing={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 2,
              bgcolor: alpha(tokens.colors.brand.main, 0.06),
              border: `1px solid ${alpha(tokens.colors.brand.main, 0.1)}`,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                top: -10,
                right: -10,
                opacity: 0.05,
                transform: "rotate(-15deg)",
                pointerEvents: "none",
              }}
            >
              <RefreshCw size={80} />
            </Box>

            <Stack spacing={2}>
<Stack direction="row" alignItems="center" spacing={1}>
                 <Layers size={16} color={tokens.colors.brand.main} />
                 <Typography
                   variant="caption"
                   sx={{
                     fontWeight: 700,
                     textTransform: "uppercase",
                     letterSpacing: "0.05em",
                     color: tokens.colors.brand.main,
                   }}
                 >
                   Trigger Source: {trigger.id}
                 </Typography>
               </Stack>

              <Stack
                direction="row"
                alignItems="center"
                justifyContent="center"
                spacing={2}
              >
                <Chip
                  label={trigger.oldModel}
                  variant="outlined"
                  color="secondary"
                  sx={{
                    borderRadius: 1.5,
                    px: 1,
                    maxWidth: 200,
                    "& .MuiChip-label": {
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    },
                  }}
                />
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: theme.palette.text.secondary,
                  }}
                >
                  <ArrowRight size={20} />
                </Box>
<Chip
                   label={trigger.newModel}
                   sx={{
                     borderRadius: 1.5,
                     px: 1,
                     fontWeight: 600,
                     maxWidth: 200,
                     bgcolor: tokens.colors.brand.main,
                     color: tokens.colors.neutral.surface,
                     boxShadow: `0 4px 12px ${alpha(
                       tokens.colors.brand.main,
                       0.25
                     )}`,
                     "& .MuiChip-label": {
                       overflow: "hidden",
                       textOverflow: "ellipsis",
                       whiteSpace: "nowrap",
                     },
                   }}
                 />
              </Stack>
            </Stack>
          </Paper>

          <Stack direction="row" spacing={1.5}>
            <Box sx={{ flex: 1 }}>
              <StatTile
                icon={<AlertTriangle size={18} />}
                value={totalImpact}
                label="Total Impact"
                color="warning"
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <StatTile
                icon={<Bot size={18} />}
                value={additionalAgents.length}
                label="Agents"
                color="primary"
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <StatTile
                icon={<Tag size={18} />}
                value={additionalCategories.length}
                label="Categories"
                color="secondary"
              />
            </Box>
          </Stack>

          <Stack spacing={2}>
            {additionalAgents.length > 0 && (
              <Box>
                <SectionHeader
                  icon={<Bot size={18} />}
                  title="Agents"
                  count={additionalAgents.length}
                  color="primary"
                />
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1.5 }}>
{additionalAgents.map((id) => (
                     <Chip
                       key={id}
                       label={id}
                       size="small"
                       sx={{
                         borderRadius: 1,
                         fontFamily: "monospace",
                         bgcolor: alpha(tokens.colors.brand.main, 0.08),
                         color: tokens.colors.brand.deep,
                         border: `1px solid ${alpha(
                           tokens.colors.brand.main,
                           0.1
                         )}`,
                       }}
                     />
                   ))}
                </Box>
              </Box>
            )}

            {additionalAgents.length > 0 && additionalCategories.length > 0 && (
              <Divider sx={{ opacity: 0.6 }} />
            )}

            {additionalCategories.length > 0 && (
              <Box>
                <SectionHeader
                  icon={<Tag size={18} />}
                  title="Categories"
                  count={additionalCategories.length}
                  color="secondary"
                />
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1.5 }}>
{additionalCategories.map((id) => (
                     <Chip
                       key={id}
                       label={id}
                       size="small"
                       sx={{
                         borderRadius: 1,
                         fontFamily: "monospace",
                         bgcolor: alpha(tokens.colors.section.categoryPrimary, 0.08),
                         color: tokens.colors.section.categoryPrimary,
                         border: `1px solid ${alpha(
                           tokens.colors.section.categoryPrimary,
                           0.1
                         )}`,
                       }}
                     />
                   ))}
                </Box>
              </Box>
            )}
          </Stack>
        </Stack>
    </DialogFrame>
  );
}

function StatTile({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  color: "primary" | "secondary" | "warning";
}) {
  const theme = useTheme();
  const paletteColor = theme.palette[color];

  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        borderRadius: 2.5,
        bgcolor: alpha(paletteColor.main, 0.04),
        border: `1px solid ${alpha(paletteColor.main, 0.1)}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      <Box sx={{ color: paletteColor.main, mb: 0.5, display: "flex" }}>
        {icon}
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1 }}>
        {value}
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontWeight: 500, mt: 0.5 }}
      >
        {label}
      </Typography>
    </Paper>
  );
}

function SectionHeader({
  icon,
  title,
  count,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  color: "primary" | "secondary";
}) {
  const theme = useTheme();
  const paletteColor = theme.palette[color];

  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <Box sx={{ color: paletteColor.main, display: "flex" }}>{icon}</Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      <Chip
        label={count}
        size="small"
        sx={{
          height: 20,
          minWidth: 20,
          fontSize: "0.7rem",
          fontWeight: 700,
          bgcolor: alpha(paletteColor.main, 0.1),
          color: paletteColor.dark,
        }}
      />
    </Stack>
  );
}
