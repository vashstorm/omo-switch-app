import fs from "node:fs/promises";
import { createServer as createNodeHttpServer, type IncomingMessage } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Hono } from "hono";

import { registerHealthRoute } from "./routes/health";
import { registerProfileRoutes } from "./routes/profiles";
import { registerStaticRoute } from "./routes/static";
import { registerGlobalConfigRoute } from "./routes/global-config";
import { registerErrorLogRoutes } from "./routes/error-logs";
import {
  expandHomePath,
  readGlobalConfig,
  resolveGlobalConfigPath,
  type GlobalConfig,
} from "../shared/config/global-config";
import { loggers } from "../shared/logger";

const APP_VERSION = "0.1.0";

export interface CreateAppOptions {
  profilesRoot?: string;
  staticDir?: string;
  hostname?: string;
  port?: number;
  autoOpen?: boolean;
  version?: string;
  configPath?: string;
}

export interface RunningApp {
  app: Hono;
  server: {
    port: number;
    stop: () => void;
  };
  url: string;
  port: number;
  profilesRoot: string;
  stop: () => void;
}

function hasBunRuntime(): boolean {
  return typeof Bun !== "undefined";
}

function isBunMainAvailable(): boolean {
  return hasBunRuntime() && typeof Bun.main === "string" && Bun.main.length > 0;
}

function isCompiledBinaryRuntime(): boolean {
  return isBunMainAvailable() && Bun.main.includes("bunfs");
}

function resolveRuntimeBaseDir(metaDir: string): string {
  if (isCompiledBinaryRuntime()) {
    return path.dirname(process.execPath);
  }

  if (isBunMainAvailable()) {
    return path.dirname(Bun.main);
  }

  return metaDir || path.dirname(fileURLToPath(import.meta.url));
}

async function firstExistingPath(candidates: string[]): Promise<string> {
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Path does not exist - continue to next candidate
    }
  }

  return candidates[0];
}

export async function resolveProfilesRoot(
  explicitProfilesRoot?: string,
  runtimeBaseDir: string = resolveRuntimeBaseDir(import.meta.dir || ""),
  globalConfig?: GlobalConfig,
  configPath?: string,
): Promise<string> {
  if (explicitProfilesRoot) {
    return path.resolve(expandHomePath(explicitProfilesRoot));
  }

  const gc = globalConfig !== undefined ? globalConfig : await readGlobalConfig(configPath);
  if (gc.config_path && gc.config_path.length > 0) {
    const firstPath = expandHomePath(gc.config_path[0]);
    if (path.isAbsolute(firstPath)) {
      return firstPath;
    }

    const resolvedConfigPath = resolveGlobalConfigPath(configPath);
    return path.resolve(path.dirname(resolvedConfigPath), firstPath);
  }

  const candidates = [
    path.resolve(runtimeBaseDir, "config/profiles"),
    path.resolve(runtimeBaseDir, "../config/profiles"),
    path.resolve(runtimeBaseDir, "../../config/profiles"),
  ];

  return firstExistingPath(candidates);
}

async function resolveStaticDir(explicitDir?: string): Promise<string> {
  if (explicitDir) {
    return explicitDir;
  }

  const runtimeBaseDir = resolveRuntimeBaseDir(import.meta.dir || "");
  const candidates = [
    path.resolve(runtimeBaseDir, "web"),
    path.resolve(runtimeBaseDir, "dist/web"),
    path.resolve(runtimeBaseDir, "../dist/web"),
    path.resolve(runtimeBaseDir, "../../dist/web"),
  ];

  return firstExistingPath(candidates);
}

function shouldAutoOpen(autoOpen: boolean): boolean {
  return (
    autoOpen &&
    hasBunRuntime() &&
    process.platform === "darwin" &&
    process.env.NODE_ENV !== "test"
  );
}

async function readNodeRequestBody(req: IncomingMessage): Promise<Uint8Array | undefined> {
  if (req.method === "GET" || req.method === "HEAD") {
    return undefined;
  }

  const chunks: Uint8Array[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  if (chunks.length === 0) {
    return undefined;
  }

  return Buffer.concat(chunks);
}

async function startNodeServer(
  app: Hono,
  hostname: string,
  port: number,
): Promise<{ port: number; stop: () => void }> {
  const server = createNodeHttpServer(async (req, res) => {
    const host = req.headers.host ?? `${hostname}:${port}`;
    const url = `http://${host}${req.url ?? "/"}`;
    const body = await readNodeRequestBody(req);
    const request = new Request(url, {
      method: req.method,
      headers: req.headers as HeadersInit,
      body: body as unknown as BodyInit,
    });

    const response = await app.fetch(request);
    res.statusCode = response.status;

    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    const responseBody = await response.arrayBuffer();
    res.end(Buffer.from(responseBody));
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, hostname, () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address();
  const boundPort = typeof address === "object" && address ? address.port : 0;

  return {
    port: boundPort,
    stop: () => {
      server.close();
    },
  };
}

export async function createApp(options: CreateAppOptions = {}): Promise<RunningApp> {
  const profilesRoot = await resolveProfilesRoot(
    options.profilesRoot,
    resolveRuntimeBaseDir(import.meta.dir || ""),
    undefined,
    options.configPath,
  );
  const staticDir = await resolveStaticDir(options.staticDir);
  const hostname = options.hostname ?? "127.0.0.1";
  const port = options.port ?? 0;
  const version = options.version ?? APP_VERSION;
  const autoOpen = options.autoOpen ?? true;
  const runtime = hasBunRuntime() ? "bun" : "node";

  loggers.serverApp.info(
    { operation: "server.starting", hostname, requestedPort: port, profilesRoot, staticDir, runtime },
    "Server starting"
  );

  const app = new Hono();
  registerHealthRoute(app, version);
  registerProfileRoutes(app, { profilesRoot, configPath: options.configPath });
  registerGlobalConfigRoute(app, { configPath: options.configPath });
  registerErrorLogRoutes(app);
  registerStaticRoute(app, { staticDir });

  try {
    const server = hasBunRuntime()
      ? Bun.serve({
          hostname,
          port,
          fetch: app.fetch,
        })
      : await startNodeServer(app, hostname, port);

    const boundPort = server.port ?? 0;
    const url = `http://${hostname}:${boundPort}`;

    loggers.serverApp.info(
      { operation: "server.started", hostname, requestedPort: port, boundPort, url, runtime },
      "Server started successfully"
    );

    if (shouldAutoOpen(autoOpen)) {
      Bun.spawn(["open", url]);
    }

    return {
      app,
      server: {
        port: boundPort,
        stop: () => {
          server.stop();
          loggers.serverApp.info(
            { operation: "server.stopped", boundPort, url },
            "Server stopped"
          );
        },
      },
      url,
      port: boundPort,
      profilesRoot,
      stop: () => {
        server.stop();
        loggers.serverApp.info(
          { operation: "server.stopped", boundPort, url },
          "Server stopped"
        );
      },
    };
  } catch (error) {
    loggers.serverApp.error(
      { operation: "server.start_failed", hostname, requestedPort: port, error: error instanceof Error ? error.message : String(error) },
      "Server failed to start"
    );
    throw error;
  }
}
