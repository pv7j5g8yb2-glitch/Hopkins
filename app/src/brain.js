import Anthropic from "@anthropic-ai/sdk";
import { FEATURES } from "./listing.js";
import { KINDS, MAX_ADS } from "./writer.js";
import { LAYOUTS, describeStyle } from "./style.js";

// The model behind the chat. Claude when ANTHROPIC_API_KEY is set; otherwise Groq's free
// model when GROQ_API_KEY is set (the same free option the survey uses). Every call returns
// null on any failure and the caller falls back to the built-in reader, writer and rules, so
// the chat never breaks because a model call did.
//
// Four jobs: see the photos, read a listing from what the agent sent, write the ads, and take
// one chat turn: hold a real conversation and, when the agent asks for something, do it.

export const provider = process.env.ANTHROPIC_API_KEY ? "claude" : process.env.GROQ_API_KEY ? "groq" : null;
export const aiEnabled = Boolean(provider);
const MODEL = process.env.HOPKINS_MODEL || "claude-opus-5-5";
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
// Groq's free model that can see images (3 per request, about 7,000 input tokens a minute, and
// each photo costs about 1,800 whatever its size). Checked 2026-10-25.
const GROQ_VISION_MODEL = process.env.GROQ_VISION_MODEL || "qwen/qwen3.8-27b";

let client = null;
let fetchImpl = (...a) => fetch(...a);
export function setClientForTests(fake) {
  client = fake;
}
export function setFetchForTests(fake) {
  fetchImpl = fake;
}
function getClient() {
  if (!client && provider === "claude") client = new Anthropic();
  return client;
}

const FEATURE_KEYS = FEATURES.map((f) => f.key);

const SYSTEM = `You are Hopkins, a chat that runs real estate marketing like an agency would. You talk to a real estate agent, team leader or broker inside the Hopkins app. You make Instagram and Facebook ads for their listings, change them when asked, and set them up to run once the agent says yes. Nothing goes live without their yes.

How you write to the agent:
- A quiet expert with a real personality: warm, direct, a bit of dry humour when it fits. Plain words. No hype, no sales talk.
- Say "I" for yourself. Never "we", "us", "our" or "let's" (say "so you can see", not "lets us see").
- Never use dashes of any kind as punctuation. Use commas or full stops.
- Never claim a result you can't know. No invented numbers, no promised leads.
- At most one question per reply, and make it answerable in one line.

How you write ads (the copy appears on the agent's ads, in their name):
- Think like the best agency creative given this one home. Before writing, work out what would make the right buyer stop scrolling for THIS place: the one or two things that are genuinely different about it (from the facts, the agent's own words and what the photos show), who is most likely to buy it, and the moment (just listed, new price, open house, sold).
- No formula. A craftsman with a porch, a downtown condo, a fixer upper and a $4M view home need different ideas. Never fall back on the same three every time, and never make an ad that would fit any listing.
- When there's more than one ad, each is a genuinely different idea, so testing them against each other teaches something: never small tweaks of one. Idea types that work, to pick from or go beyond: the life the home gives one buyer ("slow mornings on the porch", not "3 bed 2 bath"); one standout detail with the photo that shows it; the price made concrete ("under $650K in Riverside"); the place, only with what the agent said about it; a scroll stopping question or contrarian hook; the moment itself (new price, this Saturday). A plain price and numbers ad only when that's genuinely the strongest idea for this home.
- name: each ad's own name, 1 to 3 words in sentence case, after its idea, the way an agency labels a concept on the board: "Wraparound porch", "Under $650K", "The big kitchen". Never generic ("The life", "Lifestyle", "Version 1", "Option A").
- overlay: the line on the image, and the hook of the ad. 2 to 7 words, ends with a full stop, readable at a glance. It makes one buyer feel or want something, in words they'd use themselves: "Slow mornings on the porch.", "Under $650K in Riverside.", "Room for the long table.", "Your Saturday mornings, sorted." Never just describe the photo ("Glass doors open.", "Porch lit at dusk."): the photo already shows that.
- Sell only what comes with the home: never furniture, decor, cookware, cars or people in the photos, and never the time of day or weather a photo was taken in.
- kicker: a tiny label above it, like "Just listed · Riverside" or "Open house · Sat 1 to 3pm".
- headline: under 40 characters.
- primary_text: 1 to 4 short sentences. The first 125 characters must carry the ad. End with one clear next step (book a showing, see the photos).
- photo_number: the photo that shows the idea best. Different ads use different photos where they can.
- Describe the home, never the buyer, and never the people in the photos. Fair housing: no "perfect for families", "ideal for couples", "adults only", "safe neighborhood", "exclusive", "master bedroom" (say primary), "great schools", nothing about race, religion, sex, disability, age or family status.
- Never "Realtor". Never use dashes or hyphens of any kind ("two week", "move in ready"). Don't invent features, numbers, school names or distances.
- Write as the agent would: first person singular if needed ("Send me a message"), or no person at all.
- Every detail in an ad must be in the listing facts, the agent's own words, or what the photo notes say is visible. If it isn't there, leave it out, even when it's typical for homes like this: no appliances, materials, flooring, views, renovations, "charm" or "character" unless it's there.`;

