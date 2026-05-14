import React from "react";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import { useTheme, alpha } from "@mui/material/styles";
import { lightTokens, darkTokens } from "../../theme/designTokens";

interface SyncReplaceToggleProps {
  enabled: boolean;
  loading: boolean;
  onChange: (value: boolean) => void;
}

export function SyncReplaceToggle({ enabled, loading, onChange }: SyncReplaceToggleProps) {
  const muiTheme = useTheme();
  const isDark = muiTheme.palette.mode === "dark";
  const tokens = isDark ? darkTokens : lightTokens;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.checked);
  };

  return (
    <FormControlLabel
      control={
        <Switch
          checked={enabled}
          onChange={handleChange}
          disabled={loading}
          inputProps={{ "data-testid": "sync-replace-toggle" } as React.InputHTMLAttributes<HTMLInputElement>}
          size="small"
          sx={{
            "& .MuiSwitch-track": {
              backgroundColor: isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.15)",
              opacity: 1,
            },
            "& .MuiSwitch-thumb": {
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.3)",
            },
            "& .MuiSwitch-switchBase.Mui-checked": {
              color: tokens.colors.brand.main,
            },
            "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
              backgroundColor: alpha(tokens.colors.brand.main, 0.5),
              opacity: 1,
            },
          }}
        />
      }
      label="Sync Replace"
      sx={{
        "& .MuiFormControlLabel-label": {
          display: { xs: "none", sm: "inline" },
          fontSize: "0.8125rem",
          fontWeight: 500,
          color: "text.secondary",
        },
        ml: 0,
        mr: { xs: 0, sm: 1 },
      }}
    />
  );
}
