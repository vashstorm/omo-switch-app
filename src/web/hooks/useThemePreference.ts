import { useEffect, useState } from "react";

export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "omo-switch-theme";

const DEFAULT_THEME: Theme = "light";

function isTheme(value: string | null): value is Theme {
  return value === "dark" || value === "light";
}

export function resolveThemePreference(): Theme {
  if (typeof window === "undefined") {
    return DEFAULT_THEME;
  }

  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(storedTheme) ? storedTheme : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function applyThemeToDocument(theme: Theme) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.style.colorScheme = theme;
}

function persistThemePreference(theme: Theme) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
  }
}

export function useThemePreference() {
  const [theme, setTheme] = useState<Theme>(() => resolveThemePreference());

  useEffect(() => {
    applyThemeToDocument(theme);
    persistThemePreference(theme);
  }, [theme]);

  return {
    theme,
    setTheme,
    resolvedTheme: theme,
  };
}
