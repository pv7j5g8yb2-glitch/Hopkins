// Hopkins itself: what happens when a listing comes in, when the agent says something in
// the chat, when they say yes, and when a lead arrives. Routes in server.js stay thin and
// call these.

import { randomUUID, randomBytes } from "node:crypto";
import { run, get, all, nowIso } from "./db.js";
import { parseListingText, readLink, formatPrice, priceBand, labelFromName, FEATURES } from "./listing.js";
import { writeSet, writeVersion, polish, PATTERNS, MOMENTS } from "./writer.js";
import { checkWording, cleanWording, audienceFor } from "./fairhousing.js";
import { readIntent } from "./rules.js";
import { aiEnabled, readListingAI, writeSetAI, chatTurnAI } from "./brain.js";
import { canMake, isPaid, upgradeText } from "./plans.js";
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
    `SELECT id, label, position${withThumb ? ", thumb" : ""} FROM photos WHERE listing_id = ? AND kind = 'listing' ORDER BY position, created_at`,
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

export async function createListing(ws, { text = "", photoIds = [], photoNames = {} }) {
  const link = (text.match(URL_RE) || [])[0] || null;
  const rest = link ? text.replace(link, " ").trim() : text.trim();
  const linkInfo = link ? await readLink(link) : null;
  const source = [rest, linkInfo?.title, linkInfo?.description].filter(Boolean).join("\n");

  const parsed = parseListingText(source);
  if (!parsed.city && ws.brand.city) parsed.city = ws.brand.city;

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

  const shown = [rest, link].filter(Boolean).join("\n");
  await postMessage(ws.id, id, "agent", "text", shown || "New listing", photoIds.length ? { photos: photoIds } : null);

  // With a model, it reads the listing and labels the photos better than the rules can.
  let missing = null;
  if (aiEnabled) {
    const photos = await loadPhotos(id, true);
    const r = await readListingAI({ text: rest, linkInfo, photos });
    if (r) {
      const patch = {};
      for (const k of LISTING_FIELDS) if (r.listing[k] && !(typeof r.listing[k] === "number" && r.listing[k] <= 0)) patch[k] = r.listing[k];
      if (r.listing.features?.length) patch.features = [...new Set([...(listing.features || []), ...r.listing.features])];
      await patchListing(ws.id, id, patch);
      for (const [i, label] of (r.photo_labels || []).entries()) if (photos[i]) await run(`UPDATE photos SET label = ? WHERE id = ?`, [label, photos[i].id]);
      missing = r.missing || null;
    }
  }

  const fresh = await loadListing(ws.id, id);
  if (link && !linkInfo && !fresh.price && !rest) {
    await say(ws, id, "I couldn't open that link (a lot of listing sites block other apps). Paste the description, or tell me the price, beds, baths and the best thing about it, and I'll make the ads.");
    return fresh;
  }
  if (!missing && !fresh.price) missing = "What's the asking price?";
  await makeAds(ws, fresh, "new", {}, { note: missing });
  return fresh;
}

export async function patchListing(workspaceId, id, patch) {
  const sets = [];
  const args = [];
  for (const k of [...LISTING_FIELDS, "status", "moment", "spend"]) {
    if (patch[k] !== undefined) { sets.push(`${k} = ?`); args.push(patch[k]); }
  }
  if (patch.features) { sets.push(`features = ?`); args.push(JSON.stringify(patch.features)); }
  if (!sets.length) return;
  sets.push(`updated_at = ?`); args.push(nowIso());
  await run(`UPDATE listings SET ${sets.join(", ")} WHERE id = ? AND workspace_id = ?`, [...args, id, workspaceId]);
}

// ---------- making ads ----------

function introFor(moment, listing) {
  const where = listing.address || listing.area || "this listing";
  if (moment === "price") return `The price changed on ${where}, so here are 3 new price ads. A new price gives people who scrolled past a reason to look again.`;
  if (moment === "open_house") return `Here are 3 open house ads for ${where}${listing.open_house ? `, ${listing.open_house}` : ""}. Run them in the days before it.`;
  if (moment === "sold") return `Sold, nice. Here are 3 just sold ads for ${where}. They're for people nearby who might sell next.`;
  return `Here are 3 ads for ${where}, each a different idea so the test tells you something: ${PATTERNS.life.name.toLowerCase()}, ${PATTERNS.feature.name.toLowerCase()} and ${PATTERNS.facts.name.toLowerCase()}. Tell me what to change, or press Run it.`;
}