// The look of one ad. "" (or 0 for size) leaves that part as it is; "default" puts it back.
const STYLE_SCHEMA = {
  type: "object",
  properties: {
    bg: { type: "string", description: "Background colour of the fade, block, card or frame, as a hex like #2F5D46" },
    accent: { type: "string", description: "Colour of the small label and the price, as hex" },
    text: { type: "string", description: "Colour of the big line on the image, as hex" },
    font: { type: "string", description: "modern (bold sans), classic (light serif), elegant (high contrast serif), editorial (soft serif), bold (heavy sans) or minimal (light sans)" },
    layout: { type: "string", description: `One of ${LAYOUTS.join(", ")}: fade = photo full with the line at the bottom over a fade, top = the same at the top, split = photo above a solid block, card = photo full with a card showing the price, frame = photo framed in the colour with the line below` },
    size: { type: "number", description: "Text size, 0.7 to 1.4 times normal; 0 leaves it" },
    align: { type: "string", description: "left or center" },
    focus: { type: "string", description: "Which part of the photo stays in view: top, center or bottom" },
    fade: { type: "string", description: "Strength of the fade: light, normal or strong" },
    face: { type: "string", description: "on puts the agent's own photo (their profile photo) in the bottom right corner, off takes it away, \"\" leaves it" },
    reset: { type: "boolean", description: "true puts the whole look back to the brand defaults" },
  },
  required: ["bg", "accent", "text", "font", "layout", "size", "align", "focus", "fade", "face", "reset"],
  additionalProperties: false,
};

const AD_SCHEMA = {
  type: "object",
  properties: {
    version: { type: "integer", description: `Which ad, 1 to ${MAX_ADS}` },
    name: { type: "string", description: "The ad's own name, 1 to 3 words, after its idea. When changing an ad, keep its name unless the idea changed." },
    kind: { type: "string", enum: KINDS, description: "Which type of idea it is, for the testing record" },
    headline: { type: "string" },
    primary_text: { type: "string" },
    overlay: { type: "string", description: "The line on the photo. Call it that to the agent, never overlay." },
    kicker: { type: "string", description: "The small label above the line on the photo." },
    photo_number: { type: "integer", description: "Which photo to use, counting from 1. 0 keeps the current one." },
    style: STYLE_SCHEMA,
  },
  required: ["version", "name", "kind", "headline", "primary_text", "overlay", "kicker", "photo_number", "style"],
  additionalProperties: false,
};

const LISTING_SCHEMA = {
  type: "object",
  properties: {
    address: { type: "string", description: "Street address, or empty" },
    city: { type: "string" },
    area: { type: "string", description: "Neighborhood, or empty" },
    price: { type: "integer", description: "0 if unknown" },
    beds: { type: "number", description: "0 if unknown" },
    baths: { type: "number", description: "0 if unknown" },
    sqft: { type: "integer", description: "0 if unknown" },
    home_type: { type: "string", description: "condo, townhouse, craftsman, single family home... or empty" },
    open_house: { type: "string", description: "Like 'Sat 1 to 3pm', or empty" },
    features: { type: "array", items: { type: "string", enum: FEATURE_KEYS } },
  },
  required: ["address", "city", "area", "price", "beds", "baths", "sqft", "home_type", "open_house", "features"],
  additionalProperties: false,
};

