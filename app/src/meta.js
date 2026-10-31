// Meta: Facebook and Instagram ads through the Marketing API (2026-10-29). One connection covers
// both: an agent logs in with Facebook, picks their ad account and their Facebook Page, and
// Hopkins runs the ads they approve there. Meta places each ad on Facebook and Instagram itself.
//
// What Meta needs before strangers can use this (docs/META.md): an app with Facebook Login for
// Business and the Marketing API, App Review for advanced access to the permissions below, and
// Business Verification. Until then it works for people with a role on the app (admins,
// developers, testers), which is how pilots use it.
//
// Housing is a special ad category: the campaign says so, the audience is a radius of at least 15
// miles around the property, with no age, gender or ZIP targeting.

import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const VERSION = () => process.env.META_GRAPH_VERSION || "v24.0";
const GRAPH = () => `https://graph.facebook.com/${VERSION()}`;
export const SCOPES = ["ads_management", "ads_read", "business_management", "pages_show_list", "pages_manage_ads"];
export const metaReady = () => Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET);

let fetchImpl = (...a) => fetch(...a);
export function setMetaFetchForTests(fake) {
  fetchImpl = fake;
}

export class MetaError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

// ---------- the token, kept encrypted ----------

const key = () => createHash("sha256").update(`meta-token:${process.env.COOKIE_SECRET || ""}`).digest();
export function seal(text) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([c.update(String(text), "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), body]).toString("base64");
}
export function unseal(sealed) {
  const buf = Buffer.from(String(sealed || ""), "base64");
  const d = createDecipheriv("aes-256-gcm", key(), buf.subarray(0, 12));
  d.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString("utf8");
}

// The login's state: which workspace started it, signed, so a callback can't be replayed into
// another account.
const sign = (s) => createHmac("sha256", `meta-state:${process.env.COOKIE_SECRET || ""}`).update(s).digest("base64url");
export function stateFor(workspaceId) {
  const raw = `${workspaceId}.${Date.now()}`;
  return `${raw}.${sign(raw)}`;
}
export function checkState(state, workspaceId) {
  const [ws, at, sig] = String(state || "").split(".");
  if (!ws || !at || !sig || ws !== workspaceId || Date.now() - Number(at) > 30 * 60 * 1000) return false;
  const want = Buffer.from(sign(`${ws}.${at}`));
  const got = Buffer.from(sig);
  return want.length === got.length && timingSafeEqual(want, got);
}

// ---------- talking to the Graph API ----------

async function graph(method, path, params = {}, token) {
  const url = new URL(`${GRAPH()}/${path.replace(/^\//, "")}`);
  const form = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...params, ...(token ? { access_token: token } : {}) })) {
    if (v === undefined || v === null) continue;
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    if (method === "GET") url.searchParams.set(k, s);
    else form.set(k, s);
  }
  const res = await fetchImpl(url.toString(), {
    method,
    ...(method === "GET" ? {} : { headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form.toString() }),
    signal: AbortSignal.timeout(60000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const e = data.error || {};
    throw new MetaError(e.error_user_msg || e.message || `Meta answered ${res.status}`, e.code || res.status);
  }
  return data;
}

// ---------- logging in ----------

export function loginUrl(workspaceId, redirectUri) {
  const u = new URL(`https://www.facebook.com/${VERSION()}/dialog/oauth`);
  u.searchParams.set("client_id", process.env.META_APP_ID);
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("state", stateFor(workspaceId));
  // Facebook Login for Business names its permissions in a configuration made in the app's
  // dashboard (META_CONFIG_ID); classic Facebook Login lists them here.
  if (process.env.META_CONFIG_ID) u.searchParams.set("config_id", process.env.META_CONFIG_ID);
  else u.searchParams.set("scope", SCOPES.join(","));
  u.searchParams.set("response_type", "code");
  return u.toString();
}

// The code from the login, swapped for a long lived token (about 60 days), and who it belongs to.
export async function finishLogin(code, redirectUri) {
  const short = await graph("GET", "oauth/access_token", { client_id: process.env.META_APP_ID, client_secret: process.env.META_APP_SECRET, redirect_uri: redirectUri, code });
  const long = await graph("GET", "oauth/access_token", { grant_type: "fb_exchange_token", client_id: process.env.META_APP_ID, client_secret: process.env.META_APP_SECRET, fb_exchange_token: short.access_token });
  const me = await graph("GET", "me", { fields: "id,name" }, long.access_token);
  const expiresAt = long.expires_in ? new Date(Date.now() + Number(long.expires_in) * 1000).toISOString() : null;
  return { token: long.access_token, expiresAt, userId: me.id, name: me.name };
}

// The ad accounts and Pages the person can use.
export async function assets(token) {
  const [accounts, pages] = await Promise.all([
    graph("GET", "me/adaccounts", { fields: "id,name,account_status,currency", limit: 100 }, token),
    graph("GET", "me/accounts", { fields: "id,name", limit: 100 }, token),
  ]);
  return {
    adAccounts: (accounts.data || []).map((a) => ({ id: a.id, name: a.name || a.id, currency: a.currency || null, active: Number(a.account_status) === 1 })),
    pages: (pages.data || []).map((p) => ({ id: p.id, name: p.name || p.id })),
  };
}

export async function revoke(token) {
  try { await graph("DELETE", "me/permissions", {}, token); } catch {}
}

// Meta's data deletion callback: its signed request, checked with the app secret.
export function readSignedRequest(signed) {
  const [sig, payload] = String(signed || "").split(".");
  if (!sig || !payload || !process.env.META_APP_SECRET) return null;
  const want = createHmac("sha256", process.env.META_APP_SECRET).update(payload).digest("base64url");
  const a = Buffer.from(want), b = Buffer.from(sig.replace(/=+$/, ""));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try { return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")); } catch { return null; }
}

// ---------- running ads ----------

// One campaign in the Housing category, then for each ad its own ad set with an equal share of
// the budget (so the test is fair), its image, its creative and the ad. Everything is created
// active: the agent has approved it, and Meta reviews each ad before it shows.
export async function launch({ token, adAccountId, pageId, country = "US", name, ads, budget, days, radiusMiles = 15, place }) {
  const act = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  const start = new Date(Date.now() + 5 * 60 * 1000);
  const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
  const campaign = await graph("POST", `${act}/campaigns`, {
    name: `Hopkins · ${name}`,
    objective: "OUTCOME_TRAFFIC",
    status: "ACTIVE",
    special_ad_categories: ["HOUSING"],
    special_ad_category_country: [country],
    is_adset_budget_sharing_enabled: false,
  }, token);
  const each = Math.max(100, Math.floor((budget * 100) / ads.length));
  const out = [];
  for (const ad of ads) {
    const image = await graph("POST", `${act}/adimages`, { bytes: ad.image.toString("base64") }, token);
    const hash = Object.values(image.images || {})[0]?.hash;
    if (!hash) throw new MetaError("Meta didn't take the ad image.");
    const adset = await graph("POST", `${act}/adsets`, {
      name: `${name} · Ad ${ad.version}`,
      campaign_id: campaign.id,
      lifetime_budget: each,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      billing_event: "IMPRESSIONS",
      optimization_goal: "LINK_CLICKS",
      bid_strategy: "LOWEST_COST_WITHOUT_CAP",
      targeting: { geo_locations: { custom_locations: [{ address_string: place, radius: Math.max(15, radiusMiles), distance_unit: "mile" }] }, age_min: 18, age_max: 65 },
      status: "ACTIVE",
    }, token);
    const creative = await graph("POST", `${act}/adcreatives`, {
      name: `${name} · Ad ${ad.version}`,
      object_story_spec: {
        page_id: pageId,
        link_data: { image_hash: hash, link: ad.link, message: ad.text, name: ad.headline, call_to_action: { type: "LEARN_MORE", value: { link: ad.link } } },
      },
    }, token);
    const made = await graph("POST", `${act}/ads`, { name: `${name} · Ad ${ad.version}`, adset_id: adset.id, creative: { creative_id: creative.id }, status: "ACTIVE" }, token);
    out.push({ adId: ad.id, version: ad.version, metaAdId: made.id, adsetId: adset.id, creativeId: creative.id, imageHash: hash });
  }
  return { campaignId: campaign.id, ads: out };
}

// Pausing (PAUSED) or restarting (ACTIVE) a whole campaign: every ad set and ad under it follows.
export async function setCampaignStatus(token, campaignId, status) {
  return graph("POST", campaignId, { status }, token);
}

// A running ad set's end, and changing its budget or end (in cents and ISO time, as Meta takes them).
export async function adSetEnd(token, adsetId) {
  const a = await graph("GET", adsetId, { fields: "end_time" }, token);
  return a.end_time ? new Date(a.end_time) : null;
}
export async function updateAdSet(token, adsetId, fields) {
  return graph("POST", adsetId, fields, token);
}

// What Meta says about a running campaign: what it has spent, and where each ad stands.
export async function campaignState(token, campaignId, metaAdIds) {
  const insights = await graph("GET", `${campaignId}/insights`, { fields: "spend", date_preset: "maximum" }, token);
  const spend = (insights.data || []).reduce((s, r) => s + (Number(r.spend) || 0), 0);
  const ads = [];
  for (const id of metaAdIds) {
    const a = await graph("GET", id, { fields: "effective_status,ad_review_feedback" }, token);
    const why = a.ad_review_feedback?.global ? Object.values(a.ad_review_feedback.global).join(" ") : "";
    ads.push({ id, status: a.effective_status || null, why });
  }
  return { spend: Math.round(spend * 100) / 100, ads };
}
