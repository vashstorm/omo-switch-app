import { createWriteStream, mkdirSync } from "fs";
import path, { join } from "path";
import { createConsola, type ConsolaReporter, type LogObject, type ConsolaInstance } from "consola";
import { readGlobalConfigSync, resolveGlobalConfigPath } from "./config/global-config";

export type LogModuleName =
  | "server.app"
  | "server.routes.profiles"
  | "server.routes.globalConfig"
  | "shared.config.reader"
  | "shared.config.writer"
  | "shared.config.normalizer"
  | "shared.profiles.scanner"
  | "shared.profiles.copier";

export interface LogContext extends Record<string, unknown> {
  operation: string;
  message?: string;
}

const DEFAULT_LOG_LEVEL = process.env.LOG_LEVEL || "info";

let currentLogDir: string | null = null;
let isInitialized = false;

function formatTimestamp(): string {
  return new Date().toISOString();
}

function formatContext(context: Record<string, unknown>): string {
  const entries = Object.entries(context)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => {
      let strValue: string;
      if (typeof value === "object" && value !== null) {
        strValue = JSON.stringify(value);
      } else {
        strValue = String(value);
      }
      return `${key}=${strValue}`;
    });
  return entries.length > 0 ? ` [${entries.join(", ")}]` : "";
}

function parseArgs(args: unknown[]): { message: string; context: Record<string, unknown>; error?: Error } {
  let message = "";
  let context: Record<string, unknown> = {};
  let error: Error | undefined;

  for (const arg of args) {
    if (typeof arg === "string") {
      message = message ? message + " " + arg : arg;
    } else if (arg instanceof Error) {
      error = arg;
      message = message || arg.message;
    } else if (typeof arg === "object" && arg !== null) {
      context = { ...context, ...arg };
    } else {
      message = message + " " + String(arg);
    }
  }

  return { message, context, error };
}

function buildLine(logObj: LogObject): { line: string; error?: Error } {
  const timestamp = formatTimestamp();
  const levelUpper = logObj.type.toUpperCase().padEnd(5);
  const tag = logObj.tag || "root";

  const { message, context, error } = parseArgs(logObj.args);
  const contextStr = formatContext(context);
  const fullMessage = message || (error ? error.message : "");

  const line = `${timestamp} ${levelUpper} [${tag}] ${fullMessage}${contextStr}`;
  return { line, error };
}

class FileReporter implements ConsolaReporter {
  private logStream: ReturnType<typeof createWriteStream> | null = null;
  private errorStream: ReturnType<typeof createWriteStream> | null = null;

  private getStreams() {
    if (!this.logStream && currentLogDir) {
      try {
        mkdirSync(currentLogDir, { recursive: true });
      } catch {}

      const logFile = join(currentLogDir, "omo-switch.log");
      const errorLogFile = join(currentLogDir, "omo-switch.error.log");

      this.logStream = createWriteStream(logFile, { flags: "a" });
      this.errorStream = createWriteStream(errorLogFile, { flags: "a" });

      const flush = () => {
        this.logStream?.end();
        this.errorStream?.end();
      };

      process.once("exit", flush);
      process.once("SIGINT", () => {
        flush();
        process.exit(0);
      });
      process.once("SIGTERM", () => {
        flush();
        process.exit(0);
      });
    }
    return { logStream: this.logStream, errorStream: this.errorStream };
  }

  log(logObj: LogObject): void {
    const { logStream, errorStream } = this.getStreams();
    if (!logStream) return;

    const { line, error } = buildLine(logObj);
    const isError = logObj.type === "error" || logObj.type === "fatal";

    logStream.write(line + "\n");

    if (isError && errorStream) {
      errorStream.write(line + "\n");
    }

    if (error?.stack) {
      const stackLine = `${formatTimestamp()} ${logObj.type.toUpperCase().padEnd(5)} [${logObj.tag || "root"}] Stack: ${error.stack}`;
      logStream.write(stackLine + "\n");
      if (isError && errorStream) {
        errorStream.write(stackLine + "\n");
      }
    }
  }
}