const READ_SCHEMA = {
  type: "object",
  properties: {
    listing: LISTING_SCHEMA,
    photo_labels: {
      type: "array",
      items: { type: "string", enum: ["exterior", "living", "kitchen", "bedroom", "bathroom", "garden", "pool", "view", "outdoor", "office", "other"] },
      description: "One label per photo, in order",
    },
    photo_notes: {
      type: "array",
      items: { type: "string" },
      description: "One per photo, in order: what a buyer would care about that's plainly visible, in a few words. Only what you can clearly see, never the people in it.",
    },
    missing: { type: "string", description: "The one detail you most need from the agent, as a short question, or empty" },
  },
  required: ["listing", "photo_labels", "photo_notes", "missing"],
  additionalProperties: false,
};

const TURN_SCHEMA = {
  type: "object",
  properties: {
    reply: { type: "string", description: "Your message back to the agent, as you'd say it in a chat. Markdown: **bold**, lists, a small table when comparing." },
    action: {
      type: "string",
      enum: ["none", "select_version", "revise", "add_ads", "remove_ads", "update_listing", "make_ads", "run", "new_moment"],
      description:
        "none: just talking. select_version: they want to look at or work on a different ad. revise: change ads, including turning one into a different idea (put them in ads). add_ads: they want another ad or more (write the new ones in ads, numbered after the last one). remove_ads: they want ads gone (put their numbers in remove). update_listing: facts about the home changed. make_ads: make the ads (when there are none, or they want a whole fresh set). run: they want the ads to run. new_moment: a new reason to advertise (price change, open house, sold).",
    },
    version: { type: "integer", description: "The ad this turn is about, or 0 if none" },
    remove: { type: "array", items: { type: "integer" }, description: "For remove_ads: the numbers of the ads to remove. Empty otherwise." },
    moment: { type: "string", enum: ["none", "price", "open_house", "sold"] },
    ads: { type: "array", items: AD_SCHEMA, description: "Only the ads you changed or added, in full. Empty otherwise." },
    listing_patch: LISTING_SCHEMA,
    budget: { type: "number", description: "Total budget in dollars if the agent named one, else 0" },
    days: { type: "integer", description: "Days to run if named, else 0" },
  },
  required: ["reply", "action", "version", "remove", "moment", "ads", "listing_patch", "budget", "days"],
  additionalProperties: false,
};

function photoBlocks(photos) {
  const blocks = [];
  photos.slice(0, 8).forEach((p, i) => {
    if (!p.thumb) return;
    blocks.push({ type: "text", text: `Photo ${i + 1}${p.label ? ` (${p.label}${p.seen ? `: ${p.seen}` : ""})` : ""}:` });
    blocks.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: Buffer.from(p.thumb).toString("base64") } });
  });
  return blocks;
}

// One request, JSON back. system is text; messages are {role, content} where content is a
// string or Claude content blocks (images are only sent to Claude).
async function call({ system, messages, schema, effort, temperature = 0.4 }) {
  try {
    if (provider === "claude") {
      const res = await getClient().beta.messages.create({
        model: MODEL,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system,
        output_config: { effort, format: { type: "json_schema", schema } },
        messages,
      });
      if (res.stop_reason === "refusal" || res.stop_reason === "max_tokens") return null;
      return JSON.parse(res.content.filter((b) => b.type === "text").map((b) => b.text).join(""));
    }
    if (provider === "groq") {
      const text = (c) => (typeof c === "string" ? c : c.filter((b) => b.type === "text").map((b) => b.text).join("\n"));
      const body = (model) => JSON.stringify({
        model,
        // Low for writing so it sticks to the facts it was given; a bit higher for talking.
        temperature,
        // gpt-oss thinks before it answers, and the thinking counts against the free allowance.
        ...(model.startsWith("openai/gpt-oss") ? { reasoning_effort: effort === "medium" ? "medium" : "low" } : {}),
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: `${system}\n\nAnswer with only a JSON object that matches this JSON Schema, nothing before or after it:\n${JSON.stringify(schema)}` },
          ...messages.map((m) => ({ role: m.role, content: text(m.content) })),
        ],
      });
      // Each free model has its own allowance (about 8,000 tokens a minute and 200,000 a day,
      // checked 2026-10-25). When one is used up, the next one answers.
      // Each free model allows about 8,000 tokens a minute and a chat message uses 5,000 or so,
      // so right after a new listing every model can be spent for a few seconds. Rather than
      // say "busy", Hopkins waits for the first one to free up (up to 25 seconds) and asks again.
      for (let round = 0; round < 2; round++) {
      for (const model of groqModels()) {
        let waited = false;
        for (let attempt = 0; ; attempt++) {
          const res = await fetchImpl(GROQ_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
            body: body(model),
            signal: AbortSignal.timeout(45000),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.usage) console.info(`Groq ${model}: ${data.usage.total_tokens} tokens`);
            return JSON.parse(data.choices[0].message.content);
          }
          const err = await res.text();
          // Groq now and then fails to produce valid JSON (a 400 json_validate_failed); one
          // retry usually fixes it.
          if (attempt === 0 && res.status === 400 && err.includes("json_validate_failed")) continue;
          if (res.status !== 429) throw new Error(`Groq ${res.status}: ${err.slice(0, 200)}`);
          // Over a limit: Groq says how long to wait. Up to 10 seconds is worth waiting once;
          // past that, this model rests and the next one is asked.
          const wait = retryAfter(res, err);
          if (!waited && wait > 0 && wait <= 10) { waited = true; await new Promise((r) => setTimeout(r, wait * 1000 + 250)); continue; }
          resting.set(model, Date.now() + Math.min(wait || 60, 6 * 3600) * 1000);
          console.error(`Groq ${model} is over its limit for ${Math.round(wait)}s: ${err.slice(0, 160)}`);
          break;
        }
      }
      const soonest = Math.min(...[GROQ_MODEL, ...GROQ_BACKUPS].map((m) => resting.get(m) || 0)) - Date.now();
      if (round > 0 || soonest > 25000) break;
      await new Promise((r) => setTimeout(r, Math.max(0, soonest) + 300));
      }
      lastFailure = "busy";
      throw new Error("Groq: every free model is over its limit");
    }
    return null;
  } catch (err) {
    if (err.status === 429 || err.status === 529) lastFailure = "busy";
    console.error("Model call failed, using the built-in rules:", err.message);
    return null;
  }
}

