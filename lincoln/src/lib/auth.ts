import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { db, uid } from "./db";

// Passwords: scrypt with a random salt per user. Tokens (sessions, resets) are random 32 bytes;
// only their SHA-256 is stored, so a copy of the database cannot be used to sign in.

export const sha = (s: string) => createHash("sha256").update(s).digest("hex");
export const newToken = () => randomBytes(32).toString("base64url");
const PARAMS = { N: 16384, r: 8, p: 1 };

export function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, 64, PARAMS);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

const DUMMY = hashPassword(randomBytes(12).toString("hex"));

export function verifyPassword(password: string, stored: string | null) {
  // Always do the work, even for unknown users, so timing does not reveal which emails exist.
  const [, saltB64, keyB64] = (stored ?? DUMMY).split("$");
  const key = scryptSync(password, Buffer.from(saltB64, "base64"), 64, PARAMS);
  const want = Buffer.from(keyB64, "base64");
  return Boolean(stored) && want.length === key.length && timingSafeEqual(want, key);
}

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
