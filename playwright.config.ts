import { defineConfig } from "@playwright/test";

const port = 4173;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "on-first-retry",
    viewport: { width: 1280, height: 720 }, // Desktop viewport for heading visibility
  },
  webServer: {
    command: `bun run build:web:assets && bunx serve dist/web --single --listen ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
