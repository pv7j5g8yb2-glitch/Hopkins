import { test } from "node:test";
import assert from "node:assert/strict";
import { boot, client } from "./helpers.js";

// With only GROQ_API_KEY set (the free option), the chat goes to Groq. A fake fetch stands in
// for the API so this checks the request and what Hopkins does with the answer.
const app = await boot({ ANTHROPIC_API_KEY: "", GROQ_API_KEY: "test-groq", GROQ_BACKUP_MODELS: "" });
const brain = await import("../src/brain.js");

const calls = [];
let next = [];
brain.setFetchForTests(async (url, init) => {
  calls.push({ url, body: JSON.parse(init.body), auth: init.headers.Authorization });
  const r = next.shift();
  if (r instanceof Error) throw r;
  if (r === 500) return { ok: false, status: 500, text: async () => "down" };
  if (typeof r === "string" && r.startsWith("429:")) return { ok: false, status: 429, headers: { get: () => null }, text: async () => `{"error":{"message":"Rate limit reached. Please try again in ${r.slice(4)}s."}}` };
  if (r === "badjson") return { ok: false, status: 400, text: async () => '{"error":{"code":"json_validate_failed"}}' };
  return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(r) } }] }) };
});

test("Groq runs the chat when it's the only key", async () => {
  assert.equal(brain.provider, "groq");
  const c = client(app);
  await c("POST", "/api/signup", { email: "groq@test.com", password: "password123", invite: "EARLY1", name: "Dana Reyes" });
  // Reading and writing fail here, so the built-in reader and writer make the listing and ads.
  next = [500, 500];
  const r = await c("POST", "/api/listings", { text: "12 Elm St, Austin, 3 bed 2 bath, $585,000, big back yard" });
  assert.equal(r.status, 200);
  assert.equal(r.json.ads.length, 3);
  assert.match(calls[0].url, /api\.groq\.com/);
  assert.equal(calls[0].auth, "Bearer test-groq");
  assert.equal(calls[0].body.response_format.type, "json_object");

  next = [{ reply: "Sure. Version 1 leans on the yard, so I'd keep it.", action: "none", version: 1, moment: "none", ads: [], listing_patch: null, budget: 0, days: 0, suggestion: "Make version 1 warmer" }];
  const t = await c("POST", `/api/listings/${r.json.listing.id}/messages`, { text: "which one would you keep?", version: 2 });
  assert.equal(t.json.messages.at(-1).body, "Sure. Version 1 leans on the yard, so I'd keep it.");
  assert.equal(t.json.focus, 1);
  assert.equal(t.json.suggestion, "Make version 1 warmer");
  const sent = calls.at(-1).body.messages;
  assert.equal(sent[0].role, "system");
  assert.match(sent[0].content, /Agent: Dana Reyes/);
  assert.equal(sent.at(-1).role, "user");
  assert.match(sent.at(-1).content, /which one would you keep/);

  // A half filled answer is still safe to act on.
  next = [{ reply: "Done, version 2 is shorter.", action: "revise", ads: [{ version: 2, overlay: "Room to breathe." }] }];
  const u = await c("POST", `/api/listings/${r.json.listing.id}/messages`, { text: "shorter please", version: 2 });
  assert.equal(u.json.ads.find((a) => a.version === 2).overlay, "Room to breathe.");
  assert.ok(u.json.ads.find((a) => a.version === 2).headline, "fields it left out are kept");
  assert.equal(u.json.focus, 2);

  // Groq sometimes fails to make valid JSON; one retry, then the answer is used as normal.
  next = ["badjson", { reply: "Solar panels are in. I put them in version 3.", action: "update_listing", version: 3, ads: [{ version: 3, overlay: "Solar on the roof." }] }];
  const before = calls.length;
  const v = await c("POST", `/api/listings/${r.json.listing.id}/messages`, { text: "it also has solar panels", version: 3 });
  assert.equal(calls.length - before, 2);
  assert.equal(v.json.messages.at(-1).body, "Solar panels are in. I put them in version 3.");
  assert.match(v.json.listing.description, /solar panels/);

  // Over the per minute limit with a short wait: it waits and answers properly.
  next = ["429:0.2", { reply: "Morning. All three are ready.", action: "none", version: 0, ads: [] }];
  const w = await c("POST", `/api/listings/${r.json.listing.id}/messages`, { text: "morning", version: 1 });
  assert.equal(w.json.messages.at(-1).body, "Morning. All three are ready.");
  // A long wait: it says it's busy instead of pretending not to understand.
  next = ["429:40"];
  const busy = await c("POST", `/api/listings/${r.json.listing.id}/messages`, { text: "what do you think of the photos?", version: 1 });
  assert.match(busy.json.messages.at(-1).body, /a lot of messages at once/);
  // Something the rules can do still gets done.
  next = ["429:40"];
  const done = await c("POST", `/api/listings/${r.json.listing.id}/messages`, { text: "make version 3 shorter", version: 3 });
  assert.match(done.json.messages.at(-1).body, /^\*\*\$585K.*\*\* is shorter\.$/);
});

