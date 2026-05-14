export const LOCAL_FONT_PRELOADS = [
  "/fonts/geist-sans-variable.woff2",
  "/fonts/geist-mono-variable.woff2",
] as const;

export const LOCAL_FONT_FACE_CSS = `
@font-face {
  font-family: 'Geist Sans';
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url('/fonts/geist-sans-variable.woff2') format('woff2');
}

@font-face {
  font-family: 'Geist Mono';
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url('/fonts/geist-mono-variable.woff2') format('woff2');
}
`.trim();
