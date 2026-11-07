import { test } from "node:test";
import assert from "node:assert/strict";
import { boot, client } from "./helpers.js";

// Hopkins makes what's asked, like Claude would: "a carousel for first time buyers" gets a
// carousel, "an animated reel" gets a reel, and nothing is made that wasn't asked for.
const app = await boot();
const hopkins = await import("../src/hopkins.js");
const asked = [];
hopkins.setCreationForTests(async (req) => {
  asked.push(req);
  const n = req.kind === "post" ? 1 : req.kind === "story" ? 2 : 6;
  const slides = Array.from({ length: n }, (_, i) => ({ heading: req.previous ? `Shorter ${i + 1}` : `Slide ${i + 1}`, body: i === 1 && /couples/.test(req.request) ? "Perfect for couples" : `Point ${i + 1}`, photo: false }));
  return { title: "First time buyers", caption: "Save this for later.", theme: "night", slides, reply: req.previous ? "Shorter now." : `Here's your ${req.kind}.` };
});

async function signup(email) {
  const c = client(app);
  await c("POST", "/api/signup", { email, password: "password123", invite: "EARLY1", name: "Sam Ellery" });
  return c;
}

test("what was asked for is what's made, read the way a person would", () => {
  const k = hopkins.creationKind;
  assert.equal(k("make me a carousel post for my real estate content"), "carousel");
  assert.equal(k("an animated reel educating first time home buyers"), "reel");
  assert.equal(k("Can you do a story for the open house"), "story");
  assert.equal(k("write a post about the Austin market"), "post");
  assert.equal(k("should I post a reel this week?"), null);
  assert.equal(k("what makes a good carousel"), null);
  assert.equal(k("make ads for it"), null);
  assert.equal(k("hello"), null);
});

test("a carousel and a reel in a plain chat, a change to the one just made, and fair housing", async () => {
  const c = await signup("make@ellery.test");
  const s = await c("POST", "/api/listings/start", { text: "Make me a carousel for first time home buyers" });
  const f = await c("POST", `/api/listings/${s.json.listing.id}/first`, {});
  assert.equal(f.json.ads.length, 0);
  assert.equal(f.json.creations.length, 1);
  assert.equal(f.json.creations[0].kind, "carousel");
  assert.equal(f.json.creations[0].spec.slides.length, 6);
  const msg = f.json.messages.at(-1);
  assert.equal(msg.kind, "creation");
  assert.equal(msg.body, "Here's your carousel. Want a caption and hashtags for it?");
  assert.equal(f.json.creations[0].spec.caption, "", "no caption until asked");
  assert.equal(msg.data.creationId, f.json.creations[0].id);
  assert.equal(asked.at(-1).listing, null);

  // "make it shorter" changes that carousel, it doesn't make a new thing.
  const r = await c("POST", `/api/listings/${s.json.listing.id}/messages`, { text: "make the headings shorter" });
  assert.equal(r.json.creations.length, 1);
  assert.equal(r.json.creations[0].version, 2);
  assert.match(r.json.creations[0].spec.slides[0].heading, /^Shorter/);
  assert.ok(asked.at(-1).previous);

  // A reel in the same chat is a new thing.
  const v = await c("POST", `/api/listings/${s.json.listing.id}/messages`, { text: "now an animated reel educating first time buyers, perfect for couples" });
  assert.equal(v.json.creations.length, 2);
  assert.equal(v.json.creations[1].kind, "reel");
  assert.match(v.json.messages.at(-1).body, /fair housing/);

  // A question about it is answered, not turned into a new version.
  const q = await c("POST", `/api/listings/${s.json.listing.id}/messages`, { text: "what time should I post it?" });
  assert.equal(q.json.creations.length, 2);
  assert.equal(q.json.creations[1].version, 1);
});

