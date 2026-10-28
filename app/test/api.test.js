import { test } from "node:test";
import assert from "node:assert/strict";
import { boot, client, TINY_JPEG } from "./helpers.js";
import { houseRuleProblems } from "../src/writer.js";

const app = await boot();
const { all, run } = await import("../src/db.js");

const DESCRIPTION = "Just listed: 412 Oak Street in Riverside, Austin, TX. 3 bed, 2 bath, 1,840 sq ft craftsman with a wraparound porch, renovated kitchen and a fenced backyard. Perfect for families. $649,000";

async function signup(email, extra = {}) {
  const c = client(app);
  const r = await c("POST", "/api/signup", { email, password: "password123", name: "Sam Ellery", business: "Ellery Realty", invite: "early1", ...extra });
  return { c, r };
}

test("sign ups need an invite, and passwords are checked", async () => {
  const bad = client(app);
  assert.equal((await bad("POST", "/api/signup", { email: "x@y.com", password: "password123", invite: "nope" })).status, 403);
  // No code, no account, unless it's an admin's email.
  assert.equal((await client(app)("POST", "/api/signup", { email: "someone@else.test", password: "password123" })).status, 403);
  assert.equal((await client(app)("POST", "/api/signup", { email: "Owner@hopkins.test", password: "password123" })).status, 200);
  const { c, r } = await signup("sam@ellery.test");
  assert.equal(r.status, 200);
  assert.equal((await c("GET", "/api/me")).json.workspace.plan, "free");
  const other = client(app);
  assert.equal((await other("POST", "/api/login", { email: "sam@ellery.test", password: "wrong-password" })).status, 401);
  assert.equal((await other("POST", "/api/login", { email: "SAM@ellery.test", password: "password123" })).status, 200);
  assert.equal((await client(app)("GET", "/api/me")).status, 401);
});

test("the whole free plan: listing in, 3 ads out, changes included, the 4th and running need the paid plan", async () => {
  const { c } = await signup("free@ellery.test");
  assert.equal((await c("PUT", "/api/brand", { city: "Austin", primary: "#123456", voice: "warm" })).status, 200);
  assert.equal((await c("PUT", "/api/brand", { primary: "blue" })).status, 400);

  const photo = await c("POST", "/api/photos", { data: TINY_JPEG, thumb: TINY_JPEG, mime: "image/jpeg", name: "kitchen-1.jpg" });
  assert.equal(photo.json.label, "kitchen");
  const created = await c("POST", "/api/listings", { text: DESCRIPTION, photoIds: [photo.json.id], photoNames: { [photo.json.id]: "kitchen-1.jpg" } });
  assert.equal(created.status, 200);
  const p = created.json;
  assert.equal(p.listing.price, 649000);
  assert.equal(p.ads.length, 3);
  assert.equal(p.photos.length, 1);
  assert.ok(p.messages.some((m) => m.kind === "ads" && m.needs_action));
  assert.ok(p.messages.some((m) => m.kind === "check"), "flags 'Perfect for families' in the agent's own text");
  for (const ad of p.ads) assert.ok(!/famil/i.test(ad.primary_text + ad.overlay));
  const id = p.listing.id;

  const before = p.ads.find((a) => a.version === 2).primary_text;
  const shorter = await c("POST", `/api/listings/${id}/messages`, { text: "make it shorter", version: 2 });
  assert.ok(shorter.json.ads.find((a) => a.version === 2).primary_text.length < before.length);
  const head = await c("POST", `/api/listings/${id}/messages`, { text: 'headline to "Porch season in Riverside"', version: 1 });
  assert.equal(head.json.ads.find((a) => a.version === 1).headline, "Porch season in Riverside");
  // A later tone change keeps the agent's own headline.
  const warm = await c("POST", `/api/listings/${id}/messages`, { text: "make version 1 more premium", version: 1 });
  assert.equal(warm.json.ads.find((a) => a.version === 1).headline, "Porch season in Riverside");

  const run = await c("POST", `/api/listings/${id}/run`, { versions: [1, 2, 3] });
  assert.equal(run.json.messages.at(-1).kind, "upgrade");

  const price = await c("POST", `/api/listings/${id}/messages`, { text: "price dropped to $629,000" });
  assert.equal(price.json.listing.price, 629000);
  assert.equal(price.json.ads.length, 3, "still the same 3 ads");
  assert.equal(price.json.messages.at(-1).kind, "upgrade");
  assert.ok(price.json.ads.some((a) => a.primary_text.includes("$629,000")), "the 3 ads carry the new price");

  const second = await c("POST", "/api/listings", { text: "Condo in Midtown, 1 bed 1 bath, $389k" });
  assert.equal(second.json.ads.length, 0);
  assert.equal(second.json.messages.at(-1).kind, "upgrade");

  const me = await c("GET", "/api/me");
  assert.equal(me.json.usage.adsMade, 3);

  // Nothing Hopkins said breaks the house rules.
  for (const m of [...price.json.messages, ...second.json.messages].filter((m) => m.role === "hopkins")) {
    assert.deepEqual(houseRuleProblems(m.body), [], m.body);
  }
});

