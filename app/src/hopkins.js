// Hopkins itself: what happens when a listing comes in, when the agent says something in
// the chat, when they say yes, and when a lead arrives. Routes in server.js stay thin and
// call these.

import { randomUUID, randomBytes } from "node:crypto";
import { run, get, all, nowIso } from "./db.js";
import { parseListingText, readLink, formatPrice, priceBand, labelFromName, FEATURES } from "./listing.js";
import { writeSet, writeVersion, polish, polishChat, KINDS, KIND_NAMES, MAX_ADS, MOMENTS } from "./writer.js";
import { factProblems, withoutProblems } from "./facts.js";
import { checkWording, cleanWording, audienceFor } from "./fairhousing.js";
import { readIntent, readStyle, namedVersions } from "./rules.js";
import { cleanStyle, mergeStyle, sayLook, onlyAsked, keepReadable, colourName, contrast, STYLE_KEYS } from "./style.js";
import { aiEnabled, provider, readListingAI, seePhotosAI, writeSetAI, chatTurnAI, newChatAI, takeFailure } from "./brain.js";

// When the model is over its limit, anything the rules can do still gets done; anything that
// needs real understanding gets an honest "give me a moment" instead of "I didn't follow".
const BUSY = "Sorry, I'm getting a lot of messages at once. Send that again in a few seconds and I'll give it a proper answer.";
const needsModel = (text) => ["unknown", "question", "greeting", "thanks"].includes(readIntent(text).kind);
import { canMake, isPaid, upgradeText, adsMade, FREE_AD_LIMIT } from "./plans.js";
import { notifyTopic, notifyFounder } from "./notify.js";

const LISTING_FIELDS = ["address", "city", "area", "price", "beds", "baths", "sqft", "home_type", "open_house"];
export const DEFAULT_BUDGET = 200;
export const DEFAULT_DAYS = 10;

// ---------- loading ----------

export async function getWorkspace(id) {
  const ws = await get(`SELECT * FROM workspaces WHERE id = ?`, [id]);
  if (ws) ws.brand = safeJson(ws.brand, {});
  return ws;
}

function safeJson(s, fallback) {
  try { return s ? JSON.parse(s) : fallback; } catch { return fallback; }
}

export async function loadListing(workspaceId, id) {
  const l = await get(`SELECT * FROM listings WHERE id = ? AND workspace_id = ?`, [id, workspaceId]);
  if (l) l.features = safeJson(l.features, []);
  return l;
}

export async function loadPhotos(listingId, withThumb = false) {
  return all(
    `SELECT id, label, seen, position${withThumb ? ", thumb" : ""} FROM photos WHERE listing_id = ? AND kind = 'listing' ORDER BY position, created_at`,
    [listingId]
  );
}

export async function currentAds(listing) {
  const rows = await all(`SELECT * FROM ads WHERE listing_id = ? AND moment = ? ORDER BY version`, [listing.id, listing.moment]);
  return rows.map((a) => ({ ...a, style: safeJson(a.style, {}) }));
}

async function postMessage(workspaceId, listingId, role, kind, body, data = null, needsAction = false) {
  const msg = { id: randomUUID(), workspace_id: workspaceId, listing_id: listingId, role, kind, body: body || "", data: data ? JSON.stringify(data) : null, needs_action: needsAction ? 1 : 0, created_at: nowIso() };
  // Messages written in the same millisecond keep their order.
  await new Promise((r) => setTimeout(r, 2));
  await run(
    `INSERT INTO messages (id, workspace_id, listing_id, role, kind, body, data, needs_action, created_at) VALUES (?,?,?,?,?,?,?,?,?)`,
    [msg.id, msg.workspace_id, msg.listing_id, msg.role, msg.kind, msg.body, msg.data, msg.needs_action, msg.created_at]
  );
  return msg;
}

// The ads as they stand right after a change, saved on the reply that made it, so the chat shows
// each round of changes where it happened (like a chat app showing each new image), not only
// the latest set far back up the thread.
async function snapshot(listing, versions) {
  const ads = await currentAds(await loadListing(listing.workspace_id, listing.id));
  return ads
    .filter((a) => !versions || versions.includes(a.version))
    .map(({ version, name, pattern, headline, primary_text, overlay, kicker, cta, photo_id, style }) => ({ version, name, pattern, headline, primary_text, overlay, kicker, cta, photo_id, style }));
}

const say = (ws, listingId, body, kind = "text", data = null, needsAction = false) => postMessage(ws.id, listingId, "hopkins", kind, body, data, needsAction);

async function clearActions(listingId) {
  await run(`UPDATE messages SET needs_action = 0 WHERE listing_id = ? AND needs_action = 1`, [listingId]);
}

// ---------- a new listing ----------

function slugFor(listing) {
  const base = (listing.address || listing.area || listing.city || "listing").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  return `${base}-${randomBytes(3).toString("hex")}`;
}

