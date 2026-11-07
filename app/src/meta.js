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
// Extra read permissions (Page and Instagram insights) go in META_EXTRA_SCOPES once Meta's App Review
// approves them; asking for unapproved ones would break Connect Meta for everyone else.
export const SCOPES = ["ads_management", "ads_read", "business_management", "pages_show_list", "pages_manage_ads", ...String(process.env.META_EXTRA_SCOPES || "").split(",").map((x) => x.trim()).filter(Boolean)];
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

// What Meta says about a running campaign: what it has spent, and for each ad where it stands and
// its own numbers (spend, people reached, impressions, link clicks), so Hopkins can compare ads on
// real numbers.
export async function campaignState(token, campaignId, metaAdIds) {
  const insights = await graph("GET", `${campaignId}/insights`, { fields: "spend", date_preset: "maximum" }, token);
  const spend = (insights.data || []).reduce((s, r) => s + (Number(r.spend) || 0), 0);
  const ads = [];
  for (const id of metaAdIds) {
    const a = await graph("GET", id, { fields: "effective_status,ad_review_feedback" }, token);
    const why = a.ad_review_feedback?.global ? Object.values(a.ad_review_feedback.global).join(" ") : "";
    let n = {};
    try {
      const r = await graph("GET", `${id}/insights`, { fields: "spend,impressions,reach,clicks", date_preset: "maximum" }, token);
      const row = (r.data || [])[0] || {};
      n = { spend: Math.round((Number(row.spend) || 0) * 100) / 100, impressions: Number(row.impressions) || 0, reach: Number(row.reach) || 0, clicks: Number(row.clicks) || 0 };
    } catch {}
    ads.push({ id, status: a.effective_status || null, why, ...n });
  }
  return { spend: Math.round(spend * 100) / 100, ads };
}

// The agent's whole ad account over the last 30 days, every campaign (not only Hopkins' own), so
// the chat knows how their advertising is going. Read only.
export async function accountInsights(token, adAccountId) {
  const act = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  const r = await graph("GET", `${act}/insights`, { level: "campaign", date_preset: "last_30d", fields: "campaign_name,spend,reach,impressions,clicks,actions", limit: 25 }, token);
  const leadsOf = (actions = []) => actions.filter((a) => /lead/i.test(a.action_type)).reduce((m, a) => Math.max(m, Number(a.value) || 0), 0);
  return (r.data || []).map((x) => ({ name: x.campaign_name, spend: Math.round((Number(x.spend) || 0) * 100) / 100, reach: Number(x.reach) || 0, clicks: Number(x.clicks) || 0, leads: leadsOf(x.actions) }));
}
export function insightsSummary(rows) {
  if (!rows) return null;
  if (!rows.length) return "Their Meta ad account: no spend in the last 30 days.";
  const sum = (k) => rows.reduce((a, r) => a + r[k], 0);
  const spend = sum("spend"), leads = sum("leads");
  return [
    `Their Meta ad account, last 30 days, every campaign (read only): $${spend.toLocaleString("en-US", { maximumFractionDigits: 2 })} spent, ${sum("reach").toLocaleString("en-US")} people reached, ${sum("clicks").toLocaleString("en-US")} clicks, ${leads} leads counted by Meta${leads ? `, $${(spend / leads).toFixed(2)} a lead` : ""}.`,
    ...rows.sort((a, b) => b.spend - a.spend).slice(0, 10).map((r) => `- ${r.name}: $${r.spend}, ${r.reach.toLocaleString("en-US")} reached, ${r.clicks} clicks, ${r.leads} leads${r.leads ? `, $${(r.spend / r.leads).toFixed(2)} a lead` : ""}.`),
  ].join("\n");
}

