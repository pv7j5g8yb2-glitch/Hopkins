// Reels the way @gethopkins makes its own (content/reels/engine.js), drawn on a canvas so the app
// can play them in the chat and record them as a video: the hook slams in word by word with a jolt,
// a step's number lands big and tilted in a circle while a line icon draws itself, a figure counts
// up, a list ticks in one by one, a strong line lights up word by word with its key word boxed, and
// the last scene lands the one thing to do. Everything else (looks, fonts, photos) is the same as
// the posts and carousels (web/studio.js), so a reel can be directed the same way.
(() => {
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const P = (t, a, b) => clamp((t - a) / (b - a));
  const ease = (x) => 1 - Math.pow(1 - clamp(x), 3);
  const back = (x) => { x = clamp(x); const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const spacing = (ctx, px) => { try { ctx.letterSpacing = `${px}px`; } catch {} };
  const SANS = '"Inter Tight", Helvetica, Arial, sans-serif';
  const SERIF = '"Instrument Serif", Georgia, serif';

  // Line icons on a 24 grid (the reel engine's set), drawn with rounded strokes.
  const C = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
  const R = (x, y, w, h, r) => `M${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}H${x + r}Q${x} ${y + h} ${x} ${y + h - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`;
  const ICONS = {
    home: "M3 11 12 4l9 7M5.5 9.5V20h13V9.5M10 20v-5h4v5",
    key: `${C(8, 15, 4.5)}M11.2 11.8 20 3M16.5 6.5l2.5 2.5M14 9l2 2`,
    pin: `M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z${C(12, 9.5, 2.6)}`,
    calendar: `${R(3.5, 5, 17, 15.5, 2)}M3.5 10h17M8 3v4M16 3v4`,
    coin: `${C(12, 12, 9)}M14.8 9.2c-.6-1-1.6-1.5-2.8-1.5-1.6 0-2.8.8-2.8 2.1 0 3.1 5.8 1.6 5.8 4.4 0 1.3-1.3 2.1-3 2.1-1.3 0-2.4-.6-3-1.6M12 6v1.7M12 16.3V18`,
    check: "M5 12.5l4.5 4.5L19 7",
    chat: "M4 5h16v11H9l-5 4Z",
    heart: "M12 20s-7-4.4-9-9.2C1.7 7.6 4 4.5 7.2 4.5c2 0 3.6 1.2 4.8 3 1.2-1.8 2.8-3 4.8-3 3.2 0 5.5 3.1 4.2 6.3C19 15.6 12 20 12 20Z",
    eye: `M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z${C(12, 12, 3)}`,
    form: `${R(5, 3, 14, 18, 2)}M8 8h8M8 12h8M8 16h5`,
    target: `${C(12, 12, 9)}${C(12, 12, 5)}${C(12, 12, 1.4)}`,
    sun: `${C(12, 12, 4)}M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4`,
    tree: "M12 21v-5M7 16h10l-5-13Z",
    store: "M3 9.5 4.5 4h15L21 9.5M4.5 9.5V20h15V9.5M3 9.5h18M10 20v-6h4v6",
    user: `${C(12, 8, 4)}M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6`,
    bolt: "M13 2 5 14h6l-1 8 8-12h-6Z",
    alert: "M12 3 2 20h20ZM12 10v4.5M12 17.2v.3",
    refresh: "M20 11a8 8 0 0 0-14.6-4.5L4 8M4 13a8 8 0 0 0 14.6 4.5L20 16M4 4v4h4M20 20v-4h-4",
    plan: `${R(3.5, 3.5, 17, 17, 1.5)}M3.5 12h7v8.5M10.5 3.5v5M14.5 12h6M14.5 12v3`,
    lock: `${R(5, 11, 14, 10, 2)}M8 11V8a4 4 0 0 1 8 0v3`,
    send: "M21 3 10 14M21 3l-7 18-4-7-7-4Z",
    rocket: `M12 3c3 2 5 5.5 5 9.5L15 16H9l-2-3.5C7 8.5 9 5 12 3Z${C(12, 10, 1.8)}M9 16l-1.5 4M15 16l1.5 4`,
    train: `${R(5, 3, 14, 14, 3)}M5 10h14M8 21l2-4M16 21l-2-4`,
    fence: "M4 20V8l2-2 2 2v12M10 20V8l2-2 2 2v12M16 20V8l2-2 2 2v12M3 11h18M3 16h18",
    bookmark: "M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4.2L6 21Z",
    chart: "M4 20V4M4 20h16M8 16l4-5 3 3 5-7",
    tag: `M3 12V4h8l10 10-8 8ZM7.5 7.5h.01`,
    door: `${R(6, 3, 12, 18, 1)}M14.5 12.5v.01M3 21h18`,
  };
  const paths = {};
  const icon = (name) => paths[name] || (paths[name] = new Path2D(ICONS[name] || ICONS.home));
  // An icon drawing itself on: k 0..1. Each stroke of it draws at the same time.
  function drawIcon(ctx, name, cx, cy, size, color, k, width = 1.7) {
    if (k <= 0) return;
    ctx.save();
    ctx.translate(cx - size / 2, cy - size / 2);
    ctx.scale(size / 24, size / 24);
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = "round"; ctx.lineJoin = "round";
    const L = 90;
    ctx.setLineDash([L, L]);
    ctx.lineDashOffset = L * (1 - ease(k));
    ctx.stroke(icon(name));
    ctx.restore();
  }

  // ---------- words ----------
  // Lines of words for a width, each word keeping its own font (one can be the italic serif).
  function lineUp(ctx, text, fonts, size, maxW, lh, accent, boxed = false) {
    const acc = String(accent || "").toLowerCase().replace(/[^\p{L}\p{N}%$']/gu, "");
    const lines = []; let line = [], w = 0;
    ctx.font = fonts.main(size); spacing(ctx, fonts.track(size));
    const space = ctx.measureText(" ").width;
    for (const word of String(text).split(/\s+/).filter(Boolean)) {
      const isAcc = acc && word.toLowerCase().replace(/[^\p{L}\p{N}%$']/gu, "") === acc;
      ctx.font = isAcc ? fonts.accent(size) : fonts.main(size);
      spacing(ctx, isAcc ? 0 : fonts.track(size));
      const tw = ctx.measureText(word).width, pad = isAcc && boxed ? size * 0.2 : 0, ww = tw + pad * 2;
      if (line.length && w + space + ww > maxW) { lines.push(line); line = []; w = 0; }
      line.push({ word, x: line.length ? w + space : 0, w: ww, tw, pad, acc: isAcc, font: isAcc ? fonts.accent(size) : fonts.main(size) });
      w = line.length === 1 ? ww : w + space + ww;
    }
    if (line.length) lines.push(line);
    spacing(ctx, 0);
    lines.forEach((l) => { l.width = l.length ? l[l.length - 1].x + l[l.length - 1].w : 0; });
    return { lines, size, lineH: size * lh, height: lines.length * size * lh, fonts, count: lines.reduce((a, l) => a + l.length, 0) };
  }
  function biggest(ctx, text, fonts, start, min, maxW, maxLines, lh, accent, boxed = false) {
    for (let s = start; s >= min; s -= 4) { const L = lineUp(ctx, text, fonts, s, maxW, lh, accent, boxed); if (L.lines.length <= maxLines) return L; }
    return lineUp(ctx, text, fonts, min, maxW, lh, accent, boxed);
  }
  // Draws laid out words. fx(k) gives each word { a, s, r, dy, lit }: alpha, scale, rotation,
  // rise and how lit it is (a statement lights up word by word).
  function drawWords(ctx, L, x, y, maxW, align, th, fx, { box = false } = {}) {
    let k = 0;
    ctx.textBaseline = "alphabetic";
    L.lines.forEach((line, li) => {
      const off = align === "center" ? (maxW - line.width) / 2 : 0;
      for (const w of line) {
        const f = fx ? fx(k) : { a: 1, s: 1, r: 0, dy: 0, lit: 1 };
        k++;
        if (f.a <= 0.001) continue;
        const bx = x + off + w.x, by = y + li * L.lineH + L.size * 0.82;
        ctx.save();
        ctx.translate(bx + w.w / 2, by - L.size * 0.32 + (f.dy || 0));
        if (f.r) ctx.rotate((f.r * Math.PI) / 180);
        if (f.s !== 1) ctx.scale(f.s, f.s);
        ctx.globalAlpha = clamp(f.a) * (f.lit ?? 1);
        let color = w.acc ? th.accent : th.ink;
        if (w.acc && box) {
          // the key word in a box with a dot at each corner, like a selected layer
          const pad = L.size * 0.14, hgt = L.size * 1.02, bw = (w.tw || w.w) + pad * 2;
          ctx.fillStyle = th.accent;
          roundRect(ctx, -bw / 2, -hgt * 0.56, bw, hgt, 10); ctx.fill();
          ctx.fillStyle = th.bg[0]; ctx.strokeStyle = th.accent; ctx.lineWidth = 4;
          for (const [cx, cy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { ctx.beginPath(); ctx.arc(cx * bw / 2, cy * hgt * 0.5 - hgt * 0.06, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
          color = th.onAccent;
        }
        ctx.font = w.font;
        spacing(ctx, w.acc ? 0 : L.fonts.track(L.size));
        ctx.fillStyle = color;
        ctx.fillText(w.word, -(w.tw || w.w) / 2, L.size * 0.32);
        ctx.restore();
      }
    });
    spacing(ctx, 0);
    return k;
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function label(ctx, text, x, y, color, size, align = "left", alpha = 1) {
    if (!text || alpha <= 0) return 0;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `700 ${size}px ${SANS}`;
    spacing(ctx, size * 0.14);
    ctx.fillStyle = color;
    const t = String(text).toUpperCase(), w = ctx.measureText(t).width;
    ctx.fillText(t, align === "center" ? x - w / 2 : align === "right" ? x - w : x, y);
    ctx.restore();
    return w;
  }

  // ---------- timing ----------
  const wc = (s) => String(s || "").split(/\s+/).filter(Boolean).length;
  const HOOK = 0.2, READ = 0.27;
  function sceneLen(s, i, n) {
    const per = i === 0 ? HOOK : READ;
    let d = 0.3 + wc(s.heading) * per + 0.25;
    if (s.layout === "step" || s.layout === "stat") d += 0.35;
    d += wc(s.body) * 0.16 + (s.points || []).length * 0.6;
    d += i === n - 1 ? 1.6 : i === 0 ? 0.9 : 1.15;
    return clamp(d, 2.2, 7.5);
  }
  function timeline(spec) {
    const n = spec.slides.length; let t = 0;
    return spec.slides.map((s, i) => { const d = sceneLen(s, i, n); const r = { start: t, dur: d }; t += d; return r; });
  }
  const total = (spec) => timeline(spec).reduce((a, x) => a + x.dur, 0);

  // ---------- the ground ----------
  let grain = null;
  function grainPattern(ctx) {
    if (grain) return grain;
    const c = document.createElement("canvas"); c.width = c.height = 180;
    const x = c.getContext("2d"), d = x.createImageData(180, 180);
    for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 12; }
    x.putImageData(d, 0, 0);
    return (grain = ctx.createPattern(c, "repeat"));
  }
  function ground(ctx, W, H, th, t, photo, local) {
    if (photo) {
      // the photo moves slowly the whole scene, so it never sits still
      const z = 1.12 - 0.08 * ease(local / 5), r = Math.max(W / photo.width, H / photo.height) * z;
      const w = photo.width * r, h = photo.height * r;
      ctx.drawImage(photo, (W - w) / 2 + Math.sin(t * 0.3) * 14, (H - h) / 2, w, h);
      ctx.fillStyle = "rgba(8,8,10,.5)"; ctx.fillRect(0, 0, W, H);
      const g = ctx.createLinearGradient(0, H * 0.3, 0, H);
      g.addColorStop(0, "rgba(8,8,10,0)"); g.addColorStop(1, "rgba(8,8,10,.75)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    } else {
      const g = ctx.createLinearGradient(0, 0, W * 0.35, H);
      g.addColorStop(0, th.bg[0]); g.addColorStop(1, th.bg[1]);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // a faint grid drifting upward, like the reel engine's paper
      const step = 54, off = (t * 9) % step;
      ctx.strokeStyle = th.light ? "rgba(0,0,0,.045)" : "rgba(255,255,255,.04)"; ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x <= W; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
      for (let y = -off; y <= H; y += step) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
      ctx.stroke();
      const v = ctx.createRadialGradient(W / 2, H * 0.45, W * 0.3, W / 2, H * 0.45, H * 0.75);
      v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, th.light ? "rgba(0,0,0,.08)" : "rgba(0,0,0,.42)");
      ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    }
    if (th.grain) { ctx.fillStyle = grainPattern(ctx); ctx.save(); ctx.translate((t * 60) % 180, (t * 37) % 180); ctx.fillRect(-180, -180, W + 360, H + 360); ctx.restore(); }
  }

  // ---------- one scene ----------
  const W = 1080, H = 1920, M = 96, MAXW = W - M * 2 - 40;
  function scene(ctx, spec, i, local, o, F, tl) {
    const s0 = spec.slides[i], n = spec.slides.length;
    const th = F.themeFor(spec, s0);
    th.onAccent = F.lum(th.accent) > 0.55 ? "#111111" : "#FFFFFF";
    const s = th.upper ? { ...s0, heading: s0.heading.toUpperCase() } : s0;
    const kind = s.layout || (i === 0 ? "cover" : i === n - 1 && n > 1 ? "close" : "statement");
    const head = F.headFonts(th);
    const bold = { main: (z) => `${th.weight || 700} ${z}px ${th.headFont ? `"${th.headFont}", ` : ""}${SANS}`, accent: (z) => `italic 400 ${Math.round(z * 1.12)}px ${SERIF}`, track: (z) => -z * 0.045 };
    const fonts = th.serif && !th.headFont ? head : bold;
    const body = { main: (z) => `500 ${z}px ${th.bodyFont ? `"${th.bodyFont}", ` : ""}${SANS}`, accent: (z) => `500 ${z}px ${SANS}`, track: () => 0 };
    const per = i === 0 ? HOOK : READ;
    const t0 = 0.18;
    // the words come in on their beat; the hook slams, the rest pop
    const slam = (k, at) => { const p = P(local, at, at + 0.22), e = back(p); return { a: clamp(p * 5), s: 1.55 + (1 - 1.55) * e, r: (k % 2 ? 6 : -6) * (1 - e), dy: 0 }; };
    const popIn = (k, at) => { const p = P(local, at, at + 0.26), e = back(p); return { a: clamp(p * 4), s: 0.6 + 0.4 * e, r: 0, dy: (1 - ease(p)) * 26 }; };
    const rise = (at, d = 0.5) => ease(P(local, at, at + d));
    const C2 = th.center || kind === "cover" || kind === "statement" || kind === "close" || kind === "stat";
    const al = C2 ? "center" : "left";

    if (kind === "cover") {
      const L = biggest(ctx, s.heading, fonts, 176, 96, MAXW, 5, 1.0, s.accent, true);
      const bodyL = s.body ? lineUp(ctx, s.body, body, 54, MAXW * 0.84, 1.34) : null;
      const blockH = (s.kicker ? 90 : 0) + L.height + (bodyL ? 60 + bodyL.height : 0);
      let y = Math.round(H * 0.44 - blockH / 2);
      const kickAt = t0;
      const wordsAt = t0 + (s.kicker ? 0.25 : 0);
      if (s.kicker) {
        const p = P(local, kickAt, kickAt + 0.2), e = back(p);
        ctx.save(); ctx.translate(W / 2, y + 20); ctx.scale(1.4 - 0.4 * e, 1.4 - 0.4 * e); label(ctx, s.kicker, 0, 12, th.accent, 36, "center", clamp(p * 4)); ctx.restore();
        y += 90;
      }
      drawWords(ctx, L, M + 20, y, MAXW, "center", th, (k) => slam(k, wordsAt + k * per), { box: true });
      if (bodyL) { ctx.globalAlpha = rise(wordsAt + L.count * per + 0.15); drawWords(ctx, bodyL, M + 20 + MAXW * 0.08, y + L.height + 60, MAXW * 0.84, "center", { ...th, ink: th.soft, accent: th.soft }, () => ({ a: rise(wordsAt + L.count * per + 0.15), s: 1, r: 0, dy: (1 - rise(wordsAt + L.count * per + 0.15)) * 20 })); ctx.globalAlpha = 1; }
    } else if (kind === "step") {
      const num = String(s.number || i).slice(0, 3);
      const cy = 520, cx = M + 120, rr = 118;
      const p = P(local, t0 - 0.05, t0 + 0.2), e = back(p);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(((i % 2 ? 10 : -10) * (1 - e) * Math.PI) / 180); ctx.scale(1.6 - 0.6 * e, 1.6 - 0.6 * e); ctx.globalAlpha = clamp(p * 5);
      ctx.fillStyle = th.accent; ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = th.onAccent; ctx.font = `700 ${num.length > 1 ? 112 : 136}px ${SANS}`; spacing(ctx, -6); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(num, 0, 8); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; spacing(ctx, 0);
      ctx.restore();
      const L = biggest(ctx, s.heading, fonts, 124, 72, MAXW, 5, 1.02, s.accent);
      const y = cy + rr + 90;
      const at = t0 + 0.35;
      drawWords(ctx, L, M, y, MAXW, "left", th, (k) => popIn(k, at + k * per));
      let yb = y + L.height;
      if (s.body) { const B = lineUp(ctx, s.body, body, 54, MAXW, 1.34); const a = rise(at + L.count * per + 0.1); ctx.globalAlpha = a; drawWords(ctx, B, M, y + L.height + 54, MAXW, "left", { ...th, ink: th.soft, accent: th.soft }, () => ({ a, s: 1, r: 0, dy: (1 - a) * 20 })); ctx.globalAlpha = 1; yb += 54 + B.height; }
      // the one visual: a big line icon drawing itself in the space underneath
      if (s.icon) drawIcon(ctx, s.icon, W - M - 190, Math.max(yb + 260, 1340), 340, th.accent, P(local, t0 + 0.3, t0 + 1.4), 1.25);
    } else if (kind === "stat") {
      const raw = String(s.number || "").slice(0, 10);
      // a single figure counts up; a range or anything else lands as it is
      const m = raw.match(/^([$€£]?)(\d[\d,.]*)([%kKmM+x]?)$/);
      const p = P(local, t0, t0 + 1.0);
      let shown = raw;
      if (m) { const v = parseFloat(m[2].replace(/,/g, "")), dec = (m[2].split(".")[1] || "").length; shown = `${m[1]}${(v * ease(p)).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec })}${m[3]}`; }
      let size = 380; ctx.font = `italic 400 ${size}px ${SERIF}`; const nw = ctx.measureText(raw).width; if (nw > MAXW) size = Math.floor((size * MAXW) / nw);
      const e = back(P(local, t0 - 0.05, t0 + 0.25));
      ctx.save(); ctx.translate(W / 2, 760); ctx.scale(1.3 - 0.3 * e, 1.3 - 0.3 * e); ctx.globalAlpha = clamp(P(local, t0 - 0.05, t0 + 0.1));
      ctx.font = `italic 400 ${size}px ${SERIF}`; ctx.fillStyle = th.accent; ctx.textAlign = "center"; ctx.fillText(shown, 0, size * 0.3); ctx.textAlign = "left"; ctx.restore();
      const L = biggest(ctx, s.heading, fonts, 112, 66, MAXW, 4, 1.02, s.accent);
      const y = 760 + size * 0.42 + 40, at = t0 + 0.6;
      if (s.kicker) label(ctx, s.kicker, W / 2, 760 - size * 0.62, th.soft, 34, "center", rise(t0));
      drawWords(ctx, L, M + 20, y, MAXW, "center", th, (k) => popIn(k, at + k * per));
      if (s.body) { const B = lineUp(ctx, s.body, body, 52, MAXW * 0.86, 1.34); const a = rise(at + L.count * per + 0.1); ctx.globalAlpha = a; drawWords(ctx, B, M + 20 + MAXW * 0.07, y + L.height + 50, MAXW * 0.86, "center", { ...th, ink: th.soft, accent: th.soft }, () => ({ a, s: 1, r: 0, dy: (1 - a) * 20 })); ctx.globalAlpha = 1; }
    } else if (kind === "list") {
      const L = biggest(ctx, s.heading, fonts, 120, 70, MAXW, 3, 1.02, s.accent);
      let y = 440;
      if (s.kicker) { label(ctx, s.kicker, M, y, th.accent, 34, "left", rise(t0)); y += 70; }
      drawWords(ctx, L, M, y, MAXW, "left", th, (k) => popIn(k, t0 + k * per));
      y += L.height + 80;
      const start = t0 + L.count * per + 0.2;
      (s.points || []).forEach((pt, k) => {
        const at = start + k * 0.6, a = ease(P(local, at, at + 0.3));
        const R2 = lineUp(ctx, pt, { ...body, main: (z) => `600 ${z}px ${SANS}` }, 62, MAXW - 140, 1.22);
        const e = back(P(local, at, at + 0.3));
        ctx.save(); ctx.translate(M + 44, y + 34); ctx.scale(0.4 + 0.6 * e, 0.4 + 0.6 * e); ctx.globalAlpha = clamp(a * 3);
        ctx.fillStyle = th.accent; ctx.beginPath(); ctx.arc(0, 4, 46, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        drawIcon(ctx, "check", M + 44, y + 38, 58, th.onAccent, P(local, at + 0.1, at + 0.45), 3);
        ctx.globalAlpha = a; drawWords(ctx, R2, M + 130, y, MAXW - 140, "left", th, () => ({ a, s: 1, r: 0, dy: (1 - a) * 18 })); ctx.globalAlpha = 1;
        y += Math.max(R2.height, 80) + 56;
      });
    } else if (kind === "statement") {
      const L = biggest(ctx, s.heading, fonts, 140, 80, MAXW, 6, 1.02, s.accent, true);
      const bodyL = s.body ? lineUp(ctx, s.body, body, 54, MAXW * 0.84, 1.34) : null;
      const y = Math.round(H * 0.45 - (L.height + (bodyL ? 60 + bodyL.height : 0)) / 2);
      if (s.kicker) label(ctx, s.kicker, W / 2, y - 70, th.accent, 34, "center", rise(t0));
      if (s.icon) drawIcon(ctx, s.icon, W / 2, y - (s.kicker ? 250 : 190), 180, th.accent, P(local, t0, t0 + 0.9), 1.5);
      // every word is there faintly, and lights up as it's read
      drawWords(ctx, L, M + 20, y, MAXW, "center", th, (k) => { const at = t0 + 0.1 + k * per, p = P(local, at, at + 0.18), e = back(p); return { a: 1, lit: 0.16 + 0.84 * clamp(p), s: 1 + 0.06 * Math.sin(Math.PI * clamp(p)) * (e > 0 ? 1 : 0), r: 0, dy: 0 }; }, { box: true });
      if (bodyL) { const a = rise(t0 + 0.2 + L.count * per); ctx.globalAlpha = a; drawWords(ctx, bodyL, M + 20 + MAXW * 0.08, y + L.height + 60, MAXW * 0.84, "center", { ...th, ink: th.soft, accent: th.soft }, () => ({ a, s: 1, r: 0, dy: (1 - a) * 20 })); ctx.globalAlpha = 1; }
    } else {
      // the last scene: one symbol, the line, and the one thing to do on a pill
      const L = biggest(ctx, s.heading, fonts, 136, 78, MAXW, 4, 1.02, s.accent);
      const y = Math.round(H * 0.44 - L.height / 2);
      const p = P(local, t0 - 0.05, t0 + 0.22), e = back(p);
      ctx.save(); ctx.translate(W / 2, y - 170); ctx.rotate((-8 * (1 - e) * Math.PI) / 180); ctx.scale(1.5 - 0.5 * e, 1.5 - 0.5 * e); ctx.globalAlpha = clamp(p * 5);
      ctx.fillStyle = th.accent; ctx.beginPath(); ctx.arc(0, 0, 92, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      drawIcon(ctx, s.icon || "bookmark", W / 2, y - 170, 96, th.onAccent, P(local, t0 + 0.1, t0 + 0.7), 2.2);
      const at = t0 + 0.3;
      drawWords(ctx, L, M + 20, y, MAXW, "center", th, (k) => slam(k, at + k * per));
      const pill = s.body || "";
      if (pill) {
        const pa = at + L.count * per + 0.2, q = back(P(local, pa, pa + 0.3));
        ctx.font = `700 50px ${SANS}`;
        const pw = Math.min(MAXW, ctx.measureText(pill).width + 110);
        ctx.save(); ctx.translate(W / 2, y + L.height + 140); ctx.scale(0.5 + 0.5 * q, 0.5 + 0.5 * q); ctx.globalAlpha = clamp(P(local, pa, pa + 0.12));
        ctx.fillStyle = th.ink; roundRect(ctx, -pw / 2, -56, pw, 112, 56); ctx.fill();
        ctx.fillStyle = th.bg[0]; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(pill, 0, 2, MAXW - 60); ctx.restore();
      }
      const handle = spec.handle ?? o.agent;
      if (handle) label(ctx, handle, W / 2, y + L.height + 300, th.soft, 30, "center", rise(at + L.count * per + 0.5));
    }
  }

  // The reel at time t: the ground, the scene (its first beat hits on a cut, its end lifts away),
  // the progress along the top, the name.
  function reelAt(ctx, spec, o, t, F, bare = false) {
    const tl = timeline(spec);
    let i = tl.findIndex((x) => t < x.start + x.dur);
    if (i < 0) i = tl.length - 1;
    const local = t - tl[i].start, left = tl[i].dur - local;
    const s = spec.slides[i];
    const th = F.themeFor(spec, s);
    const photo = spec.theme === "photo" ? o.photoImgs?.[(s.photo || 1) - 1] || o.photoImgs?.[i % (o.photoImgs?.length || 1)] : null;
    ctx.save();
    ground(ctx, W, H, th, t, photo, local);
    // the scene: in on the cut, out with a quick lift in its last fifth of a second
    const out = i < tl.length - 1 ? clamp(1 - left / 0.2) : 0;
    ctx.save();
    if (out > 0) { ctx.globalAlpha = 1 - out; ctx.translate(W / 2, H / 2); ctx.scale(1 + out * 0.06, 1 + out * 0.06); ctx.translate(-W / 2, -H / 2); }
    // the frame jolts as each word of the hook lands
    if ((s.layout || (i === 0 ? "cover" : "")) === "cover") {
      const at0 = 0.18 + (s.kicker ? 0.25 : 0);
      let jx = 0, jy = 0;
      for (let k = 0; k < wc(s.heading); k++) { const d = local - (at0 + k * HOOK + 0.12); if (d >= 0 && d < 0.26) { const f = 11 * (1 - d / 0.26); jx += Math.sin(d * 90) * f; jy += Math.cos(d * 77) * f * 0.6; } }
      ctx.translate(jx, jy);
    }
    scene(ctx, spec, i, local, o, F, tl);
    ctx.restore();
    if (bare) { ctx.restore(); return; }
    // along the top: one segment per scene, like stories
    const n = tl.length, gap = 10, x0 = 64, segW = (W - x0 * 2 - gap * (n - 1)) / n;
    for (let k = 0; k < n; k++) {
      const f = k < i ? 1 : k > i ? 0 : clamp(local / tl[i].dur);
      ctx.fillStyle = th.light ? "rgba(0,0,0,.14)" : "rgba(255,255,255,.22)";
      roundRect(ctx, x0 + k * (segW + gap), 92, segW, 6, 3); ctx.fill();
      if (f > 0) { ctx.fillStyle = th.ink; roundRect(ctx, x0 + k * (segW + gap), 92, segW * f, 6, 3); ctx.fill(); }
    }
    const handle = spec.handle ?? o.agent;
    if (handle) {
      ctx.fillStyle = th.accent; ctx.beginPath(); ctx.arc(x0 + 10, 160, 10, 0, Math.PI * 2); ctx.fill();
      label(ctx, handle, x0 + 34, 169, th.ink, 26);
    }
    ctx.restore();
  }

  // The cover: the hook as it stands once every word has landed (the reel's own first scene), for
  // thumbnails and the cover image that goes with the video.
  function cover(ctx, spec, o, F) { const tl = timeline(spec); reelAt(ctx, spec, o, Math.max(0, tl[0].dur - 0.35), F, true); }
  window.Kinetic = { reelAt, cover, total, timeline, drawIcon, roundRect, ICONS: Object.keys(ICONS) };
})();
