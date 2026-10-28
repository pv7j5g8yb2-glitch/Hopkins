import { test } from "node:test";
import assert from "node:assert/strict";
import { boot, client, TINY_JPEG } from "./helpers.js";

// With only GROQ_API_KEY set (the free option), the chat goes to Groq. A fake fetch stands in
// for the API so this checks the request and what Hopkins does with the answer.
const app = await boot({ ANTHROPIC_API_KEY: "", GROQ_API_KEY: "test-groq", GROQ_BACKUP_MODELS: "" });
const brain = await import("../src/brain.js");

const calls = [];
let next = [];
let delay = 0;
brain.setFetchForTests(async (url, init) => {
  if (delay) await new Promise((x) => setTimeout(x, delay));
  calls.push({ url, body: JSON.parse(init.body), auth: init.headers.Authorization });
  const r = next.shift();
  if (r instanceof Error) throw r;
  if (r === 500) return { ok: false, status: 500, text: async () => "down" };
  if (typeof r === "string" && r.startsWith("429:")) return { ok: false, status: 429, headers: { get: () => null }, text: async () => `{"error":{"message":"Rate limit reached. Please try again in ${r.slice(4)}s."}}` };
  if (r === "badjson") return { ok: false, status: 400, text: async () => '{"error":{"code":"json_validate_failed"}}' };
  return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(r) } }] }) };
});

test("Groq runs the chat when it's the only key", async () => {
  assert.equal(brain.provider, "groq");
  const c = client(app);
  await c("POST", "/api/signup", { email: "groq@test.com", password: "password123", invite: "EARLY1", name: "Dana Reyes" });
  // Reading and writing fail here, so the built-in reader and writer make the listing and ads.
  next = [500, 500];
  const r = await c("POST", "/api/listings", { text: "12 Elm St, Austin, 3 bed 2 bath, $585,000, big back yard" });
  assert.equal(r.status, 200);
  assert.equal(r.json.ads.length, 3);
  assert.match(calls[0].url, /api\.groq\.com/);
  assert.equal(calls[0].auth, "Bearer test-groq");
  assert.equal(calls[0].body.response_format.type, "json_object");

  next = [{ reply: "Sure. Version 1 leans on the yard, so I'd keep it.", action: "none", version: 1, moment: "none", ads: [], listing_patch: null, budget: 0, days: 0 }];
  const t = await c("POST", `/api/listings/${r.json.listing.id}/messages`, { text: "which one would you keep?", version: 2 });
  assert.equal(t.json.messages.at(-1).body, "Sure. Version 1 leans on the yard, so I'd keep it.");
  assert.equal(t.json.focus, 1);
  const sent = calls.at(-1).body.messages;
  assert.equal(sent[0].role, "system");
  assert.match(sent[0].content, /Agent: Dana Reyes/);
  assert.equal(sent.at(-1).role, "user");
  assert.match(sent.at(-1).content, /which one would you keep/);

  // A half filled answer is still safe to act on.
  next = [{ reply: "Done, version 2 is shorter.", action: "revise", ads: [{ version: 2, overlay: "Room to breathe." }] }];
  const u = await c("POST", `/api/listings/${r.json.listing.id}/messages`, { text: "shorter please", version: 2 });
  assert.equal(u.json.ads.find((a) => a.version === 2).overlay, "Room to breathe.");
  assert.ok(u.json.ads.find((a) => a.version === 2).headline, "fields it left out are kept");
  assert.equal(u.json.focus, 2);

  // Groq sometimes fails to make valid JSON; one retry, then the answer is used as normal.
  next = ["badjson", { reply: "Solar panels are in. I put them in version 3.", action: "update_listing", version: 3, ads: [{ version: 3, overlay: "Solar on the roof." }] }];
  const before = calls.length;
  const v = await c("POST", `/api/listings/${r.json.listing.id}/messages`, { text: "it also has solar panels", version: 3 });
  assert.equal(calls.length - before, 2);
  assert.equal(v.json.messages.at(-1).body, 'On **Ad 3**, the line on the photo now reads "Solar on the roof."');
  assert.match(v.json.listing.description, /solar panels/);

  // Over the per minute limit with a short wait: it waits and answers properly.
  next = ["429:0.2", { reply: "Morning. All three are ready.", action: "none", version: 0, ads: [] }];
  const w = await c("POST", `/api/listings/${r.json.listing.id}/messages`, { text: "morning", version: 1 });
  assert.equal(w.json.messages.at(-1).body, "Morning. All three are ready.");
  // A long wait: it says it's busy instead of pretending not to understand.
  next = ["429:40"];
  const busy = await c("POST", `/api/listings/${r.json.listing.id}/messages`, { text: "what do you think of the photos?", version: 1 });
  assert.match(busy.json.messages.at(-1).body, /a lot of messages at once/);
  // "Now?" after that: the model gets the unanswered question and the nudge as one message,
  // without the busy reply in between, so it answers the question.
  next = [{ reply: "They're strong. The porch shot leads.", action: "none", version: 0, ads: [] }];
  const nudge = await c("POST", `/api/listings/${r.json.listing.id}/messages`, { text: "Now?", version: 1 });
  assert.equal(nudge.json.messages.at(-1).body, "They're strong. The porch shot leads.");
  const last = calls.at(-1).body.messages.at(-1);
  assert.equal(last.role, "user");
  assert.match(last.content, /what do you think of the photos\?\s+Now\?/);
  assert.ok(!calls.at(-1).body.messages.some((m) => /a lot of messages/.test(m.content)));
  // Something the rules can do still gets done.
  next = ["429:40"];
  const done = await c("POST", `/api/listings/${r.json.listing.id}/messages`, { text: "make version 3 shorter", version: 3 });
  assert.equal(done.json.messages.at(-1).body, "**Ad 3** is shorter.");
});