// The Groq models to ask, best first, minus any resting after a limit. The best one is always
// tried when everything is resting, so a short limit never blocks the chat for long.
const GROQ_BACKUPS = (process.env.GROQ_BACKUP_MODELS ?? "openai/gpt-oss-20b,qwen/qwen3.8-27b").split(",").map((m) => m.trim()).filter(Boolean);
const resting = new Map();
function groqModels() {
  const all = [GROQ_MODEL, ...GROQ_BACKUPS.filter((m) => m !== GROQ_MODEL)];
  const ready = all.filter((m) => !(resting.get(m) > Date.now()));
  return ready.length ? ready : [GROQ_MODEL];
}
// "try again in 7m12.5s", "in 1h2m3s" or a retry-after header, in seconds.
function retryAfter(res, err) {
  const header = Number(res.headers?.get?.("retry-after"));
  if (header) return header;
  const m = err.match(/try again in (?:(\d+)h)?(?:(\d+)m)?(?:([\d.]+)s)?/);
  return m ? (Number(m[1]) || 0) * 3600 + (Number(m[2]) || 0) * 60 + (Number(m[3]) || 0) : 0;
}

// Why the last call failed: "busy" when it was the provider's rate limit. Read right after a
// call returns null, so the chat can say it's swamped instead of pretending not to understand.
let lastFailure = null;
export function takeFailure() {
  const f = lastFailure;
  lastFailure = null;
  return f;
}

