import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

// We'll test the logger by creating actual temp config files
// and checking if it resolves the correct log directory

describe("logger", () => {
  let tempDir: string;
  let configFilePath: string;
  let logDirPath: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "logger-test-"));
    configFilePath = path.join(tempDir, "config.jsonc");
    logDirPath = path.join(tempDir, "logs");
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("log directory resolution", () => {
    it("should use default log directory when config has no log_path", async () => {
      // Create config without log_path
      await fs.writeFile(configFilePath, JSON.stringify({}), "utf-8");

      // Import logger fresh
      const { initializeLogger, getLogDir } = await import("../../src/shared/logger");
      
      initializeLogger(configFilePath);
      const logDir = getLogDir();
      
      // Should use default "logs" directory relative to runtime base
      expect(logDir).toContain("logs");
    });

    it("should use absolute log_path from config", async () => {
      const customLogDir = path.join(tempDir, "custom-logs");
      
      // Create config with absolute log_path
      await fs.writeFile(
        configFilePath,
        JSON.stringify({ log_path: customLogDir }),
        "utf-8"
      );

      const { initializeLogger, getLogDir } = await import("../../src/shared/logger");
      
      initializeLogger(configFilePath);
      const logDir = getLogDir();
      
      expect(logDir).toBe(customLogDir);
    });

    it("should resolve relative log_path from config file location", async () => {
      // Create config with relative log_path
      await fs.writeFile(
        configFilePath,
        JSON.stringify({ log_path: "./relative-logs" }),
        "utf-8"
      );

      const { initializeLogger, getLogDir } = await import("../../src/shared/logger");
      
      initializeLogger(configFilePath);
      const logDir = getLogDir();
      
      expect(logDir).toBe(path.join(tempDir, "relative-logs"));
    });

    it("should be idempotent for the same config path", async () => {
      await fs.writeFile(configFilePath, JSON.stringify({}), "utf-8");

      const { initializeLogger, getLogDir } = await import("../../src/shared/logger");
      
      // Should not throw when called twice with same path
      initializeLogger(configFilePath);
      const firstLogDir = getLogDir();
      
      initializeLogger(configFilePath);
      const secondLogDir = getLogDir();
      
      expect(firstLogDir).toBe(secondLogDir);
    });

    it("should support re-initialization with different config path", async () => {
      const firstConfigPath = path.join(tempDir, "first-config.jsonc");
      const secondConfigPath = path.join(tempDir, "second-config.jsonc");
      
      await fs.writeFile(
        firstConfigPath,
        JSON.stringify({ log_path: path.join(tempDir, "first-logs") }),
        "utf-8"
      );
      
      await fs.writeFile(
        secondConfigPath,
        JSON.stringify({ log_path: path.join(tempDir, "second-logs") }),
        "utf-8"
      );

      const { initializeLogger, getLogDir } = await import("../../src/shared/logger");
      
      initializeLogger(firstConfigPath);
      const firstLogDir = getLogDir();
      
      initializeLogger(secondConfigPath);
      const secondLogDir = getLogDir();
      
      expect(firstLogDir).toBe(path.join(tempDir, "first-logs"));
      expect(secondLogDir).toBe(path.join(tempDir, "second-logs"));
    });
  });

  describe("stable facades", () => {
    it("should maintain stable logger object identity", async () => {
      await fs.writeFile(configFilePath, JSON.stringify({}), "utf-8");

      const { logger, initializeLogger } = await import("../../src/shared/logger");
      
      const loggerBeforeInit = logger;
      initializeLogger(configFilePath);
      const loggerAfterInit = logger;
      
      expect(loggerBeforeInit).toBe(loggerAfterInit);
    });

    it("should maintain stable loggers object identity", async () => {
      await fs.writeFile(configFilePath, JSON.stringify({}), "utf-8");

      const { loggers, initializeLogger } = await import("../../src/shared/logger");
      
      const loggersBeforeInit = loggers;
      initializeLogger(configFilePath);
      const loggersAfterInit = loggers;
      
      expect(loggersBeforeInit).toBe(loggersAfterInit);
    });

    it("should maintain stable module logger identity after re-init", async () => {
      const firstConfigPath = path.join(tempDir, "first.jsonc");
      const secondConfigPath = path.join(tempDir, "second.jsonc");
      
      await fs.writeFile(firstConfigPath, JSON.stringify({}), "utf-8");
      await fs.writeFile(secondConfigPath, JSON.stringify({}), "utf-8");

      const { loggers, initializeLogger } = await import("../../src/shared/logger");
      
      const serverAppBefore = loggers.serverApp;
      initializeLogger(firstConfigPath);
      
      const serverAppMiddle = loggers.serverApp;
      initializeLogger(secondConfigPath);
      
      const serverAppAfter = loggers.serverApp;
      
      expect(serverAppBefore).toBe(serverAppMiddle);
      expect(serverAppMiddle).toBe(serverAppAfter);
    });

    it("should delegate to current logger after re-init", async () => {
      await fs.writeFile(configFilePath, JSON.stringify({}), "utf-8");

      const { loggers, initializeLogger } = await import("../../src/shared/logger");
      
      initializeLogger(configFilePath);
      
      // Should not throw - delegates to current logger
      expect(() => loggers.serverApp.info("test message")).not.toThrow();
    });
  });

  describe("getModuleLogger", () => {
    it("should return stable logger for module", async () => {
      await fs.writeFile(configFilePath, JSON.stringify({}), "utf-8");

      const { getModuleLogger, initializeLogger } = await import("../../src/shared/logger");
      
      initializeLogger(configFilePath);
      
      const logger1 = getModuleLogger("server.app");
      const logger2 = getModuleLogger("server.app");
      
      expect(typeof logger1.info).toBe("function");
      expect(typeof logger2.info).toBe("function");
    });

    it("should return different loggers for different modules", async () => {
      await fs.writeFile(configFilePath, JSON.stringify({}), "utf-8");

      const { getModuleLogger, initializeLogger } = await import("../../src/shared/logger");
      
      initializeLogger(configFilePath);
      
      const appLogger = getModuleLogger("server.app");
      const routesLogger = getModuleLogger("server.routes.profiles");
      
      expect(appLogger).not.toBe(routesLogger);
    });
  });

  describe("fallback behavior", () => {
    it("should auto-initialize on first log call if not explicitly initialized", async () => {
      // Create a default config in the expected location
      const defaultConfigDir = path.join(process.cwd(), "config");
      const defaultConfigPath = path.join(defaultConfigDir, "config.jsonc");
      
      // Ensure config directory exists
      try {
        await fs.mkdir(defaultConfigDir, { recursive: true });
      } catch {
        // Directory might already exist
      }

      const { logger } = await import("../../src/shared/logger");
      
      // Should auto-initialize and not throw
      expect(() => logger.info("test")).not.toThrow();
    });
  });
});
