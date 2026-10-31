import { test } from "node:test";
import assert from "node:assert/strict";
import { boot, client } from "./helpers.js";

// The stages agents post about all the time: coming soon, under contract, back on the market.
// Each gets its own ads, said plainly, and a question about one is answered, not acted on.
const app = await boot({ PILOT_PLAN: "paid" });
const { run } = await import("../src/db.js");

test("coming soon, under contract and back on the market each get their own ads", async () => {
  const c = client(app);
  await c("POST", "/api/signup", { email: "stage@agent.test", password: "password123", invite: "EARLY1", name: "Ana Ruiz" });
  const l = await c("POST", "/api/listings", { text: "22 Cedar Ave, Austin, TX. 3 bed 2 bath, $610,000, with a porch." });
  const id = l.json.listing.id;
  const say = async (text) => (await c("POST", `/api/listings/${id}/messages`, { text })).json;

  for (const [text, moment, intro, overlay] of [
    ["It's coming soon, not listed yet", "coming_soon", /^Coming soon at 22 Cedar Ave: these build a list of buyers/, /Coming soon\./],
    ["We're under contract!", "under_contract", /^Under contract at 22 Cedar Ave: these reach people who want one like it/, /Under contract\./],
    ["The deal fell through, it's back on the market", "back", /^Back on the market at 22 Cedar Ave: these give the people who missed it a second chance/, /Back on the market\./],
  ]) {
    const r = await say(text);
    const fresh = r.ads.filter((a) => a.moment === moment);
    assert.ok(fresh.length >= 1, text);
    assert.match(r.messages.filter((m) => m.role === "hopkins").at(-1).body, intro, text);
    assert.ok(fresh.some((a) => overlay.test(a.overlay) || overlay.test(a.kicker)), text);
  }
  // A question isn't a new stage.
  const before = (await c("GET", `/api/listings/${id}`)).json.ads.length;
  await say("should I post when it goes under contract?");
  assert.equal((await c("GET", `/api/listings/${id}`)).json.ads.length, before);
});

test("under contract with ads still running says so once, and doesn't stop them unasked", async () => {
  const c = client(app);
  await c("POST", "/api/signup", { email: "stage2@agent.test", password: "password123", invite: "EARLY1", name: "Ben Ito" });
  const l = await c("POST", "/api/listings", { text: "5 Ash St, Austin, TX. 2 bed 1 bath, $410,000" });
  const id = l.json.listing.id;
  const plan = await c("POST", `/api/listings/${id}/run`, { versions: [1, 2, 3] });
  await c("POST", `/api/listings/${id}/run`, { confirm: plan.json.messages.at(-1).id });
  const r = (await c("POST", `/api/listings/${id}/messages`, { text: "it went pending today" })).json;
  assert.equal(r.messages.at(-1).body, "The earlier ads for 5 Ash St are still running. Say pause to stop them.");
  assert.equal(r.listing.run, "running");
  await run("SELECT 1");
});
