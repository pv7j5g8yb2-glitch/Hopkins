import { test } from "node:test";
import assert from "node:assert/strict";
import { boot, client, TINY_JPEG } from "./helpers.js";

// With GEMINI_API_KEY set (Google's free tier), Gemini runs the chat, sees the photos and reads
// blocked links through Google; Groq answers when Gemini is over its limit. A fake fetch stands
// in for both APIs and for the listing sites.
const app = await boot({ ANTHROPIC_API_KEY: "", GEMINI_API_KEY: "test-gemini", GROQ_API_KEY: "test-groq", GROQ_BACKUP_MODELS: "", GEMINI_MODEL: "gemini-3.5-flash" });
const brain = await import("../src/brain.js");

const calls = [];
let next = [];
const answer = (json, extra = {}) => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: "thinking...", thought: true }, { text: typeof json === "string" ? json : JSON.stringify(json) }] }, ...extra }], usageMetadata: { totalTokenCount: 900 } }) });
brain.setFetchForTests(async (url, init) => {
  const body = JSON.parse(init.body);
  calls.push({ url, body, headers: init.headers });
  const r = next.shift();
  if (r === 500 || r === undefined) return { ok: false, status: 500, text: async () => "down" };
  if (r === 429) return { ok: false, status: 429, text: async () => '{"error":{"code":429,"message":"Resource has been exhausted"}}' };
  if (r === "schema400") return { ok: false, status: 400, text: async () => '{"error":{"message":"Invalid JSON payload: responseJsonSchema not supported"}}' };
  if (r?.groq) return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(r.groq) } }] }) };
  if (r?.raw) return r.raw;
  return answer(r);
});

test("Gemini takes the chat: the same instructions, structured answers, its thinking left out", async () => {
  assert.equal(brain.provider, "gemini");
  assert.ok(brain.seesPhotos);
  const c = client(app);
  await c("POST", "/api/signup", { email: "gem@test.com", password: "password123", invite: "EARLY1", name: "Dana Reyes" });
  next = [500, 500, 500, 500];
  const r = await c("POST", "/api/listings", { text: "12 Elm St, Austin, 3 bed 2 bath, $585,000, big back yard" });
  assert.equal(r.status, 200);
  next = [{ reply: "Version 1, the yard is the strongest thing about it.", action: "none", version: 1, remove: [], moment: "none", ads: [], listing_patch: null, budget: 0, days: 0 }];
  const t = await c("POST", `/api/listings/${r.json.listing.id}/messages`, { text: "which one would you keep?", version: 2 });
  assert.equal(t.json.messages.at(-1).body, "Version 1, the yard is the strongest thing about it.");
  const sent = calls.at(-1);
  assert.match(sent.url, /generativelanguage\.googleapis\.com\/v1beta\/models\/gemini-3\.5-flash:generateContent/);
  assert.equal(sent.headers["x-goog-api-key"], "test-gemini");
  assert.match(sent.body.systemInstruction.parts[0].text, /Agent: Dana Reyes/);
  assert.equal(sent.body.generationConfig.responseMimeType, "application/json");
  assert.ok(sent.body.generationConfig.responseJsonSchema.properties.reply);
  assert.equal(sent.body.contents.at(-1).role, "user");
  assert.match(sent.body.contents.at(-1).parts[0].text, /which one would you keep/);
});

