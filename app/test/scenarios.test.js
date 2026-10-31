import { test } from "node:test";
import assert from "node:assert/strict";
import { boot, client } from "./helpers.js";

// The scenario suite (docs/ASKS.md): real things agents say, in the ways they say them, against
// every state a listing can be in. The model here is hostile on purpose: for each message it
// answers with the wrong action (a new plan when asked to stop, deleting ads nobody asked to
// delete, a budget change on a question). Whatever it says, the agent's words have to win.
// Lesson behind it (2026-10-31): "Stop the ad" once made a new plan and "No stop them!" deleted
// all three ads.
const app = await boot({ ANTHROPIC_API_KEY: "", GEMINI_API_KEY: "", GROQ_API_KEY: "test-groq", GROQ_BACKUP_MODELS: "" });
const brain = await import("../src/brain.js");
const { run, get } = await import("../src/db.js");

let hostile = null;
const spec = { title: "First time buyers", caption: "Save this.", theme: "night", slides: [{ heading: "One", body: "Two", photo: false }], reply: "Here it is." };
const turn = (o) => ({ reply: "", action: "none", version: 0, remove: [], moment: "none", ads: [], listing_patch: null, budget: 0, days: 0, ...o });
brain.setFetchForTests(async (url, init) => {
  const body = JSON.parse(init.body);
  const system = body.messages?.[0]?.content || "";
  let out = null;
  if (/You name chats/.test(system)) out = { title: "Test chat" };
  else if (/make Instagram content/.test(system)) out = spec;
  else if (/"select_version"/.test(system)) out = hostile ? turn(hostile) : turn({ reply: "Sure." });
  else if (/"is_listing"/.test(system)) out = { is_listing: false, reply: "Here's the answer." };
  else if (/"reply"/.test(system) && !/"ads"/.test(system)) out = { reply: "Here's the answer." };
  if (!out) return { ok: false, status: 500, text: async () => "down" };
  return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(out) } }] }) };
});

let n = 0;
async function agent() {
  const c = client(app);
  await c("POST", "/api/signup", { email: `scenario${++n}@ellery.test`, password: "password123", invite: "EARLY1", name: "Sam Ellery" });
  await run(`UPDATE workspaces SET plan = 'paid' WHERE id = ?`, [(await c("GET", "/api/me")).json.workspace.id]);
  return c;
}
async function withAds() {
  const c = await agent();
  hostile = null;
  const l = await c("POST", "/api/listings", { text: "412 Oak Street, Austin, TX. 3 bed 2 bath, $649,000, big back yard" });
  return { c, id: l.json.listing.id };
}
async function running() {
  const s = await withAds();
  const plan = await s.c("POST", `/api/listings/${s.id}/run`, { versions: [1, 2, 3], budget: 200, days: 10 });
  await s.c("POST", `/api/listings/${s.id}/run`, { confirm: plan.json.messages.at(-1).id });
  assert.equal((await s.c("GET", `/api/listings/${s.id}`)).json.listing.run, "running");
  return s;
}
async function paused() {
  const s = await running();
  await s.c("POST", `/api/listings/${s.id}/pause`, {});
  return s;
}
const say = (s, text) => s.c("POST", `/api/listings/${s.id}/messages`, { text });
const plans = (r) => r.json.messages.filter((m) => m.kind === "plan").length;
const budget = async (id) => Number((await get(`SELECT budget FROM launches WHERE listing_id = ? ORDER BY created_at DESC LIMIT 1`, [id])).budget);
// Every reply: something said, and never blaming the platform (Ismael, 2026-10-27).
function sane(r, said) {
  const last = r.json.messages.at(-1);
  assert.equal(last.role, "hopkins", `"${said}" got an answer`);
  assert.ok(last.body.trim(), `"${said}" got words`);
  assert.doesNotMatch(last.body, /\bthe (platform|system)\b/i, `"${said}"`);
}

const WRONG_WHEN_STOPPING = [{ reply: "Here's the plan.", action: "run" }, { reply: "Removed all three.", action: "remove_ads", remove: [1, 2, 3] }, { reply: "Resumed.", action: "resume" }];

test("stopping running ads, however it's said: paused, nothing deleted, no new plan", async () => {
  const phrasings = ["stop the ads", "Stop the ad", "pause them", "kill the ads", "turn them off", "shut it down", "take them down", "stop this active ad", "No stop them!", "please pause everything", "STOP", "can you stop it", "switch the ads off"];
  for (const said of phrasings) {
    for (const wrong of WRONG_WHEN_STOPPING) {
      const s = await running();
      const before = plans(await say(s, "hi"));
      hostile = wrong;
      const r = await say(s, said);
      sane(r, said);
      assert.equal(r.json.listing.run, "paused", `"${said}" with the model saying ${wrong.action}`);
      assert.equal(r.json.ads.length, 3, `"${said}" deleted nothing`);
      assert.equal(plans(r), before, `"${said}" made no plan`);
    }
  }
});

test("starting paused ads again, however it's said", async () => {
  const phrasings = ["resume", "start them again", "turn them back on", "unpause", "run them again", "switch it back on", "don't stop them", "put them back on"];
  for (const said of phrasings) {
    for (const wrong of [{ reply: "Paused.", action: "pause" }, { reply: "Removed.", action: "remove_ads", remove: [1] }]) {
      const s = await paused();
      hostile = wrong;
      const r = await say(s, said);
      sane(r, said);
      assert.equal(r.json.listing.run, "running", `"${said}" with the model saying ${wrong.action}`);
      assert.equal(r.json.ads.length, 3);
    }
  }
});