const URL_RE = /https?:\/\/[^\s<>"']+/i;

// A message on the New listing screen only becomes a listing when there's a listing in it:
// photos, a link, or at least one fact about a home. "Hello" is a conversation, not a listing.
export function looksLikeListing(text, photoIds = []) {
  if (photoIds.length || URL_RE.test(text)) return true;
  const p = parseListingText(text);
  return Boolean(p.price || p.beds || p.baths || p.sqft || p.address || p.home_type || p.features.length);
}

// The reply on the New listing screen when there's no listing yet. history is the exchange so
// far on that screen, [{ role: "agent" | "hopkins", body }], ending with the agent's message.
export async function newChat(ws, history) {
  const text = history.at(-1)?.body || "";
  const lastReply = [...history].reverse().find((m) => m.role === "hopkins")?.body;
  if (aiEnabled) {
    const reply = await newChatAI({ history, brand: ws.brand, plan: { paid: isPaid(ws), adsMade: await adsMade(ws.id), limit: FREE_AD_LIMIT }, agentName: ws.brand.agent_name });
    if (reply) return plainWords(reply);
    if (takeFailure() === "busy" && needsModel(text)) return BUSY;
  }
  const first = (ws.brand.agent_name || "").split(" ")[0];
  const intent = readIntent(text);
  // Said once; after that it isn't tacked onto every reply.
  const ask = lastReply?.includes("Send me a listing") ? "" : "Send me a listing: paste the link, add the photos, or tell me the address, price and what stands out.";
  const options =
    intent.kind === "greeting" ? [`Hi${first ? ` ${first}` : ""}. ${ask || "What are you working on?"}`, "Hi again. Paste a listing link or add the photos whenever you're ready."]
    : intent.kind === "question" && intent.topic === "plan" ? [`The free plan makes up to 3 ads as previews. ${upgradeText("plan")}`]
    : intent.kind === "question" && intent.topic === "help" ? [`I make ads for each listing, each a different idea, so you can test them against each other. You change them with me here, and nothing runs until you say yes. ${ask}`]
    : intent.kind === "thanks" ? ["Any time."]
    : [`I need a listing to start. ${ask}`, `I didn't catch a listing in that. Paste the link or add the photos and I'll take it from there.`];
  return (options.map((o) => o.trim()).find((o) => o !== lastReply) || options[0]).trim();
}

// What the agent will most likely say next, shown in grey in the empty message box. The model
// writes one with each reply; otherwise it comes from where the listing is at. Never something
// they just sent, never a nudge to pay.
export function suggestionFor(ws, listing, ads, messages, canMakeMore = true) {
  const last = messages.at(-1);
  if (!last || last.role !== "hopkins") return "";
  const sent = new Set(messages.filter((m) => m.role === "agent").slice(-6).map((m) => m.body.trim().toLowerCase()));
  const ok = (s) => s && !sent.has(s.toLowerCase());
  if (ok(last.data?.suggestion)) return last.data.suggestion;
  // A saved listing with no ads yet: once they're on the paid plan, making them is the next step.
  if (!ads.length) return canMakeMore && ok("Make the ads") ? "Make the ads" : "";
  if (last.kind === "plan" || last.kind === "upgrade") return "";
  // A fresh set (maybe with a wording note after it) since the agent last spoke.
  const sinceAgent = messages.slice(messages.findLastIndex((m) => m.role === "agent") + 1);
  const options = sinceAgent.some((m) => m.kind === "ads")
    ? ["Which one would you pick?", "Make the first one shorter", "Use a different photo"]
    : ["Make it shorter", "Try another angle", "Use a different photo", "Make it warmer", ...(isPaid(ws) ? ["Run it"] : [])];
  return options.find(ok) || "";
}

// Listings made before that fix may carry the brand city as a guess. Clear it where the listing's
// own words never mention it. Runs at start, and does nothing once they're clean.
export async function forgetGuessedCities() {
  for (const w of await all(`SELECT id, brand FROM workspaces`)) {
    const city = safeJson(w.brand, {}).city;
    if (!city) continue;
    await run(
      `UPDATE listings SET city = NULL WHERE workspace_id = ? AND city = ? AND instr(lower(coalesce(description, '') || ' ' || coalesce(link, '')), lower(?)) = 0`,
      [w.id, city, city]
    );
  }
}

// Changes how some versions look (from the rules or the Style sheet). sizeStep nudges the text
// size up or down from where it is. Returns the versions changed.
// From the chat, a colour that wouldn't read is left out (readable: true). The Style sheet shows
// a live preview, so what's picked there is kept as picked.
export async function restyle(ws, listing, versions, changes, sizeStep = 0, { readable = false } = {}) {
  const ads = await currentAds(listing);
  const done = [];
  for (const ad of ads.filter((a) => versions.includes(a.version))) {
    const wanted = cleanStyle(changes);
    let style = mergeStyle(ad.style, readable ? keepReadable(wanted, ad.style, ws.brand?.primary).changes : wanted);
    if (sizeStep) style = mergeStyle(style, cleanStyle({ size: (Number(ad.style.size) || 1) + sizeStep }));
    await saveAd(ws, listing, listing.moment, ad.version, { ...ad, style }, ad);
    done.push(ad.version);
  }
  return done;
}

export async function deleteListing(ws, id) {
  const listing = await loadListing(ws.id, id);
  if (!listing) return false;
  const { n } = await get(`SELECT COUNT(*) AS n FROM ads WHERE listing_id = ?`, [id]);
  await run(`UPDATE workspaces SET ads_removed = ads_removed + ? WHERE id = ?`, [Number(n) || 0, ws.id]);
  for (const t of ["leads", "tests", "launches", "ads", "messages", "photos"]) await run(`DELETE FROM ${t} WHERE listing_id = ? AND workspace_id = ?`, [id, ws.id]);
  await run(`DELETE FROM listings WHERE id = ? AND workspace_id = ?`, [id, ws.id]);
  return true;
}

export async function createListing(ws, { text = "", photoIds = [], photoNames = {}, history = [] }) {
  const link = (text.match(URL_RE) || [])[0] || null;
  const rest = link ? text.replace(link, " ").trim() : text.trim();
  const linkInfo = link ? await readLink(link) : null;
  const source = [rest, linkInfo?.title, linkInfo?.description].filter(Boolean).join("\n");

  const parsed = parseListingText(source);
  // The city comes from the listing or not at all. Filling it in from the agent's brand city
  // named a listing "Miami" from photos of somewhere else (2026-10-25).

  const id = randomUUID();
  const now = nowIso();
  const listing = { id, workspace_id: ws.id, address: null, city: null, area: null, price: null, beds: null, baths: null, sqft: null, home_type: null, open_house: null, ...parsed };
  listing.slug = slugFor(listing);
  await run(
    `INSERT INTO listings (id, workspace_id, slug, address, city, area, price, beds, baths, sqft, home_type, features, description, link, open_house, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, ws.id, listing.slug, listing.address, listing.city, listing.area, listing.price, listing.beds, listing.baths, listing.sqft, listing.home_type,
      JSON.stringify(listing.features || []), source || null, link, listing.open_house, now, now]
  );

  // Photos uploaded before the listing existed get attached now, in the order sent.
  for (const [i, pid] of photoIds.entries()) {
    const label = labelFromName(photoNames[pid] || "");
    await run(`UPDATE photos SET listing_id = ?, position = ?, label = COALESCE(label, ?) WHERE id = ? AND workspace_id = ?`, [id, i, label, pid, ws.id]);
  }

  for (const m of history) await postMessage(ws.id, id, m.role, "text", m.body);
  const shown = [rest, link].filter(Boolean).join("\n");
  // Photos sent on their own are just photos, with no made up words.
  await postMessage(ws.id, id, "agent", "text", shown, photoIds.length ? { photos: photoIds } : null);

  // With a model, it reads the listing and labels the photos better than the rules can.
  let missing = null;
  if (aiEnabled) {
    let photos = await loadPhotos(id, true);
    // Groq's text model can't see; its vision model notes what's in the first photos, so the
    // ads can lead with what's really there.
    const seen = await seePhotosAI(photos);
    for (const p of seen || []) await run(`UPDATE photos SET label = COALESCE(?, label), seen = ? WHERE id = ?`, [p.label, p.seen || null, p.id]);
    if (seen) photos = await loadPhotos(id, true);
    const r = await readListingAI({ text: rest, linkInfo, photos });
    if (r) {
      const patch = {};
      for (const k of LISTING_FIELDS) if (r.listing[k] && !(typeof r.listing[k] === "number" && r.listing[k] <= 0)) patch[k] = r.listing[k];
      if (r.listing.features?.length) patch.features = [...new Set([...(listing.features || []), ...r.listing.features])];
      await patchListing(ws.id, id, patch);
      for (const [i, label] of (r.photo_labels || []).entries()) if (photos[i] && label) await run(`UPDATE photos SET label = ? WHERE id = ?`, [label, photos[i].id]);
      for (const [i, note] of (r.photo_notes || []).entries()) if (photos[i] && note) await run(`UPDATE photos SET seen = ? WHERE id = ?`, [String(note).slice(0, 160), photos[i].id]);
      missing = r.missing || null;
    }
  }

  await numberUntitled(ws.id);
  const fresh = await loadListing(ws.id, id);
  if (link && !linkInfo && !fresh.price && !rest) {
    await say(ws, id, "I couldn't open that link (a lot of listing sites block other apps). Paste the description, or tell me the price, beds, baths and the best thing about it, and I'll make the ads.");
    return fresh;
  }
  if (!missing && !fresh.price) missing = "What's the asking price?";
  await makeAds(ws, fresh, "new", {}, { note: missing, count: countFrom(rest) });
  return fresh;
}

// A listing's name: the agent's own, else the address or area or city, else "Untitled 1",
// "Untitled 2" and so on, numbered in the order they came in and never renumbered.
export const listingTitle = (l) => l.title || l.address || l.area || l.city || (l.untitled_no ? `Untitled ${l.untitled_no}` : "Untitled");
export async function numberUntitled(workspaceId) {
  const bare = await all(`SELECT id FROM listings WHERE workspace_id = ? AND untitled_no IS NULL AND COALESCE(title, address, area, city, '') = '' ORDER BY created_at`, [workspaceId]);
  if (!bare.length) return;
  const top = await get(`SELECT COALESCE(MAX(untitled_no), 0) AS n FROM listings WHERE workspace_id = ?`, [workspaceId]);
  for (const [i, l] of bare.entries()) await run(`UPDATE listings SET untitled_no = ? WHERE id = ?`, [Number(top.n) + i + 1, l.id]);
}

export async function patchListing(workspaceId, id, patch) {
  const sets = [];
  const args = [];
  for (const k of [...LISTING_FIELDS, "status", "moment", "spend", "description", "title"]) {
    if (patch[k] !== undefined) { sets.push(`${k} = ?`); args.push(patch[k]); }
  }
  if (patch.features) { sets.push(`features = ?`); args.push(JSON.stringify(patch.features)); }
  if (!sets.length) return;
  sets.push(`updated_at = ?`); args.push(nowIso());
  await run(`UPDATE listings SET ${sets.join(", ")} WHERE id = ? AND workspace_id = ?`, [...args, id, workspaceId]);
}

// ---------- making ads ----------

// The app labels ads by number (Ad 1, Ad 2), so replies do too; each one's idea is said after it.
const NAMES = (ads) => {
  const n = ads.map((a) => `**Ad ${a.version}**`);
  return n.length > 1 ? `${n.slice(0, -1).join(", ")} and ${n.at(-1)}` : n[0] || "";
};
const IDEAS = (ads) => ads.map((a) => `- **Ad ${a.version}**${a.name ? `: ${a.name}` : ""}`).join("\n");
function introFor(moment, listing, ads = []) {
  const where = listing.address || listing.area || "this listing";
  if (ads.length === 1) {
    const one = `**Ad 1**${ads[0].name ? `, ${ads[0].name.charAt(0).toLowerCase()}${ads[0].name.slice(1)}` : ""}`;
    if (moment === "price") return `The price changed on ${where}, so here's ${one}, for the new price. A new price gives people who scrolled past a reason to look again.`;
    if (moment === "open_house") return `Here's ${one}, for the open house at ${where}${listing.open_house ? `, ${listing.open_house}` : ""}. Run it in the days before.`;
    if (moment === "sold") return `Sold, nice. Here's ${one}, for people nearby who might sell next.`;
    return `Here's ${one}, for ${where}. Tell me what to change, or press Run it.`;
  }
  const list = `\n\n${IDEAS(ads)}\n\n`;
  if (moment === "price") return `The price changed on ${where}, so here are ${ads.length} ads for the new price:${list}A new price gives people who scrolled past a reason to look again.`;
  if (moment === "open_house") return `Here are ${ads.length} ads for the open house at ${where}${listing.open_house ? `, ${listing.open_house}` : ""}:${list}Run them in the days before it.`;
  if (moment === "sold") return `Sold, nice. Here are ${ads.length} ads for people nearby who might sell next:${list}`.trim();
  return `Here are ${ads.length} ads for ${where}, each a different idea so the test tells you something:${list}Tell me what to change, or press Run it.`;
}

// The model's style for one ad: "" and 0 mean "leave it", "default" means "back to the brand".
function modelStyle(st, message, { filter = true } = {}) {
  if (!st || typeof st !== "object") return {};
  if (st.reset === true) return { reset: true };
  const out = {};
  for (const [k, v] of Object.entries(st)) {
    if (k === "reset" || v === "" || v === 0 || v === null || v === undefined) continue;
    out[k] = typeof v === "string" && v.trim().toLowerCase() === "default" ? null : v;
  }
  return filter ? onlyAsked(cleanStyle(out), message) : cleanStyle(out);
}

// What really changed on each version, in words, plus any colour left out because it wouldn't
// read. Versions with the same change are said together.
function sayChanges(items, unreadable = {}, brandBg = "#1F2A36", ads = []) {
  const groups = [];
  for (const { version, before = {}, after = {} } of items) {
    const changes = {};
    for (const k of STYLE_KEYS) {
      if (k === "size" || before[k] === after[k]) continue;
      if (after[k] !== undefined) changes[k] = after[k];
    }
    const step = Math.round(((Number(after.size) || 1) - (Number(before.size) || 1)) * 100) / 100;
    if (!Object.keys(changes).length && !step) continue;
    const key = JSON.stringify([changes, Math.sign(step)]);
    const g = groups.find((x) => x.key === key);
    if (g) g.versions.push(version);
    else groups.push({ key, versions: [version], changes, step });
  }
  const lines = groups.map((g) => `${VERSION_WORD(g.versions, ads)} now ${g.versions.length > 1 ? "have" : "has"} ${sayLook(g.changes, g.step)}.`);
  for (const [v, list] of Object.entries(unreadable)) {
    const bg = items.find((i) => i.version === Number(v))?.after?.bg;
    for (const [k, col] of list) lines.push(`I left the ${k === "text" ? "text" : "label"} colour on ${VERSION_WORD([Number(v)], ads).replace(/^Ad /, "ad ")} as it was, because ${colourName(col)} wouldn't be readable on ${bg ? colourName(bg) : "that background"}. A ${contrast(bg || brandBg, "#FFFFFF") > contrast(bg || brandBg, "#000000") ? "lighter" : "darker"} one will work.`);
  }
  return lines.join(" ");
}

// An ad's name in sentence case ("Porch Life" becomes "Porch life"); place names, prices and
// acronyms keep their capitals.
function adName(raw, keep = []) {
  const words = polish(String(raw || "")).replace(/[.!]$/, "").slice(0, 28).split(" ").filter(Boolean);
  const titled = words.length > 1 && words.slice(1).every((w) => /^[A-Z$0-9]/.test(w));
  return words.map((w, i) => (i && titled && /^[A-Z][a-z]/.test(w) && !keep.includes(w) ? w.toLowerCase() : w)).join(" ");
}

function normalizeAI(ad, photos, fallback, message = "") {
  const photo = ad.photo_number > 0 ? photos[ad.photo_number - 1] : null;
  const clean = (s, max) => polish(cleanWording(String(s || ""))).slice(0, max);
  return {
    style: mergeStyle(fallback.style || {}, modelStyle(ad.style, message)),
    name: adName(ad.name) || fallback.name || "",
    pattern: KINDS.includes(ad.kind) ? ad.kind : fallback.pattern || "other",
    headline: clean(ad.headline, 60) || fallback.headline,
    primary_text: clean(ad.primary_text, 600) || fallback.primary_text,
    overlay: (clean(ad.overlay, 60).replace(/([^.!?])$/, "$1.")) || fallback.overlay,
    // "New ·" with nothing after it: the model left the place blank.
    kicker: clean(ad.kicker, 50).replace(/\s*[·•|,]\s*$/, "") || fallback.kicker || "",
    photo_id: photo ? photo.id : fallback.photo_id,
  };
}

// The ad with anything not backed by the facts taken out: a line on the photo or headline that
// claims something new goes back to the fallback's, a sentence that does is dropped.
function guarded(next, fallback, ctx) {
  const problems = factProblems(next, ctx);
  if (!problems.length) return next;
  const out = { ...next };
  for (const f of ["overlay", "headline", "kicker"]) if (problems.some((p) => p.field === f)) out[f] = fallback[f] || "";
  out.primary_text = withoutProblems(next.primary_text, problems) || fallback.primary_text;
  return out;
}

// What the fact check said about a set, for asking the writer to fix it.
function setProblems(ads, ctx) {
  return ads
    .map((a) => ({ a, problems: factProblems(a, ctx) }))
    .filter((x) => x.problems.length)
    .map(({ a, problems }) => `ad ${a.version}: ${[...new Set(problems.map((p) => p.why))].join("; ")}`)
    .join(". ");
}

// A set written by the model, checked, fixed once if needed, and laid over the built-in
// writer's set (used for anything the model left out or got wrong). Returns { ads, reply }.
async function writtenSet(ctx, built, { count, brief = "", keep = [], extra = "" } = {}) {
  const guardCtx = { listing: ctx.listing, photos: ctx.photos, extra, oldPrice: ctx.extra?.oldPrice };
  let r = await writeSetAI({ ...ctx, count, brief, keep });
  if (r && r.ads.length) {
    const fix = setProblems(r.ads, guardCtx);
    if (fix) {
      const again = await writeSetAI({ ...ctx, count, brief, keep, fix });
      if (again && again.ads.length >= r.ads.length && setProblems(again.ads, guardCtx).length <= fix.length) r = again;
    }
  }
  if (!r || !r.ads.length) return { ads: built, reply: null };
  const ads = built.map((b, i) => {
    const a = r.ads.find((x) => x.version === b.version) || r.ads[i];
    return a ? { ...b, ...guarded({ ...b, ...normalizeAI(a, ctx.photos, b) }, b, guardCtx), version: b.version } : b;
  });
  return { ads, reply: r.reply ? polishChat(r.reply) : null };
}

// How many ads the agent asked for in so many words ("just one ad", "two ads"), else null.
function countFrom(text) {
  const m = String(text || "").toLowerCase().match(/\b(one|single|1|two|2|three|3|four|4|five|5)\s+(new\s+|more\s+|different\s+)?(ad|ads|version|versions|options?)\b/);
  if (!m) return null;
  return { one: 1, single: 1, 1: 1, two: 2, 2: 2, three: 3, 3: 3, four: 4, 4: 4, five: 5, 5: 5 }[m[1]];
}

async function saveAd(ws, listing, moment, version, ad, existing) {
  const now = nowIso();
  if (existing) {
    await run(
      `UPDATE ads SET name = ?, pattern = ?, headline = ?, primary_text = ?, overlay = ?, kicker = ?, cta = ?, photo_id = ?, style = ?, revision = revision + 1, updated_at = ? WHERE id = ?`,
      [ad.name || existing.name || null, ad.pattern || existing.pattern, ad.headline, ad.primary_text, ad.overlay, ad.kicker || "", ad.cta || existing.cta, ad.photo_id || null, JSON.stringify(ad.style || existing.style || {}), now, existing.id]
    );
    return existing.id;
  }
  const id = randomUUID();
  await run(
    `INSERT INTO ads (id, workspace_id, listing_id, version, moment, name, pattern, headline, primary_text, overlay, kicker, cta, photo_id, style, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, ws.id, listing.id, version, moment, ad.name || null, ad.pattern, ad.headline, ad.primary_text, ad.overlay, ad.kicker || "", ad.cta || "Learn more", ad.photo_id || null, JSON.stringify(ad.style || {}), now, now]
  );
  return id;
}

// Rewrites the ads a listing has, keeping each one's idea and name, for new facts, a new price
// or an open house. The model does it when it can; the built-in writer otherwise.
async function rewriteAds(ws, listing, ads, photos, why, extra = {}) {
  const ctx = { listing, photos, brand: ws.brand, moment: listing.moment, extra };
  const built = ads.map((ad) => ({ ...ad, ...applyOverrides(writeVersion(ad.pattern, ctx, { ...ad.style, photoId: ad.photo_id }), ad.style), name: ad.name, version: ad.version }));
  const brief = `Rewrite these ${ads.length} ads, same numbers, keeping each one's idea and name, with ${why} worked in:\n${ads.map((a) => `${a.version} "${a.name || ""}": ${a.overlay} / ${a.headline} / ${a.primary_text}`).join("\n")}`;
  const { ads: next } = aiEnabled ? await writtenSet(ctx, built, { count: ads.length, brief }) : { ads: built };
  for (const ad of ads) {
    const n = next.find((x) => x.version === ad.version);
    if (n) await saveAd(ws, listing, listing.moment, ad.version, { ...ad, ...n, style: ad.style, photo_id: ad.photo_id }, ad);
  }
}

// A new set of ads for a listing: count of them (3 unless the agent asked otherwise), each its
// own idea. brief is what the agent asked for, if anything.
export async function makeAds(ws, listing, moment = "new", extra = {}, { note = null, aiSet = null, count = null, brief = "" } = {}) {
  const existing = await all(`SELECT * FROM ads WHERE listing_id = ? AND moment = ? ORDER BY version`, [listing.id, moment]);
  const want = Math.max(1, Math.min(MAX_ADS, count || (aiSet?.ads?.length) || 3));
  // On the free plan a new set is new ads, even when it replaces the old ones, so it needs free
  // ads left. Changes to existing ads stay included (they go through the chat, not here).
  const room = isPaid(ws) ? want : Math.min(want, FREE_AD_LIMIT - (await adsMade(ws.id)));
  if (room < 1) {
    // On the free plan a new price or open house can't bring more ads, but the ones it has
    // still get the new facts: changes to those are included.
    const current = await currentAds(listing);
    if (current.length && (moment === "price" || moment === "open_house")) {
      const photos = await loadPhotos(listing.id, aiEnabled);
      await rewriteAds(ws, listing, current, photos, moment === "price" ? "the new price" : "the open house", extra);
      await say(ws, listing.id, `I've put the ${moment === "price" ? "new price" : "open house"} into your ads. A separate set of ${moment === "price" ? "price" : "open house"} ads would be new ads, and that's the paid plan.`, "text", { snapshot: await snapshot(listing) });
    }
    // Asking again doesn't stack the same message; the app shows a short note instead.
    const last = await get(`SELECT kind FROM messages WHERE listing_id = ? ORDER BY created_at DESC LIMIT 1`, [listing.id]);
    if (last && last.kind === "upgrade") return { upgrade: true, repeat: true, reason: "limit" };
    if (!current.length) {
      const used = await get(`SELECT l.title, l.address, l.area, l.city, l.untitled_no FROM ads JOIN listings l ON l.id = ads.listing_id WHERE ads.workspace_id = ? AND l.id != ? ORDER BY ads.created_at LIMIT 1`, [ws.id, listing.id]);
      // Two listings can share a name; "your ads went on Miami" reads wrong on a listing called Miami.
      const usedOn = used && listingTitle(used);
      const here = listingTitle(listing);
      await say(ws, listing.id, upgradeText("saved", { usedOn: usedOn && usedOn !== here ? usedOn : usedOn ? `your other ${usedOn} listing` : null }), "upgrade", { reason: "limit" });
    } else {
      await say(ws, listing.id, upgradeText("limit"), "upgrade", { reason: "limit" });
    }
    return { upgrade: true };
  }
  const photos = await loadPhotos(listing.id, aiEnabled);
  const ctx = { listing, photos, brand: ws.brand, moment, extra };
  const built = writeSet(ctx, { count: room });
  // The model writes them (Claude or Groq), checked against the facts; the built-in writer
  // only fills in when it can't. Until 2026-10-25 Groq's sets were thrown away for inventing
  // details, which left every listing with the same three template ads.
  let set = built;
  let reply = null;
  if (aiSet?.ads?.length) {
    const guardCtx = { listing, photos, extra: brief, oldPrice: extra.oldPrice };
    set = built.map((b, i) => {
      const a = aiSet.ads[i];
      return a ? { ...b, ...guarded({ ...b, ...normalizeAI(a, photos, b) }, b, guardCtx), version: b.version } : b;
    });
  } else if (aiEnabled) {
    ({ ads: set, reply } = await writtenSet(ctx, built, { count: room, brief, extra: brief }));
  }
  // Paid: a new set replaces the old ads in place, so their links (and the leads they bring)
  // carry on. Free: the old ones go and still count, so a new set uses up free ads like any.
  const reuse = isPaid(ws);
  if (!reuse && existing.length) await removeAds(ws, listing, existing);
  for (const ad of set) {
    await saveAd(ws, listing, moment, ad.version, { ...ad, style: {} }, reuse ? existing.find((e) => e.version === ad.version) : null);
  }
  // A smaller set than before: the extra ones go (and still count as made).
  const extraOld = reuse ? existing.filter((e) => e.version > set.length) : [];
  if (extraOld.length) await removeAds(ws, listing, extraOld);
  if (room < want && !note) note = `That's ${room} of the ${want}: your free ads are used up after ${room === 1 ? "this one" : "these"}.`;
  await patchListing(ws.id, listing.id, { moment });
  await clearActions(listing.id);
  const body = [reply || introFor(moment, listing, set), note].filter(Boolean).join(" ");
  await say(ws, listing.id, body, "ads", { moment, snapshot: await snapshot(listing) }, true);

  // The agent's own description gets the same fair housing check as Hopkins' copy.
  if (moment === "new" && listing.description) {
    const issues = checkWording(listing.description);
    if (issues.length) {
      await say(ws, listing.id, "One thing from your description, so it doesn't end up in an ad: " +
        issues.map((i) => `"${i.term}" ${i.why}${i.suggestion ? `, try "${i.suggestion}"` : ""}`).join("; ") + ". I've left it out of the ads.", "check", { issues });
    }
  }
  return { upgrade: false };
}

// ---------- the chat ----------

// The ads a reply is about, by name: "**Wraparound porch**", "Both ads", "All three ads".
const NUMBER_WORDS = { 2: "two", 3: "three", 4: "four", 5: "five" };
function VERSION_WORD(vs, ads = []) {
  if (vs.length > 1 && ads.length && vs.length === ads.length) return vs.length === 2 ? "Both ads" : `All ${NUMBER_WORDS[vs.length] || vs.length} ads`;
  return NAMES(vs.map((v) => ({ version: v })));
}

// Takes ads out of a listing. They still count as made on the free plan. The ones left are
// numbered again from 1, so the tabs never read "Ad 1, Ad 3"; leads follow the ad, not its
// number. Returns what moved, as [old, new] pairs.
async function removeAds(ws, listing, gone) {
  if (!gone.length) return [];
  await run(`UPDATE workspaces SET ads_removed = ads_removed + ? WHERE id = ?`, [gone.length, ws.id]);
  for (const a of gone) await run(`DELETE FROM ads WHERE id = ? AND workspace_id = ?`, [a.id, ws.id]);
  const moved = [];
  for (const moment of [...new Set(gone.map((a) => a.moment))]) {
    const left = await all(`SELECT id, version FROM ads WHERE listing_id = ? AND moment = ? ORDER BY version`, [listing.id, moment]);
    for (const [i, a] of left.entries()) {
      if (a.version === i + 1) continue;
      await run(`UPDATE ads SET version = ? WHERE id = ?`, [i + 1, a.id]);
      moved.push([a.version, i + 1]);
    }
  }
  return moved;
}

// More ads, or fewer, from the chat.
async function changeSet(ws, listing, ads, photos, r, text) {
  const reply = plainWords(r.reply);
  if (r.action === "remove_ads") {
    const gone = ads.filter((a) => r.remove.includes(a.version) || (!r.remove.length && a.version === r.version));
    if (!gone.length) { await say(ws, listing.id, reply || "Which one should go?"); return {}; }
    const moved = await removeAds(ws, listing, gone);
    const left = ads.filter((a) => !gone.includes(a));
    const renumbered = moved.length ? ` ${moved.map(([from, to]) => `What was Ad ${from} is now Ad ${to}`).join(", ")}.` : "";
    // The model's reply was written before the numbers moved, so Hopkins says it plainly.
    await say(ws, listing.id, `Removed ${VERSION_WORD(gone.map((a) => a.version), gone)}.${renumbered}${left.length ? "" : " Tell me what to make instead whenever you like."}`);
    return { focus: left.length ? 1 : undefined };
  }
  // add_ads
  const from = Math.max(0, ...ads.map((a) => a.version)) + 1;
  const asked = countFrom(text) || Math.max(1, r.ads.filter((a) => !ads.some((x) => x.version === a.version)).length);
  const n = Math.min(asked, MAX_ADS - ads.length);
  if (n < 1) {
    await say(ws, listing.id, `This listing has ${ads.length} ads, the most at once. Tell me which one to swap and what for, and I'll turn it into the new idea.`);
    return {};
  }
  if (!(await canMake(ws, n))) {
    const last = await get(`SELECT kind FROM messages WHERE listing_id = ? ORDER BY created_at DESC LIMIT 1`, [listing.id]);
    if (last && last.kind === "upgrade") return { upgrade: true, repeat: true };
    await say(ws, listing.id, `${upgradeText("limit")} You can still turn any of these into a different idea, that's included.`, "upgrade", { reason: "limit" });
    return { upgrade: true };
  }
  const ctx = { listing, photos, brand: ws.brand, moment: listing.moment || "new" };
  const built = writeSet(ctx, { count: n, from });
  const fresh = r.ads.filter((a) => !ads.some((x) => x.version === a.version)).slice(0, n);
  let set;
  let note = null;
  if (fresh.length === n) {
    const guardCtx = { listing, photos, extra: text };
    set = built.map((b, i) => ({ ...b, ...guarded({ ...b, ...normalizeAI(fresh[i], photos, b) }, b, guardCtx), version: b.version }));
  } else {
    ({ ads: set, reply: note } = await writtenSet(ctx, built, { count: n, brief: text, keep: ads, extra: text }));
  }
  for (const ad of set) await saveAd(ws, listing, listing.moment || "new", ad.version, { ...ad, style: {} }, null);
  const added = set.map((a) => a.version);
  await say(ws, listing.id, (fresh.length === n && reply) || note || `Added ${VERSION_WORD(added, set)}.`, "text", { snapshot: await snapshot(listing, added) });
  return { focus: added[0] };
}

export async function handleMessage(ws, listingId, text, selected = 1) {
  const listing = await loadListing(ws.id, listingId);
  if (!listing) return null;
  await postMessage(ws.id, listingId, "agent", "text", text);
  const ads = await currentAds(listing);
  const photos = await loadPhotos(listing.id, aiEnabled);

  if (aiEnabled) {
    const history = await all(`SELECT role, body, data FROM messages WHERE listing_id = ? ORDER BY created_at`, [listingId]);
    const plan = { paid: isPaid(ws), adsMade: await adsMade(ws.id), limit: FREE_AD_LIMIT };
    const r = await chatTurnAI({ listing, photos, brand: ws.brand, ads, history, selectedVersion: selected, plan, agentName: ws.brand.agent_name });
    if (r) return applyAI(ws, listing, ads, photos, r, text);
    if (takeFailure() === "busy" && needsModel(text)) {
      await say(ws, listing.id, BUSY, "text", { busy: true });
      return {};
    }
  }
  return applyRules(ws, listing, ads, photos, text, selected);
}

// The model's facts, kept only where they're real values and actually different.
function patchFrom(listing, lp) {
  const patch = {};
  if (!lp) return patch;
  for (const k of LISTING_FIELDS) {
    let v = lp[k];
    if (["price", "beds", "baths", "sqft"].includes(k)) v = Number(v) || 0;
    if (v && !(typeof v === "number" && v <= 0) && v !== listing[k]) patch[k] = v;
  }
  const features = Array.isArray(lp.features) ? lp.features.filter((k) => FEATURES.some((f) => f.key === k)) : [];
  if (features.length && features.sort().join() !== [...(listing.features || [])].sort().join()) patch.features = [...new Set(features)];
  return patch;
}

// The words agents use, whatever the model says: it's "the line on the photo", not an overlay.
const plainWords = (s, clean = polishChat) => clean(String(s || "").replace(/\b(the |an |a )?overlay( text| line)?\b/gi, (m, art) => `${art ? (/^the/i.test(art) ? "the " : "a ") : ""}line on the photo`).replace(/(^|[.!?]\s+)(the |a )?line on the photo/g, (m, start, art) => `${start}${art ? art[0].toUpperCase() + art.slice(1) : "L"}${art ? "line" : "ine"} on the photo`));

async function applyAI(ws, listing, ads, photos, r, text) {
  const reply = plainWords(r.reply);
  const patch = patchFrom(listing, r.listing_patch);
  // New facts the feature list has no name for ("it has solar panels") are kept in the agent's
  // own words, so every later rewrite still knows them.
  if (r.action === "update_listing" && text) patch.description = [listing.description, text].filter(Boolean).join("\n");
  const focus = r.version || undefined;

  if (r.action === "run") {
    // On the free plan the upgrade message says it all; a "sure, here's the plan" first would contradict it.
    if (reply && isPaid(ws)) await say(ws, listing.id, reply);
    return proposeRun(ws, listing, { versions: r.version ? [r.version] : undefined, budget: r.budget || undefined, days: r.days || undefined });
  }
  if (r.action === "new_moment" && r.moment !== "none") {
    const oldPrice = listing.price;
    if (r.moment === "sold") patch.status = "sold";
    await patchListing(ws.id, listing.id, patch);
    const out = await makeAds(ws, await loadListing(ws.id, listing.id), r.moment, { oldPrice }, { count: ads.length || 3 });
    return { ...out, focus };
  }
  if (r.action === "make_ads") {
    if (Object.keys(patch).length) await patchListing(ws.id, listing.id, patch);
    // makeAds writes its own message (the ads, or the upgrade note), so the model's
    // "making them now" isn't posted on top of it.
    return makeAds(ws, await loadListing(ws.id, listing.id), listing.moment || "new", {}, { count: countFrom(text), brief: text });
  }
  if (r.action === "add_ads" || r.action === "remove_ads") return changeSet(ws, listing, ads, photos, r, text);

  if (Object.keys(patch).length) await patchListing(ws.id, listing.id, patch);
  const changed = [];
  // The model's look changes are checked against the message itself: only the versions it
  // names, colours in the part the agent named them for, and nothing that wouldn't read.
  // When any of that overrides the model, its reply may describe the wrong thing, so Hopkins
  // says what actually changed instead.
  const named = r.action === "revise" ? namedVersions(text, ads) : null;
  const ruled = text ? readStyle(text.toLowerCase()) : null;
  const ruledColours = ruled && !ruled.vague ? Object.fromEntries(["bg", "accent", "text"].filter((k) => ruled.style[k]).map((k) => [k, ruled.style[k]])) : {};
  let overrode = false;
  const unreadable = {};
  for (const a of r.ads || []) {
    const ad = ads.find((x) => x.version === a.version);
    if (!ad) continue;
    if (named && !named.includes(ad.version)) { overrode = true; continue; }
    const next = guarded({ ...ad, ...normalizeAI(a, photos, ad, text) }, ad, { listing: { ...listing, ...patch }, photos, extra: text });
    const wanted = modelStyle(a.style, text, { filter: false });
    const look = modelStyle(a.style, text);
    for (const k of ["bg", "accent", "text"]) {
      if (ruledColours[k] && look[k] !== ruledColours[k]) look[k] = ruledColours[k];
      else if (!ruledColours[k] && look[k] && Object.values(ruledColours).includes(look[k])) delete look[k];
    }
    const { changes: safe, dropped } = keepReadable(look, ad.style, ws.brand?.primary);
    if (dropped.length) unreadable[ad.version] = dropped.map((k) => [k, look[k]]);
    next.style = mergeStyle(ad.style || {}, safe);
    // Anything the model asked for that didn't go through means its reply may be wrong.
    if (Object.entries(wanted).some(([k, v]) => v !== (ad.style || {})[k] && next.style[k] !== v)) overrode = true;
    if (Object.keys(look).some((k) => look[k] !== wanted[k])) overrode = true;
    await saveAd(ws, listing, listing.moment, ad.version, { ...ad, ...next }, ad);
    changed.push(ad.version);
  }
  // A version the agent named for a new look that the model left out still gets it.
  const ruledLook = ruled && !ruled.vague && (Object.keys(ruled.style).length || ruled.sizeStep);
  if (named && ruledLook) {
    const missing = named.filter((v) => !changed.includes(v) && ads.some((x) => x.version === v));
    if (missing.length) {
      for (const v of missing) {
        const { dropped } = keepReadable(cleanStyle(ruled.style), ads.find((x) => x.version === v).style, ws.brand?.primary);
        if (dropped.length) unreadable[v] = dropped.map((k) => [k, ruled.style[k]]);
      }
      await restyle(ws, listing, missing, ruled.style, ruled.sizeStep, { readable: true });
      changed.push(...missing);
      changed.sort();
      overrode = true;
    }
  }
  const copyChanged = (r.ads || []).some((a) => {
    const ad = ads.find((x) => x.version === a.version);
    return ad && (!named || named.includes(ad.version)) && ["headline", "primary_text", "overlay"].some((k) => a[k] && polish(cleanWording(String(a[k]))) !== ad[k]);
  });
  let lookReply = null;
  if ((overrode || Object.keys(unreadable).length) && changed.length && !copyChanged) {
    const after = await currentAds(listing);
    lookReply = sayChanges(changed.map((v) => ({ version: v, before: ads.find((x) => x.version === v)?.style, after: after.find((x) => x.version === v)?.style })), unreadable, ws.brand?.primary, ads) || null;
  }
  // New facts with no rewritten copy from the model: rewrite the ads so they carry them.
  let rewroteAll = false;
  if (r.action === "update_listing" && !changed.length && ads.length && Object.keys(patch).length) {
    rewroteAll = true;
    await rewriteAds(ws, await loadListing(ws.id, listing.id), ads, photos, `the new facts (${text})`);
  }
  const suggestion = plainWords(r.suggestion, polish).replace(/\.$/, "");
  const data = {};
  if (suggestion && !/\b(upgrade|paid plan|pay)\b/i.test(suggestion)) data.suggestion = suggestion;
  if (changed.length || rewroteAll) data.snapshot = await snapshot(listing, rewroteAll ? null : changed);
  await say(ws, listing.id, lookReply || reply || (changed.length ? `${VERSION_WORD(changed, ads)} updated.` : "Okay."), "text", Object.keys(data).length ? data : null);
  return { focus: changed.length === 1 ? changed[0] : focus };
}

const WHY = {
  life: "sells the life the home gives, the way one buyer would live it",
  feature: "puts one standout detail first, with the photo that shows it",
  facts: "gives the price and the numbers up front, for buyers who are already looking",
};

// The first reply that isn't word for word what Hopkins said last, so it never repeats itself.
async function fresh(listingId, options) {
  const last = await get(`SELECT body FROM messages WHERE listing_id = ? AND role = 'hopkins' ORDER BY created_at DESC LIMIT 1`, [listingId]);
  return options.find((o) => o && o !== last?.body) || options[options.length - 1];
}

async function applyRules(ws, listing, ads, photos, text, selected) {
  const intent = readIntent(text, { selected, photos, ads });
  const sorted = [...photos].sort((a, b) => a.position - b.position);
  const v = intent.versions.length === 1 ? intent.versions[0] : selected;
  const ad = ads.find((a) => a.version === v);
  const first = (ws.brand.agent_name || "").split(" ")[0];

  if (intent.kind === "run") return proposeRun(ws, listing, { versions: intent.versions, budget: intent.budget, days: intent.days });

  if (intent.kind === "remove" && ads.length) return changeSet(ws, listing, ads, photos, { action: "remove_ads", remove: intent.versions, ads: [], reply: "" }, text);
  if (intent.kind === "add") return changeSet(ws, listing, ads, photos, { action: "add_ads", remove: [], ads: [], reply: "" }, text);

  if (intent.kind === "greeting") {
    const where = ads.length
      ? `Your ${ads.length === 1 ? "ad is" : `${ads.length} ads are`} ready. Want a change, or shall I set ${ads.length === 1 ? "it" : "them"} up to run?`
      : `Send me the price and the best thing about the home and I'll make the ads.`;
    await say(ws, listing.id, await fresh(listing.id, [`Hi${first ? ` ${first}` : ""}. ${where}`, where]));
    return {};
  }

  if (intent.kind === "select" && ads.length) {
    const called = VERSION_WORD([v], ads);
    await say(ws, listing.id, await fresh(listing.id, [
      `${called}. What would you like changed on it?`,
      `On ${called.replace(/^Ad /, "ad ")} now. Tell me what to change, like "shorter" or "use the kitchen photo".`,
    ]));
    return { focus: v };
  }

  if (intent.kind === "make" || (intent.kind === "select" && !ads.length)) {
    return makeAds(ws, listing, listing.moment || "new");
  }

  if (intent.kind === "question") {
    const answers = {
      plan: `The free plan makes up to 3 ads as previews. ${upgradeText("plan")}`,
      which: ads.length
        ? "Nobody knows yet, me included. That's why they're different ideas: they run side by side with the same budget, and the one that brings leads cheapest gets the rest. You'll see it in Monday's report."
        : "Once the ads are made, the test decides. They run side by side and the cheapest leads win.",
      why: ad && WHY[ad.pattern]
        ? `${VERSION_WORD([v], ads)} ${WHY[ad.pattern]}. The ads are different ideas on purpose, so the test teaches you something.`
        : "Each ad takes a different idea about the home, so the test shows which one buyers answer.",
      download: isPaid(ws)
        ? "Yes. Tap the ··· menu at the top of the listing to download the version you're on as a feed or story image, or copy its text."
        : "Yes. Tap the ··· menu at the top of the listing, or Download under the ad, for the feed or story image, or copy its text.",
      results: "Leads land in Leads the moment someone fills in the form, and every Monday you get a report: what ran, what it cost, and which version won. No numbers until ads have actually run.",
      help: ads.length
        ? `Tell me what to change on any version in plain words, like "make 2 warmer" or "use photo 3", and I'll do it. When you're happy, say run it.`
        : "Send me a listing, a link, the details or photos, and I'll make ads to test against each other.",
      other: null,
    };
    const answer = answers[intent.topic];
    if (answer) {
      await say(ws, listing.id, await fresh(listing.id, [answer, answer]));
      return { focus: intent.topic === "why" && ad ? v : undefined };
    }
  }

  if (intent.kind === "moment") {
    const oldPrice = listing.price;
    const patch = { ...intent.listingPatch };
    if (intent.moment === "sold") patch.status = "sold";
    await patchListing(ws.id, listing.id, patch);
    return makeAds(ws, await loadListing(ws.id, listing.id), intent.moment, { oldPrice });
  }

  if (!ads.length) {
    await say(ws, listing.id, "There are no ads on this listing yet. Tell me the price and the best thing about the home and I'll make them.");
    return {};
  }

  if (intent.kind === "update_listing") {
    const patch = { ...intent.listingPatch };
    if (patch.addFeatures) {
      patch.features = [...new Set([...(listing.features || []), ...patch.addFeatures])];
      delete patch.addFeatures;
    }
    await patchListing(ws.id, listing.id, patch);
    const fresh = await loadListing(ws.id, listing.id);
    const ctx = { listing: fresh, photos, brand: ws.brand, moment: fresh.moment };
    for (const ad of ads) {
      const next = writeVersion(ad.pattern, ctx, { ...ad.style, photoId: ad.photo_id });
      await saveAd(ws, fresh, fresh.moment, ad.version, { ...ad, ...applyOverrides(next, ad.style) }, ad);
    }
    const added = (patch.features || []).filter((k) => !(listing.features || []).includes(k)).map((k) => FEATURES.find((f) => f.key === k)?.name).filter(Boolean);
    await say(ws, listing.id, added.length ? `Got it, ${added.join(" and ")}. I've rewritten the ads with that in.` : "Got it. I've updated the listing and the ads.", "text", { snapshot: await snapshot(listing) });
    return {};
  }

  if (intent.kind === "revise") {
    const c = intent.changes;
    if (c.photoMissing) {
      await say(ws, listing.id, `I don't see ${/^(photo|that photo)/.test(c.photoMissing) ? c.photoMissing : `a ${c.photoMissing} photo`} on this listing. Drop it in here and I'll use it.`);
      return {};
    }
    const done = [];
    for (const v of intent.versions) {
      const ad = ads.find((a) => a.version === v);
      if (!ad) continue;
      const style = { ...ad.style };
      let photoId = ad.photo_id;
      if (c.photoId) photoId = c.photoId;
      if (c.nextPhoto && sorted.length > 1) {
        const i = sorted.findIndex((p) => p.id === ad.photo_id);
        photoId = sorted[(i + 1) % sorted.length].id;
      }
      if (c.length) style.length = c.length;
      if (c.voice) style.voice = c.voice;
      if (c.angle) { style.angle = (style.angle || 0) + 1; delete style.headline; delete style.overlay; }
      if (c.headline) style.headline = c.headline;
      if (c.overlay) style.overlay = c.overlay;
      const ctx = { listing, photos, brand: ws.brand, moment: listing.moment };
      const next = writeVersion(ad.pattern, ctx, { ...style, photoId });
      await saveAd(ws, listing, listing.moment, v, { ...ad, ...applyOverrides(next, style), style, photo_id: photoId }, ad);
      done.push(v);
    }
    const what = c.headline ? "has the new headline" : c.overlay ? "has the new line on the image" : c.photoId || c.nextPhoto ? "has the new photo"
      : c.length === "short" ? "is shorter" : c.length === "long" ? "has more detail" : c.voice === "warm" ? "sounds warmer"
      : c.voice === "premium" ? "reads more premium" : c.voice === "plain" ? "is plainer" : "has a new angle";
    const flagged = [c.headline, c.overlay].filter(Boolean).flatMap((s) => checkWording(s));
    let reply = `${VERSION_WORD(done, ads)} ${done.length > 1 ? what.replace(/^is /, "are ").replace(/^has /, "have ").replace(/^sounds /, "sound ").replace(/^reads /, "read ") : what}.`;
    if (flagged.length) reply += ` One flag: "${flagged[0].term}" ${flagged[0].why}, so I changed it${flagged[0].suggestion ? ` to "${flagged[0].suggestion}"` : ""}.`;
    await say(ws, listing.id, reply, "text", done.length ? { snapshot: await snapshot(listing, done) } : null);
    return {};
  }

  if (intent.kind === "style_ask") {
    await say(ws, listing.id, await fresh(listing.id, [
      `Sure. Tell me what you'd like, for example **"navy background"**, **"gold label"**, **"serif font"**, **"text at the top"**, **"bigger text"** or **"photo in a frame"**. Say "all three" to change every version.`,
      `What should it look like? A colour name or a hex code works, and so does a font, a layout or a text size.`,
    ]));
    return {};
  }

  if (intent.kind === "style") {
    const done = await restyle(ws, listing, intent.versions, intent.style, intent.sizeStep, { readable: true });
    const first = ads.find((a) => done.includes(a.version));
    const { changes: kept, dropped } = keepReadable(cleanStyle(intent.style), first?.style, ws.brand?.primary);
    const bg = first?.style?.bg || ws.brand?.primary || "#1F2A36";
    const why = dropped.length ? `I left the ${dropped.map((d) => (d === "text" ? "text" : "label")).join(" and ")} colour as it was, because ${dropped.map((d) => colourName(intent.style[d])).join(" and ")} wouldn't be readable on ${colourName(bg)}. A ${contrast(bg, "#FFFFFF") > contrast(bg, "#000000") ? "lighter" : "darker"} one will work.` : "";
    const changedAny = Object.keys(kept).length || intent.sizeStep;
    const reply = [changedAny ? `${VERSION_WORD(done, ads)} ${done.length > 1 ? "now have" : "now has"} ${sayLook(kept, intent.sizeStep)}.` : "", why].filter(Boolean).join(" ");
    await say(ws, listing.id, reply, "text", { snapshot: await snapshot(listing, done) });
    return { focus: done.length === 1 ? done[0] : undefined };
  }

  if (intent.kind === "fair_housing") {
    const issues = ads.flatMap((a) => checkWording(`${a.headline} ${a.overlay} ${a.primary_text}`));
    await say(ws, listing.id, issues.length
      ? `I found ${issues.length} wording ${issues.length === 1 ? "issue" : "issues"}: ${issues.map((i) => `"${i.term}" (${i.why})`).join(", ")}.`
      : "I checked all three against the fair housing wording rules and found nothing. They also run in Meta's Housing category, so there's no age, gender or ZIP code targeting. This is a wording check, not legal advice.");
    return {};
  }

  if (intent.kind === "thanks") {
    await say(ws, listing.id, await fresh(listing.id, ["When you're happy with them, say run it and I'll show you the plan first.", "Any time."]));
    return {};
  }

  await say(ws, listing.id, await fresh(listing.id, [
    `I didn't follow that one. Is it a change to version ${selected}? Say it plainly, like "shorter", "warmer" or "use photo 2".`,
    `Still not with you, sorry. Try one change at a time, like "new headline: Morning light" or "version 3, use the kitchen photo".`,
  ]));
  return {};
}

// Custom lines the agent typed stay put when the rest of the ad is rewritten.
function applyOverrides(ad, style = {}) {
  const out = { ...ad };
  if (style.headline) out.headline = polish(cleanWording(style.headline));
  if (style.overlay) out.overlay = polish(cleanWording(style.overlay));
  return out;
}

// ---------- running ----------

export async function proposeRun(ws, listing, { versions = [1, 2, 3, 4, 5], budget, days } = {}) {
  if (!isPaid(ws)) {
    // Said once. Asking again opens the plan card in the app instead of the same note again.
    const last = await get(`SELECT kind FROM messages WHERE listing_id = ? AND role = 'hopkins' ORDER BY created_at DESC LIMIT 1`, [listing.id]);
    if (last && last.kind === "upgrade") return { upgrade: true, repeat: true, reason: "run" };
    await say(ws, listing.id, upgradeText("run"), "upgrade", { reason: "run" });
    return { upgrade: true };
  }
  const ads = (await currentAds(listing)).filter((a) => versions.includes(a.version));
  if (!ads.length) {
    await say(ws, listing.id, "There's nothing to run yet. Send me the listing details and I'll make the ads first.");
    return {};
  }
  const plan = {
    versions: ads.map((a) => a.version),
    budget: Math.max(20, Math.round(Number(budget) || DEFAULT_BUDGET)),
    days: Math.min(60, Math.max(3, Math.round(Number(days) || DEFAULT_DAYS))),
    radius: 15,
    audience: audienceFor(listing),
  };
  plan.perDay = Math.round((plan.budget / plan.days) * 100) / 100;
  await clearActions(listing.id);
  const split = plan.versions.length > 1 ? `, split evenly across the ${plan.versions.length} ads so the test is fair` : "";
  await say(ws, listing.id, `Here's the plan: $${plan.budget} over ${plan.days} days${split}. Say yes and I'll set it up.`, "plan", plan, true);
  return { plan };
}

export async function confirmRun(ws, listingId, messageId) {
  const listing = await loadListing(ws.id, listingId);
  if (!listing) return null;
  if (!isPaid(ws)) {
    await say(ws, listingId, upgradeText("run"), "upgrade", { reason: "run" });
    return { upgrade: true };
  }
  const msg = await get(`SELECT * FROM messages WHERE id = ? AND listing_id = ? AND kind = 'plan'`, [messageId, listingId]);
  if (!msg) return null;
  const plan = safeJson(msg.data, null);
  const ads = (await currentAds(listing)).filter((a) => plan.versions.includes(a.version));
  const now = nowIso();
  await run(`INSERT INTO launches (id, workspace_id, listing_id, ad_ids, budget, days, radius_miles, created_at) VALUES (?,?,?,?,?,?,?,?)`,
    [randomUUID(), ws.id, listingId, JSON.stringify(ads.map((a) => a.id)), plan.budget, plan.days, plan.radius, now]);
  for (const ad of ads) {
    await run(`UPDATE ads SET status = 'approved', updated_at = ? WHERE id = ?`, [now, ad.id]);
    await run(
      `INSERT OR IGNORE INTO tests (id, workspace_id, listing_id, ad_id, home_type, city, price_band, pattern, moment, audience, started_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [randomUUID(), ws.id, listingId, ad.id, listing.home_type, listing.city, priceBand(listing.price), ad.pattern, ad.moment, JSON.stringify(plan.audience), now]
    );
  }
  await clearActions(listingId);
  await say(ws, listingId, `Approved. ${ads.length} ${ads.length === 1 ? "ad" : "ads"}, $${plan.budget} over ${plan.days} days. They go live as soon as your Meta ad account is connected, and billing starts then, not before. You don't have to wait: download them under the preview and post or boost them yourself. Each ad has its own link, so leads still land here and on the Leads page.`);
  notifyFounder("Hopkins: ads approved", `A workspace approved ${ads.length} ads ($${plan.budget} over ${plan.days} days). Waiting on Meta.`);
  return { ok: true };
}

// ---------- leads ----------

export async function addLead(listing, { name, email, phone, wants, note, adId, source }) {
  const ws = await getWorkspace(listing.workspace_id);
  const ad = adId ? await get(`SELECT id, version, name FROM ads WHERE id = ? AND listing_id = ?`, [adId, listing.id]) : null;
  const id = randomUUID();
  await run(
    `INSERT INTO leads (id, workspace_id, listing_id, ad_id, name, email, phone, wants, note, source, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [id, ws.id, listing.id, ad?.id || null, name, email || null, phone || null, wants, note || null, source || null, nowIso()]
  );
  if (ad) await run(`UPDATE tests SET leads = leads + 1 WHERE ad_id = ?`, [ad.id]);
  const what = wants === "showing" ? "wants a showing" : wants === "offer" ? "wants to talk about an offer" : "has a question";
  const contact = [phone, email].filter(Boolean).join(", ");
  await say(ws, listing.id, `New lead${ad ? ` from **Ad ${ad.version}**` : ""}: ${name} ${what}.${contact ? ` ${contact}.` : ""}${note ? ` They wrote: "${note}"` : ""} A quick reply is the best way to keep a lead warm.`, "lead", { leadId: id }, false);
  if (ws.brand.alerts_topic) notifyTopic(ws.brand.alerts_topic, `New lead · ${listing.address || "your listing"}`, `${name} ${what}. Open Hopkins to reply.`);
  return id;
}

// ---------- the Monday report ----------

export async function weeklyReport(ws, days = 7) {
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const leads = await all(
    `SELECT leads.*, listings.address, listings.area, ads.version, ads.pattern, ads.name AS ad_name FROM leads
     JOIN listings ON listings.id = leads.listing_id LEFT JOIN ads ON ads.id = leads.ad_id
     WHERE leads.workspace_id = ? AND leads.created_at >= ? ORDER BY leads.created_at DESC`,
    [ws.id, since]
  );
  const listings = await all(`SELECT id, title, address, area, city, untitled_no, price, status, spend, moment, created_at FROM listings WHERE workspace_id = ? ORDER BY created_at DESC`, [ws.id]);
  const launched = await all(`SELECT DISTINCT listing_id FROM launches WHERE workspace_id = ?`, [ws.id]);
  const launchedIds = new Set(launched.map((r) => r.listing_id));
  const drafts = await all(`SELECT DISTINCT listing_id FROM ads WHERE workspace_id = ? AND status = 'draft'`, [ws.id]);
  const draftIds = new Set(drafts.map((r) => r.listing_id));

  const rows = listings.map((l) => {
    const ls = leads.filter((x) => x.listing_id === l.id);
    const byVersion = {};
    for (const x of ls) if (x.version) byVersion[`Ad ${x.version}`] = (byVersion[`Ad ${x.version}`] || 0) + 1;
    const spend = Number(l.spend || 0);
    return {
      id: l.id, name: listingTitle(l), status: l.status, leads: ls.length,
      showings: ls.filter((x) => x.wants === "showing").length, spend, cpl: spend > 0 && ls.length ? Math.round((spend / ls.length) * 100) / 100 : null,
      byVersion, running: launchedIds.has(l.id), drafts: draftIds.has(l.id),
    };
  });
  const total = leads.length;
  const spend = rows.reduce((s, r) => s + r.spend, 0);
  const showings = leads.filter((x) => x.wants === "showing").length;

  const patterns = await all(`SELECT pattern, COUNT(*) AS ads, SUM(leads) AS leads FROM tests WHERE workspace_id = ? GROUP BY pattern`, [ws.id]);

  const next = [];
  for (const r of rows) {
    const top = Object.entries(r.byVersion).sort((a, b) => b[1] - a[1])[0];
    if (top && r.leads >= 3 && top[1] / r.leads >= 0.5) next.push(`${top[0]} on ${r.name} brought ${top[1]} of its ${r.leads} leads. Put the budget behind it.`);
    else if (r.running && r.leads === 0 && r.status === "active") next.push(`No leads yet on ${r.name}. Try another angle, or a price ad if the price moved.`);
    if (r.drafts && r.status === "active") next.push(`${r.name} has ${r.running ? "new " : ""}ads ready that aren't approved yet.`);
  }
  if (!listings.length) next.push("Send me your first listing: photos and the link or the description.");

  const headline = total
    ? `${total} ${total === 1 ? "lead" : "leads"}${spend > 0 ? `, $${Math.round((spend / total) * 100) / 100} each` : ""}${showings ? `, ${showings} asked for a showing` : ""}.`
    : "No leads this week.";
  return { since, days, headline, total, showings, spend, cpl: spend > 0 && total ? Math.round((spend / total) * 100) / 100 : null, listings: rows, leads: leads.slice(0, 20), patterns, next: next.slice(0, 5) };
}

// Hopkins messages first: on a Monday, the first time the app is opened, the report is
// already waiting as a message instead of a page the agent has to remember to open.
export async function mondayMessage(ws, now = new Date()) {
  if (now.getUTCDay() !== 1) return;
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
  const already = await get(`SELECT id FROM messages WHERE workspace_id = ? AND listing_id IS NULL AND kind = 'report' AND created_at >= ?`, [ws.id, startOfDay]);
  if (already) return;
  const hasListings = await get(`SELECT id FROM listings WHERE workspace_id = ? LIMIT 1`, [ws.id]);
  if (!hasListings) return;
  const r = await weeklyReport(ws);
  await say(ws, null, `Your Monday report. ${r.headline}${r.next[0] ? ` ${r.next[0]}` : ""}`, "report", { headline: r.headline }, false);
}

export async function inbox(ws) {
  await mondayMessage(ws);
  await numberUntitled(ws.id);
  const items = await all(
    `SELECT messages.*, listings.title, listings.address, listings.area, listings.city, listings.untitled_no FROM messages LEFT JOIN listings ON listings.id = messages.listing_id
     WHERE messages.workspace_id = ? AND (messages.needs_action = 1 OR (messages.kind IN ('lead','report') AND messages.created_at >= ?))
     ORDER BY messages.created_at DESC LIMIT 30`,
    [ws.id, new Date(Date.now() - 7 * 86400_000).toISOString()]
  );
  return items.map((m) => ({ ...m, data: safeJson(m.data, null) }));
}

export { MOMENTS, formatPrice };
