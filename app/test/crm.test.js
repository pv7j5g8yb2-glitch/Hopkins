import { test } from "node:test";
import assert from "node:assert/strict";
import { boot, client } from "./helpers.js";

// Each new Lead goes to the agent's CRM: Follow Up Boss with their own API key (checked first,
// kept encrypted), any other CRM through a webhook. A CRM that's down never loses the Lead.
const app = await boot({ APP_URL: "https://hopkins.test" });
const crm = await import("../src/crm.js");
const { get } = await import("../src/db.js");

const calls = [];
let hookDown = false;
crm.setCrmFetchForTests(async (url, init = {}) => {
  calls.push({ url, method: init.method || "GET", headers: init.headers, body: init.body ? JSON.parse(init.body) : null });
  const ok = (body) => ({ ok: true, status: 200, json: async () => body });
  if (url === "https://api.followupboss.com/v1/identity") {
    return init.headers.Authorization === `Basic ${Buffer.from("fub_good:").toString("base64")}` ? ok({ account: { name: "Ellery Realty" } }) : { ok: false, status: 401, json: async () => ({}) };
  }
  if (url === "https://api.followupboss.com/v1/events") return ok({ id: 1 });
  if (url.startsWith("https://hooks.zapier.test/")) return hookDown ? { ok: false, status: 500, json: async () => ({}) } : ok({});
  return { ok: false, status: 404, json: async () => ({}) };
});
const settle = () => new Promise((r) => setTimeout(r, 50));

test("Follow Up Boss and a webhook get every new Lead, with the property and the ad it came from", async () => {
  const c = client(app);
  await c("POST", "/api/signup", { email: "crm@agent.test", password: "password123", invite: "EARLY1", name: "Sam Ellery" });
  assert.deepEqual((await c("GET", "/api/me")).json.crm, { fub: false, fubName: null, hook: null, last: null, skip: false });
  assert.equal((await c("PUT", "/api/crm", { skip: true })).json.skip, true, "skipped from the setup");

  // A wrong key is refused, a right one is checked with Follow Up Boss and never shown again.
  const bad = await c("PUT", "/api/crm", { fub: "fub_wrong" });
  assert.equal(bad.status, 400);
  assert.equal(bad.json.error, "Follow Up Boss didn't accept that API key.");
  const on = await c("PUT", "/api/crm", { fub: "fub_good" });
  assert.deepEqual(on.json, { fub: true, fubName: "Ellery Realty", hook: null, last: null, skip: true });
  const ws = await get(`SELECT crm FROM workspaces WHERE name IS NOT NULL AND crm IS NOT NULL`);
  assert.doesNotMatch(ws.crm, /fub_good/, "the key is kept encrypted");

  // Webhooks: https to a public address only.
  for (const url of ["http://hooks.zapier.test/x", "https://localhost/x", "https://10.0.0.2/x", "https://169.254.169.254/latest", "not a url"]) {
    assert.equal((await c("PUT", "/api/crm", { hook: url })).status, 400, url);
  }
  assert.equal((await c("PUT", "/api/crm", { hook: "https://hooks.zapier.test/abc" })).json.hook, "hooks.zapier.test");
  assert.equal((await c("POST", "/api/crm/test", {})).status, 200);
  assert.equal(calls.at(-1).body.lead.name, "Test Lead");

  // A real Lead from the lead page goes to both.
  const created = await c("POST", "/api/listings", { text: "412 Oak Street, Austin, TX. $649,000. 3 bed 2 bath, 1,850 sq ft craftsman with a porch." });
  const slug = created.json.listing.slug;
  calls.length = 0;
  const lead = await client(app)("POST", `/api/l/${slug}/lead`, { name: "dana price", phone: "512 555 0199", email: "dana@buyer.test", wants: "showing", note: "Is Saturday ok?" });
  assert.equal(lead.status, 200);
  await settle();
  const fub = calls.find((x) => x.url.endsWith("/v1/events"));
  assert.equal(fub.headers["X-System"], "Hopkins");
  assert.equal(fub.body.type, "Property Inquiry");
  assert.equal(fub.body.source, "Hopkins");
  assert.deepEqual(fub.body.person, { firstName: "Dana", lastName: "Price", emails: [{ value: "dana@buyer.test" }], phones: [{ value: "512 555 0199" }], tags: ["Hopkins"] });
  assert.equal(fub.body.message, "Wants a showing. Is Saturday ok?");
  assert.equal(fub.body.property.street, "412 Oak Street");
  assert.equal(fub.body.property.price, 649000);
  assert.equal(fub.body.property.forRent, false);
  assert.equal(fub.body.property.url, `https://hopkins.test/l/${slug}`);
  const hook = calls.find((x) => x.url.startsWith("https://hooks.zapier.test/"));
  assert.equal(hook.body.event, "lead.created");
  assert.equal(hook.body.lead.email, "dana@buyer.test");
  assert.equal(hook.body.listing.address, "412 Oak Street");
  assert.equal((await c("GET", "/api/me")).json.crm.last.ok, true);

  // The webhook is down: the Lead is still in Hopkins, and Settings says it didn't arrive there.
  hookDown = true;
  assert.equal((await client(app)("POST", `/api/l/${slug}/lead`, { name: "Lee Park", phone: "512 555 0100" })).status, 200);
  await settle();
  const last = (await c("GET", "/api/me")).json.crm.last;
  assert.deepEqual([last.ok, last.failed], [false, ["webhook"]]);
  const listing = await c("GET", `/api/listings/${created.json.listing.id}`);
  assert.ok(listing.json.messages.some((m) => /New Lead: Lee Park/.test(m.body)));
  hookDown = false;

  // Turning each off.
  assert.deepEqual((await c("PUT", "/api/crm", { fub: "", hook: "" })).json, { fub: false, fubName: null, hook: null, last: null, skip: true });
  calls.length = 0;
  await client(app)("POST", `/api/l/${slug}/lead`, { name: "Kai Moss", phone: "512 555 0111" });
  await settle();
  assert.equal(calls.length, 0);
});
