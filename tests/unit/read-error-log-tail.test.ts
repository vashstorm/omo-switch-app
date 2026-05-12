import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  LogReadError,
  readErrorLogTail,
  type ErrorLogEntry,
} from "../../src/server/logs/readErrorLogTail";

const ERROR_LOG_FILE = "omo-switch.error.log";

function buildLogLine(index: number, message: string, moduleName = "server.app"): string {
  const timestamp = `2026-04-21T10:00:${String(index).padStart(2, "0")}.000Z`;
  return `${timestamp} ERROR [${moduleName}] ${message}`;
}

function getMessages(entries: ErrorLogEntry[]): string[] {
  return entries.map((entry) => entry.message);
}

describe("readErrorLogTail", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "read-error-log-tail-"));
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.resetModules();
    await fs.chmod(tempDir, 0o755).catch(() => undefined);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("returns newest entries first from the error log tail", async () => {
    const logPath = path.join(tempDir, ERROR_LOG_FILE);
    const content = [
      buildLogLine(1, "First failure [requestId=1]"),
      buildLogLine(2, "Second failure [requestId=2]"),
      buildLogLine(3, "Third failure [requestId=3]"),
    ].join("\n");

    await fs.writeFile(logPath, content, "utf8");

    const entries = await readErrorLogTail(tempDir);

    expect(getMessages(entries)).toEqual([
      "Third failure [requestId=3]",
      "Second failure [requestId=2]",
      "First failure [requestId=1]",
    ]);
    expect(entries[0]).toMatchObject({
      timestamp: "2026-04-21T10:00:03.000Z",
      level: "ERROR",
      module: "server.app",
      detail: null,
    });
  });

  it("returns an empty array when the error log file is missing", async () => {
    await fs.writeFile(path.join(tempDir, "omo-switch.log"), "should be ignored", "utf8");

    await expect(readErrorLogTail(tempDir)).resolves.toEqual([]);
  });

  it("returns an empty array when the error log file is empty", async () => {
    await fs.writeFile(path.join(tempDir, ERROR_LOG_FILE), "", "utf8");

    await expect(readErrorLogTail(tempDir)).resolves.toEqual([]);
  });

  it("merges stack lines into the previous entry detail", async () => {
    const logPath = path.join(tempDir, ERROR_LOG_FILE);
    const content = [
      buildLogLine(1, "Primary failure [requestId=1]"),
      `${buildLogLine(2, "Stack: Error: boom")}`,
      "    at first (/tmp/test.ts:1:1)",
      "    at second (/tmp/test.ts:2:2)",
      buildLogLine(3, "Secondary failure [requestId=2]"),
    ].join("\n");

    await fs.writeFile(logPath, content, "utf8");

    const entries = await readErrorLogTail(tempDir);

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      message: "Secondary failure [requestId=2]",
      detail: null,
    });
    expect(entries[1]).toMatchObject({
      message: "Primary failure [requestId=1]",
      detail: [
        "Error: boom",
        "    at first (/tmp/test.ts:1:1)",
        "    at second (/tmp/test.ts:2:2)",
      ].join("\n"),
    });
  });

  it("returns at most twenty entries", async () => {
    const logPath = path.join(tempDir, ERROR_LOG_FILE);
    const content = Array.from({ length: 25 }, (_, index) => {
      const entryNumber = index + 1;
      return buildLogLine(entryNumber, `Failure ${entryNumber}`);
    }).join("\n");

    await fs.writeFile(logPath, content, "utf8");

    const entries = await readErrorLogTail(tempDir);

    expect(entries).toHaveLength(20);
    expect(entries[0]?.message).toBe("Failure 25");
    expect(entries[19]?.message).toBe("Failure 6");
  });

  it("throws a structured permission error when the file cannot be opened", async () => {
    const logPath = path.join(tempDir, ERROR_LOG_FILE);
    await fs.writeFile(logPath, buildLogLine(1, "Permission failure"), "utf8");
    await fs.chmod(logPath, 0o000);

    try {
      await readErrorLogTail(tempDir);
      throw new Error("Expected readErrorLogTail to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(LogReadError);
      expect(error).toMatchObject({
        code: "LOG_PERMISSION_DENIED",
        filePath: logPath,
      });
    } finally {
      await fs.chmod(logPath, 0o600);
    }
  });

  it("uses getLogDir when no log directory is provided", async () => {
    const logPath = path.join(tempDir, ERROR_LOG_FILE);
    await fs.writeFile(logPath, buildLogLine(1, "Default directory failure"), "utf8");

    vi.resetModules();
    vi.doMock("../../src/shared/logger", () => ({
      getLogDir: () => tempDir,
    }));

    const { readErrorLogTail: readWithDefault } = await import("../../src/server/logs/readErrorLogTail");
    const entries = await readWithDefault();

    expect(entries).toHaveLength(1);
    expect(entries[0]?.message).toBe("Default directory failure");
  });
});
