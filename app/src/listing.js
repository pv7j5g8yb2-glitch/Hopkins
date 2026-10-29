// Reading a listing from whatever the agent sends: a pasted description, a link, or both.
// Claude does this better when a key is set (see brain.js); this is the built-in reader
// that always works, so a listing never gets stuck waiting on a model.

// Features Hopkins knows how to sell. Each one has the words that reveal it in a
// description, the photo it wants, a short name, and two lines: the life it gives (for the
// lifestyle ad) and the detail itself (for the standout ad). Lines describe the home, never
// the buyer, so they stay clear of fair housing trouble.
export const FEATURES = [
  { key: "porch", re: /\b(wrap[- ]?around porch|front porch|porch|veranda)\b/i, photo: "exterior", name: "the porch", life: "Slow mornings on the porch.", detail: "A porch made for sitting out." },
  { key: "garden", re: /\b(garden|backyard|back yard|landscaped yard|fenced yard|private yard|yard)\b/i, photo: "garden", name: "the yard", life: "Weekends in your own garden.", detail: "A yard with real room in it." },
  { key: "pool", re: /\b(pool|swimming pool|plunge pool)\b/i, photo: "pool", name: "the pool", life: "Summer starts in the back yard.", detail: "Your own pool, steps from the kitchen." },
  { key: "view", re: /\b(views?|ocean view|water view|mountain view|city view|skyline)\b/i, photo: "view", name: "the view", life: "Coffee with a view, every day.", detail: "The view sells itself." },
  { key: "kitchen", re: /\b(chef'?s kitchen|renovated kitchen|updated kitchen|kitchen island|quartz|granite|new kitchen|open kitchen)\b/i, photo: "kitchen", name: "the kitchen", life: "Long dinners around the island.", detail: "A kitchen worth cooking in." },
  { key: "fireplace", re: /\b(fireplace|wood ?stove|wood burning)\b/i, photo: "living", name: "the fireplace", life: "Winter nights by the fire.", detail: "A real fireplace in the living room." },
  { key: "light", re: /\b(natural light|light[- ]filled|sun[- ]?(lit|filled|drenched)|skylights?|bright)\b/i, photo: "living", name: "the light", life: "Light in every room, all day.", detail: "Big windows, a lot of light." },
  { key: "office", re: /\b(home office|office|study|den)\b/i, photo: "office", name: "the office", life: "A real office, with a door that closes.", detail: "A separate room to work from." },
  { key: "garage", re: /\b(\d[- ]car garage|garage|workshop)\b/i, photo: "exterior", name: "the garage", life: "Room for the car and the projects.", detail: "A garage with space to spare." },
  { key: "deck", re: /\b(deck|patio|terrace|balcony|rooftop)\b/i, photo: "outdoor", name: "the deck", life: "Dinner outside on warm nights.", detail: "Outdoor space you'll actually use." },
  { key: "walk", re: /\b(walk(able)? to|walking distance|steps (from|to)|blocks? (from|to))\b/i, photo: "exterior", name: "the location", life: "Leave the car at home.", detail: "Everything you need, a short walk away." },
  { key: "water", re: /\b(waterfront|lakefront|beachfront|on the water|lake access|beach access|dock)\b/i, photo: "view", name: "the water", life: "Mornings on the water.", detail: "Right on the water." },
  { key: "renovated", re: /\b(fully renovated|renovated|remodeled|remodelled|updated throughout|move[- ]in ready|turnkey|new roof)\b/i, photo: "living", name: "the renovation", life: "Move in and unpack. Nothing to fix.", detail: "Renovated, so the work is done." },
  { key: "suite", re: /\b(primary suite|owner'?s suite|en[- ]?suite|walk[- ]in closet)\b/i, photo: "bedroom", name: "the primary suite", life: "A bedroom that feels like a hotel.", detail: "A primary suite with its own bath." },
  { key: "bath", re: /\b(soaking tub|spa bath|freestanding tub|rain shower|heated floors?)\b/i, photo: "bathroom", name: "the bath", life: "A bath you'll look forward to.", detail: "A bathroom with a proper tub." },
  { key: "ceilings", re: /\b(high ceilings|vaulted ceilings?|cathedral ceilings?|beams?)\b/i, photo: "living", name: "the ceilings", life: "Ceilings high enough to breathe.", detail: "Vaulted ceilings that open the room up." },
  { key: "acreage", re: /\b(\d+(\.\d+)? acres?|acreage|land)\b/i, photo: "exterior", name: "the land", life: "Room to breathe, and no one next door.", detail: "Land, and a lot of it." },
  { key: "adu", re: /\b(adu|guest house|guest suite|in[- ]law|casita|granny flat|basement apartment)\b/i, photo: "exterior", name: "the guest space", life: "Space for guests, or for rent.", detail: "A separate guest space on the lot." },
  { key: "historic", re: /\b(historic|character|original details|craftsman|victorian|brownstone|period features)\b/i, photo: "exterior", name: "the character", life: "A home with a story to it.", detail: "Original details, kept and cared for." },
  { key: "new_build", re: /\b(new construction|new build|newly built|brand new)\b/i, photo: "exterior", name: "the build", life: "Brand new, and yours first.", detail: "New construction, never lived in." },
  { key: "storage", re: /\b(storage|pantry|mudroom|laundry room)\b/i, photo: "kitchen", name: "the storage", life: "A place for everything, finally.", detail: "Storage in all the right places." },
  { key: "gym", re: /\b(gym|fitness (room|center)|home gym)\b/i, photo: "living", name: "the gym", life: "The gym is downstairs.", detail: "A gym in the building." },
  { key: "parking", re: /\b(parking|parking spot|driveway)\b/i, photo: "exterior", name: "the parking", life: "Parking, sorted.", detail: "Parking included." },
];

export const PHOTO_LABELS = ["exterior", "living", "kitchen", "bedroom", "bathroom", "garden", "pool", "view", "outdoor", "office", "other"];

// A photo's file name often says what it is ("kitchen-2.jpg"). Used when no model labels it.
export function labelFromName(name = "") {
  const n = name.toLowerCase();
  const map = [
    ["kitchen", /kitchen|island|cook/], ["living", /living|lounge|family room|sitting|great room|dining/], ["bedroom", /bed|suite/],
    ["bathroom", /bath|shower|ensuite|toilet|wc/], ["pool", /pool/], ["garden", /garden|yard|lawn|backyard/],
    ["view", /view|ocean|lake|skyline|sea/], ["outdoor", /deck|patio|terrace|balcony|porch/], ["office", /office|study|den/],
    ["exterior", /exterior|front|outside|facade|street|aerial|drone|house|home/],
  ];
  for (const [label, re] of map) if (re.test(n)) return label;
  return null;
}

const num = (s) => Number(String(s).replace(/,/g, ""));

// The currency a price was written in (2026-10-28: "€1,250,000" became $1,250,000). Dollars
// stay the default, so only the others are named.
const CURRENCIES = [["EUR", /€|\beur\b|\beuros?\b/i], ["GBP", /£|\bgbp\b|\bpounds?\b/i], ["AED", /\baed\b|\bdirhams?\b/i], ["CAD", /\bca?\$|\bcad\b/i], ["AUD", /\ba\$|\baud\b/i]];
// A plain "$" in Canada is Canadian dollars: a Canadian postal code or province says so (a
// Vancouver listing on Zillow read as US dollars, 2026-10-28).
const CANADA = /\b[ABCEGHJ-NPRSTVXY]\d[A-Z] ?\d[A-Z]\d\b|,\s*(BC|AB|SK|MB|ON|QC|NB|NS|PE|NL|YT|NT|NU)\b|\b(British Columbia|Alberta|Saskatchewan|Manitoba|Ontario|Qu[eé]bec|Nova Scotia|New Brunswick|Prince Edward Island|Newfoundland)\b/;
export function parseCurrency(text) {
  for (const [code, re] of CURRENCIES) if (re.test(text || "")) return code;
  if (CANADA.test(text || "")) return "CAD";
  return null;
}
const SYMBOL = { EUR: "€", GBP: "£", AED: "AED ", CAD: "$", AUD: "$" };
const sym = (cur) => SYMBOL[cur] || "$";

export function parsePrice(text) {
  // "1.250.000 €": dots as thousands, the way most of Europe writes it.
  const eu = text.match(/(?:€|eur)\s?(\d{1,3}(?:\.\d{3})+)(?!\d)|\b(\d{1,3}(?:\.\d{3})+)\s?(?:€|eur|euros?)/i);
  if (eu) { const v = Number((eu[1] || eu[2]).replace(/\./g, "")); if (v >= 10_000 && v < 1_000_000_000) return v; }
  const m = text.match(/(?:\$|€|£|\baed\s?)\s?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(k|m|mm|million|thousand)?\b/i) ||
    text.match(/\b(\d{1,3}(?:,\d{3}){1,2})\s*(?:dollars|usd|euros?|eur|pounds|gbp|aed|dirhams)?\b/i);
  if (!m) return null;
  let v = num(m[1]);
  const unit = (m[2] || "").toLowerCase();
  if (unit === "k" || unit === "thousand") v *= 1000;
  if (unit === "m" || unit === "mm" || unit === "million") v *= 1_000_000;
  return v >= 10_000 && v < 1_000_000_000 ? Math.round(v) : null;
}

export function parseListingText(text = "") {
  const t = text.replace(/\s+/g, " ").trim();
  const out = { features: [] };
  out.price = parsePrice(t);
  if (out.price) out.currency = parseCurrency(t);
  const beds = t.match(/(\d+(?:\.\d)?)\s*-?\s*(?:bed(room)?s?|bd|br)\b/i);
  if (beds) out.beds = Number(beds[1]);
  const baths = t.match(/(\d+(?:\.\d)?)\s*-?\s*(?:bath(room)?s?|ba)\b/i);
  if (baths) out.baths = Number(baths[1]);
  const sqft = t.match(/(\d{1,2},?\d{3}|\d{3,4})\s*(?:sq\.?\s?ft|square feet|sqft|sf)\b/i);
  if (sqft) out.sqft = num(sqft[1]);
  // An address is a number and a street name ending in a street word.
  const addr = t.match(/\b(\d{1,6}\s+(?:[A-Z][\w'.]*\s){0,4}(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Court|Ct|Boulevard|Blvd|Way|Place|Pl|Terrace|Ter|Circle|Cir|Parkway|Pkwy|Trail|Trl|Highway|Hwy|Crescent|Close|Square|Sq))\b\.?/);
  if (addr) out.address = addr[1];
  // "in Riverside", "in the Heights neighborhood", "Austin, TX"
  const cityState = t.match(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)?),\s?([A-Z]{2})\b/);
  if (cityState) out.city = cityState[1];
  const area = t.match(/\bin (?:the )?([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})(?: neighbou?rhood| area| district)?\b/);
  if (area && !/^(The|A|An|This|Our|Your)$/.test(area[1]) && area[1] !== out.city) out.area = area[1];
  const type = t.match(/\b(single[- ]family|condo(minium)?|townhou?se|townhome|duplex|bungalow|ranch|cottage|loft|apartment|penthouse|cabin|farmhouse|colonial|craftsman|victorian|brownstone|villa)\b/i);
  if (type) out.home_type = type[1].toLowerCase().replace("-", " ").replace("condominium", "condo").replace("townhome", "townhouse");
  for (const f of FEATURES) if (f.re.test(t)) out.features.push(f.key);
  return out;
}

export function formatPrice(p, cur) {
  if (!p) return "";
  return sym(cur) + Number(p).toLocaleString("en-US");
}

export function shortPrice(p, cur) {
  if (!p) return "";
  if (p >= 1_000_000) return sym(cur) + (p / 1_000_000).toFixed(p % 1_000_000 === 0 ? 0 : 2).replace(/\.?0+$/, "") + "M";
  return sym(cur) + Math.round(p / 1000) + "K";
}

export function priceBand(p) {
  if (!p) return "unknown";
  if (p < 300_000) return "under 300k";
  if (p < 600_000) return "300k to 600k";
  if (p < 1_000_000) return "600k to 1m";
  if (p < 2_000_000) return "1m to 2m";
  return "2m plus";
}

const fmtNum = (n) => (Number.isInteger(n) ? String(n) : String(n));
export function factsLine(l) {
  const parts = [];
  if (l.beds) parts.push(`${fmtNum(l.beds)} bed`);
  if (l.baths) parts.push(`${fmtNum(l.baths)} bath`);
  if (l.sqft) parts.push(`${Number(l.sqft).toLocaleString("en-US")} sq ft`);
  return parts.join(", ");
}

// Opens a pasted listing link and reads what the page says about itself (its title,
// description and main photo). Portals often block this; then Hopkins asks for the
// details instead of guessing.
export async function readLink(url) {
  let u;
  try { u = new URL(url); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  // Never fetch private network addresses from the server.
  if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.|\[?::1)/.test(u.hostname)) return null;
  try {
    const res = await fetch(u, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; HopkinsBot/0.1)", Accept: "text/html" },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    // Zillow pages run to about 800 KB, with the photo list near the end.
    const html = (await res.text()).slice(0, 3_000_000);
    const meta = (name) => {
      const re = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${name}["']`, "i");
      const m = html.match(re);
      return m ? decode(m[1] || m[2]) : null;
    };
    const title = meta("og:title") || (html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1];
    const description = meta("og:description") || meta("description");
    const image = meta("og:image");
    if (!title && !description) return null;
    const facts = pageFacts(html) || ldFacts(html);
    return { title: title ? decode(title).trim() : null, description: [description, facts].filter(Boolean).join("\n") || null, image: image || null, photos: photosFrom(html) };
  } catch {
    return null;
  }
}

// The listing's own photos from its page (2026-10-27), at most 12, so a link alone is enough.
// Zillow keeps them in the page's data (property.responsivePhotos, inside __NEXT_DATA__), each
// in several sizes: the largest for the ads (1536 wide, the most Zillow gives; checked 2026-10-29) and 384 for the thumbnail. The page also holds
// nearby homes' photos, which are left alone. Other sites usually list theirs in schema.org
// JSON-LD; failing that, the page's og:image.
export function photosFrom(html, max = 12) {
  const out = [];
  const add = (url, thumb = null) => {
    if (typeof url === "string" && /^https:\/\//.test(url) && !out.some((p) => p.url === url)) out.push({ url: decode(url), thumb: thumb ? decode(thumb) : null });
  };
  const nd = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (nd) {
    try {
      for (const ph of firstArray(JSON.parse(nd[1]), "responsivePhotos") || []) {
        const sizes = (ph.mixedSources?.jpeg || []).filter((j) => j.url).sort((a, b) => a.width - b.width);
        const upTo = (w) => (sizes.filter((j) => j.width <= w).pop() || sizes[0])?.url;
        add(sizes.at(-1)?.url || ph.url, upTo(384));
      }
    } catch {}
  }
  if (!out.length) {
    for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
      try { images(JSON.parse(m[1]), add); } catch {}
    }
  }
  if (!out.length) for (const m of html.matchAll(/<meta[^>]+(?:property|name)=["']og:image(?::url)?["'][^>]*content=["']([^"']+)["']/gi)) add(m[1]);
  return out.slice(0, max);
}

// The listing's facts from Zillow's page data: price, beds, baths, size, year and the agent's own
// description, which its title and summary leave out (Hopkins asked for a price the page had).
export function pageFacts(html) {
  const nd = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!nd) return null;
  let p;
  try { p = firstOwner(JSON.parse(nd[1]), "responsivePhotos"); } catch { return null; }
  if (!p) return null;
  const n = (v) => (typeof v === "number" && v > 0 ? v : null);
  const place = [p.streetAddress, p.city, p.state].filter((x) => typeof x === "string" && x).join(", ");
  const bits = [
    place && `${place}.`,
    n(p.price) && `Price $${n(p.price).toLocaleString("en-US")}.`,
    [n(p.bedrooms) && `${p.bedrooms} bed`, n(p.bathrooms) && `${p.bathrooms} bath`, n(p.livingArea) && `${n(p.livingArea).toLocaleString("en-US")} sq ft`].filter(Boolean).join(", ").replace(/.$/, "$&."),
    n(p.yearBuilt) && `Built in ${p.yearBuilt}.`,
    typeof p.description === "string" && p.description.slice(0, 2500),
  ].filter(Boolean);
  return bits.length ? bits.join(" ") : null;
}

// The listing's facts from the page's schema.org data, which most other portals carry (checked
// 2026-10-28: Compass, Coldwell Banker, Trulia): the address, price with its currency, beds,
// baths, size and the agent's full description. Their summary line alone said "Discover the
// property..." and nothing else.
export function ldFacts(html) {
  const nodes = [];
  const walk = (o, depth = 0) => {
    if (depth > 10 || !o || typeof o !== "object") return;
    if (Array.isArray(o)) { o.forEach((x) => walk(x, depth + 1)); return; }
    nodes.push(o);
    for (const k in o) walk(o[k], depth + 1);
  };
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { walk(JSON.parse(m[1])); } catch {}
  }
  const HOME = /RealEstateListing|SingleFamilyResidence|Residence|House|Apartment|Accommodation|Product/;
  const homes = nodes.filter((n) => HOME.test([].concat(n["@type"] || []).join(",")));
  if (!homes.length) return null;
  const pick = (k) => homes.map((n) => n[k]).find((v) => v !== undefined && v !== null && v !== "");
  const num = (v) => { const x = Number(typeof v === "object" ? v?.value : v); return x > 0 ? x : null; };
  const addr = nodes.find((n) => n.streetAddress && (n.addressLocality || n.addressRegion));
  const offer = nodes.find((n) => [].concat(n["@type"] || []).includes("Offer") && num(n.price));
  const size = nodes.find((n) => n.floorSize)?.floorSize;
  const sizeUnit = /MTK|m2|m²|sqm/i.test(`${size?.unitCode || ""}${size?.unitText || ""}`) ? "m²" : "sq ft";
  const beds = num(pick("numberOfBedrooms")) || num(pick("numberOfRooms"));
  const baths = num(pick("numberOfBathroomsTotal")) || num(pick("numberOfFullBathrooms"));
  const cur = offer?.priceCurrency || "USD";
  const money = (n) => `${cur === "USD" ? "$" : cur === "CAD" ? "CA$" : cur === "EUR" ? "€" : cur === "GBP" ? "£" : `${cur} `}${n.toLocaleString("en-US")}`;
  const description = homes.map((n) => n.description).filter((d) => typeof d === "string").sort((a, b) => b.length - a.length)[0];
  const bits = [
    addr && `${[addr.streetAddress, addr.addressLocality, addr.addressRegion].filter(Boolean).join(", ")}.`,
    offer && `Price ${money(num(offer.price))}.`,
    [beds && `${beds} bed`, baths && `${baths} bath`, num(size) && `${num(size).toLocaleString("en-US")} ${sizeUnit}`].filter(Boolean).join(", ").replace(/.$/, "$&."),
    description && decode(description).slice(0, 2500),
  ].filter((b) => b && b !== ".");
  return bits.length > 1 ? bits.join(" ") : null;
}

// The object that holds a non empty array under `key` (Zillow's property).
function firstOwner(o, key, depth = 0) {
  if (depth > 12 || o == null) return null;
  if (typeof o === "string") {
    if (o.length > 50 && o[0] === "{" && o.includes(`"${key}"`)) { try { return firstOwner(JSON.parse(o), key, depth + 1); } catch { return null; } }
    return null;
  }
  if (typeof o !== "object") return null;
  if (Array.isArray(o[key]) && o[key].length) return o;
  for (const k in o) { const r = firstOwner(o[k], key, depth + 1); if (r) return r; }
  return null;
}

// The first non empty array under `key`, looking inside JSON kept as text too (Zillow nests
// its property data as a JSON string).
function firstArray(o, key, depth = 0) {
  if (depth > 12 || o == null) return null;
  if (typeof o === "string") {
    if (o.length > 50 && o[0] === "{" && o.includes(`"${key}"`)) { try { return firstArray(JSON.parse(o), key, depth + 1); } catch { return null; } }
    return null;
  }
  if (typeof o !== "object") return null;
  if (Array.isArray(o[key]) && o[key].length) return o[key];
  for (const k in o) { const r = firstArray(o[k], key, depth + 1); if (r) return r; }
  return null;
}

function images(o, add, depth = 0) {
  if (depth > 8 || !o || typeof o !== "object") return;
  if (Array.isArray(o)) { o.forEach((x) => images(x, add, depth + 1)); return; }
  const im = o.image || o.photo;
  for (const x of Array.isArray(im) ? im : im ? [im] : []) typeof x === "string" ? add(x) : add(x?.url || x?.contentUrl);
  for (const k in o) if (k !== "image" && k !== "photo") images(o[k], add, depth + 1);
}

// One photo from a link: only real JPEG, PNG or WebP files, at most 6 MB, from a public address.
export async function downloadImage(url) {
  let u;
  try { u = new URL(url); } catch { return null; }
  if (u.protocol !== "https:" || /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.|\[?::1)/.test(u.hostname)) return null;
  try {
    const res = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0 (compatible; HopkinsBot/0.1)", Accept: "image/jpeg,image/png,image/webp" }, signal: AbortSignal.timeout(10000) });
    if (!res.ok || Number(res.headers.get("content-length") || 0) > 6_000_000) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 6_000_000) return null;
    const mime = buf[0] === 0xff && buf[1] === 0xd8 ? "image/jpeg" : buf.subarray(0, 4).toString("hex") === "89504e47" ? "image/png"
      : buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP" ? "image/webp" : null;
    return mime ? { buf, mime } : null;
  } catch {
    return null;
  }
}

function decode(s) {
  return String(s).replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#(\d+);/g, (_, d) => String.fromCharCode(d));
}
