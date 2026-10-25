import Anthropic from "@anthropic-ai/sdk";
import { FEATURES } from "./listing.js";
import { PATTERNS } from "./writer.js";

// The model behind the chat. Claude when ANTHROPIC_API_KEY is set; otherwise Groq's free
// model when GROQ_API_KEY is set (the same free option the survey uses). Every call returns
// null on any failure and the caller falls back to the built-in reader, writer and rules, so
// the chat never breaks because a model call did.
//
// Three jobs: read a listing from what the agent sent, write a set of three ads, and take one
// chat turn: hold a real conversation and, when the agent asks for something, do it.

export const provider = process.env.ANTHROPIC_API_KEY ? "claude" : process.env.GROQ_API_KEY ? "groq" : null;
export const aiEnabled = Boolean(provider);
const MODEL = process.env.HOPKINS_MODEL || "claude-opus-5-5";
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

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
- Three genuinely different concepts per listing, never small tweaks of one:
  1. "${PATTERNS.life.name}": the life the home gives, for one buyer. "Slow mornings on the porch", not "3 bed 2 bath".
  2. "${PATTERNS.feature.name}": one standout detail, with the photo that shows it.
  3. "${PATTERNS.facts.name}": just listed, the price and the numbers, plainly.
- overlay: the line on the image. 2 to 7 words, ends with a full stop. It must be readable at a glance.
- kicker: a tiny label above it, like "Just listed · Riverside" or "Open house · Sat 1 to 3pm".
- headline: under 40 characters.
- primary_text: 1 to 4 short sentences. The first 125 characters must carry the ad. End with one clear next step (book a showing, see the photos).
- Describe the home, never the buyer. Fair housing: no "perfect for families", "ideal for couples", "adults only", "safe neighborhood", "exclusive", "master bedroom" (say primary), "great schools", nothing about race, religion, sex, disability, age or family status.
- Never "Realtor". Never use dashes or hyphens of any kind ("two week", "move in ready"). Use only facts the agent gave you. Don't invent features, numbers, school names or distances.
- Write as the agent would: first person singular if needed ("Send me a message"), or no person at all.
- Every detail in an ad must be in the listing facts or the agent's own description. If it isn't there, leave it out, even when it's typical for homes like this: no appliances, flooring, light, views, "charm" or "character" unless the agent said so.`;

const AD_SCHEMA = {
  type: "object",
  properties: {
    version: { type: "integer", description: "1, 2 or 3" },
    headline: { type: "string" },
    primary_text: { type: "string" },
    overlay: { type: "string", description: "The line on the photo. Call it that to the agent, never overlay." },
    kicker: { type: "string", description: "The small label above the line on the photo." },
    photo_number: { type: "integer", description: "Which photo to use, counting from 1. 0 keeps the current one." },
  },
  required: ["version", "headline", "primary_text", "overlay", "kicker", "photo_number"],
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
    missing: { type: "string", description: "The one detail you most need from the agent, as a short question, or empty" },
  },
  required: ["listing", "photo_labels", "missing"],
  additionalProperties: false,
};

const TURN_SCHEMA = {
  type: "object",
  properties: {
    reply: { type: "string", description: "Your message back to the agent, as you'd say it in a chat. Markdown: **bold**, lists, a small table when comparing." },
    action: {
      type: "string",
      enum: ["none", "select_version", "revise", "update_listing", "make_ads", "run", "new_moment"],
      description:
        "none: just talking. select_version: they want to look at or work on a different version. revise: change ads (put them in ads). update_listing: facts about the home changed. make_ads: make the ads (when there are none, or they want fresh ones). run: they want the ads to run. new_moment: a new reason to advertise (price change, open house, sold).",
    },
    version: { type: "integer", description: "The version (1, 2 or 3) this turn is about, or 0 if none" },
    moment: { type: "string", enum: ["none", "price", "open_house", "sold"] },
    ads: { type: "array", items: AD_SCHEMA, description: "Only the versions you changed, in full. Empty otherwise." },
    listing_patch: LISTING_SCHEMA,
    budget: { type: "number", description: "Total budget in dollars if the agent named one, else 0" },
    days: { type: "integer", description: "Days to run if named, else 0" },
    suggestion: {
      type: "string",
      description: "The message the agent is most likely to send next, written the way they'd type it, 2 to 8 words, like \"Make version 2 shorter\" or \"Which photo works best?\". Only a message they could send as it is: if your reply asks for something only they know (their own wording, a time, a price), leave it empty. Plain words, never \"overlay\". Never about upgrading or paying. Empty if nothing obvious.",
    },
  },
  required: ["reply", "action", "version", "moment", "ads", "listing_patch", "budget", "days", "suggestion"],
  additionalProperties: false,
};

