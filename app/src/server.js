import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { randomUUID, createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { run, get, all, nowIso } from "./db.js";
import { EMAIL_RE, inviteOk, isAdmin, adminSignupBlocked, createAccount, pilotPlan, verifyPassword, setSession, clearSession, currentUser, changePassword, makeResetLink, userForReset } from "./auth.js";
import {
  getWorkspace, loadListing, loadPhotos, currentAds, createListing, handleMessage, makeAds, patchListing,
  proposeRun, confirmRun, addLead, weeklyReport, inbox, looksLikeListing, newChat, deleteListing, suggestionFor, forgetGuessedCities, restyle, numberUntitled,
} from "./hopkins.js";
import { adsMade, FREE_AD_LIMIT, PRICE_FROM } from "./plans.js";
import { aiEnabled } from "./brain.js";
import { KIND_NAMES, MOMENTS } from "./writer.js";
import { PHOTO_LABELS, formatPrice, factsLine } from "./listing.js";
import { notifyFounder, notifyTopic } from "./notify.js";
import { mailReady, sendMail, resetEmail } from "./mail.js";
import { checkWording } from "./fairhousing.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB = join(__dirname, "..", "web");

const COOKIE_SECRET = process.env.COOKIE_SECRET;
if (!COOKIE_SECRET) throw new Error("COOKIE_SECRET is not set");

// Read once at start up; restart to pick up changes (npm run dev does that for you).
const files = {};
for (const f of ["app.html", "app.css", "app.js", "glass.js", "creative.js", "login.html", "lead.html", "privacy.html", "mark.svg"]) files[f] = readFileSync(join(WEB, f), "utf8");
const TYPES = { html: "text/html; charset=utf-8", css: "text/css; charset=utf-8", js: "text/javascript; charset=utf-8", svg: "image/svg+xml", png: "image/png", jpg: "image/jpeg", webmanifest: "application/manifest+json" };
// The home screen icons, the app manifest, and a free licence (Unsplash) sample photo for the
// brand page preview before the agent has any listings.
for (const f of ["icon-192.png", "icon-512.png", "apple-touch-icon.png", "sample-home.jpg"]) files[f] = readFileSync(join(WEB, f));
files["manifest.webmanifest"] = readFileSync(join(WEB, "manifest.webmanifest"), "utf8");

// trustProxy: on Render every request arrives through its proxy, so the visitor's address is in
// X-Forwarded-For. Without it, every visitor looked like the same one and the brakes below
// (sign up, sign in, lead form) counted everyone together.
// What a page may load: scripts only from this server, plus the small inline scripts in the
// login and lead pages by their hashes (worked out here, so editing them can't break it). Even if
// someone got text onto a page that looked like code, the browser wouldn't run it.
const inlineScripts = ["login.html", "lead.html"].flatMap((f) => [...files[f].matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => `'sha256-${createHash("sha256").update(m[1]).digest("base64")}'`));
const CSP = [
  "default-src 'self'",
  `script-src 'self' ${inlineScripts.join(" ")}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
].join("; ");

export const app = Fastify({ logger: process.env.NODE_ENV !== "test", bodyLimit: 1_000_000, trustProxy: true });
await app.register(cookie, { secret: COOKIE_SECRET });

// Plain safety headers on every answer.
app.addHook("onSend", async (request, reply, payload) => {
  reply.header("X-Content-Type-Options", "nosniff");
  reply.header("Referrer-Policy", "strict-origin-when-cross-origin");
  reply.header("X-Frame-Options", "DENY");
  if (process.env.NODE_ENV === "production") reply.header("Strict-Transport-Security", "max-age=15552000");
  if (String(reply.getHeader("content-type") || "").startsWith("text/html")) reply.header("Content-Security-Policy", CSP);
  return payload;
});

// When something breaks: the person sees a plain message (never the internal error), and the
// founder's phone hears about it, at most once every 10 minutes so a bad hour isn't a flood.
let lastAlert = 0;
app.setErrorHandler((err, request, reply) => {
  const status = err.statusCode >= 400 && err.statusCode < 500 ? err.statusCode : 500;
  if (status < 500) return reply.code(status).send({ error: status === 413 ? "That's too big to send." : status === 429 ? "Too many tries. Wait a few minutes." : "That didn't come through right. Try again." });
  request.log.error(err);
  if (Date.now() - lastAlert > 10 * 60 * 1000) {
    lastAlert = Date.now();
    notifyFounder("Hopkins: something broke", `${request.method} ${request.routeOptions?.url || request.url.split("?")[0]}: ${String(err.message || err).slice(0, 160)}`, ["warning"]);
  }
  return reply.code(500).send({ error: "Something went wrong on my side. Try again in a moment." });
});

app.get("/healthz", async () => ({ ok: true }));

for (const f of ["app.css", "app.js", "glass.js", "creative.js", "mark.svg", "icon-192.png", "icon-512.png", "apple-touch-icon.png", "sample-home.jpg", "manifest.webmanifest"]) {
  app.get(`/static/${f}`, async (_, reply) => reply.type(TYPES[f.split(".").pop()]).header("Cache-Control", "no-cache").send(files[f]));
}
app.get("/apple-touch-icon.png", async (_, reply) => reply.type(TYPES.png).send(files["apple-touch-icon.png"]));

// ---------- pages ----------

app.get("/", async (request, reply) => {
  const user = await currentUser(request);
  if (!user) return reply.redirect("/login");
  return reply.type(TYPES.html).header("Cache-Control", "no-cache").send(files["app.html"]);
});
app.get("/login", async (_, reply) => reply.type(TYPES.html).send(files["login.html"]));
app.get("/signup", async (_, reply) => reply.type(TYPES.html).send(files["login.html"]));
app.get("/privacy", async (_, reply) => reply.type(TYPES.html).send(files["privacy.html"]));
app.get("/reset", async (_, reply) => reply.type(TYPES.html).send(files["login.html"]));
app.get("/forgot", async (_, reply) => reply.type(TYPES.html).send(files["login.html"]));

// ---------- accounts ----------

// A light brake on password guessing and scripted sign ups, kept in memory only. Render passes
// on whatever X-Forwarded-For a visitor sends, so the address can be faked: the brakes that
// matter (sign in, forgot password, the lead form) also count per email or per listing, which
// can't be. When the list gets long the oldest entries go, never the whole list, so a flood of
// made up addresses can't wipe everyone's count.
const hits = new Map();
function tooMany(key, max = 10, windowMs = 10 * 60 * 1000, { count = true } = {}) {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (count) recent.push(now);
  hits.delete(key);
  if (recent.length) hits.set(key, recent);
  if (hits.size > 50_000) for (const k of [...hits.keys()].slice(0, 10_000)) hits.delete(k);
  return recent.length > max;
}

// The app's public address, for links that leave the app (reset emails, link previews). Never
// taken from the request in production: a forged Host header would otherwise put a stranger's
// site in a reset email. APP_URL wins; Render sets RENDER_EXTERNAL_URL by itself.
const appUrl = (request) => (process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || (process.env.NODE_ENV === "production" ? "" : `${request.protocol}://${request.host}`)).replace(/\/$/, "");

const clean = (v, max = 200) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

app.post("/api/signup", async (request, reply) => {
  if (tooMany(`signup:${request.ip}`)) return reply.code(429).send({ error: "Too many tries. Wait a few minutes." });
  const { email, password, name, business, invite } = request.body || {};
  if (typeof email === "string" && adminSignupBlocked(email.trim())) return reply.code(403).send({ error: "That email can't be used to sign up here." });
  if (!inviteOk(invite, typeof email === "string" ? email.trim() : "")) return reply.code(403).send({ error: "Hopkins is invite only for now. Check the code, or join the waitlist." });
  if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) return reply.code(400).send({ error: "That email doesn't look right." });
  if (typeof password !== "string" || password.length < 8) return reply.code(400).send({ error: "Use at least 8 characters for the password." });
  if (await get(`SELECT id FROM users WHERE email = ?`, [email.trim().toLowerCase()])) return reply.code(409).send({ error: "There's already an account with that email. Sign in instead." });
  const userId = await createAccount({ email: email.trim(), password, name: clean(name, 80), business: clean(business, 120), plan: pilotPlan() });
  setSession(reply, userId);
  const count = await get(`SELECT COUNT(*) AS n FROM workspaces`);
  notifyFounder("New Hopkins account", `${count.n} accounts in total.`, ["tada"]);
  return { ok: true };
});

app.post("/api/login", async (request, reply) => {
  const { email, password } = request.body || {};
  if (tooMany(`login:${request.ip}`, 20)) return reply.code(429).send({ error: "Too many tries. Wait a few minutes." });
  const user = typeof email === "string" ? await get(`SELECT * FROM users WHERE email = ?`, [email.trim().toLowerCase()]) : null;
  // Wrong passwords for one account: 10 in 10 minutes, from anywhere, then it waits.
  const who = `login-email:${typeof email === "string" ? email.trim().toLowerCase() : ""}`;
  if (tooMany(who, 9, undefined, { count: false })) return reply.code(429).send({ error: "Too many tries. Wait a few minutes." });
  if (!user || typeof password !== "string" || !(await verifyPassword(password, user.pass_hash))) {
    tooMany(who, 9);
    return reply.code(401).send({ error: "That email and password don't match." });
  }
  setSession(reply, user.id, Number(user.session_ver) || 0);
  return { ok: true };
});

// Forgot password. With email set up (mail.js) the reset link goes straight to the person's
// inbox. Without it, or if the email fails, the founder's phone hears about it and he sends the
// link from Admin. The answer is the same whether or not the email has an account.
app.post("/api/forgot", async (request, reply) => {
  if (tooMany(`forgot:${request.ip}`, 5)) return reply.code(429).send({ error: "Too many tries. Wait a few minutes." });
  const email = clean(request.body?.email, 200)?.toLowerCase();
  if (!email || !EMAIL_RE.test(email)) return reply.code(400).send({ error: "That email doesn't look right." });
  // At most 3 reset emails an hour to one address, so nobody can flood an inbox or use up the
  // day's emails. The answer looks the same either way.
  if (tooMany(`forgot-email:${email}`, 3, 60 * 60 * 1000)) return { ok: true };
  const user = await get(`SELECT id FROM users WHERE email = ?`, [email]);
  if (user) {
    const sent = mailReady() && (await sendMail({ to: email, ...resetEmail(await makeResetLink(user.id, appUrl(request))) }));
    if (!sent) {
      await run(`UPDATE users SET reset_asked = ? WHERE id = ?`, [nowIso(), user.id]);
      notifyFounder("Hopkins: password reset asked", "Someone asked to reset their password. Open Admin to make their reset link.", ["key"]);
    }
  }
  return { ok: true };
});

app.post("/api/reset", async (request, reply) => {
  if (tooMany(`reset:${request.ip}`, 10)) return reply.code(429).send({ error: "Too many tries. Wait a few minutes." });
  const { t, password } = request.body || {};
  const user = await userForReset(t);
  if (!user) return reply.code(400).send({ error: "That reset link has expired or was already used. Ask for a new one." });
  if (typeof password !== "string" || password.length < 8) return reply.code(400).send({ error: "Use at least 8 characters for the password." });
  await changePassword(reply, user.id, password);
  return { ok: true };
});

app.post("/api/logout", async (_, reply) => {
  clearSession(reply);
  return { ok: true };
});

// Everything under /api/ except the routes above and the public lead form needs a session.
// API answers are always fresh: a browser must never show a list it saw before a change.
app.addHook("onSend", async (request, reply, payload) => {
  if (request.url.startsWith("/api/")) reply.header("Cache-Control", "no-store");
  return payload;
});

app.addHook("preHandler", async (request, reply) => {
  const path = request.url.split("?")[0];
  if (!path.startsWith("/api/") || ["/api/signup", "/api/login", "/api/logout", "/api/forgot", "/api/reset"].includes(path) || path.startsWith("/api/l/")) return;
  const user = await currentUser(request);
  if (!user) return reply.code(401).send({ error: "Sign in first." });
  request.user = user;
  // When each account was last in the app, for Admin. Written at most every 10 minutes.
  if (!user.last_seen || Date.now() - new Date(user.last_seen).getTime() > 10 * 60 * 1000) {
    run(`UPDATE users SET last_seen = ? WHERE id = ?`, [nowIso(), user.id]).catch(() => {});
  }
  request.ws = await getWorkspace(user.workspace_id);
});

// ---------- the workspace ----------

app.get("/api/me", async (request) => {
  const ws = request.ws;
  const made = await adsMade(ws.id);
  // Leads and the report fill in once ads run on Meta; until an account has any, they show as
  // coming soon.
  const [leadCount, launchCount] = await Promise.all([
    get(`SELECT COUNT(*) AS n FROM leads WHERE workspace_id = ?`, [ws.id]),
    get(`SELECT COUNT(*) AS n FROM launches WHERE workspace_id = ?`, [ws.id]),
  ]);
  return {
    soon: { leads: !Number(leadCount.n), report: !Number(leadCount.n) && !Number(launchCount.n) },
    user: { email: request.user.email, name: request.user.name, avatar_id: request.user.avatar_id || null },
    workspace: { id: ws.id, name: ws.name, plan: ws.plan, brand: ws.brand },
    usage: { adsMade: made, freeLimit: FREE_AD_LIMIT, priceFrom: PRICE_FROM },
    admin: isAdmin(request.user),
    ai: aiEnabled,
    kinds: KIND_NAMES,
    moments: MOMENTS,
    photoLabels: PHOTO_LABELS,
  };
});

const BRAND_KEYS = { business: 120, agent_name: 80, phone: 40, email: 120, city: 80, country: 60, instagram: 40, voice: 20, primary: 7, accent: 7, font: 20, logo_id: 40, alerts_topic: 64, license: 60 };
app.put("/api/brand", async (request, reply) => {
  const body = request.body || {};
  const brand = { ...request.ws.brand };
  for (const [k, max] of Object.entries(BRAND_KEYS)) {
    if (body[k] === undefined) continue;
    const v = typeof body[k] === "string" ? body[k].trim().slice(0, max) : "";
    if ((k === "primary" || k === "accent") && v && !/^#[0-9a-fA-F]{6}$/.test(v)) return reply.code(400).send({ error: "Colors need to be hex, like #1F2A36." });
    if (k === "voice" && !["plain", "warm", "premium"].includes(v)) continue;
    if (k === "font" && !["modern", "classic"].includes(v)) continue;
    if (k === "alerts_topic" && v && !/^[A-Za-z0-9_-]{6,64}$/.test(v)) return reply.code(400).send({ error: "The alerts topic can only use letters, numbers, dashes and underscores, 6 to 64 of them." });
    brand[k] = v;
  }
  brand.setup_done = true;
  await run(`UPDATE workspaces SET brand = ?, name = ? WHERE id = ?`, [JSON.stringify(brand), brand.business || request.ws.name, request.ws.id]);
  return { brand };
});

// ---------- your account (Settings) ----------

app.patch("/api/account", async (request, reply) => {
  const b = request.body || {};
  const user = await get(`SELECT * FROM users WHERE id = ?`, [request.user.id]);
  const sets = [], args = [];
  if (b.name !== undefined) { sets.push("name = ?"); args.push(clean(b.name, 80)); }
  if (b.avatar_id !== undefined) {
    if (b.avatar_id && !(await get(`SELECT id FROM photos WHERE id = ? AND workspace_id = ? AND kind = 'avatar'`, [b.avatar_id, request.ws.id]))) return reply.code(400).send({ error: "That photo didn't upload. Try again." });
    sets.push("avatar_id = ?"); args.push(b.avatar_id || null);
  }
  if (b.email !== undefined && b.email.trim().toLowerCase() !== user.email) {
    const email = String(b.email).trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return reply.code(400).send({ error: "That email doesn't look right." });
    if (typeof b.password !== "string" || !(await verifyPassword(b.password, user.pass_hash))) return reply.code(401).send({ error: "Enter your current password to change your email." });
    if (await get(`SELECT id FROM users WHERE email = ?`, [email])) return reply.code(409).send({ error: "There's already an account with that email." });
    // Moving onto an admin address would hand out admin; it can only be granted on Render.
    if (isAdmin({ email })) return reply.code(403).send({ error: "That email can't be used here." });
    sets.push("email = ?"); args.push(email);
  }
  if (sets.length) await run(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`, [...args, user.id]);
  return { ok: true };
});

app.post("/api/account/password", async (request, reply) => {
  if (tooMany(`pw:${request.user.id}`, 10)) return reply.code(429).send({ error: "Too many tries. Wait a few minutes." });
  const { current, next } = request.body || {};
  const user = await get(`SELECT * FROM users WHERE id = ?`, [request.user.id]);
  if (typeof current !== "string" || !(await verifyPassword(current, user.pass_hash))) return reply.code(401).send({ error: "Your current password isn't right." });
  if (typeof next !== "string" || next.length < 8) return reply.code(400).send({ error: "Use at least 8 characters for the new password." });
  await changePassword(reply, user.id, next);
  return { ok: true };
});

// Deletes the account and everything in its workspace: listings, photos, ads, chats, leads.
app.post("/api/account/delete", async (request, reply) => {
  const user = await get(`SELECT * FROM users WHERE id = ?`, [request.user.id]);
  if (typeof request.body?.password !== "string" || !(await verifyPassword(request.body.password, user.pass_hash))) return reply.code(401).send({ error: "Your password isn't right." });
  const ws = request.ws.id;
  for (const t of ["leads", "tests", "launches", "ads", "messages", "photos", "listings", "feedback", "users"]) await run(`DELETE FROM ${t} WHERE workspace_id = ?`, [ws]);
  await run(`DELETE FROM workspaces WHERE id = ?`, [ws]);
  clearSession(reply);
  return { ok: true };
});

// Feedback from inside the app: kept for Admin, and straight to the founder's phone.
app.post("/api/feedback", async (request, reply) => {
  if (tooMany(`feedback:${request.user.id}`, 20)) return reply.code(429).send({ error: "Too many tries. Wait a few minutes." });
  const body = clean(request.body?.body, 3000);
  if (!body) return reply.code(400).send({ error: "Write something first." });
  await run(`INSERT INTO feedback (id, workspace_id, user_id, body, page, created_at) VALUES (?,?,?,?,?,?)`, [randomUUID(), request.ws.id, request.user.id, body, clean(request.body?.page, 120), nowIso()]);
  notifyFounder(`Hopkins feedback · ${request.ws.name}`, body.slice(0, 300), ["speech_balloon"]);
  return { ok: true };
});

app.post("/api/alerts/test", async (request, reply) => {
  if (tooMany(`alerttest:${request.user.id}`, 5)) return reply.code(429).send({ error: "Too many tries. Wait a few minutes." });
  if (!request.ws.brand.alerts_topic) return reply.code(400).send({ error: "Turn lead alerts on first." });
  notifyTopic(request.ws.brand.alerts_topic, "Hopkins test", "Lead alerts work. New leads will arrive like this.");
  return { ok: true };
});

app.post("/api/upgrade-request", async (request) => {
  const ws = request.ws;
  notifyFounder("Hopkins: upgrade request", `${ws.name} asked for the paid plan. Their account email is in the admin view.`, ["moneybag"]);
  await run(`UPDATE workspaces SET brand = json_set(brand, '$.upgrade_requested', ?) WHERE id = ?`, [nowIso(), ws.id]);
  return { ok: true };
});

// ---------- photos ----------

// Photos arrive already resized by the browser, as base64, with a small thumbnail.
app.post("/api/photos", { bodyLimit: 12_000_000 }, async (request, reply) => {
  const { data, thumb, mime, listingId, kind, name } = request.body || {};
  if (typeof data !== "string" || !["image/jpeg", "image/png", "image/webp"].includes(mime)) return reply.code(400).send({ error: "That file isn't a photo I can use." });
  const buf = Buffer.from(data, "base64");
  if (buf.length > 6_000_000) return reply.code(413).send({ error: "That photo is too big." });
  // The bytes have to be the image they say they are, whatever the browser claimed.
  const looks = { "image/jpeg": buf[0] === 0xff && buf[1] === 0xd8, "image/png": buf.subarray(0, 4).toString("hex") === "89504e47", "image/webp": buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP" };
  if (!looks[mime]) return reply.code(400).send({ error: "That file isn't a photo I can use." });
  if (listingId && !(await loadListing(request.ws.id, listingId))) return reply.code(404).send({ error: "No such listing." });
  const id = randomUUID();
  const pos = listingId ? Number((await get(`SELECT COALESCE(MAX(position), -1) + 1 AS p FROM photos WHERE listing_id = ?`, [listingId])).p) : 0;
  const { labelFromName } = await import("./listing.js");
  await run(`INSERT INTO photos (id, workspace_id, listing_id, kind, label, position, mime, data, thumb, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`, [
    id, request.ws.id, listingId || null, ["logo", "avatar"].includes(kind) ? kind : "listing", labelFromName(name || ""), pos, mime, buf,
    typeof thumb === "string" ? Buffer.from(thumb, "base64") : null, nowIso(),
  ]);
  return { id, label: labelFromName(name || "") };
});

// Photo ids are random and unguessable; the public lead page and ad previews load them.
app.get("/photos/:id", async (request, reply) => {
  const thumb = request.query.thumb === "1";
  const p = await get(`SELECT mime, ${thumb ? "COALESCE(thumb, data)" : "data"} AS bytes FROM photos WHERE id = ?`, [request.params.id]);
  if (!p) return reply.code(404).send();
  return reply.type(thumb ? "image/jpeg" : p.mime).header("Cache-Control", "public, max-age=31536000, immutable").send(Buffer.from(p.bytes));
});

app.patch("/api/photos/:id", async (request, reply) => {
  const { label } = request.body || {};
  if (label !== undefined && !PHOTO_LABELS.includes(label)) return reply.code(400).send({ error: "Unknown label." });
  await run(`UPDATE photos SET label = ? WHERE id = ? AND workspace_id = ?`, [label, request.params.id, request.ws.id]);
  return { ok: true };
});

app.delete("/api/photos/:id", async (request) => {
  await run(`UPDATE ads SET photo_id = NULL WHERE photo_id = ? AND workspace_id = ?`, [request.params.id, request.ws.id]);
  await run(`DELETE FROM photos WHERE id = ? AND workspace_id = ?`, [request.params.id, request.ws.id]);
  return { ok: true };
});

// ---------- listings and the chat ----------

app.get("/api/listings", async (request) => {
  await numberUntitled(request.ws.id);
  const rows = await all(
    `SELECT l.id, l.title, l.address, l.area, l.city, l.untitled_no, l.price, l.beds, l.baths, l.sqft, l.status, l.moment, l.updated_at,
       (SELECT id FROM photos WHERE listing_id = l.id ORDER BY position LIMIT 1) AS photo_id,
       (SELECT COUNT(*) FROM leads WHERE listing_id = l.id) AS leads,
       (SELECT COUNT(*) FROM messages WHERE listing_id = l.id AND needs_action = 1) AS waiting,
       (SELECT COUNT(*) FROM ads WHERE listing_id = l.id AND status = 'approved') AS approved
     FROM listings l WHERE l.workspace_id = ? ORDER BY l.updated_at DESC`,
    [request.ws.id]
  );
  return { listings: rows };
});

async function listingPayload(ws, id) {
  await numberUntitled(ws.id);
  const listing = await loadListing(ws.id, id);
  if (!listing) return null;
  const [photos, ads, messages, leads] = await Promise.all([
    loadPhotos(id),
    currentAds(listing),
    all(`SELECT id, role, kind, body, data, needs_action, created_at FROM messages WHERE listing_id = ? ORDER BY created_at`, [id]),
    get(`SELECT COUNT(*) AS n FROM leads WHERE listing_id = ?`, [id]),
  ]);
  for (const m of messages) m.data = m.data ? JSON.parse(m.data) : null;
  const checked = ads.map((a) => ({ ...a, issues: checkWording(`${a.headline} ${a.overlay} ${a.kicker || ""} ${a.primary_text}`) }));
  return { listing: { ...listing, facts: factsLine(listing), priceText: formatPrice(listing.price) }, photos, ads: checked, messages, leads: Number(leads.n), suggestion: suggestionFor(ws, listing, ads, messages, ws.plan === "paid" || (await adsMade(ws.id)) + 1 <= FREE_AD_LIMIT) };
}

app.get("/api/listings/:id", async (request, reply) => {
  const p = await listingPayload(request.ws, request.params.id);
  return p || reply.code(404).send({ error: "No such listing." });
});

app.post("/api/listings", async (request, reply) => {
  const { text, photoIds, photoNames } = request.body || {};
  const ids = Array.isArray(photoIds) ? photoIds.filter((x) => typeof x === "string").slice(0, 30) : [];
  if (!clean(text, 5000) && !ids.length) return reply.code(400).send({ error: "Send me photos, a link or the description." });
  // What was said on the New listing screen before this message.
  const prior = Array.isArray(request.body.history) ? request.body.history.slice(-12).filter((m) => m && typeof m.body === "string" && m.body.trim() && ["agent", "hopkins"].includes(m.role)).map((m) => ({ role: m.role, body: clean(m.body, 2000) })) : [];
  // No listing in it ("Hello"): answer, and don't make a listing out of it.
  if (!looksLikeListing(clean(text, 5000) || "", ids)) {
    return { chat: { reply: await newChat(request.ws, [...prior, { role: "agent", body: clean(text, 2000) }]) } };
  }
  // The listing's chat starts with that conversation, so it carries on as one thread.
  const listing = await createListing(request.ws, { text: clean(text, 5000) || "", photoIds: ids, photoNames: photoNames || {}, history: prior });
  return listingPayload(request.ws, listing.id);
});

app.patch("/api/listings/:id", async (request, reply) => {
  const listing = await loadListing(request.ws.id, request.params.id);
  if (!listing) return reply.code(404).send({ error: "No such listing." });
  const b = request.body || {};
  const patch = {};
  for (const k of ["address", "city", "area", "home_type", "open_house"]) if (b[k] !== undefined) patch[k] = clean(b[k], 120);
  // The agent's own name for the listing; empty goes back to the address.
  if (b.title !== undefined) patch.title = clean(b.title, 80) || null;
  for (const k of ["price", "beds", "baths", "sqft", "spend"]) if (b[k] !== undefined) patch[k] = Number(b[k]) >= 0 ? Number(b[k]) : null;
  if (b.status && ["active", "sold", "archived"].includes(b.status)) patch.status = b.status;
  await patchListing(request.ws.id, listing.id, patch);
  // A new price or a new open house is a reason to advertise: Hopkins brings the ads.
  const fresh = await loadListing(request.ws.id, listing.id);
  if (patch.price && listing.price && patch.price !== listing.price) await makeAds(request.ws, fresh, "price", { oldPrice: listing.price });
  else if (patch.open_house && patch.open_house !== listing.open_house) await makeAds(request.ws, fresh, "open_house");
  return listingPayload(request.ws, listing.id);
});

app.post("/api/listings/:id/messages", async (request, reply) => {
  const text = clean(request.body?.text, 2000);
  if (!text) return reply.code(400).send({ error: "Say something first." });
  const selected = [1, 2, 3, 4, 5].includes(request.body?.version) ? request.body.version : 1;
  const r = await handleMessage(request.ws, request.params.id, text, selected);
  if (!r) return reply.code(404).send({ error: "No such listing." });
  // focus: the version the conversation is now about, so the app can switch to it.
  return { ...(await listingPayload(request.ws, request.params.id)), focus: [1, 2, 3, 4, 5].includes(r.focus) ? r.focus : null, upgrade: r.repeat ? r.reason || "run" : null };
});

// Several at once, from Select on the Listings page.
app.post("/api/listings/delete", async (request, reply) => {
  const ids = Array.isArray(request.body?.ids) ? [...new Set(request.body.ids.filter((x) => typeof x === "string"))].slice(0, 200) : [];
  if (!ids.length) return reply.code(400).send({ error: "Pick a listing first." });
  let deleted = 0;
  for (const id of ids) if (await deleteListing(request.ws, id)) deleted++;
  return { deleted };
});

app.delete("/api/listings/:id", async (request, reply) => {
  if (!(await deleteListing(request.ws, request.params.id))) return reply.code(404).send({ error: "No such listing." });
  return { ok: true };
});

// The Style sheet: change how one version (or all of them) looks, straight away.
app.patch("/api/listings/:id/style", async (request, reply) => {
  const listing = await loadListing(request.ws.id, request.params.id);
  if (!listing) return reply.code(404).send({ error: "No such listing." });
  const versions = (Array.isArray(request.body?.versions) ? request.body.versions : [1, 2, 3, 4, 5]).map(Number).filter((v) => [1, 2, 3, 4, 5].includes(v));
  const step = Number(request.body?.sizeStep) || 0;
  await restyle(request.ws, listing, versions, request.body?.style || {}, Math.max(-0.3, Math.min(0.3, step)));
  return listingPayload(request.ws, listing.id);
});

app.post("/api/listings/:id/remake", async (request, reply) => {
  const listing = await loadListing(request.ws.id, request.params.id);
  if (!listing) return reply.code(404).send({ error: "No such listing." });
  // A new set keeps the number of ads the listing has now.
  await makeAds(request.ws, listing, listing.moment, {}, { count: (await currentAds(listing)).length || null });
  return listingPayload(request.ws, listing.id);
});

app.post("/api/listings/:id/run", async (request, reply) => {
  const listing = await loadListing(request.ws.id, request.params.id);
  if (!listing) return reply.code(404).send({ error: "No such listing." });
  const { versions, budget, days, confirm } = request.body || {};
  if (confirm) await confirmRun(request.ws, listing.id, confirm);
  else await proposeRun(request.ws, listing, { versions: Array.isArray(versions) && versions.length ? versions : [1, 2, 3, 4, 5], budget, days });
  return listingPayload(request.ws, listing.id);
});

app.post("/api/messages/:id/dismiss", async (request) => {
  await run(`UPDATE messages SET needs_action = 0 WHERE id = ? AND workspace_id = ?`, [request.params.id, request.ws.id]);
  return { ok: true };
});

app.get("/api/inbox", async (request) => ({ items: await inbox(request.ws) }));

// ---------- leads and the report ----------

app.get("/api/leads", async (request) => {
  const leads = await all(
    `SELECT leads.*, listings.address, listings.area, ads.version, ads.pattern, ads.name AS ad_name FROM leads
     JOIN listings ON listings.id = leads.listing_id LEFT JOIN ads ON ads.id = leads.ad_id
     WHERE leads.workspace_id = ? ORDER BY leads.created_at DESC LIMIT 500`,
    [request.ws.id]
  );
  return { leads };
});

app.patch("/api/leads/:id", async (request, reply) => {
  const { status } = request.body || {};
  if (!["new", "contacted", "showing", "offer", "closed", "not_a_fit"].includes(status)) return reply.code(400).send({ error: "Unknown status." });
  await run(`UPDATE leads SET status = ? WHERE id = ? AND workspace_id = ?`, [status, request.params.id, request.ws.id]);
  return { ok: true };
});

app.get("/api/report", async (request) => weeklyReport(request.ws));

// ---------- admin (ADMIN_EMAILS) ----------

app.get("/api/admin/workspaces", async (request, reply) => {
  if (!isAdmin(request.user)) return reply.code(403).send({ error: "Admins only." });
  const rows = await all(
    `SELECT w.id, w.name, w.plan, w.brand, w.created_at, (SELECT GROUP_CONCAT(email) FROM users WHERE workspace_id = w.id) AS emails,
       (SELECT id FROM users WHERE workspace_id = w.id LIMIT 1) AS user_id, (SELECT MAX(last_seen) FROM users WHERE workspace_id = w.id) AS last_seen,
       (SELECT MAX(reset_asked) FROM users WHERE workspace_id = w.id) AS reset_asked,
       (SELECT COUNT(*) FROM listings WHERE workspace_id = w.id) AS listings, (SELECT COUNT(*) FROM ads WHERE workspace_id = w.id) AS ads,
       (SELECT COUNT(*) FROM leads WHERE workspace_id = w.id) AS leads
     FROM workspaces w ORDER BY w.created_at DESC`
  );
  return { workspaces: rows.map((r) => ({ ...r, upgrade_requested: JSON.parse(r.brand || "{}").upgrade_requested || null, brand: undefined })) };
});

// A one time password reset link for an account, to send to the person yourself.
app.post("/api/admin/users/:id/reset-link", async (request, reply) => {
  if (!isAdmin(request.user)) return reply.code(403).send({ error: "Admins only." });
  if (!(await get(`SELECT id FROM users WHERE id = ?`, [request.params.id]))) return reply.code(404).send({ error: "No such account." });
  return { link: await makeResetLink(request.params.id, appUrl(request)) };
});

app.get("/api/admin/feedback", async (request, reply) => {
  if (!isAdmin(request.user)) return reply.code(403).send({ error: "Admins only." });
  const rows = await all(`SELECT f.body, f.page, f.created_at, w.name, u.email FROM feedback f LEFT JOIN workspaces w ON w.id = f.workspace_id LEFT JOIN users u ON u.id = f.user_id ORDER BY f.created_at DESC LIMIT 100`);
  return { feedback: rows };
});

app.patch("/api/admin/workspaces/:id", async (request, reply) => {
  if (!isAdmin(request.user)) return reply.code(403).send({ error: "Admins only." });
  const { plan } = request.body || {};
  if (!["free", "paid"].includes(plan)) return reply.code(400).send({ error: "Plan is free or paid." });
  await run(`UPDATE workspaces SET plan = ? WHERE id = ?`, [plan, request.params.id]);
  return { ok: true };
});

// ---------- the public lead page ----------

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

app.get("/l/:slug", async (request, reply) => {
  const listing = await get(`SELECT * FROM listings WHERE slug = ?`, [request.params.slug]);
  if (!listing || listing.status === "archived") return reply.code(404).type(TYPES.html).send("<!doctype html><title>Not found</title><p style='font-family:sans-serif;padding:40px'>This listing isn't available any more.</p>");
  const ws = await getWorkspace(listing.workspace_id);
  const photos = await all(`SELECT id FROM photos WHERE listing_id = ? AND kind = 'listing' ORDER BY position LIMIT 12`, [listing.id]);
  const b = ws.brand;
  const data = {
    slug: listing.slug, address: listing.address, area: listing.area, city: listing.city, price: formatPrice(listing.price),
    facts: factsLine(listing), openHouse: listing.open_house, status: listing.status, photos: photos.map((p) => p.id),
    brand: { business: b.business || ws.name, agent: b.agent_name || "", phone: b.phone || "", license: b.license || "", primary: b.primary || "#1F2A36", accent: b.accent || "#C8A96A", font: b.font || "modern", logo: b.logo_id || null },
  };
  const title = [listing.address || listing.area || "Listing", data.price].filter(Boolean).join(", ");
  // Function replacements, so a "$&" typed into an address can't change the page.
  // Link previews (iMessage, WhatsApp, Facebook) need a full address for the image.
  const origin = appUrl(request);
  const html = files["lead.html"]
    .replaceAll("__TITLE__", () => esc(title))
    .replace("__OG_DESC__", () => esc([data.facts, listing.area || listing.city, b.business || ws.name].filter(Boolean).join(" · ")))
    .replace("__OG_IMAGE__", () => (photos[0] ? `${origin}/photos/${photos[0].id}` : ""))
    .replace("__DATA__", () => JSON.stringify(data).replace(/</g, "\\u003c"));
  return reply.type(TYPES.html).header("Cache-Control", "no-cache").send(html);
});

app.post("/api/l/:slug/lead", async (request, reply) => {
  if (tooMany(`lead:${request.ip}`, 8)) return reply.code(429).send({ error: "Too many tries. Wait a few minutes." });
  const listing = await get(`SELECT * FROM listings WHERE slug = ?`, [request.params.slug]);
  if (!listing || listing.status === "archived") return reply.code(404).send({ error: "This listing isn't available any more." });
  // A script can fake its address, not the listing: 30 leads an hour on one listing is far more
  // than a real one gets.
  if (tooMany(`lead-listing:${listing.id}`, 30, 60 * 60 * 1000)) return reply.code(429).send({ error: "Too many tries. Wait a few minutes." });
  const b = request.body || {};
  if (b.website) return { ok: true }; // the hidden field only scripts fill in
  const name = clean(b.name, 80);
  const email = clean(b.email, 120);
  const phone = clean(b.phone, 40);
  if (!name) return reply.code(400).send({ error: "Add your name." });
  if (!email && !phone) return reply.code(400).send({ error: "Add a phone number or an email so the agent can reply." });
  if (email && !EMAIL_RE.test(email)) return reply.code(400).send({ error: "That email doesn't look right." });
  const wants = ["showing", "info", "offer"].includes(b.wants) ? b.wants : "info";
  await addLead(listing, { name, email, phone, wants, note: clean(b.note, 600), adId: clean(b.v, 40), source: clean(b.src, 40) });
  return { ok: true };
});

// Tests load the app without opening a port (NO_LISTEN covers tests that run as production).
if (process.env.NODE_ENV !== "test" && !process.env.NO_LISTEN) {
  await forgetGuessedCities().catch((err) => console.error("City clean up failed:", err.message));
  await app.listen({ port: Number(process.env.PORT || 3200), host: "0.0.0.0" });
}
