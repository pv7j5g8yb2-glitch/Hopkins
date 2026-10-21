import Anthropic from "@anthropic-ai/sdk";
import { FEATURES } from "./listing.js";
import { PATTERNS } from "./writer.js";

// Claude, when ANTHROPIC_API_KEY is set. Every call here returns null on any failure, and
// the caller falls back to the built-in reader and writer, so the chat never breaks
// because a model call did.
//
// Two jobs: read a listing from what the agent sent (text, link preview, photos), and
// take one chat turn (understand what the agent wants and write the changed ads).

export const aiEnabled = Boolean(process.env.ANTHROPIC_API_KEY);
const MODEL = process.env.HOPKINS_MODEL || "claude-opus-5-5";

let client = null;
export function setClientForTests(fake) {
  client = fake;
}
function getClient() {
  if (!client && aiEnabled) client = new Anthropic();
  return client;
}

const FEATURE_KEYS = FEATURES.map((f) => f.key);

const SYSTEM = `You are Hopkins, a chat that runs real estate marketing like an agency would. You talk to a real estate agent, team leader or broker inside the Hopkins app. You make Instagram and Facebook ads for their listings, change them when asked, and set them up to run once the agent says yes. Nothing goes live without their yes.

How you write to the agent:
- A quiet expert. Plain, short sentences. Say what the agent gets. No hype, no sales talk.
- Say "I" for yourself. Never "we", "us" or "our".
- Never use dashes of any kind as punctuation. Use commas or full stops.
- Never claim a result you can't know. No invented numbers, no promised leads.
- One question at most, and make it answerable in one line.

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
- Never "Realtor". Never use dashes. Use only facts the agent gave you. Don't invent features, numbers, school names or distances.
- Write as the agent would: first person singular if needed ("Send me a message"), or no person at all.`;

const AD_SCHEMA = {
  type: "object",
  properties: {
    version: { type: "integer", description: "1, 2 or 3" },
    headline: { type: "string" },
    primary_text: { type: "string" },
    overlay: { type: "string" },
    kicker: { type: "string" },
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
    reply: { type: "string", description: "Your message back to the agent" },
    action: {
      type: "string",
      enum: ["none", "revise", "update_listing", "run", "new_moment"],
      description: "revise: change ads. update_listing: listing facts changed (ads get rewritten too). run: the agent wants the ads to run. new_moment: a new reason to advertise (price change, open house, sold).",
    },
    moment: { type: "string", enum: ["none", "price", "open_house", "sold"] },
    ads: { type: "array", items: AD_SCHEMA, description: "Only the versions you changed, in full" },
    listing_patch: LISTING_SCHEMA,
    budget: { type: "number", description: "Total budget in dollars if the agent named one, else 0" },
    days: { type: "integer", description: "Days to run if named, else 0" },
  },
  required: ["reply", "action", "moment", "ads", "listing_patch", "budget", "days"],
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

async function call({ content, schema, effort }) {
  const c = getClient();
  if (!c) return null;
  try {
    const res = await c.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      output_config: { effort, format: { type: "json_schema", schema } },
      messages: [{ role: "user", content }],
    });
    if (res.stop_reason === "refusal" || res.stop_reason === "max_tokens") return null;
    const text = res.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    return JSON.parse(text);
  } catch (err) {
    console.error("Claude call failed, using the built-in writer:", err.message);
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
      }\nLabel each photo. If the price or the city is missing, ask for it in "missing".`,
    },
  ];
  return call({ content, schema: READ_SCHEMA, effort: "low" });
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
      }.\n\nWrite all three versions (1 ${PATTERNS.life.name}, 2 ${PATTERNS.feature.name}, 3 ${PATTERNS.facts.name}) and pick a different photo for each where you can. Put a one line note to the agent in reply. Set action to "revise".`,
    },
  ];
  return call({ content, schema: TURN_SCHEMA, effort: "medium" });
}

export async function chatTurnAI({ listing, photos, brand, ads, history, message, selectedVersion }) {
  const recent = history.slice(-12).map((m) => `${m.role === "agent" ? "Agent" : "Hopkins"}: ${m.body}`).join("\n");
  const content = [
    ...photoBlocks(photos),
    {
      type: "text",
      text: `${describe(listing, ads, photos)}\n\nBrand voice: ${brand.voice || "plain"}.\n\nThe conversation so far:\n${recent}\n\nThe agent is looking at version ${selectedVersion || 1} and says:\n"${message}"\n\nDecide what they want. If they ask for a change and don't name a version, change version ${selectedVersion || 1}. Return the changed versions in full in "ads". For listing_patch, return the listing facts as they should now be (copy the current values for anything unchanged).`,
    },
  ];
  return call({ content, schema: TURN_SCHEMA, effort: "low" });
}