class ConsoleReporter implements ConsolaReporter {
  log(logObj: LogObject): void {
    const type = logObj.type;

    // Only info/warn/error/fatal go to console (same as current behavior)
    if (type !== "info" && type !== "warn" && type !== "error" && type !== "fatal") {
      return;
    }

    const { line } = buildLine(logObj);

    if (type === "error" || type === "fatal") {
      console.error(line);
    } else if (type === "warn") {
      console.warn(line);
    } else {
      console.log(line);
    }
  }
}

const fileReporter = new FileReporter();
const consoleReporter = new ConsoleReporter();

function createConsolaInstance(tag: string): ConsolaInstance {
  return createConsola({
    level: DEFAULT_LOG_LEVEL as any,
    reporters: [consoleReporter, fileReporter],
    defaults: { tag },
  });
}

let rootConsola: ConsolaInstance = createConsolaInstance("root");
const moduleLoggerCache = new Map<LogModuleName, ConsolaInstance>();

function resolveLogDir(configPath?: string): string {
  const resolvedConfigPath = resolveGlobalConfigPath(configPath);
  const config = readGlobalConfigSync(resolvedConfigPath);

  if (!config.log_path || typeof config.log_path !== "string") {
    return join(process.cwd(), "logs");
  }

  return path.isAbsolute(config.log_path)
    ? config.log_path
    : path.resolve(path.dirname(resolvedConfigPath), config.log_path);
}

export function initializeLogger(configPath?: string): void {
  if (isInitialized && configPath === undefined) {
    return;
  }

  const newLogDir = resolveLogDir(configPath);

  if (currentLogDir === newLogDir) {
    return;
  }

  currentLogDir = newLogDir;
  isInitialized = true;

  rootConsola = createConsolaInstance("root");
  moduleLoggerCache.clear();
}

export function getLogDir(): string {
  if (!currentLogDir) {
    return resolveLogDir();
  }
  return currentLogDir;
}

export function getModuleLogger(moduleName: LogModuleName): ConsolaInstance {
  let cached = moduleLoggerCache.get(moduleName);
  if (!cached) {
    cached = createConsolaInstance(moduleName);
    moduleLoggerCache.set(moduleName, cached);
  }
  return cached;
}

interface LoggerFacade {
  trace(...args: unknown[]): void;
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  fatal(...args: unknown[]): void;
  silent(): void;
  log(level: string, ...args: unknown[]): void;
}

function createRootLoggerFacade(): LoggerFacade {
  const facade = {} as LoggerFacade;

  for (const method of ["trace", "debug", "info", "warn", "error", "fatal"] as const) {
    (facade as any)[method] = (...args: unknown[]) => {
      (rootConsola as any)[method](...args);
    };
  }

  facade.silent = () => {};

  facade.log = (level: string, ...args: unknown[]) => {
    if (level === "silent") return;
    const fn = (rootConsola as any)[level];
    if (typeof fn === "function") {
      fn(...args);
    }
  };

  return facade;
}

function createModuleLoggerFacade(moduleName: LogModuleName): LoggerFacade {
  const facade = {} as LoggerFacade;

  for (const method of ["trace", "debug", "info", "warn", "error", "fatal"] as const) {
    (facade as any)[method] = (...args: unknown[]) => {
      (getModuleLogger(moduleName) as any)[method](...args);
    };
  }

  facade.silent = () => {};

  facade.log = (level: string, ...args: unknown[]) => {
    if (level === "silent") return;
    const logger = getModuleLogger(moduleName);
    const fn = (logger as any)[level];
    if (typeof fn === "function") {
      fn(...args);
    }
  };

  return facade;
}

export const logger = createRootLoggerFacade();

export const loggers = {
  serverApp: createModuleLoggerFacade("server.app"),
  serverRoutesProfiles: createModuleLoggerFacade("server.routes.profiles"),
  serverRoutesGlobalConfig: createModuleLoggerFacade("server.routes.globalConfig"),
  sharedConfigReader: createModuleLoggerFacade("shared.config.reader"),
  sharedConfigWriter: createModuleLoggerFacade("shared.config.writer"),
  sharedConfigNormalizer: createModuleLoggerFacade("shared.config.normalizer"),
  sharedProfilesScanner: createModuleLoggerFacade("shared.profiles.scanner"),
  sharedProfilesCopier: createModuleLoggerFacade("shared.profiles.copier"),
};

export default logger;
