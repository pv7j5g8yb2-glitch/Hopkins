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

export function parsePrice(text) {
  const m = text.match(/\$\s?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(k|m|mm|million|thousand)?\b/i) ||
    text.match(/\b(\d{1,3}(?:,\d{3}){1,2})\s*(?:dollars|usd)?\b/i);
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
  const beds = t.match(/(\d+(?:\.\d)?)\s*(?:bed(room)?s?|bd|br)\b/i);
  if (beds) out.beds = Number(beds[1]);
  const baths = t.match(/(\d+(?:\.\d)?)\s*(?:bath(room)?s?|ba)\b/i);
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

export function formatPrice(p) {
  if (!p) return "";
  return "$" + Number(p).toLocaleString("en-US");
}

export function shortPrice(p) {
  if (!p) return "";
  if (p >= 1_000_000) return "$" + (p / 1_000_000).toFixed(p % 1_000_000 === 0 ? 0 : 2).replace(/\.?0+$/, "") + "M";
  return "$" + Math.round(p / 1000) + "K";
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
    const html = (await res.text()).slice(0, 600_000);
    const meta = (name) => {
      const re = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${name}["']`, "i");
      const m = html.match(re);
      return m ? decode(m[1] || m[2]) : null;
    };
    const title = meta("og:title") || (html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1];
    const description = meta("og:description") || meta("description");
    const image = meta("og:image");
    if (!title && !description) return null;
    return { title: title ? decode(title).trim() : null, description: description || null, image: image || null };
  } catch {
    return null;
  }
}

function decode(s) {
  return String(s).replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#(\d+);/g, (_, d) => String.fromCharCode(d));
}
