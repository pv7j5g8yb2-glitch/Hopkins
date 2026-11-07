import { test } from "node:test";
import assert from "node:assert/strict";
import { boot, client } from "./helpers.js";

// Needs attention: found from Hopkins' own records, only past a minimum of evidence, one button
// that does what it says, and dismissed means gone for good.
const app = await boot({ PILOT_PLAN: "paid" });
const { run, get } = await import("../src/db.js");
const ago = (h) => new Date(Date.now() - h * 3600000).toISOString();

test("ads made and never run, and a Lead still marked New, are flagged; Dismiss sticks", async () => {
  const c = client(app);
  await c("POST", "/api/signup", { email: "watch@agent.test", password: "password123", invite: "EARLY1", name: "Rae Kim" });
  const l = await c("POST", "/api/listings", { text: "7 Birch Rd, Austin, TX. 3 bed 2 bath, $520,000" });
  const id = l.json.listing.id;

  // Fresh ads aren't nagged about.
  let r = await c("GET", "/api/inbox");
  assert.equal(r.json.attention.length, 0);

  await run(`UPDATE ads SET created_at = ? WHERE listing_id = ?`, [ago(50), id]);
  r = await c("GET", "/api/inbox");
  assert.deepEqual(r.json.attention.map((a) => [a.title, a.body, a.action.label]), [["7 Birch Rd isn't being advertised", "3 ads are ready and nothing is running.", "Prepare a plan"]]);

  // Its button makes the plan to approve in the chat, and goes there.
  const act = await c("POST", `/api/attention/${r.json.attention[0].id}`, { choice: "act" });
  assert.equal(act.json.go, `#/l/${id}`);
  const chat = (await c("GET", `/api/listings/${id}`)).json;
  assert.equal(chat.messages.at(-1).kind, "plan");
  assert.equal(act.json.attention.length, 0);

  // A Lead from yesterday still marked New.
  const slug = l.json.listing.slug;
  await client(app)("POST", `/api/l/${slug}/lead`, { name: "Dana Price", phone: "512 555 0199", wants: "showing" });
  await run(`UPDATE leads SET created_at = ? WHERE listing_id = ?`, [ago(26), id]);
  r = await c("GET", "/api/inbox");
  const f = r.json.attention.find((a) => a.title === "Dana Price is waiting for a reply");
  assert.ok(f, JSON.stringify(r.json.attention));
  assert.equal(f.body, "Asked for a showing on 7 Birch Rd 26 hours ago. Still marked New.");
  // Dismissed, it never comes back, even though the Lead is still New.
  await c("POST", `/api/attention/${f.id}`, { choice: "dismiss" });
  r = await c("GET", "/api/inbox");
  assert.ok(!r.json.attention.some((a) => a.title === "Dana Price is waiting for a reply"));

  // A second Lead, then marked contacted: it goes away by itself.
  await client(app)("POST", `/api/l/${slug}/lead`, { name: "Lee Park", phone: "512 555 0100" });
  const lee = await get(`SELECT id FROM leads WHERE name = 'Lee Park'`);
  await run(`UPDATE leads SET created_at = ? WHERE id = ?`, [ago(30), lee.id]);
  assert.ok((await c("GET", "/api/inbox")).json.attention.some((a) => a.title === "Lee Park is waiting for a reply"));
  await c("PATCH", `/api/leads/${lee.id}`, { status: "contacted" });
  assert.ok(!(await c("GET", "/api/inbox")).json.attention.some((a) => a.title === "Lee Park is waiting for a reply"));

  // The chat knows what's flagged, for "what should I do this week?".
  const { accountSummary, getWorkspace } = await import("../src/hopkins.js");
  const ws = await getWorkspace((await c("GET", "/api/me")).json.workspace.id);
  assert.match(await accountSummary(ws), /Needs attention/);
});