function photoBlocks(photos) {
  const blocks = [];
  photos.slice(0, 8).forEach((p, i) => {
    if (!p.thumb) return;
    blocks.push({ type: "text", text: `Photo ${i + 1}${p.label ? ` (labelled ${p.label})` : ""}:` });
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
      // Groq now and then fails to produce valid JSON (a 400 json_validate_failed); one retry
      // usually fixes it.
      for (let attempt = 0; ; attempt++) {
      const res = await fetchImpl(GROQ_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
        body: JSON.stringify({
          model: GROQ_MODEL,
          // Low for writing so it sticks to the facts it was given; a bit higher for talking.
          temperature,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: `${system}\n\nAnswer with only a JSON object that matches this JSON Schema, nothing before or after it:\n${JSON.stringify(schema)}` },
            ...messages.map((m) => ({ role: m.role, content: text(m.content) })),
          ],
        }),
        signal: AbortSignal.timeout(45000),
      });
      if (!res.ok) {
        const err = await res.text();
        if (attempt === 0 && res.status === 400 && err.includes("json_validate_failed")) continue;
        // Over the free per minute limit: Groq says how long to wait. Up to 10 seconds is worth
        // waiting once; past that, give up and say so.
        if (res.status === 429) {
          const wait = Number(res.headers?.get?.("retry-after")) || Number((err.match(/try again in ([\d.]+)s/) || [])[1]) || 0;
          if (attempt === 0 && wait > 0 && wait <= 10) { await new Promise((r) => setTimeout(r, wait * 1000 + 250)); continue; }
          lastFailure = "busy";
        }
        throw new Error(`Groq ${res.status}: ${err.slice(0, 200)}`);
      }
      const data = await res.json();
      return JSON.parse(data.choices[0].message.content);
      }
    }
    return null;
  } catch (err) {
    if (err.status === 429 || err.status === 529) lastFailure = "busy";
    console.error("Model call failed, using the built-in rules:", err.message);
    return null;
  }
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
      }\nLabel each photo. If the price or the city is missing, ask for it in "missing".`,
    },
  ];
  return call({ system: SYSTEM, messages: [{ role: "user", content }], schema: READ_SCHEMA, effort: "low" });
}

function describe(listing, ads, photos) {
  const facts = { ...listing, features: listing.features };
  delete facts.id; delete facts.workspace_id; delete facts.slug;
  return `The listing:\n${JSON.stringify(facts, null, 1)}\n\nPhotos: ${photos.map((p, i) => `${i + 1} ${p.label || "unlabelled"}`).join(", ") || "none"}\n\nCurrent ads:\n${ads
    .map((a) => `Version ${a.version} (${PATTERNS[a.pattern]?.name || a.pattern}, photo ${Math.max(1, photos.findIndex((p) => p.id === a.photo_id) + 1)}):\nOverlay: ${a.overlay}\nKicker: ${a.kicker}\nHeadline: ${a.headline}\nText: ${a.primary_text}`)
    .join("\n\n") || "none yet"}`;
}

export async function writeSetAI({ listing, photos, brand, moment, extra }) {
  const content = [
    ...photoBlocks(photos),
    {
      type: "text",
      text: `${describe(listing, [], photos)}\n\nBrand voice: ${brand.voice || "plain"}. Agent: ${brand.agent_name || ""}, ${brand.business || ""}.\nMoment: ${moment}${
        extra?.oldPrice ? ` (price was ${extra.oldPrice})` : ""
      }.\n\nWrite all three versions (1 ${PATTERNS.life.name}, 2 ${PATTERNS.feature.name}, 3 ${PATTERNS.facts.name}) and pick a different photo for each where you can. In reply, one or two plain sentences to the agent saying what each version leans on, the way a colleague would hand them over. Set action to "revise".`,
    },
  ];
  return normalizeTurn(await call({ system: SYSTEM, messages: [{ role: "user", content }], schema: TURN_SCHEMA, effort: "medium" }));
}

// How Hopkins talks in the chat, on top of the house rules in SYSTEM.
const CHAT = `
In the chat:
- Talk the way Claude or ChatGPT does at their best: like a sharp colleague who knows real estate marketing inside out and enjoys talking about it. Understand what they mean, not just what they typed. React to what they actually said, say what you think and why, and be genuinely useful. Sound like a person, never like a form or a support bot ("No ads exist for this listing" is how a bot talks; "None yet, that one's waiting on the paid plan" is how a person does).
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
- Never list everything you can do unless they ask. Never repeat a reply you already gave.
- Only use facts from the context. Never invent results, numbers or features. In ads too: no appliances, materials, finishes or layout the agent didn't mention.
- Say it the way the agent would: "the line on the photo", not "overlay"; "the label", not "kicker".
- Money, exactly: the Hopkins plan is one price. The ad spend is separate, the agent chooses it and pays it to Meta. The default test is $200 over 10 days, split across the versions. Never say the plan price covers ad spend.
- A new fact about the home that isn't one of the listed features (solar panels, a new roof) is still a fact: use update_listing, work it into the versions where it fits (put them in ads), and never mention a feature list or any other part of how you work.
- Small talk ("lol ok", "cool") gets a short, natural reply. Don't push them to run or upgrade.
- The free plan: up to 3 ads made in the chat, previews only. More ads, downloads and running ads need the paid plan, which is $299 a month, billing starts when the first ad goes live, cancel any time, no cut of ad spend. Say this plainly when it matters, once.`;

function contextText({ listing, photos, brand, ads, selectedVersion, plan, agentName }) {
  const facts = {};
  for (const k of ["address", "city", "area", "price", "beds", "baths", "sqft", "home_type", "open_house", "status", "moment"]) if (listing[k]) facts[k] = listing[k];
  facts.features = (listing.features || []).map((k) => FEATURES.find((f) => f.key === k)?.name.replace(/^the /, "") || k);
  if (listing.description) facts.agent_description = listing.description;
  return `Context (the current state, not something the agent wrote):
