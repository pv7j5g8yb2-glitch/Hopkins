import { test } from "node:test";
import assert from "node:assert/strict";
import { boot, client } from "./helpers.js";

// One ad at a time (Ismael, 2026-11-01, "I TOLD YOU 3 TIMES NOW"): asking for ads, however it's
// said and whatever number is named, makes one ad; the agent changes it from there, and "another
// one" adds exactly one more.
const app = await boot({ ADS_PER_ASK: "", PILOT_PLAN: "paid" });

test("however ads are asked for, one comes; another comes only when asked, one at a time", async () => {
  for (const ask of ["make ads for it", "make 3 ads", "run ads on this", "create ads", "give me a few ads"]) {
    const c = client(app);
    await c("POST", "/api/signup", { email: `one${Math.random()}@ellery.test`, password: "password123", invite: "EARLY1", name: "Sam Ellery" });
    const s = await c("POST", "/api/listings/start", { text: "12 Elm St, Austin, TX. 3 bed 2 bath, $585,000, big back yard" });
    await c("POST", `/api/listings/${s.json.listing.id}/first`, {});
    const r = await c("POST", `/api/listings/${s.json.listing.id}/messages`, { text: ask });
    assert.equal(r.json.ads.length, 1, `"${ask}" made one ad`);
    assert.doesNotMatch(r.json.messages.at(-1).body, /\b(3|three) ads\b/i);
    if (ask === "make ads for it") {
      const more = await c("POST", `/api/listings/${s.json.listing.id}/messages`, { text: "add another ad" });
      assert.equal(more.json.ads.length, 2, "another adds exactly one");
    }
  }
});
