import { createTheme } from "@mui/material/styles";
import type { Theme } from "../hooks/useThemePreference";
import {
  lightTokens,
  darkTokens,
  createTokenTheme,
  type DesignTokens,
  type ColorTokens,
} from "./designTokens";
import {
  createTypographyConfig,
  DISPLAY_FONT,
  BODY_FONT,
  MONO_FONT,
} from "./typography";
import {
  TRANSITIONS,
  DURATIONS,
  createReducedMotionTransitions,
  EASING,
} from "./motionTokens";

function buildShadows(
  lightColor: string,
  darkColor: string,
  isDark: boolean
): string[] {
  const base = isDark ? darkColor : lightColor;
  return [
    "none",
    `0 1px 3px ${base}`,
    `0 2px 8px ${base}`,
    `0 8px 24px ${base}`,
    ...Array(20).fill(`0 8px 24px ${base}`),
  ];
}

function buildComponentOverrides(
  tokens: DesignTokens,
  transitionControl: string,
  transitionDialog: string,
  dialogBackdrop: string,
  isDark: boolean
) {
  const c = tokens.colors;
  const r = tokens.radii;
  const subtleShadow = isDark ? "rgba(0, 0, 0, 0.28)" : "rgba(20, 20, 19, 0.08)";
  const scrollbarThumb = c.sidebar.scrollbarThumb;
  const scrollbarTrack = "transparent";
  const reduced = createReducedMotionTransitions();
  const defaultTransition = reduced.control;
  const focusRingColor = c.sidebar.focusRing;

  return {
    MuiCssBaseline: {
      styleOverrides: () => ({
        "*": {
          boxSizing: "border-box",
          margin: 0,
          padding: 0,
        },
        "html, body, #root": {
          height: "100%",
        },
        body: {
          fontFamily: BODY_FONT,
          fontSize: 14,
          backgroundColor: c.neutral.background,
          color: c.neutral.textPrimary,
          lineHeight: 1.5,
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
          transition: defaultTransition,
        },
        "html *": {
          transition: `background-color ${TRANSITIONS.control.split(",")[0].match(/\d+ms/)?.[0] ?? "180ms"} ${EASING.EASE_OUT}, border-color ${TRANSITIONS.control.split(",")[1]?.match(/\d+ms/)?.[0] ?? "180ms"} ${EASING.EASE_OUT}`,
        },
        "button, input, select, textarea, a": {
          fontFamily: "inherit",
          transition: transitionControl,
        },
        "button, a": {
          cursor: "pointer",
        },
        a: {
          color: "inherit",
          textDecoration: "none",
        },
        ":focus-visible": {
          outline: `2px solid ${focusRingColor}`,
          outlineOffset: "2px",
        },
        "::-webkit-scrollbar": {
          width: "6px",
          height: "6px",
        },
        "::-webkit-scrollbar-track": {
          background: scrollbarTrack,
        },
        "::-webkit-scrollbar-thumb": {
          background: scrollbarThumb,
          borderRadius: "3px",
        },
        "::-webkit-scrollbar-thumb:hover": {
          background: c.brand.main,
        },
        "@media (prefers-reduced-motion: reduce)": {
          "*, *::before, *::after": {
            animationDuration: "0.01ms !important",
            animationIterationCount: "1 !important",
            transitionDuration: "0.01ms !important",
            scrollBehavior: "auto !important",
          },
        },
      }),
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: r.control,
          fontWeight: 500,
          letterSpacing: 0,
          minHeight: 36,
          textTransform: "none",
          transition: transitionControl,
        },
        containedPrimary: {
          backgroundColor: c.brand.main,
          color: "#fff",
          "&:hover": {
            backgroundColor: c.brand.hover,
          },
        },
        outlined: {
          borderColor: c.neutral.divider,
          color: c.neutral.textPrimary,
          backgroundColor: c.neutral.surface,
          "&:hover": {
            borderColor: c.brand.main,
            backgroundColor: c.brand.soft,
          },
        },
      },
      defaultProps: {
        disableElevation: true,
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: r.card,
          boxShadow: "none",
          backgroundImage: "none",
          border: `1px solid ${c.neutral.divider}`,
          backgroundColor: c.neutral.elevatedSurface,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: r.section,
          backgroundColor: c.neutral.surface,
          backgroundImage: "none",
          transition: transitionControl,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: "outlined" as const,
        size: "small" as const,
      },
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: r.control,
            backgroundColor: c.neutral.surface,
            transition: transitionControl,
            "& fieldset": {
              borderColor: c.neutral.divider,
            },
            "&:hover fieldset": {
              borderColor: c.brand.main,
            },
            "&.Mui-focused fieldset": {
              borderColor: c.brand.main,
              boxShadow: `0 0 0 3px ${c.brand.soft}`,
            },
          },
          "& .MuiOutlinedInput-input": {
            padding: "10px 14px",
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        notchedOutline: {
          "& legend": {
            transition: "none",
          },
          "& legend > span": {
            fontSize: "0.5625rem",
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          transition: `color ${DURATIONS.FAST}ms ${EASING.EASE_OUT}, transform ${DURATIONS.FAST}ms ${EASING.EASE_OUT}`,
          willChange: "color, transform",
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: r.control,
        },
      },
      defaultProps: {
        MenuProps: {
          PaperProps: {
            sx: {
              borderRadius: `${r.control}px`,
              border: `1px solid ${c.neutral.divider}`,
            },
          },
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: "0.875rem",
          borderRadius: `${r.control - 2}px`,
          margin: "2px 8px",
          transition: transitionControl,
          "&.Mui-selected": {
            backgroundColor: c.brand.soft,
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        root: {
          "& .MuiBackdrop-root": {
            backgroundColor: dialogBackdrop,
            transition: transitionDialog,
          },
        },
        paper: {
          borderRadius: r.dialog,
          border: `1px solid ${c.neutral.divider}`,
          boxShadow: isDark
            ? "0 24px 48px rgba(0, 0, 0, 0.38)"
            : "0 24px 48px rgba(20, 20, 19, 0.16)",
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRadius: 0,
          boxShadow: `0 8px 24px ${subtleShadow}`,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: r.chip,
          fontSize: "0.75rem",
          fontWeight: 500,
          letterSpacing: 0,
          transition: transitionControl,
        },
        sizeSmall: {
          height: 24,
          fontSize: "0.75rem",
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          borderRadius: 4,
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          fontSize: "0.75rem",
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: c.neutral.textSecondary,
        },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: {
          borderRadius: r.control,
        },
      },
      defaultProps: {
        animation: "pulse" as const,
      },
    },
    MuiTypography: {
      styleOverrides: {
        h1: { fontFamily: DISPLAY_FONT },
        h2: { fontFamily: DISPLAY_FONT },
        h3: { fontFamily: DISPLAY_FONT },
        h4: { fontFamily: DISPLAY_FONT },
        h5: { fontFamily: DISPLAY_FONT },
        h6: { fontFamily: DISPLAY_FONT },
        subtitle1: { fontFamily: BODY_FONT },
        subtitle2: { fontFamily: BODY_FONT },
        body1: { fontFamily: BODY_FONT },
        body2: { fontFamily: BODY_FONT },
        caption: { fontFamily: BODY_FONT },
        overline: { fontFamily: BODY_FONT },
      },
    },
  };
}

