import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  Box,
  Fade,
  useTheme,
} from "@mui/material";
import { X } from "lucide-react";
import { alpha } from "@mui/material/styles";
import { DISPLAY_FONT } from "../../theme/typography";
import { EASING, DURATIONS } from "../../theme/motionTokens";

interface DialogFrameProps {
  open: boolean;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
  onClose: () => void;
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl" | false;
  fullWidth?: boolean;
  actions?: React.ReactNode;
  testId?: string;
  titleTestId?: string;
  closeTestId?: string;
  borderColor?: string;
  closeAriaLabel?: string;
}

export function DialogFrame({
  open,
  title,
  subtitle,
  icon,
  headerExtra,
  children,
  onClose,
  maxWidth = "sm",
  fullWidth = true,
  actions,
  testId,
  titleTestId,
  closeTestId,
  borderColor,
  closeAriaLabel = "Close",
}: DialogFrameProps) {
  const theme = useTheme();
  const brand = borderColor ?? theme.palette.primary.main;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      aria-labelledby="raw-config-title"
      TransitionComponent={Fade}
      TransitionProps={{
        timeout: DURATIONS.DIALOG,
        style: {
          transformOrigin: "top center",
        },
      }}
      PaperProps={{
        "data-testid": testId,
        sx: {
          borderRadius: '12px',
          overflow: "hidden",
          boxShadow: theme.palette.mode === "dark"
            ? "0 24px 48px rgba(0, 0, 0, 0.38)"
            : "0 24px 48px rgba(20, 20, 19, 0.16)",
        },
      }}
      BackdropProps={{
        sx: {
          backgroundColor:
            theme.palette.mode === "dark"
              ? "rgba(0, 0, 0, 0.6)"
              : "rgba(0, 0, 0, 0.4)",
        },
      }}
      sx={{
        "& .MuiDialog-paper": {
          animation: `${dialogEnter} ${DURATIONS.DIALOG}ms ${EASING.EASE_OUT}`,
        },
      }}
    >
      <DialogTitle id="raw-config-title" sx={{ pb: subtitle ? 0.5 : 1, pr: 2 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 1.5,
            width: "100%",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              gap: 1.5,
              flex: 1,
            }}
          >
            {icon && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mt: 0.25,
                  color: brand,
                }}
              >
                {icon}
              </Box>
            )}
            <Box sx={{ flex: 1 }}>
              <Typography
                component="div"
                data-testid={titleTestId}
                sx={{
                  fontFamily: DISPLAY_FONT,
                  fontWeight: 400,
                  fontSize: "1.25rem",
                  lineHeight: 1.2,
                  letterSpacing: 0,
                  color: theme.palette.text.primary,
                }}
              >
                {title}
              </Typography>
              {subtitle && (
                <Typography
                  variant="body2"
                  sx={{
                    color: theme.palette.text.secondary,
                    fontSize: "0.8125rem",
                    lineHeight: 1.5,
                    mt: 0.25,
                  }}
                >
                  {subtitle}
                </Typography>
              )}
            </Box>
          </Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              flexShrink: 0,
            }}
          >
            {headerExtra}
            <IconButton
              onClick={onClose}
              size="small"
              aria-label={closeAriaLabel}
              data-testid={closeTestId}
              sx={{
                color: "text.secondary",
                "&:hover": {
                  backgroundColor: alpha(theme.palette.text.primary, 0.08),
                },
              }}
            >
              <X size={20} />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: "20px 24px", overflowY: "auto" }}>
        {children}
      </DialogContent>

      {actions && (
        <DialogActions
          sx={{
            p: "16px 24px",
            pt: 1,
            gap: "12px",
            justifyContent: "flex-end",
          }}
        >
          {actions}
        </DialogActions>
      )}
    </Dialog>
  );
}

const dialogEnter = `
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;