test("Groq writes the first ads: its own ideas and names, checked against the facts; ads can be added and removed", async () => {
  const c = client(app);
  await c("POST", "/api/signup", { email: "groq2@test.com", password: "password123", invite: "EARLY1", name: "Dana Reyes" });
  const LISTING = { address: "412 Oak Street", city: "Austin", area: "Riverside", price: 649000, beds: 3, baths: 2, sqft: 0, home_type: "craftsman", open_house: "", features: ["porch"] };
  const a = (version, name, overlay, primary_text) => ({ version, name, kind: "life", headline: name, primary_text, overlay, kicker: "Just listed", photo_number: 0 });
  const set = (ads) => ({ insight: "The porch is the thing.", ads, reply: "The porch is the thing here, so **Wraparound porch** leads with it and **Under $650K** makes the price concrete." });
  next = [
    { listing: LISTING, photo_labels: [], photo_notes: [], missing: "" },
    // The first try adds granite nobody mentioned; the fact check asks again.
    set([a(1, "Wraparound porch", "Slow mornings on the porch.", "Granite counters inside. Book a showing."), a(2, "Under $650K", "Under $650K in Riverside.", "3 beds, 2 baths. Book a showing.")]),
    set([a(1, "Wraparound porch", "Slow mornings on the porch.", "A porch made for slow mornings. Book a showing."), a(2, "Under $650K", "Under $650K in Riverside.", "3 beds, 2 baths. Book a showing.")]),
  ];
  const before = calls.length;
  const r = await c("POST", "/api/listings", { text: "Just listed: 412 Oak Street in Riverside, Austin. 3 bed 2 bath craftsman with a wraparound porch. $649,000. Just two ads please" });
  assert.equal(calls.length - before, 3);
  assert.match(calls.at(-1).body.messages.at(-1).content, /granite/i, "the retry says what was wrong");
  assert.deepEqual(r.json.ads.map((x) => x.name), ["Wraparound porch", "Under $650K"]);
  assert.ok(!r.json.ads.some((x) => /granite/i.test(x.primary_text)));
  assert.match(r.json.messages.find((m) => m.kind === "ads").body, /\*\*Wraparound porch\*\*/);
  const id = r.json.listing.id;

  // One more, about the kitchen: the third free ad.
  next = [{ reply: "Added **The kitchen**.", action: "add_ads", version: 3, remove: [], ads: [{ ...a(3, "The kitchen", "Dinners around the island.", "Room to cook. Book a showing."), kind: "feature", style: {} }] }];
  const add = await c("POST", `/api/listings/${id}/messages`, { text: "add one about the kitchen", version: 1 });
  assert.deepEqual(add.json.ads.map((x) => x.name), ["Wraparound porch", "Under $650K", "The kitchen"]);
  assert.equal(add.json.focus, 3);
  assert.equal(add.json.messages.at(-1).data.snapshot.length, 1);
  // A fourth is the paid plan.
  next = [{ reply: "Here's another.", action: "add_ads", version: 4, remove: [], ads: [{ ...a(4, "The street", "Oak trees out front.", "Book a showing."), style: {} }] }];
  const more = await c("POST", `/api/listings/${id}/messages`, { text: "one more ad", version: 1 });
  assert.equal(more.json.messages.at(-1).kind, "upgrade");
  assert.equal(more.json.ads.length, 3);
  // Removing one.
  next = [{ reply: "", action: "remove_ads", version: 2, remove: [2], ads: [] }];
  const rm = await c("POST", `/api/listings/${id}/messages`, { text: "get rid of the price one", version: 2 });
  assert.deepEqual(rm.json.ads.map((x) => [x.version, x.name]), [[1, "Wraparound porch"], [2, "The kitchen"]], "numbered again from 1");
  assert.equal(rm.json.messages.at(-1).body, "Removed **Ad 2**. What was Ad 3 is now Ad 2.");
});

