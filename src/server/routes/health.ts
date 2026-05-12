import type { Hono } from "hono";

export function registerHealthRoute(app: Hono, version: string): void {
  app.get("/api/health", (c) => {
    return c.json({ status: "ok", version });
  });
}
