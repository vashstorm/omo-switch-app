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
  createReducedMotionTransitions,
  EASING,
} from "./motionTokens";

function buildShadows(
  lightColor: string,
  darkColor: string,
  isDark: boolean
): string[] {
  // Apple's minimal shadow approach: single soft shadow
  const base = isDark ? darkColor : lightColor;
  return [
    "none",
    `0 2px 8px ${base}`, // subtle
    `0 3px 10px ${base}`, // medium - Apple's card shadow
    `3px 5px 30px ${base}`, // elevated - Apple's signature shadow
    ...Array(20).fill(`3px 5px 30px ${base}`), // fill rest with elevated
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
  const appleShadowLight = "rgba(0, 0, 0, 0.08)";
  const appleShadowDark = "rgba(0, 0, 0, 0.2)";
  const cardShadow = isDark ? `0 3px 10px ${appleShadowDark}` : `0 3px 10px ${appleShadowLight}`;
  const scrollbarThumb = c.sidebar.scrollbarThumb;
  const scrollbarTrack = "transparent";
  const reduced = createReducedMotionTransitions();
  const defaultTransition = reduced.control;
  const focusRingColor = c.sidebar.focusRing;

  return {
    MuiCssBaseline: {
      styleOverrides: () => ({
        "@global": {
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
            background: isDark ? c.neutral.textPrimary : c.brand.main,
          },
          "@media (prefers-reduced-motion: reduce)": {
            "*, *::before, *::after": {
              animationDuration: "0.01ms !important",
              animationIterationCount: "1 !important",
              transitionDuration: "0.01ms !important",
              scrollBehavior: "auto !important",
            },
          },
        },
      }),
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: r.control,
          fontWeight: 500,
          transition: transitionControl,
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
          boxShadow: cardShadow,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: r.section,
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
            transition: transitionControl,
          },
          "& .MuiOutlinedInput-input": {
            padding: "10px 14px",
          },
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
              borderRadius: `${r.control - 4}px`,
            },
          },
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: "0.875rem",
          borderRadius: `${r.control - 6}px`,
          margin: "2px 8px",
          transition: transitionControl,
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
          boxShadow: isDark
            ? "0 24px 48px rgba(0, 0, 0, 0.4)"
            : "0 24px 48px rgba(0, 0, 0, 0.22)",
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRadius: 0,
          boxShadow: isDark ? `0 2px 8px ${appleShadowDark}` : `0 2px 8px ${appleShadowLight}`,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: r.chip,
          fontSize: "0.75rem",
          fontWeight: 500,
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
          letterSpacing: "0.05em",
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
  };
}

export function createMuiTheme(mode: Theme) {
  const tokens = mode === "light" ? lightTokens : darkTokens;
  const colors = tokens.colors;

  const tokenPalette = createTokenTheme(tokens);
  const typographyOptions = createTypographyConfig(mode);
  const isDark = mode === "dark";

  const shadows = buildShadows(
    "rgba(0, 0, 0, 0.22)",
    "rgba(0, 0, 0, 0.4)",
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