import { chromium, devices } from "playwright";
import { createRequire } from "module";
import { measure } from "./measure.mjs";
const { createClient } = createRequire("/home/user/Hopkins/app/package.json")("@libsql/client");
const db = createClient({ url: `file:${process.argv[2]}` });
const OUT = process.argv[3];
const b = await chromium.launch();
const fails = [];
for (const [tag, opts] of [["phone", devices["iPhone 15"]], ["desk", { viewport: { width: 1440, height: 900 } }]]) {
  const p = await (await b.newContext(opts)).newPage();
  p.on("pageerror", (e) => console.log("ERR", e.message));
  await p.goto("http://localhost:3200/signup?invite=EARLY1");
  await p.fill("#name", "Sam Ellery"); await p.fill("#business", "Ellery Realty"); await p.fill("#email", `at${tag}${Date.now()}@t.com`); await p.fill("#password", "password123");
  await p.click("#go"); await p.waitForURL(/#\/brand/);
  await p.waitForTimeout(800); await p.screenshot({ path: `${OUT}/${tag}-brand-site.png` }); await measure(p, `${tag} brand`, fails);
  await p.click("button[type=submit]"); await p.waitForURL(/#\/today/);
  const l = await p.evaluate(async () => (await (await fetch("/api/listings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: "412 Oak Street, Austin, TX. $649,000. 3 bed 2 bath, big porch" }) })).json()));
  await p.evaluate(async (slug) => fetch(`/api/l/${slug}/lead`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Dana Price", phone: "512 555 0199", wants: "showing" }) }), l.listing.slug);
  const old = new Date(Date.now() - 52 * 3600000).toISOString(), lead = new Date(Date.now() - 26 * 3600000).toISOString();
  await db.execute({ sql: "UPDATE ads SET created_at = ? WHERE listing_id = ?", args: [old, l.listing.id] });
  await db.execute({ sql: "UPDATE leads SET created_at = ? WHERE listing_id = ?", args: [lead, l.listing.id] });
  await p.goto("http://localhost:3200/#/today"); await p.reload(); await p.waitForTimeout(1500);
  await p.screenshot({ path: `${OUT}/${tag}-attention.png` }); await measure(p, `${tag} attention`, fails);
}
await b.close();
console.log(fails.length ? fails.join("\n") : "measured");
