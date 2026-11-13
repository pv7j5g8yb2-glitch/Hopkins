import { db, uid } from "./db";

export { hashPassword, newToken, sha, verifyPassword } from "./passwords";

export const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 200;
export const validPassword = (p: string) => p.length >= 10 && p.length <= 200;
export const initialsOf = (name: string) => name.split(/\s+/).filter(Boolean).map((w) => w[0]!.toUpperCase()).slice(0, 2).join("") || "U";

// Small in-memory limiter: enough to stop password guessing on a single server.
const hits = new Map<string, number[]>();
export function limited(key: string, max = 8, windowMs = 15 * 60_000) {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(key, list);
  return list.length > max;
}

/** No mail provider is connected yet. Messages are kept in the outbox table and nothing is sent. */
export const mailConfigured = () => false;
export function sendMail(recipient: string, subject: string, body: string) {
  db().prepare("INSERT INTO outbox (id, recipient, subject, body, at) VALUES (?, ?, ?, ?, ?)").run(uid(), recipient, subject, body, new Date().toISOString());
}
