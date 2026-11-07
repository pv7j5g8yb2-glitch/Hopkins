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

// The kind of idea behind each ad, kept for the testing record (which kind wins for which
// kind of listing) and to pick a default layout. The agent never sees these: each ad has its
// own name, after its own idea ("Wraparound porch", "Under $650K").
export const KINDS = ["life", "feature", "facts", "price", "place", "hook", "moment", "other"];
export const KIND_NAMES = { life: "The life it gives", feature: "One standout detail", facts: "Price and numbers", price: "The price", place: "The place", hook: "A hook or question", moment: "The moment", other: "Other" };
// How many ads one listing can have at a time. Free accounts make 3 in all (plans.js).
export const MAX_ADS = 5;

export const MOMENTS = {
  new: "Just listed",
  price: "New price",
  open_house: "Open house",
  coming_soon: "Coming soon",
  under_contract: "Under contract",
  back: "Back on the market",
  sold: "Just sold",
};

const CTA_LINES = {
  plain: "Tap to see the photos and book a showing.",
  warm: "Come and see it for yourself. Tap to book a showing.",
  premium: "Private showings by appointment. Tap to arrange yours.",
};
const RENT_CTA = "Tap to see the photos, book a showing or apply.";

// A home for rent says so where a sale says "Just listed", and is rented, not sold (2026-10-29).
const listedWord = (l) => (l.deal === "rent" ? "For rent" : "Just listed");
const doneWord = (l) => (l.deal === "rent" ? "Just rented" : "Just sold");
export const momentName = (moment, deal) => (moment === "sold" && deal === "rent" ? "Just rented" : moment === "new" && deal === "rent" ? "For rent" : MOMENTS[moment]);

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
      ? `New price. Was ${formatPrice(extra.oldPrice, l.currency, l.deal)}, now ${formatPrice(l.price, l.currency, l.deal)}.`
      : `New price: ${formatPrice(l.price, l.currency, l.deal)}.`;
  }
  if (moment === "open_house") return l.open_house ? `Open house ${l.open_house}. Come by, no appointment needed.` : "Open house this weekend.";
  if (moment === "sold") return `${doneWord(l)} in ${place(l) || "the area"}.`;
  if (moment === "coming_soon") return `Coming soon${place(l) ? ` in ${place(l)}` : ""}. See it before it's on the market.`;
  if (moment === "under_contract") return `Under contract${place(l) ? ` in ${place(l)}` : ""}.`;
  if (moment === "back") return `Back on the market${place(l) ? ` in ${place(l)}` : ""}. A second chance at this one.`;
  return "";
}

