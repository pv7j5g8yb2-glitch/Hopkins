// The built-in ad writer. It always works, with or without a model, and follows the
// playbook: three genuinely different concepts per listing (Meta rewards creative
// diversity, small tweaks of one idea teach nothing), each one selling the life to one
// buyer rather than listing square footage, in plain words, never hype.
//
// The three concepts:
//   life     The life the home gives. A lifestyle line over the best photo.
//   feature  One standout detail, with the photo that shows it.
//   facts    Just listed, the price and the numbers, plainly. Some buyers only want this.

import { FEATURES, formatPrice, shortPrice, factsLine } from "./listing.js";
import { cleanWording } from "./fairhousing.js";

export const PATTERNS = {
  life: { name: "The life", why: "Sells the life the home gives to one buyer." },
  feature: { name: "The standout", why: "One detail, shown, not described." },
  facts: { name: "The facts", why: "Price and numbers up front, for buyers who are already looking." },
};

export const MOMENTS = {
  new: "Just listed",
  price: "New price",
  open_house: "Open house",
  sold: "Just sold",
};

const CTA_LINES = {
  plain: "Tap to see the photos and book a showing.",
  warm: "Come and see it for yourself. Tap to book a showing.",
  premium: "Private showings by appointment. Tap to arrange yours.",
};

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function place(l) {
  return l.area || l.city || "";
}

function featureList(l) {
  const keys = Array.isArray(l.features) ? l.features : [];
  return keys.map((k) => FEATURES.find((f) => f.key === k)).filter(Boolean);
}

function pickPhoto(photos, want, used) {
  const sorted = [...photos].sort((a, b) => a.position - b.position);
  return (
    sorted.find((p) => p.label === want && !used.has(p.id)) ||
    (want === "exterior" ? null : sorted.find((p) => p.label === "exterior" && !used.has(p.id))) ||
    sorted.find((p) => !used.has(p.id)) ||
    sorted[0] ||
    null
  );
}

function momentLead(l, moment, extra = {}) {
  if (moment === "price") {
    return extra.oldPrice && l.price && extra.oldPrice > l.price
      ? `New price. Was ${formatPrice(extra.oldPrice)}, now ${formatPrice(l.price)}.`
      : `New price: ${formatPrice(l.price)}.`;
  }
  if (moment === "open_house") return l.open_house ? `Open house ${l.open_house}. Come by, no appointment needed.` : "Open house this weekend.";
  if (moment === "sold") return `Just sold in ${place(l) || "the area"}.`;
  return "";
}

function kickerFor(l, moment, fallback) {
  if (moment === "price") return "New price";
  if (moment === "open_house") return l.open_house ? `Open house · ${l.open_house}` : "Open house";
  if (moment === "sold") return "Just sold";
  return fallback;
}

// Short headlines read in full under the photo on a phone (about 40 characters).
function fit(s, max) {
  if (!s || s.length <= max) return s;
  const cut = s.slice(0, max + 1);
  return cut.slice(0, cut.lastIndexOf(" ")).replace(/[,.]$/, "");
}

function sentence(parts) {
  return parts.filter(Boolean).join(" ").replace(/\s+/g, " ").replace(/\.\./g, ".").trim();
}

