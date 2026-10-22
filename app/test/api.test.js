import { test } from "node:test";
import assert from "node:assert/strict";
import { boot, client, TINY_JPEG } from "./helpers.js";
import { houseRuleProblems } from "../src/writer.js";

const app = await boot();
const { all } = await import("../src/db.js");

const DESCRIPTION = "Just listed: 412 Oak Street in Riverside, Austin, TX. 3 bed, 2 bath, 1,840 sq ft craftsman with a wraparound porch, renovated kitchen and a fenced backyard. Perfect for families. $649,000";

async function signup(email, extra = {}) {
  const c = client(app);
  const r = await c("POST", "/api/signup", { email, password: "password123", name: "Sam Ellery", business: "Ellery Realty", invite: "early1", ...extra });
  return { c, r };
}

test("sign ups need an invite, and passwords are checked", async () => {
  const bad = client(app);
  assert.equal((await bad("POST", "/api/signup", { email: "x@y.com", password: "password123", invite: "nope" })).status, 403);
  // No code, no account, unless it's an admin's email.
  assert.equal((await client(app)("POST", "/api/signup", { email: "someone@else.test", password: "password123" })).status, 403);
  assert.equal((await client(app)("POST", "/api/signup", { email: "Owner@hopkins.test", password: "password123" })).status, 200);
  const { c, r } = await signup("sam@ellery.test");
  assert.equal(r.status, 200);
  assert.equal((await c("GET", "/api/me")).json.workspace.plan, "free");
  const other = client(app);
  assert.equal((await other("POST", "/api/login", { email: "sam@ellery.test", password: "wrong-password" })).status, 401);
  assert.equal((await other("POST", "/api/login", { email: "SAM@ellery.test", password: "password123" })).status, 200);
  assert.equal((await client(app)("GET", "/api/me")).status, 401);
});

test("the whole free plan: listing in, 3 ads out, changes included, the 4th and running need the paid plan", async () => {
  const { c } = await signup("free@ellery.test");
  assert.equal((await c("PUT", "/api/brand", { city: "Austin", primary: "#123456", voice: "warm" })).status, 200);
  assert.equal((await c("PUT", "/api/brand", { primary: "blue" })).status, 400);

  const photo = await c("POST", "/api/photos", { data: TINY_JPEG, thumb: TINY_JPEG, mime: "image/jpeg", name: "kitchen-1.jpg" });
  assert.equal(photo.json.label, "kitchen");
  const created = await c("POST", "/api/listings", { text: DESCRIPTION, photoIds: [photo.json.id], photoNames: { [photo.json.id]: "kitchen-1.jpg" } });
  assert.equal(created.status, 200);
  const p = created.json;
  assert.equal(p.listing.price, 649000);
  assert.equal(p.ads.length, 3);
  assert.equal(p.photos.length, 1);
  assert.ok(p.messages.some((m) => m.kind === "ads" && m.needs_action));
  assert.ok(p.messages.some((m) => m.kind === "check"), "flags 'Perfect for families' in the agent's own text");
  for (const ad of p.ads) assert.ok(!/famil/i.test(ad.primary_text + ad.overlay));
  const id = p.listing.id;

  const before = p.ads.find((a) => a.version === 2).primary_text;
  const shorter = await c("POST", `/api/listings/${id}/messages`, { text: "make it shorter", version: 2 });
  assert.ok(shorter.json.ads.find((a) => a.version === 2).primary_text.length < before.length);
  const head = await c("POST", `/api/listings/${id}/messages`, { text: 'headline to "Porch season in Riverside"', version: 1 });
  assert.equal(head.json.ads.find((a) => a.version === 1).headline, "Porch season in Riverside");
  // A later tone change keeps the agent's own headline.
  const warm = await c("POST", `/api/listings/${id}/messages`, { text: "make version 1 more premium", version: 1 });
  assert.equal(warm.json.ads.find((a) => a.version === 1).headline, "Porch season in Riverside");

  const run = await c("POST", `/api/listings/${id}/run`, { versions: [1, 2, 3] });
  assert.equal(run.json.messages.at(-1).kind, "upgrade");

  const price = await c("POST", `/api/listings/${id}/messages`, { text: "price dropped to $629,000" });
  assert.equal(price.json.listing.price, 629000);
  assert.equal(price.json.ads.length, 3, "still the same 3 ads");
  assert.equal(price.json.messages.at(-1).kind, "upgrade");
  assert.ok(price.json.ads.some((a) => a.primary_text.includes("$629,000")), "the 3 ads carry the new price");

  const second = await c("POST", "/api/listings", { text: "Condo in Midtown, 1 bed 1 bath, $389k" });
  assert.equal(second.json.ads.length, 0);
  assert.equal(second.json.messages.at(-1).kind, "upgrade");

  const me = await c("GET", "/api/me");
  assert.equal(me.json.usage.adsMade, 3);

  // Nothing Hopkins said breaks the house rules.
  for (const m of [...price.json.messages, ...second.json.messages].filter((m) => m.role === "hopkins")) {
    assert.deepEqual(houseRuleProblems(m.body), [], m.body);
  }
});

