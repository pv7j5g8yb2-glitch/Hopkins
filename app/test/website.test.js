import { test } from "node:test";
import assert from "node:assert/strict";
import { boot, client } from "./helpers.js";

// Setup step 3 (Ismael, 2026-11-01): the brokerage's website, read end to end, not a glance. Every
// page that matters is read (politely, robots.txt first), the measured UX checks always stand, the
// model adds the profile and the review, and the brokerage name fills in from it.
const app = await boot({ ANTHROPIC_API_KEY: "", GEMINI_API_KEY: "", GROQ_API_KEY: "test-groq", GROQ_BACKUP_MODELS: "" });
const site = await import("../src/site.js");
const brain = await import("../src/brain.js");
const hopkins = await import("../src/hopkins.js");

const nav = `<a href="/about">About</a><a href="/listings">Listings</a><a href="/contact">Contact</a><a href="/private/x">Staff</a><a href="/gone">Old</a><a href="/logo.png">img</a><a href="https://other.test/x">out</a>`;
const PAGES = {
  "/": `<html><head><title>Ellery Realty | Austin homes</title><meta name="viewport" content="width=device-width"></head><body><h1>Austin homes</h1>${nav}<img src="a.jpg"><img src="b.jpg"><a href="/search">Search homes</a></body></html>`,
  "/about": `<html><head><title>About</title><meta name="viewport" content="width=device-width"><meta name="description" content="Who we are"></head><body><h1>About Ellery Realty</h1><p>Sam Ellery has sold homes in Austin and Round Rock for 12 years.</p>${nav}</body></html>`,
  "/listings": `<html><head><title>Listings</title></head><body><h2>Featured</h2><div id="ihomefinder"></div>${nav}</body></html>`,
  "/contact": `<html><head><title>Contact</title><meta name="viewport" content="width=device-width"></head><body><h1>Contact</h1><form><input name="first"><input name="last"><input name="email"><input name="phone"><input name="budget"><input name="timeline"><input name="beds"><button>Submit</button></form></body></html>`,
  "/private/x": `<html><body>secret staff page</body></html>`,
};
const asked = [];
site.setSiteFetchForTests(async (u) => {
  const url = new URL(String(u));
  asked.push(url.pathname);
  if (url.host !== "ellery-realty.com") return new Response("", { status: 403 });
  if (url.pathname === "/robots.txt") return new Response("User-agent: *\nDisallow: /private", { status: 200 });
  const html = PAGES[url.pathname];
  return html ? new Response(html, { status: 200 }) : new Response("", { status: 404 });
});
let seen = null;
brain.setFetchForTests(async (url, init) => {
  const body = JSON.parse(init.body);
  const system = body.messages?.[0]?.content || "";
  let out = null;
  if (/review a real estate business's website/.test(system)) {
    seen = body.messages[1].content;
    out = { brokerage: "Ellery Realty", agent: "Sam Ellery", about: "Sam Ellery sells homes in Austin and Round Rock.", areas: ["Austin", "Round Rock"], specialties: [], voice: "plain", score: 6, strengths: ["Clear Austin focus on the home page"], problems: [{ issue: "The contact form asks for 7 things", where: "/contact", fix: "Ask for name, email and a message" }] };
  } else if (/"reply"/.test(system)) out = { reply: "Here's the answer." };
  if (!out) return { ok: false, status: 500, text: async () => "down" };
  return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(out) } }] }) };
});

test("the whole site is read, robots.txt respected, and the measured checks stand on their own", async () => {
  const crawl = await site.crawlSite("ellery-realty.com");
  const paths = crawl.pages.map((p) => new URL(p.url).pathname);
  assert.deepEqual(paths.sort(), ["/", "/about", "/contact", "/listings"]);
  assert.ok(!asked.includes("/private/x"), "a page robots.txt keeps out is never asked for");
  assert.ok(!asked.includes("/logo.png"));
  assert.deepEqual(crawl.broken.sort(), ["/gone", "/search"]);
  assert.ok(crawl.pages.find((p) => p.url.endsWith("/listings")).search, "the property search is found");
  const checks = site.siteChecks(crawl).map((c) => c.issue);
  assert.ok(checks.some((c) => /mobile viewport/.test(c)), "the listings page has no viewport");
  assert.ok(checks.some((c) => /tap to call/.test(c)));
  assert.ok(checks.some((c) => /7 or more/.test(c)));
  assert.ok(checks.some((c) => /don't open/.test(c)));
  assert.ok(checks.some((c) => /2 of 2 images/.test(c)));
});

test("setup's website is saved at once, read in the background, fills the brokerage and reaches the chat", async () => {
  const c = client(app);
  await c("POST", "/api/signup", { email: "web@ellery.test", password: "password123", invite: "EARLY1", name: "Sam Ellery" });
  assert.equal((await c("POST", "/api/site", { url: "not a site" })).status, 400);
  const r = await c("POST", "/api/site", { url: "Ellery-Realty.com/" });
  assert.equal(r.status, 200);
  assert.equal(r.json.website, "https://ellery-realty.com");
  assert.equal(r.json.site.status, "reading");
  let s;
  for (let i = 0; i < 50; i++) { s = (await c("GET", "/api/site")).json.site; if (s.status !== "reading") break; await new Promise((ok) => setTimeout(ok, 20)); }
  assert.equal(s.status, "done");
  assert.equal(s.pages.length, 4);
  assert.equal(s.score, 6);
  assert.ok(s.checks.length >= 4);
  assert.match(seen, /Pages that didn.t open: .*\/gone/);
  const me = (await c("GET", "/api/me")).json;
  assert.equal(me.workspace.brand.business, "Ellery Realty", "the brokerage fills in from the site");
  assert.equal(me.workspace.brand.website, "https://ellery-realty.com");
  const ws = await hopkins.getWorkspace(me.workspace.id);
  const summary = await hopkins.accountSummary(ws);
  assert.match(summary, /Website: https:\/\/ellery-realty\.com, read end to end \(4 pages\)/);
  assert.match(summary, /UX review: 6\/10/);
  assert.match(summary, /contact form asks for 7 things/);
});

test("a site that restricts access says so, and a name already set is never overwritten", async () => {
  const c = client(app);
  await c("POST", "/api/signup", { email: "web2@ellery.test", password: "password123", invite: "EARLY1", name: "Sam Ellery" });
  await c("PUT", "/api/brand", { business: "Sam's Own Team" });
  await c("POST", "/api/site", { url: "blocked.test" });
  let s;
  for (let i = 0; i < 50; i++) { s = (await c("GET", "/api/site")).json.site; if (s.status !== "reading") break; await new Promise((ok) => setTimeout(ok, 20)); }
  assert.equal(s.status, "blocked");
  await c("POST", "/api/site", { url: "ellery-realty.com" });
  for (let i = 0; i < 50; i++) { s = (await c("GET", "/api/site")).json.site; if (s.status !== "reading") break; await new Promise((ok) => setTimeout(ok, 20)); }
  assert.equal(s.status, "done");
  assert.equal((await c("GET", "/api/me")).json.workspace.brand.business, "Sam's Own Team");
});
