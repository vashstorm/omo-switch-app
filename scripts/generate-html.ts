import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const distWebDir = resolve(import.meta.dirname, "../dist/web");
mkdirSync(distWebDir, { recursive: true });

const fontPreloads = [
  "/fonts/ibm-plex-mono-400.woff2",
  "/fonts/ibm-plex-mono-500.woff2",
  "/fonts/ibm-plex-mono-700.woff2",
]
  .map((href) => `    <link rel="preload" href="${href}" as="font" type="font/woff2" crossorigin="anonymous" />`)
  .join("\n");

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>omo-switch</title>
    <link rel="icon" type="image/svg+xml" href="/icon.svg" />
${fontPreloads}
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/index.js"></script>
  </body>
</html>`;

writeFileSync(resolve(distWebDir, "index.html"), html);
console.log("Generated dist/web/index.html");