import { test } from "node:test";
import assert from "node:assert/strict";
import { TEMPLATES, matchTemplates, forUser } from "../src/templates.js";

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
  assert.equal(matchTemplates("things I do as an agent that seem unhinged to the average person")[0].id, "unhinged-to-the-average-person");
  assert.equal(matchTemplates("when I list a home I treat it like it's my own")[0].id, "when-i-list-a-home");
  assert.equal(matchTemplates("it doesn't have to be your dream house, reassurance for a nervous first home buyer")[0].id, "doesnt-have-to-be");
  assert.equal(matchTemplates("why I chose my brokerage, a recruiting post for agents")[0].id, "why-i-chose-my-brokerage");
  assert.equal(matchTemplates("kinda chic to love where you live, my values")[0].id, "kinda-chic");
  assert.equal(matchTemplates("a holiday guide with festivities, gifts and drinks in my city")[0].id, "seasonal-local-guide");
  assert.deepEqual(matchTemplates("market update on interest rates for first time buyers"), []);
  assert.equal(matchTemplates("best coffee spots in my city")[0].id, "seasonal-local-guide");
  assert.equal(matchTemplates("a fall guide with things to do in my city")[0].id, "seasonal-local-guide");
  assert.deepEqual(matchTemplates("how much house can I afford"), [], "no template for it, so none is forced");
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

test("no template gives a user a comment for the freebie offer until that is set up", () => {
  for (const t of TEMPLATES) {
    const u = forUser(t);
    assert.ok(!("comment_word" in u.fields) && !("comment_offer" in u.fields), t.id);
    for (const sl of u.slides) assert.ok(!sl.fields.includes("comment_word") && !sl.fields.includes("comment_offer"), t.id);
  }
});