Agent: ${agentName || "unknown"}${brand.business ? `, ${brand.business}` : ""}. Brand voice: ${brand.voice || "plain"}.
Plan: ${plan.paid ? "paid" : `free, ${plan.adsMade} of ${plan.limit} free ads used`}.${!plan.paid && plan.adsMade >= plan.limit ? `
The free ads are used up (deleted listings still count). No new ads can be made on this account until it's on the paid plan, so never offer to make them or ask if they want to go ahead; changes to ads that already exist are still free.` : ""}
Listing: ${JSON.stringify(facts)}
Photos: ${photos.length ? photos.map((p, i) => `${i + 1} ${p.label || "unlabelled"}`).join(", ") : "none yet"}
Ads: ${ads.length ? "" : "none yet"}
${ads.map((a) => `Version ${a.version} (${PATTERNS[a.pattern]?.name || a.pattern}, photo ${Math.max(1, photos.findIndex((p) => p.id === a.photo_id) + 1)}, ${a.status}):
  On the image: ${a.overlay}
  Label: ${a.kicker}
  Headline: ${a.headline}
  Text: ${a.primary_text}`).join("\n")}
The agent is looking at version ${selectedVersion || 1}.`;
}

// The stored chat as a real back and forth: the agent's messages as the user, Hopkins' as the
// assistant, starting with the agent and never two turns in a row from the same side.
function conversation(history) {
  const out = [];
  for (const m of history.slice(-24)) {
    const role = m.role === "agent" ? "user" : "assistant";
    if (!m.body) continue;
    if (out.length && out[out.length - 1].role === role) out[out.length - 1].content += "\n\n" + m.body;
    else out.push({ role, content: m.body });
  }
  while (out.length && out[0].role !== "user") out.shift();
  return out;
}

const ACTIONS = new Set(["none", "select_version", "revise", "update_listing", "make_ads", "run", "new_moment"]);
// Models don't always fill every field; this makes the answer safe to act on.
function normalizeTurn(r) {
  if (!r || typeof r !== "object" || typeof r.reply !== "string") return null;
  const num = (v) => (typeof v === "number" && isFinite(v) ? v : Number(v) || 0);
  return {
    reply: r.reply,
    action: ACTIONS.has(r.action) ? r.action : "none",
    version: [1, 2, 3].includes(num(r.version)) ? num(r.version) : 0,
    moment: ["price", "open_house", "sold"].includes(r.moment) ? r.moment : "none",
    ads: Array.isArray(r.ads) ? r.ads.filter((a) => a && [1, 2, 3].includes(num(a.version))).map((a) => ({ ...a, version: num(a.version), photo_number: num(a.photo_number) })) : [],
    listing_patch: r.listing_patch && typeof r.listing_patch === "object" ? r.listing_patch : null,
    budget: num(r.budget),
    days: num(r.days),
    suggestion: typeof r.suggestion === "string" ? r.suggestion.trim().slice(0, 80) : "",
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

export async function chatTurnAI({ listing, photos, brand, ads, history, selectedVersion, plan, agentName }) {
  const messages = conversation(history);
  if (!messages.length) return null;
  const system = `${SYSTEM}\n${CHAT}\n\n${contextText({ listing, photos, brand, ads, selectedVersion, plan, agentName })}\n\nFor listing_patch, return the listing facts as they should now be (copy the current values for anything unchanged, empty or 0 if unknown).`;
  return normalizeTurn(await call({ system, messages, schema: TURN_SCHEMA, effort: "low", temperature: 0.7 }));
}