test("paid: the plan first, then the yes, then the testing record and leads", async () => {
  const { c } = await signup("boss@hopkins.test");
  const created = await c("POST", "/api/listings", { text: DESCRIPTION });
  const id = created.json.listing.id;
  const ws = (await c("GET", "/api/me")).json.workspace.id;
  assert.equal((await c("PATCH", `/api/admin/workspaces/${ws}`, { plan: "paid" })).status, 200);

  const plan = await c("POST", `/api/listings/${id}/run`, { versions: [1, 2, 3], budget: 300, days: 14 });
  const planMsg = plan.json.messages.at(-1);
  assert.equal(planMsg.kind, "plan");
  assert.equal(planMsg.data.budget, 300);
  assert.equal(planMsg.data.audience.radiusMiles, 15);
  assert.equal((await all(`SELECT * FROM launches`)).length, 0, "nothing is set up before the yes");

  const yes = await c("POST", `/api/listings/${id}/run`, { confirm: planMsg.id });
  assert.ok(yes.json.ads.every((a) => a.status === "approved"));
  assert.match(yes.json.messages.at(-1).body, /Meta ad account is connected/);
  assert.match(yes.json.messages.at(-1).body, /post or boost them yourself/);
  assert.equal((await all(`SELECT * FROM tests WHERE listing_id = ?`, [id])).length, 3);

  // A price change on the paid plan brings 3 new price ads.
  const price = await c("PATCH", `/api/listings/${id}`, { price: 629000 });
  assert.equal(price.json.listing.moment, "price");
  assert.ok(price.json.ads.every((a) => a.moment === "price" && a.status === "draft"));

  // The public lead page, then a lead from version 1 of the approved set.
  const approvedV1 = yes.json.ads.find((a) => a.version === 1);
  const page = await client(app)("GET", `/l/${created.json.listing.slug}`);
  assert.equal(page.status, 200);
  assert.match(page.body, /412 Oak Street/);
  const anon = client(app);
  assert.equal((await anon("POST", `/api/l/${created.json.listing.slug}/lead`, { name: "Dana" })).status, 400);
  const lead = await anon("POST", `/api/l/${created.json.listing.slug}/lead`, { name: "Dana Price", phone: "512 555 0199", wants: "showing", v: approvedV1.id });
  assert.equal(lead.status, 200);
  const record = await all(`SELECT * FROM tests WHERE ad_id = ?`, [approvedV1.id]);
  assert.equal(record[0].leads, 1);

  const leads = await c("GET", "/api/leads");
  assert.equal(leads.json.leads[0].version, 1);
  // Today's "Leads this week" counts the leads themselves.
  assert.equal((await c("GET", "/api/inbox")).json.leadsWeek, 1);
  await c("PATCH", `/api/listings/${id}`, { spend: 60 });
  const report = await c("GET", "/api/report");
  assert.equal(report.json.total, 1);
  assert.equal(report.json.cpl, 60);
  assert.match(report.json.headline, /1 Lead, \$60 each, 1 asked for a showing/);
});

test("workspaces can't see each other's listings, and only admins see admin", async () => {
  const a = await signup("a@one.test");
  const b = await signup("b@two.test");
  const created = await a.c("POST", "/api/listings", { text: DESCRIPTION });
  assert.equal((await b.c("GET", `/api/listings/${created.json.listing.id}`)).status, 404);
  assert.equal((await b.c("POST", `/api/listings/${created.json.listing.id}/messages`, { text: "run it" })).status, 404);
  assert.equal((await b.c("GET", "/api/admin/workspaces")).status, 403);
  assert.equal((await b.c("GET", "/api/listings")).json.listings.length, 0);
  // Every other way in to a listing that isn't theirs: nothing found, nothing changed.
  const id = created.json.listing.id;
  for (const [method, url, body] of [["PATCH", `/api/listings/${id}`, { price: 1 }], ["PATCH", `/api/listings/${id}/style`, { style: { bg: "#000000" } }], ["POST", `/api/listings/${id}/remake`, {}], ["POST", `/api/listings/${id}/run`, { budget: 100, days: 7 }], ["DELETE", `/api/listings/${id}`]]) {
    assert.equal((await b.c(method, url, body)).status, 404, `${method} ${url}`);
  }
  assert.equal((await b.c("POST", "/api/listings/delete", { ids: [id] })).json.deleted, 0);
  // Their photos, messages and leads can't be relabelled, deleted or moved either.
  const photo = (await a.c("POST", "/api/photos", { data: TINY_JPEG, mime: "image/jpeg", listingId: id })).json.id;
  await b.c("PATCH", `/api/photos/${photo}`, { label: "kitchen" });
  await b.c("DELETE", `/api/photos/${photo}`);
  const msg = created.json.messages.at(-1).id;
  await b.c("POST", `/api/messages/${msg}/dismiss`);
  const after = (await a.c("GET", `/api/listings/${id}`)).json;
  assert.equal(after.listing.price, created.json.listing.price);
  assert.equal(after.ads.length, created.json.ads.length);
  const kept = after.photos.find((p) => p.id === photo);
  assert.ok(kept, "the photo is still there");
  assert.notEqual(kept.label, "kitchen");
  assert.equal(after.messages.find((m) => m.id === msg).needs_action, created.json.messages.at(-1).needs_action);
});

test("the lead page escapes what agents type", async () => {
  const { c } = await signup("x@xss.test");
  const created = await c("POST", "/api/listings", { text: "</script><script>alert(1)</script> 12 Elm Street $500,000 $& here" });
  const page = await client(app)("GET", `/l/${created.json.listing.slug}`);
  assert.ok(!page.body.includes("<script>alert(1)"));
});

