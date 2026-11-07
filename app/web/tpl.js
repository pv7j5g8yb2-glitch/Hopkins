// Draws the template library's posts (app/src/templates.js). Every layout here is copied by eye from
// Ismael's own designs: the agent's photo behind, a dark overlay, one type system per layout. Hopkins
// only fills the words (src/hopkins.js makeTemplatePost); the design is never made up. Slides are
// 1080x1350. Without a photo a quiet dark ground is used so the words still read.
(() => {
  const W = 1080, H = 1350;
  const SANS = '"Inter Tight", Helvetica, Arial, sans-serif', DM = '"DM Sans", "Inter Tight", Helvetica, sans-serif';
  const SERIF = '"Instrument Serif", Georgia, serif', SCRIPT = '"Pinyon Script", "Instrument Serif", cursive', DIDONE = '"Playfair Display", "Instrument Serif", Georgia, serif';
  const CREAM = "#FFFBD6", PAPER = "#F5F3EE", BROWN = "#4A2F1D";
  const imgs = {};
  const load = (src) => imgs[src] || (imgs[src] = new Promise((ok) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; }));
  let fontsOk = null;
  function fonts() {
    if (fontsOk) return fontsOk;
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Pinyon+Script&family=Playfair+Display:wght@400;500&family=Inter+Tight:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap";
    document.head.appendChild(l);
    fontsOk = Promise.race([
      Promise.all(['700 40px "Inter Tight"', '400 40px "DM Sans"', '700 40px "DM Sans"', '400 40px "Pinyon Script"', '400 40px "Playfair Display"', '400 40px "Instrument Serif"', 'italic 400 40px "Instrument Serif"'].map((f) => document.fonts.load(f).catch(() => {}))),
      new Promise((r) => setTimeout(r, 4500)),
    ]);
    return fontsOk;
  }
  const spacing = (ctx, px) => { try { ctx.letterSpacing = `${px}px`; } catch {} };

  function wrap(ctx, text, maxW) {
    const out = [];
    for (const para of String(text || "").split("\n")) {
      let line = "";
      for (const w of para.split(/\s+/).filter(Boolean)) {
        const t = line ? `${line} ${w}` : w;
        if (line && ctx.measureText(t).width > maxW) { out.push(line); line = w; } else line = t;
      }
      out.push(line);
    }
    return out;
  }
  // Writes lines of text; returns the y below the last line.
  function write(ctx, text, x, y, { font, size, color, align = "left", maxW = 860, lh = 1.12, track = 0, shadow = true }) {
    ctx.font = font(size); spacing(ctx, track); ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = "alphabetic";
    if (shadow) { ctx.shadowColor = "rgba(0,0,0,.35)"; ctx.shadowBlur = 14; }
    const lines = wrap(ctx, text, maxW);
    lines.forEach((l, k) => ctx.fillText(l, x, y + size * 0.82 + k * size * lh));
    ctx.shadowBlur = 0; spacing(ctx, 0); ctx.textAlign = "left";
    return y + lines.length * size * lh;
  }
  const heightOf = (ctx, text, { font, size, maxW = 860, lh = 1.12 }) => { ctx.font = font(size); return wrap(ctx, text, maxW).length * size * lh; };

  const PAL = [["#2B2118", "#14100C"], ["#1E2A2B", "#0E1415"], ["#2D2230", "#131016"], ["#2A2A22", "#121210"]];
  function ground(ctx, img, i, { overlay = 0.4, grey = false, box = [0, 0, W, H] } = {}) {
    const [bx, by, bw, bh] = box;
    ctx.save(); ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip();
    if (img) {
      const r = Math.max(bw / img.width, bh / img.height), w = img.width * r, h = img.height * r;
      if (grey) ctx.filter = "grayscale(1) brightness(.9)";
      ctx.drawImage(img, bx + (bw - w) / 2, by + (bh - h) / 2, w, h);
      ctx.filter = "none";
      ctx.fillStyle = `rgba(10,8,6,${overlay})`; ctx.fillRect(bx, by, bw, bh);
    } else {
      const [a, b] = PAL[i % PAL.length];
      const g = ctx.createLinearGradient(bx, by, bx + bw * 0.4, by + bh); g.addColorStop(0, a); g.addColorStop(1, b);
      ctx.fillStyle = g; ctx.fillRect(bx, by, bw, bh);
    }
    ctx.restore();
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function grain(ctx) {
    const c = document.createElement("canvas"); c.width = c.height = 160;
    const x = c.getContext("2d"), d = x.createImageData(160, 160);
    for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 10; }
    x.putImageData(d, 0, 0); ctx.fillStyle = ctx.createPattern(c, "repeat"); ctx.fillRect(0, 0, W, H);
  }
  const lowerFirst = (s) => String(s || "").replace(/^([A-Z])(?=[a-z])/, (m) => m.toLowerCase());

  // ---------- the layouts ----------
  const L = {
    // one small line top left over a dark photo ("When someone...")
    "small-top"(ctx, s, p) {
      ground(ctx, p.img, p.i, { overlay: 0.45 });
      write(ctx, s.body || s.title, 96, 150, { font: (z) => `500 ${z}px ${SANS}`, size: 54, color: "#fff", maxW: 760, lh: 1.16 });
    },
    // a lowercase serif title with a short sans body underneath, left aligned
    "text-photo"(ctx, s, p) {
      ground(ctx, p.img, p.i, { overlay: 0.5 });
      const tH = heightOf(ctx, lowerFirst(s.title), { font: (z) => `400 ${z}px ${SERIF}`, size: 96, maxW: 860, lh: 1.0 });
      const bH = s.body ? heightOf(ctx, s.body, { font: (z) => `500 ${z}px ${SANS}`, size: 42, maxW: 820, lh: 1.3 }) + 36 : 0;
      let y = Math.round(H * 0.52 - (tH + bH) / 2);
      y = write(ctx, lowerFirst(s.title), 110, y, { font: (z) => `400 ${z}px ${SERIF}`, size: 96, color: "#fff", maxW: 860, lh: 1.0 });
      if (s.body) write(ctx, s.body, 110, y + 36, { font: (z) => `500 ${z}px ${SANS}`, size: 42, color: "rgba(255,255,255,.92)", maxW: 820, lh: 1.3 });
    },
    // a bold headline with a small body, bottom left, the agent's portrait behind every slide
    claim(ctx, s, p) {
      ground(ctx, p.img, p.i, { overlay: 0.4 });
      const g = ctx.createLinearGradient(0, H * 0.45, 0, H); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,.72)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const tH = heightOf(ctx, s.title, { font: (z) => `400 ${z}px ${SERIF}`, size: 88, maxW: 800, lh: 1.02 });
      const bH = heightOf(ctx, s.body, { font: (z) => `600 ${z}px ${SANS}`, size: 38, maxW: 760, lh: 1.3 });
      let y = H - 130 - tH - bH - 28;
      y = write(ctx, s.title, 90, y, { font: (z) => `400 ${z}px ${SERIF}`, size: 88, color: "#fff", maxW: 800, lh: 1.02 });
      write(ctx, s.body, 90, y + 28, { font: (z) => `600 ${z}px ${SANS}`, size: 38, color: "rgba(255,255,255,.95)", maxW: 760, lh: 1.3 });
    },
    // cream bold sans, centred ("kinda chic to..." and "first in my bloodline to...")
    kinda(ctx, s, p) {
      ground(ctx, p.img, p.i, { overlay: 0.45 });
      const text = [s.title, s.body].filter(Boolean).join("\n");
      const h = heightOf(ctx, text, { font: (z) => `700 ${z}px ${SANS}`, size: 68, maxW: 760, lh: 1.04 });
      write(ctx, text, W / 2, Math.round(H * 0.46 - h / 2), { font: (z) => `700 ${z}px ${SANS}`, size: 68, color: CREAM, align: "center", maxW: 760, lh: 1.04, track: -1.5 });
    },
    // a notes app card over a dark photo, one funny line under it
    notes(ctx, s, p) {
      ground(ctx, p.img, p.i, { overlay: 0.55 });
      const lines = (s.lines || []).slice(0, 7);
      ctx.font = `600 48px ${SANS}`;
      const cardW = 800, cardH = 150 + lines.length * 62 + 40, x = (W - cardW) / 2, y = 200;
      ctx.save(); ctx.shadowColor = "rgba(0,0,0,.35)"; ctx.shadowBlur = 40; ctx.fillStyle = "#FBF9F4"; roundRect(ctx, x, y, cardW, cardH, 34); ctx.fill(); ctx.restore();
      write(ctx, s.title, x + 50, y + 42, { font: (z) => `700 ${z}px ${SANS}`, size: 52, color: "#1A1A1A", shadow: false, maxW: cardW - 100 });
      ctx.fillStyle = "#D9A400"; ctx.font = `600 36px ${SANS}`;
      lines.forEach((ln, k) => write(ctx, `• ${ln}`, x + 50, y + 130 + k * 62, { font: (z) => `400 ${z}px ${SANS}`, size: 38, color: "#2A2A2A", shadow: false, maxW: cardW - 100 }));
      if (s.caption) write(ctx, s.caption, W / 2, y + cardH + 60, { font: (z) => `700 ${z}px ${SANS}`, size: 50, color: "#fff", align: "center", maxW: 820, lh: 1.1 });
    },
    // a local guide category: lowercase serif title, a bold sans list, a soft fade at the foot
    "list-guide"(ctx, s, p) {
      ground(ctx, p.img, p.i, { overlay: 0.5 });
      const tH = heightOf(ctx, lowerFirst(s.title), { font: (z) => `400 ${z}px ${SERIF}`, size: 104, maxW: 800, lh: 0.98 });
      const items = (s.lines || []).slice(0, 7);
      const row = items.map((t) => { const [a, ...b] = String(t).split(/\s*\|\s*|\n/); return { a, b: b.join(" ") }; });
      const block = tH + 40 + row.length * (row.some((r) => r.b) ? 118 : 84);
      let y = Math.max(140, Math.round(H * 0.5 - block / 2));
      y = write(ctx, lowerFirst(s.title), W / 2, y, { font: (z) => `400 ${z}px ${SERIF}`, size: 104, color: "#fff", align: "center", maxW: 800, lh: 0.98 }) + 40;
      for (const r of row) {
        y = write(ctx, r.a, W / 2, y, { font: (z) => `700 ${z}px ${SANS}`, size: 44, color: "#fff", align: "center", maxW: 880, lh: 1.1 });
        if (r.b) y = write(ctx, r.b, W / 2, y, { font: (z) => `400 ${z}px ${SANS}`, size: 38, color: "rgba(255,255,255,.92)", align: "center", maxW: 880, lh: 1.1 });
        y += 34;
      }
    },
    // a guide or any title cover: small line, a huge condensed serif word, a sans subtitle
    "guide-cover"(ctx, s, p) {
      ground(ctx, p.img, p.i, { overlay: 0.4 });
      write(ctx, s.top || "The", W / 2, 300, { font: (z) => `400 ${z}px ${SCRIPT}`, size: 190, color: "#fff", align: "center", maxW: 900, lh: 1 });
      ctx.save(); ctx.translate(W / 2, 640); ctx.scale(0.78, 1);
      write(ctx, String(s.title || "").toUpperCase(), 0, -100, { font: (z) => `400 ${z}px ${DIDONE}`, size: 290, color: "#fff", align: "center", maxW: 1100, lh: 0.95 });
      ctx.restore();
      if (s.body) write(ctx, s.body, W / 2, 920, { font: (z) => `700 ${z}px ${SANS}`, size: 46, color: "#fff", align: "center", maxW: 860, lh: 1.1 });
    },
    "title-cover"(ctx, s, p) {
      ground(ctx, p.img, p.i, { overlay: 0.45 });
      const h = heightOf(ctx, s.title, { font: (z) => `400 ${z}px ${SERIF}`, size: 150, maxW: 880, lh: 0.98 });
      const y = write(ctx, s.title, W / 2, Math.round(H * 0.46 - h / 2), { font: (z) => `400 ${z}px ${SERIF}`, size: 150, color: "#fff", align: "center", maxW: 880, lh: 0.98 });
      if (s.body) write(ctx, s.body, W / 2, y + 34, { font: (z) => `600 ${z}px ${SANS}`, size: 44, color: "#fff", align: "center", maxW: 820, lh: 1.15 });
    },
    // one photo, grey on top and full colour underneath, a line in each half
    "split-grey"(ctx, s, p) {
      ground(ctx, p.img, p.i, { overlay: 0.4, grey: true, box: [0, 0, W, H / 2] });
      ground(ctx, p.img, p.i, { overlay: 0.35, box: [0, H / 2, W, H / 2] });
      const f = (z) => `700 ${z}px ${SANS}`;
      write(ctx, s.top, W / 2, H / 4 - heightOf(ctx, s.top, { font: f, size: 62, maxW: 800, lh: 1.05 }) / 2, { font: f, size: 62, color: CREAM, align: "center", maxW: 800, lh: 1.05, track: -1 });
      write(ctx, s.bottom, W / 2, (3 * H) / 4 - heightOf(ctx, s.bottom, { font: f, size: 62, maxW: 800, lh: 1.05 }) / 2, { font: f, size: 62, color: CREAM, align: "center", maxW: 800, lh: 1.05, track: -1 });
    },
    "split-two"(ctx, s, p) {
      ground(ctx, p.img, p.i, { overlay: 0.35, box: [0, 0, W, H / 2] });
      ground(ctx, p.img2 || p.img, p.i + 1, { overlay: 0.35, box: [0, H / 2, W, H / 2] });
      const f = (z) => `500 ${z}px ${SANS}`;
      write(ctx, s.top, W / 2, H / 4 - heightOf(ctx, s.top, { font: f, size: 56, maxW: 820, lh: 1.1 }) / 2, { font: f, size: 56, color: "#fff", align: "center", maxW: 820, lh: 1.1 });
      write(ctx, s.bottom, W / 2, (3 * H) / 4 - heightOf(ctx, s.bottom, { font: f, size: 56, maxW: 820, lh: 1.1 }) / 2, { font: f, size: 56, color: "#fff", align: "center", maxW: 820, lh: 1.1 });
    },
    // the last slide: cream page, a script greeting, the agent's portrait in a rounded frame, who they are
    "portrait-end"(ctx, s, p) {
      ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
      write(ctx, s.script || "Hello!", 120, 90, { font: (z) => `400 ${z}px ${SCRIPT}`, size: 150, color: BROWN, maxW: 860, lh: 1, shadow: false });
      const pw = 500, ph = 560, px = (W - pw) / 2, py = 300;
      ctx.save(); roundRect(ctx, px, py, pw, ph, 36); ctx.clip();
      if (p.portrait) { const r = Math.max(pw / p.portrait.width, ph / p.portrait.height), w = p.portrait.width * r, h = p.portrait.height * r; ctx.drawImage(p.portrait, px + (pw - w) / 2, py + (ph - h) / 2, w, h); }
      else { ctx.fillStyle = "#E6E1D6"; ctx.fillRect(px, py, pw, ph); }
      ctx.restore();
      let y = write(ctx, s.title, W / 2, 930, { font: (z) => `400 ${z}px ${SERIF}`, size: 72, color: "#141210", align: "center", maxW: 880, lh: 1.02, shadow: false });
      if (s.body) write(ctx, s.body, W / 2, y + 30, { font: (z) => `400 ${z}px ${SANS}`, size: 34, color: "#2A2622", align: "center", maxW: 840, lh: 1.3, shadow: false });
    },
  };

  async function draw(canvas, spec, i, o = {}) {
    await fonts();
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    const s = spec.slides[i];
    const urls = o.photos || [];
    const pick = (k) => (urls.length ? urls[((Number.isFinite(k) ? k : i) % urls.length + urls.length) % urls.length] : null);
    const img = await load(pick(s.photo ?? i));
    const img2 = s.layout === "split-two" ? await load(pick((s.photo ?? i) + 1)) : null;
    const portrait = o.portrait ? await load(o.portrait) : null;
    (L[s.layout] || L["text-photo"])(ctx, s, { img, img2, portrait, i });
    if (s.layout !== "portrait-end") grain(ctx);
  }
  window.Tpl = { draw, layouts: Object.keys(L), W, H };
})();
