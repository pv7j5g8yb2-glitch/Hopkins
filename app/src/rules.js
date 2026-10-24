// What the agent wants, read without a model, for when no model key is set or a model call
// fails. Covers the requests that come up most: switch version, change the wording, the
// photo, the headline or the tone, try another angle, a new price, an open house, sold, run
// it, and the common questions. Anything else gets one short question back, not a guess.

import { parseListingText, parsePrice, PHOTO_LABELS } from "./listing.js";

const ORDINALS = { first: 1, "1st": 1, one: 1, second: 2, "2nd": 2, two: 2, third: 3, "3rd": 3, three: 3, last: 3 };

export function targetVersions(text, selected) {
  const t = text.toLowerCase();
  if (/\b(all|every|each)( of them| three| versions?| ads?)?\b|\bthem all\b/.test(t)) return [1, 2, 3];
  const found = new Set();
  for (const m of t.matchAll(/\b(?:v|version|ad|number|option|#)\s?([123])\b/g)) found.add(Number(m[1]));
  for (const m of t.matchAll(/\b(first|1st|second|2nd|third|3rd|last)\b(?= (one|version|ad|option))/g)) found.add(ORDINALS[m[1]]);
  if (/\b(the life|lifestyle)\b/.test(t)) found.add(1);
  if (/\b(the standout|standout)\b/.test(t)) found.add(2);
  if (/\b(the facts)\b/.test(t)) found.add(3);
  return found.size ? [...found].sort() : [selected || 1];
}

function quoted(text) {
  const m = text.match(/["“”']([^"“”']{2,80})["“”']/);
  return m ? m[1].trim() : null;
}

const GREETING = /^(hi|hey|hello|hiya|heya|yo|howdy|sup|good (morning|afternoon|evening)|morning|evening)\b[\s,!.]*(hopkins|there|man|mate|buddy)?[\s,!.]*$/;
// Words that can sit around a version number without asking for any change: "no, I meant
// version 2", "show me the second one", "what about 3".
const FILLER = /\b(no|nope|i|meant|mean|said|say|the|show|me|go|to|switch|open|look|at|what|about|how|lets|let's|let|us|see|ok|okay|um|uh|sorry|actually|one|please|pls|version|v|ad|option|number|instead|then|and|on|back|wait|not|that|this|is|it|was|i'm|im|talking)\b/g;

export function readIntent(text, { selected = 1, photos = [] } = {}) {
  const t = text.trim();
  const low = t.toLowerCase();
  const versions = targetVersions(t, selected);
  const intent = { versions, changes: {}, listingPatch: {}, kind: "unknown" };

  if (GREETING.test(low)) { intent.kind = "greeting"; return intent; }

  // Only a version, with nothing to change: switch to it. A bare "2" counts.
  const bare = low.match(/^\W*([123])\W*$/) || low.match(/\b([123])\s*\??$/);
  const named = bare || /\b(?:v|version|ad|number|option|#)\s?[123]\b|\b(first|second|third|last|1st|2nd|3rd) (one|version|ad|option)\b/.test(low);
  if (named) {
    const rest = low.replace(/\b(?:v|version|ad|number|option|#)\s?[123]\b/g, " ").replace(/\b(first|second|third|last|1st|2nd|3rd)\b/g, " ").replace(/\b[123]\b/g, " ").replace(FILLER, " ").replace(/[^a-z]/g, "");
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
    if (!/\b(v|version|ad|number|option)\s?[123]\b/.test(low) && !/\b(first|second|third|last) (one|version|ad)\b/.test(low)) intent.versions = [1, 2, 3];
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

  // Photos. "use photo 3", "use the kitchen photo", "different picture".
  if (/\b(photo|picture|pic|image|shot)s?\b/.test(low)) {
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
      : /\b(leads?|results?|work|how long|when)\b/.test(low) ? "results"
      : /\b(what can you|what do you|how does (this|it|hopkins) work|help)\b/.test(low) ? "help"
      : "other";
    return intent;
  }
  if (/\b(thanks|thank you|cheers|perfect|great|love it|looks good|nice)\b/.test(low)) { intent.kind = "thanks"; return intent; }
  return intent;
}