export async function readListingAI({ text, linkInfo, photos }) {
  const content = [
    ...photoBlocks(photos),
    {
      type: "text",
      text: `The agent sent a new listing. Read the facts from it. Use only what's actually there.\n\nWhat they wrote:\n${text || "(nothing)"}\n\n${
        linkInfo ? `The listing link's page says:\nTitle: ${linkInfo.title || ""}\nDescription: ${linkInfo.description || ""}\n` : ""
      }\n${provider === "claude" ? "Label each photo and note what's visible in it." : "You can't see the photos here, so leave photo_labels and photo_notes empty."} If the price or the city is missing, ask for it in "missing".`,
    },
  ];
  const r = await call({ system: SYSTEM, messages: [{ role: "user", content }], schema: READ_SCHEMA, effort: "low" });
  // Only a model that saw the photos can say what's in them.
  if (r && provider !== "claude") { r.photo_labels = []; r.photo_notes = []; }
  return r;
}

// The photos as the model knows them: number, room, and what's visible when it's been seen.
export function photoList(photos) {
  return photos.map((p, i) => `${i + 1} ${p.label || "unlabelled"}${p.seen ? ` (${p.seen})` : ""}`).join("; ") || "none";
}

const adLine = (a, photos) => `Ad ${a.version}, "${a.name || "unnamed"}" (photo ${Math.max(1, photos.findIndex((p) => p.id === a.photo_id) + 1)}${a.status ? `, ${a.status}` : ""})`;

function factsFor(listing) {
  const facts = {};
  for (const k of ["address", "city", "area", "price", "beds", "baths", "sqft", "home_type", "open_house", "status", "moment"]) if (listing[k]) facts[k] = listing[k];
  facts.features = (listing.features || []).map((k) => FEATURES.find((f) => f.key === k)?.name.replace(/^the /, "") || k);
  if (listing.description) facts.agent_description = listing.description;
  return facts;
}

// The photos, three to a request (the model's limit): the room and what a buyer would care
// about that's plainly visible. Groq only; Claude sees the photos itself when it reads the
// listing. Null when it couldn't (no key, over the free limit).
export async function seePhotosAI(photos) {
  if (provider !== "groq") return null;
  const batch = photos.filter((p) => p.thumb).slice(0, 3);
  if (!batch.length) return null;
  const content = [{ type: "text", text: `These are listing photos of one home, numbered in order. For each photo give the room (one of exterior, living, kitchen, bedroom, bathroom, garden, pool, view, outdoor, office, other) and, in a few words, the parts of the home itself a buyer would care about that are plainly visible (the porch, an island, big windows, a fenced yard). Only what you can clearly see; no guesses about materials, age or condition you can't confirm. Leave out what doesn't come with the home: furniture, decor, cookware, cars, people, the light or the time of day. Reply as JSON: {"photos":[{"n":1,"room":"","seen":""}]}` }];
  batch.forEach((p, i) => {
    content.push({ type: "text", text: `Photo ${i + 1}:` });
    content.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${Buffer.from(p.thumb).toString("base64")}` } });
  });
  try {
    for (let attempt = 0; ; attempt++) {
      const res = await fetchImpl(GROQ_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
        body: JSON.stringify({ model: GROQ_VISION_MODEL, temperature: 0.2, response_format: { type: "json_object" }, max_tokens: 600, messages: [{ role: "user", content }] }),
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) {
        const err = await res.text();
        const wait = Number(res.headers?.get?.("retry-after")) || Number((err.match(/try again in ([\d.]+)s/) || [])[1]) || 0;
        if (attempt === 0 && res.status === 429 && wait > 0 && wait <= 8) { await new Promise((r) => setTimeout(r, wait * 1000 + 250)); continue; }
        throw new Error(`Groq vision ${res.status}: ${err.slice(0, 160)}`);
      }
      const out = JSON.parse((await res.json()).choices[0].message.content);
      const rooms = new Set(["exterior", "living", "kitchen", "bedroom", "bathroom", "garden", "pool", "view", "outdoor", "office", "other"]);
      return batch.map((p, i) => {
        const r = (out.photos || []).find((x) => Number(x.n) === i + 1) || (out.photos || [])[i] || {};
        return { id: p.id, label: rooms.has(r.room) ? r.room : null, seen: typeof r.seen === "string" ? r.seen.trim().slice(0, 160) : "" };
      });
    }
  } catch (err) {
    console.error("Seeing the photos failed, going on without:", err.message);
    return null;
  }
}

// One ad in a new set: like AD_SCHEMA, without the look (a new ad starts in the brand's).
const SET_AD_SCHEMA = {
  type: "object",
  properties: Object.fromEntries(Object.entries(AD_SCHEMA.properties).filter(([k]) => k !== "style")),
  required: AD_SCHEMA.required.filter((k) => k !== "style"),
  additionalProperties: false,
};
const SET_SCHEMA = {
  type: "object",
  properties: {
    insight: { type: "string", description: "First, in one or two sentences: what's genuinely different about this home and who is most likely to buy it. This decides the ideas." },
    ads: { type: "array", items: SET_AD_SCHEMA },
    reply: { type: "string", description: "To the agent, like a colleague handing them over: what you noticed about the home and what each ad tries, calling them **Ad 1**, **Ad 2** and so on (always the word Ad with its number, both in bold, never a bare number), in two to four plain sentences. No question about running, posting or paying; at most a short invite to change anything." },
  },
  required: ["insight", "ads", "reply"],
  additionalProperties: false,
};

