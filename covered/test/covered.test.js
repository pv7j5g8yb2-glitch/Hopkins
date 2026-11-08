import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "../server.js";
import { openDb, runReminders, stageFor, daysUntil, subStatus } from "../lib.js";

async function boot() {
  const db = openDb();
  const { server } = createServer({ db, base: "http://t" });
  await new Promise((r) => server.listen(0, r));
  const base = `http://localhost:${server.address().port}`;
  let cookie = "";
  const call = async (method, url, body) => {
    const r = await fetch(base + url, { method, headers: { ...(body ? { "Content-Type": "application/json" } : {}), cookie }, body: body ? JSON.stringify(body) : undefined });
    const sc = r.headers.get("set-cookie"); if (sc) cookie = sc.split(";")[0];
    const ct = r.headers.get("content-type") || "";
    return { status: r.status, body: ct.includes("json") ? await r.json() : await r.arrayBuffer() };
  };
  return { db, server, call, close: () => server.close() };
}
const iso = (d) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);

test("pages load and the API needs a sign in", async () => {
  const { call, close } = await boot();
  assert.equal((await call("GET", "/api/subs")).status, 401);
  assert.equal((await call("GET", "/")).status, 200);
  close();
});

test("sign up validates, signs in, and rejects a wrong password", async () => {
  const { call, close } = await boot();
  assert.equal((await call("POST", "/api/signup", { name: "", email: "a@b.co", password: "password1" })).status, 400);
  assert.equal((await call("POST", "/api/signup", { name: "Sam", email: "nope", password: "password1" })).status, 400);
  assert.equal((await call("POST", "/api/signup", { name: "Sam", email: "a@b.co", password: "short" })).status, 400);
  assert.equal((await call("POST", "/api/signup", { name: "Sam", email: "a@b.co", password: "password1", company: "Ryan Homes" })).status, 200);
  assert.equal((await call("POST", "/api/signup", { name: "Sam", email: "a@b.co", password: "password1" })).status, 409);
  await call("POST", "/api/logout");
  assert.equal((await call("POST", "/api/login", { email: "a@b.co", password: "wrongpass" })).status, 401);
  assert.equal((await call("POST", "/api/login", { email: "a@b.co", password: "password1" })).status, 200);
  assert.equal((await call("GET", "/api/me")).body.user.company, "Ryan Homes");
  close();
});

test("a subcontractor goes from not cleared to cleared as certificates arrive", async () => {
  const { call, close } = await boot();
  await call("POST", "/api/signup", { name: "Sam", email: "a@b.co", password: "password1", company: "Ryan Homes" });
  const { body: { sub } } = await call("POST", "/api/subs", { name: "Bright Spark Electric", trade: "Electrician", email: "spark@x.co" });
  assert.equal(sub.status.overall, "bad");
  assert.deepEqual(sub.status.items.map((i) => i.state), ["missing", "missing"]);

  // The sub uploads from their private link, with no account.
  const pub = await call("GET", `/api/s/${sub.token}`);
  assert.equal(pub.body.company, "Ryan Homes");
  const file = Buffer.from("%PDF-1.4 test").toString("base64");
  let r = await call("POST", `/api/s/${sub.token}/cert`, { kind: "gl", expires: iso(200), carrier: "Acme", data: file, mime: "application/pdf", name: "gl.pdf" });
  assert.equal(r.status, 200);
  assert.equal((await call("GET", `/api/subs/${sub.id}`)).body.sub.status.overall, "bad");
  r = await call("POST", `/api/s/${sub.token}/cert`, { kind: "wc", expires: iso(15), data: file, mime: "application/pdf", name: "wc.pdf" });
  const s = (await call("GET", `/api/subs/${sub.id}`)).body.sub.status;
  assert.equal(s.overall, "soon");
  assert.equal(s.items[1].state, "soon");

  // A renewal replaces the old one: the latest expiry counts.
  await call("POST", `/api/subs/${sub.id}/cert`, { kind: "wc", expires: iso(300) });
  assert.equal((await call("GET", `/api/subs/${sub.id}`)).body.sub.status.overall, "ok");
  close();
});

test("bad uploads are refused", async () => {
  const { call, close } = await boot();
  await call("POST", "/api/signup", { name: "Sam", email: "a@b.co", password: "password1" });
  const { body: { sub } } = await call("POST", "/api/subs", { name: "X" });
  assert.equal((await call("POST", `/api/s/${sub.token}/cert`, { kind: "zz", expires: iso(10) })).status, 400);
  assert.equal((await call("POST", `/api/s/${sub.token}/cert`, { kind: "gl", expires: "tomorrow" })).status, 400);
  assert.equal((await call("POST", `/api/s/${sub.token}/cert`, { kind: "gl", expires: iso(10), data: "aGk=", mime: "text/html" })).status, 400);
  assert.equal((await call("POST", `/api/s/${"0".repeat(48)}/cert`, { kind: "gl", expires: iso(10) })).status, 404);
  close();
});

