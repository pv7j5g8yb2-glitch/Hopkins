import { test } from "node:test";
import assert from "node:assert/strict";
import { TEMPLATES, matchTemplates } from "../src/templates.js";

test("a request only matches a template made for it", () => {
  assert.equal(matchTemplates("a post about what our neighborhoods would have in their notes app")[0].id, "notes-app");
  assert.equal(matchTemplates("businesses in my city that closed that locals miss")[0].id, "gone-but-never-forgotten");
  assert.deepEqual(matchTemplates("market update on interest rates for first time buyers"), []);
  assert.deepEqual(matchTemplates("best coffee spots in my city"), [], "no template for it, so none is forced");
});

test("every template has a purpose, a cover and a comment slide, and its own id", () => {
  const ids = new Set(TEMPLATES.map((t) => t.id));
  assert.equal(ids.size, TEMPLATES.length);
  for (const t of TEMPLATES) {
    assert.ok(t.purpose && t.topics.length && t.covers.length);
    assert.equal(t.slides[0].kind, "cover");
    assert.equal(t.slides.at(-1).kind, "comment");
  }
});