test("every version stays in the chat, and the first one can be brought back", async () => {
  const c = await signup("versions@ellery.test");
  const s = await c("POST", "/api/listings/start", { text: "Make me an animated reel about the Austin market this month" });
  const f = await c("POST", `/api/listings/${s.json.listing.id}/first`, {});
  const first = f.json.creations[0].spec.slides[0].heading;
  const r = await c("POST", `/api/listings/${s.json.listing.id}/messages`, { text: "make it more entertaining, it's too boring" });
  assert.equal(r.json.creations[0].version, 2);
  assert.notEqual(r.json.creations[0].spec.theme, f.json.creations[0].spec.theme, "a redo never comes back in the same look");
  assert.match(r.json.messages.at(-1).body, /^New version: a .+ look, a new hook/);
  const made = r.json.messages.filter((m) => m.kind === "creation");
  assert.equal(made.length, 2);
  assert.equal(made[0].data.spec.slides[0].heading, first, "the first message still holds the first version");
  assert.notEqual(made[1].data.spec.slides[0].heading, first);
  const b = await c("POST", `/api/listings/${s.json.listing.id}/messages`, { text: "bring back the first one" });
  assert.equal(b.json.creations[0].version, 3);
  assert.equal(b.json.creations[0].spec.slides[0].heading, first);
  assert.equal(b.json.messages.at(-1).body, "Here's the first version back.");
});

test("a property on its own is read back and Hopkins asks what to make; a post for it uses its facts", async () => {
  const c = await signup("prop@ellery.test");
  const s = await c("POST", "/api/listings/start", { text: "12 Elm St, Austin, TX. 3 bed 2 bath, $585,000" });
  const f = await c("POST", `/api/listings/${s.json.listing.id}/first`, {});
  assert.equal(f.json.ads.length, 0);
  assert.equal(f.json.creations.length, 0);
  assert.match(f.json.messages.at(-1).body, /What should I make for it/);
  const p = await c("POST", `/api/listings/${s.json.listing.id}/messages`, { text: "make a post for it" });
  assert.equal(p.json.creations[0].kind, "post");
  assert.equal(asked.at(-1).listing.address, "12 Elm St");
  assert.equal(asked.at(-1).listing.price, "$585,000");
});

test("the free plan is 3 things in all: creations and ads count together", async () => {
  const c = await signup("free@ellery.test");
  const s = await c("POST", "/api/listings/start", { text: "make a post about spring in Austin" });
  await c("POST", `/api/listings/${s.json.listing.id}/first`, {});
  await c("POST", `/api/listings/${s.json.listing.id}/messages`, { text: "make a story about it too" });
  assert.equal((await c("GET", "/api/me")).json.usage.adsMade, 2);
  await c("POST", `/api/listings/${s.json.listing.id}/messages`, { text: "and a carousel on the same" });
  assert.equal((await c("GET", "/api/me")).json.usage.adsMade, 3);
  const over = await c("POST", `/api/listings/${s.json.listing.id}/messages`, { text: "now a reel" });
  assert.equal(over.json.creations.length, 3);
  assert.equal(over.json.messages.at(-1).kind, "upgrade");
  // Changes to one already made are included.
  const change = await c("POST", `/api/listings/${s.json.listing.id}/messages`, { text: "make the carousel headings shorter" });
  assert.equal(change.json.creations.at(-1).version, 2);
  assert.equal(change.json.messages.at(-1).kind, "creation");
  // A new one, asked for in so many words, is new: over the limit.
  const fresh = await c("POST", `/api/listings/${s.json.listing.id}/messages`, { text: "make another carousel about summer" });
  assert.equal(fresh.json.messages.at(-1).kind, "upgrade");
});

