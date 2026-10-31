// A demo account for the founder (Ismael, 2026-10-28): one agent with real looking listings, ads,
// approved runs, Leads over several weeks, spend and a sold home, so every screen can be seen full.
// Built fresh each time it's opened, with every date counted back from now in the founder's own
// time zone, so "this week" always has Leads in it. The ads are written here, not by the model:
// instant, the same every time, and no AI calls spent on it. Photos: Unsplash (free licence).
import { randomUUID, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { run, get } from "./db.js";
import { hashPassword } from "./auth.js";
import { weekRange } from "./hopkins.js";
import { priceBand } from "./listing.js";

const PHOTOS = join(dirname(fileURLToPath(import.meta.url)), "..", "demo", "photos");
const DAY = 86400_000, HOUR = 3600_000;

export const DEMO_DOMAIN = "@hopkins.demo";
export const demoEmail = (adminId) => `demo+${String(adminId).slice(0, 8)}${DEMO_DOMAIN}`;

const BRAND = {
  business: "Mitchell Home Group", agent_name: "Sarah Mitchell", city: "Austin", country: "United States", instagram: "@mitchellhomegroup",
  phone: "(512) 555 0142", voice: "plain", primary: "#1F2A36", accent: "#C8A96A", font: "modern", setup_done: true,
};

// weeks: Leads in each Monday to Sunday week, oldest first, the last one being this week so far.
const LISTINGS = [
  {
    key: "westover", address: "2814 Westover Hills Dr", area: "Westover Hills", price: 1295000, beds: 4, baths: 3, sqft: 3120, home_type: "house", age: 40,
    features: ["heated pool", "open plan kitchen", "floor to ceiling windows", "two car garage"],
    text: "2814 Westover Hills Dr, Austin. 4 bed, 3 bath, 3,120 sq ft. Heated pool off the kitchen, floor to ceiling windows, two car garage. $1,295,000",
    photos: ["westover-1", "westover-2", "westover-3"], run: { ago: 37, budget: 1200, days: 60 }, spend: 620, weeks: [2, 3, 4, 3, 5, 3],
    ads: [
      { name: "The pool at golden hour", pattern: "life", photo: 0, overlay: "Swim before dinner, every night.", headline: "A pool you'll use every day", kicker: "Just listed · Westover Hills", text: "2814 Westover Hills Dr. A heated pool right off the kitchen, so a swim fits into any evening. 4 bed, 3 bath, 3,120 sq ft. $1,295,000. Tap to see the photos and book a showing." },
      { name: "The kitchen", pattern: "feature", photo: 2, overlay: "The kitchen opens onto the pool.", headline: "Cook with the doors open", kicker: "Just listed · Westover Hills", text: "Floor to ceiling glass opens the kitchen straight onto the pool deck. 4 bed, 3 bath in Westover Hills. $1,295,000. Tap to see the photos." },
      { name: "The price", pattern: "facts", photo: 1, overlay: "Westover Hills, 4 bed.", headline: "$1,295,000 in Westover Hills", kicker: "4 bed · 3 bath · 3,120 sq ft", text: "4 bed, 3 bath, 3,120 sq ft with a heated pool and a two car garage. $1,295,000. Book a showing this week." },
    ],
  },
  {
    key: "travis", address: "1107 Travis Heights Blvd", area: "Travis Heights", price: 849000, beds: 3, baths: 2, sqft: 1980, home_type: "house", age: 33,
    features: ["wraparound porch", "original hardwood floors", "renovated kitchen"],
    text: "1107 Travis Heights Blvd, Austin. 3 bed, 2 bath, 1,980 sq ft craftsman. Wraparound porch, original hardwood floors, renovated kitchen. $849,000",
    photos: ["travis-1", "travis-2", "travis-3"], run: { ago: 30, budget: 900, days: 60 }, spend: 380, weeks: [0, 2, 2, 3, 2, 2],
    ads: [
      { name: "The porch", pattern: "life", photo: 0, overlay: "Coffee on the wraparound porch.", headline: "Mornings start on the porch", kicker: "Just listed · Travis Heights", text: "1107 Travis Heights Blvd. A craftsman with a wraparound porch, original hardwood floors and a renovated kitchen. 3 bed, 2 bath. $849,000. Tap to book a showing." },
      { name: "The light", pattern: "feature", photo: 2, overlay: "Light in every room.", headline: "Big windows, original floors", kicker: "Just listed · Travis Heights", text: "Tall windows and original hardwood floors throughout. 3 bed, 2 bath, 1,980 sq ft in Travis Heights. $849,000." },
      { name: "The price", pattern: "facts", photo: 1, overlay: "Travis Heights craftsman.", headline: "$849,000 in Travis Heights", kicker: "3 bed · 2 bath · 1,980 sq ft", text: "3 bed, 2 bath craftsman with a wraparound porch. $849,000. Book a showing this week." },
    ],
  },
  {
    key: "hydepark", address: "4503 Avenue F", area: "Hyde Park", price: 575000, beds: 2, baths: 1, sqft: 1150, home_type: "house", age: 26,
    features: ["1920s cottage", "fully renovated", "reading nook"],
    text: "4503 Avenue F, Hyde Park, Austin. 2 bed, 1 bath, 1,150 sq ft 1920s cottage, fully renovated. $575,000",
    photos: ["hydepark-1", "hydepark-2"], run: { ago: 24, budget: 300, days: 30 }, spend: 140, weeks: [0, 0, 1, 1, 1, 1],
    ads: [
      { name: "The cottage", pattern: "life", photo: 0, overlay: "A 1920s cottage, fully redone.", headline: "Old house, new everything", kicker: "Just listed · Hyde Park", text: "4503 Avenue F. A 1920s cottage, renovated top to bottom. 2 bed, 1 bath, 1,150 sq ft. $575,000. Tap to see the photos." },
      { name: "The reading corner", pattern: "feature", photo: 1, overlay: "A corner made for reading.", headline: "Morning light, a good chair", kicker: "Just listed · Hyde Park", text: "A bright corner by the window, built in shelves, room to slow down. 2 bed cottage in Hyde Park. $575,000." },
      { name: "The price", pattern: "facts", photo: 0, overlay: "Hyde Park cottage.", headline: "$575,000 in Hyde Park", kicker: "2 bed · 1 bath · 1,150 sq ft", text: "2 bed, 1 bath, fully renovated 1920s cottage. $575,000. Book a showing this week." },
    ],
  },
  {
    key: "lakeway", address: "9 Lakeway Shores Ct", city: "Lakeway", area: "Lakeway", price: 2450000, beds: 5, baths: 4, sqft: 4600, home_type: "house", age: 39, sold: 12,
    features: ["infinity pool", "hill country views", "outdoor kitchen"],
    text: "9 Lakeway Shores Ct, Lakeway. 5 bed, 4 bath, 4,600 sq ft. Pool and spa, Hill Country views, outdoor kitchen. $2,450,000",
    photos: ["lakeway-1", "lakeway-2", "lakeway-3"], run: { ago: 36, budget: 900, days: 21 }, spend: 900, weeks: [3, 2, 4, 1, 0, 0],
    ads: [
      { name: "Sunset from the pool", pattern: "life", photo: 0, overlay: "Every sunset, from the pool.", headline: "The best seat for sunset", kicker: "Just listed · Lakeway", text: "9 Lakeway Shores Ct. A pool and spa facing west over the hills. 5 bed, 4 bath, 4,600 sq ft. $2,450,000. Tap to book a private showing." },
      { name: "The view", pattern: "feature", photo: 1, overlay: "Hill Country on every side.", headline: "Views from every room", kicker: "Just listed · Lakeway", text: "Glass on every side and the hills beyond. 5 bed, 4 bath with an outdoor kitchen. $2,450,000." },
      { name: "The price", pattern: "facts", photo: 2, overlay: "Lakeway, 5 bed.", headline: "$2,450,000 in Lakeway", kicker: "5 bed · 4 bath · 4,600 sq ft", text: "5 bed, 4 bath, 4,600 sq ft with a pool, spa and outdoor kitchen. $2,450,000." },
    ],
  },
  {
    key: "barton", address: "1200 Barton Hills Dr", area: "Barton Hills", price: 689000, beds: 3, baths: 2, sqft: 1860, home_type: "house", age: 21,
    features: ["brick front", "two car garage", "big back yard"],
    text: "1200 Barton Hills Dr, Austin. 3 bed, 2 bath, 1,860 sq ft brick home, two car garage, big back yard. $689,000",
    photos: ["barton-1", "barton-2"], run: { ago: 19, budget: 300, days: 30 }, spend: 260, weeks: [0, 0, 0, 2, 1, 1],
    ads: [
      { name: "The quiet street", pattern: "life", photo: 0, overlay: "A quiet street in Barton Hills.", headline: "Room to breathe in Barton Hills", kicker: "Just listed · Barton Hills", text: "1200 Barton Hills Dr. Brick, a two car garage and a big back yard on a quiet street. 3 bed, 2 bath. $689,000. Tap to see the photos." },
      { name: "The back yard", pattern: "feature", photo: 1, overlay: "A back yard with room to grow.", headline: "The yard is the bonus room", kicker: "Just listed · Barton Hills", text: "A deep back yard with space for a garden, a fire pit or both. 3 bed, 2 bath in Barton Hills. $689,000." },
      { name: "The price", pattern: "facts", photo: 0, overlay: "Barton Hills, 3 bed.", headline: "$689,000 in Barton Hills", kicker: "3 bed · 2 bath · 1,860 sq ft", text: "3 bed, 2 bath brick home with a two car garage. $689,000. Book a showing this week." },
    ],
  },
  {
    key: "bullcreek", address: "6210 Bull Creek Rd", area: "Bull Creek", price: 1050000, beds: 4, baths: 3, sqft: 2900, home_type: "house", age: 3,
    features: ["cedar and glass", "new build", "covered patio"],
    text: "6210 Bull Creek Rd, Austin. 4 bed, 3 bath, 2,900 sq ft new build in cedar and glass, covered patio. $1,050,000",
    photos: ["bullcreek-1", "bullcreek-2"], weeks: [0, 0, 0, 0, 0, 0],
    ads: [
      { name: "Cedar and glass", pattern: "feature", photo: 0, overlay: "Cedar, glass and a quiet street.", headline: "A new build on Bull Creek", kicker: "Just listed · Bull Creek", text: "6210 Bull Creek Rd. New construction in cedar and glass. 4 bed, 3 bath, 2,900 sq ft. $1,050,000. Tap to see the photos." },
      { name: "Evenings outside", pattern: "life", photo: 1, overlay: "Dinner under the oaks.", headline: "The patio is lit by eight", kicker: "Just listed · Bull Creek", text: "A covered patio under old oaks, lit for long evenings. 4 bed, 3 bath. $1,050,000." },
      { name: "The price", pattern: "facts", photo: 0, overlay: "Bull Creek, new build.", headline: "$1,050,000 on Bull Creek", kicker: "4 bed · 3 bath · 2,900 sq ft", text: "4 bed, 3 bath new build with a covered patio. $1,050,000. Book a showing this week." },
    ],
  },
  {
    key: "shoalcreek", address: "3301 Shoal Creek Blvd", area: "Shoal Creek", price: 925000, beds: 3, baths: 2.5, sqft: 2240, home_type: "house", age: 1,
    features: ["open living room", "lit garden", "home office"],
    text: "3301 Shoal Creek Blvd, Austin. 3 bed, 2.5 bath, 2,240 sq ft. Open living room, home office, lit garden. $925,000",
    photos: ["shoalcreek-1", "shoalcreek-2"], weeks: [0, 0, 0, 0, 0, 0],
    ads: [
      { name: "Home at dusk", pattern: "life", photo: 0, overlay: "Home before the lights come on.", headline: "Evenings on Shoal Creek", kicker: "Just listed · Shoal Creek", text: "3301 Shoal Creek Blvd. A lit garden and big windows that glow at dusk. 3 bed, 2.5 bath, 2,240 sq ft. $925,000. Tap to see the photos." },
      { name: "The big room", pattern: "feature", photo: 1, overlay: "One room for everything.", headline: "Cook, eat and sit in one room", kicker: "Just listed · Shoal Creek", text: "An open living room with the kitchen at one end and a home office off it. 3 bed, 2.5 bath. $925,000." },
      { name: "The price", pattern: "facts", photo: 0, overlay: "Shoal Creek, 3 bed.", headline: "$925,000 on Shoal Creek", kicker: "3 bed · 2.5 bath · 2,240 sq ft", text: "3 bed, 2.5 bath with a home office and a lit garden. $925,000. Book a showing this week." },
    ],
  },
];

const PEOPLE = ["Dana Price", "Marcus Lee", "Priya Shah", "Tom Alvarez", "Grace Kim", "Jordan Bell", "Elena Rossi", "Sam Carter", "Nina Patel", "Owen Brooks", "Maya Chen", "Luis Ortega", "Hannah Wright", "Ben Foster", "Ava Collins", "Chris Moreno", "Ruth Adler", "Leo Grant", "Ivy Sanders", "Noah Park"];
const WANTS = ["showing", "info", "showing", "offer", "info", "showing"];
const WANT_WORDS = { showing: "wants a showing", info: "has a question", offer: "wants to talk about an offer" };
const AD_PICK = [0, 0, 1, 0, 2, 0, 1, 0];

const iso = (t) => new Date(t).toISOString();
const slug = (s) => `${s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${randomBytes(3).toString("hex")}`;
const money = (n) => `$${Number(n).toLocaleString("en-US")}`;
const photoBytes = (key) => ({ full: readFileSync(join(PHOTOS, `${key}.jpg`)), thumb: readFileSync(join(PHOTOS, `${key}.th.jpg`)) });
let order = 0;
const msg = (wsId, listingId, role, kind, body, at, data = null, needs = 0) =>
  run(`INSERT INTO messages (id, workspace_id, listing_id, role, kind, body, data, needs_action, created_at) VALUES (?,?,?,?,?,?,?,?,?)`,
    [randomUUID(), wsId, listingId, role, kind, body, data ? JSON.stringify(data) : null, needs, iso(at + (order++ % 1000))]);

// Removes the founder's earlier demo, if any, with everything in it.
export async function clearDemo(adminId) {
  const old = await get(`SELECT workspace_id FROM users WHERE email = ?`, [demoEmail(adminId)]);
  if (!old) return;
  for (const t of ["leads", "tests", "launches", "ads", "messages", "photos", "listings", "feedback", "users"]) await run(`DELETE FROM ${t} WHERE workspace_id = ?`, [old.workspace_id]);
  await run(`DELETE FROM workspaces WHERE id = ?`, [old.workspace_id]);
}

// Builds the demo and returns its user's id.
export async function buildDemo(adminId, tz = "UTC", now = Date.now()) {
  await clearDemo(adminId);
  const wsId = randomUUID(), userId = randomUUID();
  await run(`INSERT INTO workspaces (id, name, plan, brand, created_at) VALUES (?,?,?,?,?)`, [wsId, BRAND.business, "paid", JSON.stringify(BRAND), iso(now - 42 * DAY)]);
  await run(`INSERT INTO users (id, workspace_id, email, name, pass_hash, created_at) VALUES (?,?,?,?,?,?)`,
    [userId, wsId, demoEmail(adminId), BRAND.agent_name, await hashPassword(randomBytes(24).toString("hex")), iso(now - 42 * DAY)]);
  // Monday 00:00 of each of the last six weeks where the founder is, oldest first.
  const weeks = [5, 4, 3, 2, 1, 0].map((back) => new Date(weekRange(new Date(now), tz, back).from).getTime());
  let person = 0;
  for (const L of LISTINGS) {
    const id = randomUUID(), made = now - L.age * DAY - 3 * HOUR;
    await run(
      `INSERT INTO listings (id, workspace_id, slug, address, city, area, price, beds, baths, sqft, home_type, features, description, status, moment, spend, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, wsId, slug(L.address), L.address, L.city || "Austin", L.area, L.price, L.beds, L.baths, L.sqft, L.home_type, JSON.stringify(L.features), L.text, L.sold ? "sold" : "active", "new", L.spend || 0, iso(made), iso(made)]);
    const photoIds = [];
    for (const [i, key] of L.photos.entries()) {
      const p = photoBytes(key), pid = randomUUID();
      await run(`INSERT INTO photos (id, workspace_id, listing_id, kind, label, position, mime, data, thumb, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`, [pid, wsId, id, "listing", null, i, "image/jpeg", p.full, p.thumb, iso(made)]);
      photoIds.push(pid);
    }
    const approved = Boolean(L.run);
    const ads = [];
    for (const [i, a] of L.ads.entries()) {
      const adId = randomUUID();
      const ad = { version: i + 1, name: a.name, pattern: a.pattern, headline: a.headline, primary_text: a.text, overlay: a.overlay, kicker: a.kicker, cta: "Learn more", photo_id: photoIds[a.photo] || photoIds[0], style: {} };
      await run(`INSERT INTO ads (id, workspace_id, listing_id, version, moment, name, pattern, headline, primary_text, overlay, kicker, cta, photo_id, status, style, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [adId, wsId, id, ad.version, "new", ad.name, ad.pattern, ad.headline, ad.primary_text, ad.overlay, ad.kicker, ad.cta, ad.photo_id, approved ? "approved" : "draft", "{}", iso(made + 60_000), iso(made + 60_000)]);
      ads.push({ ...ad, id: adId });
    }
    // The chat: the agent's message, the ads, and for the ones that ran, the yes.
    await msg(wsId, id, "agent", "text", L.text, made, { first: true, photos: photoIds });
    const list = ads.map((a) => `- **Ad ${a.version}**: ${a.name}`).join("\n");
    await msg(wsId, id, "hopkins", "ads", `Here are 3 ads for ${L.address}, each testing a different idea:\n\n${list}\n\nTell me what to change, or tap Run ad.`, made + 60_000, { moment: "new", snapshot: ads.map(({ id: _, ...a }) => a) }, approved ? 0 : 1);
    if (approved) {
      const at = now - L.run.ago * DAY;
      await run(`INSERT INTO launches (id, workspace_id, listing_id, ad_ids, budget, days, radius_miles, created_at) VALUES (?,?,?,?,?,?,?,?)`, [randomUUID(), wsId, id, JSON.stringify(ads.map((a) => a.id)), L.run.budget, L.run.days, 15, iso(at)]);
      await msg(wsId, id, "agent", "text", "run it", at - 5 * 60_000);
      await msg(wsId, id, "hopkins", "text", `Approved. 3 ads, ${money(L.run.budget)} over ${L.run.days} days. They go live as soon as your Meta ad account is connected. Each ad has its own link, so Leads land here and on the Leads page.`, at);
    }
    // Leads, week by week, at set hours so the same demo looks the same every time.
    const counts = new Array(ads.length).fill(0);
    const launchAt = approved ? now - L.run.ago * DAY : 0, soldAt = L.sold ? now - L.sold * DAY : Infinity;
    let lastAt = approved ? launchAt : made + 60_000;
    for (const [w, n] of L.weeks.entries()) {
      for (let k = 0; k < n; k++) {
        const start = weeks[w];
        let t = w === 5
          ? start + ((now - start) * (k + 1)) / (n + 1)
          : start + ((k * 37 + w * 11) % 6) * DAY + (9 + ((k * 5 + w * 3) % 11)) * HOUR;
        // Never before its run started or after it sold.
        if (t < launchAt) t = launchAt + (k + 2) * HOUR;
        if (t > soldAt) t = soldAt - (k + 2) * HOUR;
        if (!approved || t <= start || t >= now) continue;
        lastAt = Math.max(lastAt, t);
        const name = PEOPLE[person % PEOPLE.length], wants = WANTS[person % WANTS.length];
        const ad = ads[AD_PICK[person % AD_PICK.length]];
        counts[ad.version - 1]++;
        const fresh = now - t < 3 * DAY;
        const status = fresh ? "new" : ["contacted", "showing", "contacted", "offer", "not_a_fit", "closed"][person % 6];
        const phone = `512 555 01${String(10 + (person % 90)).padStart(2, "0")}`;
        await run(`INSERT INTO leads (id, workspace_id, listing_id, ad_id, name, email, phone, wants, note, status, source, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
          [randomUUID(), wsId, id, ad.id, name, `${name.split(" ")[0].toLowerCase()}@example.com`, phone, wants, null, status, "ad", iso(t)]);
        await msg(wsId, id, "hopkins", "lead", `New Lead from **Ad ${ad.version}**: ${name} ${WANT_WORDS[wants]}. ${phone}.`, t);
        person++;
      }
    }
    if (approved) {
      for (const ad of ads) {
        await run(`INSERT INTO tests (id, workspace_id, listing_id, ad_id, home_type, city, price_band, pattern, moment, audience, leads, started_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
          [randomUUID(), wsId, id, ad.id, L.home_type, L.city || "Austin", priceBand(L.price), ad.pattern, "new", "{}", counts[ad.version - 1], iso(now - L.run.ago * DAY)]);
      }
    }
    if (L.sold) {
      await msg(wsId, id, "hopkins", "text", "Marked as sold. The ads stopped with it.", soldAt);
      lastAt = Math.max(lastAt, soldAt);
    }
    await run(`UPDATE listings SET updated_at = ? WHERE id = ?`, [iso(lastAt), id]);
  }
  return userId;
}
