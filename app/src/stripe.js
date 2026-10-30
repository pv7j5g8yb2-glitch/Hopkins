// Stripe: self-serve plans (Ismael, 2026-10-30). Choosing a plan opens Stripe Checkout for a
// monthly subscription; Stripe tells Hopkins when it starts, changes or ends (the webhook), and
// the customer portal is where they cancel or change their card. Over 20 agents is by quote and
// never comes through here. Setup: docs/STRIPE.md.

import { createHmac, timingSafeEqual } from "node:crypto";

const API = "https://api.stripe.com/v1";
export const stripeReady = () => Boolean(process.env.STRIPE_SECRET_KEY);

let fetchImpl = (...a) => fetch(...a);
export function setStripeFetchForTests(fake) {
  fetchImpl = fake;
}

// Stripe takes form fields, with nested objects and lists as key[sub][0] names.
function form(obj, prefix = "", out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === "object") form(v, key, out);
    else out.append(key, String(v));
  }
  return out;
}

async function stripe(method, path, params) {
  const res = await fetchImpl(`${API}/${path}`, {
    method,
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, ...(params ? { "Content-Type": "application/x-www-form-urlencoded" } : {}) },
    ...(params ? { body: form(params).toString() } : {}),
    signal: AbortSignal.timeout(30000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || `Stripe answered ${res.status}`);
  return data;
}

// A Checkout page for one plan, billed monthly. The waitlist's 30% off is a promotion code.
export function checkout({ plan, workspaceId, email, customer, successUrl, cancelUrl }) {
  return stripe("POST", "checkout/sessions", {
    mode: "subscription",
    client_reference_id: workspaceId,
    ...(customer ? { customer } : { customer_email: email }),
    line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: plan.price * 100, recurring: { interval: "month" }, product_data: { name: `Hopkins ${plan.name}` } } }],
    allow_promotion_codes: true,
    metadata: { workspace: workspaceId, plan: plan.id },
    subscription_data: { metadata: { workspace: workspaceId, plan: plan.id } },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
}

export const getSession = (id) => stripe("GET", `checkout/sessions/${encodeURIComponent(id)}`);

// Stripe's own page for cancelling, invoices and the card.
export const portal = ({ customer, returnUrl }) => stripe("POST", "billing_portal/sessions", { customer, return_url: returnUrl });

// An event from Stripe's webhook, checked against its signature (and no older than 5 minutes).
export function readEvent(raw, header, secret = process.env.STRIPE_WEBHOOK_SECRET) {
  if (!secret || !raw || !header) return null;
  const parts = Object.fromEntries(String(header).split(",").map((p) => p.split("=")).filter((p) => p.length === 2 && p[0] !== "v1"));
  const sigs = String(header).split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > 300) return null;
  const want = Buffer.from(createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex"));
  if (!sigs.some((s) => { const got = Buffer.from(s); return got.length === want.length && timingSafeEqual(got, want); })) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