function buildSectionColors(colors: ColorTokens) {
  return {
    agent: colors.section.agentPrimary,
    category: colors.section.categoryPrimary,
    misc: colors.section.miscPrimary,
    providers: colors.section.providersPrimary,
  };
}

export function createMuiTheme(mode: Theme) {
  const tokens = mode === "light" ? lightTokens : darkTokens;
  const colors = tokens.colors;

  const tokenPalette = createTokenTheme(tokens);
  const typographyOptions = createTypographyConfig(mode);
  const isDark = mode === "dark";

  const shadows = buildShadows(
    "rgba(20, 20, 19, 0.08)",
    "rgba(0, 0, 0, 0.28)",
    isDark
  );

  const transitionControl = TRANSITIONS.control;
  const transitionDialog = TRANSITIONS.dialog;
  const dialogBackdrop = isDark
    ? "rgba(0, 0, 0, 0.5)"
    : "rgba(0, 0, 0, 0.3)";

  const components = buildComponentOverrides(
    tokens,
    transitionControl,
    transitionDialog,
    dialogBackdrop,
    isDark
  );

  const sectionColors = buildSectionColors(colors);

  const theme = createTheme({
    cssVariables: true,
    palette: {
      mode,
      ...tokenPalette.palette,
    },
    typography: typographyOptions,
    shape: {
      borderRadius: tokens.radii.control,
    },
    shadows: shadows as any,
    components,
  });

  (theme as any).sectionColors = sectionColors;

  return theme;
}

export const defaultMuiTheme = createMuiTheme("light");