// A set of ads for one listing. count is how many; brief is what the agent asked for, if
// anything ("one ad about the pool"); keep lists ads that stay, so new ones are different;
// fix says what was wrong with a first try.
export async function writeSetAI({ listing, photos, brand, moment, extra, count = 3, brief = "", keep = [], fix = "" }) {
  const from = keep.length ? Math.max(...keep.map((a) => a.version)) + 1 : 1;
  const content = [
    ...photoBlocks(photos),
    {
      type: "text",
      text: `The listing: ${JSON.stringify(factsFor(listing))}
Photos: ${photoList(photos)}
Brand voice: ${brand.voice || "plain"}. Agent: ${brand.agent_name || ""}${brand.business ? `, ${brand.business}` : ""}.
Moment: ${moment}${extra?.oldPrice ? ` (the price was ${extra.oldPrice})` : ""}.
${keep.length ? `Ads that stay, so make yours different from them:\n${keep.map((a) => `${adLine(a, photos)}: ${a.overlay} / ${a.headline}`).join("\n")}\n` : ""}${brief ? `What the agent asked for: ${brief}\n` : ""}
Write ${count === 1 ? "one ad" : `${count} ads`}, numbered from ${from}.${fix ? `\n\nYour last try had problems, fix them: ${fix}` : ""}`,
    },
  ];
  const r = await call({ system: SYSTEM, messages: [{ role: "user", content }], schema: SET_SCHEMA, effort: "medium", temperature: 0.7 });
  if (!r || !Array.isArray(r.ads)) return null;
  return {
    insight: typeof r.insight === "string" ? r.insight : "",
    reply: typeof r.reply === "string" ? r.reply : "",
    ads: r.ads.filter((a) => a && typeof a === "object").map((a, i) => ({ ...a, version: Number(a.version) || from + i, photo_number: Number(a.photo_number) || 0 })),
  };
}

