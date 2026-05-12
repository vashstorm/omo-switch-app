export const DISPLAY_FONT = `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif`;
export const BODY_FONT = `-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif`;
export const MONO_FONT = `'IBM Plex Mono', 'Fira Code', 'SFMono-Regular', Consolas, monospace`;

export const FONT_WEIGHTS = {
  light: 300,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
};

type FontSizeVariant = {
  fontSize: string;
  lineHeight?: number;
  letterSpacing?: string;
  textTransform?: string;
};

const headingSizes: Record<string, FontSizeVariant> = {
  h1: { fontSize: '2rem', lineHeight: 1.07, letterSpacing: '-0.028em' },
  h2: { fontSize: '1.5rem', lineHeight: 1.10, letterSpacing: '-0.02em' },
  h3: { fontSize: '1.25rem', lineHeight: 1.14, letterSpacing: '-0.015em' },
  h4: { fontSize: '1.125rem', lineHeight: 1.19, letterSpacing: '-0.01em' },
  h5: { fontSize: '1rem', lineHeight: 1.29, letterSpacing: '-0.022em' },
  h6: { fontSize: '0.875rem', lineHeight: 1.29, letterSpacing: '-0.01em' },
};

const bodySizes: Record<string, FontSizeVariant> = {
  body1: { fontSize: '1.0625rem', lineHeight: 1.47, letterSpacing: '-0.022em' },
  body2: { fontSize: '0.875rem', lineHeight: 1.43, letterSpacing: '-0.022em' },
  caption: { fontSize: '0.75rem', lineHeight: 1.33, letterSpacing: '-0.012em' },
  overline: { fontSize: '0.6875rem', lineHeight: 1.3, letterSpacing: '0.08em', textTransform: 'uppercase' },
};

function applyFont(
  font: string,
  variants: Record<string, FontSizeVariant>
): Record<string, { fontFamily: string; fontSize: string; fontWeight: number; lineHeight?: number; letterSpacing?: string; textTransform?: string }> {
  const result: Record<string, { fontFamily: string; fontSize: string; fontWeight: number; lineHeight?: number; letterSpacing?: string; textTransform?: string }> = {};
  for (const [key, size] of Object.entries(variants)) {
    result[key] = {
      fontFamily: font,
      fontSize: size.fontSize,
      fontWeight: FONT_WEIGHTS.semibold,
      ...(size.lineHeight !== undefined && { lineHeight: size.lineHeight }),
      ...(size.letterSpacing !== undefined && { letterSpacing: size.letterSpacing }),
      ...(size.textTransform !== undefined && { textTransform: size.textTransform }),
    };
  }
  return result;
}

export function createTypographyConfig(mode: 'light' | 'dark') {
  const textPrimary = mode === 'light' ? '#1d1d1f' : '#f5f5f7';
  const textSecondary = mode === 'light' ? 'rgba(0, 0, 0, 0.48)' : 'rgba(255, 255, 255, 0.55)';

  const headings = applyFont(DISPLAY_FONT, headingSizes);
  const bodies = applyFont(BODY_FONT, bodySizes);

  return {
    fontFamily: BODY_FONT,
    fontSize: 14,
    h1: { ...headings.h1, color: textPrimary },
    h2: { ...headings.h2, color: textPrimary },
    h3: { ...headings.h3, color: textPrimary },
    h4: { ...headings.h4, color: textPrimary },
    h5: { ...headings.h5, color: textPrimary },
    h6: { ...headings.h6, color: textPrimary },
    subtitle1: {
      fontFamily: BODY_FONT,
      fontSize: '0.9375rem',
      lineHeight: 1.6,
      fontWeight: FONT_WEIGHTS.medium,
      color: textSecondary,
    },
    subtitle2: {
      fontFamily: BODY_FONT,
      fontSize: '0.8125rem',
      lineHeight: 1.5,
      fontWeight: FONT_WEIGHTS.medium,
      color: textSecondary,
    },
    body1: { ...bodies.body1, color: textPrimary, fontWeight: FONT_WEIGHTS.regular },
    body2: { ...bodies.body2, color: textPrimary, fontWeight: FONT_WEIGHTS.regular },
    caption: { ...bodies.caption, color: textSecondary, fontWeight: FONT_WEIGHTS.regular },
    overline: { ...bodies.overline, color: textSecondary, fontWeight: FONT_WEIGHTS.medium },
    button: {
      fontFamily: BODY_FONT,
      fontWeight: FONT_WEIGHTS.medium,
      textTransform: 'none',
    },
    code: {
      fontFamily: MONO_FONT,
      fontSize: '0.8125rem',
      lineHeight: 1.5,
      fontWeight: FONT_WEIGHTS.regular,
    },
  };
}

export const typographyComponentOverrides = {
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