test("a caption and hashtags only when asked: yes to the question, or asked in words", async () => {
  hopkins.setCaptionForTests(async ({ spec }) => `Save this before you start.\n\n#FirstTimeBuyer #AustinHomes`);
  const c = await signup("caption@ellery.test");
  const s = await c("POST", "/api/listings/start", { text: "make me a carousel for first time buyers" });
  await c("POST", `/api/listings/${s.json.listing.id}/first`, {});
  const y = await c("POST", `/api/listings/${s.json.listing.id}/messages`, { text: "yes please" });
  assert.match(y.json.messages.at(-1).body, /#FirstTimeBuyer/);
  assert.equal(y.json.creations[0].version, 1, "the carousel itself didn't change");
  assert.match(y.json.creations[0].spec.caption, /Save this/);
  // A yes to anything else isn't a caption request.
  const t = await c("POST", "/api/listings/start", { text: "make a post about spring in Austin" });
  await c("POST", `/api/listings/${t.json.listing.id}/first`, {});
  await c("POST", `/api/listings/${t.json.listing.id}/messages`, { text: "make the heading shorter" });
  const no = await c("POST", `/api/listings/${t.json.listing.id}/messages`, { text: "yes" });
  assert.equal(no.json.creations[0].spec.caption, "");
  // Asked for in words, any time.
  const w = await c("POST", `/api/listings/${t.json.listing.id}/messages`, { text: "write me a caption with hashtags for it" });
  assert.match(w.json.creations[0].spec.caption, /Save this/);
});

test("a greeting opens a chat only, and a time of day only when it's the right one", async () => {
  const { localNow } = hopkins;
  assert.match(localNow("Europe/Dublin"), /^Their local time now: .* \(Europe\/Dublin\)\.$/);
  assert.equal(localNow("UTC"), "");
});

test("Plan my week asks first, then lays out a calendar to change in words, and only then makes the posts", async () => {
  const c = await signup("plan@ellery.test");
  await c("PUT", "/api/brand", { post_often: "3", styles: "Buyer tips, Local spots, Just listed", area: "Austin, Texas", content_style: "both", profiled: "yes" });
  assert.equal((await c("GET", "/api/week")).json.status, "none");
  const start = (await c("POST", "/api/week/start", {})).json;
  assert.equal(start.status, "asking");
  let chat = (await c("GET", `/api/listings/${start.chat}`)).json;
  assert.match(chat.messages.at(-1).body, /A few quick questions/);
  assert.equal((await c("GET", "/api/week")).json.posts.length, 0, "nothing is made before they answer");
  // their answers: a calendar comes back, nothing made yet
  const a = (await c("POST", `/api/listings/${start.chat}/messages`, { text: "No listings. Open house Saturday 1 to 3 at 4503 Avenue F. The school fair is on." })).json;
  const cal = a.messages.at(-1);
  assert.equal(cal.kind, "calendar");
  assert.deepEqual(cal.data.plan.map((p) => p.day), [0, 2, 4], "3 a week: Monday, Wednesday, Friday");
  assert.equal((await c("GET", "/api/week")).json.status, "proposed");
  assert.equal((await c("GET", "/api/week")).json.posts.length, 0);
  // a change in words is a new calendar, still nothing made
  const ch = (await c("POST", `/api/listings/${start.chat}/messages`, { text: "swap Wednesday for a reel" })).json;
  assert.equal(ch.messages.at(-1).kind, "calendar");
  assert.equal(ch.creations.length, 0);
  // go: the posts are made from the calendar
  await c("POST", `/api/listings/${start.chat}/messages`, { text: "looks good" });
  let w;
  for (let i = 0; i < 80; i++) { w = (await c("GET", "/api/week")).json; if (w.status === "ready") break; await new Promise((r) => setTimeout(r, 25)); }
  assert.equal(w.status, "ready");
  assert.deepEqual(w.posts.map((p) => p.day), [0, 2, 4]);
  assert.ok(asked.some((r) => /Austin, Texas/.test(r.request) && /school fair/.test(r.request)), "their city and what they said about the week");
  chat = (await c("GET", `/api/listings/${start.chat}`)).json;
  assert.equal(chat.messages.at(-1).kind, "weekready");
  assert.equal((await c("POST", "/api/week/start", {})).json.chat, start.chat, "the same week opens again");
  // a change to one day's post keeps its day
  const thu = (await c("POST", `/api/listings/${start.chat}/messages`, { text: "make Wednesday's post shorter" })).json;
  const wed = thu.creations.find((x) => x.spec.plan?.day === 2);
  assert.equal(wed.version, 2);
  assert.equal((await c("POST", "/api/week/approve", {})).json.status, "approved");
});
