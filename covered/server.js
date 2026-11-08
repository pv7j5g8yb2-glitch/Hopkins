import http from "node:http";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  openDb, hashPassword, verifyPassword, subStatus, runReminders, newToken,
  validDate, KINDS, EMAIL_RE,
} from "./lib.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAX_BODY = 12 * 1024 * 1024;
const FILE_MAX = 8 * 1024 * 1024;
const MIMES = ["application/pdf", "image/png", "image/jpeg"];
const COOKIE = "covered_session";
const MAX_AGE = 90 * 24 * 60 * 60;

const page = (name) => readFileSync(path.join(HERE, "web", name));

export function createServer({ db = openDb(), env = process.env, base = "" } = {}) {
  const pages = { index: page("index.html"), sub: page("sub.html") };

  const json = (res, code, body, headers = {}) => {
    res.writeHead(code, { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers });
    res.end(JSON.stringify(body));
  };
  const html = (res, buf) => {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    res.end(buf);
  };
  const readBody = (req) => new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(Object.assign(new Error("too big"), { code: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); } catch { reject(Object.assign(new Error("bad json"), { code: 400 })); }
    });
    req.on("error", reject);
  });
  const cookieOf = (req) => {
    const m = /(?:^|;\s*)covered_session=([a-f0-9]+)/.exec(req.headers.cookie || "");
    return m ? m[1] : null;
  };
  const userOf = (req) => {
    const t = cookieOf(req);
    if (!t) return null;
    return db.prepare("SELECT u.id, u.email, u.name, u.company FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?").get(t) || null;
  };
  const startSession = (res, userId) => {
    const token = newToken(32);
    db.prepare("INSERT INTO sessions VALUES (?,?,?)").run(token, userId, new Date().toISOString());
    return { "Set-Cookie": `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${MAX_AGE}${env.NODE_ENV === "production" ? "; Secure" : ""}` };
  };
  const origin = (req) => base || `${req.headers["x-forwarded-proto"] || "http"}://${req.headers.host}`;

  const subView = (sub) => ({ id: sub.id, name: sub.name, trade: sub.trade, email: sub.email, phone: sub.phone, token: sub.token, status: subStatus(db, sub) });

  async function handle(req, res) {
    const url = new URL(req.url, "http://x");
    const p = url.pathname;
    const m = req.method;

    if (m === "GET" && p === "/") return html(res, pages.index);
    if (m === "GET" && /^\/s\/[a-f0-9]+$/.test(p)) return html(res, pages.sub);
    if (m === "GET" && p === "/health") return json(res, 200, { ok: true });

    // Public: what a subcontractor sees at their private link.
    let mt = /^\/api\/s\/([a-f0-9]+)$/.exec(p);
    if (mt && m === "GET") {
      const sub = db.prepare("SELECT s.*, u.name AS owner_name, u.company AS owner_company FROM subs s JOIN users u ON u.id = s.user_id WHERE s.token = ?").get(mt[1]);
      if (!sub) return json(res, 404, { error: "Link not found" });
      return json(res, 200, { name: sub.name, company: sub.owner_company || sub.owner_name, kinds: KINDS, status: subStatus(db, sub).items });
    }
    mt = /^\/api\/s\/([a-f0-9]+)\/cert$/.exec(p);
    if (mt && m === "POST") {
      const sub = db.prepare("SELECT * FROM subs WHERE token = ?").get(mt[1]);
      if (!sub) return json(res, 404, { error: "Link not found" });
      return saveCert(res, sub, await readBody(req));
    }

    if (m === "POST" && p === "/api/signup") {
      const b = await readBody(req);
      const email = String(b.email || "").trim().toLowerCase();
      const name = String(b.name || "").trim().slice(0, 80);
      if (!name) return json(res, 400, { error: "Enter your name" });
      if (!EMAIL_RE.test(email)) return json(res, 400, { error: "Enter a valid email" });
      if (String(b.password || "").length < 8) return json(res, 400, { error: "Password must be at least 8 characters" });
      if (db.prepare("SELECT 1 FROM users WHERE email = ?").get(email)) return json(res, 409, { error: "An account with this email already exists" });
      const info = db.prepare("INSERT INTO users (email, pass, name, company, created) VALUES (?,?,?,?,?)")
        .run(email, await hashPassword(b.password), name, String(b.company || "").trim().slice(0, 80), new Date().toISOString());
      return json(res, 200, { ok: true }, startSession(res, Number(info.lastInsertRowid)));
    }
    if (m === "POST" && p === "/api/login") {
      const b = await readBody(req);
      const u = db.prepare("SELECT * FROM users WHERE email = ?").get(String(b.email || "").trim().toLowerCase());
      if (!u || !(await verifyPassword(String(b.password || ""), u.pass))) return json(res, 401, { error: "Incorrect email or password" });
      return json(res, 200, { ok: true }, startSession(res, u.id));
    }

    const user = userOf(req);
    if (m === "POST" && p === "/api/logout") {
      const t = cookieOf(req);
      if (t) db.prepare("DELETE FROM sessions WHERE token = ?").run(t);
      return json(res, 200, { ok: true }, { "Set-Cookie": `${COOKIE}=; HttpOnly; Path=/; Max-Age=0` });
    }
    if (!user) return json(res, 401, { error: "Sign in to continue" });

    if (m === "GET" && p === "/api/me") return json(res, 200, { user });
    if (m === "PUT" && p === "/api/me") {
      const b = await readBody(req);
      db.prepare("UPDATE users SET company = ? WHERE id = ?").run(String(b.company || "").trim().slice(0, 80), user.id);
      return json(res, 200, { ok: true });
    }

    if (m === "GET" && p === "/api/subs") {
      const rows = db.prepare("SELECT * FROM subs WHERE user_id = ? ORDER BY name COLLATE NOCASE").all(user.id);
      return json(res, 200, { link: origin(req), subs: rows.map(subView) });
    }
    if (m === "POST" && p === "/api/subs") {
      const b = await readBody(req);
      const name = String(b.name || "").trim().slice(0, 80);
      const email = String(b.email || "").trim().toLowerCase();
      if (!name) return json(res, 400, { error: "Enter a name" });
      if (email && !EMAIL_RE.test(email)) return json(res, 400, { error: "Enter a valid email" });
      const info = db.prepare("INSERT INTO subs (user_id, name, trade, email, phone, token, created) VALUES (?,?,?,?,?,?,?)")
        .run(user.id, name, String(b.trade || "").trim().slice(0, 60), email, String(b.phone || "").trim().slice(0, 30), newToken(), new Date().toISOString());
      const sub = db.prepare("SELECT * FROM subs WHERE id = ?").get(Number(info.lastInsertRowid));
      if (sub.email) await runReminders(db, { base: origin(req), env });
      return json(res, 200, { sub: subView(sub) });
    }

    mt = /^\/api\/subs\/(\d+)$/.exec(p);
    if (mt) {
      const sub = db.prepare("SELECT * FROM subs WHERE id = ? AND user_id = ?").get(Number(mt[1]), user.id);
      if (!sub) return json(res, 404, { error: "Not found" });
      if (m === "GET") {
        const certs = db.prepare("SELECT id, kind, carrier, policy_no, expires, file_name, uploaded FROM certs WHERE sub_id = ? ORDER BY uploaded DESC, id DESC").all(sub.id);
        return json(res, 200, { sub: subView(sub), certs, link: origin(req) });
      }
      if (m === "DELETE") {
        db.prepare("DELETE FROM certs WHERE sub_id = ?").run(sub.id);
        db.prepare("DELETE FROM reminders WHERE sub_id = ?").run(sub.id);
        db.prepare("DELETE FROM subs WHERE id = ?").run(sub.id);
        return json(res, 200, { ok: true });
      }
    }
    mt = /^\/api\/subs\/(\d+)\/cert$/.exec(p);
    if (mt && m === "POST") {
      const sub = db.prepare("SELECT * FROM subs WHERE id = ? AND user_id = ?").get(Number(mt[1]), user.id);
      if (!sub) return json(res, 404, { error: "Not found" });
      return saveCert(res, sub, await readBody(req));
    }
    mt = /^\/api\/certs\/(\d+)\/file$/.exec(p);
    if (mt && m === "GET") {
      const c = db.prepare("SELECT c.* FROM certs c JOIN subs s ON s.id = c.sub_id WHERE c.id = ? AND s.user_id = ?").get(Number(mt[1]), user.id);
      if (!c || !c.file) return json(res, 404, { error: "Not found" });
      res.writeHead(200, { "Content-Type": c.mime, "Content-Disposition": `inline; filename="${c.file_name.replace(/[^\w.\- ]/g, "_")}"`, "Cache-Control": "private, no-store" });
      return res.end(Buffer.from(c.file));
    }
    if (m === "POST" && p === "/api/reminders/run") {
      return json(res, 200, { sent: await runReminders(db, { base: origin(req), env }) });
    }
    if (m === "GET" && p === "/api/outbox") {
      const own = db.prepare("SELECT email FROM subs WHERE user_id = ?").all(user.id).map((r) => r.email);
      const rows = db.prepare("SELECT id, to_addr, subject, status, created FROM outbox ORDER BY id DESC LIMIT 100").all().filter((r) => own.includes(r.to_addr));
      return json(res, 200, { rows });
    }
    return json(res, 404, { error: "Not found" });
  }

  function saveCert(res, sub, b) {
    const kind = String(b.kind || "");
    if (!KINDS[kind]) return json(res, 400, { error: "Choose a certificate type" });
    if (!validDate(String(b.expires || ""))) return json(res, 400, { error: "Enter the expiry date" });
    let buf = null, mime = "", fileName = "";
    if (b.data) {
      mime = String(b.mime || "");
      if (!MIMES.includes(mime)) return json(res, 400, { error: "Upload a PDF, PNG or JPG" });
      buf = Buffer.from(String(b.data), "base64");
      if (!buf.length) return json(res, 400, { error: "That file is empty" });
      if (buf.length > FILE_MAX) return json(res, 413, { error: "File is too large" });
      fileName = String(b.name || "certificate").slice(0, 120);
    }
    db.prepare("INSERT INTO certs (sub_id, kind, carrier, policy_no, expires, file_name, mime, file, uploaded) VALUES (?,?,?,?,?,?,?,?,?)")
      .run(sub.id, kind, String(b.carrier || "").trim().slice(0, 80), String(b.policy_no || "").trim().slice(0, 60), b.expires, fileName, mime, buf, new Date().toISOString());
    return json(res, 200, { ok: true, status: subStatus(db, sub).items });
  }

  const server = http.createServer((req, res) => {
    handle(req, res).catch((e) => {
      if (res.headersSent) return res.end();
      json(res, e.code === 413 || e.code === 400 ? e.code : 500, { error: e.code === 413 ? "File is too large" : e.code === 400 ? "Bad request" : "Something went wrong. Please try again." });
    });
  });
  return { server, db };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = process.env.DATA_DIR || path.join(HERE, "data");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const { server, db } = createServer({ db: openDb(path.join(dir, "covered.db")), base: process.env.PUBLIC_URL || "" });
  const port = Number(process.env.PORT || 3300);
  server.listen(port, () => console.log(`Covered on http://localhost:${port}`));
  // Reminders: every hour.
  setInterval(() => runReminders(db, { base: process.env.PUBLIC_URL || "" }).catch(() => {}), 60 * 60 * 1000);
}