// Everything the ad account shares with the permissions the agent granted, read only. Each part is
// on its own, so one that's refused (an older login without Instagram access) leaves the rest.
export async function accountOverview(token, adAccountId, pageId = null) {
  const act = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  const part = (p) => p.catch(() => null);
  const leadsOf = (actions = []) => actions.filter((a) => /lead/i.test(a.action_type)).reduce((m, a) => Math.max(m, Number(a.value) || 0), 0);
  const row = (x) => ({ spend: Math.round((Number(x.spend) || 0) * 100) / 100, reach: Number(x.reach) || 0, impressions: Number(x.impressions) || 0, clicks: Number(x.clicks) || 0, ctr: Number(x.ctr) || 0, cpc: Number(x.cpc) || 0, leads: leadsOf(x.actions) });
  const ins = (params) => graph("GET", `${act}/insights`, { fields: "spend,reach,impressions,clicks,ctr,cpc,actions", ...params }, token).then((r) => r.data || []);
  const [account, campaigns, byCampaign, byAd, byPlatform, daily, ig] = await Promise.all([
    part(graph("GET", act, { fields: "name,currency,account_status,amount_spent,spend_cap,timezone_name" }, token)),
    part(graph("GET", `${act}/campaigns`, { fields: "name,effective_status,objective,daily_budget,lifetime_budget,start_time,stop_time", limit: 50 }, token).then((r) => r.data || [])),
    part(ins({ level: "campaign", date_preset: "last_30d", fields: "campaign_name,spend,reach,impressions,clicks,ctr,cpc,actions", limit: 50 })),
    part(ins({ level: "ad", date_preset: "last_30d", fields: "ad_name,campaign_name,spend,reach,impressions,clicks,ctr,cpc,actions", sort: "spend_descending", limit: 10 })),
    part(ins({ date_preset: "last_30d", breakdowns: "publisher_platform" })),
    part(ins({ date_preset: "last_14d", time_increment: 1 })),
    pageId ? part(graph("GET", pageId, { fields: "fan_count,followers_count,instagram_business_account{username,followers_count,media_count,media.limit(12){media_type,timestamp,like_count,comments_count,caption}}" }, token)) : null,
  ]);
  return {
    account: account ? { name: account.name, currency: account.currency, status: account.account_status, spentAllTime: Number(account.amount_spent || 0) / 100 } : null,
    campaigns: campaigns ? campaigns.map((c) => ({ name: c.name, status: c.effective_status, objective: c.objective, budget: Number(c.daily_budget || 0) / 100 || null, lifetime: Number(c.lifetime_budget || 0) / 100 || null })) : null,
    byCampaign: byCampaign ? byCampaign.map((x) => ({ name: x.campaign_name, ...row(x) })) : null,
    byAd: byAd ? byAd.map((x) => ({ name: x.ad_name, campaign: x.campaign_name, ...row(x) })) : null,
    byPlatform: byPlatform ? byPlatform.map((x) => ({ platform: x.publisher_platform, ...row(x) })) : null,
    daily: daily ? daily.map((x) => ({ day: x.date_start, ...row(x) })) : null,
    page: ig ? { fans: Number(ig.fan_count) || Number(ig.followers_count) || null } : null,
    instagram: ig?.instagram_business_account ? { username: ig.instagram_business_account.username, followers: Number(ig.instagram_business_account.followers_count) || 0, posts: Number(ig.instagram_business_account.media_count) || 0, recent: (ig.instagram_business_account.media?.data || []).map((m) => ({ type: m.media_type, at: m.timestamp, likes: Number(m.like_count) || 0, comments: Number(m.comments_count) || 0, caption: String(m.caption || "").slice(0, 60) })) } : null,
  };
}
export function overviewSummaryMeta(o) {
  if (!o) return null;
  const usd = (n) => `$${Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  const sum = (rows, k) => (rows || []).reduce((a, r) => a + r[k], 0);
  const out = [];
  if (o.account) out.push(`Their Meta ad account "${o.account.name}" (${o.account.currency}${o.account.status === 1 ? ", active" : `, status ${o.account.status}`}), ${usd(o.account.spentAllTime)} spent all time.`);
  if (o.campaigns) {
    const live = o.campaigns.filter((c) => c.status === "ACTIVE");
    out.push(`Campaigns: ${o.campaigns.length}, running now: ${live.length}${live.length ? ` (${live.slice(0, 6).map((c) => `${c.name}${c.budget ? ` at ${usd(c.budget)} a day` : c.lifetime ? `, ${usd(c.lifetime)} in all` : ""}`).join("; ")})` : ""}.`);
  }
  if (o.byCampaign) {
    const sp = sum(o.byCampaign, "spend"), ld = sum(o.byCampaign, "leads");
    out.push(o.byCampaign.length ? `Last 30 days, every campaign: ${usd(sp)} spent, ${sum(o.byCampaign, "reach").toLocaleString("en-US")} reached, ${sum(o.byCampaign, "clicks")} clicks, ${ld} leads counted by Meta${ld ? `, ${usd(sp / ld)} a lead` : ""}.` : "Last 30 days: no spend.");
    out.push(...o.byCampaign.sort((a, b) => b.spend - a.spend).slice(0, 8).map((r) => `- ${r.name}: ${usd(r.spend)}, ${r.clicks} clicks (${r.ctr.toFixed(2)}% click rate), ${r.leads} leads${r.leads ? `, ${usd(r.spend / r.leads)} a lead` : ""}.`));
  }
  if (o.byAd?.length) out.push(`Top ads by spend: ${o.byAd.slice(0, 6).map((r) => `${r.name} (${r.campaign}): ${usd(r.spend)}, ${r.ctr.toFixed(2)}% click rate, ${r.leads} leads`).join("; ")}.`);
  if (o.byPlatform?.length) out.push(`By platform: ${o.byPlatform.map((r) => `${r.platform} ${usd(r.spend)}, ${r.clicks} clicks, ${r.leads} leads`).join("; ")}.`);
  if (o.daily?.length) {
    const a = o.daily.slice(-7), b = o.daily.slice(-14, -7);
    out.push(`Last 7 days: ${usd(sum(a, "spend"))}, ${sum(a, "clicks")} clicks, ${sum(a, "leads")} leads; the 7 days before: ${usd(sum(b, "spend"))}, ${sum(b, "clicks")} clicks, ${sum(b, "leads")} leads.`);
  }
  if (o.instagram) {
    const r = o.instagram.recent;
    out.push(`Their Instagram @${o.instagram.username}: ${o.instagram.followers.toLocaleString("en-US")} followers, ${o.instagram.posts} posts.${r.length ? ` Last ${r.length} posts average ${Math.round(sum(r, "likes") / r.length)} likes and ${Math.round(sum(r, "comments") / r.length)} comments; best: "${[...r].sort((x, y) => y.likes - x.likes)[0].caption}" (${[...r].sort((x, y) => y.likes - x.likes)[0].likes} likes).` : ""}`);
  } else if (o.page?.fans) out.push(`Their Facebook Page: ${o.page.fans.toLocaleString("en-US")} followers.`);
  return out.join("\n");
}
