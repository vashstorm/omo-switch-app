import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/server/routes/static", () => ({
  registerStaticRoute: () => {},
}));

vi.mock("../../src/server/logs/readErrorLogTail", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/server/logs/readErrorLogTail")>();
  return {
    ...actual,
    readErrorLogTail: vi.fn(actual.readErrorLogTail),
  };
});

import { createApp, type RunningApp } from "../../src/server/app";
import { initializeLogger, getLogDir } from "../../src/shared/logger";
import { readErrorLogTail, LogReadError } from "../../src/server/logs/readErrorLogTail";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("api error logs", () => {
  let runningApp: RunningApp;
  let baseUrl = "";
  let tempLogDir: string;
  const errorLogFilename = "omo-switch.error.log";

  beforeAll(async () => {
    const profilesRoot = path.resolve(__dirname, "../fixtures/discovery-root");
    tempLogDir = path.resolve(__dirname, "../fixtures/temp-error-logs");

    await fs.mkdir(tempLogDir, { recursive: true });

    process.env.GLOBAL_CONFIG_PATH = path.resolve(__dirname, "../fixtures/config/global-config-test.json");

    const testConfigContent = JSON.stringify({
      config_path: [path.resolve(__dirname, "../fixtures/discovery-root")],
      log_path: tempLogDir,
    });
    await fs.writeFile(
      path.resolve(__dirname, "../fixtures/config/global-config-test.json"),
      testConfigContent
    );

    initializeLogger();

    runningApp = await createApp({
      profilesRoot,
      autoOpen: false,
    });

    baseUrl = `http://127.0.0.1:${runningApp.port}`;
  });

  afterAll(async () => {
    runningApp?.stop();

    try {
      await fs.rm(tempLogDir, { recursive: true, force: true });
    } catch {}

    try {
      await fs.unlink(path.resolve(__dirname, "../fixtures/config/global-config-test.json"));
    } catch {}

    delete process.env.GLOBAL_CONFIG_PATH;
  });

  beforeEach(async () => {
    const logPath = path.join(getLogDir(), errorLogFilename);
    try {
      await fs.unlink(logPath);
    } catch {}

    vi.mocked(readErrorLogTail).mockClear();
  });

  it("returns parsed backend error entries when log file has content", async () => {
    const logPath = path.join(getLogDir(), errorLogFilename);
    const logContent = [
      "2024-04-21T10:00:00.000Z ERROR [server.app] Test error message",
      "2024-04-21T10:01:00.000Z WARN [shared.profiles.scanner] Warning message",
      "2024-04-21T10:02:00.000Z INFO [server.routes.globalConfig] Info message",
    ].join("\n");

    await fs.writeFile(logPath, logContent);

    const response = await fetch(`${baseUrl}/api/logs/errors`);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.entries).toHaveLength(3);
    expect(body.sourceFile).toBe("omo-switch.error.log");
    expect(body.truncated).toBe(false);
    expect(body.readError).toBeNull();

    const errorEntry = body.entries.find((e: any) => e.level === "ERROR");
    expect(errorEntry?.timestamp).toBe("2024-04-21T10:00:00.000Z");
    expect(errorEntry?.module).toBe("server.app");
    expect(errorEntry?.message).toBe("Test error message");
  });

  it("returns empty entries array when log file is empty or missing", async () => {
    const response = await fetch(`${baseUrl}/api/logs/errors`);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.entries).toEqual([]);
    expect(body.sourceFile).toBe("omo-switch.error.log");
    expect(body.truncated).toBe(false);
    expect(body.readError).toBeNull();
  });

  it("returns 500 with readError when reader throws LogReadError", async () => {
    vi.mocked(readErrorLogTail).mockRejectedValueOnce(
      new LogReadError(
        "LOG_IO_ERROR",
        "Mocked read error",
        "/mocked/path/omo-switch.error.log"
      )
    );

    const response = await fetch(`${baseUrl}/api/logs/errors`);
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.entries).toEqual([]);
    expect(body.sourceFile).toBe("omo-switch.error.log");
    expect(body.readError).toBe("Mocked read error");
  });
});