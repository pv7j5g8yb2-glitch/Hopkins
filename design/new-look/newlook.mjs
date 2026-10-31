import { chromium, devices } from "playwright";
import { measure } from "./measure.mjs";
const BASE = "http://localhost:3200", OUT = process.argv[2];
const fails = [];
const b = await chromium.launch();
async function run(ctxOpts, tag) {
  const ctx = await b.newContext(ctxOpts);
  const p = await ctx.newPage();
  p.on("pageerror", (e) => console.log("ERR", tag, e.message));
  const shot = async (name) => { await p.waitForTimeout(900); await p.screenshot({ path: `${OUT}/${tag}-${name}.png` }); await measure(p, `${tag} ${name}`, fails); };
  await p.goto(BASE + "/login"); await shot("login");
  await p.goto(BASE + "/signup?invite=EARLY1");
  await shot("signup");
  await p.fill("#name", "Sam Ellery"); await p.fill("#business", "Ellery Realty"); await p.fill("#email", `nl${tag}${Date.now()}@t.com`); await p.fill("#password", "password123");
  await p.click("#go"); await p.waitForURL(/#\/brand/); await shot("brand");
  await p.click("button[type=submit]"); await p.waitForURL(/#\/today/); await shot("today-steps");
  await p.goto(BASE + "/#/crm"); await shot("crm");
  const l = await p.evaluate(async () => (await (await fetch("/api/listings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: "412 Oak Street, Austin, TX. $649,000. 3 bed 2 bath craftsman, 1,850 sq ft, big front porch, renovated kitchen." }) })).json()));
  const id = l.listing.id;
  await p.evaluate(async (id) => { await fetch(`/api/listings/${id}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: "run it" }) }); }, id);
  await p.evaluate(async (slug) => { await fetch(`/api/l/${slug}/lead`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Dana Price", phone: "512 555 0199", wants: "showing", note: "Is Saturday ok?" }) }); }, l.listing.slug);
  await p.goto(BASE + `/#/l/${id}`); await p.reload(); await shot("chat");
  if (tag === "phone") { await p.click("[data-act=ads]").catch(() => {}); await shot("ads"); }
  await p.goto(BASE + "/#/today"); await p.reload(); await shot("today");
  await p.goto(BASE + "/#/listings"); await shot("chats");
  await p.goto(BASE + "/#/leads"); await shot("leads");
  await p.goto(BASE + "/#/report"); await shot("report");
  await p.goto(BASE + "/#/settings"); await shot("settings");
  await p.goto(BASE + "/#/new"); await shot("new");
  await p.goto(BASE + "/#/today"); await p.waitForTimeout(600);
  await p.click("[data-act=account]").catch(() => {}); await shot("menu");
  await p.goto(BASE + "/terms"); await shot("terms");
  await ctx.close();
}
await run({ ...devices["iPhone 15"] }, "phone");
await run({ viewport: { width: 1440, height: 900 } }, "desk");
console.log(fails.length ? fails.join("\n") : "all text passes");
console.log(`${fails.length} failing`);
await b.close();
