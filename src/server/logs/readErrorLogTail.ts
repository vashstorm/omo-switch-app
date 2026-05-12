import { open } from "node:fs/promises";
import path from "node:path";

import { getLogDir } from "../../shared/logger";

const ERROR_LOG_FILENAME = "omo-switch.error.log";
const MAX_ERROR_LOG_ENTRIES = 20;
const READ_BLOCK_SIZE = 16 * 1024;
const LOG_LINE_PATTERN = /^(\S+)\s+([A-Z]+)\s+\[([^\]]+)\]\s(.*)$/;
const STACK_PREFIX = "Stack: ";

export interface ErrorLogEntry {
  timestamp: string;
  level: string;
  module: string;
  message: string;
  detail: string | null;
}

export type LogReadErrorCode = "LOG_PERMISSION_DENIED" | "LOG_IO_ERROR";

export class LogReadError extends Error {
  readonly code: LogReadErrorCode;
  readonly filePath: string;

  constructor(code: LogReadErrorCode, message: string, filePath: string, cause?: unknown) {
    super(message, { cause });
    this.name = "LogReadError";
    this.code = code;
    this.filePath = filePath;
  }
}

interface ParsedEntriesResult {
  entries: ErrorLogEntry[];
  hasDanglingStart: boolean;
}

function appendDetail(entry: ErrorLogEntry, value: string): void {
  entry.detail = entry.detail === null ? value : `${entry.detail}\n${value}`;
}

function parseEntries(content: string, hasCompleteStart: boolean): ParsedEntriesResult {
  const lines = content.split(/\r?\n/);
  const startIndex = hasCompleteStart ? 0 : 1;
  const entries: ErrorLogEntry[] = [];
  let hasDanglingStart = false;

  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index];

    if (line.length === 0) {
      continue;
    }

    const match = LOG_LINE_PATTERN.exec(line);
    if (match) {
      const [, timestamp, level, module, rawMessage] = match;

      if (rawMessage.startsWith(STACK_PREFIX)) {
        if (entries.length === 0) {
          hasDanglingStart = true;
          continue;
        }

        appendDetail(entries[entries.length - 1], rawMessage.slice(STACK_PREFIX.length));
        continue;
      }

      entries.push({
        timestamp,
        level,
        module,
        message: rawMessage,
        detail: null,
      });
      continue;
    }

    if (entries.length === 0 || entries[entries.length - 1].detail === null) {
      hasDanglingStart = true;
      continue;
    }

    appendDetail(entries[entries.length - 1], line);
  }

  return { entries, hasDanglingStart };
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

function isPermissionError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && (error.code === "EACCES" || error.code === "EPERM");
}

function toLogReadError(error: unknown, filePath: string): LogReadError {
  if (isPermissionError(error)) {
    return new LogReadError(
      "LOG_PERMISSION_DENIED",
      `Permission denied while reading error log: ${filePath}`,
      filePath,
      error,
    );
  }

  return new LogReadError(
    "LOG_IO_ERROR",
    `Failed to read error log: ${filePath}`,
    filePath,
    error,
  );
}

export async function readErrorLogTail(logDir: string = getLogDir()): Promise<ErrorLogEntry[]> {
  const filePath = path.join(logDir, ERROR_LOG_FILENAME);
  let fileHandle: Awaited<ReturnType<typeof open>> | null = null;

  try {
    fileHandle = await open(filePath, "r");
  } catch (error) {
    if (isMissingFileError(error)) {
      return [];
    }

    throw toLogReadError(error, filePath);
  }

  try {
    const stats = await fileHandle.stat();
    if (stats.size === 0) {
      return [];
    }

    let position = stats.size;
    let content = "";
    let hasCompleteStart = false;

    while (position > 0) {
      const nextPosition = Math.max(0, position - READ_BLOCK_SIZE);
      const blockLength = position - nextPosition;
      const buffer = Buffer.alloc(blockLength);

      await fileHandle.read(buffer, 0, blockLength, nextPosition);
      content = buffer.toString("utf8") + content;
      position = nextPosition;
      hasCompleteStart = position === 0;

      const parsed = parseEntries(content, hasCompleteStart);
      if (parsed.entries.length > MAX_ERROR_LOG_ENTRIES && !parsed.hasDanglingStart) {
        return parsed.entries.slice(-MAX_ERROR_LOG_ENTRIES).reverse();
      }
    }

    const parsed = parseEntries(content, true);
    return parsed.entries.slice(-MAX_ERROR_LOG_ENTRIES).reverse();
  } catch (error) {
    if (isMissingFileError(error)) {
      return [];
    }

    throw toLogReadError(error, filePath);
  } finally {
    await fileHandle.close().catch(() => undefined);
  }
}