test("settings: name, photo, email and password changes, and deleting the account", async () => {
  const { c } = await signup("set@ellery.test");
  assert.equal((await c("PATCH", "/api/account", { name: "Sam E" })).status, 200);
  assert.equal((await c("GET", "/api/me")).json.user.name, "Sam E");

  // A profile photo has to be one of yours, uploaded as an avatar.
  assert.equal((await c("PATCH", "/api/account", { avatar_id: "not-a-photo" })).status, 400);
  const av = await c("POST", "/api/photos", { data: TINY_JPEG, mime: "image/jpeg", kind: "avatar", name: "me.jpg" });
  assert.equal((await c("PATCH", "/api/account", { avatar_id: av.json.id })).status, 200);
  assert.equal((await c("GET", "/api/me")).json.user.avatar_id, av.json.id);

  // Changing the email needs the password, and can't take someone else's.
  assert.equal((await c("PATCH", "/api/account", { email: "new@ellery.test" })).status, 401);
  assert.equal((await c("PATCH", "/api/account", { email: "sam@ellery.test", password: "password123" })).status, 409);
  assert.equal((await c("PATCH", "/api/account", { email: "new@ellery.test", password: "password123" })).status, 200);

  assert.equal((await c("POST", "/api/account/password", { current: "wrong-one", next: "newpassword1" })).status, 401);
  assert.equal((await c("POST", "/api/account/password", { current: "password123", next: "short" })).status, 400);
  assert.equal((await c("POST", "/api/account/password", { current: "password123", next: "newpassword1" })).status, 200);
  const fresh = client(app);
  assert.equal((await fresh("POST", "/api/login", { email: "new@ellery.test", password: "password123" })).status, 401);
  assert.equal((await fresh("POST", "/api/login", { email: "new@ellery.test", password: "newpassword1" })).status, 200);

  await c("POST", "/api/listings", { text: DESCRIPTION });
  assert.equal((await c("POST", "/api/account/delete", { password: "nope" })).status, 401);
  assert.equal((await c("POST", "/api/account/delete", { password: "newpassword1" })).status, 200);
  assert.equal((await fresh("GET", "/api/me")).status, 401);
  assert.equal((await client(app)("POST", "/api/login", { email: "new@ellery.test", password: "newpassword1" })).status, 401);
});

test("a listing past the free ads is saved, says where the free ads went, and can get its ads later", async () => {
  const { c } = await signup("limit@ellery.test");
  await c("POST", "/api/listings", { text: DESCRIPTION });
  const second = await c("POST", "/api/listings", { text: "Condo in Midtown, 1 bed 1 bath, $389k" });
  const msg = second.json.messages.at(-1);
  assert.equal(msg.kind, "upgrade");
  assert.match(msg.body, /went on 412 Oak Street/);
  assert.match(msg.body, /tap Make the ads/);
  const ws = (await c("GET", "/api/me")).json.workspace.id;
  const boss = client(app);
  await boss("POST", "/api/login", { email: "boss@hopkins.test", password: "password123" });
  assert.equal((await boss("PATCH", `/api/admin/workspaces/${ws}`, { plan: "paid" })).status, 200);
  const made = await c("POST", `/api/listings/${second.json.listing.id}/remake`, {});
  assert.equal(made.json.ads.length, 3);
});

test("hello on the new listing screen gets a reply, not a listing and an upgrade message", async () => {
  const { c } = await signup("hello@ellery.test");
  const h = await c("POST", "/api/listings", { text: "Hello" });
  assert.equal(h.status, 200);
  assert.equal(h.json.listing, undefined);
  assert.match(h.json.chat.reply, /^Hi Sam\. Send me a listing/);
  assert.ok(!/paid plan|\bPro\b|\$299/.test(h.json.chat.reply));
  // Asked again, it doesn't say the same thing word for word.
  const again = await c("POST", "/api/listings", { text: "hi", history: [{ role: "agent", body: "Hello" }, { role: "hopkins", body: h.json.chat.reply }] });
  assert.notEqual(again.json.chat.reply, h.json.chat.reply);
  assert.equal((await c("GET", "/api/listings")).json.listings.length, 0);
  // A real listing still goes straight in, and its chat carries on from the conversation so far.
  const l = await c("POST", "/api/listings", { text: DESCRIPTION, history: [{ role: "agent", body: "Hello" }, { role: "hopkins", body: h.json.chat.reply }] });
  assert.equal(l.json.ads.length, 3);
  assert.deepEqual(l.json.messages.slice(0, 3).map((m) => [m.role, m.body.slice(0, 12)]), [["agent", "Hello"], ["hopkins", h.json.chat.reply.slice(0, 12)], ["agent", DESCRIPTION.slice(0, 12)]]);
});

test("deleting a listing removes it and its chat, and doesn't hand back free ads", async () => {
  const { c } = await signup("del@ellery.test");
  const l = await c("POST", "/api/listings", { text: DESCRIPTION });
  assert.equal((await c("GET", "/api/me")).json.usage.adsMade, 3);
  assert.equal((await client(app)("DELETE", `/api/listings/${l.json.listing.id}`)).status, 401);
  assert.equal((await c("DELETE", `/api/listings/${l.json.listing.id}`)).status, 200);
  assert.equal((await c("GET", `/api/listings/${l.json.listing.id}`)).status, 404);
  assert.equal((await all(`SELECT id FROM messages WHERE listing_id = ?`, [l.json.listing.id])).length, 0);
  assert.equal((await c("GET", "/api/me")).json.usage.adsMade, 3);
  const next = await c("POST", "/api/listings", { text: DESCRIPTION.replace("412 Oak", "18 Elm") });
  assert.equal(next.json.ads.length, 0);
});

test("deleting several listings at once, only your own", async () => {
  const { c } = await signup("bulk@ellery.test");
  const other = (await signup("bulk2@ellery.test")).c;
  const mine = [];
  for (const n of ["1 Elm St", "2 Elm St", "3 Elm St"]) mine.push((await c("POST", "/api/listings", { text: `${n}, Austin, TX. 3 bed, 2 bath. $500,000` })).json.listing.id);
  const theirs = (await other("POST", "/api/listings", { text: DESCRIPTION })).json.listing.id;
  const r = await c("POST", "/api/listings/delete", { ids: [mine[0], mine[1], theirs] });
  assert.equal(r.json.deleted, 2);
  assert.deepEqual((await c("GET", "/api/listings")).json.listings.map((l) => l.id), [mine[2]]);
  assert.equal((await other("GET", `/api/listings/${theirs}`)).status, 200);
  assert.equal((await c("POST", "/api/listings/delete", { ids: [] })).status, 400);
});

