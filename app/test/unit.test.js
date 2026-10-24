import { test } from "node:test";
import assert from "node:assert/strict";
import { parseListingText, parsePrice } from "../src/listing.js";
import { writeSet, writeVersion, houseRuleProblems, polish } from "../src/writer.js";
import { checkWording, cleanWording, audienceFor } from "../src/fairhousing.js";
import { readIntent, targetVersions } from "../src/rules.js";

const SAMPLES = [
  "Just listed: 412 Oak Street in Riverside, Austin, TX. 3 bed, 2 bath, 1,840 sq ft craftsman with a wraparound porch, renovated kitchen, fenced backyard and a home office. $649,000",
  "Condo in Midtown, 1 bed 1 bath, 720 sqft, rooftop terrace, gym, parking. Asking $389k",
  "5 bed 4.5 bath waterfront home on 2 acres with pool, dock and ocean views. $3.2M",
  "Cute bungalow. $275,000",
  "",
];
const photos = [{ id: "a", label: "exterior", position: 0 }, { id: "b", label: "kitchen", position: 1 }, { id: "c", label: "pool", position: 2 }];

test("reads the facts out of a description", () => {
  const l = parseListingText(SAMPLES[0]);
  assert.equal(l.price, 649000);
  assert.equal(l.beds, 3);
  assert.equal(l.baths, 2);
  assert.equal(l.sqft, 1840);
  assert.equal(l.address, "412 Oak Street");
  assert.equal(l.city, "Austin");
  assert.equal(l.area, "Riverside");
  assert.ok(l.features.includes("porch") && l.features.includes("kitchen"));
  assert.equal(parsePrice("Asking $389k"), 389000);
  assert.equal(parsePrice("$3.2M"), 3200000);
  assert.equal(parsePrice("$1,250,000"), 1250000);
});

test("three different ideas, every time, within the house rules", () => {
  for (const text of SAMPLES) {
    for (const moment of ["new", "price", "open_house", "sold"]) {
      const listing = { ...parseListingText(text), open_house: "Sat 1 to 3pm" };
      const set = writeSet({ listing, photos, brand: {}, moment, extra: { oldPrice: 700000 } });
      assert.deepEqual(set.map((a) => a.pattern), ["life", "feature", "facts"]);
      assert.equal(new Set(set.map((a) => a.overlay)).size, 3, `distinct overlays for "${text}" ${moment}`);
      for (const ad of set) {
        for (const field of ["headline", "overlay", "kicker", "primary_text"]) {
          assert.deepEqual(houseRuleProblems(ad[field]), [], `${field}: ${ad[field]}`);
          assert.deepEqual(checkWording(ad[field]).filter((i) => i.level === "block"), [], `${field}: ${ad[field]}`);
        }
        assert.ok(ad.headline.length <= 40, ad.headline);
        assert.ok(ad.primary_text.length > 20);
      }
    }
  }
});

test("each version gets its own photo when there are enough", () => {
  const listing = parseListingText(SAMPLES[2]);
  const set = writeSet({ listing, photos, brand: {}, moment: "new" });
  assert.equal(new Set(set.map((a) => a.photo_id)).size, 3);
});

test("shorter is shorter, and another angle changes the line", () => {
  const listing = parseListingText(SAMPLES[0]);
  const ctx = { listing, photos, brand: {}, moment: "new" };
  const normal = writeVersion("life", ctx);
  assert.ok(writeVersion("life", ctx, { length: "short" }).primary_text.length < normal.primary_text.length);
  assert.notEqual(writeVersion("life", ctx, { angle: 1 }).overlay, normal.overlay);
});

test("fair housing wording is caught and cleaned", () => {
  assert.ok(checkWording("Perfect for families, close to great schools").some((i) => i.level === "block"));
  assert.ok(checkWording("Spacious master bedroom").some((i) => i.level === "caution"));
  assert.deepEqual(checkWording("Single family home a couple of blocks from the park"), []);
  const cleaned = cleanWording("Perfect for families. Adults only. Master bedroom with views.");
  assert.ok(!/famil|adults only|master/i.test(cleaned), cleaned);
  assert.equal(audienceFor({ city: "Austin" }, 5).radiusMiles, 15);
});

test("house rules: no dashes, no Realtor", () => {
  assert.equal(polish("Open house Sat 1–3pm — come by"), "Open house Sat 1 to 3pm, come by");
  assert.equal(polish("Call your Realtor"), "Call your agent");
  assert.deepEqual(houseRuleProblems("Our team will help"), ["we"]);
});

test("reads what the agent wants", () => {
  assert.deepEqual(targetVersions("make the second one shorter", 1), [2]);
  assert.deepEqual(targetVersions("change all of them", 2), [1, 2, 3]);
  assert.deepEqual(targetVersions("make it warmer", 3), [3]);
  assert.equal(readIntent("run it").kind, "run");
  const r = readIntent("run it with $300 over 14 days");
  assert.equal(r.budget, 300);
  assert.equal(r.days, 14);
  assert.equal(readIntent("price dropped to $629,000").listingPatch.price, 629000);
  assert.equal(readIntent("Open house Saturday 1 to 3pm").listingPatch.open_house, "Saturday 1 to 3pm");
  assert.equal(readIntent("it sold!").moment, "sold");
  assert.equal(readIntent('headline: "Porch season"').changes.headline, "Porch season");
  assert.equal(readIntent("use photo 2", { photos }).changes.photoId, "b");
  assert.equal(readIntent("use the kitchen photo", { photos }).changes.photoId, "b");
  assert.equal(readIntent("use the bedroom photo", { photos }).changes.photoMissing, "bedroom");
  assert.equal(readIntent("more luxury please").changes.voice, "premium");
  assert.equal(readIntent("try another angle").changes.angle, true);
  assert.deepEqual(readIntent("it also has a pool").listingPatch.addFeatures, ["pool"]);
  assert.equal(readIntent("purple monkey dishwasher").kind, "unknown");
  // Naming a version and nothing else switches to it.
  for (const t of ["version 2", "No, I meant version 2", "I said version 2", "2", "the second one", "what about 2"]) {
    const i = readIntent(t, { selected: 1 });
    assert.equal(i.kind, "select", t);
    assert.deepEqual(i.versions, [2], t);
  }
  assert.equal(readIntent("version 2 shorter").kind, "revise");
  assert.equal(readIntent("hey").kind, "greeting");
  assert.equal(readIntent("hi, make it shorter").kind, "revise");
  assert.equal(readIntent("which one is best?").topic, "which");
  assert.equal(readIntent("how much does it cost?").topic, "plan");
  assert.equal(readIntent("make the ads").kind, "make");
});
