import type { ReactNode } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import {
  Card,
  CardContent,
  Box,
  Typography,
  Button,
  ButtonBase
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import { TRANSITIONS } from "../../theme/motionTokens";
import { radii, lightTokens, darkTokens } from "../../theme/designTokens";

interface SectionEmptyStateConfig {
  icon: ReactNode;
  title: string;
  description: string;
  iconBg?: string;
  iconColor?: string;
}

interface SectionShellProps {
  id: string;
  title: string;
  sectionColor: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
  emptyState?: SectionEmptyStateConfig;
  onAddClick?: () => void;
  testId: string;
}

export function SectionShell({
  id,
  title,
  sectionColor,
  count,
  collapsed,
  onToggle,
  children,
  emptyState,
  onAddClick,
  testId,
}: SectionShellProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const tokens = isDark ? darkTokens : lightTokens;

  return (
    <Card
      id={id}
      data-testid={testId}
      sx={{
        borderRadius: 3,
        overflow: "hidden",
        boxShadow: collapsed
          ? "none"
          : isDark
            ? "0 2px 12px rgba(0, 0, 0, 0.24)"
            : "0 2px 12px rgba(0, 0, 0, 0.06)",
        transition: TRANSITIONS.collapse,
      }}
    >
      <Box sx={{ p: 0.5, pb: collapsed ? 0.5 : 0 }} data-section-header="">
        <ButtonBase
          onClick={onToggle}
          data-testid={`toggle-section-${id.replace("section-", "")}`}
          aria-expanded={!collapsed}
          aria-controls={`${id}-content`}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            justifyContent: "flex-start",
            textTransform: "none",
            color: "text.primary",
            width: "100%",
            py: 1.25,
            px: 2,
            borderRadius: 2,
            bgcolor: collapsed ? "transparent" : alpha(sectionColor, 0.02),
            transition: TRANSITIONS.control,
            "&:hover": {
              bgcolor: alpha(sectionColor, 0.04),
            },
          }}
        >
<Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
               width: 28,
               height: 28,
               borderRadius: 2,
               bgcolor: collapsed ? alpha(sectionColor, 0.08) : tokens.colors.brand.main,
               color: collapsed ? sectionColor : "common.white",
               transition: TRANSITIONS.control,
             }}
           >
            {collapsed ? (
              <ChevronRight style={{ width: 18, height: 18 }} />
            ) : (
              <ChevronDown style={{ width: 18, height: 18 }} />
            )}
          </Box>
          <Typography
            component="h2"
            variant="h6"
            sx={{
              fontWeight: 700,
              letterSpacing: "-0.015em",
              fontSize: "1rem",
              color: collapsed ? "text.primary" : sectionColor,
              flex: 1,
              textAlign: "left",
            }}
          >
            {title}
          </Typography>
          {count > 0 && (
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 22,
                height: 22,
                px: 0.75,
                borderRadius: 1.5,
                bgcolor: alpha(sectionColor, 0.1),
                color: sectionColor,
                fontSize: "0.6875rem",
                fontWeight: 600,
              }}
            >
              {count}
            </Box>
          )}
        </ButtonBase>
      </Box>
      {!collapsed && (
        <CardContent id={`${id}-content`} data-testid={`${testId}-content`} sx={{ p: 2, pt: 0.5, "&:last-child": { pb: 2 } }}>
          {children}
          {emptyState && (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2.5,
                py: 5,
                px: 3,
                bgcolor: tokens.colors.neutral.elevatedSurface,
                borderRadius: 3,
                mt: 2,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 52,
                  height: 52,
                  borderRadius: 3,
                  bgcolor: emptyState.iconBg ?? alpha(sectionColor, 0.08),
                  color: emptyState.iconColor ?? sectionColor,
                }}
              >
                {emptyState.icon}
              </Box>

              <Typography
                sx={{
                  fontSize: "1rem",
                  fontWeight: 600,
                  color: "text.primary",
                  textAlign: "center",
                }}
              >
                {emptyState.title}
              </Typography>

              <Typography
                sx={{
                  fontSize: "0.875rem",
                  color: "text.secondary",
                  maxWidth: 280,
                  textAlign: "center",
                  lineHeight: 1.5,
                }}
              >
                {emptyState.description}
              </Typography>

              {onAddClick && (
                <Button
                  variant="contained"
                  onClick={onAddClick}
                  sx={{
                    width: "100%",
                    maxWidth: 200,
                    borderRadius: 2,
                    fontWeight: 600,
                    textTransform: "none",
                    bgcolor: sectionColor,
                    "&:hover": { bgcolor: alpha(sectionColor, 0.85) },
                  }}
                >
                  <Plus style={{ width: 18, height: 18, marginRight: 6 }} />
                  Add
                </Button>
              )}
            </Box>
          )}
        </CardContent>
      )}
    </Card>
  );
}
