// The agent's CRM (Ismael, 2026-10-31): each new Lead goes straight into it as it comes in.
// Follow Up Boss, the CRM most real estate teams use, takes it through its Events API with the
// agent's own API key (no app review: the key is theirs). Any other CRM (kvCORE, Lofty, HubSpot,
// a Google Sheet) takes it through a webhook URL, from Zapier, Make or the CRM itself.
// Setup in Settings, CRM. The key is kept encrypted, like the Meta token.

import { seal, unseal } from "./meta.js";

const FUB = "https://api.followupboss.com/v1";
// Follow Up Boss asks every integration to name itself; a registered system also sends its key
// (free to register, https://apps.followupboss.com/system-registration).
const fubHeaders = (key) => ({
  Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`,
  "Content-Type": "application/json",
  "X-System": "Hopkins",
  ...(process.env.FUB_SYSTEM_KEY ? { "X-System-Key": process.env.FUB_SYSTEM_KEY } : {}),
});

let fetchImpl = (...a) => fetch(...a);
export function setCrmFetchForTests(fake) {
  fetchImpl = fake;
}

export const readCrm = (ws) => {
  try { return ws?.crm ? JSON.parse(ws.crm) : {}; } catch { return {}; }
};

// What the app shows: never the key, only whether each one is on and how the last send went.
export function crmPublic(ws) {
  const c = readCrm(ws);
  let host = null;
  try { host = c.hook ? new URL(c.hook).host : null; } catch {}
  return { fub: Boolean(c.fub), fubName: c.fubName || null, hook: host, last: c.last || null };
}

// A webhook only to a public https address, never the server's own network.
export function hookOk(url) {
  let u;
  try { u = new URL(String(url || "").trim()); } catch { return false; }
  if (u.protocol !== "https:" || u.username || u.password) return false;
  return !/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.|\[|.*\.local$|.*\.internal$)/i.test(u.hostname);
}

// Checks a Follow Up Boss key by asking who it belongs to. Returns the account's name, or null.
export async function checkFubKey(key) {
  try {
    const res = await fetchImpl(`${FUB}/identity`, { headers: fubHeaders(key), signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const me = await res.json().catch(() => ({}));
    return me.account?.name || me.user?.name || me.name || "Follow Up Boss";
  } catch {
    return null;
  }
}

export const sealKey = (key) => seal(key);

const splitName = (name = "") => {
  const parts = String(name).trim().split(/\s+/);
  return { firstName: parts[0] || "", lastName: parts.slice(1).join(" ") };
};

const WANTS = { showing: "Wants a showing", offer: "Wants to talk about an offer", apply: "Wants to apply", info: "Has a question" };

// The Lead as Follow Up Boss takes it: a person, what they asked, and the property.
export function fubEvent({ lead, listing, ad, pageUrl }) {
  const rent = listing.deal === "rent";
  return {
    source: "Hopkins",
    system: "Hopkins",
    type: listing.moment === "sold" ? "Seller Inquiry" : "Property Inquiry",
    message: [WANTS[lead.wants] || WANTS.info, lead.note].filter(Boolean).join(". "),
    description: ad ? `From Ad ${ad.version}${ad.name ? `, ${ad.name}` : ""}, on Facebook and Instagram.` : "From the listing page.",
    person: {
      ...splitName(lead.name),
      ...(lead.email ? { emails: [{ value: lead.email }] } : {}),
      ...(lead.phone ? { phones: [{ value: lead.phone }] } : {}),
      tags: ["Hopkins"],
    },
    property: {
      ...(listing.address ? { street: listing.address } : {}),
      ...(listing.city ? { city: listing.city } : {}),
      ...(listing.price ? { price: Number(listing.price) } : {}),
      forRent: rent,
      ...(pageUrl ? { url: pageUrl } : {}),
      ...(listing.home_type ? { type: listing.home_type } : {}),
      ...(listing.beds ? { bedrooms: Number(listing.beds) } : {}),
      ...(listing.baths ? { bathrooms: Number(listing.baths) } : {}),
      ...(listing.sqft ? { area: Number(listing.sqft) } : {}),
    },
  };
}

// The Lead as a webhook gets it: one plain JSON shape any CRM, Zapier or Make can map.
export function hookBody({ lead, listing, ad, pageUrl }) {
  return {
    event: "lead.created",
    lead: {
      id: lead.id, name: lead.name, ...splitName(lead.name), email: lead.email || null, phone: lead.phone || null,
      wants: lead.wants, message: lead.note || null, created_at: lead.created_at,
      ad: ad ? { number: ad.version, name: ad.name || null } : null,
    },
    listing: {
      id: listing.id, address: listing.address || null, area: listing.area || null, city: listing.city || null,
      price: listing.price ? Number(listing.price) : null, currency: listing.currency || "USD", deal: listing.deal || "sale",
      beds: listing.beds || null, baths: listing.baths || null, sqft: listing.sqft || null, url: pageUrl || null,
    },
  };
}

async function post(url, headers, body) {
  const res = await fetchImpl(url, { method: "POST", headers, body: JSON.stringify(body), signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`answered ${res.status}`);
}

// Sends one Lead everywhere the agent set up. Returns what happened, for Settings to show.
export async function sendLead(ws, { lead, listing, ad, pageUrl }) {
  const c = readCrm(ws);
  if (!c.fub && !c.hook) return null;
  const failed = [];
  await Promise.all([
    c.fub && post(`${FUB}/events`, fubHeaders(unseal(c.fub)), fubEvent({ lead, listing, ad, pageUrl })).catch((err) => { failed.push("Follow Up Boss"); console.error("Sending a Lead to Follow Up Boss failed:", err.message); }),
    c.hook && post(c.hook, { "Content-Type": "application/json", "User-Agent": "Hopkins" }, hookBody({ lead, listing, ad, pageUrl })).catch((err) => { failed.push("webhook"); console.error("Sending a Lead to the webhook failed:", err.message); }),
  ]);
  return { ok: !failed.length, failed, at: new Date().toISOString() };
}

// A test for the webhook, so the agent can map the fields in Zapier or Make before a real Lead.
export async function testHook(url) {
  const lead = { id: "test", name: "Test Lead", email: "test@example.com", phone: "+1 555 0100", wants: "showing", note: "This is a test from Hopkins.", created_at: new Date().toISOString() };
  const listing = { id: "test", address: "12 Elm St", city: "Austin", price: 585000, currency: "USD", deal: "sale", beds: 3, baths: 2, sqft: 1840 };
  await post(url, { "Content-Type": "application/json", "User-Agent": "Hopkins" }, hookBody({ lead, listing, ad: { version: 1, name: "The porch" }, pageUrl: null }));
}
