import { randomUUID } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import { run, get, all } from "./db.js";
import { notify } from "./notify.js";
import { requireAdmin } from "./admin-auth.js";
import { toCsv } from "./csv.js";

// The Hopkins waitlist: the landing page, its images, the two sign up endpoints, and an
// admin view. It lives in this server so sign ups land in the same database and send the
// same phone notifications as the survey, with no second service to run.
//
// The page answers on any host whose name starts with "waitlist." (point the
// waitlist.kirmistudio.com DNS record at this service) and at /waitlist on every host,
// which is handy for checking it before the DNS record exists.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SIZES = new Set(["1", "2-5", "6-20", "21+"]);
const SPENDS = new Set(["<500", "500-2000", "2000-5000", "5000+"]);
const COUNTRIES = new Set([
  "United States", "Canada", "United Kingdom", "Ireland", "Australia", "United Arab Emirates", "Somewhere else",
]);
const SIZE_LABELS = { "1": "just them", "2-5": "2 to 5 agents", "6-20": "6 to 20 agents", "21+": "21 or more agents" };
const SPEND_LABELS = { "<500": "under $500", "500-2000": "$500 to $2,000", "2000-5000": "$2,000 to $5,000", "5000+": "$5,000 or more" };
const ASSETS = new Set(["ad1.jpg", "ad2.jpg", "ad3.jpg"]);

// A light brake on scripted sign ups. Kept in memory only: addresses are never stored.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 12;
const hits = new Map();
function tooMany(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

// Accepts "@harbourrealty", "harbourrealty" or an instagram.com link and keeps just the
// handle. Anything that can't be an Instagram username is dropped.
function igHandle(value) {
  if (typeof value !== "string") return null;
  const handle = value.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").split(/[/?#]/)[0];
  return /^[A-Za-z0-9._]{1,30}$/.test(handle) ? handle.toLowerCase() : null;
}

function clean(value, max) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

export function registerWaitlist(app, webDir) {
  const pageHtml = readFileSync(join(webDir, "waitlist.html"), "utf8");
  const assetDir = join(webDir, "waitlist");

  const sendPage = (reply) =>
    reply.type("text/html").header("Cache-Control", "no-cache").send(pageHtml);

  app.addHook("onRequest", async (request, reply) => {
    if (request.hostname.startsWith("waitlist.") && request.method === "GET" && request.url.split("?")[0] === "/") {
      return sendPage(reply);
    }
  });

  app.get("/waitlist", async (request, reply) => sendPage(reply));

  app.get("/waitlist-assets/:file", async (request, reply) => {
    const file = request.params.file;
    const path = join(assetDir, file);
    if (!ASSETS.has(file) || !existsSync(path)) return reply.code(404).send("Not found");
    reply.type("image/jpeg").header("Cache-Control", "public, max-age=604800").send(readFileSync(path));
  });

  app.post("/api/waitlist", async (request, reply) => {
    const { email, source, ref, website } = request.body ?? {};
    // "website" is a field people never see; only bots fill it in. They get a normal
    // looking reply so they don't retry, and nothing is stored.
    if (website) return { ok: true, id: randomUUID() };
    if (tooMany(request.ip)) return reply.code(429).send({ error: "Too many tries. Please wait a few minutes." });

    const address = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!EMAIL_RE.test(address) || address.length > 200) {
      return reply.code(400).send({ error: "That email doesn't look right." });
    }

    const existing = await get(`SELECT id, updated_at FROM waitlist WHERE email = ?`, [address]);
    if (existing) return { ok: true, id: existing.id, already: true, answered: Boolean(existing.updated_at) };

    const id = randomUUID();
    const now = new Date().toISOString();
    await run(`INSERT INTO waitlist (id, email, source, ref, created_at) VALUES (?, ?, ?, ?, ?)`, [
      id, address, clean(source, 40), clean(ref, 200), now,
    ]);
    const count = await get(`SELECT COUNT(*) as n FROM waitlist`);
    notify("Hopkins waitlist", `New sign up. That's ${count?.n ?? "?"} on the list.`, ["tada"]);
    return { ok: true, id };
  });

  app.post("/api/waitlist/:id/details", async (request, reply) => {
    const row = await get(`SELECT id FROM waitlist WHERE id = ?`, [request.params.id]);
    if (!row) return reply.code(404).send({ error: "unknown sign up" });

    const { business, instagram, country, size, spend } = request.body ?? {};
    const fields = {
      business: clean(business, 120),
      instagram: igHandle(instagram),
      country: COUNTRIES.has(country) ? country : null,
      team_size: SIZES.has(size) ? size : null,
      monthly_spend: SPENDS.has(spend) ? spend : null,
    };
    await run(
      `UPDATE waitlist SET business = COALESCE(?, business), instagram = COALESCE(?, instagram), country = COALESCE(?, country),
         team_size = COALESCE(?, team_size), monthly_spend = COALESCE(?, monthly_spend), updated_at = ? WHERE id = ?`,
      [fields.business, fields.instagram, fields.country, fields.team_size, fields.monthly_spend, new Date().toISOString(), row.id]
    );
    const parts = [SIZE_LABELS[fields.team_size], SPEND_LABELS[fields.monthly_spend] && `spends ${SPEND_LABELS[fields.monthly_spend]}`, fields.country].filter(Boolean);
    if (parts.length) notify("Hopkins waitlist", `Sign up details: ${parts.join(", ")}.`, ["memo"]);
    return { ok: true };
  });

  // ---- admin ----

  const listSql = `SELECT id, email, instagram, business, country, team_size, monthly_spend, source, ref, created_at, updated_at
                   FROM waitlist ORDER BY created_at DESC`;

  app.get("/api/admin/waitlist", { preHandler: requireAdmin }, async () => ({ signups: await all(listSql) }));

  app.delete("/api/admin/waitlist/:id", { preHandler: requireAdmin }, async (request, reply) => {
    const row = await get(`SELECT id FROM waitlist WHERE id = ?`, [request.params.id]);
    if (!row) return reply.code(404).send({ error: "unknown sign up" });
    await run(`DELETE FROM waitlist WHERE id = ?`, [request.params.id]);
    return { ok: true };
  });

  app.get("/api/admin/waitlist.csv", { preHandler: requireAdmin }, async (request, reply) => {
    const rows = await all(listSql);
    const csv = toCsv(
      ["created_at", "email", "instagram", "business", "country", "team_size", "monthly_spend", "source", "ref", "id"],
      rows
    );
    reply.header("Content-Type", "text/csv").header("Content-Disposition", "attachment; filename=hopkins-waitlist.csv").send(csv);
  });

  app.get("/admin/waitlist", { preHandler: requireAdmin }, async (request, reply) => {
    reply.type("text/html").send(ADMIN_PAGE);
  });
}

