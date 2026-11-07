// Every piece of text against the lightest part of what's behind it (WCAG contrast).
import { chromium } from "playwright";
import { createRequire } from "module";
const D = process.argv[2], file = process.argv[3] || "app.html";
const req = createRequire("/home/user/Hopkins/app/package.json");
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 })).newPage();
const lum = ([r, g, bl]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(bl); };
const ratio = (a, c) => { const [x, y] = [lum(a), lum(c)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
let fails = 0;
for (const v of ["today", "chat"]) {
  await p.goto(`file://${D}/${file}#${v}`); await p.reload(); await p.waitForLoadState("networkidle"); await p.waitForTimeout(600);
  const items = await p.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll("body *")) {
      if (el.closest(".ad")) continue; // the ads themselves are the creative, checked on their own
      const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join(" ");
      if (!own) continue;
      const cs = getComputedStyle(el);
      const range = document.createRange(); range.selectNodeContents(el);
      const r = [...range.getClientRects()].reduce((a, c) => ({ x: Math.min(a.x, c.x), y: Math.min(a.y, c.y), r: Math.max(a.r, c.right), b: Math.max(a.b, c.bottom) }), { x: 1e9, y: 1e9, r: -1e9, b: -1e9 });
      let op = 1; for (let e = el; e; e = e.parentElement) op *= Number(getComputedStyle(e).opacity);
      out.push({ text: own.slice(0, 40), color: cs.color, size: parseFloat(cs.fontSize), weight: Number(cs.fontWeight), op, rect: r });
    }
    return out;
  });
  await p.addStyleTag({ content: "*{color:transparent!important;text-shadow:none!important} svg{visibility:hidden}" });
  await p.waitForTimeout(200);
  const png = await p.screenshot();
  const { PNG } = await import("data:text/javascript,export const PNG=null;").catch(() => ({}));
  const sharp = null;
  // Decode with the browser itself: read pixels back through a canvas.
  const px = await p.evaluate(async (b64) => {
    const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode();
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
    const x = c.getContext("2d"); x.drawImage(img, 0, 0); return { w: c.width, h: c.height, d: Array.from(x.getImageData(0, 0, c.width, c.height).data) };
  }, png.toString("base64"));
  for (const it of items) {
    const m = it.color.match(/[\d.]+/g).map(Number); const [cr, cg, cb] = m; const ca = (m[3] ?? 1) * it.op;
    const x0 = Math.max(0, Math.floor(it.rect.x * 2)), x1 = Math.min(px.w, Math.ceil(it.rect.r * 2)), y0 = Math.max(0, Math.floor(it.rect.y * 2)), y1 = Math.min(px.h, Math.ceil(it.rect.b * 2));
    const ls = [];
    for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) { const i = (y * px.w + x) * 4; ls.push([px.d[i], px.d[i + 1], px.d[i + 2]]); }
    if (!ls.length) continue;
    const dark = cr + cg + cb < 300; // dark text: the darkest background is the worst case
    ls.sort((a, c) => (lum(a) - lum(c)) * (dark ? -1 : 1));
    const bg = ls[Math.floor(ls.length * 0.95)];
    const fg = [cr, cg, cb].map((c, k) => c * ca + bg[k] * (1 - ca));
    const cr2 = ratio(fg, bg);
    const large = it.size >= 24 || (it.size >= 18.66 && it.weight >= 600);
    const need = large ? 3 : 4.5;
    const ok = cr2 >= need;
    if (!ok) fails++;
    console.log(`${v.padEnd(6)} ${ok ? "ok  " : "FAIL"} ${cr2.toFixed(2).padStart(5)} need ${need}  ${String(it.size).padStart(4)}px  ${it.text}`);
  }
}
console.log(`\n${fails} failing`);
await b.close();
