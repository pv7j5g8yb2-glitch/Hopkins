import { test } from "node:test";
import assert from "node:assert/strict";
import { boot, client } from "./helpers.js";

// A request that fits a human designed template is filled into it, never designed: researched ones
// show the places with their sources first, and nothing carries a comment for the freebie line.
const app = await boot();
const hopkins = await import("../src/hopkins.js");
const seen = [];
hopkins.setTemplateForTests(async (a) => {
  seen.push(a);
  const slides = a.template.slides.map((s, i) => ({ kind: s.kind, title: s.kind === "comment" ? "I'm Sam, Austin local & real estate advisor" : `Title ${i}`, body: s.kind === "comment" ? "" : "A line.", lines: s.kind === "guide-list" ? ["Cafe One | South Congress"] : [], top: "", bottom: "", caption: "", script: s.kind === "comment" ? "Happy Fall!" : "", photo: 0 }));
  return { title: "Fall guide", slides: slides.concat(a.previous ? [] : []), reply: "" };
}, async () => [{ category: "coffee", name: "Cafe One", where: "South Congress", detail: "good cold brew", source: "https://example.com/cafe-one" }]);

async function signup(email) {
  const c = client(app);
  await c("POST", "/api/signup", { email, password: "password123", invite: "EARLY1", name: "Sam Ellery" });
  await c("PUT", "/api/brand", { area: "Austin, Texas", city: "Austin, Texas", agent_name: "Sam Ellery" });
  return c;
}

test("a local guide request shows the researched places with sources, then go makes it from the template", async () => {
  const c = await signup("tplguide@ellery.test");
  const s = await c("POST", "/api/listings/start", { text: "Make me a fall guide with things to do in my city" });
  const f = await c("POST", `/api/listings/${s.json.listing.id}/first`, {});
  const facts = f.json.messages.at(-1);
  assert.equal(facts.kind, "facts");
  assert.equal(facts.data.facts[0].source, "https://example.com/cafe-one");
  assert.equal(f.json.creations.length, 0, "nothing is made before the places are checked");
  const g = await c("POST", `/api/listings/${s.json.listing.id}/messages`, { text: "go" });
  assert.equal(g.json.creations.length, 1);
  const spec = g.json.creations[0].spec;
  assert.equal(spec.template, "seasonal-local-guide");
  assert.ok(spec.slides.every((x) => x.layout), "every slide has its drawn layout");
  assert.equal(spec.slides.at(-1).layout, "portrait-end");
  assert.ok(!spec.slides.some((x) => /comment/i.test([x.title, x.body, x.top, x.bottom, ...x.lines].join(" "))), "no comment for the freebie line");
  assert.ok(seen.at(-1).facts, "only the approved places go in");
  // a change keeps the template
  const ch = await c("POST", `/api/listings/${s.json.listing.id}/messages`, { text: "make the cover shorter" });
  assert.equal(ch.json.creations[0].version, 2);
  assert.equal(ch.json.creations[0].spec.template, "seasonal-local-guide");
});

test("a template that needs no research is made straight away", async () => {
  const c = await signup("tplfun@ellery.test");
  const s = await c("POST", "/api/listings/start", { text: "Make a kinda chic carousel about my values, love where you live and lifelong friends" });
  const f = await c("POST", `/api/listings/${s.json.listing.id}/first`, {});
  assert.equal(f.json.creations[0].spec.template, "kinda-chic");
});

test("a request no template fits still goes to the usual chat", async () => {
  const c = await signup("tplnone@ellery.test");
  const s = await c("POST", "/api/listings/start", { text: "Can you explain how a mortgage pre approval works?" });
  const f = await c("POST", `/api/listings/${s.json.listing.id}/first`, {});
  assert.equal(f.json.creations.length, 0);
});
