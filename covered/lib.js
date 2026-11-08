import { DatabaseSync } from "node:sqlite";
import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

export const KINDS = { gl: "General liability", wc: "Workers compensation" };
export const SOON_DAYS = 30;
export const STAGES = [30, 14, 7, 0];
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function openDb(file = ":memory:") {
  const db = new DatabaseSync(file);
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, pass TEXT NOT NULL, name TEXT NOT NULL, company TEXT NOT NULL DEFAULT '', created TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL, created TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS subs (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, name TEXT NOT NULL, trade TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '', token TEXT UNIQUE NOT NULL, created TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS certs (id INTEGER PRIMARY KEY, sub_id INTEGER NOT NULL, kind TEXT NOT NULL, carrier TEXT NOT NULL DEFAULT '', policy_no TEXT NOT NULL DEFAULT '', expires TEXT NOT NULL, file_name TEXT NOT NULL DEFAULT '', mime TEXT NOT NULL DEFAULT '', file BLOB, uploaded TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS reminders (sub_id INTEGER NOT NULL, kind TEXT NOT NULL, cert_id INTEGER NOT NULL, stage TEXT NOT NULL, sent TEXT NOT NULL, PRIMARY KEY (sub_id, kind, cert_id, stage));
    CREATE TABLE IF NOT EXISTS outbox (id INTEGER PRIMARY KEY, to_addr TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL, status TEXT NOT NULL, created TEXT NOT NULL);
  `);
  return db;
}

export async function hashPassword(pw) {
  const salt = randomBytes(16);
  const key = await scryptAsync(pw, salt, 64);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(pw, stored) {
  const [scheme, s, k] = String(stored).split("$");
  if (scheme !== "scrypt") return false;
  const key = await scryptAsync(pw, Buffer.from(s, "hex"), 64);
  const want = Buffer.from(k, "hex");
  return key.length === want.length && timingSafeEqual(key, want);
}

export const today = (now = new Date()) => now.toISOString().slice(0, 10);

export function daysUntil(expires, now = new Date()) {
  const a = Date.parse(expires + "T00:00:00Z");
  const b = Date.parse(today(now) + "T00:00:00Z");
  return Math.round((a - b) / 864e5);
}

export const validDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + "T00:00:00Z"));

// One state per required policy: missing, expired, soon (30 days or less) or ok.
export function subStatus(db, sub, now = new Date()) {
  const items = Object.keys(KINDS).map((kind) => {
    const c = db.prepare("SELECT id, carrier, policy_no, expires, file_name FROM certs WHERE sub_id = ? AND kind = ? ORDER BY expires DESC, id DESC LIMIT 1").get(sub.id, kind);
    if (!c) return { kind, label: KINDS[kind], state: "missing" };
    const days = daysUntil(c.expires, now);
    const state = days < 0 ? "expired" : days <= SOON_DAYS ? "soon" : "ok";
    return { kind, label: KINDS[kind], state, days, expires: c.expires, carrier: c.carrier, policy_no: c.policy_no, certId: c.id, file: Boolean(c.file_name) };
  });
  const rank = { ok: 0, soon: 1, missing: 2, expired: 2 };
  const worst = items.reduce((m, i) => Math.max(m, rank[i.state]), 0);
  return { overall: worst === 0 ? "ok" : worst === 1 ? "soon" : "bad", items };
}

// Mail goes out through Resend when configured. Every message is also kept in the outbox, so
// nothing is lost and tests can read what would have been sent.
export async function sendMail(db, { to, subject, body }, env = process.env) {
  let status = "queued";
  if (env.RESEND_API_KEY && env.MAIL_FROM) {
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: env.MAIL_FROM, to, subject, text: body }),
      });
      status = r.ok ? "sent" : `failed ${r.status}`;
    } catch { status = "failed"; }
  }
  db.prepare("INSERT INTO outbox (to_addr, subject, body, status, created) VALUES (?,?,?,?,?)").run(to, subject, body, status, new Date().toISOString());
  return status;
}

function reminderText(sub, owner, item, stage, base) {
  const link = `${base}/s/${sub.token}`;
  const co = owner.company || owner.name;
  const what = item.label.toLowerCase();
  if (stage === "request") return { subject: `${co} needs your ${what} certificate`, body: `Hi ${sub.name},\n\n${co} needs a current ${what} certificate on file before you work on site.\n\nUpload it here, it takes a minute:\n${link}\n\nThanks,\n${co}` };
  if (stage === "expired") return { subject: `Your ${what} certificate has expired`, body: `Hi ${sub.name},\n\nYour ${what} certificate on file with ${co} expired on ${item.expires}. You can't be scheduled until a new one is uploaded:\n${link}\n\nThanks,\n${co}` };
  const when = stage === "0" ? "today" : `in ${stage} days`;
  return { subject: `Your ${what} certificate expires ${when}`, body: `Hi ${sub.name},\n\nYour ${what} certificate on file with ${co} expires ${when} (${item.expires}). Please upload the renewed one:\n${link}\n\nThanks,\n${co}` };
}

// The stage a certificate is in today: the tightest of 30, 14, 7 or 0 days it has reached.
export function stageFor(item) {
  if (item.state === "missing") return "request";
  if (item.state === "expired") return "expired";
  const reached = STAGES.filter((d) => item.days <= d);
  return reached.length ? String(Math.min(...reached)) : null;
}

// Runs on a timer and on demand. Each reminder is sent once per certificate and stage.
export async function runReminders(db, { now = new Date(), base = "", env = process.env } = {}) {
  const subs = db.prepare("SELECT s.*, u.name AS owner_name, u.company AS owner_company FROM subs s JOIN users u ON u.id = s.user_id WHERE s.email != ''").all();
  let sent = 0;
  for (const sub of subs) {
    const owner = { name: sub.owner_name, company: sub.owner_company };
    for (const item of subStatus(db, sub, now).items) {
      const stage = stageFor(item);
      if (!stage) continue;
      const certId = item.certId || 0;
      const seen = db.prepare("SELECT 1 FROM reminders WHERE sub_id = ? AND kind = ? AND cert_id = ? AND stage = ?").get(sub.id, item.kind, certId, stage);
      if (seen) continue;
      const m = reminderText(sub, owner, item, stage, base);
      await sendMail(db, { to: sub.email, ...m }, env);
      db.prepare("INSERT INTO reminders VALUES (?,?,?,?,?)").run(sub.id, item.kind, certId, stage, now.toISOString());
      sent++;
    }
  }
  return sent;
}

export const newToken = (n = 24) => randomBytes(n).toString("hex");