test("questions about running ads change nothing, whatever the model tries", async () => {
  const questions = ["how are the ads doing?", "when do they stop?", "is it still running?", "how much have I spent?", "which ad is best?", "should I stop them?", "what happens if I pause?"];
  const wrongs = [{ reply: "Paused.", action: "pause" }, { reply: "Removed.", action: "remove_ads", remove: [2] }, { reply: "Here's the plan.", action: "run" }, { reply: "Now $999.", action: "change_run", budget: 999, days: 0 }];
  for (const said of questions) {
    for (const wrong of wrongs) {
      const s = await running();
      const before = await budget(s.id);
      hostile = wrong;
      const r = await say(s, said);
      sane(r, said);
      assert.equal(r.json.listing.run, "running", `"${said}" with the model saying ${wrong.action}`);
      assert.equal(r.json.ads.length, 3, `"${said}" deleted nothing (model: ${wrong.action})`);
      assert.equal(await budget(s.id), before, `"${said}" left the budget alone (model: ${wrong.action})`);
    }
  }
});

test("ads are only removed when the agent says remove or delete", async () => {
  for (const said of ["ad 2 is weak", "I don't love ad 2", "ad 2 is meh", "make ad 2 better", "ad 2 isn't working for me"]) {
    const s = await withAds();
    hostile = { reply: "Removed Ad 2.", action: "remove_ads", remove: [2] };
    const r = await say(s, said);
    sane(r, said);
    assert.equal(r.json.ads.length, 3, `"${said}" kept every ad`);
  }
  for (const said of ["delete ad 2", "remove ad 2", "get rid of ad 2", "bin ad 2", "scrap the second ad"]) {
    const s = await withAds();
    hostile = { reply: "Removed Ad 2.", action: "remove_ads", remove: [2] };
    const r = await say(s, said);
    sane(r, said);
    assert.equal(r.json.ads.length, 2, `"${said}" removed it`);
  }
});

test("changing running ads: the same ads get more money or time, never a new plan", async () => {
  const cases = [["spend $500 instead", 500], ["make it $300", 300], ["double it", 400], ["run it another week", null]];
  for (const [said, want] of cases) {
    const s = await running();
    hostile = { reply: "Here's the plan.", action: "run" };
    const before = plans(await say(s, "hi"));
    const r = await say(s, said);
    sane(r, said);
    assert.equal(plans(r), before, `"${said}" made no new plan`);
    if (want) assert.equal(await budget(s.id), want, `"${said}"`);
    else assert.ok((await budget(s.id)) > 200, `"${said}" kept the same spend a day for longer`);
  }
});

test("asked for a post, carousel, story or reel: it's made; asked about one, or for words, it's answered", async () => {
  const makes = [
    ["make me a carousel about first time buyers", "carousel"],
    ["Can you create an animated reel educating first time home buyers", "reel"],
    ["I need an Instagram post about the Austin market", "post"],
    ["do a story for my open house on Saturday", "story"],
    ["design a carousel: 5 mistakes sellers make", "carousel"],
    ["carousel post for my real estate content please", "carousel"],
  ];
  for (const [said, kind] of makes) {
    const c = await agent();
    hostile = { reply: "Here are your ads.", action: "make_ads" };
    const s = await c("POST", "/api/listings/start", { text: said });
    const f = await c("POST", `/api/listings/${s.json.listing.id}/first`, {});
    assert.equal(f.json.creations.length, 1, `"${said}" made one`);
    assert.equal(f.json.creations[0].kind, kind, `"${said}"`);
    assert.equal(f.json.ads.length, 0, `"${said}" made no ads`);
  }
  const answers = ["should I post a reel or a carousel?", "what's a good carousel length", "how often should I post reels?", "give me 5 reel ideas", "write me a caption for a reel about my new listing", "give me a reel script about first time buyers", "what's 15% of $650,000?", "write an email to a buyer who went quiet"];
  for (const said of answers) {
    const c = await agent();
    hostile = null;
    const s = await c("POST", "/api/listings/start", { text: said });
    const f = await c("POST", `/api/listings/${s.json.listing.id}/first`, {});
    assert.equal(f.json.creations.length, 0, `"${said}" is answered in words`);
    assert.equal(f.json.ads.length, 0, `"${said}" made no ads`);
    sane(f, said);
  }
});

test("a property on its own is read back with one question; ads come when asked, however it's asked", async () => {
  for (const property of ["12 Elm St, Austin, TX. 3 bed 2 bath, $585,000", "Just listed 88 Peachtree St, Atlanta. 2 bed 2 bath condo, $2,400/mo"]) {
    for (const ask of ["make ads for it", "run ads on this", "create ads", "let's advertise it", "boost it", "Make 2 ads"]) {
      const c = await agent();
      hostile = null;
      const s = await c("POST", "/api/listings/start", { text: property });
      const f = await c("POST", `/api/listings/${s.json.listing.id}/first`, {});
      assert.equal(f.json.ads.length, 0, `"${property}" alone made no ads`);
      assert.match(f.json.messages.at(-1).body, /What should I make for it/);
      const r = await c("POST", `/api/listings/${s.json.listing.id}/messages`, { text: ask });
      assert.equal(r.json.ads.length, ask === "Make 2 ads" ? 2 : 3, `"${ask}" after "${property}"`);
    }
  }
});

test("thanks is just thanks: nothing changes", async () => {
  for (const said of ["thanks", "thank you!", "cheers", "perfect, thanks", "great thanks", "ty"]) {
    const s = await withAds();
    hostile = { reply: "Removed.", action: "remove_ads", remove: [1, 2, 3] };
    const r = await say(s, said);
    sane(r, said);
    assert.equal(r.json.ads.length, 3, `"${said}"`);
  }
});