test("listings sent at the same moment can't get past the 3 free ads", async () => {
  // A slow model, like the live one: each request waits for an answer between counting the
  // free ads left and saving new ones.
  const c = client(app);
  await c("POST", "/api/signup", { email: "race@test.com", password: "password123", invite: "EARLY1" });
  next = [];
  delay = 150;
  const text = (n) => ({ text: `${n} Elm St, Austin, 3 bed 2 bath, $585,000, big back yard` });
  await Promise.all([c("POST", "/api/listings", text(12)), c("POST", "/api/listings", text(14)), c("POST", "/api/listings", text(16))]);
  delay = 0;
  const me = (await c("GET", "/api/me")).json;
  assert.ok(me.usage.adsMade <= 3, `made ${me.usage.adsMade} ads on the free plan`);
});

test("\"do the same for ad 1 and 3\" really does it, and a reply never claims a change that didn't happen", async () => {
  const c = client(app);
  await c("POST", "/api/signup", { email: "same@test.com", password: "password123", invite: "EARLY1", name: "Ismael" });
  next = [500, 500];
  const l = await c("POST", "/api/listings", { text: "12 Elm St, Austin, 3 bed 2 bath, $585,000, big back yard" });
  const id = l.json.listing.id;
  const ad = (v) => ({ ...l.json.ads.find((x) => x.version === v), kind: "life", photo_number: 0 });
  const style = (o) => ({ bg: "", accent: "", text: "", font: "", layout: "", size: 0, align: "", focus: "", fade: "", reset: false, ...o });
  const turn = (reply, ads) => ({ reply, action: "revise", version: 0, remove: [], moment: "none", ads, listing_patch: null, budget: 0, days: 0 });

  next = [turn("**Ad 2** now has a grey background.", [{ ...ad(2), style: style({ bg: "#5F6368" }) }])];
  const one = await c("POST", `/api/listings/${id}/messages`, { text: "change for ad 2 into grey color background", version: 1 });
  assert.equal(one.json.ads.find((x) => x.version === 2).style.bg, "#5F6368");

  // What the live model sent on 2026-10-27: the grey, plus a stray reset that used to wipe it.
  next = [turn("Ad 1 and Ad 3 now use a grey background.", [{ ...ad(1), style: style({ bg: "#5F6368", reset: true }) }, { ...ad(3), style: style({ bg: "#5F6368", reset: true }) }])];
  const two = await c("POST", `/api/listings/${id}/messages`, { text: "now do the same for ad 1 and 3", version: 1 });
  assert.deepEqual(two.json.ads.map((x) => x.style.bg), ["#5F6368", "#5F6368", "#5F6368"]);

  // The model forgets the look entirely: "the same" still means the last change.
  next = [turn("Done, grey on Ad 1 too.", [{ ...ad(1), style: style({ bg: "" }) }])];
  await c("POST", `/api/listings/${id}/style`, { versions: [1], style: { bg: "" } });
  const back = await c("PATCH", `/api/listings/${id}/style`, { versions: [1], style: { bg: null } });
  assert.equal(back.json.ads[0].style.bg, undefined);
  const three = await c("POST", `/api/listings/${id}/messages`, { text: "same for ad 1", version: 1 });
  assert.equal(three.json.ads[0].style.bg, "#5F6368");

  // A claimed change that changes nothing is never reported as done.
  next = [turn("Ad 3 now has a gold label.", [{ ...ad(3), style: style({ accent: "" }) }])];
  const none = await c("POST", `/api/listings/${id}/messages`, { text: "make ad 3 look nicer", version: 3 });
  assert.doesNotMatch(none.json.messages.at(-1).body, /now has a gold label/);
});

