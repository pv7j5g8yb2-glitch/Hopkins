import { test } from "node:test";
import assert from "node:assert/strict";
import { boot, client } from "./helpers.js";

// With only GROQ_API_KEY set (the free option), the chat goes to Groq. A fake fetch stands in
// for the API so this checks the request and what Hopkins does with the answer.
const app = await boot({ ANTHROPIC_API_KEY: "", GROQ_API_KEY: "test-groq" });
const brain = await import("../src/brain.js");

const calls = [];
let next = [];
brain.setFetchForTests(async (url, init) => {
  calls.push({ url, body: JSON.parse(init.body), auth: init.headers.Authorization });
  const r = next.shift();
  if (r instanceof Error) throw r;
  if (r === 500) return { ok: false, status: 500, text: async () => "down" };
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
});
