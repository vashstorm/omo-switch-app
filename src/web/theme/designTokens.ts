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
  card: 8,
  section: 12,
  dialog: 4,
} as const;

const lightColors = {
  neutral: {
    background: "#f5f5f7",
    surface: "#ffffff",
    elevatedSurface: "#f0f0f2",
    textPrimary: "#1d1d1f",
    textSecondary: "rgba(0, 0, 0, 0.8)",
    divider: "rgba(0, 0, 0, 0.08)",
  },
  brand: {
    main: "#0071e3",
    hover: "#0077ED",
    deep: "#0066cc",
    soft: "rgba(0, 113, 227, 0.12)",
  },
  accent: {
    teal: {
      main: "#0071e3",
      deep: "#0066cc",
    },
  },
  status: {
    success: "#34A57E",
    warning: "#D49842",
    error: "#D86868",
  },
  section: {
    agentPrimary: "#0071e3",
    categoryPrimary: "#5856D6",
    miscPrimary: "#86868B",
  },
  sidebar: {
    railSurface: "#f5f5f7",
    elevatedSurface: "#ffffff",
    trayTint: "#f0f0f2",
    scrollbarThumb: "rgba(0, 0, 0, 0.15)",
    focusRing: "#0071e3",
  },
};

const darkColors = {
  neutral: {
    background: "#000000",
    surface: "#1c1c1e",
    elevatedSurface: "#2c2c2e",
    textPrimary: "#f5f5f7",
    textSecondary: "rgba(255, 255, 255, 0.7)",
    divider: "rgba(255, 255, 255, 0.08)",
  },
  brand: {
    main: "#2997ff",
    hover: "#5EB5FF",
    deep: "#0a84ff",
    soft: "rgba(41, 151, 255, 0.15)",
  },
  accent: {
    teal: {
      main: "#2997ff",
      deep: "#0a84ff",
    },
  },
  status: {
    success: "#30D158",
    warning: "#FFD60A",
    error: "#FF453A",
  },
  section: {
    agentPrimary: "#2997ff",
    categoryPrimary: "#BF5AF2",
    miscPrimary: "#98989D",
  },
  sidebar: {
    railSurface: "#1c1c1e",
    elevatedSurface: "#2c2c2e",
    trayTint: "#242426",
    scrollbarThumb: "rgba(255, 255, 255, 0.15)",
    focusRing: "#2997ff",
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
        contrastText: tokens.colors.neutral.surface,
      },
      secondary: {
        main: tokens.colors.accent.teal.main,
        light: tokens.colors.accent.teal.deep,
        dark: tokens.colors.accent.teal.deep,
        contrastText: tokens.colors.neutral.surface,
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
