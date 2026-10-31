import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { boot, client } from "./helpers.js";

// Self-serve plans with a fake Stripe: Checkout for the chosen plan, the plan starting on the way
// back and from the webhook, the portal for cancelling, and cancelling ending the plan.
const app = await boot({ STRIPE_SECRET_KEY: "sk_test_x", STRIPE_WEBHOOK_SECRET: "whsec_test", APP_URL: "https://hopkins.test" });
const stripe = await import("../src/stripe.js");
const { get } = await import("../src/db.js");

const calls = [];
let session = null;
stripe.setStripeFetchForTests(async (url, init = {}) => {
  const path = new URL(url).pathname.replace(/^\/v1\//, "");
  const params = init.body ? Object.fromEntries(new URLSearchParams(init.body)) : {};
  calls.push({ method: init.method, path, params });
  const ok = (body) => ({ ok: true, status: 200, json: async () => body });
  if (path === "checkout/sessions") {
    session = { id: "cs_1", url: "https://checkout.stripe.test/cs_1", client_reference_id: params.client_reference_id, metadata: { plan: params["metadata[plan]"] }, status: "open" };
    return ok(session);
  }
  if (path === "checkout/sessions/cs_1") return ok({ ...session, status: "complete", customer: "cus_1", subscription: "sub_1" });
  if (path === "billing_portal/sessions") return ok({ url: "https://billing.stripe.test/p_1" });
  return { ok: false, status: 404, json: async () => ({ error: { message: "unexpected" } }) };
});

function signed(event) {
  const raw = JSON.stringify(event);
  const t = Math.floor(Date.now() / 1000);
  return { raw, sig: `t=${t},v1=${createHmac("sha256", "whsec_test").update(`${t}.${raw}`).digest("hex")}` };
}
const hook = (event, sig) => app.inject({ method: "POST", url: "/api/stripe/webhook", headers: { "content-type": "application/json", "stripe-signature": sig ?? signed(event).sig }, payload: signed(event).raw });

test("choosing Duo opens Checkout at $149 a month, and the plan starts on the way back", async () => {
  const c = client(app);
  await c("POST", "/api/signup", { email: "pay@duo.test", password: "password123", invite: "EARLY1", name: "Kim Duo" });
  const me = (await c("GET", "/api/me")).json;
  assert.deepEqual(me.billing, { ready: true, customer: false });

  const r = await c("POST", "/api/billing/checkout", { plan: "duo" });
  assert.equal(r.json.url, "https://checkout.stripe.test/cs_1");
  const p = calls.at(-1).params;
  assert.equal(p.mode, "subscription");
  assert.equal(p["line_items[0][price_data][unit_amount]"], "14900");
  assert.equal(p["line_items[0][price_data][recurring][interval]"], "month");
  assert.equal(p["line_items[0][price_data][currency]"], "usd");
  assert.equal(p["adaptive_pricing[enabled]"], "false", "USD for everyone, no local currency");
  assert.equal(p.customer_email, "pay@duo.test");
  assert.match(p.success_url, /^https:\/\/hopkins\.test\/api\/billing\/return\?session_id=\{CHECKOUT_SESSION_ID\}$/);
  assert.equal((await c("POST", "/api/billing/checkout", { plan: "gold" })).status, 400);

  const back = await c("GET", "/api/billing/return?session_id=cs_1");
  assert.equal(back.status, 302);
  const now = (await c("GET", "/api/me")).json;
  assert.equal(now.plan.name, "Duo");
  assert.equal(now.billing.customer, true);
  assert.equal((await c("POST", "/api/billing/portal", {})).json.url, "https://billing.stripe.test/p_1");

  // Cancelled in the portal: Stripe's webhook ends the plan. A forged one does nothing.
  const ws = me.workspace.id;
  const ended = { type: "customer.subscription.deleted", data: { object: { id: "sub_1", status: "canceled" } } };
  assert.equal((await hook(ended, "t=1,v1=nope")).statusCode, 400);
  assert.equal((await get(`SELECT plan FROM workspaces WHERE id = ?`, [ws])).plan, "paid");
  assert.equal((await hook(ended)).statusCode, 200);
  assert.equal((await get(`SELECT plan FROM workspaces WHERE id = ?`, [ws])).plan, "free");
});

test("the webhook alone starts a plan, for an agent who closed the tab after paying", async () => {
  const c = client(app);
  await c("POST", "/api/signup", { email: "team@five.test", password: "password123", invite: "EARLY1", name: "Lee Team" });
  const ws = (await c("GET", "/api/me")).json.workspace.id;
  const r = await hook({ type: "checkout.session.completed", data: { object: { mode: "subscription", client_reference_id: ws, metadata: { plan: "team" }, customer: "cus_2", subscription: "sub_2" } } });
  assert.equal(r.statusCode, 200);
  assert.equal((await c("GET", "/api/me")).json.plan.name, "Team");
});