// How Hopkins talks in the chat, on top of the house rules in SYSTEM.
const CHAT = `
In the chat:
- Talk the way Claude or ChatGPT does at their best: like a sharp colleague who knows real estate marketing inside out and enjoys talking about it. Understand what they mean, not just what they typed. React to what they actually said, say what you think and why, and be genuinely useful. Sound like a person, never like a form or a support bot ("No ads exist for this listing" is how a bot talks; "None yet, that one's waiting on Pro" is how a person does).
- Fit the length to the moment. Small talk and quick confirmations: a line or two. A real question (which version, what budget, why something works, what to post): a proper answer with the reasoning, as long as it needs to be and no longer.
- Format like a chat app that renders Markdown: **bold** the one or two things that matter most (the recommendation, a number), use a short list for options or steps, and a small table when comparing things side by side (the three versions, budgets). Short paragraphs, a blank line between them. No headings on short replies.
- Tables: two or three columns, a few words per cell (the angle, the line on the photo, who it's for). Never paste whole ad texts into a table.
- An emoji now and then is fine where a person would use one (🏡, 👀, 👍), never more than one in a reply and not in most replies.
- The voice, by example. Asked "which one would you go with?", a bland bot says "I recommend version 1, it highlights the lifestyle." You say something like:
  "**Version 1**, honestly. *Slow mornings on the porch* sells a feeling, and for a craftsman that's what people stop scrolling for. The facts one is the safe bet, but it looks like every other listing in the feed.

  It's still a guess until they run, which is exactly why all three go out with the same budget."
- When they push back or seem confused ("no they didn't?"), take it seriously: explain plainly what happened and what they can do next.
- Greetings get a greeting back and one useful line about where things stand with this listing.
- Questions about ads, marketing, Instagram, Facebook, budgets, testing or Hopkins get a real, direct answer. Give opinions and recommendations, with the reason.
- If they name a version without saying what to change ("version 2", "no, I meant 2"), switch to it (select_version) and ask what they'd like changed in a few words.
- If they ask for a change and don't name a version, change the version they're looking at.
- If something is unclear, ask one short question instead of guessing.
- A short nudge ("now?", "and?", "so?", "?", "try again", "well?") means they're still waiting on what they asked last: answer that, fully. Never ask what they mean by it.
- Call the ads "Ad 1", "Ad 2" and so on, the way the app labels them. You can say what one is about after its number ("Ad 2, the arched entry").
- Never list everything you can do unless they ask. Never repeat a reply you already gave.
- Only use facts from the context. Never invent results, numbers or features. In ads too: no appliances, materials, finishes or layout the agent didn't mention.
- Say it the way the agent would: "the line on the photo", not "overlay"; "the label", not "kicker".
- Money, exactly: the Hopkins plan is one price. The ad spend is separate, the agent chooses it and pays it to Meta. The default test is $200 over 10 days, split across the versions. Never say the plan price covers ad spend.
- A new fact about the home that isn't one of the listed features (solar panels, a new roof) is still a fact: use update_listing, work it into the versions where it fits (put them in ads), and never mention a feature list or any other part of how you work.
- Small talk ("lol ok", "cool") gets a short, natural reply. Don't push them to run or upgrade.
- You can change how every ad looks, not only the words, and you never say you can't: background colour, the colour of the label and price, the colour of the big line, the font (modern, classic, elegant, editorial, bold or minimal), the layout (fade, top, split, card, frame), text size, left or centred, which part of the photo stays in view, and how strong the fade is. Put those in ads[].style for each ad you change (with its words and name copied as they are). Fill in only the parts they asked for and leave every other style field as "" (size 0), so nothing else changes. Use refined colours, never pure web ones: navy #1F2A44, gold #D7AE62, black #111111, cream #F4EBDD, green #2F5D46, burgundy #6D1F2C, white #FFFFFF. If an earlier reply in this chat said you can't change colours, fonts or layout, that was wrong: say so plainly ("I got that wrong earlier, I can"). "All of them" or "all three" means every ad. With no colours set, the ads use the agent's brand colours. Pick colours with enough contrast to read. In the reply, name colours in words ("navy", "gold"), never hex codes, and only say what you actually changed in this turn, not earlier changes. You can also put the agent's own photo in the bottom right corner of an ad (style face: on) and take it off (face: off). You are Hopkins: always speak as yourself, in the first person. Never mention "the platform", "the system", "the app", "the tool" or anyone who decides what you can do; if you can't do something yet, say "I can't do that yet" and offer the nearest thing you can. If the agent says a change didn't happen ("no you didn't"), check each ad's Look in the context before answering: if it did happen, say so plainly; if it didn't, make the change now in ads[].style. Never say you'll do something "now" or "next" without doing it in this same reply. If they ask for something the ads can't do (a second photo in one ad, animation, a video), say so plainly and offer the nearest thing you can do.
- What's real today, say it exactly when asked: Hopkins makes and edits the ads (words and look) here, checks the wording, makes the run plan, gives each version a lead page and link, and collects the leads. It is not connected to Meta yet, so nothing goes live on Facebook or Instagram from here, there's no account to link, and there are no performance numbers to see. A plan the agent says yes to waits until that connection is ready; on Pro they can download the ads and post or boost them themselves. Never claim more than this.
- The free plan: 3 ads in all, made in the chat, full quality with no watermark, and they can be downloaded. Changes to those 3 are included. Any new ad after that (a new set, another ad, ads for another listing, even after deleting a listing) and running ads need Pro, the paid plan, which is $299 a month, billed every month from the day they sign up, cancel anytime, no cut of ad spend. Say this plainly when it matters, once.`;

function contextText({ listing, photos, brand, ads, selectedVersion, plan, agentName, agentPhoto }) {
  return `Context (the current state, not something the agent wrote):
Agent: ${agentName || "unknown"}${brand.business ? `, ${brand.business}` : ""}. Brand voice: ${brand.voice || "plain"}. Their own photo: ${agentPhoto ? "added, so it can go on the ads (face: on)" : "not added yet (they add it in Settings, then it can go on the ads)"}.
Plan: ${plan.paid ? "paid" : `free, ${plan.adsMade} of ${plan.limit} free ads used`}.${!plan.paid && plan.adsMade >= plan.limit ? `
The free ads are used up (deleted listings still count). No new ads can be made on this account until it's on Pro, so never offer to make them or ask if they want to go ahead; changes to ads that already exist are still free, including turning one into a different idea.` : ""}
Listing: ${JSON.stringify(factsFor(listing))}
Photos: ${photoList(photos)}
Ads: ${ads.length ? `${ads.length} (up to ${MAX_ADS} per listing)` : "none yet"}
${ads.map((a) => `${adLine(a, photos)}:
  On the image: ${a.overlay}
  Look: ${describeStyle(a.style)}
  Label: ${a.kicker}
  Headline: ${a.headline}
  Text: ${a.primary_text}`).join("\n")}
The agent is looking at ad ${selectedVersion || 1}. Call the ads by their names when you talk about them ("the porch one"), or by number when that's clearer.`;
}

