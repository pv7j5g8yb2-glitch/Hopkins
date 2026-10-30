import { test } from "node:test";
import assert from "node:assert/strict";
import { boot, client } from "./helpers.js";

// Production rules for admin: nobody can create an account with an admin email or move onto
// one, so admin only ever applies to an account that already existed; everyone else gets 403s.
const app = await boot({ NODE_ENV: "production", NO_LISTEN: "1", INVITE_CODES: "EARLY1", ADMIN_EMAILS: "boss@hopkins.test,spare@hopkins.test" });
const { createAccount } = await import("../src/auth.js");

test("admin can't be claimed, only granted, and only admins reach admin", async () => {
  // The owner's account exists already (made before this rule, or by hand).
  await createAccount({ email: "boss@hopkins.test", password: "password123", name: "Boss" });
  const boss = client(app);
  assert.equal((await boss("POST", "/api/login", { email: "boss@hopkins.test", password: "password123" })).status, 200);
  assert.equal((await boss("GET", "/api/me")).json.admin, true);
  assert.equal((await boss("GET", "/api/admin/workspaces")).status, 200);

  // An admin email with no account yet can't be signed up for, even with a valid code.
  const stranger = client(app);
  assert.equal((await stranger("POST", "/api/signup", { email: "spare@hopkins.test", password: "password123", invite: "EARLY1" })).status, 403);
  assert.equal((await stranger("POST", "/api/signup", { email: "Spare@Hopkins.test ", password: "password123", invite: "EARLY1" })).status, 403);

  // A normal account: no admin, and can't move its email onto an admin address.
  const user = client(app);
  assert.equal((await user("POST", "/api/signup", { email: "agent@example.com", password: "password123", invite: "EARLY1" })).status, 200);
  const me = (await user("GET", "/api/me")).json;
  assert.equal(me.admin, false);
  assert.equal((await user("GET", "/api/admin/workspaces")).status, 403);
  assert.equal((await user("PATCH", `/api/admin/workspaces/${me.workspace.id}`, { plan: "paid" })).status, 403);
  assert.equal((await user("PATCH", "/api/account", { email: "spare@hopkins.test", password: "password123" })).status, 403);
  assert.equal((await user("GET", "/api/me")).json.workspace.plan, "free");

  // Signed out: nothing.
  assert.equal((await client(app)("GET", "/api/admin/workspaces")).status, 401);
});

test("plans: the founder can switch one on by hand (pilots, quotes), and the account shows its name", async () => {
  const boss = client(app);
  await boss("POST", "/api/login", { email: "boss@hopkins.test", password: "password123" });
  const agent = client(app);
  await agent("POST", "/api/signup", { email: "duo@example.com", password: "password123", invite: "EARLY1", name: "Kim Duo" });
  const me = (await agent("GET", "/api/me")).json;
  assert.deepEqual(me.plans.map((p) => [p.name, p.price, p.agents]), [["Solo", 99, 1], ["Duo", 149, 2], ["Team", 299, 5], ["Team Plus", 549, 10], ["Max", 799, 15], ["Max Plus", 999, 20]]);
  assert.equal(me.plan, null, "free has no paid plan");

  assert.equal((await boss("PATCH", `/api/admin/workspaces/${me.workspace.id}`, { plan: "duo" })).status, 200);
  const now = (await agent("GET", "/api/me")).json;
  assert.equal(now.workspace.plan, "paid");
  assert.equal(now.plan.name, "Duo");
  assert.equal((await boss("PATCH", `/api/admin/workspaces/${me.workspace.id}`, { plan: "gold" })).status, 400);
  // "paid" alone (accounts from before the plans had names) is Solo.
  await boss("PATCH", `/api/admin/workspaces/${me.workspace.id}`, { plan: "paid" });
  assert.equal((await agent("GET", "/api/me")).json.plan.name, "Solo");
  await boss("PATCH", `/api/admin/workspaces/${me.workspace.id}`, { plan: "free" });
  assert.equal((await agent("GET", "/api/me")).json.plan, null);
});