function kickerFor(l, moment, fallback) {
  if (moment === "price") return "New price";
  if (moment === "open_house") return l.open_house ? `Open house · ${l.open_house}` : "Open house";
  if (moment === "sold") return doneWord(l);
  if (MOMENTS[moment] && moment !== "new") return MOMENTS[moment];
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
  const price = formatPrice(l.price, l.currency, l.deal);
  const type = l.home_type || "home";
  const lead = momentLead(l, moment, extra);
  const rent = l.deal === "rent";
  const listed = listedWord(l);
  const ctaLine = moment === "sold" ? (rent ? "Have a place to rent out nearby? Send me a message." : "Thinking about selling nearby? Send me a message.")
    : moment === "under_contract" ? "Looking for one like it? Send me a message."
    : moment === "coming_soon" ? "Tap to get the details first."
    : moment === "open_house" ? "Tap for the photos and the details."
    : rent ? RENT_CTA
    : CTA_LINES[voice] || CTA_LINES.plain;
  const used = opts.usedPhotos || new Set();
  const showPrice = price && moment !== "price";
  const factSentence = !facts && !where
    ? (showPrice ? `${rent ? "For rent at" : "Listed at"} ${price}.` : "")
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
      name: f ? cap(f.name) : where ? where : "The property",
      overlay,
      kicker: kickerFor(l, moment, where ? `${listed} · ${where}` : listed),
      headline: fit(l.beds ? `${l.beds} bed ${type} ${rent ? "for rent " : ""}in ${where || "town"}` : `${listed}${where ? " in " + where : ""}`, 40),
      body: [lead, overlay, length !== "short" && second ? second.detail : "", factSentence, length === "long" && feats[2] ? feats[2].detail : ""],
      photoWant: f ? f.photo : "exterior",
    };
  } else if (pattern === "feature") {
    const f = feats.length ? feats[(angle + (feats.length > 1 ? 1 : 0)) % feats.length] : null;
    const overlay = f ? f.detail : facts ? `${cap(facts)}.` : "See it before the weekend.";
    ad = {
      pattern,
      name: f ? cap(f.name.replace(/^the /, "")) : "The details",
      overlay,
      kicker: kickerFor(l, moment, where || listed),
      headline: fit(f ? `${cap(f.name.replace(/^the /, ""))}${where ? " in " + where : ""}` : `${listed}${where ? " in " + where : ""}`, 40),
      body: [lead, overlay, length !== "short" && f ? f.life : "", factSentence],
      photoWant: f ? f.photo : "living",
    };
  } else {
    const momentOverlay = moment === "price" ? `Now ${shortPrice(l.price, l.currency, l.deal)}.` : moment === "sold" ? `${doneWord(l)}.` : moment === "open_house" ? "Open house." : MOMENTS[moment] && moment !== "new" ? `${MOMENTS[moment]}.` : `${listed}.`;
    ad = {
      pattern: "facts",
      name: moment === "price" ? "New price" : moment === "open_house" ? "Open house" : moment === "sold" ? doneWord(l) : MOMENTS[moment] && moment !== "new" ? MOMENTS[moment] : l.price ? `${shortPrice(l.price, l.currency, l.deal)}${where && where.length < 16 ? ` in ${where}` : ""}` : "The numbers",
      overlay: momentOverlay,
      kicker: facts || cap(type),
      headline: fit([shortPrice(l.price, l.currency, l.deal), where].filter(Boolean).join(" in ") || `New ${type}`, 40),
      body: [
        lead || `${listed}${l.address ? `: ${l.address}` : ""}${where ? `, ${where}` : ""}.`,
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
    name: polish(ad.name),
    headline: polish(cleanWording(ad.headline)),
    overlay: polish(cleanWording(ad.overlay)),
    kicker: polish(ad.kicker || ""),
    primary_text: primary,
    cta: moment === "sold" ? "Send message" : "Learn more",
    photo_id: photo ? photo.id : null,
  };
}

// The built-in writer, for when no model is there or it failed: count ads (up to 3 ideas,
// then the same ideas from another angle), numbered from opts.from.
export function writeSet(ctx, opts = {}) {
  const used = new Set();
  const count = opts.count || 3;
  const from = opts.from || 1;
  const order = ["life", "feature", "facts"];
  return Array.from({ length: count }, (_, i) => ({
    version: from + i,
    ...writeVersion(order[(from - 1 + i) % 3], ctx, { ...opts, angle: (opts.angle || 0) + Math.floor((from - 1 + i) / 3), usedPhotos: used }),
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

// The same clean up for a chat reply, which is Markdown: lines, list markers and table rows stay
// as they are; only the words in them are cleaned.
export function polishChat(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => {
      if (/^[\s|:-]+$/.test(line) && line.includes("-") && line.includes("|")) return line.trim();
      if (/^\s*\|.*\|\s*$/.test(line)) return `| ${line.trim().replace(/^\||\|$/g, "").split("|").map((c) => polish(c.trim())).join(" | ")} |`;
      const m = line.match(/^(\s*(?:[-*•]|\d+[.)])\s+|\s*#{1,6}\s+)?(.*)$/);
      const lead = (m[1] || "").replace(/^\s*[*•]\s+/, "- ");
      return lead + polish(m[2]);
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function houseRuleProblems(text) {
  const problems = [];
  // A Markdown list in a chat reply starts its lines with "- ", which shows as a bullet, not a dash.
  text = String(text || "").replace(/^\s*-\s+/gm, "");
  if (/[–—\u2010-\u2015\u2212]|\s-\s|\p{L}-\p{L}/u.test(text)) problems.push("dash");
  if (/\b(we|us|our|ours|we're|we've|we'll)\b/i.test(text)) problems.push("we");
  if (/\brealtor/i.test(text)) problems.push("realtor");
  return problems;
}
