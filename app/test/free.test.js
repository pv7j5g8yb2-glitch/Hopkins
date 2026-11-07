import { test } from "node:test";
import assert from "node:assert/strict";
import { boot, client } from "./helpers.js";

// The real free plan (Ismael, 2026-11-01): unlimited chat, and 1 piece of content in all,
// whatever it is. Changes to it are included; anything new needs a plan.
const app = await boot({ FREE_LIMIT: "" });
const hopkins = await import("../src/hopkins.js");
hopkins.setCreationForTests(async (req) => ({ title: "Buyers", caption: "", theme: "night", slides: [{ heading: req.previous ? "Shorter" : "One", body: "Two", photo: false }], reply: "Here it is." }));

test("free: one creation, changes to it included, then nothing new; asking for ads makes one", async () => {
  const c = client(app);
  await c("POST", "/api/signup", { email: "free1@ellery.test", password: "password123", invite: "EARLY1", name: "Sam Ellery" });
  const me = (await c("GET", "/api/me")).json;
  assert.equal(me.usage.freeLimit, 1);
  assert.deepEqual(me.plans.map((p) => [p.name, p.price]), [["Solo", 99], ["Pro", 149], ["Max", 199]]);
  const s = await c("POST", "/api/listings/start", { text: "make me a carousel for first time buyers" });
  const f = await c("POST", `/api/listings/${s.json.listing.id}/first`, {});
  assert.equal(f.json.creations.length, 1);
  const change = await c("POST", `/api/listings/${s.json.listing.id}/messages`, { text: "make the headings shorter" });
  assert.equal(change.json.creations[0].version, 2, "a change to it is included");
  const more = await c("POST", `/api/listings/${s.json.listing.id}/messages`, { text: "now a reel about it" });
  assert.equal(more.json.messages.at(-1).kind, "upgrade");
  assert.equal(more.json.messages.at(-1).body, "You've used your free creation. New ones require an upgrade.");
  // Chat stays unlimited.
  const q = await c("POST", `/api/listings/${s.json.listing.id}/messages`, { text: "what's a good time to post?" });
  assert.notEqual(q.json.messages.at(-1).kind, "upgrade");
});

test("free: asking for ads with nothing made yet gives one ad", async () => {
  const c = client(app);
  await c("POST", "/api/signup", { email: "free2@ellery.test", password: "password123", invite: "EARLY1", name: "Sam Ellery" });
  const s = await c("POST", "/api/listings/start", { text: "12 Elm St, Austin, TX. 3 bed 2 bath, $585,000" });
  await c("POST", `/api/listings/${s.json.listing.id}/first`, {});
  const r = await c("POST", `/api/listings/${s.json.listing.id}/messages`, { text: "make ads for it" });
  assert.equal(r.json.ads.length, 1);
});