test("photos go to Gemini as images, and a schema it won't take goes in the instructions", async () => {
  const c = client(app);
  await c("POST", "/api/signup", { email: "gem2@test.com", password: "password123", invite: "EARLY1" });
  const up = await c("POST", "/api/photos", { data: TINY_JPEG, thumb: TINY_JPEG, mime: "image/jpeg", name: "kitchen.jpg" });
  const pid = up.json.id;
  next = ["schema400", { listing: { address: "9 Oak Ln", city: "Austin", price: 499000, beds: 3, baths: 2 }, photo_labels: ["kitchen"], photo_notes: ["an island"], missing: "" }];
  const before = calls.length;
  await c("POST", "/api/listings", { text: "9 Oak Ln, Austin, 3 bed 2 bath, $499,000", photoIds: pid ? [pid] : [] });
  const read = calls.slice(before).filter((x) => /generativelanguage/.test(x.url));
  assert.ok(read[0].body.generationConfig.responseJsonSchema, "first try sends the schema");
  assert.equal(read[1].body.generationConfig.responseJsonSchema, undefined, "the retry doesn't");
  assert.match(read[1].body.systemInstruction.parts[0].text, /matches this JSON Schema/);
  assert.ok(read[0].body.contents[0].parts.some((p) => p.inlineData?.mimeType === "image/jpeg"), "the photo is sent as an image");
});

test("over Gemini's free limit, Groq answers instead", async () => {
  const c = client(app);
  await c("POST", "/api/signup", { email: "gem3@test.com", password: "password123", invite: "EARLY1" });
  next = [500, 500, 500, 500];
  const r = await c("POST", "/api/listings", { text: "4 Pine Ct, Austin, 3 bed 2 bath, $510,000" });
  next = [429, { groq: { reply: "Groq here: version 2.", action: "none", version: 2, remove: [], moment: "none", ads: [], listing_patch: null, budget: 0, days: 0 } }];
  const t = await c("POST", `/api/listings/${r.json.listing.id}/messages`, { text: "which is best?", version: 1 });
  assert.equal(t.json.messages.at(-1).body, "Groq here: version 2.");
  assert.match(calls.at(-1).url, /api\.groq\.com/);
});

test("a link the site blocks is read through Google, and only when Google really opened it", async (t) => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, status: 403, text: async () => "blocked" });
  t.after(() => { globalThis.fetch = realFetch; });
  const c = client(app);
  await c("POST", "/api/signup", { email: "gem4@test.com", password: "password123", invite: "EARLY1" });
  // Google couldn't open it either: no guessed facts, the honest message.
  next = [{ raw: answer('{"opened": true, "title": "Made up flat", "description": "3 bed, €900,000"}', { urlContextMetadata: { urlMetadata: [{ retrievedUrl: "https://www.idealista.com/inmueble/1/", urlRetrievalStatus: "URL_RETRIEVAL_STATUS_ERROR" }] } }) }];
  const before = calls.length;
  const blocked = await c("POST", "/api/listings", { text: "https://www.idealista.com/inmueble/1/" });
  const tools = calls.slice(before).find((x) => x.body.tools)?.body.tools;
  assert.deepEqual(tools, [{ url_context: {} }]);
  assert.equal(blocked.json.listing.price, null);
  const msg = (await c("GET", `/api/listings/${blocked.json.listing.id}`)).json.messages.at(-1).body;
  assert.equal(msg, "The link you sent restricts access, so I can't see your listing. Please send the property photos and the details: the address, price, beds, baths and what stands out.");
  // Google opened it: the facts come from the page, in the page's currency.
  next = [
    { raw: answer('Here it is: {"opened": true, "title": "Piso en Calle de Serrano 45, Salamanca, Madrid", "description": "Calle de Serrano 45, Salamanca, Madrid. 3 bed, 2 bath, 140 m2 flat. Price €1,250,000. Corner flat with a balcony.", "photos": []}', { urlContextMetadata: { urlMetadata: [{ retrievedUrl: "https://www.idealista.com/inmueble/2/", urlRetrievalStatus: "URL_RETRIEVAL_STATUS_SUCCESS" }] } }) },
    500, 500, 500, 500,
  ];
  const opened = await c("POST", "/api/listings", { text: "https://www.idealista.com/inmueble/2/" });
  assert.equal(opened.status, 200);
  assert.deepEqual([opened.json.listing.price, opened.json.listing.currency], [1250000, "EUR"]);
});
