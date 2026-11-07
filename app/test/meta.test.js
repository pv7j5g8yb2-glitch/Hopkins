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
  if (path.startsWith("camp-") && path.endsWith("/insights") && state.tokenDead) return { ok: false, status: 400, json: async () => ({ error: { message: "Error validating access token: The user has changed their password.", code: 190 } }) };
  if (path.endsWith("/insights")) return ok({ data: [{ spend: "12.34" }] });
  if (path.startsWith("metaad-")) return ok(path === "metaad-2" && state.feedback ? { effective_status: "DISAPPROVED", ad_review_feedback: { global: { "Housing ads": state.feedback } } } : { effective_status: state.status });
  if (path === "me/permissions") return ok({ success: true });
  if (path.startsWith("adset-") && (init.method || "GET") === "GET") return ok({ end_time: "2026-11-10T12:00:00+0000" });
  if (path.startsWith("adset-") && init.method === "POST") return state.adsetFails === path ? { ok: false, status: 400, json: async () => ({ error: { message: "The budget is too low for what has already been spent", code: 100 } }) } : ok({ success: true });
  if (path.startsWith("camp-") && (init.method || "GET") === "POST") return state.pauseFails ? { ok: false, status: 400, json: async () => ({ error: { message: "Campaign is locked", code: 100 } }) } : ok({ success: true });
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