test("without the model, \"the same for ad 1\" repeats the last look change", async () => {
  const c = client(app);
  await c("POST", "/api/signup", { email: "same2@test.com", password: "password123", invite: "EARLY1" });
  next = [500, 500];
  const l = await c("POST", "/api/listings", { text: "12 Elm St, Austin, 3 bed 2 bath, $585,000, big back yard" });
  const id = l.json.listing.id;
  next = [500, 500, 500];
  await c("POST", `/api/listings/${id}/messages`, { text: "make ad 2 navy", version: 1 });
  next = [500, 500, 500];
  const r = await c("POST", `/api/listings/${id}/messages`, { text: "do the same for ad 1 and 3", version: 1 });
  assert.deepEqual(r.json.ads.map((x) => x.style.bg), ["#1F2A44", "#1F2A44", "#1F2A44"]);
});

test("\"no you didn't\" gets the ads' real look, not an apology for a change that happened", async () => {
  const c = client(app);
  await c("POST", "/api/signup", { email: "didnt@test.com", password: "password123", invite: "EARLY1" });
  next = [500, 500];
  const l = await c("POST", "/api/listings", { text: "12 Elm St, Austin, 3 bed 2 bath, $585,000, big back yard" });
  const id = l.json.listing.id;
  next = [500, 500, 500];
  await c("POST", `/api/listings/${id}/messages`, { text: "make all three grey", version: 1 });
  next = [{ reply: "You're right, I didn't apply it yet. Let me fix that now.", action: "none", version: 0, remove: [], moment: "none", ads: [], listing_patch: null, budget: 0, days: 0 }];
  const r = await c("POST", `/api/listings/${id}/messages`, { text: "no you didn't lol?", version: 1 });
  const body = r.json.messages.at(-1).body;
  assert.doesNotMatch(body, /let me fix/i);
  assert.match(body, /All three ads have a grey background/);
});

