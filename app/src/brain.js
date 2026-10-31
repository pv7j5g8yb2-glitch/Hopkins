import Anthropic from "@anthropic-ai/sdk";
import { FEATURES } from "./listing.js";
import { KINDS, MAX_ADS } from "./writer.js";
import { LAYOUTS, describeStyle } from "./style.js";

// The model behind the chat. Claude when ANTHROPIC_API_KEY is set; otherwise Google's Gemini
// when GEMINI_API_KEY is set (its free tier, 2026-10-28: Ismael wanted the best free model,
// one that sees photos and reads links); otherwise Groq's free model. With Gemini and Groq both
// set, Groq answers when Gemini is over its free limit. Every call returns null on any failure
// and the caller falls back to the built-in reader, writer and rules, so the chat never breaks
// because a model call did.
//
// Four jobs: see the photos, read a listing from what the agent sent, write the ads, and take
// one chat turn: hold a real conversation and, when the agent asks for something, do it.

export const provider = process.env.ANTHROPIC_API_KEY ? "claude" : process.env.GEMINI_API_KEY ? "gemini" : process.env.GROQ_API_KEY ? "groq" : null;
// Claude and Gemini see the photos themselves; Groq's chat model can't.
export const seesPhotos = provider === "claude" || provider === "gemini";
export const aiEnabled = Boolean(provider);
const MODEL = process.env.HOPKINS_MODEL || "claude-opus-5-5";
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
// The Gemini model that answers free keys first. Checked 2026-10-28: 3.5 Flash answered every
// time (2 to 18 seconds); 3.8 and 3.7 Flash answered "high demand" every time, one after 132
// seconds; 2.5 Flash is closed to new keys. The newer ones stay after it for when they free up.
// 3.5 Flash Lite comes last: weaker, but it sees photos and has its own free allowance, which
// the live site needed the same day when the others ran out.
const GEMINI_MODELS = (process.env.GEMINI_MODEL || "gemini-3.5-flash,gemini-3.8-flash,gemini-3.7-flash,gemini-3.5-flash-lite").split(",").map((m) => m.trim()).filter(Boolean);
const GEMINI_URL = (model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
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

const SYSTEM = `You are Hopkins, a chat that runs real estate marketing like an agency would. You talk to a real estate agent, team leader, broker or property manager inside the Hopkins app. You make Instagram and Facebook ads for their listings, homes for sale and homes for rent, change them when asked, and set them up to run once the agent approves them. Nothing goes live without their approval.

You're also a capable everyday assistant, like ChatGPT or Claude. Help with whatever they ask, about the listing or not: an email or text to a client, a reply to a buyer or tenant, a social post, a listing description, a question about the market, mortgages or their business, a bit of maths, or anything else. Answer it properly and fully. Don't steer the conversation back to the listing, the ads or Hopkins unless they ask or it genuinely helps.

Think like an experienced real estate marketer, not a form. Read what they send the way a colleague would: "$2,400/mo" or "2400 a month" is a rental, "pcm" is per calendar month, "just reduced" is a new price, "3/2" is 3 bed 2 bath. Use common sense, never ask for something they already said or that's obvious, and never treat a rental as a sale or a sale as a rental.

How you write to the agent:
- A quiet expert with a real personality: warm, direct, a bit of dry humour when it fits. Plain words. No hype, no sales talk.
- Say "I" for yourself. Never "we", "us", "our" or "let's" (say "so you can see", not "lets us see").
- Never use dashes of any kind as punctuation. Use commas or full stops.
- Never claim a result you can't know. No invented numbers, no promised Leads. Write Lead and Leads with a capital L, always.
- At most one question per reply, and make it answerable in one line.

How you write ads (the copy appears on the agent's ads, in their name):
- Think like the best agency creative given this one home. Before writing, work out what would make the right buyer (or renter) stop scrolling for THIS place: the one or two things that are genuinely different about it (from the facts, the agent's own words and what the photos show), who is most likely to buy or rent it, and the moment (just listed, coming soon, new price, open house, under contract, back on the market, sold or rented). Coming soon builds a list before it's on the market; under contract and sold speak to people who want one like it or have one to sell; back on the market is a second chance.
- A home for rent (its "for" fact is rent) is written for renters: the rent always per month with /mo ("$2,400/mo"), never as a purchase price, never "own", "buy", "invest" or "your forever home"; the kicker says "For rent", not "Just listed"; the next step is to book a showing or apply. Ideas that work for rentals: the space or the location for the money ("2 beds in Midtown, $2,400/mo"), the move in date, what's included, pets welcome when the agent says so, the walk or the commute, the one standout detail.
- No formula. A craftsman with a porch, a downtown condo, a fixer upper and a $4M view home need different ideas. Never fall back on the same three every time, and never make an ad that would fit any listing.
- Prices are in the listing's own currency (its currency fact: EUR is €, GBP is £, AED is AED; none means US dollars). Write a listing in euros as €1.25M, never with $.
- When there's more than one ad, each is a genuinely different idea, so testing them against each other teaches something: never small tweaks of one. Idea types that work, to pick from or go beyond: the life the home gives one buyer ("slow mornings on the porch", not "3 bed 2 bath"); one standout detail with the photo that shows it; the price made concrete ("under $650K in Riverside"); the place, only with what the agent said about it; a scroll stopping question or contrarian hook; the moment itself (new price, this Saturday). A plain price and numbers ad only when that's genuinely the strongest idea for this home.
- name: each ad's own name, 1 to 3 words in sentence case, after its idea, the way an agency labels a concept on the board: "Wraparound porch", "Under $650K", "The big kitchen". Never generic ("The life", "Lifestyle", "Version 1", "Option A").
- overlay: the line on the image, and the hook of the ad. 2 to 7 words, ends with a full stop, readable at a glance. It makes one buyer feel or want something, in words they'd use themselves: "Slow mornings on the porch.", "Under $650K in Riverside.", "Room for the long table.", "Your Saturday mornings, sorted." Never just describe the photo ("Glass doors open.", "Porch lit at dusk."): the photo already shows that.
- Sell only what comes with the home: never furniture, decor, cookware, cars or people in the photos, and never the time of day or weather a photo was taken in.
- kicker: a tiny label above it, like "Just listed · Riverside" or "Open house · Sat 1 to 3pm".
- headline: under 40 characters.
- primary_text: 1 to 4 short sentences. The first 125 characters must carry the ad. End with one clear next step (book a showing, see the photos).
- photo_number: the photo that shows the idea best. Different ads use different photos where they can.
- Describe the home, never the buyer, and never the people in the photos. Fair housing: no "perfect for families", "ideal for couples", "adults only", "safe neighborhood", "exclusive", "master bedroom" (say primary), "great schools", nothing about race, religion, sex, disability, age or family status. For rentals also never "no Section 8", "no vouchers", "students only", "professionals only", "no kids", "mature tenants" or "ideal for a single person".
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
    subline: { type: "string", description: "A second line under the line on the photo, in the same font and colours (\"under the price put X\" goes here, leaving the line as it is). Copy the current one unchanged; empty means none." },
    photo_number: { type: "integer", description: "Which photo to use, counting from 1. 0 keeps the current one." },
    style: STYLE_SCHEMA,
  },
  required: ["version", "name", "kind", "headline", "primary_text", "overlay", "kicker", "subline", "photo_number", "style"],
  additionalProperties: false,
};

const LISTING_SCHEMA = {
  type: "object",
  properties: {
    address: { type: "string", description: "Street address, or empty" },
    city: { type: "string" },
    area: { type: "string", description: "Neighborhood, or empty" },
    deal: { type: "string", enum: ["sale", "rent"], description: "Whether the home is for sale or for rent, judged the way a person would from everything said and shown: a price per month (\"$2,400/mo\", \"2400 a month\"), \"for rent\", \"lease\", a deposit or a move in date mean rent. A sale's HOA or tax per month doesn't." },
    price: { type: "integer", description: "The asking price, or for a rental the rent per month. 0 if unknown" },
    beds: { type: "number", description: "0 if unknown" },
    baths: { type: "number", description: "0 if unknown" },
    sqft: { type: "integer", description: "0 if unknown" },
    home_type: { type: "string", description: "condo, townhouse, craftsman, single family home... or empty" },
    open_house: { type: "string", description: "Like 'Sat 1 to 3pm', or empty" },
    features: { type: "array", items: { type: "string", enum: FEATURE_KEYS } },
  },
  required: ["address", "city", "area", "deal", "price", "beds", "baths", "sqft", "home_type", "open_house", "features"],
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
      enum: ["none", "select_version", "revise", "add_ads", "remove_ads", "update_listing", "make_ads", "run", "pause", "resume", "change_run", "new_moment"],
      description:
        "none: just talking. select_version: they want to look at or work on a different ad. revise: change ads, including turning one into a different idea (put them in ads). add_ads: they want another ad or more (write the new ones in ads, numbered after the last one). remove_ads: they asked to delete or remove ads from the listing (put their numbers in remove); never for stopping ads that run. update_listing: facts about the home changed. make_ads: make the ads (when there are none, or they want a whole fresh set). run: they want ads to start running (a new plan). pause: they want running ads to stop (stop, pause, turn off, kill, take down), even when they say stop the ad or stop them. resume: they want paused ads to run again. change_run: they want the ads already running (or paused) to spend more or less, or run longer or shorter (put the new total in budget and the new total length in days, 0 for the one that stays). new_moment: a new reason to advertise (price change, open house, coming soon, under contract or pending, back on the market, sold, or rented for a rental: that's moment sold too).",
    },
    version: { type: "integer", description: "The ad this turn is about, or 0 if none" },
    remove: { type: "array", items: { type: "integer" }, description: "For remove_ads: the numbers of the ads to remove. Empty otherwise." },
    moment: { type: "string", enum: ["none", "price", "open_house", "coming_soon", "under_contract", "back", "sold"] },
    ads: { type: "array", items: AD_SCHEMA, description: "Only the ads you changed or added, in full. Empty otherwise." },
    listing_patch: LISTING_SCHEMA,
    budget: { type: "number", description: "Total budget in dollars if the agent named one, else 0" },
    days: { type: "integer", description: "Days to run if named, else 0" },
    undo: { type: "boolean", description: "True when the agent wants the last change taken back (undo, put it back, I didn't ask for that, change it back). Any new change they ask for in the same message goes in action and ads as usual, applied after the undo." },
    brand: {
      type: "object",
      description: "Changes to the agent's own details, only what they asked to change (\"change my name to Pierre\", \"my brokerage is Meridian Realty\"); empty strings for everything else. These show on every ad.",
      properties: { agent_name: { type: "string" }, business: { type: "string" }, phone: { type: "string" }, license: { type: "string" }, instagram: { type: "string" }, email: { type: "string" } },
      required: ["agent_name", "business", "phone", "license", "instagram", "email"],
      additionalProperties: false,
    },
  },
  required: ["reply", "action", "version", "remove", "moment", "ads", "listing_patch", "budget", "days", "undo", "brand"],
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
// string or Claude content blocks (images go to Claude and Gemini, never to Groq).
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
    if (provider === "gemini") {
      const asked = gemini({ system, messages, schema, temperature });
      if (!process.env.GROQ_API_KEY) return await asked;
      // Free Gemini usually answers in a few seconds, but now and then it hangs until each
      // model times out in turn, which left a simple question waiting ten minutes (Ismael,
      // 2026-10-30). So when it hasn't answered in 12 seconds, Groq is asked too and the first
      // answer wins. Photos only go to Gemini, so a request with photos just waits for it.
      if (hasImages(messages)) {
        const out = await asked;
        if (out) return out;
        console.error("Gemini didn't answer; Groq is answering instead.");
        return await groq({ system, messages, schema, effort, temperature });
      }
      return await hedged(asked, () => groq({ system, messages, schema, effort, temperature }), HEDGE_MS);
    }
    if (provider === "groq") return await groq({ system, messages, schema, effort, temperature });
    return null;
  } catch (err) {
    if (err.status === 429 || err.status === 529) lastFailure = "busy";
    console.error("Model call failed, using the built-in rules:", err.message);
    return null;
  }
}

// Groq's free models, best first: the backup when Gemini fails or is slow, or the only one.
async function groq({ system, messages, schema, effort, temperature }) {
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

// The first answer of the two. The backup is only asked when the first hasn't answered in ms
// (or failed), so it's rarely used and its free allowance lasts.
const HEDGE_MS = Number(process.env.AI_HEDGE_MS) || 12000;
const SLOW = Symbol("slow");
async function hedged(asked, backup, ms) {
  const first = asked.catch((err) => { console.error("Gemini failed:", err.message); return null; });
  let timer;
  const early = await Promise.race([first, new Promise((r) => { timer = setTimeout(() => r(SLOW), ms); })]);
  clearTimeout(timer);
  if (early !== SLOW) {
    if (early) return early;
    console.error("Gemini didn't answer; Groq is answering instead.");
    return backup();
  }
  console.error(`Gemini is slow (over ${Math.round(ms / 1000)}s); asking Groq too.`);
  const second = backup().catch((err) => { console.error("Groq failed:", err.message); return null; });
  return new Promise((resolve) => {
    let left = 2;
    const done = (v) => { if (v) resolve(v); else if (--left === 0) resolve(null); };
    first.then(done);
    second.then(done);
  });
}
const hasImages = (messages) => messages.some((m) => Array.isArray(m.content) && m.content.some((b) => b.type && b.type !== "text"));

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

// Claude content (strings, or text and base64 image blocks) as Gemini parts.
function geminiParts(content) {
  if (typeof content === "string") return [{ text: content }];
  return content.map((b) => (b.type === "image" ? { inlineData: { mimeType: b.source.media_type, data: b.source.data } } : { text: b.text || "" }));
}
// The text of Gemini's answer, without its thinking.
const geminiText = (data) => (data?.candidates?.[0]?.content?.parts || []).filter((p) => !p.thought && typeof p.text === "string").map((p) => p.text).join("");
// Gemini once took JSON Schema as is; if this one won't, the schema goes in the instructions.
let geminiSchemaOk = true;

// One Gemini request with JSON back. Null when it couldn't answer (over the free limit, down,
// blocked); "busy" is noted when it was the limit, so the chat can say so.
// A model that said it's overloaded or over its limit rests a while, so the next message goes
// straight to one that answers (2026-10-28: the newest free ones answered "high demand" for a
// while, taking up to 10 seconds each to say so).
const geminiResting = new Map();
async function gemini({ system, messages, schema, temperature, tools }) {
  const contents = messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: geminiParts(m.content) }));
  const ready = GEMINI_MODELS.filter((m) => !(geminiResting.get(m) > Date.now()));
  let limited = false;
  for (const model of ready.length ? ready : GEMINI_MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const withSchema = schema && geminiSchemaOk && !tools;
      const res = await fetchImpl(GEMINI_URL(model), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: withSchema || !schema ? system : `${system}\n\nAnswer with only a JSON object that matches this JSON Schema, nothing before or after it:\n${JSON.stringify(schema)}` }] },
          contents,
          ...(tools ? { tools } : {}),
          generationConfig: { temperature, ...(tools ? {} : { responseMimeType: "application/json" }), ...(withSchema ? { responseJsonSchema: schema } : {}) },
        }),
        // Reading a link through Google can take 40 seconds; anything else that slow is stuck.
        signal: AbortSignal.timeout(tools ? 75000 : 40000),
      }).catch((err) => ({ ok: false, status: 504, text: async () => err.message }));
      if (res.ok) {
        const data = await res.json();
        if (data.usageMetadata) console.info(`Gemini ${model}: ${data.usageMetadata.totalTokenCount} tokens`);
        const text = geminiText(data);
        if (!text) throw new Error(`Gemini gave no answer (${data?.candidates?.[0]?.finishReason || data?.promptFeedback?.blockReason || "empty"})`);
        if (tools) return { data, text };
        try { return JSON.parse(text); } catch { if (attempt === 0) continue; throw new Error("Gemini's answer wasn't JSON"); }
      }
      const err = await res.text();
      if (res.status === 404) break; // that model name is gone: try the next
      if (res.status === 400 && withSchema && /schema/i.test(err)) { geminiSchemaOk = false; continue; }
      if (res.status === 429 || res.status === 503 || res.status === 504) {
        // Over the free limit, or "high demand": this model rests and the next one is asked.
        const wait = Number((err.match(/"retryDelay":\s*"(\d+)s"/) || [])[1]) || 0;
        geminiResting.set(model, Date.now() + Math.max(wait, res.status === 503 ? 30 : 60) * 1000);
        if (res.status === 429) limited = true;
        console.error(`Gemini ${model} ${res.status === 429 ? "is over its free limit" : "is overloaded"}; trying the next one.`);
        break;
      }
      if (res.status >= 500 && attempt === 0) { await new Promise((r) => setTimeout(r, 1500)); continue; }
      if (res.status >= 500) break;
      throw new Error(`Gemini ${res.status}: ${err.slice(0, 200)}`);
    }
  }
  if (limited) lastFailure = "busy";
  return null;
}

// A listing link Hopkins' own request couldn't open (a portal that blocks apps), read through
// Google's URL context instead, Google's own fetcher, a documented API feature. Only what the
// page actually says: when Google couldn't open it either, null, never a guess.
export async function readLinkAI(url) {
  if (provider !== "gemini") return null;
  try {
    const r = await gemini({
      system: "You read real estate listing pages. Use only what the page actually says. Never guess or fill in anything.",
      messages: [{ role: "user", content: `Open this listing page and read it: ${url}\n\nAnswer with only a JSON object, nothing before or after it: {"opened": true or false, "title": "the listing's title", "description": "in English, every fact on the page about the home: the address or area, the price with its currency (like €4,995,000), the number of bedrooms as N bed and bathrooms as N bath, the size with its unit, the type of home, and the seller's or agent's own description, translated if needed", "photos": ["full URLs of the listing's own photos, if the page lists them"]}. If you couldn't open the page, answer {"opened": false}.` }],
      temperature: 0.1,
      tools: [{ url_context: {} }],
    });
    if (!r) return null;
    const meta = r.data?.candidates?.[0]?.urlContextMetadata?.urlMetadata || [];
    if (!meta.some((m) => /SUCCESS/.test(m.urlRetrievalStatus || ""))) return null;
    const out = JSON.parse((r.text.match(/\{[\s\S]*\}/) || ["{}"])[0]);
    if (!out.opened || !(out.title || out.description)) return null;
    const photos = (Array.isArray(out.photos) ? out.photos : []).filter((u) => typeof u === "string" && /^https:\/\//.test(u)).slice(0, 25).map((u) => ({ url: u, thumb: u }));
    return { title: out.title || null, description: out.description || null, image: photos[0]?.url || null, photos };
  } catch (err) {
    console.error("Reading the link through Google failed:", err.message);
    return null;
  }
}

