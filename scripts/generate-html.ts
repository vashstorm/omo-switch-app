import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const distWebDir = resolve(import.meta.dirname, "../dist/web");
mkdirSync(distWebDir, { recursive: true });

const fontPreloads = [
  "./fonts/geist-sans-variable.woff2",
  "./fonts/geist-mono-variable.woff2",
]
  .map((href) => `    <link rel="preload" href="${href}" as="font" type="font/woff2" crossorigin="anonymous" />`)
  .join("\n");

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>omo-switch</title>
    <link rel="icon" type="image/svg+xml" href="./icon.svg" />
${fontPreloads}
  </head>
  <body>
    <div id="root"></div>
    <script>
      (() => {
        const showStartupError = (message, detail) => {
          const root = document.getElementById("root");
          if (!root || root.childElementCount > 0) return;
          root.style.cssText = "box-sizing:border-box;height:100vh;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#7f1d1d;background:#fff7ed;white-space:pre-wrap;";
          root.textContent = "Failed to start omo-switch\\n\\n" + message + (detail ? "\\n\\n" + detail : "");
        };
        window.addEventListener("error", (event) => {
          showStartupError(event.message || "Unknown startup error", event.error?.stack || event.filename || "");
        });
        window.addEventListener("unhandledrejection", (event) => {
          const reason = event.reason;
          showStartupError(reason?.message || String(reason || "Unhandled promise rejection"), reason?.stack || "");
        });
      })();
    </script>
    <script type="module" src="./index.js"></script>
  </body>
</html>`;

writeFileSync(resolve(distWebDir, "index.html"), html);
console.log("Generated dist/web/index.html");
