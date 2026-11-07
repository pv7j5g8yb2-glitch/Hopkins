import { test } from "node:test";
import assert from "node:assert/strict";
import { boot, client } from "./helpers.js";

// Hopkins knows how the agent is getting on (Ismael, 2026-10-31): their Follow Up Boss contacts
// and their whole Meta ad account go into what the chat knows, read only.
const app = await boot({ PILOT_PLAN: "paid" });
const { run } = await import("../src/db.js");
const hopkins = await import("../src/hopkins.js");
const { sealKey, peopleSummary, overviewSummary } = await import("../src/crm.js");
const { insightsSummary, overviewSummaryMeta } = await import("../src/meta.js");

const now = new Date("2026-10-31T12:00:00Z");
const ago = (d) => new Date(now - d * 86400000).toISOString();
const people = [
  { name: "Dana Price", created: ago(2), stage: "Lead", source: "Zillow", price: 450000, tags: ["Buyer"], lastActivity: ago(1), hasEmail: true, hasPhone: true },
  { name: "Lee Park", created: ago(5), stage: "Lead", source: "Zillow", price: 520000, tags: ["Buyer"], lastActivity: ago(20), hasEmail: false, hasPhone: true },
  { name: "Kai Moss", created: ago(40), stage: "Past Client", source: "Referral", price: null, tags: [], lastActivity: ago(60), hasEmail: true, hasPhone: false },
];

test("the summary says what the leads have in common, in plain counts", () => {
  const t = peopleSummary(people, now);
  assert.match(t, /New in the last 7 days: 2; last 30 days: 2/);
  assert.match(t, /By source: Zillow 2, Referral 1/);
  assert.match(t, /\$450,000 to \$520,000/);
  assert.match(t, /No activity for over 14 days: 2/);
  assert.match(t, /- Dana Price: added/);
  assert.match(insightsSummary([{ name: "Spring listings", spend: 300, reach: 12000, clicks: 240, leads: 6 }]), /\$300 spent.*6 leads counted by Meta, \$50\.00 a lead/);
});

test("connected, the chat gets both; a source that fails says so instead of guessing", async () => {
  const c = client(app);
  await c("POST", "/api/signup", { email: "outside@ellery.test", password: "password123", invite: "EARLY1", name: "Sam Ellery" });
  const ws = await hopkins.getWorkspace((await c("GET", "/api/me")).json.workspace.id);
  let summary = await hopkins.accountSummary(ws);
  assert.match(summary, /CRM: not connected/);
  assert.doesNotMatch(summary, /Follow Up Boss \(read only/);

  await run(`UPDATE workspaces SET crm = ? WHERE id = ?`, [JSON.stringify({ fub: sealKey("key_123"), fubName: "Sam" }), ws.id]);
  await run(`INSERT INTO meta_connections (workspace_id, fb_user_id, token, ad_account_id, created_at, updated_at) VALUES (?,?,?,?,?,?)`, [ws.id, "1", sealKey("tok"), "act_9", "x", "x"]);
  let asked = 0;
  const crm = { people, events: [{ type: "Property Inquiry", created: ago(3), property: "12 Elm St, Austin" }], deals: [{ name: "Price", stage: "Under contract", status: "Active", price: 450000 }], appointments: [{ title: "Showing", start: new Date(Date.now() + 2 * 86400000).toISOString() }], tasks: [{ name: "Call Lee", due: ago(2), done: false }], calls: [{ created: ago(1) }], users: [{ name: "Sam" }, { name: "Jo" }] };
  const meta = { account: { name: "Sam Ads", currency: "USD", status: 1, spentAllTime: 4200 }, campaigns: [{ name: "Spring listings", status: "ACTIVE", budget: 20 }], byCampaign: [{ name: "Spring listings", spend: 300, reach: 12000, impressions: 30000, clicks: 240, ctr: 0.8, cpc: 1.25, leads: 6 }], byAd: [], byPlatform: [{ platform: "instagram", spend: 200, clicks: 160, leads: 5 }], daily: [], instagram: { username: "sam.homes", followers: 1830, posts: 210, recent: [{ likes: 40, comments: 3, caption: "Just listed" }, { likes: 90, comments: 12, caption: "Austin in spring" }] } };
  hopkins.setOutsideForTests({ crm: async () => { asked++; return crm; }, meta: async (token, acct, page) => { assert.equal(acct, "act_9"); return meta; } });
  summary = await hopkins.accountSummary(await hopkins.getWorkspace(ws.id));
  assert.match(summary, /From their Follow Up Boss/);
  assert.match(summary, /Deals: 1 \(1 open, \$450,000 in open deals\)/);
  assert.match(summary, /Open tasks: 1, overdue: 1/);
  assert.match(summary, /Appointments coming up in the next 14 days: 1/);
  assert.match(summary, /Their Meta ad account "Sam Ads"/);
  assert.match(summary, /By platform: instagram \$200/);
  assert.match(summary, /@sam.homes: 1,830 followers.*best: "Austin in spring" \(90 likes\)/);
  await hopkins.accountSummary(await hopkins.getWorkspace(ws.id));
  assert.equal(asked, 1, "read once, then kept for ten minutes");

  hopkins.setOutsideForTests({ crm: async () => { throw new Error("401"); } });
  summary = await hopkins.accountSummary(await hopkins.getWorkspace(ws.id));
  assert.match(summary, /Follow Up Boss couldn't be read just now/);
});
