import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/server/embedded-assets", () => ({
  embeddedAssets: {},
}));

import { registerStaticRoute } from "../../src/server/routes/static";

describe("static font assets", () => {
  it("preloads local fonts in the shell html", async () => {
    const app = new Hono();
    registerStaticRoute(app, { staticDir: "/nonexistent-static-dir" });

    const response = await app.fetch(new Request("http://localhost/"));
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('/fonts/geist-sans-variable.woff2');
    expect(html).toContain('/fonts/geist-mono-variable.woff2');
    expect(html).toContain('rel="preload"');
    expect(html).toContain('type="font/woff2"');
  });

  it("serves local font files from the project source tree", async () => {
    const app = new Hono();
    registerStaticRoute(app, { staticDir: "/nonexistent-static-dir" });

    const response = await app.fetch(new Request("http://localhost/fonts/geist-sans-variable.woff2"));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("font/woff2");
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0);
  });
});
