import { test } from "node:test";
import assert from "node:assert/strict";
import { TEMPLATES, matchTemplates } from "../src/templates.js";

test("a request only matches a template made for it", () => {
  assert.equal(matchTemplates("a post about what our neighborhoods would have in their notes app")[0].id, "notes-app");
  assert.equal(matchTemplates("businesses in my city that closed that locals miss")[0].id, "gone-but-never-forgotten");
  assert.equal(matchTemplates("funny things that make me lose it about traffic and parking")[0].id, "lose-it-local");
  assert.equal(matchTemplates("a thanksgiving post about what I really do, not just selling a house")[0].id, "not-just-selling");
  assert.equal(matchTemplates("why sellers should hire me, a marketing plan not just listing on the MLS")[0].id, "not-paid-to-list");
  assert.equal(matchTemplates("5 things I never worry about living in my city, the weather and humidity")[0].id, "never-worry-local");
  assert.equal(matchTemplates("hills I'll die on, my hot takes")[0].id, "hills-i-die-on");
  assert.equal(matchTemplates("things I refuse to do for my clients")[0].id, "refuse-to-do");
  assert.equal(matchTemplates("first in my bloodline funny agent life")[0].id, "first-in-my-bloodline");
  assert.deepEqual(matchTemplates("market update on interest rates for first time buyers"), []);
  assert.deepEqual(matchTemplates("best coffee spots in my city"), [], "no template for it, so none is forced");
});

test("every template has a purpose, a cover and a comment slide, and its own id", () => {
  const ids = new Set(TEMPLATES.map((t) => t.id));
  assert.equal(ids.size, TEMPLATES.length);
  for (const t of TEMPLATES) {
    assert.ok(t.purpose && t.topics.length && t.covers.length);
    if (!t.noCover) assert.equal(t.slides[0].kind, "cover");
    assert.equal(t.slides.at(-1).kind, "comment");
  }
});
