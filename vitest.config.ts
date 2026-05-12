import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/unit/**/*.test.{ts,tsx}", "tests/integration/**/*.test.{ts,tsx}"],
    exclude: [
      // Retired HTTP server tests - now covered by Rust cargo tests (115+ tests)
      // See .sisyphus/evidence/task-9-test-audit.txt for mapping
      "tests/integration/api-*.test.ts",
      "tests/integration/global-config-api.test.ts",
      "tests/integration/profiles-global-config.test.ts",
      "tests/integration/static-font-assets.test.ts",
      "tests/integration/config-roundtrip-regression.test.ts",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
