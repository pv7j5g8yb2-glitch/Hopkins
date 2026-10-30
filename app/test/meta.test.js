import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { boot, client } from "./helpers.js";

// Meta with a fake Graph API: the login, picking the ad account and Page, sending approved ads
// (one Housing campaign, an ad set per ad with an equal share of the budget, a 15 mile radius),
// and the spend and review results coming back into the chat.
const app = await boot({ META_APP_ID: "123", META_APP_SECRET: "app-secret", APP_URL: "https://hopkins.test" });
const meta = await import("../src/meta.js");
const { syncMeta } = await import("../src/hopkins.js");
const { all, run, get } = await import("../src/db.js");

const calls = [];
const state = { status: "ACTIVE", feedback: null, loginFails: false };
meta.setMetaFetchForTests(async (url, init = {}) => {
  const u = new URL(url);
  const path = u.pathname.replace(/^\/v[\d.]+\//, "");
  const params = init.body ? Object.fromEntries(new URLSearchParams(init.body)) : Object.fromEntries(u.searchParams);
  calls.push({ method: init.method || "GET", path, params });
  const ok = (body) => ({ ok: true, status: 200, json: async () => body });
  if (path === "oauth/access_token" && state.loginFails) return { ok: false, status: 400, json: async () => ({ error: { message: "Invalid verification code format.", code: 100 } }) };
  if (path === "oauth/access_token") return ok(params.code ? { access_token: "short-token" } : { access_token: "long-token", expires_in: 5184000 });
  if (path === "me") return ok({ id: "fb-1", name: "Sam Ellery" });
  if (path === "me/adaccounts") return ok({ data: [{ id: "act_77", name: "Ellery Ads", account_status: 1, currency: "USD" }] });
  if (path === "me/accounts") return ok({ data: [{ id: "page-9", name: "Ellery Realty" }] });
  if (path.endsWith("/campaigns")) return ok({ id: "camp-1" });
  if (path.endsWith("/adimages")) return ok({ images: { bytes: { hash: "hash-1" } } });
  if (path.endsWith("/adsets")) return ok({ id: `adset-${calls.filter((c) => c.path.endsWith("/adsets")).length}` });
  if (path.endsWith("/adcreatives")) return ok({ id: `cr-${calls.length}` });
  if (path.endsWith("/ads")) return ok({ id: `metaad-${calls.filter((c) => c.path.endsWith("/ads")).length}` });
  if (path.endsWith("/insights")) return ok({ data: [{ spend: "12.34" }] });
  if (path.startsWith("metaad-")) return ok(path === "metaad-2" && state.feedback ? { effective_status: "DISAPPROVED", ad_review_feedback: { global: { "Housing ads": state.feedback } } } : { effective_status: state.status });
  if (path === "me/permissions") return ok({ success: true });
  return { ok: false, status: 400, json: async () => ({ error: { message: `unexpected ${path}` } }) };
});

const PNG = Buffer.concat([Buffer.from("89504e470d0a1a0a", "hex"), Buffer.alloc(64, 1)]).toString("base64");

test("connect Meta, approve, and the ads go to the agent's own ad account in the Housing category", async () => {
  const c = client(app);
  await c("POST", "/api/signup", { email: "meta@ellery.test", password: "password123", invite: "EARLY1", name: "Sam Ellery" });
  const me = (await c("GET", "/api/me")).json;
  await run(`UPDATE workspaces SET plan = 'paid' WHERE id = ?`, [me.workspace.id]);
  assert.deepEqual(me.meta, { available: true, connected: false });

  // The login goes to Facebook with the permissions and a signed state.
  const go = await app.inject({ method: "GET", url: "/api/meta/connect", headers: { cookie: await cookieOf(c) } });
  assert.equal(go.statusCode, 302);
  const dialog = new URL(go.headers.location);
  assert.equal(dialog.hostname, "www.facebook.com");
  assert.equal(dialog.searchParams.get("redirect_uri"), "https://hopkins.test/api/meta/callback");
  assert.match(dialog.searchParams.get("scope"), /ads_management/);
  // A made up state is refused; the real one connects, and the one ad account and Page are picked.
  assert.equal((await c("GET", "/api/meta/callback?code=abc&state=nope")).status, 400);
  // A login Meta won't finish comes back to Settings with a notice; cancelling comes back quietly.
  const signed = encodeURIComponent(dialog.searchParams.get("state"));
  state.loginFails = true;
  const failed = await app.inject({ method: "GET", url: `/api/meta/callback?code=abc&state=${signed}`, headers: { cookie: await cookieOf(c) } });
  assert.equal(failed.headers.location, "/#/settings/meta-failed");
  state.loginFails = false;
  const cancelled = await app.inject({ method: "GET", url: "/api/meta/callback?error=access_denied&error_reason=user_denied", headers: { cookie: await cookieOf(c) } });
  assert.equal(cancelled.headers.location, "/#/settings");
  const back = await app.inject({ method: "GET", url: `/api/meta/callback?code=abc&state=${encodeURIComponent(dialog.searchParams.get("state"))}`, headers: { cookie: await cookieOf(c) } });
  assert.equal(back.statusCode, 302);
  assert.equal(back.headers.location, "/#/settings");
  const stored = await get(`SELECT * FROM meta_connections WHERE workspace_id = ?`, [me.workspace.id]);
  assert.notEqual(stored.token, "long-token", "the token is kept encrypted");
  assert.equal(meta.unseal(stored.token), "long-token");
  const now = (await c("GET", "/api/me")).json.meta;
  assert.equal(now.ready, true);
  assert.equal(now.adAccountName, "Ellery Ads");
  assert.equal(now.pageName, "Ellery Realty");

  // Approving with Meta ready: the app's drawn images first, then the plan.
  const l = await c("POST", "/api/listings", { text: "12 Elm St, Austin, TX. 3 bed 2 bath, $585,000, big back yard" });
  const id = l.json.listing.id;
  const plan = await c("POST", `/api/listings/${id}/run`, { versions: [1, 2, 3], budget: 200, days: 10 });
  for (const ad of plan.json.ads) assert.equal((await c("POST", `/api/ads/${ad.id}/render`, { format: "feed", data: PNG })).status, 200);
  assert.equal((await c("POST", `/api/ads/${plan.json.ads[0].id}/render`, { format: "feed", data: Buffer.from("not an image").toString("base64") })).status, 400);
  const yes = await c("POST", `/api/listings/${id}/run`, { confirm: plan.json.messages.at(-1).id });
  assert.match(yes.json.messages.at(-1).body, /Sending them to Meta now/);
  const sent = await waitFor(c, id, /Sent to Meta/);
  assert.match(sent, /3 ads for Facebook and Instagram/);

  const campaign = calls.find((x) => x.path === "act_77/campaigns");
  assert.deepEqual(JSON.parse(campaign.params.special_ad_categories), ["HOUSING"]);
  assert.deepEqual(JSON.parse(campaign.params.special_ad_category_country), ["US"]);
  const adsets = calls.filter((x) => x.path === "act_77/adsets");
  assert.equal(adsets.length, 3, "one ad set per ad, so the test is fair");
  for (const s of adsets) {
    assert.equal(s.params.lifetime_budget, "6666");
    const where = JSON.parse(s.params.targeting).geo_locations.custom_locations[0];
    assert.equal(where.radius, 15);
    assert.match(where.address_string, /12 Elm St/);
    assert.ok(!("genders" in JSON.parse(s.params.targeting)));
  }
  const creative = JSON.parse(calls.find((x) => x.path === "act_77/adcreatives").params.object_story_spec);
  assert.equal(creative.page_id, "page-9");
  assert.match(creative.link_data.link, new RegExp(`^https://hopkins.test/l/${l.json.listing.slug}\\?v=.+&src=meta$`));
  assert.equal(calls.filter((x) => x.path === "act_77/ads").every((x) => x.params.status === "ACTIVE"), true);

  // The check that runs every 30 minutes: spend on the listing, and the chat hears it's live, once.
  await syncMeta();
  assert.equal((await get(`SELECT spend FROM listings WHERE id = ?`, [id])).spend, 12.34);
  assert.match(await waitFor(c, id, /live on Facebook and Instagram/), /Ads 1, 2 and 3 are live/);
  await syncMeta();
  const live = (await c("GET", `/api/listings/${id}`)).json.messages.filter((m) => /are live/.test(m.body));
  assert.equal(live.length, 1, "said once");
  // A rejection is said once too, with Meta's reason.
  state.feedback = "This ad mentions who the home suits.";
  await syncMeta();
  assert.match(await waitFor(c, id, /Meta rejected/), /Meta rejected Ad 2: This ad mentions who the home suits\./);
});

test("approving without the drawn images says so in the chat, and Meta's data deletion callback removes the connection", async () => {
  const c = client(app);
  await c("POST", "/api/signup", { email: "meta2@ellery.test", password: "password123", invite: "EARLY1", name: "Ana Ruiz" });
  const ws = (await c("GET", "/api/me")).json.workspace.id;
  await run(`UPDATE workspaces SET plan = 'paid' WHERE id = ?`, [ws]);
  await run(`INSERT INTO meta_connections (workspace_id, fb_user_id, fb_name, token, ad_account_id, page_id, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)`,
    [ws, "fb-2", "Ana Ruiz", meta.seal("token-2"), "act_8", "page-8", new Date().toISOString(), new Date().toISOString()]);
  const l = await c("POST", "/api/listings", { text: "5 Oak Ave, Austin, TX. 2 bed 1 bath, $410,000" });
  const plan = await c("POST", `/api/listings/${l.json.listing.id}/run`, { versions: [1, 2, 3], budget: 200, days: 10 });
  await c("POST", `/api/listings/${l.json.listing.id}/run`, { confirm: plan.json.messages.at(-1).id });
  assert.match(await waitFor(c, l.json.listing.id, /Meta didn't take/), /had no image to send/);
  assert.equal((await all(`SELECT * FROM launches WHERE listing_id = ?`, [l.json.listing.id]))[0].status, "failed");

  const payload = Buffer.from(JSON.stringify({ user_id: "fb-2", algorithm: "HMAC-SHA256" })).toString("base64url");
  const sig = createHmac("sha256", "app-secret").update(payload).digest("base64url");
  const del = await app.inject({ method: "POST", url: "/api/meta/deletion", headers: { "content-type": "application/x-www-form-urlencoded" }, payload: `signed_request=${sig}.${payload}` });
  assert.equal(del.statusCode, 200);
  assert.ok(del.json().confirmation_code);
  assert.ok(!(await get(`SELECT 1 FROM meta_connections WHERE workspace_id = ?`, [ws])));
  const forged = await app.inject({ method: "POST", url: "/api/meta/deletion", headers: { "content-type": "application/x-www-form-urlencoded" }, payload: `signed_request=bad.${payload}` });
  assert.equal(forged.statusCode, 400);
});

async function waitFor(c, id, re) {
  for (let i = 0; i < 60; i++) {
    const m = (await c("GET", `/api/listings/${id}`)).json.messages.map((x) => x.body).find((b) => re.test(b));
    if (m) return m;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error(`no message matching ${re}`);
}

// The test client's session cookie, for requests that need to read a redirect.
async function cookieOf(c) {
  return c.cookie || (c.cookie = await (async () => {
    const r = await app.inject({ method: "POST", url: "/api/login", payload: { email: (await c("GET", "/api/me")).json.user.email, password: "password123" }, remoteAddress: "10.8.8.8" });
    return [].concat(r.headers["set-cookie"]).map((x) => x.split(";")[0]).join("; ");
  })());
}