test("Groq writes the first ads: its own ideas and names, checked against the facts; ads can be added and removed", async () => {
  const c = client(app);
  await c("POST", "/api/signup", { email: "groq2@test.com", password: "password123", invite: "EARLY1", name: "Dana Reyes" });
  const LISTING = { address: "412 Oak Street", city: "Austin", area: "Riverside", price: 649000, beds: 3, baths: 2, sqft: 0, home_type: "craftsman", open_house: "", features: ["porch"] };
  const a = (version, name, overlay, primary_text) => ({ version, name, kind: "life", headline: name, primary_text, overlay, kicker: "Just listed", photo_number: 0 });
  const set = (ads) => ({ insight: "The porch is the thing.", ads, reply: "The porch is the thing here, so **Wraparound porch** leads with it and **Under $650K** makes the price concrete." });
  next = [
    { listing: LISTING, photo_labels: [], photo_notes: [], missing: "" },
    // The first try adds granite nobody mentioned; the fact check asks again.
    set([a(1, "Wraparound porch", "Slow mornings on the porch.", "Granite counters inside. Book a showing."), a(2, "Under $650K", "Under $650K in Riverside.", "3 beds, 2 baths. Book a showing.")]),
    set([a(1, "Wraparound porch", "Slow mornings on the porch.", "A porch made for slow mornings. Book a showing."), a(2, "Under $650K", "Under $650K in Riverside.", "3 beds, 2 baths. Book a showing.")]),
  ];
  const before = calls.length;
  const r = await c("POST", "/api/listings", { text: "Just listed: 412 Oak Street in Riverside, Austin. 3 bed 2 bath craftsman with a wraparound porch. $649,000. Just two ads please" });
  assert.equal(calls.length - before, 3);
  assert.match(calls.at(-1).body.messages.at(-1).content, /granite/i, "the retry says what was wrong");
  assert.deepEqual(r.json.ads.map((x) => x.name), ["Wraparound porch", "Under $650K"]);
  assert.ok(!r.json.ads.some((x) => /granite/i.test(x.primary_text)));
  assert.match(r.json.messages.find((m) => m.kind === "ads").body, /\*\*Wraparound porch\*\*/);
  const id = r.json.listing.id;

  // One more, about the kitchen: the third free ad.
  next = [{ reply: "Added **The kitchen**.", action: "add_ads", version: 3, remove: [], ads: [{ ...a(3, "The kitchen", "Dinners around the island.", "Room to cook. Book a showing."), kind: "feature", style: {} }] }];
  const add = await c("POST", `/api/listings/${id}/messages`, { text: "add one about the kitchen", version: 1 });
  assert.deepEqual(add.json.ads.map((x) => x.name), ["Wraparound porch", "Under $650K", "The kitchen"]);
  assert.equal(add.json.focus, 3);
  assert.equal(add.json.messages.at(-1).data.snapshot.length, 1);
  // A fourth is the paid plan.
  next = [{ reply: "Here's another.", action: "add_ads", version: 4, remove: [], ads: [{ ...a(4, "The street", "Oak trees out front.", "Book a showing."), style: {} }] }];
  const more = await c("POST", `/api/listings/${id}/messages`, { text: "one more ad", version: 1 });
  assert.equal(more.json.messages.at(-1).kind, "upgrade");
  assert.equal(more.json.ads.length, 3);
  // Removing one.
  next = [{ reply: "", action: "remove_ads", version: 2, remove: [2], ads: [] }];
  const rm = await c("POST", `/api/listings/${id}/messages`, { text: "get rid of the price one", version: 2 });
  assert.deepEqual(rm.json.ads.map((x) => x.name), ["Wraparound porch", "The kitchen"]);
  assert.equal(rm.json.messages.at(-1).body, "Removed **Under $650K**.");
});
