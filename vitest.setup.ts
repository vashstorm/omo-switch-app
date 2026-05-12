import { beforeAll, vi } from "vitest";

// Reset modules before all tests (required for vitest 4.x with isolate: false)
beforeAll(() => {
  vi.resetModules();
});