test("a listing with no city doesn't borrow the brand's city, and old guesses get cleared", async () => {
  const { c } = await signup("city@ellery.test");
  assert.equal((await c("PUT", "/api/brand", { city: "Miami" })).status, 200);
  const l = await c("POST", "/api/listings", { photoIds: [(await c("POST", "/api/photos", { data: TINY_JPEG, thumb: TINY_JPEG, mime: "image/jpeg" })).json.id] });
  assert.equal(l.status, 200);
  assert.equal(l.json.listing.city, null);
  // One made before the fix, with the guess in it, and one that really is in Miami.
  const { run } = await import("../src/db.js");
  const real = await c("POST", "/api/listings", { text: "Condo at 9 Bay Road, Miami, FL. 2 bed, $500,000" });
  await run(`UPDATE listings SET city = 'Miami' WHERE id = ?`, [l.json.listing.id]);
  const { forgetGuessedCities } = await import("../src/hopkins.js");
  await forgetGuessedCities();
  assert.equal((await c("GET", `/api/listings/${l.json.listing.id}`)).json.listing.city, null);
  assert.equal((await c("GET", `/api/listings/${real.json.listing.id}`)).json.listing.city === null, false);
});

test("renaming a listing, and clearing the name goes back to the address", async () => {
  const { c } = await signup("rename@ellery.test");
  const l = await c("POST", "/api/listings", { text: DESCRIPTION });
  const r = await c("PATCH", `/api/listings/${l.json.listing.id}`, { title: "Oak Street craftsman" });
  assert.equal(r.json.listing.title, "Oak Street craftsman");
  assert.equal((await c("GET", "/api/listings")).json.listings[0].title, "Oak Street craftsman");
  const back = await c("PATCH", `/api/listings/${l.json.listing.id}`, { title: "  " });
  assert.equal(back.json.listing.title, null);
  assert.equal(back.json.listing.address, "412 Oak Street");
});

