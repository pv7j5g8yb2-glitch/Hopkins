import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { run, get, all, nowIso } from "./db.js";
import { EMAIL_RE, inviteOk, isAdmin, createAccount, verifyPassword, hashPassword, setSession, clearSession, currentUser } from "./auth.js";
import {
  getWorkspace, loadListing, loadPhotos, currentAds, createListing, handleMessage, makeAds, patchListing,
  proposeRun, confirmRun, addLead, weeklyReport, inbox,
} from "./hopkins.js";
import { adsMade, FREE_AD_LIMIT, PRICE_FROM } from "./plans.js";
import { aiEnabled } from "./brain.js";
import { PATTERNS, MOMENTS } from "./writer.js";
import { PHOTO_LABELS, formatPrice, factsLine } from "./listing.js";
import { notifyFounder } from "./notify.js";
import { checkWording } from "./fairhousing.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB = join(__dirname, "..", "web");

const COOKIE_SECRET = process.env.COOKIE_SECRET;
if (!COOKIE_SECRET) throw new Error("COOKIE_SECRET is not set");

// Read once at start up; restart to pick up changes (npm run dev does that for you).
const files = {};
for (const f of ["app.html", "app.css", "app.js", "glass.js", "creative.js", "login.html", "lead.html", "mark.svg"]) files[f] = readFileSync(join(WEB, f), "utf8");
const TYPES = { html: "text/html; charset=utf-8", css: "text/css; charset=utf-8", js: "text/javascript; charset=utf-8", svg: "image/svg+xml", png: "image/png", jpg: "image/jpeg", webmanifest: "application/manifest+json" };
// The home screen icons, the app manifest, and a free licence (Unsplash) sample photo for the
// brand page preview before the agent has any listings.
for (const f of ["icon-192.png", "icon-512.png", "apple-touch-icon.png", "sample-home.jpg"]) files[f] = readFileSync(join(WEB, f));
files["manifest.webmanifest"] = readFileSync(join(WEB, "manifest.webmanifest"), "utf8");

export const app = Fastify({ logger: process.env.NODE_ENV !== "test", bodyLimit: 1_000_000 });
await app.register(cookie, { secret: COOKIE_SECRET });

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

// ---------- accounts ----------

// A light brake on password guessing and scripted sign ups, kept in memory only.
const hits = new Map();
function tooMany(key, max = 10, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > max;
}

const clean = (v, max = 200) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

app.post("/api/signup", async (request, reply) => {
  if (tooMany(`signup:${request.ip}`)) return reply.code(429).send({ error: "Too many tries. Wait a few minutes." });
  const { email, password, name, business, invite } = request.body || {};
  if (!inviteOk(invite, typeof email === "string" ? email.trim() : "")) return reply.code(403).send({ error: "Hopkins is invite only for now. Check the code, or join the waitlist." });
  if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) return reply.code(400).send({ error: "That email doesn't look right." });
  if (typeof password !== "string" || password.length < 8) return reply.code(400).send({ error: "Use at least 8 characters for the password." });
  if (await get(`SELECT id FROM users WHERE email = ?`, [email.trim().toLowerCase()])) return reply.code(409).send({ error: "There's already an account with that email. Sign in instead." });
  const userId = await createAccount({ email: email.trim(), password, name: clean(name, 80), business: clean(business, 120) });
  setSession(reply, userId);
  const count = await get(`SELECT COUNT(*) AS n FROM workspaces`);
  notifyFounder("New Hopkins account", `${count.n} accounts in total.`, ["tada"]);
  return { ok: true };
});

app.post("/api/login", async (request, reply) => {
  const { email, password } = request.body || {};
  if (tooMany(`login:${request.ip}`, 20)) return reply.code(429).send({ error: "Too many tries. Wait a few minutes." });
  const user = typeof email === "string" ? await get(`SELECT * FROM users WHERE email = ?`, [email.trim().toLowerCase()]) : null;
  if (!user || typeof password !== "string" || !(await verifyPassword(password, user.pass_hash))) {
    return reply.code(401).send({ error: "That email and password don't match." });
  }
  setSession(reply, user.id);
  return { ok: true };
});

app.post("/api/logout", async (_, reply) => {
  clearSession(reply);
  return { ok: true };
});

// Everything under /api/ except the routes above and the public lead form needs a session.
app.addHook("preHandler", async (request, reply) => {
  const path = request.url.split("?")[0];
  if (!path.startsWith("/api/") || ["/api/signup", "/api/login", "/api/logout"].includes(path) || path.startsWith("/api/l/")) return;
  const user = await currentUser(request);
  if (!user) return reply.code(401).send({ error: "Sign in first." });
  request.user = user;
  request.ws = await getWorkspace(user.workspace_id);
});

// ---------- the workspace ----------