// opts.angle shifts which feature a version leads with (used for "try another angle").
// opts.length is "short", "normal" or "long". opts.voice overrides the brand's voice.
export function writeVersion(pattern, ctx, opts = {}) {
  const { listing: l, photos = [], brand = {}, moment = "new", extra = {} } = ctx;
  const voice = opts.voice || brand.voice || "plain";
  const length = opts.length || "normal";
  const feats = featureList(l);
  const angle = opts.angle || 0;
  const where = place(l);
  const facts = factsLine(l);
  const price = formatPrice(l.price);
  const type = l.home_type || "home";
  const lead = momentLead(l, moment, extra);
  const ctaLine = moment === "sold" ? "Thinking about selling nearby? Send me a message."
    : moment === "open_house" ? "Tap for the photos and the details."
    : CTA_LINES[voice] || CTA_LINES.plain;
  const used = opts.usedPhotos || new Set();
  const showPrice = price && moment !== "price";
  const factSentence = !facts && !where
    ? (showPrice ? `Listed at ${price}.` : "")
    : sentence([facts ? cap(facts) : cap(type), where ? `in ${where}` : "", showPrice ? `, ${price}.` : "."]).replace(" ,", ",");
  // The facts version already names the place in its first line.
  const factsOnly = facts ? `${cap(facts)}${showPrice ? `, ${price}` : ""}.` : showPrice ? `${price}.` : "";

  let ad;
  if (pattern === "life") {
    const f = feats.length ? feats[angle % feats.length] : null;
    const second = feats.length > 1 ? feats[(angle + 1) % feats.length] : null;
    const overlay = f ? f.life : where ? `Home, in ${where}.` : "Room to make it yours.";
    ad = {
      pattern,
      overlay,
      kicker: kickerFor(l, moment, where ? `Just listed · ${where}` : "Just listed"),
      headline: fit(l.beds ? `${l.beds} bed ${type} in ${where || "town"}` : `Just listed${where ? " in " + where : ""}`, 40),
      body: [lead, overlay, length !== "short" && second ? second.detail : "", factSentence, length === "long" && feats[2] ? feats[2].detail : ""],
      photoWant: f ? f.photo : "exterior",
    };
  } else if (pattern === "feature") {
    const f = feats.length ? feats[(angle + (feats.length > 1 ? 1 : 0)) % feats.length] : null;
    const overlay = f ? f.detail : facts ? `${cap(facts)}.` : "See it before the weekend.";
    ad = {
      pattern,
      overlay,
      kicker: kickerFor(l, moment, where || "Just listed"),
      headline: fit(f ? `${cap(f.name.replace(/^the /, ""))}${where ? " in " + where : ""}` : `Just listed${where ? " in " + where : ""}`, 40),
      body: [lead, overlay, length !== "short" && f ? f.life : "", factSentence],
      photoWant: f ? f.photo : "living",
    };
  } else {
    const momentOverlay = moment === "price" ? `Now ${shortPrice(l.price)}.` : moment === "sold" ? "Just sold." : moment === "open_house" ? "Open house." : "Just listed.";
    ad = {
      pattern: "facts",
      overlay: momentOverlay,
      kicker: facts || cap(type),
      headline: fit([shortPrice(l.price), where].filter(Boolean).join(" in ") || `New ${type}`, 40),
      body: [
        lead || `Just listed${l.address ? `: ${l.address}` : ""}${where ? `, ${where}` : ""}.`,
        moment === "price" ? (facts ? `${cap(facts)}.` : "") : factsOnly,
        length !== "short" && feats.length ? `${cap(feats.slice(0, 3).map((f) => f.name.replace(/^the /, "")).join(", ").replace(/, ([^,]*)$/, " and $1"))}.` : "",
      ],
      photoWant: "exterior",
    };
  }

  const photo = opts.photoId ? photos.find((p) => p.id === opts.photoId) || null : pickPhoto(photos, ad.photoWant, used);
  if (photo) used.add(photo.id);
  const primary = polish(cleanWording(sentence([...ad.body, ctaLine])));
  return {
    pattern: ad.pattern,
    headline: polish(cleanWording(ad.headline)),
    overlay: polish(cleanWording(ad.overlay)),
    kicker: polish(ad.kicker || ""),
    primary_text: primary,
    cta: moment === "sold" ? "Send message" : "Learn more",
    photo_id: photo ? photo.id : null,
  };
}

export function writeSet(ctx, opts = {}) {
  const used = new Set();
  return ["life", "feature", "facts"].map((pattern, i) => ({
    version: i + 1,
    ...writeVersion(pattern, ctx, { ...opts, usedPhotos: used }),
  }));
}

// House rules for every line of copy, from any writer: no dashes as punctuation, no
// "we", "us" or "our" (Hopkins writes as the agent, never as an agency), and never
// "Realtor" (a trademark).
export function polish(text) {
  if (!text) return text;
  // Every dash like character counts, including the non breaking hyphen models like to use,
  // and a hyphen joining two words becomes a space ("two week run", "move in ready").
  return String(text)
    .replace(/[\u2010\u2011\u2012\u2015\u2212]/g, (c) => (c === "\u2012" || c === "\u2015" ? "—" : "-"))
    .replace(/(\d)\s?[–—]\s?(\d)/g, "$1 to $2")
    .replace(/\s+[–—-]\s+/g, ", ")
    .replace(/[–—]/g, ", ")
    .replace(/([\p{L}\d])-(?=\p{L})|(\p{L})-(?=\d)/gu, "$1$2 ")
    .replace(/\bRealtors?®?\b/gi, "agent")
    .replace(/,\s*,/g, ",")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function houseRuleProblems(text) {
  const problems = [];
  if (/[–—\u2010-\u2015\u2212]|\s-\s|\p{L}-\p{L}/u.test(text)) problems.push("dash");
  if (/\b(we|us|our|ours|we're|we've|we'll)\b/i.test(text)) problems.push("we");
  if (/\brealtor/i.test(text)) problems.push("realtor");
  return problems;
}