test("one builder can never see or change another's subcontractors or files", async () => {
  const a = await boot();
  await a.call("POST", "/api/signup", { name: "A", email: "a@b.co", password: "password1" });
  const { body: { sub } } = await a.call("POST", "/api/subs", { name: "Mine" });
  await a.call("POST", `/api/subs/${sub.id}/cert`, { kind: "gl", expires: iso(100), data: "aGk=", mime: "application/pdf", name: "x.pdf" });
  const certId = (await a.call("GET", `/api/subs/${sub.id}`)).body.certs[0].id;
  // A second account on the same database.
  const { server } = createServer({ db: a.db, base: "http://t" });
  await new Promise((r) => server.listen(0, r));
  const base = `http://localhost:${server.address().port}`;
  const r1 = await fetch(base + "/api/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "B", email: "b@b.co", password: "password1" }) });
  const cookie = r1.headers.get("set-cookie").split(";")[0];
  const get = (u, m = "GET") => fetch(base + u, { method: m, headers: { cookie } });
  assert.equal((await get(`/api/subs/${sub.id}`)).status, 404);
  assert.equal((await get(`/api/subs/${sub.id}`, "DELETE")).status, 404);
  assert.equal((await get(`/api/certs/${certId}/file`)).status, 404);
  assert.deepEqual((await (await get("/api/subs")).json()).subs, []);
  // The owner still can.
  assert.equal((await a.call("GET", `/api/certs/${certId}/file`)).status, 200);
  server.close(); a.close();
});

test("stages follow the days left", () => {
  assert.equal(stageFor({ state: "missing" }), "request");
  assert.equal(stageFor({ state: "expired", days: -3 }), "expired");
  assert.equal(stageFor({ state: "ok", days: 90 }), null);
  assert.equal(stageFor({ state: "soon", days: 30 }), "30");
  assert.equal(stageFor({ state: "soon", days: 20 }), "30");
  assert.equal(stageFor({ state: "soon", days: 14 }), "14");
  assert.equal(stageFor({ state: "soon", days: 6 }), "7");
  assert.equal(stageFor({ state: "soon", days: 0 }), "0");
});

test("days count whole calendar days", () => {
  const now = new Date("2026-11-08T23:30:00Z");
  assert.equal(daysUntil("2026-11-08", now), 0);
  assert.equal(daysUntil("2026-11-09", now), 1);
  assert.equal(daysUntil("2026-11-07", now), -1);
});

test("reminders go out once per stage and again at the next one", async () => {
  const db = openDb();
  db.prepare("INSERT INTO users (email, pass, name, company, created) VALUES ('o@x.co','x','Owen','Ryan Homes','now')").run();
  db.prepare("INSERT INTO subs (user_id, name, email, token, created) VALUES (1,'Spark','s@x.co','tok','now')").run();
  const env = {};
  const day = (n) => new Date(Date.parse("2026-11-08T09:00:00Z") + n * 864e5);
  // Nothing on file: one request per policy, never repeated.
  assert.equal(await runReminders(db, { now: day(0), base: "http://t", env }), 2);
  assert.equal(await runReminders(db, { now: day(1), base: "http://t", env }), 0);
  db.prepare("INSERT INTO certs (sub_id, kind, expires, uploaded) VALUES (1,'gl','2026-12-20','now'),(1,'wc','2027-06-01','now')").run();
  assert.equal(await runReminders(db, { now: day(1), base: "http://t", env }), 0);
  // 28 days before GL expires: the 30 day notice, once.
  assert.equal(await runReminders(db, { now: new Date("2026-11-22T09:00:00Z"), base: "http://t", env }), 1);
  assert.equal(await runReminders(db, { now: new Date("2026-11-23T09:00:00Z"), base: "http://t", env }), 0);
  assert.equal(await runReminders(db, { now: new Date("2026-12-06T09:00:00Z"), base: "http://t", env }), 1); // 14 days
  assert.equal(await runReminders(db, { now: new Date("2026-12-21T09:00:00Z"), base: "http://t", env }), 1); // expired
  const rows = db.prepare("SELECT subject, body FROM outbox ORDER BY id").all();
  assert.equal(rows.length, 5);
  assert.match(rows[0].body, /http:\/\/t\/s\/tok/);
  assert.match(rows.at(-1).subject, /expired/i);
  // A renewal clears it: no more mail.
  db.prepare("INSERT INTO certs (sub_id, kind, expires, uploaded) VALUES (1,'gl','2027-12-20','now')").run();
  assert.equal(await runReminders(db, { now: new Date("2026-12-22T09:00:00Z"), base: "http://t", env }), 0);
  assert.equal(subStatus(db, { id: 1 }, new Date("2026-12-22T09:00:00Z")).overall, "ok");
});

test("a sub with no email gets no mail but still shows as not cleared", async () => {
  const db = openDb();
  db.prepare("INSERT INTO users (email, pass, name, company, created) VALUES ('o@x.co','x','Owen','','now')").run();
  db.prepare("INSERT INTO subs (user_id, name, token, created) VALUES (1,'Phone only','t2','now')").run();
  assert.equal(await runReminders(db, { env: {} }), 0);
  assert.equal(subStatus(db, { id: 1 }).overall, "bad");
});
