import { scrypt, randomBytes, timingSafeEqual, randomUUID, createHash } from "node:crypto";
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
// list, and a sign up needs one of them. With no codes set, a local machine is open to anyone,
// but production stays closed rather than open. On a local machine an admin email skips the
// code, for testing; in production it can't sign up at all (see adminSignupBlocked).
export function inviteOk(code, email = "") {
  if (process.env.NODE_ENV !== "production" && isAdmin({ email })) return true;
  const list = (process.env.INVITE_CODES || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!list.length) return process.env.NODE_ENV !== "production";
  return typeof code === "string" && list.includes(code.trim().toLowerCase());
}

// Admin is never something a stranger can claim. Emails aren't verified, so in production an
// address on ADMIN_EMAILS can't be used to create an account: admin only ever applies to an
// account that already exists. To make someone an admin, they sign up as normal first, then
// their email goes on ADMIN_EMAILS in Render.
export function adminSignupBlocked(email) {
  return process.env.NODE_ENV === "production" && isAdmin({ email });
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

// The cookie holds the user id and their session number. A new password raises the number, so
// every device signed in before it has to sign in again. Cookies from before this change carry
// no number and count as 0.
export function setSession(reply, userId, ver = 0) {
  reply.setCookie(COOKIE, `${userId}.${ver}`, { path: "/", httpOnly: true, sameSite: "lax", signed: true, maxAge: MAX_AGE, secure: process.env.NODE_ENV === "production" });
}

// A new password: saved, other devices signed out, this one kept signed in.
export async function changePassword(reply, userId, password) {
  await run(`UPDATE users SET pass_hash = ?, session_ver = session_ver + 1, reset_hash = NULL, reset_expires = NULL, reset_asked = NULL WHERE id = ?`, [await hashPassword(password), userId]);
  const u = await get(`SELECT session_ver FROM users WHERE id = ?`, [userId]);
  setSession(reply, userId, Number(u.session_ver));
}

// Password reset links. There's no email service yet, so the founder makes the link in Admin
// and sends it himself. Only a hash of the token is stored; the link works once, for 48 hours.
const sha = (t) => createHash("sha256").update(t).digest("hex");
export async function makeResetLink(userId, base) {
  const token = randomBytes(24).toString("base64url");
  await run(`UPDATE users SET reset_hash = ?, reset_expires = ? WHERE id = ?`, [sha(token), new Date(Date.now() + 48 * 3600_000).toISOString(), userId]);
  return `${base}/reset?t=${token}`;
}
export async function userForReset(token) {
  if (typeof token !== "string" || token.length < 20) return null;
  const u = await get(`SELECT id, email, reset_expires FROM users WHERE reset_hash = ?`, [sha(token)]);
  return u && u.reset_expires > new Date().toISOString() ? u : null;
}

export function clearSession(reply) {
  reply.clearCookie(COOKIE, { path: "/" });
}

export async function currentUser(request) {
  const raw = request.cookies[COOKIE];
  if (!raw) return null;
  const u = request.unsignCookie(raw);
  if (!u.valid) return null;
  const [id, ver = "0"] = u.value.split(".");
  const user = await get(`SELECT id, workspace_id, email, name, avatar_id, session_ver, last_seen FROM users WHERE id = ?`, [id]);
  return user && Number(user.session_ver) === Number(ver) ? user : null;
}
