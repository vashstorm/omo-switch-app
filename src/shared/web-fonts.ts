export const LOCAL_FONT_PRELOADS = [
  "/fonts/ibm-plex-mono-400.woff2",
  "/fonts/ibm-plex-mono-500.woff2",
  "/fonts/ibm-plex-mono-700.woff2",
] as const;

export const LOCAL_FONT_FACE_CSS = `
@font-face {
  font-family: 'IBM Plex Mono';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/ibm-plex-mono-400.woff2') format('woff2');
}

@font-face {
  font-family: 'IBM Plex Mono';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('/fonts/ibm-plex-mono-500.woff2') format('woff2');
}

@font-face {
  font-family: 'IBM Plex Mono';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('/fonts/ibm-plex-mono-700.woff2') format('woff2');
}
`.trim();
