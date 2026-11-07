import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { boot, client } from "./helpers.js";

// Every account deleted once, for a clean start (Ismael, 2026-10-31), never while an ad on Meta
// can't be paused; and deleting one account clears every table it has rows in.
const app = await boot({ PILOT_PLAN: "paid" });
const { run, get } = await import("../src/db.js");
const { freshStart } = await import("../src/fresh.js");
const count = async (t) => Number((await get(`SELECT COUNT(*) AS n FROM ${t}`)).n);

async function account(email) {
  const c = client(app);
  await c("POST", "/api/signup", { email, password: "password123", invite: "EARLY1", name: "Sam Ellery" });
  const l = await c("POST", "/api/listings", { text: "12 Elm St, Austin, TX. 3 bed 2 bath, $585,000" });
  const ws = (await c("GET", "/api/me")).json.workspace.id;
  await run(`INSERT INTO creations (id, workspace_id, listing_id, kind, spec, created_at, updated_at) VALUES (?,?,?,?,?,?,?)`, [randomUUID(), ws, l.json.listing.id, "post", "{}", "x", "x"]);
  await run(`INSERT INTO meta_connections (workspace_id, fb_user_id, token, created_at, updated_at) VALUES (?,?,?,?,?)`, [ws, "1", "sealed", "x", "x"]);
  return { c, ws, listing: l.json.listing.id };
}

test("deleting an account clears its creations, Meta login and everything else", async () => {
  const a = await account("gone@ellery.test");
  const keep = await account("stays@ellery.test");
  assert.equal((await a.c("POST", "/api/account/delete", { password: "password123" })).status, 200);
  for (const t of ["creations", "meta_connections", "listings", "ads", "messages", "users"]) {
    assert.equal(Number((await get(`SELECT COUNT(*) AS n FROM ${t} WHERE workspace_id = ?`, [a.ws])).n), 0, t);
  }
  assert.ok(await get(`SELECT 1 FROM users WHERE workspace_id = ?`, [keep.ws]));
});

test("the fresh start waits while Meta can't pause a running ad, then deletes every account once", async () => {
  const a = await account("one@ellery.test");
  await account("two@ellery.test");
  const live = randomUUID();
  await run(`INSERT INTO launches (id, workspace_id, listing_id, ad_ids, budget, days, radius_miles, status, created_at, meta_campaign_id) VALUES (?,?,?,?,?,?,?,?,?,?)`, [live, a.ws, a.listing, "[]", 100, 7, 15, "sent", new Date().toISOString(), "camp_1"]);
  const held = await freshStart("test");
  assert.equal(held.done, false);
  assert.equal(held.refused.length, 1);
  assert.ok((await count("users")) >= 2);
  // Paused in Ads Manager by hand: the next start goes ahead.
  await run(`UPDATE launches SET status = 'paused' WHERE id = ?`, [live]);
  const done = await freshStart("test");
  assert.equal(done.done, true);
  for (const t of ["workspaces", "users", "listings", "ads", "messages", "creations", "meta_connections", "launches", "photos", "leads"]) assert.equal(await count(t), 0, t);
  // Once only: a new sign up afterwards stays.
  await account("new@ellery.test");
  assert.equal((await freshStart("test")).done, false);
  assert.equal(await count("users"), 1);
});

test("sign up needs a name", async () => {
  const c = client(app);
  const r = await c("POST", "/api/signup", { email: "noname@ellery.test", password: "password123", invite: "EARLY1" });
  assert.equal(r.status, 400);
  assert.equal(r.json.error, "Enter your name.");
  assert.equal((await c("POST", "/api/signup", { name: "   ", email: "noname@ellery.test", password: "password123", invite: "EARLY1" })).status, 400);
});
