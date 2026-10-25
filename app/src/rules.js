// What the agent wants, read without a model, for when no model key is set or a model call
// fails. Covers the requests that come up most: switch version, change the wording, the
// photo, the headline or the tone, try another angle, a new price, an open house, sold, run
// it, and the common questions. Anything else gets one short question back, not a guess.

import { parseListingText, parsePrice, PHOTO_LABELS } from "./listing.js";
import { COLOUR_WORDS, cleanStyle } from "./style.js";

// A change to how the ad looks: colours, font, layout, size, alignment, crop, fade. Returns
// { style, sizeStep } or null when the message isn't about the look at all.
const COLOUR_NAMES = Object.keys(COLOUR_WORDS).sort((a, b) => b.length - a.length);
export function readStyle(low) {
  const style = {};
  let sizeStep = 0;
  if (/\b(reset|original|default|back to (the )?(brand|normal|original))\b.*\b(look|style|colou?rs?|design|font|layout)\b|\b(look|style|colou?rs?|design)\b.*\b(reset|default|original)\b/.test(low)) return { style: { reset: true }, sizeStep };
  // colours, by what they're for: the big line, the label and price, or the background
  const found = [];
  const hexes = [...low.matchAll(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/g)].map((m) => ({ word: m[0], at: m.index }));
  for (const name of COLOUR_NAMES) {
    const m = low.match(new RegExp(`\\b${name}\\b`));
    if (m && !found.some((f) => f.at <= m.index && m.index < f.at + f.word.length)) found.push({ word: name, at: m.index });
  }
  // Only when it's a request about the ad, not a fact about the home ("it has a white kitchen").
  const asking = /\b(make|change|turn|use|switch|try|go with|set|want|colou?rs?|background|bg|labels?|accents?|font|tone|in|please|pls|can you|could you|instead|should be|to be|give it)\b/.test(low) && !/\b(has|have|had|comes with|features?)\b/.test(low);
  // Each colour belongs to the part named right after it ("gold label"), or failing that right
  // before it ("label in gold"), stopping at the next colour; otherwise it's the background.
  const colours = asking ? [...found, ...hexes].sort((a, b) => a.at - b.at) : [];
  const roleIn = (t) => /\b(labels?|accents?|prices?|highlights?|small text|tags?|kicker)\b/.test(t) ? "accent"
    : /\b(background|bg|backdrop|panel|block|band|fade|frame|card)\b/.test(t) ? "bg"
    : /\b(text|words|writing|letters|headline|line|title)\b/.test(t) ? "text" : null;
  colours.forEach((c, i) => {
    const end = c.at + c.word.length;
    const after = low.slice(end, Math.min(colours[i + 1] ? colours[i + 1].at : low.length, end + 24));
    const before = low.slice(Math.max(colours[i - 1] ? colours[i - 1].at + colours[i - 1].word.length : 0, c.at - 24), c.at);
    const role = roleIn(after.split(/\band\b|\bwith\b|,/)[0]) || roleIn(before.split(/\band\b|\bwith\b|,/).at(-1)) || "bg";
    if (!style[role]) style[role] = c.word;
  });
  if (/\b(serif|classic|elegant|editorial|italic|old style)\b/.test(low) && /\b(font|type|typeface|text|writing|look)\b/.test(low)) style.font = "classic";
  else if (/\b(sans|modern|bold|clean)\b/.test(low) && /\b(font|type|typeface)\b/.test(low)) style.font = "modern";
  if (/\b(text|words|line|writing)\b.*\b(at|on|to) the top\b|\btop of the (image|photo|ad)\b/.test(low)) style.layout = "top";
  else if (/\b(split|solid block|photo (on top|above))\b/.test(low)) style.layout = "split";
  else if (/\bcard\b/.test(low)) style.layout = "card";
  else if (/\b(frame|framed|border)\b/.test(low)) style.layout = "frame";
  else if (/\b(full (photo|bleed|picture)|fade layout)\b/.test(low)) style.layout = "fade";
  if (/\b(bigger|larger|huge|bolder|bigger)\b.*\b(text|font|words|line|writing|type)\b|\b(text|font|words|line|type)\b.*\b(bigger|larger)\b/.test(low)) sizeStep = 0.15;
  if (/\b(smaller|tinier)\b.*\b(text|font|words|line|writing|type)\b|\b(text|font|words|line|type)\b.*\bsmaller\b/.test(low)) sizeStep = -0.15;
  if (/\bcent(er|re)(ed|d)?\b/.test(low)) style.align = "center";
  else if (/\b(left|left aligned)\b/.test(low) && /\b(text|align|words|line)\b/.test(low)) style.align = "left";
  if (/\b(show|crop|see|keep)\b.*\b(more of )?(the )?(top|sky|roof|roofline)\b/.test(low)) style.focus = "top";
  else if (/\b(show|crop|see|keep)\b.*\b(more of )?(the )?(bottom|lawn|garden|ground|driveway|front door)\b/.test(low)) style.focus = "bottom";
  if (/\b(lighter|less|softer|subtle|weaker)\b.*\b(fade|overlay|shadow|gradient|tint)\b/.test(low)) style.fade = "light";
  else if (/\b(stronger|darker|more|heavier)\b.*\b(fade|overlay|gradient|tint)\b/.test(low)) style.fade = "strong";
  const clean = cleanStyle(style);
  if (!Object.keys(clean).length && !sizeStep) {
    // Asked for a different look with nothing specific: say what's possible, briefly.
    if (/\b(colou?rs?|font|layout|design|look|style)\b/.test(low) && /\b(change|different|another|new|edit|update|make|switch)\b/.test(low)) return { style: {}, sizeStep, vague: true };
    return null;
  }
  return { style: clean, sizeStep };
}

