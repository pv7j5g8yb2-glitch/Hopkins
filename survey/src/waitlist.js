import { run, get, all } from "./db.js";
import { requireAdmin } from "./admin-auth.js";
import { toCsv } from "./csv.js";

// Admin view of the Hopkins waitlist. The page and the sign up endpoints run on Netlify
// (see waitlist/ at the repo root) and write to this same database, so sign ups are
// listed here next to the survey.

export function registerWaitlist(app) {
  const listSql = `SELECT id, email, business, country, team_size, monthly_spend, source, ref, created_at, updated_at
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
      ["created_at", "email", "business", "country", "team_size", "monthly_spend", "source", "ref", "id"],
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
  td.del button{background:none;border:0;color:#9A5A50;cursor:pointer;font:inherit;text-decoration:underline}
  .empty{padding:30px;text-align:center}
</style></head>
<body><div class="wrap">
<header><div><h1>Hopkins waitlist</h1><div class="muted" id="sub">Loading</div></div>
<div><a class="btn" href="/api/admin/waitlist.csv">Export CSV</a> <a class="btn" href="/admin" style="background:#5B4873">Survey admin</a></div></header>
<div class="stats" id="stats"></div>
<div class="table"><table><thead><tr><th>Joined</th><th>Email</th><th>Business</th><th>Country</th><th>Agents</th><th>Spend a month</th><th>From</th><th></th></tr></thead><tbody id="rows"></tbody></table></div>
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
    '<div class="stat"><b>'+signups.filter(s=>s.team_size).length+'</b>answered step two</div>'+
    '<div class="stat"><b>'+withSpend+'</b>spend $500+ a month</div>';
  document.getElementById("rows").innerHTML=signups.length?signups.map(s=>'<tr><td>'+esc(new Date(s.created_at).toLocaleString())+'</td><td>'+esc(s.email)+'</td><td>'+esc(s.business)+'</td><td>'+esc(s.country)+'</td><td>'+esc(SIZE[s.team_size])+'</td><td>'+esc(SPEND[s.monthly_spend])+'</td><td>'+esc([s.source,s.ref].filter(Boolean).join(", "))+'</td><td class="del"><button data-id="'+esc(s.id)+'">Remove</button></td></tr>').join(""):'<tr><td colspan="8" class="empty muted">No sign ups yet.</td></tr>';
}
document.getElementById("rows").addEventListener("click",async e=>{
  const id=e.target.dataset&&e.target.dataset.id; if(!id)return;
  if(!confirm("Remove this sign up for good?"))return;
  await fetch("/api/admin/waitlist/"+id,{method:"DELETE"}); load();
});
load();
</script></body></html>`;
