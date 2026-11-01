import { test } from "node:test";
import assert from "node:assert/strict";
import { boot, client } from "./helpers.js";

// Notifications on the agent's own devices: one subscription per device, a new lead goes to each,
// a device that's gone is forgotten, and deleting the account removes them.
const app = await boot({ PILOT_PLAN: "paid" });
const push = await import("../src/push.js");
const { get } = await import("../src/db.js");
const sent = [];
let gone = new Set();
push.setPushSendForTests(async (sub, payload) => {
  if (gone.has(sub.endpoint)) { const e = new Error("gone"); e.statusCode = 410; throw e; }
  sent.push({ endpoint: sub.endpoint, ...JSON.parse(payload) });
});
const sub = (n) => ({ endpoint: `https://fcm.googleapis.com/fcm/send/device${n}`, keys: { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM", auth: "tBHItJI5svbpez7KI4CCXg" } });

test("turn on, a new lead reaches every device, a gone device is dropped", async () => {
  const c = client(app);
  await c("POST", "/api/signup", { name: "Sam Ellery", email: "push@ellery.test", password: "password123", invite: "EARLY1" });
  const k = await c("GET", "/api/push");
  assert.match(k.json.key, /^[A-Za-z0-9_-]{80,}$/);
  assert.equal(k.json.devices, 0);
  assert.equal((await c("POST", "/api/push", { subscription: { endpoint: "http://evil.test/x", keys: {} } })).status, 400);
  assert.equal((await c("POST", "/api/push", { subscription: sub(1) })).json.devices, 1);
  assert.equal((await c("POST", "/api/push", { subscription: sub(2) })).json.devices, 2);
  // The same device again is still one device.
  assert.equal((await c("POST", "/api/push", { subscription: sub(2) })).json.devices, 2);

  const l = await c("POST", "/api/listings", { text: "412 Oak Street, Austin, TX. $649,000. 3 bed 2 bath" });
  gone.add(sub(2).endpoint);
  await client(app)("POST", `/api/l/${l.json.listing.slug}/lead`, { name: "dana price", phone: "512 555 0100", wants: "showing", note: "Is Saturday ok?" });
  await new Promise((r) => setTimeout(r, 100));
  const toDevice1 = sent.filter((x) => x.endpoint === sub(1).endpoint);
  assert.equal(toDevice1.length, 1);
  assert.equal(toDevice1[0].title, "New lead · 412 Oak Street");
  assert.equal(toDevice1[0].body, 'Dana Price wants a showing. "Is Saturday ok?"');
  assert.equal(toDevice1[0].url, "/#/leads");
  assert.equal((await c("GET", "/api/push")).json.devices, 1, "the gone device was dropped");

  assert.equal((await c("POST", "/api/push/test", {})).status, 200);
  assert.equal((await c("DELETE", "/api/push", { endpoint: sub(1).endpoint })).json.devices, 0);
  assert.equal((await c("POST", "/api/push/test", {})).status, 400);

  // Deleting the account removes its devices.
  await c("POST", "/api/push", { subscription: sub(3) });
  const ws = (await c("GET", "/api/me")).json.workspace.id;
  await c("POST", "/api/account/delete", { password: "password123" });
  assert.equal(Number((await get(`SELECT COUNT(*) AS n FROM push_subs WHERE workspace_id = ?`, [ws])).n), 0);
});

test("the keys are made once and kept", async () => {
  const a = await push.pushKeys();
  const b = await push.pushKeys();
  assert.equal(a.publicKey, b.publicKey);
  assert.ok(await get(`SELECT 1 FROM app_keys WHERE name = 'vapid'`));
});