test("the look of an ad: from the chat in plain words, and from the Style sheet", async () => {
  const { c } = await signup("style@ellery.test");
  const l = await c("POST", "/api/listings", { text: DESCRIPTION });
  const id = l.json.listing.id;
  const m = await c("POST", `/api/listings/${id}/messages`, { text: "make all three green with a gold label", version: 1 });
  assert.equal(m.json.messages.at(-1).body, "All three ads now have a green background and a gold label.");
  for (const a of m.json.ads) assert.deepEqual([a.style.bg, a.style.accent], ["#2F5D46", "#D7AE62"]);
  assert.equal(m.json.messages.at(-1).data.snapshot.length, 3);
  const f = await c("POST", `/api/listings/${id}/messages`, { text: "version 2: serif font and the text at the top", version: 1 });
  assert.deepEqual([f.json.ads[1].style.font, f.json.ads[1].style.layout], ["classic", "top"]);
  assert.equal(f.json.focus, 2);
  // a fact about the home is not a colour request
  const fact = await c("POST", `/api/listings/${id}/messages`, { text: "it has a white kitchen", version: 1 });
  assert.equal(fact.json.ads[0].style.bg, "#2F5D46");
  // a colour that wouldn't read on the background is left out, and the reply says so
  const dark = await c("POST", `/api/listings/${id}/messages`, { text: "version 3 dark green text please", version: 1 });
  assert.equal(dark.json.ads[2].style.text, undefined);
  assert.match(dark.json.messages.at(-1).body, /dark green wouldn't be readable on green\. A lighter one will work\.$/);
  const cream = await c("POST", `/api/listings/${id}/messages`, { text: "version 3 cream text please", version: 1 });
  assert.equal(cream.json.ads[2].style.text, "#F4EBDD");
  // the Style sheet: one version, then all, then back to the brand look; nonsense is ignored
  let s = await c("PATCH", `/api/listings/${id}/style`, { versions: [3], style: { bg: "#6d1f2c", layout: "frame", font: "comic sans" } });
  assert.deepEqual([s.json.ads[2].style.bg, s.json.ads[2].style.layout, s.json.ads[2].style.font], ["#6D1F2C", "frame", undefined]);
  s = await c("PATCH", `/api/listings/${id}/style`, { versions: [1, 2, 3], style: {}, sizeStep: 0.1 });
  assert.equal(s.json.ads[0].style.size, 1.1);
  s = await c("PATCH", `/api/listings/${id}/style`, { versions: [1], style: { reset: true } });
  assert.deepEqual(Object.keys(s.json.ads[0].style).filter((k) => ["bg", "accent", "font", "layout", "size"].includes(k)), []);
  assert.equal(s.json.ads[1].style.bg, "#2F5D46");
});

test("forgot password: the founder makes a one time link, it signs out every other device", async () => {
  const phone = client(app);
  const laptop = client(app);
  await phone("POST", "/api/signup", { email: "forgot@ellery.test", password: "password123", invite: "EARLY1" });
  assert.equal((await laptop("POST", "/api/login", { email: "forgot@ellery.test", password: "password123" })).status, 200);
  // Asking says the same thing whether or not the email has an account.
  const stranger = client(app);
  assert.equal((await stranger("POST", "/api/forgot", { email: "nobody@ellery.test" })).status, 200);
  assert.equal((await stranger("POST", "/api/forgot", { email: "forgot@ellery.test" })).status, 200);
  // The admin sees the ask and makes the link.
  const boss = client(app);
  await boss("POST", "/api/login", { email: "boss@hopkins.test", password: "password123" });
  const ws = (await boss("GET", "/api/admin/workspaces")).json.workspaces.find((w) => w.emails === "forgot@ellery.test");
  assert.ok(ws.reset_asked);
  assert.equal((await phone("POST", `/api/admin/users/${ws.user_id}/reset-link`, {})).status, 403, "only admins make links");
  const { link } = (await boss("POST", `/api/admin/users/${ws.user_id}/reset-link`, {})).json;
  const t = new URL(link).searchParams.get("t");
  assert.equal((await stranger("POST", "/api/reset", { t, password: "short" })).status, 400);
  assert.equal((await stranger("POST", "/api/reset", { t, password: "brandnew123" })).status, 200);
  assert.equal((await stranger("GET", "/api/me")).json.user.email, "forgot@ellery.test", "signed in with the new password");
  assert.equal((await stranger("POST", "/api/reset", { t, password: "again12345" })).status, 400, "the link works once");
  assert.equal((await phone("GET", "/api/me")).status, 401, "other devices are signed out");
  assert.equal((await laptop("GET", "/api/me")).status, 401);
  assert.equal((await laptop("POST", "/api/login", { email: "forgot@ellery.test", password: "brandnew123" })).status, 200);
  // Changing the password in Settings signs the others out too, but not this one.
  const third = client(app);
  await third("POST", "/api/login", { email: "forgot@ellery.test", password: "brandnew123" });
  assert.equal((await laptop("POST", "/api/account/password", { current: "brandnew123", next: "evennewer123" })).status, 200);
  assert.equal((await laptop("GET", "/api/me")).status, 200);
  assert.equal((await third("GET", "/api/me")).status, 401);
});

test("feedback reaches Admin; limits count each visitor on their own behind the proxy", async () => {
  const c = client(app);
  await c("POST", "/api/signup", { email: "fb@ellery.test", password: "password123", invite: "EARLY1", business: "FB Realty" });
  assert.equal((await c("POST", "/api/feedback", { body: "" })).status, 400);
  assert.equal((await c("POST", "/api/feedback", { body: "The style sheet is great", page: "#/l/x" })).status, 200);
  const boss = client(app);
  await boss("POST", "/api/login", { email: "boss@hopkins.test", password: "password123" });
  const fb = (await boss("GET", "/api/admin/feedback")).json.feedback;
  assert.equal(fb[0].body, "The style sheet is great");
  assert.equal(fb[0].name, "FB Realty");
  assert.equal((await c("GET", "/api/admin/feedback")).status, 403);
  // Two visitors through the same proxy, told apart by X-Forwarded-For.
  const ask = (ip) => app.inject({ method: "POST", url: "/api/forgot", payload: { email: "x@y.test" }, remoteAddress: "10.9.9.9", headers: { "x-forwarded-for": ip } });
  for (let i = 0; i < 5; i++) assert.equal((await ask("203.0.113.1")).statusCode, 200);
  assert.equal((await ask("203.0.113.1")).statusCode, 429);
  assert.equal((await ask("203.0.113.2")).statusCode, 200, "someone else isn't blocked");
  // Every answer carries the safety headers.
  const res = await app.inject({ method: "GET", url: "/login" });
  assert.equal(res.headers["x-content-type-options"], "nosniff");
  assert.equal(res.headers["x-frame-options"], "DENY");
});

test("free plan: 3 ads in all, and nothing new after that, whatever gets deleted", async () => {
  const c = client(app);
  await c("POST", "/api/signup", { email: "strict@ellery.test", password: "password123", invite: "EARLY1" });
  const me = async () => (await c("GET", "/api/me")).json.usage.adsMade;
  // One ad, then a new set of one: that's 2 used, not 1.
  const l = await c("POST", "/api/listings", { text: "12 Elm St, Austin, 3 bed 2 bath, $585,000, big back yard. Just one ad" });
  assert.equal(l.json.ads.length, 1);
  const id = l.json.listing.id;
  assert.equal((await c("POST", `/api/listings/${id}/remake`, {})).json.ads.length, 1);
  assert.equal(await me(), 2);
  // Changes are still included.
  const s = await c("POST", `/api/listings/${id}/messages`, { text: "make it shorter", version: 1 });
  assert.notEqual(s.json.messages.at(-1).kind, "upgrade");
  assert.equal(await me(), 2);
  // The third, then nothing more: not a new set, not another listing, not after deleting.
  await c("POST", `/api/listings/${id}/remake`, {});
  assert.equal(await me(), 3);
  const again = await c("POST", `/api/listings/${id}/remake`, {});
  assert.equal(again.json.messages.at(-1).kind, "upgrade");
  assert.equal(await me(), 3);
  assert.equal((await c("DELETE", `/api/listings/${id}`)).status, 200);
  const next = await c("POST", "/api/listings", { text: "9 Oak Ave, Austin, 2 bed 1 bath, $410,000" });
  assert.equal(next.json.ads.length, 0);
  assert.equal(next.json.messages.at(-1).kind, "upgrade");
});

test("listings with no name or address are Untitled 1, Untitled 2, and keep their number", async () => {
  const c = client(app);
  await c("POST", "/api/signup", { email: "untitled@ellery.test", password: "password123", invite: "EARLY1" });
  const up = async () => (await c("POST", "/api/photos", { data: TINY_JPEG, thumb: TINY_JPEG, mime: "image/jpeg", name: "IMG_1.jpg" })).json.id;
  const a = await c("POST", "/api/listings", { text: "", photoIds: [await up()] });
  const b = await c("POST", "/api/listings", { text: "", photoIds: [await up()] });
  assert.equal(a.json.listing.untitled_no, 1);
  assert.equal(b.json.listing.untitled_no, 2);
  assert.equal((await c("DELETE", `/api/listings/${a.json.listing.id}`)).status, 200);
  const d = await c("POST", "/api/listings", { text: "", photoIds: [await up()] });
  assert.equal(d.json.listing.untitled_no, 3, "a deleted number isn't reused");
  const rows = (await c("GET", "/api/listings")).json.listings;
  assert.deepEqual(rows.map((l) => l.untitled_no).sort(), [2, 3]);
});

test("asking to run on the free plan says it once, then the app shows the plan card", async () => {
  const c = client(app);
  await c("POST", "/api/signup", { email: "runloop@ellery.test", password: "password123", invite: "EARLY1" });
  const l = await c("POST", "/api/listings", { text: "12 Elm St, Austin, 3 bed 2 bath, $585,000, big back yard" });
  const id = l.json.listing.id;
  const first = await c("POST", `/api/listings/${id}/messages`, { text: "run it", version: 1 });
  assert.equal(first.json.messages.at(-1).kind, "upgrade");
  assert.equal(first.json.upgrade, null);
  const count = first.json.messages.filter((m) => m.kind === "upgrade").length;
  for (let i = 0; i < 3; i++) {
    const again = await c("POST", `/api/listings/${id}/messages`, { text: "run it", version: 1 });
    assert.equal(again.json.upgrade, "run", "the app opens the card");
    assert.equal(again.json.messages.filter((m) => m.kind === "upgrade").length, count, "no new note in the chat");
  }
});

test("with email set up, forgot password emails the link straight away", async () => {
  const c = client(app);
  await c("POST", "/api/signup", { email: "mailme@ellery.test", password: "password123", invite: "EARLY1" });
  const sent = [];
  const realFetch = globalThis.fetch;
  Object.assign(process.env, { RESEND_API_KEY: "re_test", MAIL_FROM: "Hopkins <hello@example.test>" });
  globalThis.fetch = async (url, init) => { sent.push({ url, body: JSON.parse(init.body), auth: init.headers.Authorization }); return { ok: true, text: async () => "" }; };
  try {
    assert.equal((await client(app)("POST", "/api/forgot", { email: "mailme@ellery.test" })).status, 200);
    assert.equal((await client(app)("POST", "/api/forgot", { email: "nobody@ellery.test" })).status, 200);
  } finally {
    globalThis.fetch = realFetch;
    delete process.env.RESEND_API_KEY; delete process.env.MAIL_FROM;
  }
  assert.equal(sent.length, 1, "only the real account gets an email");
  assert.equal(sent[0].url, "https://api.resend.com/emails");
  assert.equal(sent[0].auth, "Bearer re_test");
  assert.deepEqual(sent[0].body.to, ["mailme@ellery.test"]);
  const t = sent[0].body.text.match(/reset\?t=([\w-]+)/)[1];
  const stranger = client(app);
  assert.equal((await stranger("POST", "/api/reset", { t, password: "fromemail123" })).status, 200);
  assert.equal((await stranger("GET", "/api/me")).json.user.email, "mailme@ellery.test");
});

test("pilots who sign up with an invite code start on the paid plan", async () => {
  delete process.env.PILOT_PLAN;
  const c = client(app);
  assert.equal((await c("POST", "/api/signup", { email: "pilot@ellery.test", password: "password123", invite: "EARLY1" })).status, 200);
  const me = (await c("GET", "/api/me")).json;
  process.env.PILOT_PLAN = "free";
  assert.equal(me.workspace.plan, "paid");
});

test("password guessing is counted per account, whatever address it claims", async () => {
  await client(app)("POST", "/api/signup", { email: "guess@ellery.test", password: "password123", invite: "EARLY1" });
  // Every try from a new client, as a script faking X-Forwarded-For would look.
  for (let i = 0; i < 10; i++) assert.equal((await client(app)("POST", "/api/login", { email: "guess@ellery.test", password: `wrong${i}` })).status, 401);
  assert.equal((await client(app)("POST", "/api/login", { email: "Guess@ellery.test", password: "password123" })).status, 429);
  // Other accounts aren't held up.
  assert.equal((await client(app)("POST", "/api/login", { email: "x@nobody.test", password: "whatever1" })).status, 401);
});

test("pages carry a Content Security Policy that allows their own inline scripts", async () => {
  for (const url of ["/login", "/privacy"]) {
    const r = await app.inject({ method: "GET", url });
    assert.match(r.headers["content-security-policy"], /script-src 'self'/);
    assert.match(r.headers["content-security-policy"], /frame-ancestors 'none'/);
  }
  const login = await app.inject({ method: "GET", url: "/login" });
  assert.match(login.headers["content-security-policy"], /'sha256-[A-Za-z0-9+/=]+'/);
  assert.equal((await app.inject({ method: "GET", url: "/healthz" })).headers["content-security-policy"], undefined);
});

test("any message can be edited: Hopkins forgets the old one and puts the ads back", async () => {
  const { c } = await signup("edit@ellery.test");
  const l = await c("POST", "/api/listings", { text: DESCRIPTION });
  const id = l.json.listing.id;
  const original = l.json.ads.map((a) => a.style.bg ?? null);
  const before = l.json.messages.length;

  const green = await c("POST", `/api/listings/${id}/messages`, { text: "make all three green with a gold label", version: 1 });
  const sent = green.json.messages.at(-2);
  assert.equal(sent.role, "agent");
  assert.equal(sent.editable, true);
  assert.equal(green.json.ads[0].style.bg, "#2F5D46");

  // Meant to delete one, not recolour them: the green goes, the old message and its reply go.
  const edited = await c("POST", `/api/messages/${sent.id}/edit`, { text: "delete the second one", version: 1 });
  assert.equal(edited.status, 200);
  assert.deepEqual(edited.json.ads.map((a) => a.style.bg ?? null), original.slice(0, 2));
  assert.equal(edited.json.ads.length, 2);
  assert.ok(!edited.json.messages.some((m) => /green/.test(m.body)), "the old wording is gone");
  assert.equal(edited.json.messages.length, before + 2);
  const latest = edited.json.messages.at(-2);
  assert.equal(latest.body, "delete the second one");

  // A Style change after it is undone too when an earlier message is edited, and the removed ad
  // comes back without the free count moving.
  await c("PATCH", `/api/listings/${id}/style`, { versions: [1], style: { bg: "#000000" } });
  await c("POST", `/api/listings/${id}/messages`, { text: "make it shorter", version: 1 });
  const again = await c("POST", `/api/messages/${latest.id}/edit`, { text: "Which one would you pick?", version: 1 });
  assert.equal(again.json.ads.length, 3);
  assert.deepEqual(again.json.ads.map((a) => a.style.bg ?? null), original);
  assert.equal((await c("GET", "/api/me")).json.usage.adsMade, 3);
  assert.ok(!again.json.messages.some((m) => m.body === "make it shorter"));

  // Nobody else can edit it.
  const other = await signup("edit2@ellery.test");
  assert.equal((await other.c("POST", `/api/messages/${again.json.messages.at(-2).id}/edit`, { text: "hi" })).status, 409);
});

test("the message that made the listing can be edited: the listing is read again, same ads", async () => {
  const { c } = await signup("editfirst@ellery.test");
  const l = await c("POST", "/api/listings", { text: DESCRIPTION });
  const id = l.json.listing.id;
  const first = l.json.messages.find((m) => m.role === "agent");
  assert.equal(first.editable, true);
  const adIds = l.json.ads.map((a) => a.id);
  await c("POST", `/api/listings/${id}/messages`, { text: "make it shorter", version: 1 });

  // Got the price wrong.
  const fixed = await c("POST", `/api/messages/${first.id}/edit`, { text: DESCRIPTION.replace("$649,000", "$625,000") });
  assert.equal(fixed.status, 200);
  assert.equal(fixed.json.listing.price, 625000);
  assert.match(fixed.json.messages.find((m) => m.role === "agent").body, /\$625,000/);
  assert.ok(!fixed.json.messages.some((m) => m.body === "make it shorter"), "what came after it is gone");
  assert.equal(fixed.json.messages.filter((m) => m.kind === "ads").length, 1);
  // The same ads, written again: their links and the free count don't change.
  assert.deepEqual(fixed.json.ads.map((a) => a.id), adIds);
  assert.equal((await c("GET", "/api/me")).json.usage.adsMade, 3);
  assert.equal(fixed.json.listing.slug, l.json.listing.slug);
});

test("Monday starts at the agent's own midnight, in their time zone", async () => {
  const { localDay } = await import("../src/hopkins.js");
  // Monday 02:30 UTC is still Sunday evening in Los Angeles, and already Monday in Dublin.
  const at = new Date("2026-10-26T02:30:00Z");
  assert.equal(localDay(at, "America/Los_Angeles").weekday, 0);
  assert.equal(localDay(at, "Europe/Dublin").weekday, 1);
  assert.equal(localDay(at, "America/Los_Angeles").midnight.toISOString(), "2026-10-25T07:00:00.000Z");
  assert.equal(localDay(at, "Not/AZone").weekday, 1);
});

test("a week is Monday 00:00 to the next Monday 00:00 where the agent is, clock changes included", async () => {
  const { weekRange } = await import("../src/hopkins.js");
  // Dublin's clocks went back on Sunday 25 October 2026, so that week is an hour longer.
  assert.deepEqual(weekRange(new Date("2026-10-21T12:00:00Z"), "Europe/Dublin"), { from: "2026-10-18T23:00:00.000Z", to: "2026-10-26T00:00:00.000Z" });
  // Los Angeles goes back on 1 November: Monday 26 October is still on summer time.
  assert.deepEqual(weekRange(new Date("2026-10-28T12:00:00Z"), "America/Los_Angeles"), { from: "2026-10-26T07:00:00.000Z", to: "2026-11-02T08:00:00.000Z" });
  // Sunday night is still the same week; a minute after midnight is the next one.
  assert.equal(weekRange(new Date("2026-11-01T23:59:00Z"), "Europe/Dublin").from, "2026-10-26T00:00:00.000Z");
  assert.equal(weekRange(new Date("2026-11-02T00:01:00Z"), "Europe/Dublin").from, "2026-11-02T00:00:00.000Z");
  // Weeks back, across a month end.
  assert.equal(weekRange(new Date("2026-11-04T12:00:00Z"), "UTC", 2).from, "2026-10-19T00:00:00.000Z");
});

test("the report is one Monday to Sunday week, and a made up range is refused", async () => {
  const { c } = await signup("weeks@hopkins.test");
  const r = await c("GET", "/api/report?from=2026-10-26T00:00:00.000Z&to=2026-11-02T00:00:00.000Z");
  assert.equal(r.status, 200);
  assert.equal(r.json.since, "2026-10-26T00:00:00.000Z");
  assert.equal(r.json.until, "2026-11-02T00:00:00.000Z");
  assert.equal((await c("GET", "/api/report?from=2026-10-26T00:00:00.000Z&to=2026-12-02T00:00:00.000Z")).status, 400);
  assert.equal((await c("GET", "/api/report?from=nope&to=nope")).status, 400);
});

test("this week is compared with the same stretch of last week, never a whole week", async () => {
  const { c } = await signup("fair@hopkins.test");
  const created = await c("POST", "/api/listings", { text: DESCRIPTION });
  const id = created.json.listing.id;
  const ws = (await c("GET", "/api/me")).json.workspace.id;
  const day = 86400_000, now = Date.now();
  const from = new Date(now - 2 * day), to = new Date(from.getTime() + 7 * day);
  // Last week: one Lead a day before this moment a week ago, one after it.
  for (const at of [from.getTime() - 7 * day + day, now - 7 * day + 3600_000]) await run(`INSERT INTO leads (id, workspace_id, listing_id, name, wants, created_at) VALUES (?, ?, ?, 'T', 'info', ?)`, [String(Math.random()), ws, id, new Date(at).toISOString()]);
  await run(`INSERT INTO leads (id, workspace_id, listing_id, name, wants, created_at) VALUES (?, ?, ?, 'T', 'info', ?)`, [String(Math.random()), ws, id, new Date(now - 3600_000).toISOString()]);
  const r = await c("GET", `/api/report?from=${from.toISOString()}&to=${to.toISOString()}`);
  assert.equal(r.json.total, 1);
  assert.equal(r.json.soFar, true);
  assert.equal(r.json.lastWeek, 1, "only last week's Lead from before this moment counts");
  // A finished week is set against the whole week before it.
  const past = await c("GET", `/api/report?from=${new Date(from.getTime() + 7 * day).toISOString()}&to=${new Date(from.getTime() + 14 * day).toISOString()}`);
  assert.equal(past.json.soFar, false);
});

test("Lead has a capital L in Hopkins' replies, the verb doesn't", async () => {
  const { capLeads } = await import("../src/hopkins.js");
  assert.equal(capLeads("3 leads this week, no leads on Elm, cost per lead $20"), "3 Leads this week, no Leads on Elm, cost per Lead $20");
  assert.equal(capLeads("This leads to more showings."), "This leads to more showings.");
});

test("the demo account: admins only, full, rebuilt fresh, out of the admin list, and back to the founder's own account", async () => {
  // The admin account from the first test.
  const c = client(app);
  assert.equal((await c("POST", "/api/login", { email: "owner@hopkins.test", password: "password123" })).status, 200);
  const other = (await signup("notadmin@hopkins.test")).c;
  assert.equal((await other("POST", "/api/admin/demo", {})).status, 403);
  assert.equal((await c("POST", "/api/admin/demo", {})).status, 200);
  assert.equal((await c("POST", "/api/admin/demo", {})).status, 403, "inside the demo there's no admin");
  assert.equal((await c("POST", "/api/demo/leave", {})).status, 200);
  assert.equal((await c("POST", "/api/admin/demo", {})).status, 200, "opening it again rebuilds it");
  const me = (await c("GET", "/api/me")).json;
  assert.equal(me.demo, true);
  assert.equal(me.user.name, "Sarah Mitchell");
  assert.equal(me.workspace.plan, "paid");
  const listings = (await c("GET", "/api/listings")).json.listings;
  assert.equal(listings.length, 7);
  assert.ok(listings.some((l) => l.status === "sold"));
  const leads = (await c("GET", "/api/leads")).json.leads;
  assert.ok(leads.length >= 30, `${leads.length} Leads`);
  const report = (await c("GET", "/api/report")).json;
  assert.ok(report.total > 0, "this week has Leads");
  assert.ok(report.listings.filter((x) => x.running).length >= 4);
  assert.ok((await c("GET", "/api/inbox")).json.items.some((m) => m.needs_action), "ads waiting for a yes");
  // Every Lead sits after its listing's run started and before now.
  const { all: q } = await import("../src/db.js");
  const bad = await q(`SELECT l.created_at, (SELECT MIN(created_at) FROM launches WHERE listing_id = l.listing_id) AS ran FROM leads l WHERE l.workspace_id = (SELECT workspace_id FROM users WHERE email LIKE 'demo+%')`);
  assert.ok(bad.every((r) => r.ran && r.created_at >= r.ran && new Date(r.created_at) < new Date()), "no Lead before its run or in the future");
  assert.equal((await q(`SELECT COUNT(*) AS n FROM users WHERE email LIKE 'demo+%'`))[0].n, 1, "one demo per founder");
  // Not an admin in there, and not in the admin list.
  assert.equal((await c("GET", "/api/admin/workspaces")).status, 403);
  assert.equal((await c("POST", "/api/demo/leave", {})).status, 200);
  const back = (await c("GET", "/api/me")).json;
  assert.equal(back.admin, true);
  assert.ok(!back.demo);
  assert.ok(!(await c("GET", "/api/admin/workspaces")).json.workspaces.some((w) => /Mitchell/.test(w.name)));
});

test("the demo's own ads pass the house rules and the fair housing check", async () => {
  const src = (await import("node:fs")).readFileSync(new URL("../src/demo.js", import.meta.url), "utf8");
  const { checkWording } = await import("../src/fairhousing.js");
  const lines = [...src.matchAll(/(overlay|headline|kicker|text): "([^"]+)"/g)].map((m) => m[2]);
  assert.ok(lines.length > 40);
  for (const l of lines) {
    assert.deepEqual(houseRuleProblems(l), [], l);
    const w = checkWording(l);
    assert.ok(!w || !w.length || w.every?.((x) => !x.block), `${l}: ${JSON.stringify(w)}`);
  }
});
