// WCAG contrast of every visible piece of text on the current page, against the lightest part of
// what's behind it (the screenshot with all text made transparent).
const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (a, c) => { const [x, y] = [lum(a), lum(c)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
export async function measure(p, label, out = []) {
  const items = await p.evaluate(() => {
    const res = [];
    const vw = innerWidth, vh = innerHeight;
    for (const el of document.querySelectorAll("body *")) {
      if (el.closest(".igc,.story,canvas,.vc,.ta-ph,.brandprev,svg,.zoom,.sk,.hidden,[hidden],.toast:not(.on)")) continue;
      const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join(" ");
      if (!own) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      // only the text itself, never an input or picture beside it in the same element
      const rs = [];
      for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) { const range = document.createRange(); range.selectNodeContents(n); rs.push(...[...range.getClientRects()].filter((r) => r.width > 1 && r.height > 1)); }
      if (!rs.length) continue;
      const r = rs.reduce((a, c) => ({ x: Math.min(a.x, c.x), y: Math.min(a.y, c.y), r: Math.max(a.r, c.right), b: Math.max(a.b, c.bottom) }), { x: 1e9, y: 1e9, r: -1e9, b: -1e9 });
      if (r.b < 0 || r.y > vh || r.r < 0 || r.x > vw) continue;
      // on a phone the page fades out under the floating bar on purpose: text there is leaving
      if (vw <= 980 && r.y > vh - 150 && !el.closest(".tabbar,.comp-wrap,.actrow,.pop,.selbar")) continue;
      let op = 1; for (let e = el; e; e = e.parentElement) op *= Number(getComputedStyle(e).opacity);
      if (op < 0.05) continue;
      // the topmost element at its centre must be this one (or inside it), else it's covered
      const cx = Math.min(vw - 1, Math.max(0, (r.x + r.r) / 2)), cy = Math.min(vh - 1, Math.max(0, (r.y + r.b) / 2));
      const top = document.elementFromPoint(cx, cy);
      if (top && !el.contains(top) && !top.contains(el)) continue;
      res.push({ text: own.slice(0, 44), color: cs.color, size: parseFloat(cs.fontSize), weight: Number(cs.fontWeight), op, rect: r });
    }
    return res;
  });
  const tag = await p.addStyleTag({ content: "*{color:transparent!important;text-shadow:none!important;caret-color:transparent!important;text-decoration-color:transparent!important}::placeholder{color:transparent!important} svg{visibility:hidden}" });
  await p.waitForTimeout(150);
  const png = await p.screenshot();
  await p.evaluate((t) => document.querySelectorAll("style").forEach((s) => s.textContent.startsWith("*{color:transparent") && s.remove()), null);
  const dpr = await p.evaluate(() => devicePixelRatio);
  const { writeFileSync } = await import("fs");
  const safe = label.replace(/[^a-z0-9-]+/gi, "_");
  writeFileSync(`${process.env.MDIR}/${safe}.png`, png);
  writeFileSync(`${process.env.MDIR}/${safe}.json`, JSON.stringify({ label, dpr, items }));
  const fails = 0;
  return fails;
}
