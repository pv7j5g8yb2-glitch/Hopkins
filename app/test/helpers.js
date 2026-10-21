import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Every test file gets its own database file and runs the real server in memory.
export async function boot(extraEnv = {}) {
  const dir = mkdtempSync(join(tmpdir(), "hopkins-test-"));
  Object.assign(process.env, {
    NODE_ENV: "test",
    COOKIE_SECRET: "test-secret-test-secret-test-secret",
    DATABASE_URL: `file:${join(dir, "test.db")}`,
    INVITE_CODES: "EARLY1",
    ADMIN_EMAILS: "boss@hopkins.test",
    NTFY_TOPIC: "",
    ...extraEnv,
  });
  const { app } = await import("../src/server.js");
  await app.ready();
  return app;
}

export function client(app) {
  let cookie = "";
  return async (method, url, body) => {
    const res = await app.inject({ method, url, payload: body, headers: cookie ? { cookie } : {} });
    const set = res.headers["set-cookie"];
    if (set) cookie = (Array.isArray(set) ? set : [set]).map((c) => c.split(";")[0]).join("; ");
    let json = null;
    try { json = res.json(); } catch {}
    return { status: res.statusCode, json, body: res.body };
  };
}

// A real 2x2 JPEG, so photo uploads go through the same path as the browser's.
export const TINY_JPEG = "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAACAAIBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==";