test("pausing reaches Meta's campaign before Hopkins says paused, resuming turns it back on, and deleting a listing stops its ads first", async () => {
  const c = client(app);
  await c("POST", "/api/signup", { email: "pause@ellery.test", password: "password123", invite: "EARLY1", name: "Pat Lee" });
  const ws = (await c("GET", "/api/me")).json.workspace.id;
  await run(`UPDATE workspaces SET plan = 'paid' WHERE id = ?`, [ws]);
  await run(`INSERT INTO meta_connections (workspace_id, fb_user_id, fb_name, token, ad_account_id, page_id, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)`,
    [ws, "fb-3", "Pat Lee", meta.seal("token-3"), "act_9", "page-9", new Date().toISOString(), new Date().toISOString()]);
  const l = await c("POST", "/api/listings", { text: "7 Pine Rd, Austin, TX. 4 bed 3 bath, $720,000" });
  const id = l.json.listing.id;
  const plan = await c("POST", `/api/listings/${id}/run`, { versions: [1, 2, 3], budget: 200, days: 10 });
  for (const ad of plan.json.ads) await c("POST", `/api/ads/${ad.id}/render`, { format: "feed", data: PNG });
  await c("POST", `/api/listings/${id}/run`, { confirm: plan.json.messages.at(-1).id });
  await waitFor(c, id, /Sent to Meta/);
  const camp = (await get(`SELECT meta_campaign_id FROM launches WHERE listing_id = ?`, [id])).meta_campaign_id;

  // Meta refuses: nothing is said to be paused, and the ads still count as running.
  state.pauseFails = true;
  let r = await c("POST", `/api/listings/${id}/pause`, {});
  assert.equal(r.json.listing.run, "running");
  assert.match(r.json.messages.at(-1).body, /^Nothing changed: Campaign is locked\.$/);
  // Deleting the listing is refused too, so its campaign can't keep spending out of sight.
  assert.equal((await c("DELETE", `/api/listings/${id}`)).status, 409);
  state.pauseFails = false;

  r = await c("POST", `/api/listings/${id}/pause`, {});
  assert.equal(r.json.listing.run, "paused");
  assert.match(r.json.messages.at(-1).body, /no longer running on Facebook and Instagram/);
  assert.equal(calls.filter((x) => x.path === camp && x.method === "POST").at(-1).params.status, "PAUSED");
  r = await c("POST", `/api/listings/${id}/resume`, {});
  assert.equal(r.json.listing.run, "running");
  assert.equal(calls.filter((x) => x.path === camp && x.method === "POST").at(-1).params.status, "ACTIVE");

  assert.equal((await c("DELETE", `/api/listings/${id}`)).status, 200);
  assert.equal(calls.filter((x) => x.path === camp && x.method === "POST").at(-1).params.status, "PAUSED", "paused on Meta before it was deleted");
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

test("spend more, spend less or run longer changes the ads already on Meta, all or nothing, never a new plan", async () => {
  const c = client(app);
  await c("POST", "/api/signup", { email: "budget@ellery.test", password: "password123", invite: "EARLY1", name: "Bo Reyes" });
  const ws = (await c("GET", "/api/me")).json.workspace.id;
  await run(`UPDATE workspaces SET plan = 'paid' WHERE id = ?`, [ws]);
  await run(`INSERT INTO meta_connections (workspace_id, fb_user_id, fb_name, token, ad_account_id, page_id, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)`,
    [ws, "fb-4", "Bo Reyes", meta.seal("token-4"), "act_9", "page-9", new Date().toISOString(), new Date().toISOString()]);
  const l = await c("POST", "/api/listings", { text: "9 Birch Ln, Austin, TX. 3 bed 2 bath, $540,000" });
  const id = l.json.listing.id;
  const plan = await c("POST", `/api/listings/${id}/run`, { versions: [1, 2, 3], budget: 200, days: 10 });
  for (const ad of plan.json.ads) await c("POST", `/api/ads/${ad.id}/render`, { format: "feed", data: PNG });
  await c("POST", `/api/listings/${id}/run`, { confirm: plan.json.messages.at(-1).id });
  await waitFor(c, id, /Sent to Meta/);
  const sets = (await all(`SELECT adset_id FROM meta_ads WHERE listing_id = ?`, [id])).map((r) => r.adset_id);
  const say = async (text) => (await c("POST", `/api/listings/${id}/messages`, { text })).json.messages.at(-1);
  const posts = () => calls.filter((x) => sets.includes(x.path) && x.method === "POST");

  calls.length = 0;
  let m = await say("Spend $500 instead");
  assert.equal(m.kind, "text", "no new plan");
  assert.match(m.body, /^Done\. The ads for 9 Birch Ln now have \$500 over 10 days on Facebook and Instagram, \$50 a day, split evenly across the 3 ads\.$/);
  assert.deepEqual(posts().map((x) => x.params.lifetime_budget), ["16666", "16666", "16666"]);
  assert.deepEqual([(await get(`SELECT budget FROM launches WHERE listing_id = ?`, [id])).budget], [500]);

  calls.length = 0;
  m = await say("run them another week");
  assert.match(m.body, /\$850 over 17 days on Facebook and Instagram, \$50 a day/, "the same spend a day, for longer");
  assert.ok(posts().every((x) => x.params.end_time === "2026-11-17T12:00:00.000Z"), "each ad set ends 7 days later");

  // Meta refuses the second ad set: the first goes back, and the reply says nothing changed.
  state.adsetFails = sets[1];
  calls.length = 0;
  m = await say("lower the budget to $100");
  assert.equal(m.body, "Nothing changed: The budget is too low for what has already been spent.");
  assert.deepEqual(posts().map((x) => [x.path, x.params.lifetime_budget]), [[sets[0], "3333"], [sets[1], "3333"], [sets[0], "28333"]]);
  assert.equal((await get(`SELECT budget FROM launches WHERE listing_id = ?`, [id])).budget, 850);
  state.adsetFails = null;

  // Paused ads keep their pause.
  await c("POST", `/api/listings/${id}/pause`, {});
  m = await say("double the budget");
  assert.match(m.body, /\$1,700 over 17 days.*They're still paused\. Say resume to start them again\.$/);
});

test("Meta dropping the login in the background is said once in the chat, and Settings asks to reconnect", async () => {
  const c = client(app);
  await c("POST", "/api/signup", { email: "gone@ellery.test", password: "password123", invite: "EARLY1", name: "Cy Moore" });
  const ws = (await c("GET", "/api/me")).json.workspace.id;
  await run(`UPDATE workspaces SET plan = 'paid' WHERE id = ?`, [ws]);
  await run(`INSERT INTO meta_connections (workspace_id, fb_user_id, fb_name, token, ad_account_id, page_id, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)`,
    [ws, "fb-5", "Cy Moore", meta.seal("token-5"), "act_9", "page-9", new Date().toISOString(), new Date().toISOString()]);
  const l = await c("POST", "/api/listings", { text: "3 Elm Ct, Austin, TX. 2 bed 2 bath, $455,000" });
  const id = l.json.listing.id;
  const plan = await c("POST", `/api/listings/${id}/run`, { versions: [1, 2, 3], budget: 200, days: 10 });
  for (const ad of plan.json.ads) await c("POST", `/api/ads/${ad.id}/render`, { format: "feed", data: PNG });
  await c("POST", `/api/listings/${id}/run`, { confirm: plan.json.messages.at(-1).id });
  await waitFor(c, id, /Sent to Meta/);

  state.tokenDead = true;
  await syncMeta();
  await syncMeta();
  const said = (await c("GET", `/api/listings/${id}`)).json.messages.filter((m) => /^Meta disconnected/.test(m.body));
  assert.equal(said.length, 1, "said once");
  assert.equal(said[0].body, "Meta disconnected, so I can't see or change the ads for 3 Elm Ct. They're still running on Meta. Reconnect Meta in Settings.");
  assert.equal((await c("GET", "/api/me")).json.meta.expired, true);
  state.tokenDead = false;
});


test("Needs attention on Meta: no Leads after real spend, moving budget to the ad that works, and a working run about to end", async () => {
  const c = client(app);
  await c("POST", "/api/signup", { email: "attn@ellery.test", password: "password123", invite: "EARLY1", name: "Ivy Shaw" });
  const ws = (await c("GET", "/api/me")).json.workspace.id;
  await run(`UPDATE workspaces SET plan = 'paid' WHERE id = ?`, [ws]);
  await run(`INSERT INTO meta_connections (workspace_id, fb_user_id, fb_name, token, ad_account_id, page_id, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)`,
    [ws, "fb-6", "Ivy Shaw", meta.seal("token-6"), "act_9", "page-9", new Date().toISOString(), new Date().toISOString()]);
  const launchOn = async (text) => {
    const l = await c("POST", "/api/listings", { text });
    const id = l.json.listing.id;
    const plan = await c("POST", `/api/listings/${id}/run`, { versions: [1, 2, 3], budget: 200, days: 10 });
    for (const ad of plan.json.ads) await c("POST", `/api/ads/${ad.id}/render`, { format: "feed", data: PNG });
    await c("POST", `/api/listings/${id}/run`, { confirm: plan.json.messages.at(-1).id });
    await waitFor(c, id, /Sent to Meta/);
    return { id, slug: l.json.listing.slug, ads: plan.json.ads };
  };
  const ago = (d) => new Date(Date.now() - d * 86400000).toISOString();

  // A: three days, $60 spent, nothing in: flagged, with a pause button. At $30 it isn't.
  const a = await launchOn("11 Fir St, Austin, TX. 2 bed 1 bath, $380,000");
  await run(`UPDATE launches SET created_at = ?, meta_spend = 30 WHERE listing_id = ?`, [ago(3.2), a.id]);
  let att = (await c("GET", "/api/inbox")).json.attention;
  assert.ok(!att.some((x) => x.kind === "noleads"), "not on $30");
  await run(`UPDATE launches SET meta_spend = 60 WHERE listing_id = ?`, [a.id]);
  att = (await c("GET", "/api/inbox")).json.attention;
  const nl = att.find((x) => x.kind === "noleads");
  assert.equal(nl.title, "11 Fir St: $60 spent, no leads yet");
  assert.equal(nl.action.label, "Pause the ads");

  // B: Ad 1 has 3 Leads, Ads 2 and 3 none, $40 spent each, 9.5 days in.
  const b = await launchOn("15 Elm St, Austin, TX. 4 bed 3 bath, $720,000");
  const v1 = b.ads.find((x) => x.version === 1).id, v2 = b.ads.find((x) => x.version === 2).id;
  await run(`UPDATE launches SET created_at = ?, meta_spend = 120 WHERE listing_id = ?`, [ago(9.5), b.id]);
  await run(`UPDATE meta_ads SET spend = 40 WHERE listing_id = ?`, [b.id]);
  for (const name of ["Ann Lee", "Bo Ray", "Cy Dee"]) await client(app)("POST", `/api/l/${b.slug}/lead`, { name, phone: "512 555 0101", v: v1 });
  await run(`UPDATE leads SET created_at = ? WHERE listing_id = ?`, [ago(5), b.id]);
  att = (await c("GET", "/api/inbox")).json.attention;
  const shifts = att.filter((x) => x.kind === "shift");
  assert.equal(shifts.length, 2);
  const s2 = shifts.find((x) => x.action.lose === v2);
  assert.equal(s2.title, "Ad 2 on 15 Elm St has no leads, Ad 1 has 3");
  assert.equal(s2.action.label, "Pause Ad 2, move $26 to Ad 1");
  const ending = att.find((x) => x.kind === "ending");
  assert.match(ending.title, /^15 Elm St's ads end /);
  assert.equal(ending.action.label, "Run another week (+$140)");

  // Its button: Ad 2's ad set paused, Ad 1's gets its own $66.66 plus the $26 left.
  const sets = Object.fromEntries((await all(`SELECT ad_id, adset_id FROM meta_ads WHERE listing_id = ?`, [b.id])).map((r) => [r.ad_id, r.adset_id]));
  calls.length = 0;
  const done = await c("POST", `/api/attention/${s2.id}`, { choice: "act" });
  assert.equal(done.status, 200);
  const posts = calls.filter((x) => x.method === "POST" && x.path.startsWith("adset-"));
  assert.deepEqual(posts.map((x) => [x.path, x.params.status || x.params.lifetime_budget]), [[sets[v2], "PAUSED"], [sets[v1], String(6666 + 2600)]]);
  const said = (await c("GET", `/api/listings/${b.id}`)).json.messages.at(-1).body;
  assert.equal(said, "Done. **Ad 2** is paused on Facebook and Instagram, and **Ad 1** has its $26 on top of its own budget. The total stays $200.");
  assert.ok(!done.json.attention.some((x) => x.id === s2.id));

  // Meta refusing: nothing moved, Ad 3's item stays open.
  const s3 = done.json.attention.find((x) => x.kind === "shift");
  state.adsetFails = sets[s3.action.win];
  const bad = await c("POST", `/api/attention/${s3.id}`, { choice: "act" });
  assert.equal(bad.status, 409);
  assert.equal(bad.json.error, "Meta didn't accept the change. Nothing was moved.");
  state.adsetFails = null;
  assert.ok((await c("GET", "/api/inbox")).json.attention.some((x) => x.id === s3.id));

  // The run about to end: another week at the same spend a day.
  await c("POST", `/api/attention/${ending.id}`, { choice: "act" });
  assert.equal((await get(`SELECT budget, days FROM launches WHERE listing_id = ?`, [b.id])).days, 17);
});
