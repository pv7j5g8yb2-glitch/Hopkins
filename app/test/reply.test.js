import { test } from "node:test";
import assert from "node:assert/strict";
import { boot, client } from "./helpers.js";

// Every Lead who leaves an email gets a reply straight away, from the agent, and the chat only
// says so when it really went out. Turned off in Settings, nothing is sent.
const app = await boot({ RESEND_API_KEY: "re_test", MAIL_FROM: "Hopkins <hello@kirmistudio.com>", PILOT_PLAN: "paid" });
const sent = [];
let down = false;
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (String(url).startsWith("https://api.resend.com/")) {
    if (down) return new Response("no", { status: 500 });
    sent.push(JSON.parse(init.body));
    return new Response(JSON.stringify({ id: "em_1" }), { status: 200 });
  }
  return realFetch(url, init);
};
const settle = () => new Promise((r) => setTimeout(r, 60));

test("a Lead with an email gets an instant reply from the agent; off means off; a failed send says nothing", async () => {
  const c = client(app);
  await c("POST", "/api/signup", { email: "sam@ellery.test", password: "password123", invite: "EARLY1", name: "Sam Ellery" });
  await c("PUT", "/api/brand", { business: "Ellery Realty", phone: "512 555 0100", agent_name: "Sam Ellery" });
  const l = await c("POST", "/api/listings", { text: "412 Oak Street, Austin, TX. $649,000. 3 bed 2 bath" });
  const { slug, id } = l.json.listing;

  await client(app)("POST", `/api/l/${slug}/lead`, { name: "dana price", email: "dana@buyer.test", wants: "showing" });
  await settle();
  assert.equal(sent.length, 1);
  const m = sent[0];
  assert.deepEqual(m.to, ["dana@buyer.test"]);
  assert.equal(m.subject, "About 412 Oak Street");
  assert.equal(m.from, "Sam Ellery via Hopkins <hello@kirmistudio.com>");
  assert.equal(m.reply_to, "sam@ellery.test");
  assert.equal(m.text, "Hi Dana,\n\nThanks for asking about 412 Oak Street. I'll be in touch shortly to arrange a showing. If you have times that suit you, reply to this email with them.\n\nSam Ellery\nEllery Realty\n512 555 0100");
  let msgs = (await c("GET", `/api/listings/${id}`)).json.messages;
  assert.equal(msgs.at(-1).body, "I emailed Dana back straight away to say you'll be in touch.");

  // Phone only: no email to send.
  await client(app)("POST", `/api/l/${slug}/lead`, { name: "Lee Park", phone: "512 555 0111" });
  await settle();
  assert.equal(sent.length, 1);

  // The send fails: the Lead is kept and nothing claims a reply.
  down = true;
  await client(app)("POST", `/api/l/${slug}/lead`, { name: "Kai Moss", email: "kai@buyer.test" });
  await settle();
  down = false;
  msgs = (await c("GET", `/api/listings/${id}`)).json.messages;
  assert.ok(msgs.some((x) => /New lead: Kai Moss/.test(x.body)));
  assert.ok(!msgs.some((x) => /emailed Kai/.test(x.body)));

  // Off in Settings: nothing goes out.
  await c("PUT", "/api/brand", { instant_reply: "off" });
  await client(app)("POST", `/api/l/${slug}/lead`, { name: "Ann Lee", email: "ann@buyer.test" });
  await settle();
  assert.equal(sent.length, 1);
});
