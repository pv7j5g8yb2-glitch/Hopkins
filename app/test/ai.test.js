import { test } from "node:test";
import assert from "node:assert/strict";
import { boot, client } from "./helpers.js";

// With a key set, Hopkins asks Claude. These tests swap in a fake client so they check what
// Hopkins does with the answers (and with failures) without calling the real API.
const app = await boot({ ANTHROPIC_API_KEY: "test-key" });
const brain = await import("../src/brain.js");

const calls = [];
let next = [];
brain.setClientForTests({
  beta: {
    messages: {
      create: async (req) => {
        calls.push(req);
        const r = next.shift();
        if (r instanceof Error) throw r;
        if (r === "refusal") return { stop_reason: "refusal", content: [] };
        return { stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify(r) }] };
      },
    },
  },
});

const LISTING = { address: "9 Bay Road", city: "Tampa", area: "Davis Islands", price: 1250000, beds: 4, baths: 3, sqft: 2600, home_type: "", open_house: "", features: ["water", "pool"] };
const ad = (version, overlay, extra = {}) => ({ version, headline: `Headline ${version}`, primary_text: `Text ${version} — with a dash. Perfect for families.`, overlay, kicker: "Just listed", photo_number: 0, ...extra });

test("Claude reads the listing and writes the set; Hopkins cleans what comes back", async () => {
  next = [
    { listing: LISTING, photo_labels: [], missing: "" },
    { reply: "Three ideas, three angles.", action: "revise", moment: "none", ads: [ad(1, "Mornings on the water."), ad(2, "A pool by the bay."), ad(3, "Just listed.")], listing_patch: LISTING, budget: 0, days: 0 },
  ];
  const c = client(app);
  await c("POST", "/api/signup", { email: "ai@test.com", password: "password123", invite: "EARLY1" });
  const r = await c("POST", "/api/listings", { text: "9 Bay Road, waterfront with a pool, $1.25M" });
  assert.equal(r.status, 200);
  assert.equal(calls[0].model, "claude-opus-5-5");
  assert.equal(calls[0].output_config.format.type, "json_schema");
  assert.deepEqual(calls[0].betas, ["server-side-fallback-2026-07-01"]);
  assert.equal(r.json.listing.area, "Davis Islands");
  assert.equal(r.json.listing.price, 1250000);
  const v1 = r.json.ads.find((a) => a.version === 1);
  assert.equal(v1.overlay, "Mornings on the water.");
  assert.ok(!/[—–]/.test(v1.primary_text), "dashes removed");
  assert.ok(!/famil/i.test(v1.primary_text), "fair housing wording removed");
  assert.match(r.json.messages.find((m) => m.kind === "ads").body, /Three ideas/);

  // A chat turn that changes one version.
  next = [{ reply: "Version 2 is tighter now.", action: "revise", moment: "none", ads: [ad(2, "Your own pool, on the bay.")], listing_patch: LISTING, budget: 0, days: 0 }];
  const t = await c("POST", `/api/listings/${r.json.listing.id}/messages`, { text: "tighten the second one", version: 2 });
  assert.equal(t.json.ads.find((a) => a.version === 2).overlay, "Your own pool, on the bay.");
  assert.equal(t.json.messages.at(-1).body, "Version 2 is tighter now.");

  // The model gets the conversation as a real back and forth and the state as context.
  const req = calls.at(-1);
  assert.equal(req.messages.at(-1).role, "user");
  assert.match(req.messages.at(-1).content, /tighten the second one/);
  assert.match(req.system, /looking at ad 2/);
  assert.match(req.system, /3 of 3 free ads used/);

  // Naming a version just switches to it, and the app is told which.
  next = [{ reply: "Version 3, the facts. What should change?", action: "select_version", version: 3, moment: "none", ads: [], listing_patch: LISTING, budget: 0, days: 0 }];
  const s = await c("POST", `/api/listings/${r.json.listing.id}/messages`, { text: "no I meant 3", version: 2 });
  assert.equal(s.json.focus, 3);
  assert.equal(s.json.messages.at(-1).body, "Version 3, the facts. What should change?");

  // A plain question gets a plain answer and touches nothing.
  const before = JSON.stringify(s.json.ads);
  next = [{ reply: "Hi. They're ready whenever you are.", action: "none", version: 0, moment: "none", ads: [], listing_patch: LISTING, budget: 0, days: 0 }];
  const h = await c("POST", `/api/listings/${r.json.listing.id}/messages`, { text: "hey", version: 3 });
  assert.equal(h.json.messages.at(-1).body, "Hi. They're ready whenever you are.");
  assert.equal(JSON.stringify(h.json.ads), before);
  assert.equal(h.json.focus, null);

  // If Claude fails or declines, the built-in rules answer instead, and the chat keeps working.
  next = [new Error("overloaded")];
  const f = await c("POST", `/api/listings/${r.json.listing.id}/messages`, { text: "make version 3 shorter", version: 3 });
  assert.equal(f.status, 200);
  assert.equal(f.json.messages.at(-1).body, "**Ad 3** is shorter.");
  next = ["refusal"];
  const g = await c("POST", `/api/listings/${r.json.listing.id}/messages`, { text: "run it", version: 1 });
  assert.equal(g.json.messages.at(-1).kind, "upgrade");
});