test("paid: the plan first, then the yes, then the testing record and leads", async () => {
  const { c } = await signup("boss@hopkins.test");
  const created = await c("POST", "/api/listings", { text: DESCRIPTION });
  const id = created.json.listing.id;
  const ws = (await c("GET", "/api/me")).json.workspace.id;
  assert.equal((await c("PATCH", `/api/admin/workspaces/${ws}`, { plan: "paid" })).status, 200);

  const plan = await c("POST", `/api/listings/${id}/run`, { versions: [1, 2, 3], budget: 300, days: 14 });
  const planMsg = plan.json.messages.at(-1);
  assert.equal(planMsg.kind, "plan");
  assert.equal(planMsg.data.budget, 300);
  assert.equal(planMsg.data.audience.radiusMiles, 15);
  assert.equal((await all(`SELECT * FROM launches`)).length, 0, "nothing is set up before the yes");

  const yes = await c("POST", `/api/listings/${id}/run`, { confirm: planMsg.id });
  assert.ok(yes.json.ads.every((a) => a.status === "approved"));
  assert.match(yes.json.messages.at(-1).body, /Meta ad account is connected/);
  assert.match(yes.json.messages.at(-1).body, /post or boost them yourself/);
  assert.equal((await all(`SELECT * FROM tests WHERE listing_id = ?`, [id])).length, 3);

  // A price change on the paid plan brings 3 new price ads.
  const price = await c("PATCH", `/api/listings/${id}`, { price: 629000 });
  assert.equal(price.json.listing.moment, "price");
  assert.ok(price.json.ads.every((a) => a.moment === "price" && a.status === "draft"));

  // The public lead page, then a lead from version 1 of the approved set.
  const approvedV1 = yes.json.ads.find((a) => a.version === 1);
  const page = await client(app)("GET", `/l/${created.json.listing.slug}`);
  assert.equal(page.status, 200);
  assert.match(page.body, /412 Oak Street/);
  const anon = client(app);
  assert.equal((await anon("POST", `/api/l/${created.json.listing.slug}/lead`, { name: "Dana" })).status, 400);
  const lead = await anon("POST", `/api/l/${created.json.listing.slug}/lead`, { name: "Dana Price", phone: "512 555 0199", wants: "showing", v: approvedV1.id });
  assert.equal(lead.status, 200);
  const record = await all(`SELECT * FROM tests WHERE ad_id = ?`, [approvedV1.id]);
  assert.equal(record[0].leads, 1);

  const leads = await c("GET", "/api/leads");
  assert.equal(leads.json.leads[0].version, 1);
  await c("PATCH", `/api/listings/${id}`, { spend: 60 });
  const report = await c("GET", "/api/report");
  assert.equal(report.json.total, 1);
  assert.equal(report.json.cpl, 60);
  assert.match(report.json.headline, /1 lead, \$60 each, 1 asked for a showing/);
});

test("workspaces can't see each other's listings, and only admins see admin", async () => {
  const a = await signup("a@one.test");
  const b = await signup("b@two.test");
  const created = await a.c("POST", "/api/listings", { text: DESCRIPTION });
  assert.equal((await b.c("GET", `/api/listings/${created.json.listing.id}`)).status, 404);
  assert.equal((await b.c("POST", `/api/listings/${created.json.listing.id}/messages`, { text: "run it" })).status, 404);
  assert.equal((await b.c("GET", "/api/admin/workspaces")).status, 403);
  assert.equal((await b.c("GET", "/api/listings")).json.listings.length, 0);
});

test("the lead page escapes what agents type", async () => {
  const { c } = await signup("x@xss.test");
  const created = await c("POST", "/api/listings", { text: "</script><script>alert(1)</script> 12 Elm Street $500,000 $& here" });
  const page = await client(app)("GET", `/l/${created.json.listing.slug}`);
  assert.ok(!page.body.includes("<script>alert(1)"));
});
