import type { ThemeOptions } from "@mui/material/styles";

const spacingBase = 8;

export const spacing = {
  0: 0,
  1: spacingBase,
  2: spacingBase * 2,
  3: spacingBase * 3,
  4: spacingBase * 4,
  6: spacingBase * 6,
  8: spacingBase * 8,
  10: spacingBase * 10,
  12: spacingBase * 12,
} as const;

export const radii = {
  control: 8,
  chip: 980,
  card: 12,
  section: 16,
  dialog: 12,
} as const;

const lightColors = {
  neutral: {
    background: "#faf9f5",
    surface: "#faf9f5",
    elevatedSurface: "#efe9de",
    textPrimary: "#141413",
    textSecondary: "#6c6a64",
    divider: "#e6dfd8",
  },
  brand: {
    main: "#cc785c",
    hover: "#a9583e",
    deep: "#a9583e",
    soft: "rgba(204, 120, 92, 0.14)",
  },
  accent: {
    teal: {
      main: "#5db8a6",
      deep: "#3b8f80",
    },
  },
  status: {
    success: "#5db872",
    warning: "#d4a017",
    error: "#c64545",
  },
  section: {
    agentPrimary: "#cc785c",
    categoryPrimary: "#5db8a6",
    miscPrimary: "#8e8b82",
    providersPrimary: "#e8a55a",
  },
  sidebar: {
    railSurface: "#f5f0e8",
    elevatedSurface: "#faf9f5",
    trayTint: "#efe9de",
    scrollbarThumb: "rgba(20, 20, 19, 0.18)",
    focusRing: "#cc785c",
  },
};

const darkColors = {
  neutral: {
    background: "#181715",
    surface: "#1f1e1b",
    elevatedSurface: "#252320",
    textPrimary: "#faf9f5",
    textSecondary: "#a09d96",
    divider: "rgba(250, 249, 245, 0.12)",
  },
  brand: {
    main: "#cc785c",
    hover: "#df9478",
    deep: "#a9583e",
    soft: "rgba(204, 120, 92, 0.18)",
  },
  accent: {
    teal: {
      main: "#5db8a6",
      deep: "#7bc9ba",
    },
  },
  status: {
    success: "#5db872",
    warning: "#e8a55a",
    error: "#ff7a70",
  },
  section: {
    agentPrimary: "#cc785c",
    categoryPrimary: "#5db8a6",
    miscPrimary: "#a09d96",
    providersPrimary: "#e8a55a",
  },
  sidebar: {
    railSurface: "#181715",
    elevatedSurface: "#252320",
    trayTint: "#1f1e1b",
    scrollbarThumb: "rgba(250, 249, 245, 0.18)",
    focusRing: "#cc785c",
  },
};

export interface ColorTokens {
  neutral: {
    background: string;
    surface: string;
    elevatedSurface: string;
    textPrimary: string;
    textSecondary: string;
    divider: string;
  };
  brand: {
    main: string;
    hover: string;
    deep: string;
    soft: string;
  };
  accent: {
    teal: {
      main: string;
      deep: string;
    };
  };
  status: {
    success: string;
    warning: string;
    error: string;
  };
  section: {
    agentPrimary: string;
    categoryPrimary: string;
    miscPrimary: string;
    providersPrimary: string;
  };
  sidebar: {
    railSurface: string;
    elevatedSurface: string;
    trayTint: string;
    scrollbarThumb: string;
    focusRing: string;
  };
}

export type SpacingTokens = typeof spacing;
export type RadiiTokens = typeof radii;

export interface DesignTokens {
  colors: ColorTokens;
  spacing: SpacingTokens;
  radii: RadiiTokens;
}

export const lightTokens: DesignTokens = {
  colors: lightColors,
  spacing,
  radii,
};

export const darkTokens: DesignTokens = {
  colors: darkColors,
  spacing,
  radii,
};

export function createTokenTheme(tokens: DesignTokens): ThemeOptions {
  return {
    palette: {
      primary: {
        main: tokens.colors.brand.main,
        light: tokens.colors.brand.soft,
        dark: tokens.colors.brand.deep,
        contrastText: "#ffffff",
      },
      secondary: {
        main: tokens.colors.accent.teal.main,
        light: tokens.colors.accent.teal.deep,
        dark: tokens.colors.accent.teal.deep,
        contrastText: "#ffffff",
      },
      success: {
        main: tokens.colors.status.success,
      },
      warning: {
        main: tokens.colors.status.warning,
      },
      error: {
        main: tokens.colors.status.error,
      },
      background: {
        default: tokens.colors.neutral.background,
        paper: tokens.colors.neutral.surface,
      },
      text: {
        primary: tokens.colors.neutral.textPrimary,
        secondary: tokens.colors.neutral.textSecondary,
      },
      divider: tokens.colors.neutral.divider,
    },
    shape: {
      borderRadius: tokens.radii.control,
    },
    spacing: (factor: number): string => `${tokens.spacing[factor as keyof typeof tokens.spacing] ?? factor * 8}px`,
  };
}
