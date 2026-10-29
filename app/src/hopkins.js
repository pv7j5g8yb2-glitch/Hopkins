// Hopkins itself: what happens when a listing comes in, when the agent says something in
// the chat, when they say yes, and when a lead arrives. Routes in server.js stay thin and
// call these.

import { randomUUID, randomBytes } from "node:crypto";
import { run, get, all, nowIso } from "./db.js";
import { parseListingText, parseCurrency, readLink, downloadImage, formatPrice, priceBand, labelFromName, FEATURES } from "./listing.js";
import { writeSet, writeVersion, polish, polishChat, KINDS, KIND_NAMES, MAX_ADS, MOMENTS } from "./writer.js";
import { factProblems, withoutProblems } from "./facts.js";
import { checkWording, cleanWording, audienceFor } from "./fairhousing.js";
import { readIntent, readStyle, namedVersions, DESCRIBES } from "./rules.js";
import { cleanStyle, mergeStyle, sayLook, onlyAsked, keepReadable, colourName, contrast, STYLE_KEYS, COLOUR_WORDS } from "./style.js";
import { aiEnabled, provider, readLinkAI, readListingAI, seePhotosAI, writeSetAI, chatTurnAI, newChatAI, takeFailure, titleAI } from "./brain.js";

// When the model is over its limit, anything the rules can do still gets done; anything that
// needs real understanding gets an honest "give me a moment" instead of "I didn't follow".
const BUSY = "I'm receiving too many requests right now. Please try again in a few seconds.";
const needsModel = (text) => ["unknown", "question", "greeting", "thanks"].includes(readIntent(text).kind);
import { canMake, isPaid, upgradeText, adsMade, FREE_AD_LIMIT } from "./plans.js";
import { nameCase } from "./names.js";
import { notifyTopic, notifyFounder } from "./notify.js";

const LISTING_FIELDS = ["address", "city", "area", "price", "beds", "baths", "sqft", "home_type", "open_house", "currency", "deal"];
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
// The account's own numbers, in a few lines, for the chat: last week, this week so far, each
// listing, the ads that brought the most Leads. Hopkins once said "I can't see any past report or
// lead numbers" when asked how last week went (2026-10-28); the Report had them all along.
export async function accountSummary(ws, tz = "UTC") {
  const [last, now] = await Promise.all([weeklyReport(ws, weekRange(new Date(), tz, 1)), weeklyReport(ws, weekRange(new Date(), tz, 0))]);
  if (!now.listings.length) return "No listings yet, so no Leads or report yet.";
  const day = (iso) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: tz });
  const week = (r, label) => `${label} (${day(r.since)} to ${day(new Date(new Date(r.until).getTime() - 1).toISOString())}): ${r.total} ${r.total === 1 ? "Lead" : "Leads"}, ${r.showings} asked for a showing.`;
  const rows = now.listings.slice(0, 15).map((l) => {
    const prev = last.listings.find((x) => x.id === l.id);
    return `- ${l.name}: ${l.status === "sold" ? (l.deal === "rent" ? "rented" : "sold") : l.running ? "ads approved" : l.drafts ? "ads waiting for a yes" : "no ads yet"}; Leads: ${prev?.leads || 0} last week, ${l.leads} this week so far, ${l.allLeads} in all${l.spend > 0 ? `; spent $${l.spend} in all${l.cpl ? `, $${l.cpl} a Lead` : ""}` : ""}.`;
  });
  const top = last.topAds.length ? `Top ads last week: ${last.topAds.map((a) => `${a.name} on ${now.listings.find((l) => l.id === a.listing_id)?.name || "a listing"} (${a.leads})`).join("; ")}.` : "";
  return [week(last, "Last week"), week(now, "This week so far"), "Each listing:", ...rows, top, "Cost per Lead exists only per listing (all its spend over all its Leads); never give one for a week."].filter(Boolean).join("\n");
}