const ORDINALS = { first: 1, "1st": 1, one: 1, second: 2, "2nd": 2, two: 2, third: 3, "3rd": 3, three: 3, fourth: 4, "4th": 4, fifth: 5, "5th": 5, last: 3 };

export function targetVersions(text, selected, ads = []) {
  return namedVersions(text, ads) || [selected || 1];
}

// The versions a message names ("version 2", "the first one", "all of them"), or null when it
// names none.
export function namedVersions(text, ads = []) {
  const t = String(text || "").toLowerCase();
  // An ad called by its name ("the porch one", "make Under $650K shorter").
  const byName = ads.filter((a) => a.name && a.name.length > 2 && t.includes(a.name.toLowerCase().replace(/^the /, ""))).map((a) => a.version);
  if (/\b(all|every|each)( of them| three| versions?| ads?)?\b|\bthem all\b/.test(t)) return ads.length ? ads.map((a) => a.version) : [1, 2, 3, 4, 5];
  const found = new Set();
  for (const m of t.matchAll(/\b(?:v|version|ad|number|option|#)\s?([1-5])\b/g)) found.add(Number(m[1]));
  for (const m of t.matchAll(/\b(first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th|last)\b(?= (one|version|ad|option))/g)) found.add(m[1] === "last" && ads.length ? Math.max(...ads.map((a) => a.version)) : ORDINALS[m[1]]);
  for (const v of byName) found.add(v);
  return found.size ? [...found].sort() : null;
}

function quoted(text) {
  const m = text.match(/["“”']([^"“”']{2,80})["“”']/);
  return m ? m[1].trim() : null;
}

const GREETING = /^(hi|hey|hello|hiya|heya|yo|howdy|sup|good (morning|afternoon|evening)|morning|evening)\b[\s,!.]*(hopkins|there|man|mate|buddy)?[\s,!.]*$/;
// Words that can sit around a version number without asking for any change: "no, I meant
// version 2", "show me the second one", "what about 3".
const FILLER = /\b(no|nope|i|meant|mean|said|say|the|show|me|go|to|switch|open|look|at|what|about|how|lets|let's|let|us|see|ok|okay|um|uh|sorry|actually|one|please|pls|version|v|ad|option|number|instead|then|and|on|back|wait|not|that|this|is|it|was|i'm|im|talking)\b/g;

export function readIntent(text, { selected = 1, photos = [], ads = [] } = {}) {
  const t = text.trim();
  const low = t.toLowerCase();
  const versions = targetVersions(t, selected, ads);
  const intent = { versions, changes: {}, listingPatch: {}, kind: "unknown" };

  if (GREETING.test(low)) { intent.kind = "greeting"; return intent; }

  // Only a version, with nothing to change: switch to it. A bare "2" counts.
  const bare = low.match(/^\W*([1-5])\W*$/) || low.match(/\b([1-5])\s*\??$/);
  const named = bare || /\b(?:v|version|ad|number|option|#)\s?[1-5]\b|\b(first|second|third|last|1st|2nd|3rd) (one|version|ad|option)\b/.test(low);
  if (named) {
    const rest = low.replace(/\b(?:v|version|ad|number|option|#)\s?[1-5]\b/g, " ").replace(/\b(first|second|third|last|1st|2nd|3rd)\b/g, " ").replace(/\b[1-5]\b/g, " ").replace(FILLER, " ").replace(/[^a-z]/g, "");
    if (!rest) {
      intent.kind = "select";
      intent.versions = bare ? [Number(bare[1])] : versions;
      return intent;
    }
  }

  // Running. "Run it", "launch version 2", "$300 over 10 days".
  const budget = low.match(/\$\s?(\d[\d,]*)(?!\s*(k|m|million|thousand)\b)/);
  const days = low.match(/\b(\d{1,2})\s*days?\b/);
  if (/\b(run (it|them|this|that|version|v\d|ads?)|launch|go live|put (it|them) live|approve|post (it|them)|boost (it|them)|yes,? run)\b/.test(low) || (budget && days)) {
    intent.kind = "run";
    if (budget && (days || /\bbudget|spend|over\b/.test(low))) intent.budget = Number(budget[1].replace(/,/g, ""));
    if (days) intent.days = Number(days[1]);
    if (!/\b(v|version|ad|number|option)\s?[1-5]\b/.test(low) && !/\b(first|second|third|last) (one|version|ad)\b/.test(low)) intent.versions = [1, 2, 3, 4, 5];
    return intent;
  }

  // Fewer ads, or more.
  if (/\b(delete|remove|get rid of|drop|bin|lose|scrap)\b/.test(low) && /\b(ad|ads|version|one|it|this|that)\b/.test(low) && !/\b(word|words|line|sentence|emoji|photo|picture|label|price|listing)\b/.test(low)) {
    intent.kind = "remove";
    return intent;
  }
  if (/\b(another|one more|an extra|a new|add (an?|one|another))\s+(ad|version)\b|\bmore ads\b|\b(two|2|three|3) more\b/.test(low)) {
    intent.kind = "add";
    return intent;
  }

  // Sold, under contract.
  if (/\b(it'?s |it has |just |got )?(sold|under contract|went pending|is pending)\b/.test(low) && !/\b(not|isn'?t|hasn'?t) (sold|under)/.test(low)) {
    intent.kind = "moment";
    intent.moment = "sold";
    return intent;
  }

  // New price.
  const price = parsePrice(t);
  if (price && /\b(price|reduc|drop|lower|cut|now|new)\w*/.test(low) && !/\b(budget|spend)\b/.test(low)) {
    intent.kind = "moment";
    intent.moment = "price";
    intent.listingPatch.price = price;
    return intent;
  }

  // Open house.
  if (/\bopen house\b/.test(low)) {
    const when = t.replace(/.*open house\s*(is|on|this|for|at)?\s*/i, "").replace(/[.!]+$/, "").trim();
    intent.kind = "moment";
    intent.moment = "open_house";
    intent.listingPatch.open_house = when ? when.charAt(0).toUpperCase() + when.slice(1) : "this weekend";
    return intent;
  }

  // Headline or the line on the image, given in quotes or after "to".
  const q = quoted(t);
  const after = (word) => {
    const m = t.match(new RegExp(`${word}\\s*(?:to|:|=|say|says|should say|reads?)\\s*(.+)$`, "i"));
    return m ? m[1].replace(/^["“']|["”'.]$/g, "").trim() : null;
  };
  if (/\bheadline\b/.test(low) && (q || after("headline"))) {
    intent.kind = "revise";
    intent.changes.headline = q || after("headline");
    return intent;
  }
  if (/\b(on the (image|photo|picture)|overlay|big text|the line)\b/.test(low) && (q || after("(?:image|photo|picture|overlay|line|text)"))) {
    intent.kind = "revise";
    intent.changes.overlay = q || after("(?:image|photo|picture|overlay|line|text)");
    return intent;
  }

  // How it looks: colours, font, layout, size and the rest.
  const look = readStyle(low);
  if (look) {
    intent.kind = look.vague ? "style_ask" : "style";
    intent.style = look.style;
    intent.sizeStep = look.sizeStep;
    return intent;
  }

  // Photos. "use photo 3", "use the kitchen photo", "different picture".
  const asking = /\?\s*$/.test(t) || /^(what|how|why|which|do you|does|is|are|can you tell)\b/.test(low);
  if (/\b(photo|picture|pic|image|shot)s?\b/.test(low) && !(asking && !/\b(use|swap|change|different|another|try|put|switch)\b/.test(low))) {
    const n = low.match(/\b(?:photo|picture|pic|image|shot)\s*#?\s*(\d{1,2})\b/) || low.match(/\b(\d{1,2})(?:st|nd|rd|th)? (?:photo|picture|pic|image|shot)\b/);
    const ord = low.match(/\b(first|second|third|fourth|fifth|last)\s+(?:photo|picture|pic|image|shot)\b/);
    const label = PHOTO_LABELS.find((l) => new RegExp(`\\b${l === "garden" ? "(garden|yard|backyard)" : l === "living" ? "(living|lounge)" : l === "bathroom" ? "(bathroom|bath)" : l === "exterior" ? "(exterior|outside|front)" : l}\\b`).test(low));
    const sorted = [...photos].sort((a, b) => a.position - b.position);
    let photo = null;
    if (n) photo = sorted[Number(n[1]) - 1];
    else if (ord) photo = ord[1] === "last" ? sorted[sorted.length - 1] : sorted[{ first: 0, second: 1, third: 2, fourth: 3, fifth: 4 }[ord[1]]];
    else if (label) photo = sorted.find((p) => p.label === label);
    intent.kind = "revise";
    if (photo) intent.changes.photoId = photo.id;
    else if (/\b(different|another|other|new|change|swap)\b/.test(low)) intent.changes.nextPhoto = true;
    else intent.changes.photoMissing = label || (n ? `photo ${n[1]}` : "that photo");
    return intent;
  }

  // Tone and length.
  if (/\b(short(er)?|shorten|tighter|trim|less text|too long|cut it down)\b/.test(low)) { intent.kind = "revise"; intent.changes.length = "short"; return intent; }
  if (/\b(long(er)?|more detail|more info|too short|expand)\b/.test(low)) { intent.kind = "revise"; intent.changes.length = "long"; return intent; }
  if (/\b(casual|warm(er)?|friendl(y|ier)|relaxed|chill|softer)\b/.test(low)) { intent.kind = "revise"; intent.changes.voice = "warm"; return intent; }
  if (/\b(luxury|premium|upscale|high end|classy|elegant|fancier|more professional|formal)\b/.test(low)) { intent.kind = "revise"; intent.changes.voice = "premium"; return intent; }
  if (/\b(plain(er)?|simple(r)?|straight(er)?|less fluffy|no fluff)\b/.test(low)) { intent.kind = "revise"; intent.changes.voice = "plain"; return intent; }

  // Another angle, start again.
  if (/\b(another|different|new|fresh|other) (angle|idea|take|version|one|approach)\b|\b(try again|redo|remake|start over|don'?t like (it|this|that|them)|not (great|good|right)|meh)\b/.test(low)) {
    intent.kind = "revise";
    intent.changes.angle = true;
    return intent;
  }

  // New facts about the home: "it has a pool", "4 beds not 3", "it's in Riverside".
  const facts = parseListingText(t);
  const patch = {};
  for (const k of ["beds", "baths", "sqft", "address", "area", "home_type"]) if (facts[k]) patch[k] = facts[k];
  if (facts.features.length) patch.addFeatures = facts.features;
  if (Object.keys(patch).length) {
    intent.kind = "update_listing";
    intent.listingPatch = patch;
    return intent;
  }

  if (/\b(fair housing|compliant|legal|allowed|discriminat)/.test(low)) { intent.kind = "fair_housing"; return intent; }

  // Make the ads, when they're asked for in so many words.
  if (/\b(make|create|do|generate|write|build)\b.*\b(ads?|them|versions?)\b/.test(low)) { intent.kind = "make"; return intent; }

  // Questions get an answer, not a list of features.
  if (/\?\s*$/.test(t) || /^(what|how|why|when|which|who|where|can|could|does|do|is|are|should|will|would)\b/.test(low)) {
    intent.kind = "question";
    intent.topic =
      /\b(cost|price of hopkins|how much (is|does) (it|hopkins|this)|pay|paid plan|plan|subscription|free)\b/.test(low) ? "plan"
      : /\b(which|best|better|winner|pick|choose|recommend)\b/.test(low) ? "which"
      : /\bwhy\b/.test(low) ? "why"
      : /\b(download|save|export|post (it|them) myself)\b/.test(low) ? "download"
      // "how does this work" asks about Hopkins, not about results, so it's checked first.
      : /\b(what can you|what do you|how does (this|it|hopkins) work|how do i (start|use)|what is (this|hopkins)|help)\b/.test(low) ? "help"
      : /\b(leads?|results?|work|how long|when)\b/.test(low) ? "results"
      : "other";
    return intent;
  }
  if (/\b(thanks|thank you|cheers|perfect|great|love it|looks good|nice)\b/.test(low)) { intent.kind = "thanks"; return intent; }
  return intent;
}
