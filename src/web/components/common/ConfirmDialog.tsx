import { Button, DialogContentText, Box, useTheme } from "@mui/material";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import { DialogFrame } from "./DialogFrame";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  severity?: "warning" | "error" | "info" | "category";
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  severity = "info",
}: ConfirmDialogProps) {
  const theme = useTheme();
  const confirmButtonColor = severity === "error"
    ? "error"
    : severity === "warning"
    ? "warning"
    : severity === "category"
    ? "secondary"
    : "primary";

  const iconMap: Record<"error" | "warning" | "info" | "category", React.ReactNode> = {
    error: <AlertCircle size={22} />,
    warning: <AlertTriangle size={22} />,
    info: <Info size={22} />,
    category: <Info size={22} />,
  };

  const borderColor = severity === "category"
    ? theme.palette.secondary.main
    : severity === "error"
    ? theme.palette.error.main
    : severity === "warning"
    ? theme.palette.warning.main
    : undefined;

  return (
    <DialogFrame
      open={open}
      title={title}
      borderColor={borderColor}
      icon={<Box sx={{ display: "flex" }} color={
        severity === "error"
          ? theme.palette.error.main
          : severity === "warning"
          ? theme.palette.warning.main
          : severity === "category"
          ? theme.palette.secondary.main
          : theme.palette.primary.main
      }>
        {iconMap[severity]}
      </Box>}
      onClose={onCancel}
      maxWidth="xs"
      titleTestId="confirm-dialog-title"
      actions={
        <>
          <Button
            variant="outlined"
            onClick={onCancel}
            data-testid="confirm-dialog-cancel"
          >
            {cancelLabel}
          </Button>
          <Button
            variant="contained"
            color={confirmButtonColor}
            onClick={onConfirm}
            data-testid="confirm-dialog-confirm"
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <DialogContentText data-testid="confirm-dialog-description">
        {description}
      </DialogContentText>
    </DialogFrame>
  );
}