app.get("/api/me", async (request) => {
  const ws = request.ws;
  const made = await adsMade(ws.id);
  return {
    user: { email: request.user.email, name: request.user.name, avatar_id: request.user.avatar_id || null },
    workspace: { id: ws.id, name: ws.name, plan: ws.plan, brand: ws.brand },
    usage: { adsMade: made, freeLimit: FREE_AD_LIMIT, priceFrom: PRICE_FROM },
    admin: isAdmin(request.user),
    ai: aiEnabled,
    patterns: PATTERNS,
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
  await run(`UPDATE users SET pass_hash = ? WHERE id = ?`, [await hashPassword(next), user.id]);
  return { ok: true };
});

// Deletes the account and everything in its workspace: listings, photos, ads, chats, leads.
app.post("/api/account/delete", async (request, reply) => {
  const user = await get(`SELECT * FROM users WHERE id = ?`, [request.user.id]);
  if (typeof request.body?.password !== "string" || !(await verifyPassword(request.body.password, user.pass_hash))) return reply.code(401).send({ error: "Your password isn't right." });
  const ws = request.ws.id;
  for (const t of ["leads", "tests", "launches", "ads", "messages", "photos", "listings", "users"]) await run(`DELETE FROM ${t} WHERE workspace_id = ?`, [ws]);
  await run(`DELETE FROM workspaces WHERE id = ?`, [ws]);
  clearSession(reply);
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
  const rows = await all(
    `SELECT l.id, l.address, l.area, l.city, l.price, l.status, l.moment, l.updated_at,
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
  return { listing: { ...listing, facts: factsLine(listing), priceText: formatPrice(listing.price) }, photos, ads: checked, messages, leads: Number(leads.n) };
}

app.get("/api/listings/:id", async (request, reply) => {
  const p = await listingPayload(request.ws, request.params.id);
  return p || reply.code(404).send({ error: "No such listing." });
});

app.post("/api/listings", async (request, reply) => {
  const { text, photoIds, photoNames } = request.body || {};
  const ids = Array.isArray(photoIds) ? photoIds.filter((x) => typeof x === "string").slice(0, 30) : [];
  if (!clean(text, 5000) && !ids.length) return reply.code(400).send({ error: "Send me photos, a link or the description." });
  const listing = await createListing(request.ws, { text: clean(text, 5000) || "", photoIds: ids, photoNames: photoNames || {} });
  return listingPayload(request.ws, listing.id);
});

app.patch("/api/listings/:id", async (request, reply) => {
  const listing = await loadListing(request.ws.id, request.params.id);
  if (!listing) return reply.code(404).send({ error: "No such listing." });
  const b = request.body || {};
  const patch = {};
  for (const k of ["address", "city", "area", "home_type", "open_house"]) if (b[k] !== undefined) patch[k] = clean(b[k], 120);
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
  const selected = [1, 2, 3].includes(request.body?.version) ? request.body.version : 1;
  const r = await handleMessage(request.ws, request.params.id, text, selected);
  if (!r) return reply.code(404).send({ error: "No such listing." });
  return listingPayload(request.ws, request.params.id);
});

app.post("/api/listings/:id/remake", async (request, reply) => {
  const listing = await loadListing(request.ws.id, request.params.id);
  if (!listing) return reply.code(404).send({ error: "No such listing." });
  await makeAds(request.ws, listing, listing.moment);
  return listingPayload(request.ws, listing.id);
});

app.post("/api/listings/:id/run", async (request, reply) => {
  const listing = await loadListing(request.ws.id, request.params.id);
  if (!listing) return reply.code(404).send({ error: "No such listing." });
  const { versions, budget, days, confirm } = request.body || {};
  if (confirm) await confirmRun(request.ws, listing.id, confirm);
  else await proposeRun(request.ws, listing, { versions: Array.isArray(versions) && versions.length ? versions : [1, 2, 3], budget, days });
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
    `SELECT leads.*, listings.address, listings.area, ads.version, ads.pattern FROM leads
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
       (SELECT COUNT(*) FROM listings WHERE workspace_id = w.id) AS listings, (SELECT COUNT(*) FROM ads WHERE workspace_id = w.id) AS ads,
       (SELECT COUNT(*) FROM leads WHERE workspace_id = w.id) AS leads
     FROM workspaces w ORDER BY w.created_at DESC`
  );
  return { workspaces: rows.map((r) => ({ ...r, upgrade_requested: JSON.parse(r.brand || "{}").upgrade_requested || null, brand: undefined })) };
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
  const html = files["lead.html"]
    .replaceAll("__TITLE__", () => esc(title))
    .replace("__OG_IMAGE__", () => (photos[0] ? `/photos/${photos[0].id}` : ""))
    .replace("__DATA__", () => JSON.stringify(data).replace(/</g, "\\u003c"));
  return reply.type(TYPES.html).header("Cache-Control", "no-cache").send(html);
});

app.post("/api/l/:slug/lead", async (request, reply) => {
  if (tooMany(`lead:${request.ip}`, 8)) return reply.code(429).send({ error: "Too many tries. Wait a few minutes." });
  const listing = await get(`SELECT * FROM listings WHERE slug = ?`, [request.params.slug]);
  if (!listing) return reply.code(404).send({ error: "This listing isn't available any more." });
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

if (process.env.NODE_ENV !== "test") {
  await app.listen({ port: Number(process.env.PORT || 3200), host: "0.0.0.0" });
}
