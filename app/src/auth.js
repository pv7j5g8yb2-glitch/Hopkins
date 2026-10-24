import { scrypt, randomBytes, timingSafeEqual, randomUUID } from "node:crypto";
import { promisify } from "node:util";
import { run, get, nowIso } from "./db.js";

const scryptAsync = promisify(scrypt);
const COOKIE = "hopkins_session";
// Signed in for 90 days on a device, then sign in again.
const MAX_AGE = 90 * 24 * 60 * 60;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password, stored) {
  const [scheme, saltHex, keyHex] = String(stored).split("$");
  if (scheme !== "scrypt") return false;
  const key = await scryptAsync(password, Buffer.from(saltHex, "hex"), 64);
  const expected = Buffer.from(keyHex, "hex");
  return key.length === expected.length && timingSafeEqual(key, expected);
}

// Sign ups are private while Hopkins is in early access: INVITE_CODES is a comma separated
// list, and a sign up needs one of them. Admins (ADMIN_EMAILS) never need one. With no codes
// set, a local machine is open to anyone, but production stays closed rather than open.
export function inviteOk(code, email = "") {
  if (isAdmin({ email })) return true;
  const list = (process.env.INVITE_CODES || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!list.length) return process.env.NODE_ENV !== "production";
  return typeof code === "string" && list.includes(code.trim().toLowerCase());
}

export function isAdmin(user) {
  const admins = (process.env.ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return Boolean(user && admins.includes(user.email.toLowerCase()));
}

export async function createAccount({ email, password, name, business }) {
  const wsId = randomUUID();
  const userId = randomUUID();
  const now = nowIso();
  const brand = { business: business || "", agent_name: name || "", voice: "plain", primary: "#1F2A36", accent: "#C8A96A", font: "modern" };
  await run(`INSERT INTO workspaces (id, name, brand, created_at) VALUES (?,?,?,?)`, [wsId, business || name || email, JSON.stringify(brand), now]);
  await run(`INSERT INTO users (id, workspace_id, email, name, pass_hash, created_at) VALUES (?,?,?,?,?,?)`, [userId, wsId, email.toLowerCase(), name || null, await hashPassword(password), now]);
  return userId;
}

export function setSession(reply, userId) {
  reply.setCookie(COOKIE, userId, { path: "/", httpOnly: true, sameSite: "lax", signed: true, maxAge: MAX_AGE, secure: process.env.NODE_ENV === "production" });
}

export function clearSession(reply) {
  reply.clearCookie(COOKIE, { path: "/" });
}

export async function currentUser(request) {
  const raw = request.cookies[COOKIE];
  if (!raw) return null;
  const u = request.unsignCookie(raw);
  if (!u.valid) return null;
  return get(`SELECT id, workspace_id, email, name, avatar_id FROM users WHERE id = ?`, [u.value]);
}
