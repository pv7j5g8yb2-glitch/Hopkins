import { test } from "node:test";
import assert from "node:assert/strict";
import { boot, client } from "./helpers.js";

// Setup from the agent's website: what the page says, for them to check; a blocked site says so.
const app = await boot({});
const site = await import("../src/site.js");
const PNG = Buffer.concat([Buffer.from("89504e470d0a1a0a", "hex"), Buffer.alloc(64, 1)]);
const PAGE = `<html><head><title>Ellery Realty | Homes in Austin</title><meta name="theme-color" content="#1F3A5F">
<link rel="apple-touch-icon" href="/icon-180.png"><style>.btn{background:#C8A96A} .x{color:#ffffff} .y{color:#222}</style></head>
<body><img class="site-logo" src="/img/logo.png" alt="Ellery Realty logo"><a href="tel:+15125550100">(512) 555 0100</a>
<a href="mailto:sam@ellery-realty.com?subject=Hi">Email</a><a href="https://www.instagram.com/elleryrealty/">IG</a><a href="https://instagram.com/p/abc/">post</a>
<script type="application/ld+json">{"@type":"RealEstateAgent","address":{"addressLocality":"Austin"}}</script></body></html>`;
site.setSiteFetchForTests(async (u) => {
  const url = String(u);
  if (url.startsWith("https://ellery-realty.com")) return new Response(PAGE, { status: 200 });
  if (url.startsWith("https://blocked.test")) return new Response("", { status: 403 });
  return new Response("", { status: 404 });
});
const realFetch = globalThis.fetch;
globalThis.fetch = async (u, init) => (String(u).endsWith("/img/logo.png") ? new Response(PNG, { status: 200 }) : realFetch(u, init));

test("the agent's website fills in their brand; a blocked one says to fill it in by hand", async () => {
  const c = client(app);
  await c("POST", "/api/signup", { email: "site@ellery.test", password: "password123", invite: "EARLY1", name: "Sam Ellery" });
  const r = await c("POST", "/api/brand/from-link", { url: "ellery-realty.com" });
  assert.equal(r.status, 200);
  const f = r.json.fields;
  assert.deepEqual([f.business, f.phone, f.email, f.instagram, f.city, f.primary, f.accent], ["Ellery Realty", "(512) 555 0100", "sam@ellery-realty.com", "@elleryrealty", "Austin", "#1F3A5F", "#C8A96A"]);
  assert.ok(f.logo_id, "the logo is kept, ready to use");
  // Nothing is saved until they save.
  assert.notEqual((await c("GET", "/api/me")).json.workspace.brand.business, "Ellery Realty");
  const bad = await c("POST", "/api/brand/from-link", { url: "https://blocked.test" });
  assert.equal(bad.status, 400);
  assert.equal(bad.json.error, "That site restricts access, so the details need filling in by hand.");
});
