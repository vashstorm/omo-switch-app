import { Moon, Sun } from "lucide-react";
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";
import type { Theme } from "../theme/ThemeContext";
import { useTheme, alpha } from "@mui/material/styles";
import { EASING, DURATIONS } from "../theme/motionTokens";
import { lightTokens, darkTokens } from "../theme/designTokens";

interface ThemeToggleProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export function ThemeToggle({ theme, setTheme }: ThemeToggleProps) {
  const muiTheme = useTheme();
  const isDark = theme === "dark";
  const tokens = isDark ? darkTokens : lightTokens;

  const handleToggle = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <IconButton
      onClick={handleToggle}
      data-testid="theme-toggle"
      aria-label="Toggle theme"
      sx={{
        bgcolor: alpha(tokens.colors.brand.main, isDark ? 0.1 : 0.06),
        transition: `transform ${DURATIONS.NORMAL}ms ${EASING.EASE_OUT}, background-color ${DURATIONS.NORMAL}ms ${EASING.EASE_OUT}`,
        "&:hover": {
          transform: "scale(1.1)",
          bgcolor: alpha(tokens.colors.brand.main, isDark ? 0.15 : 0.1),
        },
        "&:active": {
          transform: "scale(0.95)",
        },
      }}
    >
      <Box
        component="span"
        sx={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "1.2rem",
          height: "1.2rem",
        }}
      >
        <Box
          component={Sun}
          sx={{
            width: "1.2rem",
            height: "1.2rem",
            color: tokens.colors.accent.teal.main,
            transform: isDark ? "rotate(-90deg) scale(0)" : "rotate(0deg) scale(1)",
            transition: `transform ${DURATIONS.DIALOG}ms ${EASING.EASE_OUT}, opacity ${DURATIONS.DIALOG}ms ${EASING.EASE_OUT}`,
          }}
        />
        <Box
          component={Moon}
          sx={{
            position: "absolute",
            width: "1.2rem",
            height: "1.2rem",
            color: tokens.colors.brand.soft,
            transform: isDark ? "rotate(0deg) scale(1)" : "rotate(90deg) scale(0)",
            transition: `transform ${DURATIONS.DIALOG}ms ${EASING.EASE_OUT}, opacity ${DURATIONS.DIALOG}ms ${EASING.EASE_OUT}`,
          }}
        />
      </Box>
    </IconButton>
  );
}