import type { Hono } from "hono";
import {
  readErrorLogTail,
  type ErrorLogEntry,
  LogReadError,
} from "../logs/readErrorLogTail";
import { getLogDir, loggers } from "../../shared/logger";

const ERROR_LOG_FILENAME = "omo-switch.error.log";

interface ErrorLogsResponse {
  entries: ErrorLogEntry[];
  sourceFile: string;
  truncated: boolean;
  readError: string | null;
}

export function registerErrorLogRoutes(app: Hono): void {
  app.get("/api/logs/errors", async (c) => {
    try {
      const logDir = getLogDir();
      const entries = await readErrorLogTail(logDir);

      // Conservative truncation detection: if exactly 20 entries returned,
      // assume truncation might have occurred (since reader caps at 20)
      const truncated = entries.length === 20;

      const response: ErrorLogsResponse = {
        entries,
        sourceFile: ERROR_LOG_FILENAME,
        truncated,
        readError: null,
      };

      loggers.serverApp.info(
        { operation: "error_logs.read_success", count: entries.length, truncated },
        "Successfully read error log entries"
      );

      return c.json(response);
    } catch (error) {
      if (error instanceof LogReadError) {
        const response: ErrorLogsResponse = {
          entries: [],
          sourceFile: ERROR_LOG_FILENAME,
          truncated: false,
          readError: error.message,
        };

        loggers.serverApp.error(
          {
            operation: "error_logs.read_failed",
            code: error.code,
            filePath: error.filePath,
          },
          "Failed to read error log"
        );

        return c.json(response, 500);
      }

      const message = error instanceof Error ? error.message : "Failed to read error log";
      const response: ErrorLogsResponse = {
        entries: [],
        sourceFile: ERROR_LOG_FILENAME,
        truncated: false,
        readError: message,
      };

      loggers.serverApp.error(
        { operation: "error_logs.unexpected_error", error: message },
        "Unexpected error while reading error log"
      );

      return c.json(response, 500);
    }
  });
}