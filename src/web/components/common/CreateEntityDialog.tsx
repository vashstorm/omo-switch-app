import { useState, useEffect, useRef } from "react";
import { Button, TextField, Box, Typography, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { DialogFrame } from "./DialogFrame";
import { PlusCircle } from "lucide-react";

interface CreateEntityDialogProps {
  open: boolean;
  title: string;
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  loading?: boolean;
  error?: string | null;
  pattern?: RegExp;
}

export function CreateEntityDialog({
  open,
  title,
  label,
  placeholder = "e.g. my-new-entity",
  value,
  onChange,
  onSubmit,
  onCancel,
  loading = false,
  error = null,
  pattern,
}: CreateEntityDialogProps) {
  const theme = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);
  const [patternError, setPatternError] = useState<string | null>(null);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      setPatternError(null);
    }
  }, [open]);

  const validatePattern = (val: string) => {
    if (pattern && val && !pattern.test(val)) {
      setPatternError(`Must match pattern: ${pattern.source}`);
    } else {
      setPatternError(null);
    }
  };

  const isInvalid = !!error || !!patternError;
  const isEmpty = !value.trim();
  const isDisabled = isEmpty || loading;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    validatePattern(val);
  };

  return (
    <DialogFrame
      open={open}
      title={title}
      icon={<PlusCircle size={20} color={theme.palette.primary.main} />}
      onClose={onCancel}
      actions={
        <>
          <Button
            variant="outlined"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={onSubmit as any}
            disabled={isDisabled}
          >
            {loading ? "Creating..." : "Create"}
          </Button>
        </>
      }
    >
      <Box component="form" onSubmit={onSubmit}>
        <TextField
          inputRef={inputRef}
          label={label}
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          fullWidth
          autoFocus
          disabled={loading}
          error={isInvalid}
          helperText={
            isInvalid ? (
              <Typography
                component="span"
                sx={{ color: theme.palette.error.main }}
              >
                {error || patternError}
              </Typography>
            ) : undefined
          }
          slotProps={{
            htmlInput: {
              "data-testid": "create-entity-input",
            },
          }}
          sx={{
            mt: 1,
          }}
        />
      </Box>
    </DialogFrame>
  );
}
