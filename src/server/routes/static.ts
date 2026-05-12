import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Hono } from "hono";
import { LOCAL_FONT_PRELOADS } from "../../shared/web-fonts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

interface RegisterStaticRouteOptions {
  staticDir: string;
}

function resolveRelativePath(requestPath: string): string {
  return requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
}

function resolveContentType(filePath: string): string {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

function renderShellHtml(): string {
  const fontPreloads = LOCAL_FONT_PRELOADS.map(
    (href) => `    <link rel="preload" href="${href}" as="font" type="font/woff2" crossorigin="anonymous" />`
  ).join("\n");

  return `<!doctype html>
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
}

async function tryReadAsset(staticDir: string, requestPath: string): Promise<Buffer | null> {
  const relativePath = resolveRelativePath(requestPath);
  const assetPath = path.resolve(staticDir, relativePath);
  const normalizedStaticDir = path.resolve(staticDir);

  const insideStaticDir =
    assetPath === normalizedStaticDir ||
    assetPath.startsWith(`${normalizedStaticDir}${path.sep}`);

  if (!insideStaticDir) {
    return null;
  }

  try {
    return await fs.readFile(assetPath);
  } catch {
    return null;
  }
}

async function tryReadEmbeddedAsset(requestPath: string): Promise<Uint8Array | null> {
  if (typeof Bun === "undefined") {
    return null;
  }

  const { embeddedAssets } = await import("../embedded-assets");
  const relativePath = resolveRelativePath(requestPath);
  const assetPath = embeddedAssets[`/${relativePath}`];

  if (!assetPath) {
    return null;
  }

  try {
    const file = Bun.file(assetPath);
    if (!(await file.exists())) {
      return null;
    }

    return new Uint8Array(await file.arrayBuffer());
  } catch {
    return null;
  }
}

async function tryReadProjectRootAsset(requestPath: string): Promise<Buffer | null> {
  const candidateRoots = [
    path.resolve(__dirname, "../../../"),
    path.resolve(__dirname, "../../../../"),
    path.resolve(process.cwd()),
  ];

  if (requestPath === "/icon.svg") {
    for (const root of candidateRoots) {
      try {
        return await fs.readFile(path.resolve(root, "icon.svg"));
      } catch {
      }
    }
  }

  const relativePath = resolveRelativePath(requestPath);
  if (relativePath.startsWith("fonts/")) {
    for (const root of candidateRoots) {
      const fontsRoot = path.resolve(root, "src/web/fonts");
      const fontPath = path.resolve(fontsRoot, relativePath.slice("fonts/".length));
      const isInsideFontsRoot =
        fontPath === fontsRoot || fontPath.startsWith(`${fontsRoot}${path.sep}`);

      if (!isInsideFontsRoot) {
        continue;
      }

      try {
        return await fs.readFile(fontPath);
      } catch {
      }
    }
  }

  return null;
}

export function registerStaticRoute(
  app: Hono,
  options: RegisterStaticRouteOptions,
): void {
  app.get("*", async (c) => {
    const assetBuffer =
      (await tryReadAsset(options.staticDir, c.req.path)) ||
      (await tryReadEmbeddedAsset(c.req.path)) ||
      (await tryReadProjectRootAsset(c.req.path));

    if (assetBuffer) {
      return new Response(new Uint8Array(assetBuffer), {
        headers: {
          "content-type": resolveContentType(c.req.path),
        },
      });
    }

    return c.html(renderShellHtml());
  });
}