test("\"the same\" in a chat from before looks were remembered copies the ad that was just changed", async () => {
  const c = client(app);
  await c("POST", "/api/signup", { email: "oldchat@test.com", password: "password123", invite: "EARLY1" });
  next = [500, 500];
  const l = await c("POST", "/api/listings", { text: "12 Elm St, Austin, 3 bed 2 bath, $585,000, big back yard" });
  const id = l.json.listing.id;
  const ad = (v) => ({ ...l.json.ads.find((x) => x.version === v), kind: "life", photo_number: 0 });
  const style = (o) => ({ bg: "", accent: "", text: "", font: "", layout: "", size: 0, align: "", focus: "", fade: "", reset: false, ...o });
  const turn = (reply, ads) => ({ reply, action: "revise", version: 0, remove: [], moment: "none", ads, listing_patch: null, budget: 0, days: 0 });
  // Ad 2 went grey with nothing kept on a reply, like Ismael's chat from before 2026-10-27.
  await c("PATCH", `/api/listings/${id}/style`, { versions: [2], style: { bg: "#5F6368" } });
  // The model sends no look at all: the change still comes from Ad 2.
  // It also rewrote the words, which nobody asked for: they stay as they were.
  next = [turn("Ad 1 updated to focus on the low price.", [{ ...ad(1), overlay: "Rewritten for no reason.", style: style({}) }, { ...ad(3), style: style({}) }])];
  const r = await c("POST", `/api/listings/${id}/messages`, { text: "I said now do the fucking same for ads 1 and 3 asshole!", version: 1 });
  assert.deepEqual(r.json.ads.map((x) => x.style.bg), ["#5F6368", "#5F6368", "#5F6368"]);
  assert.equal(r.json.ads[0].overlay, l.json.ads[0].overlay);
  assert.match(r.json.messages.at(-1).body, /grey background/);
  assert.doesNotMatch(r.json.messages.at(-1).body, /didn't change anything/);
});

test("exact edits: a dictated line goes in as typed, only the line changes, and the full stop comes off and stays off", async () => {
  const c = client(app);
  await c("POST", "/api/signup", { email: "exact@test.com", password: "password123", invite: "EARLY1" });
  next = [500, 500];
  const l = await c("POST", "/api/listings", { text: "12 Elm St, Austin, 3 bed 2 bath, $585,000, big back yard" });
  const id = l.json.listing.id;
  const three = l.json.ads[2];
  const calls0 = calls.length;
  // Dictated: no model call, only Ad 3's line changes, exactly as typed.
  const d = await c("POST", `/api/listings/${id}/messages`, { text: `change the text of ${three.overlay.replace(/\.$/, "").toLowerCase()} to $10,000/mo`, version: 1 });
  assert.equal(calls.length, calls0, "no model call for an exact edit");
  assert.equal(d.json.ads[2].overlay, "$10,000/mo");
  assert.equal(d.json.ads[2].primary_text, three.primary_text);
  assert.equal(d.json.messages.at(-1).body, 'On **Ad 3**, the line on the photo now reads "$10,000/mo".');
  // A described change isn't taken literally.
  next = [500, 500, 500];
  const m = await c("POST", `/api/listings/${id}/messages`, { text: "change the line to mention the yard", version: 1 });
  assert.notEqual(m.json.ads[0].overlay, "mention the yard");
  // The full stop comes off Ad 1, and a later model edit that echoes the line doesn't put it back.
  const dot = await c("POST", `/api/listings/${id}/messages`, { text: "remove the dot", version: 1 });
  assert.doesNotMatch(dot.json.ads[0].overlay, /\.$/);
  const line = dot.json.ads[0].overlay;
  const turn = (ads) => ({ reply: "Ad 1 is navy now.", action: "revise", version: 1, remove: [], moment: "none", ads, listing_patch: null, budget: 0, days: 0 });
  next = [turn([{ ...dot.json.ads[0], kind: "life", photo_number: 0, overlay: line, style: { bg: "#1F2A44", accent: "", text: "", font: "", layout: "", size: 0, align: "", focus: "", fade: "", reset: false } }])];
  const navy = await c("POST", `/api/listings/${id}/messages`, { text: "make ad 1 navy", version: 1 });
  assert.equal(navy.json.ads[0].overlay, line);
  assert.equal(navy.json.messages.at(-1).body, "**Ad 1** now has a navy background.");
});

test("a reply never claims an old change as new", async () => {
  const c = client(app);
  await c("POST", "/api/signup", { email: "claims@test.com", password: "password123", invite: "EARLY1" });
  next = [500, 500];
  const l = await c("POST", "/api/listings", { text: "12 Elm St, Austin, 3 bed 2 bath, $585,000, big back yard" });
  next = [{ reply: "I set both Ad 1 and Ad 3 to a grey background and removed the period.", action: "none", version: 0, remove: [], moment: "none", ads: [], listing_patch: null, budget: 0, days: 0 }];
  const r = await c("POST", `/api/listings/${l.json.listing.id}/messages`, { text: "wtf are you saying mannnn", version: 1 });
  const body = r.json.messages.at(-1).body;
  assert.doesNotMatch(body, /I set both/);
  assert.match(body, /haven't changed anything/);
});

test("the agent's photo on an ad: asks for it first when there isn't one, puts it on when there is, and Hopkins never blames \"the platform\"", async () => {
  const c = client(app);
  await c("POST", "/api/signup", { email: "face@test.com", password: "password123", invite: "EARLY1" });
  next = [500, 500];
  const l = await c("POST", "/api/listings", { text: "12 Elm St, Austin, 3 bed 2 bath, $585,000, big back yard" });
  const id = l.json.listing.id;
  const ad = (v) => ({ ...l.json.ads.find((x) => x.version === v), kind: "life", photo_number: 0 });
  const style = (o) => ({ bg: "", accent: "", text: "", font: "", layout: "", size: 0, align: "", focus: "", fade: "", face: "", reset: false, ...o });
  const turn = (reply, ads) => ({ reply, action: ads.length ? "revise" : "none", version: 0, remove: [], moment: "none", ads, listing_patch: null, budget: 0, days: 0 });
  // No photo of them yet: nothing goes on, and the reply says where to add one.
  next = [turn("The platform only lets me use the photos you already uploaded.", [])];
  const no = await c("POST", `/api/listings/${id}/messages`, { text: "can you add a picture of my face in the bottom right", version: 1 });
  assert.doesNotMatch(no.json.messages.at(-1).body, /platform/i);
  assert.match(no.json.messages.at(-1).body, /Settings, Profile/);
  assert.ok(no.json.ads.every((x) => x.style.face !== "on"));
  // With their photo added, the model's face: on goes through and the reply says so.
  const av = await c("POST", "/api/photos", { data: TINY_JPEG, mime: "image/jpeg", kind: "avatar", name: "me.jpg" });
  await c("PATCH", "/api/account", { avatar_id: av.json.id });
  next = [turn("Done.", [{ ...ad(1), style: style({ face: "on" }) }])];
  const yes = await c("POST", `/api/listings/${id}/messages`, { text: "now add my face in the bottom right of ad 1", version: 1 });
  assert.equal(yes.json.ads[0].style.face, "on");
  assert.match(yes.json.messages.at(-1).body, /\*\*Ad 1\*\* now has your photo in the bottom right corner/);
  // Without the model, the rules read it too.
  next = [500, 500, 500];
  const rules = await c("POST", `/api/listings/${id}/messages`, { text: "put my headshot on ad 2", version: 2 });
  assert.equal(rules.json.ads[1].style.face, "on");
});

test("a copied line keeps its own punctuation, and asking for a face in the bottom right isn't a layout change", async () => {
  const c = client(app);
  await c("POST", "/api/signup", { email: "copy@test.com", password: "password123", invite: "EARLY1" });
  next = [500, 500];
  const l = await c("POST", "/api/listings", { text: "12 Elm St, Austin, 3 bed 2 bath, $585,000, big back yard" });
  const id = l.json.listing.id;
  const three = l.json.ads[2];
  // "close to ..." style lines: the dictated split comes after the ad's real line.
  const said = `change the text of ${three.overlay.replace(/\.$/, "").toLowerCase()} to santa monica to $10,000/mo`;
  const d = await c("POST", `/api/listings/${id}/messages`, { text: said, version: 1 });
  assert.equal(d.json.ads[2].overlay, "santa monica to $10,000/mo");
  const again = await c("POST", `/api/listings/${id}/messages`, { text: "change the text of santa monica to $10,000/mo to Near the beach for $10,000/mo", version: 1 });
  assert.equal(again.json.ads[2].overlay, "Near the beach for $10,000/mo");
  const ad = (v) => ({ ...again.json.ads.find((x) => x.version === v), kind: "life", photo_number: 0 });
  const style = (o) => ({ bg: "", accent: "", text: "", font: "", layout: "", size: 0, align: "", focus: "", fade: "", face: "", reset: false, ...o });
  next = [{ reply: "Done.", action: "revise", version: 1, remove: [], moment: "none", ads: [{ ...ad(1), overlay: "Near the beach for $10,000/mo.", style: style({}) }], listing_patch: null, budget: 0, days: 0 }];
  const copy = await c("POST", `/api/listings/${id}/messages`, { text: "now change it for ad 1 too", version: 1 });
  assert.equal(copy.json.ads[0].overlay, "Near the beach for $10,000/mo");
  next = [{ reply: "Done.", action: "revise", version: 1, remove: [], moment: "none", ads: [1, 2, 3].map((v) => ({ ...ad(v), overlay: copy.json.ads[v - 1].overlay, style: style({ layout: "fade" }) })), listing_patch: null, budget: 0, days: 0 }];
  const face = await c("POST", `/api/listings/${id}/messages`, { text: "can you add a picture of my face in the bottom right", version: 1 });
  assert.deepEqual(face.json.ads.map((x) => x.style.layout), copy.json.ads.map((x) => x.style.layout));
  assert.match(face.json.messages.at(-1).body, /^To put your photo on the ads, add it first/);
});

test("thanks never reaches the model, a colour change keeps the words, and the model sees each ad's Leads", async () => {
  const c = client(app);
  await c("POST", "/api/signup", { email: "thanks@test.com", password: "password123", invite: "EARLY1", name: "Dana Reyes" });
  next = [500, 500];
  const r = await c("POST", "/api/listings", { text: "14 Elm St, Austin, 3 bed 2 bath, $585,000, big back yard" });
  const id = r.json.listing.id;
  const before = calls.length;
  const t = await c("POST", `/api/listings/${id}/messages`, { text: "thanks!", version: 1 });
  assert.equal(calls.length, before, "no model call");
  assert.equal(t.json.messages.at(-1).body, "Anytime.");
  const ad2 = r.json.ads.find((a) => a.version === 2);
  next = [{ reply: "Ad 2 is navy now, with a new caption.", action: "revise", ads: [{ version: 2, primary_text: "A brand new caption.", headline: "New headline", style: { bg: "#1F2A44" } }] }];
  const n = await c("POST", `/api/listings/${id}/messages`, { text: "make ad 2 navy", version: 2 });
  const after = n.json.ads.find((a) => a.version === 2);
  assert.deepEqual([after.primary_text, after.headline, after.overlay], [ad2.primary_text, ad2.headline, ad2.overlay]);
  assert.ok(after.style.bg, "the colour still changes");
  assert.doesNotMatch(n.json.messages.at(-1).body, /caption/);
  next = [{ reply: "None yet, too early to say.", action: "none", ads: [] }];
  await c("POST", `/api/listings/${id}/messages`, { text: "which ad is doing best?", version: 1 });
  assert.match(calls.at(-1).body.messages[0].content, /Leads so far: 0/);
});

test("a link the site won't let Hopkins read: it names the site, never says it can't open links", async (t) => {
  const c = client(app);
  await c("POST", "/api/signup", { email: "blocked@test.com", password: "password123", invite: "EARLY1", name: "Dana Reyes" });
  // The site answers 403, like idealista does for any app.
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, status: 403, text: async () => "blocked" });
  t.after(() => { globalThis.fetch = realFetch; });
  next = [500, 500, 500];
  const r = await c("POST", "/api/listings", { text: "https://www.idealista.com/inmueble/111452225/" });
  assert.equal(r.status, 200);
  const id = r.json.listing.id;
  const first = (await c("GET", `/api/listings/${id}`)).json.messages.at(-1).body;
  assert.match(first, /^idealista\.com blocks apps from reading its listings/);
  // Questions get the same true answer without the model, never "I can't browse".
  const before = calls.length;
  const why = await c("POST", `/api/listings/${id}/messages`, { text: "why can't you open it", version: 1 });
  assert.equal(calls.length, before);
  assert.match(why.json.messages.at(-1).body, /^idealista\.com blocks apps from reading its listings; Zillow and most brokerage sites don't/);
  const again = await c("POST", `/api/listings/${id}/messages`, { text: "I sent you a Zillow listing earlier and you opened it", version: 1 });
  assert.match(again.json.messages.at(-1).body, /^Paste the description from idealista\.com/);
  // Facts go to the model as usual, and it hears the truth about links too.
  next = [{ reply: "Got it.", action: "update_listing", ads: [], listing_patch: { price: 1250000, beds: 3, baths: 2 } }];
  await c("POST", `/api/listings/${id}/messages`, { text: "3 bed 2 bath flat, €1,250,000", version: 1 });
  assert.match(calls.at(-1).body.messages[0].content, /Never say you can't browse or open links/);
});

test("Stop: the agent's message stays, the reply never comes, and the ads go back as they were", async () => {
  const c = client(app);
  await c("POST", "/api/signup", { email: "stop@test.com", password: "password123", invite: "EARLY1", name: "Dana Reyes" });
  next = [500, 500, 500];
  const r = await c("POST", "/api/listings", { text: "21 Birch Rd, Austin, 3 bed 2 bath, $540,000, big kitchen" });
  const id = r.json.listing.id;
  const before = r.json.ads.map((a) => [a.version, a.overlay, a.style?.bg || null]);
  // The model takes a while and would rewrite Ad 1; Stop comes while it's still working.
  delay = 600;
  next = [{ reply: "Ad 1 now says Room for everyone.", action: "revise", version: 1, ads: [{ version: 1, overlay: "Room for everyone.", style: { bg: "#2F5D46" } }] }];
  const sending = c("POST", `/api/listings/${id}/messages`, { text: "make ad 1 green and change the line", version: 1 });
  await new Promise((res) => setTimeout(res, 150));
  const stop = await c("POST", `/api/listings/${id}/stop`, {});
  const sent = await sending;
  delay = 0;
  assert.equal(stop.json.stopped, true);
  assert.equal(sent.json.stopped, true);
  const now = (await c("GET", `/api/listings/${id}`)).json;
  assert.equal(now.messages.at(-1).role, "agent");
  assert.equal(now.messages.at(-1).body, "make ad 1 green and change the line");
  assert.deepEqual(now.ads.map((a) => [a.version, a.overlay, a.style?.bg || null]), before);
  // The next message works as normal, and the model never sees the stopped request.
  next = [{ reply: "Ad 2, the kitchen sells it.", action: "none", version: 2, ads: [] }];
  const after = await c("POST", `/api/listings/${id}/messages`, { text: "which one would you keep?", version: 1 });
  assert.equal(after.json.messages.at(-1).body, "Ad 2, the kitchen sells it.");
  assert.ok(!calls.at(-1).body.messages.some((m) => /make ad 1 green/.test(m.content)));
});

test("Stop while a listing is being made: no listing, nothing counted", async () => {
  const c = client(app);
  await c("POST", "/api/signup", { email: "stopnew@test.com", password: "password123", invite: "EARLY1" });
  const made = (await c("GET", "/api/me")).json.usage.adsMade;
  delay = 600;
  next = [500, 500, 500, 500];
  const making = c("POST", "/api/listings", { text: "7 Cedar Ln, Austin, 4 bed 3 bath, $720,000" });
  await new Promise((res) => setTimeout(res, 150));
  const stop = await c("POST", "/api/new/stop", {});
  const res = await making;
  delay = 0;
  assert.equal(stop.json.stopped, true);
  assert.equal(res.json.stopped, true);
  assert.equal((await c("GET", "/api/listings")).json.listings.length, 0);
  assert.equal((await c("GET", "/api/me")).json.usage.adsMade, made);
});
