// Every detail in an ad has to come from somewhere: the listing facts, the agent's own words,
// or what the photos plainly show. Models (Groq's free one most of all) add the details homes
// like this usually have, "granite counters", "hardwood floors", "minutes from downtown", and
// an ad that misdescribes a home is worse than a plain one. This finds those, so the writer
// can be asked to fix them, or the sentence can go.

import { FEATURES } from "./listing.js";

// The details models reach for, each allowed only when the source says something like it.
const RISKY = [
  [/\bgranite\b/, /granite/],
  [/\bquartz\b/, /quartz/],
  [/\bmarble\b/, /marble/],
  [/\b(hardwood|wood floors?|oak floors?|wide plank)\b/, /hardwood|wood floor|oak floor|plank|wooden floor/],
  [/\bstainless\b/, /stainless/],
  [/\b(vaulted|cathedral ceilings?|high ceilings?|soaring)\b/, /vaulted|cathedral|high ceiling|tall ceiling|double height/],
  [/\b(renovated|remodell?ed|updated|refurbished|newly|brand new|new roof|new kitchen|new floors?|fully redone)\b/, /renovat|remodel|updat|refurb|newly|brand new|new roof|new kitchen|new floor|redone/],
  [/\b(pool|swimming)\b/, /pool|swim/],
  [/\b(spa|hot tub|jacuzzi)\b/, /spa\b|hot tub|jacuzzi/],
  [/\b(views?|overlooks?|overlooking|skyline|panoramic|vista)\b/, /view|overlook|skyline|panoram|vista/],
  [/\b(waterfront|lakefront|oceanfront|beachfront)\b/, /waterfront|lakefront|oceanfront|beachfront/],
  [/\b(beach|ocean|sea)\b/, /beach|ocean|\bsea\b/],
  [/\blake\b/, /lake/],
  [/\briver\b/, /river/],
  [/\bmountains?\b/, /mountain/],
  [/\b(fireplace|wood ?stove|wood burning)\b/, /fireplace|wood ?stove|wood burning|hearth/],
  [/\b(historic|heritage|period features?)\b/, /historic|heritage|period|built in 1[0-9]{3}|19[0-4][0-9]/],
  [/\b(charm|charming|character|timeless)\b/, /charm|character|timeless/],
  [/\b(chef'?s|gourmet)\b/, /chef|gourmet/],
  [/\bwalk ?in (closet|wardrobe|pantry)\b/, /walk ?in/],
  [/\b(en ?suite)\b/, /en ?suite/],
  [/\bsmart (home|thermostat|lock)/, /smart/],
  [/\bsolar\b/, /solar/],
  [/\bgarage\b/, /garage/],
  [/\bacres?\b/, /acre/],
  [/\bbasement\b/, /basement|lower level/],
  [/\b(deck|decking)\b/, /\bdeck/],
  [/\bpatio\b/, /patio/],
  [/\bbalcon(y|ies)\b/, /balcon/],
  [/\b(terrace|rooftop|roof deck)\b/, /terrace|rooftop|roof deck/],
  [/\bgated\b/, /gated|gate/],
  [/\bschools?\b/, /school/],
  [/\bparks?\b/, /\bpark/],
  [/\bdowntown\b/, /downtown/],
  [/\b(minutes? (from|to|away)|walk(ing)? distance|walk to|steps (from|to)|close to|nearby|around the corner)\b/, /minute|walk|steps|close to|near|around the corner/],
  [/\b(natural light|sun ?(lit|drenched|filled|ny)|light filled|bright|airy)\b/, /light|sun|bright|airy|window/],
  [/\bopen (concept|plan|floor ?plan|layout)\b/, /open (concept|plan|floor|layout)/],
  [/\bisland\b/, /island/],
  [/\b(home office|office|study)\b/, /office|study|desk/],
  [/\b(gym|wine (cellar|fridge|room))\b/, /gym|wine/],
  [/\b(cul de sac|quiet street|tree lined|mature trees|landscaped)\b/, /cul de sac|quiet|tree|landscap/],
  [/\b(garden|yard|backyard|lawn)\b/, /garden|yard|lawn|landscap|grass/],
  [/\b(porch|veranda)\b/, /porch|veranda/],
  [/\bgolf\b/, /golf/],
  [/\b(new construction|new build|built in \d{4})\b/, /new construction|new build|built in/],
  [/\b(move in ready|turnkey|turn key)\b/, /move in|turnkey|turn key|ready/],
  [/\b(quiet|peaceful|private|secluded)\b/, /quiet|peaceful|private|secluded|privacy/],
  [/\b(spacious|huge|massive|sprawling|generous)\b/, /spacious|huge|massive|sprawling|generous|large|big|sq ?ft|square f/],
];

// Everything the ad is allowed to draw on, as one lowercase text.
export function sourceText({ listing = {}, photos = [], extra = "" }) {
  const feats = (Array.isArray(listing.features) ? listing.features : []).map((k) => FEATURES.find((f) => f.key === k)?.name || k);
  return [
    listing.description, listing.address, listing.city, listing.area, listing.home_type, listing.open_house, listing.title,
    feats.join(" "), photos.map((p) => `${p.label || ""} ${p.seen || ""}`).join(" "), extra,
  ].filter(Boolean).join("\n").toLowerCase().replace(/-/g, " ");
}

const toNumber = (s) => {
  const m = s.replace(/[$,]/g, "").match(/^([\d.]+)\s*([km])?$/i);
  if (!m) return null;
  return Number(m[1]) * (m[2] ? (m[2].toLowerCase() === "k" ? 1000 : 1_000_000) : 1);
};

// The problems in one ad's words, as short phrases for a fix request, e.g.
// ['"granite" isn't in the facts', 'the number 12 isn't in the facts'].
export function factProblems(ad, { listing = {}, photos = [], extra = "", oldPrice = 0 } = {}) {
  const src = sourceText({ listing, photos, extra });
  const problems = [];
  for (const field of ["overlay", "headline", "primary_text", "kicker"]) {
    const text = String(ad[field] || "").toLowerCase().replace(/-/g, " ");
    for (const [said, allowed] of RISKY) {
      const m = text.match(said);
      if (m && !allowed.test(src)) problems.push({ field, what: m[0], why: `"${m[0]}" isn't in the facts, the agent's words or the photos` });
    }
    // Numbers: the price (and "under" a round figure just above it), beds, baths, size, the
    // old price, and any number the agent wrote themselves.
    const known = [listing.price, listing.beds, listing.baths, listing.sqft, oldPrice].filter(Boolean).map(Number);
    for (const m of text.matchAll(/(under|below|less than|from|was|now)?\s?([$€£]?\d[\d,]*(?:\.\d+)?\s?[km]?\b)/gi)) {
      const raw = m[2].trim();
      const n = toNumber(raw);
      if (n === null || (n < 10 && !/^[$€£]/.test(raw))) continue; // small counts ("2 car") are checked by the words around them
      const plain = raw.replace(/[$€£,]/g, "");
      const ok = known.some((k) => Math.abs(n - k) <= Math.max(1, k * (/[km]$/i.test(raw) ? 0.03 : 0.006)))
        || (/under|below|less than/i.test(m[1] || "") && listing.price && n >= listing.price && n <= listing.price * 1.1)
        || src.includes(plain) || src.includes(raw)
        || (listing.open_house && listing.open_house.includes(plain));
      if (!ok) problems.push({ field, what: raw, why: `the number ${raw} isn't in the facts` });
    }
  }
  return problems;
}

// What's left of the main text once the sentences with problems are taken out.
export function withoutProblems(text, problems) {
  const bad = problems.filter((p) => p.field === "primary_text").map((p) => p.what.toLowerCase());
  if (!bad.length) return text;
  return String(text)
    .split(/(?<=[.!?])\s+/)
    .filter((s) => !bad.some((w) => s.toLowerCase().replace(/-/g, " ").includes(w)))
    .join(" ")
    .trim();
}