// The stored chat as a real back and forth: the agent's messages as the user, Hopkins' as the
// assistant, starting with the agent and never two turns in a row from the same side.
function conversation(history) {
  const out = [];
  for (const m of history.slice(-24)) {
    const role = m.role === "agent" ? "user" : "assistant";
    // Photos sent without words still happened in the conversation.
    const data = (() => { try { return (typeof m.data === "string" ? JSON.parse(m.data) : m.data) || {}; } catch { return {}; } })();
    // "I'm getting a lot of messages" never reached the model, so it isn't part of the talk:
    // the question before it and a "now?" after it read as one message to answer.
    if (data.busy) continue;
    const photos = data.photos?.length || 0;
    const body = m.body || (photos ? `(sent ${photos} ${photos === 1 ? "photo" : "photos"})` : "");
    if (!body) continue;
    if (out.length && out[out.length - 1].role === role) out[out.length - 1].content += "\n\n" + body;
    else out.push({ role, content: body });
  }
  while (out.length && out[0].role !== "user") out.shift();
  return out;
}

const ACTIONS = new Set(["none", "select_version", "revise", "add_ads", "remove_ads", "update_listing", "make_ads", "run", "new_moment"]);
// Models don't always fill every field; this makes the answer safe to act on.
function normalizeTurn(r) {
  if (!r || typeof r !== "object" || typeof r.reply !== "string") return null;
  const num = (v) => (typeof v === "number" && isFinite(v) ? v : Number(v) || 0);
  return {
    reply: r.reply,
    action: ACTIONS.has(r.action) ? r.action : "none",
    version: num(r.version) >= 1 && num(r.version) <= MAX_ADS ? num(r.version) : 0,
    remove: Array.isArray(r.remove) ? [...new Set(r.remove.map(num).filter((v) => v >= 1 && v <= MAX_ADS))] : [],
    moment: ["price", "open_house", "sold"].includes(r.moment) ? r.moment : "none",
    ads: Array.isArray(r.ads) ? r.ads.filter((a) => a && num(a.version) >= 1 && num(a.version) <= MAX_ADS).map((a) => ({ ...a, version: num(a.version), photo_number: num(a.photo_number) })) : [],
    listing_patch: r.listing_patch && typeof r.listing_patch === "object" ? r.listing_patch : null,
    budget: num(r.budget),
    days: num(r.days),
  };
}

// Before there's a listing (the New listing screen): just talk, and help them get one in.
const NEW_SCHEMA = {
  type: "object",
  properties: { reply: { type: "string", description: "Your message back to the agent. Markdown: **bold**, lists when useful." } },
  required: ["reply"],
  additionalProperties: false,
};

export async function newChatAI({ history, brand, plan, agentName }) {
  const messages = conversation(history);
  if (!messages.length) return null;
  const system = `${SYSTEM}\n${CHAT}\n\nContext (the current state, not something the agent wrote):
Agent: ${agentName || "unknown"}${brand.business ? `, ${brand.business}` : ""}.
Plan: ${plan.paid ? "paid" : `free, ${plan.adsMade} of ${plan.limit} free ads used`}.
They're on the New listing screen and haven't sent a listing yet. To make ads you need the listing: a link, photos, or the details (address, price, beds, baths, what stands out). Talk normally, and when it fits, say what you need to start.`;
  const r = await call({ system, messages, schema: NEW_SCHEMA, effort: "low", temperature: 0.7 });
  return r && typeof r.reply === "string" && r.reply.trim() ? r.reply : null;
}

export async function chatTurnAI({ listing, photos, brand, ads, history, selectedVersion, plan, agentName, agentPhoto }) {
  const messages = conversation(history);
  if (!messages.length) return null;
  const system = `${SYSTEM}\n${CHAT}\n\n${contextText({ listing, photos, brand, ads, selectedVersion, plan, agentName, agentPhoto })}\n\nFor listing_patch, return the listing facts as they should now be (copy the current values for anything unchanged, empty or 0 if unknown).`;
  const raw = await call({ system, messages, schema: TURN_SCHEMA, effort: "low", temperature: 0.7 });
  if (process.env.HOPKINS_DEBUG) console.log("chat turn:", JSON.stringify(raw));
  return normalizeTurn(raw);
}