// A message with a home fact in it that reads like a question or a request ("what's 15% of
// $650,000?", "write a caption for a 3 bed"): the model decides whether it's a listing to make
// ads for. Returns the reply when it isn't, null when it is (or there's no model to ask).
const ASKING = /\?\s*$|^\s*(what|whats|what's|how|can|could|should|would|will|is|are|do|does|did|why|when|where|which|who|write|draft|help|tell|explain|calculate|compare|give me|show me|any)\b/i;
export async function answerIfNotListing(ws, history, text, tz = "UTC") {
  if (!aiEnabled || URL_RE.test(text) || !ASKING.test(text)) return null;
  const r = await newChatAI({ history, brand: ws.brand, plan: { paid: isPaid(ws), adsMade: await adsMade(ws.id), limit: FREE_AD_LIMIT }, agentName: ws.brand.agent_name, account: await accountSummary(ws, tz), decide: true });
  return r && !r.isListing && r.reply.trim() ? plainWords(r.reply) : null;
}

export async function newChat(ws, history, tz = "UTC") {
  const text = history.at(-1)?.body || "";
  const lastReply = [...history].reverse().find((m) => m.role === "hopkins")?.body;
  if (aiEnabled) {
    const reply = await newChatAI({ history, brand: ws.brand, plan: { paid: isPaid(ws), adsMade: await adsMade(ws.id), limit: FREE_AD_LIMIT }, agentName: ws.brand.agent_name, account: await accountSummary(ws, tz) });
    if (reply) return plainWords(reply);
    if (takeFailure() === "busy" && needsModel(text)) return BUSY;
  }
  const first = (ws.brand.agent_name || "").split(" ")[0];
  // How they did: the numbers themselves, even with no model.
  if (/\b(last week|this week|report|how (did|am|are|is) (i|we|it|things)|how many leads|my leads|results?|performance|how'?s it going)\b/i.test(text)) {
    const [last, now] = await Promise.all([weeklyReport(ws, weekRange(new Date(), tz, 1)), weeklyReport(ws, weekRange(new Date(), tz, 0))]);
    if (!now.listings.length) return "No listings yet, so there's no report. Send your first listing to get started.";
    const best = last.topAds[0];
    return `Last week: ${last.total} ${last.total === 1 ? "Lead" : "Leads"}, ${last.showings} asked for a showing. This week so far: ${now.total}.${best ? ` Your best ad last week was ${best.name} with ${best.leads}.` : ""} The full breakdown is on Report.`;
  }
  const intent = readIntent(text);
  // Said once; after that it isn't tacked onto every reply.
  const ask = lastReply?.includes("Send me a listing") ? "" : "Send me a listing: paste the link, add the photos, or tell me the address, price and what stands out.";
  const options =
    intent.kind === "greeting" ? [`Hi${first ? ` ${first}` : ""}. ${ask || "What are you working on?"}`, "Hi again. Paste a listing link or add the photos."]
    : intent.kind === "question" && intent.topic === "plan" ? [`The free plan makes 3 ads, yours to download. ${upgradeText("plan")}`]
    : intent.kind === "question" && intent.topic === "help" ? [`I make ads for each listing, each a different idea, so you can test them against each other. You change them with me here, and nothing runs without your approval. ${ask}`]
    : intent.kind === "thanks" ? ["Anytime."]
    : [`I need a listing to start. ${ask}`, `I couldn't find a listing in that. Paste the link or add the photos.`];
  return (options.map((o) => o.trim()).find((o) => o !== lastReply) || options[0]).trim();
}

// Names saved before every name got its capitals (2026-10-28): Leads, accounts and the agent's
// name on the brand. Runs at start, and does nothing once they're clean.
export async function capitaliseNames() {
  for (const t of ["leads", "users"]) {
    for (const r of await all(`SELECT id, name FROM ${t} WHERE name IS NOT NULL AND name != ''`)) {
      if (nameCase(r.name) !== r.name) await run(`UPDATE ${t} SET name = ? WHERE id = ?`, [nameCase(r.name), r.id]);
    }
  }
  for (const w of await all(`SELECT id, brand FROM workspaces`)) {
    const brand = safeJson(w.brand, {});
    if (brand.agent_name && nameCase(brand.agent_name) !== brand.agent_name) {
      await run(`UPDATE workspaces SET brand = ? WHERE id = ?`, [JSON.stringify({ ...brand, agent_name: nameCase(brand.agent_name) }), w.id]);
    }
  }
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
  const linkInfo = link ? await openLink(link) : null;
  const source = [rest, linkInfo?.title, linkInfo?.description].filter(Boolean).join("\n");

  const parsed = parseListingText(source);
  // The city comes from the listing or not at all. Filling it in from the agent's brand city
  // named a listing "Miami" from photos of somewhere else (2026-10-25).

  const id = randomUUID();
  const now = nowIso();
  const listing = { id, workspace_id: ws.id, address: null, city: null, area: null, price: null, currency: null, deal: null, beds: null, baths: null, sqft: null, home_type: null, open_house: null, ...parsed };
  listing.slug = slugFor(listing);
  await run(
    `INSERT INTO listings (id, workspace_id, slug, address, city, area, price, currency, deal, beds, baths, sqft, home_type, features, description, link, open_house, created_at, updated_at, seen_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, ws.id, listing.slug, listing.address, listing.city, listing.area, listing.price, listing.currency, listing.deal, listing.beds, listing.baths, listing.sqft, listing.home_type,
      JSON.stringify(listing.features || []), source || null, link, listing.open_house, now, now, now]
  );

  // Photos uploaded before the listing existed get attached now, in the order sent.
  for (const [i, pid] of photoIds.entries()) {
    const label = labelFromName(photoNames[pid] || "");
    await run(`UPDATE photos SET listing_id = ?, position = ?, label = COALESCE(label, ?) WHERE id = ? AND workspace_id = ?`, [id, i, label, pid, ws.id]);
  }

  // A link with no photos sent: the listing's own photos come from its page.
  if (!photoIds.length && linkInfo?.photos?.length) await importPhotos(ws, id, linkInfo.photos);

  for (const m of history) await postMessage(ws.id, id, m.role, "text", m.body);
  const shown = [rest, link].filter(Boolean).join("\n");
  // Photos sent on their own are just photos, with no made up words.
  await postMessage(ws.id, id, "agent", "text", shown, { first: true, ...(photoIds.length ? { photos: photoIds } : {}) });
  const missing = await readListing(ws, id, { rest, linkInfo, features: listing.features, look: true });

  await numberUntitled(ws.id);
  const fresh = await loadListing(ws.id, id);
  if (link && !linkInfo && !fresh.price && !rest) {
    await say(ws, id, LINK_BLOCKED(link));
    return fresh;
  }
  await makeAds(ws, fresh, "new", {}, { note: missing || (fresh.price ? null : fresh.deal === "rent" ? "What's the monthly rent?" : "What's the asking price?"), count: countFrom(rest) });
  return fresh;
}

// ---------- a new thread, like ChatGPT and Claude ----------

// The first message makes the thread at once (Ismael, 2026-10-29): it's in the sidebar before
// Hopkins answers, named from that message. Hopkins' answer comes after (firstReply). A thread
// with a property in it becomes a listing with ads; any other message gets a reply like any chat.
// A thread is a property listing once it has a property in it: a fact, a link, photos or ads.
// A plain chat ("write me an email to a buyer") stays in Recent but isn't counted as a listing.
export const PROPERTY = (t = "listings") => `(${t}.address IS NOT NULL OR ${t}.price IS NOT NULL OR ${t}.beds IS NOT NULL OR ${t}.sqft IS NOT NULL OR ${t}.home_type IS NOT NULL OR ${t}.link IS NOT NULL OR EXISTS (SELECT 1 FROM photos WHERE photos.listing_id = ${t}.id AND photos.kind = 'listing') OR EXISTS (SELECT 1 FROM ads WHERE ads.listing_id = ${t}.id))`;

export function quickTitle(text) {
  const t = String(text || "").replace(/https?:\/\/\S+/g, " ").replace(/\s+/g, " ").trim();
  if (!t) return null;
  const words = t.split(" ").slice(0, 5).join(" ").replace(/[.,!?;:'"]+$/, "");
  return (words.charAt(0).toUpperCase() + words.slice(1)).slice(0, 48) || null;
}

export async function startThread(ws, { text = "", photoIds = [], photoNames = {} }) {
  const link = (text.match(URL_RE) || [])[0] || null;
  const rest = link ? text.replace(link, " ").trim() : text.trim();
  const parsed = parseListingText(rest);
  const id = randomUUID();
  const now = nowIso();
  const listing = { id, workspace_id: ws.id, address: null, city: null, area: null, price: null, currency: null, deal: null, beds: null, baths: null, sqft: null, home_type: null, open_house: null, ...parsed };
  listing.slug = slugFor(listing);
  await run(
    `INSERT INTO listings (id, workspace_id, slug, address, city, area, price, currency, deal, beds, baths, sqft, home_type, features, link, open_house, auto_title, created_at, updated_at, seen_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, ws.id, listing.slug, listing.address, listing.city, listing.area, listing.price, listing.currency, listing.deal, listing.beds, listing.baths, listing.sqft, listing.home_type,
      JSON.stringify(listing.features || []), link, listing.open_house, quickTitle(rest), now, now, now]
  );
  for (const [i, pid] of photoIds.entries()) {
    const label = labelFromName(photoNames[pid] || "");
    await run(`UPDATE photos SET listing_id = ?, position = ?, label = COALESCE(label, ?) WHERE id = ? AND workspace_id = ?`, [id, i, label, pid, ws.id]);
  }
  await postMessage(ws.id, id, "agent", "text", [rest, link].filter(Boolean).join("\n"), { first: true, ...(photoIds.length ? { photos: photoIds } : {}) });
  await numberUntitled(ws.id);
  return loadListing(ws.id, id);
}

// The model names the thread in a few words (the first words stand in until then).
async function nameThread(ws, id, text) {
  const title = await titleAI(text).catch(() => null);
  if (title) await run(`UPDATE listings SET auto_title = ? WHERE id = ? AND workspace_id = ?`, [polish(title), id, ws.id]);
}

export async function firstReply(ws, id, tz = "UTC") {
  const listing = await loadListing(ws.id, id);
  if (!listing) return null;
  const msg = await get(`SELECT * FROM messages WHERE listing_id = ? AND role = 'agent' AND data LIKE '%"first":true%' ORDER BY created_at LIMIT 1`, [id]);
  if (!msg) return null;
  if (await get(`SELECT 1 FROM messages WHERE listing_id = ? AND role = 'hopkins' LIMIT 1`, [id])) return {};
  const text = msg.body || "";
  const naming = nameThread(ws, id, text);
  const out = await answerFirst(ws, listing, text, safeJson(msg.data, {}).photos || [], tz);
  // The name usually lands with the answer; it never holds the answer up for long.
  await Promise.race([naming, new Promise((r) => setTimeout(r, 4000))]);
  return out;
}

// A property (photos, a link, or a home fact the model agrees is a listing) gets its ads; a
// question or anything else gets an answer, like any chat.
async function answerFirst(ws, listing, text, photoIds, tz, { inPlace = false } = {}) {
  let answer = null;
  if (!photoIds.length && !URL_RE.test(text)) {
    const history = [{ role: "agent", body: text }];
    answer = looksLikeListing(text) ? await answerIfNotListing(ws, history, text, tz) : await newChat(ws, history, tz);
  }
  if (!answer) return readAndMake(ws, listing, text, { inPlace });
  await say(ws, listing.id, answer);
  return {};
}

// Stopped while Hopkins answered the first message: the thread and the message stay, the answer
// goes, and ads it made are never counted (nobody saw them).
export async function undoFirst(ws, id) {
  const msg = await get(`SELECT * FROM messages WHERE listing_id = ? AND role = 'agent' AND data LIKE '%"first":true%' ORDER BY created_at LIMIT 1`, [id]);
  for (const t of ["tests", "launches", "ads"]) await run(`DELETE FROM ${t} WHERE listing_id = ? AND workspace_id = ?`, [id, ws.id]);
  await run(`DELETE FROM messages WHERE listing_id = ? AND workspace_id = ? AND role = 'hopkins' AND kind != 'lead'`, [id, ws.id]);
  if (msg) await run(`UPDATE messages SET data = ? WHERE id = ?`, [JSON.stringify({ ...safeJson(msg.data, {}), stopped: true }), msg.id]);
}

// The listing read from the agent's first message (its link, its words, its photos), then its
// ads. inPlace writes them over the ones there (an edit of that first message).
async function readAndMake(ws, listing, text, { inPlace = false } = {}) {
  const link = (text.match(URL_RE) || [])[0] || null;
  const rest = link ? text.replace(link, " ").trim() : text.trim();
  const linkInfo = link ? await openLink(link) : null;
  if (linkInfo?.photos?.length && !(await get(`SELECT 1 FROM photos WHERE listing_id = ? AND kind = 'listing'`, [listing.id]))) await importPhotos(ws, listing.id, linkInfo.photos);
  const source = [rest, linkInfo?.title, linkInfo?.description].filter(Boolean).join("\n");
  const parsed = parseListingText(source);
  const facts = { address: null, city: null, area: null, price: null, currency: null, deal: null, beds: null, baths: null, sqft: null, home_type: null, open_house: null, ...parsed };
  await run(`UPDATE listings SET address = ?, city = ?, area = ?, price = ?, currency = ?, deal = ?, beds = ?, baths = ?, sqft = ?, home_type = ?, open_house = ?, features = ?, description = ?, link = ?, moment = 'new', updated_at = ? WHERE id = ? AND workspace_id = ?`,
    [facts.address, facts.city, facts.area, facts.price, facts.currency, facts.deal, facts.beds, facts.baths, facts.sqft, facts.home_type, facts.open_house, JSON.stringify(facts.features || []), source || null, link, nowIso(), listing.id, ws.id]);
  const missing = await readListing(ws, listing.id, { rest, linkInfo, features: facts.features, look: !inPlace });
  await numberUntitled(ws.id);
  const fresh = await loadListing(ws.id, listing.id);
  if (link && !linkInfo && !fresh.price && !rest) {
    await say(ws, listing.id, LINK_BLOCKED(link));
    return {};
  }
  await makeAds(ws, fresh, "new", {}, { note: missing || (fresh.price ? null : fresh.deal === "rent" ? "What's the monthly rent?" : "What's the asking price?"), count: countFrom(rest), inPlace });
  return { focus: 1 };
}

// A listing link: Hopkins opens it itself, and when the site blocks that, Gemini reads it
// through Google's own fetcher (only what the page says, 2026-10-28).
async function openLink(link) {
  return (await readLink(link)) || (await readLinkAI(link));
}

// Photos from the listing's page, downloaded once and kept like uploaded ones, in the page's order.
async function importPhotos(ws, listingId, list) {
  const got = await Promise.all(list.map(async (p) => ({ full: await downloadImage(p.url), thumb: p.thumb ? await downloadImage(p.thumb) : null })));
  let pos = Number((await get(`SELECT COALESCE(MAX(position), -1) + 1 AS p FROM photos WHERE listing_id = ?`, [listingId])).p);
  for (const { full, thumb } of got) {
    if (!full) continue;
    await run(`INSERT INTO photos (id, workspace_id, listing_id, kind, label, position, mime, data, thumb, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [randomUUID(), ws.id, listingId, "listing", null, pos++, full.mime, full.buf, thumb?.mime === "image/jpeg" ? thumb.buf : null, nowIso()]);
  }
}

// Some portals (idealista, Realtor.com, Redfin and others) block any app from reading their
// pages, on purpose. Hopkins never says it can't open links (2026-10-28).
// What Hopkins says, every time, when a link won't let it in: the property photos and the
// details, nothing else, in a professional way (Ismael, 2026-10-28).
const LINK_BLOCKED = () => "The link you sent restricts access, so I can't see your listing. Please send the property photos and the details: the address, price, beds, baths and what stands out.";
// About the listing or its ads, or a short nudge ("now?", "and?") that follows the last reply.
const ABOUT_LISTING = { test: (s) => /\b(ads?|listing|link|url|home|house|property|condo|apartment|photos?|pictures?|pics|price|rent|beds?|baths?|bedrooms?|bathrooms?|address|details|access|blocked|zillow|realtor\.com|redfin|idealista)\b|\b(can'?t|cannot|can you|couldn'?t|didn'?t|won'?t) (you )?(see|open|read|access|get (in|to))\b|\bneed from me\b|\bwhat (else )?(do )?you need\b/i.test(s) || s.trim().split(/\s+/).length <= 3 };
const STILL_NEED = "I still need the property photos and the details to make the ads: the address, price, beds, baths and what stands out.";

// With a model, it reads the listing and labels the photos better than the rules can. Returns
// the question to ask if something important is missing.
async function readListing(ws, id, { rest, linkInfo, features = [], look = false }) {
  if (!aiEnabled) return null;
  let photos = await loadPhotos(id, true);
  // Groq's text model can't see; its vision model notes what's in the first photos, so the
  // ads can lead with what's really there.
  if (look) {
    const seen = await seePhotosAI(photos);
    for (const p of seen || []) await run(`UPDATE photos SET label = COALESCE(?, label), seen = ? WHERE id = ?`, [p.label, p.seen || null, p.id]);
    if (seen) photos = await loadPhotos(id, true);
  }
  const r = await readListingAI({ text: rest, linkInfo, photos });
  if (!r) return null;
  const patch = {};
  for (const k of LISTING_FIELDS) if (r.listing[k] && !(typeof r.listing[k] === "number" && r.listing[k] <= 0)) patch[k] = r.listing[k];
  if (patch.price) { const cur = parseCurrency([rest, linkInfo?.title, linkInfo?.description].filter(Boolean).join(" ")); if (cur) patch.currency = cur; }
  if (r.listing.features?.length) patch.features = [...new Set([...(features || []), ...r.listing.features])];
  await patchListing(ws.id, id, patch);
  for (const [i, label] of (r.photo_labels || []).entries()) if (photos[i] && label) await run(`UPDATE photos SET label = ? WHERE id = ?`, [label, photos[i].id]);
  for (const [i, note] of (r.photo_notes || []).entries()) if (photos[i] && note) await run(`UPDATE photos SET seen = ? WHERE id = ?`, [String(note).slice(0, 160), photos[i].id]);
  return r.missing || null;
}

// A listing's name: the agent's own, else the address or area or city, else "Untitled 1",
// "Untitled 2" and so on, numbered in the order they came in and never renumbered.
export const listingTitle = (l) => l.title || l.address || l.auto_title || l.area || l.city || (l.untitled_no ? `Untitled ${l.untitled_no}` : "Untitled");
export async function numberUntitled(workspaceId) {
  const bare = await all(`SELECT id FROM listings WHERE workspace_id = ? AND untitled_no IS NULL AND COALESCE(title, address, auto_title, area, city, '') = '' ORDER BY created_at`, [workspaceId]);
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
    if (moment === "sold") return listing.deal === "rent" ? `Rented. Here's ${one}, for owners nearby who might rent out next.` : `Sold. Here's ${one}, for people nearby who might sell next.`;
    return `Here's ${one}, for ${where}. Tell me what to change, or tap Run ad.`;
  }
  const list = `\n\n${IDEAS(ads)}\n\n`;
  if (moment === "price") return `The price changed on ${where}, so here are ${ads.length} ads for the new price:${list}A new price gives people who scrolled past a reason to look again.`;
  if (moment === "open_house") return `Here are ${ads.length} ads for the open house at ${where}${listing.open_house ? `, ${listing.open_house}` : ""}:${list}Run them in the days before it.`;
  if (moment === "sold") return (listing.deal === "rent" ? `Rented. Here are ${ads.length} ads for owners nearby who might rent out next:${list}` : `Sold. Here are ${ads.length} ads for people nearby who might sell next:${list}`).trim();
  return `Here are ${ads.length} ads for ${where}, each testing a different idea:${list}Tell me what to change, or tap Run ad.`;
}

// The model's style for one ad: "" and 0 mean "leave it", "default" means "back to the brand".
function modelStyle(st, message, { filter = true } = {}) {
  if (!st || typeof st !== "object") return {};
  // The model sometimes sets reset by mistake next to a real change ("grey, and reset"), which
  // wiped the change (2026-10-27). Reset only counts when the agent asked to start over.
  const askedReset = Boolean(readStyle(String(message || "").toLowerCase())?.style?.reset) || /\b(start over|from scratch|undo (all|every)|back to (how|what) (it|they) (was|were))\b/i.test(message || "");
  if (st.reset === true && askedReset) return { reset: true };
  const out = {};
  for (const [k, v] of Object.entries(st)) {
    if (k === "reset" || v === "" || v === 0 || v === null || v === undefined) continue;
    out[k] = typeof v === "string" && v.trim().toLowerCase() === "default" ? null : v;
  }
  return filter ? onlyAsked(cleanStyle(out), message) : cleanStyle(out);
}

// "Do the same for ad 1 and 3", "that too", "like ad 2": a look change that points back at the
// last one instead of naming it (2026-10-27: it was dropped, and the reply said it was done).
// "No you didn't", "nothing changed", "it's still navy": the agent says a change didn't happen.
// When nothing changes in that turn, the answer comes from the ads themselves, never from the
// model, which once replied "You're right, I didn't apply it. Let me fix that now" about a change
// it had made (2026-10-27).
const JUST_THANKS = /^\s*(thanks|thank you|thank u|thx|ty|cheers|ta)( (so much|a lot|a million|hopkins))?[\s!.]*$/i;
const CHALLENGE = /\b(you didn'?t|didn'?t (change|work|do|happen|apply)|did(n'?t| not) change|nothing (changed|happened)|not (changed|done|applied)|still (the same|looks? the same|navy|blue|green|grey|gray|black|white)|it'?s (still|not)|no change|same as before|where'?s the change)\b/i;
function lookNow(ads) {
  const groups = [];
  for (const a of ads) {
    const look = Object.fromEntries(STYLE_KEYS.filter((k) => a.style?.[k] != null).map((k) => [k, a.style[k]]));
    const key = JSON.stringify(look);
    const g = groups.find((x) => x.key === key);
    if (g) g.versions.push(a.version);
    else groups.push({ key, look, versions: [a.version] });
  }
  return groups.map((g) => `${VERSION_WORD(g.versions, ads)} ${g.versions.length > 1 ? "have" : "has"} ${Object.keys(g.look).length ? sayLook(g.look) : "your brand colours"}`).join(", and ") + ".";
}

const LOOK_WORDS = new RegExp(`\\b(background|label|colou?r|font|serif|layout|frame|fade|bigger|smaller|text size|centered|centred|${Object.keys(COLOUR_WORDS).join("|")})\\b`, "i");
export const refersBack = (text) => {
  const t = String(text || "").toLowerCase();
  return /\b(do that|that too|this too|those too|as well|match(ing)?|copy (that|it|the look)|like (ad|version|number) ?[1-5])\b/.test(t)
    || /\b(do|did|make|apply|give|put|want|need)\b[^.?!]{0,30}\bsame\b/.test(t)
    || /\bsame\b[^.?!]{0,16}\b(for|on|to|with)\b\s*(ads?|versions?|v|number|the|them|all|both|[1-5])\b/.test(t)
    || /\bsame (look|colou?rs?|style|background|thing)\b/.test(t);
};
// The last look change: kept on the reply that made it, or, for chats from before that was kept
// (Ismael's live chat, 2026-10-27), the look of the most recently changed ad that isn't one of
// the ads being asked about ("ad 2 grey", then "the same for ad 1 and 3" copies ad 2).
async function lastLook(listingId, ads = [], named = null) {
  const rows = await all(`SELECT data FROM messages WHERE listing_id = ? AND role = 'hopkins' AND data LIKE '%"look":%' ORDER BY created_at DESC LIMIT 1`, [listingId]);
  const look = rows[0] ? JSON.parse(rows[0].data).look : null;
  if (look && Object.keys(look).length) return look;
  const others = ads.filter((a) => !named || !named.includes(a.version))
    .map((a) => ({ a, look: Object.fromEntries(STYLE_KEYS.filter((k) => k !== "size" && a.style?.[k] != null).map((k) => [k, a.style[k]])) }))
    .filter((x) => Object.keys(x.look).length)
    .sort((x, y) => String(y.a.updated_at).localeCompare(String(x.a.updated_at)));
  return others[0]?.look || null;
}
// The look keys that changed between two styles (what "the same" repeats later).
function lookDiff(before = {}, after = {}) {
  const out = {};
  for (const k of STYLE_KEYS) if (k !== "size" && before[k] !== after[k] && after[k] !== undefined) out[k] = after[k];
  return out;
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

// What changed on one ad, in words, from the ad itself before and after.
function editParts(before = {}, after = {}) {
  const parts = [];
  const look = lookDiff(before.style, after.style);
  const step = Math.round(((Number(after.style?.size) || 1) - (Number(before.style?.size) || 1)) * 100) / 100;
  if (Object.keys(look).length || step) parts.push({ look: true, text: sayLook(look, step) });
  if (after.photo_id && before.photo_id !== after.photo_id) parts.push({ photo: true, text: "a different photo" });
  if (after.overlay !== before.overlay) parts.push({ text: `the line on the photo reads "${after.overlay}"` });
  if (after.headline !== before.headline) parts.push({ text: `the headline reads "${after.headline}"` });
  if (after.primary_text !== before.primary_text) {
    const shorter = String(after.primary_text || "").length < String(before.primary_text || "").length * 0.9;
    parts.push({ text: shorter ? "the caption is shorter" : "the caption is rewritten" });
  }
  return parts;
}
// The reply for a change, written from the ads, never from what the model says it did
// (2026-10-27: "removed the period" with the period still there, "grey" on navy ads).
function sayEdits(edits, ads) {
  const groups = [];
  for (const e of edits) {
    const parts = editParts(e.before, e.after);
    if (!parts.length) continue;
    const key = JSON.stringify(parts);
    const g = groups.find((x) => x.key === key);
    if (g) g.versions.push(e.version);
    else groups.push({ key, parts, versions: [e.version] });
  }
  return groups.map(({ parts, versions }) => {
    const who = VERSION_WORD(versions, ads);
    const many = versions.length > 1;
    // "Ad 1 now uses a different photo", never "On Ad 1, a different photo" (2026-10-28).
    if (parts[0].photo) {
      const rest = parts.slice(1).map((p) => p.text.replace(/ reads /, " now reads "));
      return `${who} now ${many ? "use" : "uses"} a different photo${rest.length ? `, and ${rest.join(", and ")}` : ""}.`;
    }
    if (parts[0].look) {
      const rest = parts.slice(1).map((p) => p.text.replace(/ reads /, " now reads "));
      return `${who} now ${many ? "have" : "has"} ${parts[0].text}${rest.length ? `, and ${rest.join(", and ")}` : ""}.`;
    }
    const said = parts.map((p) => p.text.replace(/ reads /, " now reads ")).join(", and ");
    return `On ${who}, ${said}.`;
  }).map((t) => t.replace(/([.!?]")\.$/, "$1")).join(" ");
}
// The agent's own photo can only go on once they've added one; until then Hopkins says where.
const hasAgentPhoto = async (ws) => Boolean(await get(`SELECT 1 FROM users WHERE workspace_id = ? AND avatar_id IS NOT NULL`, [ws.id]));
const ADD_PHOTO = "Add your photo first in Settings, Profile, Change photo. Then ask me again.";

// Where the ads are now: their looks and their lines.
function stateNow(ads) {
  const lines = ads.map((a) => `**Ad ${a.version}** "${a.overlay}"`).join(", ");
  return `${lookNow(ads)} The lines on the photos: ${lines}.`;
}
const CLAIMS = /\b(I(?:'ve| have)? (set|changed|updated|removed|added|made|gave|switched|applied|swapped|replaced|fixed|turned|moved|put)|updated|(is|are) now|now (has|have|reads|read|uses|use|shows|show))\b/i;

// An ad's name in sentence case ("Porch Life" becomes "Porch life"); place names, prices and
// acronyms keep their capitals.
function adName(raw, keep = []) {
  const words = polish(String(raw || "")).replace(/[.!]$/, "").slice(0, 28).split(" ").filter(Boolean);
  const titled = words.length > 1 && words.slice(1).every((w) => /^[A-Z$0-9]/.test(w));
  return words.map((w, i) => (i && titled && /^[A-Z][a-z]/.test(w) && !keep.includes(w) ? w.toLowerCase() : w)).join(" ");
}

// The line on the photo. Hopkins' own lines end with a full stop, but never one the agent didn't
// want: words the agent dictated keep their own ending, unchanged words keep theirs, a line that
// ends in a number or a price gets none, and "remove the dot" takes it off (2026-10-27: the full
// stop was added back to "$10,000/mo" every time).
const DOT_OFF = /\b(remove|take (out|off|away)|delete|drop|get rid of|lose|no|without)\b[^?!]{0,30}\b(dot|period|full ?stop|punctuation)\b/i;
const bareLine = (t) => String(t || "").replace(/[.!?]+$/, "").trim().toLowerCase();
function lineFor(raw, current, message = "", others = []) {
  let t = String(raw || "").trim();
  if (!t) return current;
  const said = String(message || "");
  // Copied from another ad ("now change it for ad 1 too"): exactly as that ad has it.
  const copied = others.find((o) => o && bareLine(o) === bareLine(t));
  if (current && bareLine(t) === bareLine(current)) t = current;
  else if (copied) t = copied;
  else if (said && bareLine(t) && said.toLowerCase().includes(bareLine(t))) {
    const i = said.toLowerCase().indexOf(bareLine(t));
    t = t.replace(/[.!?]+$/, "") + (said[i + bareLine(t).length] === "." ? "." : "");
  } else if (/(^|\s)[a-z']+$/i.test(t) && t.split(/\s+/).length >= 3) t += ".";
  if (DOT_OFF.test(said)) t = t.replace(/\.+$/, "");
  return t;
}

function normalizeAI(ad, photos, fallback, message = "", others = []) {
  const photo = ad.photo_number > 0 ? photos[ad.photo_number - 1] : null;
  const clean = (s, max) => polish(cleanWording(String(s || ""))).slice(0, max);
  return {
    style: mergeStyle(fallback.style || {}, modelStyle(ad.style, message)),
    name: adName(ad.name) || fallback.name || "",
    pattern: KINDS.includes(ad.kind) ? ad.kind : fallback.pattern || "other",
    headline: clean(ad.headline, 60) || fallback.headline,
    primary_text: clean(ad.primary_text, 600) || fallback.primary_text,
    overlay: lineFor(clean(ad.overlay, 60), fallback.overlay, message, others),
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

// "**1** highlights the porch" reads as a typo: a bare bold number is always "**Ad 1**".
export const adNumbers = (text) => text.replace(/\bAd \*\*([1-5])\*\*/g, "**Ad $1**").replace(/(?<!Ad )\*\*([1-5])\*\*/g, "**Ad $1**");

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
  return { ads, reply: r.reply ? adNumbers(plainWords(r.reply)) : null };
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
// On the free plan, counting the ads left and saving new ones mustn't interleave: with the model
// answering in between, three listings sent at once all saw 3 free ads left and made 9 (found
// 2026-10-26). One at a time per account; paid accounts have no limit to protect, so they never
// wait. Held in memory, which is right while Hopkins runs on one server.
const queues = new Map();
function oneAtATime(ws, fn) {
  if (isPaid(ws)) return fn();
  const next = (queues.get(ws.id) || Promise.resolve()).then(fn);
  const tail = next.catch(() => {});
  queues.set(ws.id, tail);
  tail.then(() => { if (queues.get(ws.id) === tail) queues.delete(ws.id); });
  return next;
}

export const makeAds = (ws, ...args) => oneAtATime(ws, () => makeAdsNow(ws, ...args));

async function makeAdsNow(ws, listing, moment = "new", extra = {}, { note = null, aiSet = null, count = null, brief = "", inPlace = false } = {}) {
  const existing = await all(`SELECT * FROM ads WHERE listing_id = ? AND moment = ? ORDER BY version`, [listing.id, moment]);
  // inPlace: the listing's first message was edited, so its ads are written again over the same
  // ones. That's a change to ads already made, not new ads, on either plan.
  inPlace = inPlace && existing.length > 0;
  const want = inPlace ? existing.length : Math.max(1, Math.min(MAX_ADS, count || (aiSet?.ads?.length) || 3));
  // On the free plan a new set is new ads, even when it replaces the old ones, so it needs free
  // ads left. Changes to existing ads stay included (they go through the chat, not here).
  const room = isPaid(ws) || inPlace ? want : Math.min(want, FREE_AD_LIMIT - (await adsMade(ws.id)));
  if (room < 1) {
    // On the free plan a new price or open house can't bring more ads, but the ones it has
    // still get the new facts: changes to those are included.
    const current = await currentAds(listing);
    if (current.length && (moment === "price" || moment === "open_house")) {
      const photos = await loadPhotos(listing.id, aiEnabled);
      await rewriteAds(ws, listing, current, photos, moment === "price" ? "the new price" : "the open house", extra);
      await say(ws, listing.id, `I've put the ${moment === "price" ? "new price" : "open house"} into your ads. A separate set of ${moment === "price" ? "price" : "open house"} ads would be new ads, which require Pro.`, "text", { snapshot: await snapshot(listing) });
    }
    // Asking again doesn't stack the same message; the app shows a short note instead.
    const last = await get(`SELECT kind FROM messages WHERE listing_id = ? ORDER BY created_at DESC LIMIT 1`, [listing.id]);
    if (last && last.kind === "upgrade") return { upgrade: true, repeat: true, reason: "limit" };
    if (!current.length) {
      const used = await get(`SELECT l.title, l.address, l.auto_title, l.area, l.city, l.untitled_no FROM ads JOIN listings l ON l.id = ads.listing_id WHERE ads.workspace_id = ? AND l.id != ? ORDER BY ads.created_at LIMIT 1`, [ws.id, listing.id]);
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
  const reuse = isPaid(ws) || inPlace;
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
  // The first set says once how to change the look (Ismael, 2026-10-27: people didn't know).
  const firstSet = moment === "new" && !(await get(`SELECT 1 FROM messages WHERE listing_id = ? AND kind = 'ads'`, [listing.id]));
  const tip = firstSet ? 'Tap **Style** to change the look, or just say it ("navy background", "classic font").' : null;
  const body = [reply || introFor(moment, listing, set), note].filter(Boolean).join(" ") + (tip ? `\n\n${tip}` : "");
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

// More ads, or fewer, from the chat. After waiting its turn it looks at the ads again, since
// another request may have changed them.
const changeSet = (ws, listing, ads, ...args) => oneAtATime(ws, async () => changeSetNow(ws, listing, await currentAds(listing), ...args));

async function changeSetNow(ws, listing, ads, photos, r, text) {
  const reply = plainWords(r.reply);
  if (r.action === "remove_ads") {
    const gone = ads.filter((a) => r.remove.includes(a.version) || (!r.remove.length && a.version === r.version));
    if (!gone.length) { await say(ws, listing.id, reply || "Which one should go?"); return {}; }
    const moved = await removeAds(ws, listing, gone);
    const left = ads.filter((a) => !gone.includes(a));
    const renumbered = moved.length ? ` ${moved.map(([from, to]) => `What was Ad ${from} is now Ad ${to}`).join(", ")}.` : "";
    // The model's reply was written before the numbers moved, so Hopkins says it plainly.
    await say(ws, listing.id, `Removed ${VERSION_WORD(gone.map((a) => a.version), gone)}.${renumbered}${left.length ? "" : " Tell me what to make instead."}`);
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
    await say(ws, listing.id, `${upgradeText("limit")} Changes to these are included.`, "upgrade", { reason: "limit" });
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

// Two edits too exact to leave to the model (2026-10-27: it said "removed the period" and didn't,
// and rewrote the caption when only the line was asked for): taking the full stop off the line,
// and a line the agent dictates ("change the text of balcony moments await to $10,000/mo").
// Done here, exactly as typed, nothing else touched.
const DICTATE = [
  /\b(?:change|make|set|replace|update|edit|switch|turn)\s+(?:the\s+)?(?:text|line|words?|wording|overlay|headline|title|big line|main line|line on (?:the )?photo)(?:\s+(?:of|on|for|in)\s+(.+?))?\s+(?:to|into|with|so it says|to say|to read|as)\s+(.+?)\s*$/i,
  /\b(?:change|replace|switch|turn)\s+["“'](.+?)["”']\s+(?:to|with|into)\s+(.+?)\s*$/i,
];
async function directEdit(ws, listing, ads, text, selected) {
  if (!ads.length || !text) return null;
  const everyAd = /\b(both|all|every|each|them)\b/i.test(text) ? ads.map((a) => a.version) : null;
  let targets = null, change = null;
  if (DOT_OFF.test(text) && !/\b(colou?r|background|font|layout|label|shorter|longer|photo)\b/i.test(text)) {
    targets = namedVersions(text, ads) || everyAd || [selected];
    change = (ad) => ({ overlay: String(ad.overlay || "").replace(/\.+$/, "") });
  } else {
    for (const re of DICTATE) {
      let m = text.match(re);
      if (!m) continue;
      // "change the text of close to santa monica to $10,000/mo": the old line has its own "to",
      // so the split comes after the words of a line an ad really has.
      if (m[1]) {
        const low = text.toLowerCase();
        const own = ads.map((a) => bareLine(a.overlay)).filter((b) => b && low.includes(b)).sort((x, y) => y.length - x.length)[0];
        const rest = own && text.slice(low.indexOf(own) + own.length).match(/^[.!?]?["”']?\s+(?:to|into|with|so it says|to say|to read|as)\s+(.+?)\s*$/i);
        if (rest) m = [m[0], own, rest[1]];
      }
      const line = m[2].trim().replace(/^["“']+|["”']+$/g, "").trim();
      if (!line || line.length > 60 || DESCRIBES.test(line) || (!/["“”']/.test(m[2]) && line.split(/\s+/).length > 8)) return null;
      const which = m[1] ? m[1].replace(/^["“']+|["”']+$/g, "") : "";
      const byLine = which ? ads.filter((a) => bareLine(a.overlay) && (bareLine(a.overlay).includes(bareLine(which)) || bareLine(which).includes(bareLine(a.overlay)))).map((a) => a.version) : [];
      targets = byLine.length ? byLine : (which && namedVersions(which, ads)) || namedVersions(text.replace(m[2], ""), ads) || everyAd || [selected];
      change = () => ({ overlay: line });
      break;
    }
  }
  if (!change) return null;
  const before = ads.filter((a) => targets.includes(a.version));
  if (!before.length) return null;
  for (const ad of before) await saveAd(ws, listing, listing.moment, ad.version, { ...ad, ...change(ad) }, ad);
  const after = await currentAds(listing);
  const edits = before.map((b) => ({ version: b.version, before: b, after: after.find((a) => a.version === b.version) }));
  const said = sayEdits(edits, ads);
  const shown = before.map((a) => a.version);
  await say(ws, listing.id, said || `There's no full stop on ${VERSION_WORD(shown, ads).replace(/^Ad /, "ad ")} to take off. ${stateNow(before)}`, "text", { snapshot: await snapshot(listing, shown) });
  return { focus: shown.length === 1 ? shown[0] : undefined };
}

export async function handleMessage(ws, listingId, text, selected = 1, tz = "UTC") {
  const listing = await loadListing(ws.id, listingId);
  if (!listing) return null;
  const sent = await postMessage(ws.id, listingId, "agent", "text", text);
  await keepUndo(listingId, sent.id);
  const direct = await directEdit(ws, listing, await currentAds(listing), text, selected);
  if (direct) return direct;
  // A plain thanks never goes to the model, so it can't touch the ads or get a reply about them.
  if (JUST_THANKS.test(text)) {
    await say(ws, listing.id, "Anytime.");
    return {};
  }
  const ads = await currentAds(listing);
  // A link the site wouldn't let Hopkins read, and nothing else yet: until the agent sends the
  // facts or photos, every question gets the same true answer, not the model's guess (it once
  // said "I don't have browsing ability" right after a Zillow link had worked, 2026-10-28).
  // Only for messages about the listing or its ads: anything else ("write me an email to a
  // client") goes to the model like any other chat (Ismael, 2026-10-29: a normal assistant).
  if (!ads.length && listing.link && !listing.description && text.trim() && !looksLikeListing(text) && (!aiEnabled || ABOUT_LISTING.test(text))) {
    await say(ws, listing.id, await fresh(listing.id, [LINK_BLOCKED(), STILL_NEED]));
    return {};
  }
  const photos = await loadPhotos(listing.id, aiEnabled);
  let busy = false;

  if (aiEnabled) {
    const history = await all(`SELECT role, body, data FROM messages WHERE listing_id = ? ORDER BY created_at`, [listingId]);
    const plan = { paid: isPaid(ws), adsMade: await adsMade(ws.id), limit: FREE_AD_LIMIT };
    const agentPhoto = await hasAgentPhoto(ws);
    // Each ad's Leads, so "which one is working?" gets real numbers, never "engagement".
    const leadRows = await all(`SELECT ad_id, SUM(CASE WHEN wants = 'showing' THEN 1 ELSE 0 END) AS showings, COUNT(*) AS n FROM leads WHERE listing_id = ? GROUP BY ad_id`, [listingId]);
    const leads = Object.fromEntries(leadRows.map((x) => [x.ad_id, { n: Number(x.n), showings: Number(x.showings) }]));
    const r = await chatTurnAI({ listing, photos, brand: ws.brand, ads, history, selectedVersion: selected, plan, agentName: ws.brand.agent_name, agentPhoto, leads, account: await accountSummary(ws, tz) });
    if (r) return applyAI(ws, listing, ads, photos, r, text);
    busy = takeFailure() === "busy";
    if (busy && needsModel(text)) {
      await say(ws, listing.id, BUSY, "text", { busy: true });
      return {};
    }
  }
  return applyRules(ws, listing, ads, photos, text, selected, { busy });
}

// ---------- stopping a reply ----------

// Stop, like ChatGPT and Claude (Ismael, 2026-10-28): the agent's message stays, Hopkins' reply
// never comes, and whatever it was about to change goes back as it was. The model can't be
// called back mid answer, so the reply runs to its end and is then undone. Keyed by listing
// ("l:<id>") or, on the New listing screen, by workspace ("new:<id>").
const turns = new Map();
export function startTurn(key) {
  let finish;
  const turn = { stopped: false, done: new Promise((r) => (finish = r)) };
  turn.finish = finish;
  turns.set(key, turn);
  return turn;
}
export function endTurn(key, turn) {
  if (turns.get(key) === turn) turns.delete(key);
  turn.finish();
}
// The reply that was still running, now marked to be undone; null when none was.
export function stopTurn(key) {
  const turn = turns.get(key);
  if (!turn) return null;
  turn.stopped = true;
  return turn;
}
// A message sent right after Stop waits until the stopped reply has been undone.
export async function settleTurn(key) {
  const turn = turns.get(key);
  if (turn?.stopped) await turn.done;
}

// Undo Hopkins' reply to the agent's latest message: its replies go, the agent's message stays.
export async function undoLatestReply(ws, listingId) {
  const msg = await get(`SELECT * FROM messages WHERE listing_id = ? AND workspace_id = ? AND role = 'agent' ORDER BY created_at DESC LIMIT 1`, [listingId, ws.id]);
  if (!msg) return false;
  if (msg.undo) await restoreBefore(ws, msg);
  await run(`DELETE FROM messages WHERE listing_id = ? AND created_at > ? AND role = 'hopkins' AND kind != 'lead'`, [listingId, msg.created_at]);
  // Marked, so the model never acts on a request the agent stopped (it once applied it on the
  // next, unrelated question).
  await run(`UPDATE messages SET data = ? WHERE id = ?`, [JSON.stringify({ ...safeJson(msg.data, {}), stopped: true }), msg.id]);
  return true;
}

// A listing stopped while it was being made: gone, without counting its ads as made (nobody saw
// them), and the photos sent with it kept for the next try.
export async function dropStoppedListing(ws, id) {
  await run(`UPDATE photos SET listing_id = NULL WHERE listing_id = ? AND workspace_id = ? AND kind = 'listing'`, [id, ws.id]);
  for (const t of ["tests", "launches", "ads", "messages"]) await run(`DELETE FROM ${t} WHERE listing_id = ? AND workspace_id = ?`, [id, ws.id]);
  await run(`DELETE FROM listings WHERE id = ? AND workspace_id = ?`, [id, ws.id]);
}

// ---------- editing a sent message ----------

// Any message the agent sent can be edited, like in ChatGPT or Claude, and Hopkins forgets the
// old wording: that message and everything after it go (lead notes stay), the listing and its
// ads go back to how they were before it, and the new wording gets a fresh answer. Remembering
// the old one would leave the model acting on both. Each message keeps the listing and ads as
// they were before it (`undo`). An approved run is the one thing an edit can't go back past.
// The message that made the listing has nothing before it: editing it reads the listing again
// and writes its ads again over the same ones (editFirst).
async function keepUndo(listingId, messageId) {
  const listing = await get(`SELECT * FROM listings WHERE id = ?`, [listingId]);
  const ads = await all(`SELECT * FROM ads WHERE listing_id = ?`, [listingId]);
  await run(`UPDATE messages SET undo = ? WHERE id = ?`, [JSON.stringify({ listing, ads }), messageId]);
}

export const forgetUndo = (listingId) => run(`UPDATE messages SET undo = NULL WHERE listing_id = ? AND undo IS NOT NULL`, [listingId]);

const COLUMN = /^[a-z_]+$/;

// The message that made the listing (marked first). Listings from before 2026-10-26 aren't
// marked: there it's the last thing the agent said in the second the listing was made, since
// the conversation before it was saved in the same moment and anything new came after a reply.
export async function firstMessageId(listing) {
  if (await get(`SELECT 1 FROM launches WHERE listing_id = ?`, [listing.id])) return null;
  const marked = await get(`SELECT id FROM messages WHERE listing_id = ? AND role = 'agent' AND data LIKE '%"first":true%' LIMIT 1`, [listing.id]);
  if (marked) return marked.id;
  const limit = new Date(new Date(listing.created_at).getTime() + 1000).toISOString();
  const m = await get(`SELECT id FROM messages WHERE listing_id = ? AND role = 'agent' AND created_at <= ? ORDER BY created_at DESC LIMIT 1`, [listing.id, limit]);
  return m?.id || null;
}

// The listing and its ads put back as they were just before an agent's message (its undo).
async function restoreBefore(ws, msg) {
  const { listing: was, ads } = JSON.parse(msg.undo);
  await oneAtATime(ws, async () => {
    // On the free plan, ads the old message made still count as made, and ads it removed come
    // back without being counted twice: an edit never gives free ads back or costs any.
    const now = await all(`SELECT id FROM ads WHERE listing_id = ?`, [msg.listing_id]);
    const before = new Set(ads.map((a) => a.id));
    const after = new Set(now.map((a) => a.id));
    const shift = now.filter((a) => !before.has(a.id)).length - ads.filter((a) => !after.has(a.id)).length;
    if (shift) await run(`UPDATE workspaces SET ads_removed = MAX(0, ads_removed + ?) WHERE id = ?`, [shift, ws.id]);
    await run(`DELETE FROM ads WHERE listing_id = ? AND workspace_id = ?`, [msg.listing_id, ws.id]);
    for (const a of ads) {
      // A photo deleted since leaves the ad on its first photo, not a missing one.
      if (a.photo_id && !(await get(`SELECT 1 FROM photos WHERE id = ?`, [a.photo_id]))) a.photo_id = null;
      const cols = Object.keys(a).filter((k) => COLUMN.test(k));
      await run(`INSERT INTO ads (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`, cols.map((k) => a[k]));
    }
    const cols = Object.keys(was).filter((k) => COLUMN.test(k) && !["id", "workspace_id", "slug", "created_at", "updated_at", "untitled_no", "title", "auto_title", "status", "spend", "seen_at"].includes(k));
    await run(`UPDATE listings SET ${cols.map((k) => `${k} = ?`).join(", ")} WHERE id = ? AND workspace_id = ?`, [...cols.map((k) => was[k]), msg.listing_id, ws.id]);
  });
}

export async function editMessage(ws, messageId, text, selected = 1) {
  const msg = await get(`SELECT * FROM messages WHERE id = ? AND workspace_id = ? AND role = 'agent'`, [messageId, ws.id]);
  const listing = msg && (await loadListing(ws.id, msg.listing_id));
  if (!listing) return null;
  if (!msg.undo) return (await firstMessageId(listing)) === msg.id ? editFirst(ws, listing, msg, text) : null;
  await restoreBefore(ws, msg);
  await run(`DELETE FROM messages WHERE listing_id = ? AND created_at >= ? AND kind != 'lead'`, [msg.listing_id, msg.created_at]);
  return handleMessage(ws, msg.listing_id, text, selected);
}

// The first message, edited: the listing is read again from the new words (the agent's own name
// for it, its status and its page address stay), and its ads are written again in place.
async function editFirst(ws, listing, msg, text) {
  await run(`DELETE FROM messages WHERE listing_id = ? AND created_at >= ? AND kind != 'lead'`, [listing.id, msg.created_at]);
  const link = (text.match(URL_RE) || [])[0] || null;
  const rest = link ? text.replace(link, " ").trim() : text.trim();
  await postMessage(ws.id, listing.id, "agent", "text", [rest, link].filter(Boolean).join("\n"), { ...safeJson(msg.data, {}), first: true });
  return answerFirst(ws, listing, text, safeJson(msg.data, {}).photos || [], "UTC", { inPlace: true });
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
// Hopkins speaks as itself: "the platform only lets me" is "I can only" (Ismael, 2026-10-27:
// does Claude ever say "Anthropic doesn't let me"?).
const asItself = (s) => String(s || "")
  .replace(/\b[Tt]he (platform|system|app|software|tool) only (lets|allows) me( to)?\s+/g, "I can only ")
  .replace(/\b[Tt]he (platform|system|app|software|tool) (doesn't|does not|won't|will not|can't|cannot) (let|allow) me( to)?\s+/g, "I can't ")
  .replace(/\b(I'm|I am) not (allowed|permitted) to\b/g, "I can't")
  // Never "we": it makes Hopkins sound like an agency. The model still slips now and then.
  .replace(/\bbefore we (start|begin|launch|go live|run (it|them))\b/gi, "before the ads go live")
  .replace(/\b([Ww])e('ll| will| can| could|'d| would|'ve| have)\b/g, (m, w, rest) => `I${rest}`);
// "Lead" is written with a capital L everywhere in Hopkins (Ismael, 2026-10-27). Only the noun,
// after a number or a word like "no", "new" or "per", so "it leads to" stays as it is.
export const capLeads = (s) => String(s || "").replace(/\b(\d[\d,]*|no|new|more|fewer|any|every|first|your|their|the|a|an|of|per|cheapest|cheaper|cheap|real|buyer|those|these|some|many|few|zero|one|two|three|four|five|six|seven|eight|nine|ten|qualified|good|warm|more|extra)(\s+)lead(s?)\b/gi, (m, w, sp, plural) => `${w}${sp}Lead${plural}`);
// Offers of more help at the end of a reply ("Let me know if you'd like any tweaks.") add nothing.
const FILLER = /\s*(?:^|(?<=[.!?]))\s*(?:let me know|just let me know|feel free|happy to help|hope (?:this|that) helps|if you(?:'d| would) like(?: any)?|if you want|want me to|tell me if you(?:'d| would) like|anything (?:else )?(?:to|you'd like to|you want to) (?:adjust|change|tweak)|any (?:other |more )?(?:tweaks|changes|questions)|pick the one|tell me which|(?:would you like|do you want|shall i|should i) (?:me to )?(?:adjust|change|tweak|edit|modify|rewrite|refine|shorten|lengthen|polish)\b)[^.!?]*[.!?]?\s*$/i;
export const noFiller = (s) => { let t = String(s || ""), prev; do { prev = t; t = t.replace(FILLER, "").trim(); } while (t !== prev && t); return t || String(s || ""); };
const plainWords = (s, clean = polishChat) => clean(noFiller(capLeads(asItself(s))).replace(/\b(the |an |a )?overlay( text| line)?\b/gi, (m, art) => `${art ? (/^the/i.test(art) ? "the " : "a ") : ""}line on the photo`).replace(/(^|[.!?]\s+)(the |a )?line on the photo/g, (m, start, art) => `${start}${art ? art[0].toUpperCase() + art.slice(1) : "L"}${art ? "line" : "ine"} on the photo`));

async function applyAI(ws, listing, ads, photos, r, text) {
  const reply = plainWords(r.reply);
  const patch = patchFrom(listing, r.listing_patch);
  // Facts the agent typed that the model left out ("€1,250,000" once never reached the listing,
  // 2026-10-28): only where the listing has nothing yet.
  const typed = text ? parseListingText(text) : {};
  for (const k of ["price", "beds", "baths", "sqft", "address", "deal"]) if (typed[k] && !patch[k] && !listing[k]) patch[k] = typed[k];
  if (patch.price && text) { const cur = parseCurrency(text); if (cur) patch.currency = cur; }
  // New facts the feature list has no name for ("it has solar panels") are kept in the agent's
  // own words, so every later rewrite still knows them.
  if (r.action === "update_listing" && text) patch.description = [listing.description, text].filter(Boolean).join("\n");
  const focus = r.version || undefined;

  if (r.action === "run") {
    // The plan says it all: the model's own line before it once said "Running all three ads"
    // before anything ran, then the plan asked for a yes again (2026-10-28).
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
  let ruled = text ? readStyle(text.toLowerCase()) : null;
  // "The same for ad 1 and 3": the last look change, as if the agent had named it again.
  let askText = text;
  let again = null;
  if (refersBack(text) && (!ruled || !Object.keys(ruled.style).length)) {
    again = await lastLook(listing.id, ads, named);
    if (again) { ruled = { style: again, sizeStep: 0 }; askText = `${text} ${sayLook(again)}`; }
  }
  const ruledColours = ruled && !ruled.vague ? Object.fromEntries(["bg", "accent", "text"].filter((k) => ruled.style[k]).map((k) => [k, ruled.style[k]])) : {};
  // "The same" about a look is only a look change: the words stay exactly as they are (the model
  // once rewrote both ads' copy as well, 2026-10-27).
  const COPY_ASK = /\b(shorter|longer|headline|wording|words|copy|rewrite|write|line|caption|warmer|punchier|tone|say|says|mention)\b/i;
  const lookOnly = Boolean(again) && !COPY_ASK.test(text || "");
  // A plain look change ("make ad 2 navy") keeps the words as they are: the model once
  // rewrote the caption with it (2026-10-28).
  const wordsStay = lookOnly || (Boolean(ruled && !ruled.vague && Object.keys(ruled.style || {}).length) && !COPY_ASK.test(text || ""));
  let overrode = lookOnly;
  let needPhoto = false;
  const unreadable = {};
  for (const a of r.ads || []) {
    const ad = ads.find((x) => x.version === a.version);
    if (!ad) continue;
    if (named && !named.includes(ad.version)) { overrode = true; continue; }
    const next = lookOnly ? { ...ad } : guarded({ ...ad, ...normalizeAI(a, photos, ad, text, ads.map((x) => x.overlay)) }, ad, { listing: { ...listing, ...patch }, photos, extra: [text, ...ads.map((x) => x.overlay)].join(" ") });
    if (wordsStay) for (const k of ["headline", "primary_text", "overlay"]) next[k] = ad[k];
    const wanted = modelStyle(a.style, text, { filter: false });
    const look = modelStyle(a.style, refersBack(text) && askText === text ? `${text} ${sayLook(wanted)}` : askText);
    for (const k of ["bg", "accent", "text"]) {
      if (ruledColours[k] && look[k] !== ruledColours[k]) look[k] = ruledColours[k];
      else if (!ruledColours[k] && look[k] && Object.values(ruledColours).includes(look[k])) delete look[k];
    }
    if (look.face === "on" && !(await hasAgentPhoto(ws))) { delete look.face; needPhoto = true; }
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
  // Their own photo goes on (or comes off) when they ask, whatever the model did: it once
  // answered "the platform only lets me use the photos you uploaded" (2026-10-27).
  const face = !lookOnly && readStyle(text || "")?.style?.face;
  if (face === "on" && !(await hasAgentPhoto(ws))) needPhoto = true;
  else if (face) {
    const fresh = await currentAds(listing);
    const missing = (named || ads.map((a) => a.version)).filter((v) => {
      const on = fresh.find((x) => x.version === v)?.style?.face === "on";
      return fresh.some((x) => x.version === v) && (face === "on" ? !on : on);
    });
    if (missing.length) {
      await restyle(ws, listing, missing, { face });
      changed.push(...missing.filter((v) => !changed.includes(v)));
      changed.sort();
      overrode = true;
    }
  }
  const copyChanged = !wordsStay && (r.ads || []).some((a) => {
    const ad = ads.find((x) => x.version === a.version);
    return ad && (!named || named.includes(ad.version)) && ["headline", "primary_text", "overlay"].some((k) => a[k] && polish(cleanWording(String(a[k]))) !== ad[k]);
  });
  const afterAds = changed.length ? await currentAds(listing) : ads;
  const edits = changed.map((v) => ({ version: v, before: ads.find((x) => x.version === v), after: afterAds.find((x) => x.version === v) }));
  const diffs = edits.map((e) => ({ version: e.version, before: e.before?.style, after: e.after?.style }));
  const anyChange = edits.some((e) => editParts(e.before, e.after).length);
  // New facts with no rewritten copy from the model: rewrite the ads so they carry them.
  let rewroteAll = false;
  if (r.action === "update_listing" && !changed.length && ads.length && Object.keys(patch).length) {
    rewroteAll = true;
    await rewriteAds(ws, await loadListing(ws.id, listing.id), ads, photos, `the new facts (${text})`);
  }
  const data = {};
  if (anyChange || rewroteAll) data.snapshot = await snapshot(listing, rewroteAll ? null : changed);
  const look = diffs.map((d) => lookDiff(d.before, d.after)).find((x) => Object.keys(x).length);
  if (look) data.look = look;
  const notes = [sayChanges([], unreadable, ws.brand?.primary, ads), needPhoto ? ADD_PHOTO : ""].filter(Boolean).join(" ");
  let out;
  if (anyChange) out = [sayEdits(edits, ads), notes].filter(Boolean).join(" ");
  else if (rewroteAll) out = reply || "Done. The ads are updated.";
  else if (CHALLENGE.test(text || "") || ((changed.length || CLAIMS.test(reply || "")) && ads.length)) {
    // Nothing changed this turn: never a reply that says something did.
    const n = namedVersions(text, ads);
    const shown = n ? ads.filter((a) => n.includes(a.version)) : ads;
    out = `${changed.length || CHALLENGE.test(text || "") ? "Nothing changed with that message." : "I haven't changed anything since your last message."} Now: ${lookNow(shown)} Tell me what to change.`;
    if (needPhoto) out = ADD_PHOTO;
    else if (notes) out = notes;
    data.snapshot = await snapshot(listing, shown.map((a) => a.version));
  } else out = needPhoto ? ADD_PHOTO : reply || "Okay.";
  await say(ws, listing.id, out, "text", Object.keys(data).length ? data : null);
  return { focus: changed.length === 1 ? changed[0] : focus };
}

const WHY = {
  life: "sells the life the property gives, the way one buyer would live it",
  feature: "puts one standout detail first, with the photo that shows it",
  facts: "gives the price and the numbers up front, for buyers who are already looking",
};

// The first reply that isn't word for word what Hopkins said last, so it never repeats itself.
async function fresh(listingId, options) {
  const last = await get(`SELECT body FROM messages WHERE listing_id = ? AND role = 'hopkins' ORDER BY created_at DESC LIMIT 1`, [listingId]);
  return options.find((o) => o && o !== last?.body) || options[options.length - 1];
}

async function applyRules(ws, listing, ads, photos, text, selected, { busy = false } = {}) {
  const intent = readIntent(text, { selected, photos, ads });
  const sorted = [...photos].sort((a, b) => a.position - b.position);
  const v = intent.versions.length === 1 ? intent.versions[0] : selected;
  const ad = ads.find((a) => a.version === v);
  const first = (ws.brand.agent_name || "").split(" ")[0];

  if (intent.kind === "run") return proposeRun(ws, listing, { versions: intent.versions, budget: intent.budget, days: intent.days });

  if (intent.kind !== "style" && refersBack(text) && ads.length) {
    const versions = namedVersions(text, ads);
    const again = await lastLook(listing.id, ads, versions);
    if (again && versions?.length) Object.assign(intent, { kind: "style", style: again, sizeStep: 0, versions });
  }
  if (intent.kind === "remove" && ads.length) return changeSet(ws, listing, ads, photos, { action: "remove_ads", remove: intent.versions, ads: [], reply: "" }, text);
  if (intent.kind === "add") return changeSet(ws, listing, ads, photos, { action: "add_ads", remove: [], ads: [], reply: "" }, text);

  if (intent.kind === "greeting") {
    const where = ads.length
      ? `Your ${ads.length === 1 ? "ad is" : `${ads.length} ads are`} ready. Tell me what to change, or say run it.`
      : `Send me the price and the best thing about the property and I'll make the ads.`;
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
      plan: `The free plan makes 3 ads, yours to download. ${upgradeText("plan")}`,
      which: ads.length
        ? "It's too early to tell. The ads run side by side on the same budget, and the one with the cheapest Leads gets the rest. Monday's report will show which."
        : "Once the ads are made, the test decides. They run side by side and the cheapest Leads win.",
      why: ad && WHY[ad.pattern]
        ? `${VERSION_WORD([v], ads)} ${WHY[ad.pattern]}. The ads are different ideas on purpose, so the test teaches you something.`
        : "Each ad takes a different idea about the property, so the test shows which one buyers answer.",
      download: isPaid(ws)
        ? "Yes. Tap the ··· menu at the top of the listing to download the version you're on as a feed or story image, or copy its text."
        : "Yes. Tap the ··· menu at the top of the listing, or Download under the ad, for the feed or story image, or copy its text.",
      results: "Leads appear in Leads as soon as someone fills in the form. Every Monday you get a report: what ran, what it cost and which ad won. There are no numbers until ads have run.",
      help: ads.length
        ? `Tell me what to change on any version in plain words, like "make 2 warmer" or "use photo 3", and I'll do it. When you're ready, say run it.`
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
    // A link the site wouldn't let Hopkins read: whatever they asked, that's the honest answer.
    if (listing.link && !listing.description) {
      await say(ws, listing.id, await fresh(listing.id, [LINK_BLOCKED(), STILL_NEED]));
      return {};
    }
    await say(ws, listing.id, "There are no ads on this listing yet. Tell me the price and the best thing about the property and I'll make them.");
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
      await say(ws, listing.id, `I don't see ${/^(photo|that photo)/.test(c.photoMissing) ? c.photoMissing : `a ${c.photoMissing} photo`} on this listing. Add it here and I'll use it.`);
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
      `Tell me what to change, for example **"navy background"**, **"gold label"**, **"serif font"**, **"text at the top"**, **"bigger text"** or **"photo in a frame"**. Say "all three" to change every version.`,
      `What should it look like? A colour name or a hex code works, and so does a font, a layout or a text size.`,
    ]));
    return {};
  }

  if (intent.kind === "style" && intent.style.face === "on" && !(await hasAgentPhoto(ws))) {
    delete intent.style.face;
    if (!Object.keys(intent.style).length && !intent.sizeStep) { await say(ws, listing.id, ADD_PHOTO); return {}; }
  }
  if (intent.kind === "style") {
    const done = await restyle(ws, listing, intent.versions, intent.style, intent.sizeStep, { readable: true });
    const first = ads.find((a) => done.includes(a.version));
    const { changes: kept, dropped } = keepReadable(cleanStyle(intent.style), first?.style, ws.brand?.primary);
    const bg = first?.style?.bg || ws.brand?.primary || "#1F2A36";
    const why = dropped.length ? `I left the ${dropped.map((d) => (d === "text" ? "text" : "label")).join(" and ")} colour as it was, because ${dropped.map((d) => colourName(intent.style[d])).join(" and ")} wouldn't be readable on ${colourName(bg)}. A ${contrast(bg, "#FFFFFF") > contrast(bg, "#000000") ? "lighter" : "darker"} one will work.` : "";
    const changedAny = Object.keys(kept).length || intent.sizeStep;
    const reply = [changedAny ? `${VERSION_WORD(done, ads)} ${done.length > 1 ? "now have" : "now has"} ${sayLook(kept, intent.sizeStep)}.` : "", why].filter(Boolean).join(" ");
    await say(ws, listing.id, reply, "text", { snapshot: await snapshot(listing, done), ...(Object.keys(kept).length && !kept.reset ? { look: kept } : {}) });
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
    await say(ws, listing.id, await fresh(listing.id, ["When you're ready, say run it and I'll show you the plan first.", "Anytime."]));
    return {};
  }

  // The model was over its limit and the rules can't read it either: ask again, don't pretend
  // the message was unclear.
  if (busy) {
    await say(ws, listing.id, BUSY, "text", { busy: true });
    return {};
  }
  await say(ws, listing.id, await fresh(listing.id, [
    `I didn't understand that. Is it a change to version ${selected}? Say it plainly, like "shorter", "warmer" or "use photo 2".`,
    `I still didn't understand. Try one change at a time, like "new headline: Morning light" or "version 3, use the kitchen photo".`,
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
  await say(ws, listing.id, `Here's the plan: $${plan.budget} over ${plan.days} days${split}. Approve it to run.`, "plan", plan, true);
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
  // Approved ads can't be undone by editing a message.
  await forgetUndo(listingId);
  const plan = safeJson(msg.data, null);
  const ads = (await currentAds(listing)).filter((a) => plan.versions.includes(a.version));
  const now = nowIso();
  await run(`INSERT INTO launches (id, workspace_id, listing_id, ad_ids, budget, days, radius_miles, created_at) VALUES (?,?,?,?,?,?,?,?)`,
    [randomUUID(), ws.id, listingId, JSON.stringify(ads.map((a) => a.id)), plan.budget, plan.days, plan.radius, now]);
  for (const ad of ads) {
    await run(`UPDATE ads SET status = 'approved', updated_at = ? WHERE id = ?`, [now, ad.id]);
    await run(
      `INSERT OR IGNORE INTO tests (id, workspace_id, listing_id, ad_id, home_type, city, price_band, pattern, moment, audience, started_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [randomUUID(), ws.id, listingId, ad.id, listing.home_type, listing.city, priceBand(listing.price, listing.deal), ad.pattern, ad.moment, JSON.stringify(plan.audience), now]
    );
  }
  await clearActions(listingId);
  await say(ws, listingId, `Approved: ${ads.length} ${ads.length === 1 ? "ad" : "ads"}, $${plan.budget} over ${plan.days} days. They go live once Meta is connected. Until then, download them from Ads and post or boost them yourself.`);
  notifyFounder("Hopkins: ads approved", `A workspace approved ${ads.length} ads ($${plan.budget} over ${plan.days} days). Waiting on Meta.`);
  return { ok: true };
}

// ---------- leads ----------

export async function addLead(listing, { name, email, phone, wants, note, adId, source }) {
  name = nameCase(name);
  const ws = await getWorkspace(listing.workspace_id);
  const ad = adId ? await get(`SELECT id, version, name FROM ads WHERE id = ? AND listing_id = ?`, [adId, listing.id]) : null;
  const id = randomUUID();
  await run(
    `INSERT INTO leads (id, workspace_id, listing_id, ad_id, name, email, phone, wants, note, source, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [id, ws.id, listing.id, ad?.id || null, name, email || null, phone || null, wants, note || null, source || null, nowIso()]
  );
  if (ad) await run(`UPDATE tests SET leads = leads + 1 WHERE ad_id = ?`, [ad.id]);
  const what = wants === "showing" ? "wants a showing" : wants === "offer" ? "wants to talk about an offer" : wants === "apply" ? "wants to apply" : "has a question";
  const contact = [phone, email].filter(Boolean).join(", ");
  await say(ws, listing.id, `New Lead${ad ? ` from **Ad ${ad.version}**` : ""}: ${name} ${what}.${contact ? ` ${contact}.` : ""}${note ? ` They wrote: "${note}"` : ""}`, "lead", { leadId: id }, false);
  if (ws.brand.alerts_topic) notifyTopic(ws.brand.alerts_topic, `New Lead · ${listing.address || "your listing"}`, `${name} ${what}. Open Hopkins to reply.`);
  return id;
}

// ---------- the Monday report ----------

export async function weeklyReport(ws, range = weekRange()) {
  const since = range.from, until = range.to;
  const span = new Date(until).getTime() - new Date(since).getTime();
  const leads = await all(
    `SELECT leads.*, listings.address, listings.area, ads.version, ads.pattern, ads.name AS ad_name, ads.overlay AS ad_overlay, ads.photo_id AS ad_photo FROM leads
     JOIN listings ON listings.id = leads.listing_id LEFT JOIN ads ON ads.id = leads.ad_id
     WHERE leads.workspace_id = ? AND leads.created_at >= ? AND leads.created_at < ? ORDER BY leads.created_at DESC`,
    [ws.id, since, until]
  );
  const listings = await all(`SELECT id, title, address, auto_title, area, city, untitled_no, price, deal, status, spend, moment, created_at, (SELECT id FROM photos WHERE listing_id = listings.id ORDER BY position LIMIT 1) AS photo_id FROM listings WHERE workspace_id = ? AND ${PROPERTY()} ORDER BY created_at DESC`, [ws.id]);
  // For the chart and the comparison: the week before, and every lead so far per listing (spend
  // is typed in as a running total, so cost per lead is spend over all its leads, not this week's).
  // The week before, and for a week still going, the same stretch of it so far: Monday 00:00 up
  // to this moment a week ago, so a Tuesday is never compared with a whole week.
  const prevFrom = new Date(new Date(since).getTime() - span);
  const now = Date.now();
  const soFar = now > new Date(since).getTime() && now < new Date(until).getTime();
  const prevTo = soFar ? new Date(prevFrom.getTime() + (now - new Date(since).getTime())) : new Date(since);
  const before = await get(`SELECT COUNT(*) AS n FROM leads WHERE workspace_id = ? AND created_at >= ? AND created_at < ?`, [ws.id, prevFrom.toISOString(), prevTo.toISOString()]);
  // The whole week before, for a week still going (Ismael, 2026-10-28: "7 Leads, up 600%" next to
  // a last week of 9 read as nonsense). A week in progress shows this number, not a percentage.
  const beforeAll = soFar ? await get(`SELECT COUNT(*) AS n FROM leads WHERE workspace_id = ? AND created_at >= ? AND created_at < ?`, [ws.id, prevFrom.toISOString(), since]) : before;
  const allTime = Object.fromEntries((await all(`SELECT listing_id, COUNT(*) AS n FROM leads WHERE workspace_id = ? GROUP BY listing_id`, [ws.id])).map((r) => [r.listing_id, Number(r.n)]));
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
      id: l.id, name: listingTitle(l), status: l.status, deal: l.deal || null, leads: ls.length, photo_id: l.photo_id || null, allLeads: allTime[l.id] || 0,
      showings: ls.filter((x) => x.wants === "showing").length, spend, cpl: spend > 0 && allTime[l.id] ? Math.round((spend / allTime[l.id]) * 100) / 100 : null,
      byVersion, running: launchedIds.has(l.id), drafts: draftIds.has(l.id),
    };
  });
  const total = leads.length;
  const spend = rows.reduce((s, r) => s + r.spend, 0);
  const showings = leads.filter((x) => x.wants === "showing").length;

  // Which kind of ad brought this week's leads.
  const byKind = {};
  for (const x of leads) if (x.pattern) byKind[x.pattern] = (byKind[x.pattern] || 0) + 1;
  const patterns = Object.entries(byKind).map(([pattern, n]) => ({ pattern, leads: n }));
  // The single ads that brought the most Leads this week, best first.
  const byAd = {};
  for (const x of leads) {
    if (!x.ad_id) continue;
    const a = (byAd[x.ad_id] ||= { ad_id: x.ad_id, listing_id: x.listing_id, version: x.version, name: x.ad_name || `Ad ${x.version}`, overlay: x.ad_overlay || "", photo_id: x.ad_photo || null, leads: 0, last: "" });
    a.leads++;
    if (x.created_at > a.last) a.last = x.created_at;
  }
  const topAds = Object.values(byAd).sort((a, b) => b.leads - a.leads || b.last.localeCompare(a.last)).slice(0, 3).map(({ last, ...a }) => a);

  const next = [];
  for (const r of rows) {
    const top = Object.entries(r.byVersion).sort((a, b) => b[1] - a[1])[0];
    if (top && r.leads >= 3 && top[1] / r.leads >= 0.5) next.push(`${top[0]} on ${r.name} brought ${top[1]} of its ${r.leads} Leads. Put the budget behind it.`);
    else if (r.running && r.leads === 0 && r.status === "active") next.push(`No Leads yet on ${r.name}. Try another angle, or a price ad if the price moved.`);
    if (r.drafts && r.status === "active") next.push(`${r.name} has ${r.running ? "new " : ""}ads ready that aren't approved yet.`);
  }
  if (!listings.length) next.push("Send me your first listing: photos and the link or the description.");

  const headline = total
    // No cost per Lead for the week: spend is a running total per listing, so all of it over one
    // week's Leads read as $255.56 a Lead when the listings ran at $31 to $90 (2026-10-28).
    ? `${total} ${total === 1 ? "Lead" : "Leads"}${showings ? `, ${showings} asked for a showing` : ""}.`
    : "No Leads.";
  return { since, until, headline, total, showings, spend, cpl: spend > 0 && total ? Math.round((spend / total) * 100) / 100 : null, listings: rows, leads: leads.slice(0, 20), times: leads.map((x) => x.created_at), lastWeek: Number(before?.n || 0), lastWeekTotal: Number(beforeAll?.n || 0), soFar, patterns, topAds, next: next.slice(0, 5) };
}

// Hopkins messages first: on a Monday, the first time the app is opened, the report is
// already waiting as a message instead of a page the agent has to remember to open.
// The agent's own day: the weekday and the instant their midnight was, in their time zone (sent
// by their browser), so Monday starts at 00:00 where they are, not in UTC.
export function localDay(now = new Date(), tz = "UTC") {
  const p = zoneParts(now, tz);
  if (!p) return localDay(now, "UTC");
  return { weekday: p.weekday, y: p.y, m: p.m, d: p.d, midnight: zonedMidnight(p.y, p.m, p.d, tz) };
}

// The calendar date and clock of an instant in a time zone, or null for a zone that isn't real.
function zoneParts(at, tz) {
  let parts;
  try { parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric", hourCycle: "h23" }).formatToParts(at).map((x) => [x.type, x.value])); }
  catch { return null; }
  return { weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday), y: Number(parts.year), m: Number(parts.month) - 1, d: Number(parts.day), h: Number(parts.hour), min: Number(parts.minute), s: Number(parts.second) };
}

// The exact instant a local date starts in a time zone, clock changes included.
function zonedMidnight(y, m, d, tz) {
  const wall = Date.UTC(y, m, d);
  let t = wall;
  for (let i = 0; i < 3; i++) {
    const p = zoneParts(new Date(t), tz) || zoneParts(new Date(t), "UTC");
    const offset = Date.UTC(p.y, p.m, p.d, p.h, p.min, p.s) - Math.floor(t / 1000) * 1000;
    t = wall - offset;
  }
  return new Date(t);
}

// A Monday to Sunday week in the agent's time zone: this week, or `back` weeks before it.
export function weekRange(now = new Date(), tz = "UTC", back = 0) {
  const day = localDay(now, tz);
  const monday = day.d - ((day.weekday + 6) % 7) - 7 * back;
  const zone = zoneParts(now, tz) ? tz : "UTC";
  return { from: zonedMidnight(day.y, day.m, monday, zone).toISOString(), to: zonedMidnight(day.y, day.m, monday + 7, zone).toISOString() };
}

export async function mondayMessage(ws, now = new Date(), tz = "UTC") {
  const day = localDay(now, tz);
  if (day.weekday !== 1) return;
  const startOfDay = day.midnight.toISOString();
  const already = await get(`SELECT id FROM messages WHERE workspace_id = ? AND listing_id IS NULL AND kind = 'report' AND created_at >= ?`, [ws.id, startOfDay]);
  if (already) return;
  const hasListings = await get(`SELECT id FROM listings WHERE workspace_id = ? LIMIT 1`, [ws.id]);
  if (!hasListings) return;
  const r = await weeklyReport(ws, weekRange(now, tz, 1));
  await say(ws, null, `Your Monday report. Last week: ${r.headline}${r.next[0] ? ` ${r.next[0]}` : ""}`, "report", { headline: r.headline }, false);
}

export async function inbox(ws, tz) {
  await mondayMessage(ws, new Date(), tz);
  await numberUntitled(ws.id);
  const items = await all(
    `SELECT messages.*, listings.title, listings.address, listings.auto_title, listings.area, listings.city, listings.untitled_no FROM messages LEFT JOIN listings ON listings.id = messages.listing_id
     WHERE messages.workspace_id = ? AND (messages.needs_action = 1 OR (messages.kind IN ('lead','report') AND messages.created_at >= ?))
     ORDER BY messages.created_at DESC LIMIT 30`,
    [ws.id, new Date(Date.now() - 7 * 86400_000).toISOString()]
  );
  return items.map((m) => ({ ...m, undo: undefined, data: safeJson(m.data, null) }));
}

export { MOMENTS, formatPrice };