export async function readListingAI({ text, linkInfo, photos }) {
  const content = [
    ...photoBlocks(photos),
    {
      type: "text",
      text: `The agent sent a new listing. Read the facts from it. Use only what's actually there.\n\nWhat they wrote:\n${text || "(nothing)"}\n\n${
        linkInfo ? `The listing link's page says:\nTitle: ${linkInfo.title || ""}\nDescription: ${linkInfo.description || ""}\n` : ""
      }\n${seesPhotos ? "Label each photo and note what's visible in it." : "You can't see the photos here, so leave photo_labels and photo_notes empty."} If the price or the city is missing, ask for it in "missing".`,
    },
  ];
  const r = await call({ system: SYSTEM, messages: [{ role: "user", content }], schema: READ_SCHEMA, effort: "low" });
  // Only a model that saw the photos can say what's in them.
  if (r && !seesPhotos) { r.photo_labels = []; r.photo_notes = []; }
  return r;
}

// The photos as the model knows them: number, room, and what's visible when it's been seen.
export function photoList(photos) {
  return photos.map((p, i) => `${i + 1} ${p.label || "unlabelled"}${p.seen ? ` (${p.seen})` : ""}`).join("; ") || "none";
}

const adLine = (a, photos) => `Ad ${a.version}, "${a.name || "unnamed"}" (photo ${Math.max(1, photos.findIndex((p) => p.id === a.photo_id) + 1)}${a.status ? `, ${a.status}` : ""})`;

function factsFor(listing) {
  const facts = {};
  for (const k of ["address", "city", "area", "price", "currency", "beds", "baths", "sqft", "home_type", "open_house", "status", "moment"]) if (listing[k]) facts[k] = listing[k];
  facts.for = listing.deal === "rent" ? "rent (price is the rent per month)" : "sale";
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
    reply: { type: "string", description: "To the agent, like a colleague handing them over: what you noticed about the property and what each ad tries, calling them **Ad 1**, **Ad 2** and so on (always the word Ad with its number, both in bold, never a bare number), in two to four plain sentences. No question about running, posting or paying; at most a short invite to change anything." },
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
- Relaxed and professional (Ismael, 2026-10-29), like a smart colleague they get on with: friendly, natural, plain words, a person, never a form or a robot. Understand what they mean, not just what they typed, and react to what they actually said. Small talk gets a natural, friendly reply, not a pitch. No hype, no filler, no repeating their words back, no offers of more help at the end. Never sound like a form ("No ads exist for this listing"); say it straight ("None yet. That one needs an upgrade.").
- Fit the length to the moment. Quick things and confirmations: a line or two. A real request (an email, a description, which ad, what budget, an explanation): a proper answer, as long as it needs to be and no longer.
- Format like a chat app that renders Markdown: **bold** the one or two things that matter most (the recommendation, a number), use a short list for options or steps, and a small table when comparing things side by side (the three versions, budgets). Short paragraphs, a blank line between them. No headings on short replies.
- Tables: two or three columns, a few words per cell (the angle, the line on the photo, who it's for). Never paste whole ad texts into a table.
- An emoji now and then is fine where a person would use one (🏡, 👀, 👍), never more than one in a reply and not in most replies.
- The voice, by example. Asked "which one would you go with?", a bland bot says "I recommend version 1, it highlights the lifestyle." You say something like:
  "**Version 1**, honestly. *Slow mornings on the porch* sells a feeling, and for a craftsman that's what people stop scrolling for. The facts one is the safe bet, but it looks like every other listing in the feed.

  It's still a guess until they run, which is exactly why all three go out with the same budget."
- When they push back or seem confused ("no they didn't?"), take it seriously: explain plainly what happened and what they can do next.
- Greetings get a natural greeting back. Mention the listing only if something there is waiting on them.
- Anything that isn't about changing the ads (a question, an email to write, general help) is action none, with the full answer in reply. Never change the ads unless they ask.
- Questions about ads, marketing, Instagram, Facebook, budgets, testing or Hopkins get a real, direct answer. Give opinions and recommendations, with the reason.
- If they name a version without saying what to change ("version 2", "no, I meant 2"), switch to it (select_version) and ask what they'd like changed in a few words.
- If they ask for a change and don't name a version, change the version they're looking at.
- If something is unclear, ask one short question instead of guessing.
- A short nudge ("now?", "and?", "so?", "?", "try again", "well?") means they're still waiting on what they asked last: answer that, fully. Never ask what they mean by it.
- In the chat, call it the property (properties for more than one), never the home or homes. Ad copy is different: there, "home" is fine where a buyer or renter would say it.
- Call the ads "Ad 1", "Ad 2" and so on, the way the app labels them. You can say what one is about after its number ("Ad 2, the arched entry").
- Never list everything you can do unless they ask. Never repeat a reply you already gave.
- About this listing, its ads and their account, only use facts from the context: never invent results, numbers or features. In ads too: no appliances, materials, finishes or layout the agent didn't mention. For general questions, answer from what you know, and say plainly when you're not sure. You can't look up live information (today's rates, news, the weather); say so in a few words and still help with what you can.
- Say it the way the agent would: "the line on the photo", not "overlay"; "the label", not "kicker".
- Money, exactly: the Hopkins plan is one price. The ad spend is separate, the agent chooses it and pays it to Meta. The default test is $200 over 10 days ($20 a day), split across the versions; for another length, work it out at $20 a day (two weeks is $280) and say the agent can change it. Never say the plan price covers ad spend.
- A new fact about the home that isn't one of the listed features (solar panels, a new roof) is still a fact: use update_listing, work it into the versions where it fits (put them in ads), and never mention a feature list or any other part of how you work.
- Small talk ("lol ok", "cool") gets a short, natural reply. Don't push them to run or upgrade.
- You can change how every ad looks, not only the words, and you never say you can't: background colour, the colour of the label and price, the colour of the big line, the font (modern, classic, elegant, editorial, bold or minimal), the layout (fade, top, split, card, frame), text size, left or centred, which part of the photo stays in view, and how strong the fade is. Put those in ads[].style for each ad you change (with its words and name copied as they are). Fill in only the parts they asked for and leave every other style field as "" (size 0), so nothing else changes. Use refined colours, never pure web ones: navy #1F2A44, gold #D7AE62, black #111111, cream #F4EBDD, green #2F5D46, burgundy #6D1F2C, white #FFFFFF. If an earlier reply in this chat said you can't change colours, fonts or layout, that was wrong: say so plainly ("I got that wrong earlier, I can"). "All of them" or "all three" means every ad. With no colours set, the ads use the agent's brand colours. Pick colours with enough contrast to read. In the reply, name colours in words ("navy", "gold"), never hex codes, and only say what you actually changed in this turn, not earlier changes. You can also put the agent's own photo in the bottom right corner of an ad (style face: on) and take it off (face: off). You are Hopkins: always speak as yourself, in the first person. Never mention "the platform", "the system", "the app", "the tool" or anyone who decides what you can do; if you can't do something yet, say "I can't do that yet" and offer the nearest thing you can. If the agent says a change didn't happen ("no you didn't"), check each ad's Look in the context before answering: if it did happen, say so plainly; if it didn't, make the change now in ads[].style. Never say you'll do something "now" or "next" without doing it in this same reply. If they ask for something the ads can't do (a second photo in one ad, animation, a video), say so plainly and offer the nearest thing you can do.
- What's real today, say it exactly when asked: Hopkins makes and edits the ads (words and look) here, checks the wording, makes the run plan, gives each version a lead page and link, and collects the leads. Whether ads run on Facebook and Instagram from here depends on the Meta line in the context; never claim more than it says. Hopkins doesn't track clicks, reach or engagement.
- The free plan: 3 ads in all, made in the chat, full quality with no watermark, and they can be downloaded. Changes to those 3 are included. Any new ad after that (a new set, another ad, ads for another listing, even after deleting a listing) and running ads need a paid plan. The plans are priced by the agents whose names go on the ads, with unlimited listings: Solo $99 a month (1 agent), Duo $149 (2 agents), Team $299 (up to 5), Team Plus $549 (up to 10), Max $799 (up to 15), Max Plus $999 (up to 20), and more than 20 agents by quote. Billed every month from the day they sign up, cancel anytime, no cut of ad spend; the waitlist gets 30% off the first year. Say this plainly when it matters, once, and only the plan that fits them unless they ask for the list. What running ads costs: the budget they pick is the ad spend itself, paid to Meta, never on top of it (the test defaults to $200 over 10 days, and they can change it); the plan is separate. Never say ad spend is added to the budget.`;

function contextText({ listing, photos, brand, ads, selectedVersion, plan, agentName, agentPhoto, leads, meta, running }) {
  return `Context (the current state, not something the agent wrote):
Ads running now: ${running === "running" ? "yes, this listing's approved ads are running. To stop them the action is pause; deleting ads (remove_ads) never stops a run. To change their budget or length the action is change_run, never a new plan." : running === "paused" ? "no, they're paused. To start them again the action is resume. To change their budget or length the action is change_run." : "no."} Never say ads were paused, stopped, started or deleted unless your action does it.
Meta: ${meta?.ready ? `connected (ad account ${meta.adAccountName || ""}, Page ${meta.pageName || ""}). An approved plan is sent to Meta and each ad goes live on Facebook and Instagram once Meta reviews it; Hopkins brings back what's been spent and when each ad goes live or is rejected.` : meta?.connected ? "connected, but the ad account or Facebook Page isn't picked yet: they choose both in Settings." : "not connected. Approved ads go live once they connect Meta in Settings (one connection covers Facebook and Instagram); until then, on a paid plan, they can download the ads and post or boost them themselves."}
Agent: ${agentName || "unknown"}${brand.business ? `, ${brand.business}` : ""}. Brand voice: ${brand.voice || "plain"}. Their own photo: ${agentPhoto ? "added, so it can go on the ads (face: on)" : "not added yet (they add it in Settings, then it can go on the ads)"}.
Plan: ${plan.paid ? `${plan.name || "Solo"} (paid)` : `free, ${plan.adsMade} of ${plan.limit} free ads used`}.${!plan.paid && plan.adsMade >= plan.limit ? `
The free ads are used up (deleted listings still count). No new ads can be made on this account until it's upgraded to a paid plan, so never offer to make them or ask if they want to go ahead; changes to ads that already exist are still free, including turning one into a different idea.` : ""}
Listing: ${JSON.stringify(factsFor(listing))}
${listing.link ? `Link: ${listing.link}${listing.description ? "" : ` (it didn't open: the site restricts access. Hopkins does open listing links; never say you can't browse or open links. Asked about it, say the link restricts access and ask for the property photos and the details, nothing else.)`}\n` : ""}Photos: ${photoList(photos)}
Ads: ${ads.length ? `${ads.length} (up to ${MAX_ADS} per listing)` : "none yet"}
${ads.map((a) => `${adLine(a, photos)}:
  On the image: ${a.overlay}${a.subline ? `\n  Second line under it: ${a.subline}` : ""}
  Look: ${describeStyle(a.style)}
  Label: ${a.kicker}
  Headline: ${a.headline}
  Text: ${a.primary_text}${leads ? `
  Leads so far: ${leads[a.id]?.n || 0}${leads[a.id]?.showings ? ` (${leads[a.id].showings} asked for a showing)` : ""}` : ""}`).join("\n")}${leads ? `
Leads are the only result Hopkins tracks. When asked what's working, answer with these numbers; never mention engagement, clicks, reach or anything not listed here. No Leads yet means it's too early to say. When asked about one ad, start from its Leads, call it by its name, and never label ads by type ("a facts ad", "a life angle").` : ""}
The ad being worked on: Ad ${selectedVersion || 1}. A change that names no ad is for this ad only; another ad changes only when the agent names it, or says all, both or them. Call the ads by their names when you talk about them ("the porch one"), or by number when that's clearer.`;
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
    // A message the agent stopped is withdrawn: it isn't part of the talk either.
    if (data.stopped) continue;
    const photos = data.photos?.length || 0;
    const body = m.body || (photos ? `(sent ${photos} ${photos === 1 ? "photo" : "photos"})` : "");
    if (!body) continue;
    if (out.length && out[out.length - 1].role === role) out[out.length - 1].content += "\n\n" + body;
    else out.push({ role, content: body });
  }
  while (out.length && out[0].role !== "user") out.shift();
  return out;
}

const ACTIONS = new Set(["none", "select_version", "revise", "add_ads", "remove_ads", "update_listing", "make_ads", "run", "pause", "resume", "change_run", "new_moment"]);
// Models don't always fill every field; this makes the answer safe to act on.
function normalizeTurn(r) {
  if (!r || typeof r !== "object" || typeof r.reply !== "string") return null;
  const num = (v) => (typeof v === "number" && isFinite(v) ? v : Number(v) || 0);
  return {
    reply: r.reply,
    action: ACTIONS.has(r.action) ? r.action : "none",
    version: num(r.version) >= 1 && num(r.version) <= MAX_ADS ? num(r.version) : 0,
    remove: Array.isArray(r.remove) ? [...new Set(r.remove.map(num).filter((v) => v >= 1 && v <= MAX_ADS))] : [],
    moment: ["price", "open_house", "coming_soon", "under_contract", "back", "sold"].includes(r.moment) ? r.moment : "none",
    ads: Array.isArray(r.ads) ? r.ads.filter((a) => a && num(a.version) >= 1 && num(a.version) <= MAX_ADS).map((a) => ({ ...a, version: num(a.version), photo_number: num(a.photo_number) })) : [],
    listing_patch: r.listing_patch && typeof r.listing_patch === "object" ? r.listing_patch : null,
    budget: num(r.budget),
    days: num(r.days),
    undo: r.undo === true,
    brand: Object.fromEntries(["agent_name", "business", "phone", "license", "instagram", "email"].map((k) => [k, typeof r.brand?.[k] === "string" ? r.brand[k].trim() : ""]).filter(([, v]) => v)),
  };
}

// Before there's a listing (the New listing screen): just talk, and help them get one in.
const NEW_SCHEMA = {
  type: "object",
  properties: { reply: { type: "string", description: "Your message back to the agent. Markdown: **bold**, lists when useful." } },
  required: ["reply"],
  additionalProperties: false,
};

// A thread's name from its first message, the way Claude or ChatGPT name a chat. Null when the
// model isn't there or didn't answer; the first words stand in meanwhile.
const TITLE_SCHEMA = { type: "object", properties: { title: { type: "string" } }, required: ["title"], additionalProperties: false };
export async function titleAI(text) {
  if (!aiEnabled || !String(text || "").trim()) return null;
  const r = await call({
    system: `You name chats in Hopkins, a real estate marketing app, the way Claude or ChatGPT name a conversation from its first message: 2 to 5 words, sentence case, no quotes, no full stop, no dashes, no emoji. Say what it's about, plainly: "Email to a quiet buyer", "Instagram posting times", "3 bed condo in Midtown". For a property with a street address, use the address ("412 Oak Street").`,
    messages: [{ role: "user", content: `First message:\n${String(text).slice(0, 1500)}` }],
    schema: TITLE_SCHEMA,
    effort: "low",
    temperature: 0.3,
  });
  const t = typeof r?.title === "string" ? r.title.replace(/^["'“”‘’\s]+|["'“”‘’.!\s]+$/g, "").trim() : "";
  return t && t.length <= 60 ? t : null;
}

// With decide, the model also says whether the last message hands over a home to market, so a
// question with a price in it ("what's 15% of $650,000?") gets an answer, not a new listing.
const DECIDE_SCHEMA = {
  type: "object",
  properties: {
    is_listing: { type: "boolean", description: "true only if their last message gives you a home to make ads for (its details, to market it); false for a question or any other request, even one that mentions a price, beds or an address" },
    reply: NEW_SCHEMA.properties.reply,
  },
  required: ["is_listing", "reply"],
  additionalProperties: false,
};
export async function newChatAI({ history, brand, plan, agentName, account, decide = false }) {
  const messages = conversation(history);
  if (!messages.length) return null;
  const system = `${SYSTEM}\n${CHAT}\n\nContext (the current state, not something the agent wrote):
Agent: ${agentName || "unknown"}${brand.business ? `, ${brand.business}` : ""}.
Plan: ${plan.paid ? `${plan.name || "Solo"} (paid)` : `free, ${plan.adsMade} of ${plan.limit} free ads used`}.
They haven't sent a listing in this chat yet. Help with whatever they ask, like any assistant. Only when they want ads or ask how to start, say what you need: a link, photos, or the details (address, price, beds, baths, what stands out).${account ? `\nTheir account, from Hopkins' own records (real numbers; the Report page shows the same):\n${account}\nWhen they ask how they did, how many Leads, which listing or ad is working, answer from these numbers, plainly, in one or two sentences. Never say you can't see their numbers or past reports.` : ""}`;
  const r = await call({ system, messages, schema: decide ? DECIDE_SCHEMA : NEW_SCHEMA, effort: "low", temperature: 0.7 });
  if (decide) return r && typeof r.is_listing === "boolean" ? { isListing: r.is_listing, reply: typeof r.reply === "string" ? r.reply : "" } : null;
  return r && typeof r.reply === "string" && r.reply.trim() ? r.reply : null;
}

export async function chatTurnAI({ listing, photos, brand, ads, history, selectedVersion, plan, agentName, agentPhoto, leads, account, meta, running }) {
  const messages = conversation(history);
  if (!messages.length) return null;
  const system = `${SYSTEM}\n${CHAT}\n\n${contextText({ listing, photos, brand, ads, selectedVersion, plan, agentName, agentPhoto, leads, meta, running })}${account ? `\nTheir account, from Hopkins' own records (real numbers; the Report page shows the same):\n${account}\nWhen they ask how they did, how many Leads, which listing or ad is working, answer from these numbers, plainly, in one or two sentences. Never say you can't see their numbers or past reports.` : ""}\n\nFor listing_patch, return the listing facts as they should now be (copy the current values for anything unchanged, empty or 0 if unknown).`;
  const raw = await call({ system, messages, schema: TURN_SCHEMA, effort: "low", temperature: 0.7 });
  if (process.env.HOPKINS_DEBUG) console.log("chat turn:", JSON.stringify(raw));
  return normalizeTurn(raw);
}