function normalizeAI(ad, photos, fallback) {
  const photo = ad.photo_number > 0 ? photos[ad.photo_number - 1] : null;
  const clean = (s, max) => polish(cleanWording(String(s || ""))).slice(0, max);
  return {
    headline: clean(ad.headline, 60) || fallback.headline,
    primary_text: clean(ad.primary_text, 600) || fallback.primary_text,
    overlay: clean(ad.overlay, 60) || fallback.overlay,
    kicker: clean(ad.kicker, 50),
    photo_id: photo ? photo.id : fallback.photo_id,
  };
}

async function saveAd(ws, listing, moment, version, ad, existing) {
  const now = nowIso();
  if (existing) {
    await run(
      `UPDATE ads SET pattern = ?, headline = ?, primary_text = ?, overlay = ?, kicker = ?, cta = ?, photo_id = ?, style = ?, revision = revision + 1, updated_at = ? WHERE id = ?`,
      [ad.pattern || existing.pattern, ad.headline, ad.primary_text, ad.overlay, ad.kicker || "", ad.cta || existing.cta, ad.photo_id || null, JSON.stringify(ad.style || existing.style || {}), now, existing.id]
    );
    return existing.id;
  }
  const id = randomUUID();
  await run(
    `INSERT INTO ads (id, workspace_id, listing_id, version, moment, pattern, headline, primary_text, overlay, kicker, cta, photo_id, style, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, ws.id, listing.id, version, moment, ad.pattern, ad.headline, ad.primary_text, ad.overlay, ad.kicker || "", ad.cta || "Learn more", ad.photo_id || null, JSON.stringify(ad.style || {}), now, now]
  );
  return id;
}

export async function makeAds(ws, listing, moment = "new", extra = {}, { note = null, aiSet = null } = {}) {
  const existing = await all(`SELECT * FROM ads WHERE listing_id = ? AND moment = ? ORDER BY version`, [listing.id, moment]);
  if (!existing.length && !(await canMake(ws, 3))) {
    // On the free plan a new price or open house can't bring 3 more ads, but the 3 it has
    // still get the new facts: changes to those are included.
    const current = await currentAds(listing);
    if (current.length && (moment === "price" || moment === "open_house")) {
      const photos = await loadPhotos(listing.id);
      const ctx = { listing, photos, brand: ws.brand, moment: listing.moment, extra };
      for (const ad of current) {
        const next = writeVersion(ad.pattern, ctx, { ...ad.style, photoId: ad.photo_id });
        await saveAd(ws, listing, listing.moment, ad.version, { ...ad, ...applyOverrides(next, ad.style) }, ad);
      }
      await say(ws, listing.id, `I've put the ${moment === "price" ? "new price" : "open house"} into your 3 ads. A separate set of ${moment === "price" ? "price" : "open house"} ads would be 3 more, and that's the paid plan.`);
    }
    // Asking again doesn't stack the same message; the app shows a short note instead.
    const last = await get(`SELECT kind FROM messages WHERE listing_id = ? ORDER BY created_at DESC LIMIT 1`, [listing.id]);
    if (last && last.kind === "upgrade") return { upgrade: true, repeat: true };
    if (!current.length) {
      const used = await get(`SELECT l.address, l.area, l.city FROM ads JOIN listings l ON l.id = ads.listing_id WHERE ads.workspace_id = ? AND l.id != ? ORDER BY ads.created_at LIMIT 1`, [ws.id, listing.id]);
      await say(ws, listing.id, upgradeText("saved", { usedOn: used ? used.address || used.area || used.city : null }), "upgrade", { reason: "limit" });
    } else {
      await say(ws, listing.id, upgradeText("limit"), "upgrade", { reason: "limit" });
    }
    return { upgrade: true };
  }
  const photos = await loadPhotos(listing.id, aiEnabled);
  const ctx = { listing, photos, brand: ws.brand, moment, extra };
  const built = writeSet(ctx);
  let set = built;
  let reply = null;
  const r = aiSet || (aiEnabled ? await writeSetAI(ctx) : null);
  if (r?.ads?.length >= 3) {
    set = built.map((b) => {
      const a = r.ads.find((x) => x.version === b.version);
      return a ? { ...b, ...normalizeAI(a, photos, b) } : b;
    });
    reply = r.reply ? polish(r.reply) : null;
  }
  for (const ad of set) {
    await saveAd(ws, listing, moment, ad.version, { ...ad, style: {} }, existing.find((e) => e.version === ad.version));
  }
  await patchListing(ws.id, listing.id, { moment });
  await clearActions(listing.id);
  const body = [reply || introFor(moment, listing), note].filter(Boolean).join(" ");
  await say(ws, listing.id, body, "ads", { moment }, true);

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

const VERSION_WORD = (vs) => (vs.length === 3 ? "All three versions" : vs.length === 2 ? `Versions ${vs[0]} and ${vs[1]}` : `Version ${vs[0]}`);

export async function handleMessage(ws, listingId, text, selected = 1) {
  const listing = await loadListing(ws.id, listingId);
  if (!listing) return null;
  await postMessage(ws.id, listingId, "agent", "text", text);
  const ads = await currentAds(listing);
  const photos = await loadPhotos(listing.id, aiEnabled);

  if (aiEnabled) {
    const history = await all(`SELECT role, body FROM messages WHERE listing_id = ? ORDER BY created_at`, [listingId]);
    const r = await chatTurnAI({ listing, photos, brand: ws.brand, ads, history, message: text, selectedVersion: selected });
    if (r) return applyAI(ws, listing, ads, photos, r);
  }
  return applyRules(ws, listing, ads, photos, text, selected);
}

async function applyAI(ws, listing, ads, photos, r) {
  const patch = {};
  if (r.listing_patch) {
    for (const k of LISTING_FIELDS) {
      const v = r.listing_patch[k];
      if (v && !(typeof v === "number" && v <= 0) && v !== listing[k]) patch[k] = v;
    }
    if (r.listing_patch.features?.length) patch.features = [...new Set(r.listing_patch.features)];
  }
  if (r.action === "run") {
    if (r.reply) await say(ws, listing.id, polish(r.reply));
    return proposeRun(ws, listing, { budget: r.budget || undefined, days: r.days || undefined });
  }
  if (r.action === "new_moment" && r.moment !== "none") {
    const oldPrice = listing.price;
    if (r.moment === "sold") patch.status = "sold";
    await patchListing(ws.id, listing.id, patch);
    if (r.reply) await say(ws, listing.id, polish(r.reply));
    return makeAds(ws, await loadListing(ws.id, listing.id), r.moment, { oldPrice });
  }
  if (Object.keys(patch).length) await patchListing(ws.id, listing.id, patch);
  for (const a of r.ads || []) {
    const ad = ads.find((x) => x.version === a.version);
    if (!ad) continue;
    await saveAd(ws, listing, listing.moment, ad.version, { ...ad, ...normalizeAI(a, photos, ad) }, ad);
  }
  await say(ws, listing.id, polish(r.reply || "Done."));
  return {};
}

async function applyRules(ws, listing, ads, photos, text, selected) {
  const intent = readIntent(text, { selected, photos });
  const sorted = [...photos].sort((a, b) => a.position - b.position);

  if (intent.kind === "run") return proposeRun(ws, listing, { versions: intent.versions, budget: intent.budget, days: intent.days });

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
    await say(ws, listing.id, added.length ? `Got it, ${added.join(" and ")}. I've rewritten the ads with that in.` : "Got it. I've updated the listing and the ads.");
    return {};
  }

  if (intent.kind === "revise") {
    const c = intent.changes;
    if (c.photoMissing) {
      await say(ws, listing.id, `I don't see ${/^photo/.test(c.photoMissing) ? c.photoMissing : `a ${c.photoMissing} photo`} on this listing. Drop it in here and I'll use it.`);
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
    let reply = `${VERSION_WORD(done)} ${done.length > 1 ? what.replace(/^is /, "are ").replace(/^has /, "have ").replace(/^sounds /, "sound ").replace(/^reads /, "read ") : what}.`;
    if (flagged.length) reply += ` One flag: "${flagged[0].term}" ${flagged[0].why}, so I changed it${flagged[0].suggestion ? ` to "${flagged[0].suggestion}"` : ""}.`;
    await say(ws, listing.id, reply);
    return {};
  }

  if (intent.kind === "fair_housing") {
    const issues = ads.flatMap((a) => checkWording(`${a.headline} ${a.overlay} ${a.primary_text}`));
    await say(ws, listing.id, issues.length
      ? `I found ${issues.length} wording ${issues.length === 1 ? "issue" : "issues"}: ${issues.map((i) => `"${i.term}" (${i.why})`).join(", ")}.`
      : "I checked all three against the fair housing wording rules and found nothing. They also run in Meta's Housing category, so there's no age, gender or ZIP code targeting. This is a wording check, not legal advice.");
    return {};
  }

  if (intent.kind === "thanks") {
    await say(ws, listing.id, "When you're happy with them, press Run it and I'll show you the plan first.");
    return {};
  }

  await say(ws, listing.id, `I can change the wording, the line on the image, the headline or the photo, make it shorter, warmer or more premium, try another angle, or set it up to run. Tell me what to do with version ${selected}, or name another.`);
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

export async function proposeRun(ws, listing, { versions = [1, 2, 3], budget, days } = {}) {
  if (!isPaid(ws)) {
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
  const split = plan.versions.length > 1 ? `, split evenly across ${plan.versions.length} versions so the test is fair` : "";
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
  await say(ws, listingId, `Approved. ${ads.length} ${ads.length === 1 ? "ad" : "ads"}, $${plan.budget} over ${plan.days} days. They go live as soon as your Meta ad account is connected, and billing starts then, not before. You don't have to wait: download them under the preview and post or boost them yourself. Each version has its own link, so leads still land here and on the Leads page.`);
  notifyFounder("Hopkins: ads approved", `A workspace approved ${ads.length} ads ($${plan.budget} over ${plan.days} days). Waiting on Meta.`);
  return { ok: true };
}

// ---------- leads ----------

export async function addLead(listing, { name, email, phone, wants, note, adId, source }) {
  const ws = await getWorkspace(listing.workspace_id);
  const ad = adId ? await get(`SELECT id, version FROM ads WHERE id = ? AND listing_id = ?`, [adId, listing.id]) : null;
  const id = randomUUID();
  await run(
    `INSERT INTO leads (id, workspace_id, listing_id, ad_id, name, email, phone, wants, note, source, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [id, ws.id, listing.id, ad?.id || null, name, email || null, phone || null, wants, note || null, source || null, nowIso()]
  );
  if (ad) await run(`UPDATE tests SET leads = leads + 1 WHERE ad_id = ?`, [ad.id]);
  const what = wants === "showing" ? "wants a showing" : wants === "offer" ? "wants to talk about an offer" : "has a question";
  const contact = [phone, email].filter(Boolean).join(", ");
  await say(ws, listing.id, `New lead${ad ? ` from version ${ad.version}` : ""}: ${name} ${what}.${contact ? ` ${contact}.` : ""}${note ? ` They wrote: "${note}"` : ""} A quick reply is the best way to keep a lead warm.`, "lead", { leadId: id }, false);
  if (ws.brand.alerts_topic) notifyTopic(ws.brand.alerts_topic, `New lead · ${listing.address || "your listing"}`, `${name} ${what}. Open Hopkins to reply.`);
  return id;
}

// ---------- the Monday report ----------

export async function weeklyReport(ws, days = 7) {
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const leads = await all(
    `SELECT leads.*, listings.address, listings.area, ads.version, ads.pattern FROM leads
     JOIN listings ON listings.id = leads.listing_id LEFT JOIN ads ON ads.id = leads.ad_id
     WHERE leads.workspace_id = ? AND leads.created_at >= ? ORDER BY leads.created_at DESC`,
    [ws.id, since]
  );
  const listings = await all(`SELECT id, address, area, city, price, status, spend, moment, created_at FROM listings WHERE workspace_id = ? ORDER BY created_at DESC`, [ws.id]);
  const launched = await all(`SELECT DISTINCT listing_id FROM launches WHERE workspace_id = ?`, [ws.id]);
  const launchedIds = new Set(launched.map((r) => r.listing_id));
  const drafts = await all(`SELECT DISTINCT listing_id FROM ads WHERE workspace_id = ? AND status = 'draft'`, [ws.id]);
  const draftIds = new Set(drafts.map((r) => r.listing_id));

  const rows = listings.map((l) => {
    const ls = leads.filter((x) => x.listing_id === l.id);
    const byVersion = {};
    for (const x of ls) if (x.version) byVersion[x.version] = (byVersion[x.version] || 0) + 1;
    const spend = Number(l.spend || 0);
    return {
      id: l.id, name: l.address || l.area || l.city || "Listing", status: l.status, leads: ls.length,
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
    if (top && r.leads >= 3 && top[1] / r.leads >= 0.5) next.push(`Version ${top[0]} on ${r.name} brought ${top[1]} of its ${r.leads} leads. Put the budget behind it.`);
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
  const items = await all(
    `SELECT messages.*, listings.address, listings.area, listings.city FROM messages LEFT JOIN listings ON listings.id = messages.listing_id
     WHERE messages.workspace_id = ? AND (messages.needs_action = 1 OR (messages.kind IN ('lead','report') AND messages.created_at >= ?))
     ORDER BY messages.created_at DESC LIMIT 30`,
    [ws.id, new Date(Date.now() - 7 * 86400_000).toISOString()]
  );
  return items.map((m) => ({ ...m, data: safeJson(m.data, null) }));
}

export { MOMENTS, formatPrice };