const ADMIN_PAGE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Hopkins Waitlist</title>
<style>
  body{margin:0;background:#FAF6EF;color:#2A0F14;font:15px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
  .wrap{max-width:1100px;margin:0 auto;padding:28px 16px 60px}
  header{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
  h1{font-size:24px;margin:0;letter-spacing:-.02em}
  .muted{color:#7A5A52}
  .btn{display:inline-block;background:#2A0F14;color:#F4EBDD;border:0;border-radius:10px;padding:9px 14px;font:inherit;font-weight:600;text-decoration:none;cursor:pointer}
  .stats{display:flex;gap:10px;flex-wrap:wrap;margin:18px 0}
  .stat{background:#fff;border:1px solid #E6D9C6;border-radius:12px;padding:10px 14px}
  .stat b{display:block;font-size:22px}
  .table{overflow-x:auto;background:#fff;border:1px solid #E6D9C6;border-radius:12px}
  table{border-collapse:collapse;width:100%;min-width:760px}
  th,td{text-align:left;padding:10px 12px;border-bottom:1px solid #F0E8DA;vertical-align:top}
  th{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#7A5A52}
  td a{color:#5B4873;font-weight:600;text-decoration:none}
  td.del button{background:none;border:0;color:#9A5A50;cursor:pointer;font:inherit;text-decoration:underline}
  .empty{padding:30px;text-align:center}
</style></head>
<body><div class="wrap">
<header><div><h1>Hopkins waitlist</h1><div class="muted" id="sub">Loading</div></div>
<div><a class="btn" href="/api/admin/waitlist.csv">Export CSV</a> <a class="btn" href="/admin" style="background:#5B4873">Survey admin</a></div></header>
<div class="stats" id="stats"></div>
<div class="table"><table><thead><tr><th>Joined</th><th>Email</th><th>Instagram</th><th>Country</th><th>Agents</th><th>Spend a month</th><th>From</th><th></th></tr></thead><tbody id="rows"></tbody></table></div>
</div>
<script>
const SIZE={"1":"Just them","2-5":"2 to 5","6-20":"6 to 20","21+":"21 or more"};
const SPEND={"<500":"Under $500","500-2000":"$500 to $2,000","2000-5000":"$2,000 to $5,000","5000+":"$5,000 or more"};
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
async function load(){
  const r=await fetch("/api/admin/waitlist");
  if(r.status===401){location.href="/admin/login";return}
  const {signups}=await r.json();
  const withSpend=signups.filter(s=>s.monthly_spend&&s.monthly_spend!=="<500").length;
  document.getElementById("sub").textContent=signups.length+(signups.length===1?" sign up":" sign ups");
  document.getElementById("stats").innerHTML=
    '<div class="stat"><b>'+signups.length+'</b>on the list</div>'+
    '<div class="stat"><b>'+signups.filter(s=>s.updated_at).length+'</b>answered step two</div>'+
    '<div class="stat"><b>'+signups.filter(s=>!s.updated_at).length+'</b>email only</div>'+
    '<div class="stat"><b>'+withSpend+'</b>spend $500+ a month</div>';
  document.getElementById("rows").innerHTML=signups.length?signups.map(s=>'<tr><td>'+esc(new Date(s.created_at).toLocaleString())+'</td><td>'+esc(s.email)+'</td><td>'+(s.instagram?'<a href="https://instagram.com/'+esc(s.instagram)+'" target="_blank" rel="noopener">@'+esc(s.instagram)+'</a>':esc(s.business))+'</td><td>'+esc(s.country)+'</td><td>'+esc(SIZE[s.team_size])+'</td><td>'+esc(SPEND[s.monthly_spend])+'</td><td>'+esc([s.source,s.ref].filter(Boolean).join(", "))+'</td><td class="del"><button data-id="'+esc(s.id)+'">Remove</button></td></tr>').join(""):'<tr><td colspan="8" class="empty muted">No sign ups yet.</td></tr>';
}
document.getElementById("rows").addEventListener("click",async e=>{
  const id=e.target.dataset&&e.target.dataset.id; if(!id)return;
  if(!confirm("Remove this sign up for good?"))return;
  await fetch("/api/admin/waitlist/"+id,{method:"DELETE"}); load();
});
load();
</script></body></html>`;
