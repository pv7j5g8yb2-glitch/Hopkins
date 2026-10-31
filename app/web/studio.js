// Posts, carousels, stories and reels, drawn from what the model wrote (src/brain.js
// creationAI). Carousels and posts are 1080x1350 slides, stories and reels 1080x1920. A reel is
// the same scenes animated: the words rise in one by one, a scene holds long enough to read, then
// the next crossfades in. Recorded in the browser as an MP4 where it can be (iPhone, recent
// Chrome), WebM otherwise.
(() => {
  const SIZES = { carousel: [1080, 1350], post: [1080, 1350], story: [1080, 1920], reel: [1080, 1920] };
  // Each look is a small type system: the ground, the ink, a quieter ink, one accent, hairlines,
  // and whether headings are set in the serif (quiet luxury) or the grotesk with one italic word.
  const THEMES = {
    ivory: { bg: ["#F5F0E7", "#EAE3D6"], ink: "#1C1A17", soft: "rgba(28,26,23,.66)", accent: "#97724C", rule: "rgba(28,26,23,.14)", serif: true },
    noir: { bg: ["#18181A", "#0B0B0C"], ink: "#F3EFE8", soft: "rgba(243,239,232,.68)", accent: "#C9A57B", rule: "rgba(243,239,232,.16)", serif: true },
    modern: { bg: ["#F7F6F3", "#EEEDE8"], ink: "#111111", soft: "rgba(17,17,17,.64)", accent: "#D9532F", rule: "rgba(17,17,17,.12)", serif: false },
    bold: { bg: ["#1F3B2E", "#152A20"], ink: "#F4EEE2", soft: "rgba(244,238,226,.78)", accent: "#E9C46A", rule: "rgba(244,238,226,.2)", serif: false },
    night: { bg: ["#13295A", "#081332"], ink: "#FFFFFF", soft: "rgba(255,255,255,.76)", accent: "#FFB49A", rule: "rgba(255,255,255,.18)", serif: false },
    photo: { bg: ["#0B1430", "#060B1A"], ink: "#FFFFFF", soft: "rgba(255,255,255,.86)", accent: "#FFC8A8", rule: "rgba(255,255,255,.24)", serif: false },
  };
  THEMES.paper = THEMES.ivory; // made before 2026-10-31
  const SANS = '"Inter Tight", Helvetica, Arial, sans-serif';
  const SERIF = '"Instrument Serif", Georgia, serif';
  const imgs = {};
  const load = (src) => imgs[src] || (imgs[src] = new Promise((ok) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; }));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = (x) => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
  const spacing = (ctx, px) => { try { ctx.letterSpacing = `${px}px`; } catch {} };

  // Lines of words that fit a width. Each word carries its own font, so a heading can set one word
  // in italic serif; each word keeps its x so a reel can bring words in one by one.
  function layout(ctx, text, fonts, size, maxW, lineH, accent = "") {
    const acc = String(accent || "").toLowerCase().replace(/[^\p{L}\p{N}%$']/gu, "");
    const lines = [];
    let line = [], w = 0;
    for (const word of String(text).split(/\s+/).filter(Boolean)) {
      const isAcc = acc && word.toLowerCase().replace(/[^\p{L}\p{N}%$']/gu, "") === acc;
      const font = isAcc ? fonts.accent(size) : fonts.main(size);
      ctx.font = font;
      spacing(ctx, isAcc ? 0 : fonts.track(size));
      const ww = ctx.measureText(word).width;
      ctx.font = fonts.main(size);
      const space = ctx.measureText(" ").width;
      if (line.length && w + space + ww > maxW) { lines.push(line); line = []; w = 0; }
      line.push({ word, x: line.length ? w + space : 0, w: ww, font, acc: isAcc });
      w = line.length === 1 ? ww : w + space + ww;
    }
    if (line.length) lines.push(line);
    spacing(ctx, 0);
    lines.forEach((l) => { l.width = l.length ? l[l.length - 1].x + l[l.length - 1].w : 0; });
    return { lines, size, lineH: size * lineH, height: lines.length * size * lineH, fonts };
  }
  const headFonts = (th) => th.serif
    ? { main: (s) => `400 ${s}px ${SERIF}`, accent: (s) => `italic 400 ${s}px ${SERIF}`, track: (s) => -s * 0.012 }
    : { main: (s) => `700 ${s}px ${SANS}`, accent: (s) => `italic 400 ${Math.round(s * 1.08)}px ${SERIF}`, track: (s) => -s * 0.035 };
  const bodyFonts = (weight = 400) => ({ main: (s) => `${weight} ${s}px ${SANS}`, accent: (s) => `${weight} ${s}px ${SANS}`, track: () => 0 });
  // The biggest heading size that keeps it to a few lines.
  function fit(ctx, text, th, start, min, maxW, maxLines, accent) {
    const lh = th.serif ? 1.02 : 0.98;
    for (let s = start; s >= min; s -= 4) { const L = layout(ctx, text, headFonts(th), s, maxW, lh, accent); if (L.lines.length <= maxLines) return L; }
    return layout(ctx, text, headFonts(th), min, maxW, lh, accent);
  }

  function background(ctx, W, H, th, photo, zoom = 1) {
    if (photo) {
      const r = Math.max(W / photo.width, H / photo.height) * zoom;
      const w = photo.width * r, h = photo.height * r;
      ctx.drawImage(photo, (W - w) / 2, (H - h) / 2, w, h);
      const g = ctx.createLinearGradient(0, H * 0.25, 0, H);
      g.addColorStop(0, "rgba(6,11,26,0)"); g.addColorStop(0.55, "rgba(6,11,26,.64)"); g.addColorStop(1, "rgba(6,11,26,.92)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const t = ctx.createLinearGradient(0, 0, 0, H * 0.22);
      t.addColorStop(0, "rgba(6,11,26,.5)"); t.addColorStop(1, "rgba(6,11,26,0)");
      ctx.fillStyle = t; ctx.fillRect(0, 0, W, H * 0.22);
      return;
    }
    const g = ctx.createLinearGradient(0, 0, W * 0.4, H);
    g.addColorStop(0, th.bg[0]); g.addColorStop(1, th.bg[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // A soft light from the top left, so the ground has depth without a pattern.
    const r = ctx.createRadialGradient(W * 0.15, H * 0.05, 0, W * 0.15, H * 0.05, W * 1.1);
    r.addColorStop(0, th.serif || th.ink === "#111111" ? "rgba(255,255,255,.35)" : "rgba(255,255,255,.07)"); r.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
  }
  // A fine grain, so flat colour looks printed rather than on a screen.
  let grain = null;
  function grainPattern(ctx) {
    if (grain) return grain;
    const c = document.createElement("canvas"); c.width = c.height = 160;
    const x = c.getContext("2d"), d = x.createImageData(160, 160);
    for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 9; }
    x.putImageData(d, 0, 0);
    return (grain = ctx.createPattern(c, "repeat"));
  }

  // Words of a laid out block. align: "left" or "center". appear(k) gives each word's 0..1.
  function words(ctx, L, x, y, color, accentColor, { align = "left", appear = null, maxW = 0 } = {}) {
    ctx.textBaseline = "alphabetic";
    let k = 0;
    L.lines.forEach((line, li) => {
      const off = align === "center" ? (maxW - line.width) / 2 : 0;
      for (const w of line) {
        const a = appear ? appear(k) : 1;
        k++;
        if (a <= 0) continue;
        ctx.globalAlpha = a * (ctx.__alpha ?? 1);
        ctx.font = w.font;
        spacing(ctx, w.acc ? 0 : L.fonts.track(L.size));
        ctx.fillStyle = w.acc ? accentColor : color;
        ctx.fillText(w.word, x + off + w.x, y + li * L.lineH + L.size * 0.8 + (1 - a) * 24);
      }
    });
    spacing(ctx, 0);
    ctx.globalAlpha = ctx.__alpha ?? 1;
    return k;
  }
  function label(ctx, text, x, y, color, size = 24, align = "left") {
    ctx.font = `600 ${size}px ${SANS}`;
    spacing(ctx, size * 0.16);
    ctx.fillStyle = color;
    const t = String(text).toUpperCase();
    const w = ctx.measureText(t).width;
    ctx.fillText(t, align === "center" ? x - w / 2 : align === "right" ? x - w : x, y);
    spacing(ctx, 0);
    return w;
  }
  // The one symbol on the last slide: a bookmark, thick rounded strokes.
  function bookmark(ctx, cx, cy, size, color) {
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = size * 0.11; ctx.lineJoin = "round"; ctx.lineCap = "round";
    const w = size * 0.62, h = size;
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, cy - h / 2 + w * 0.18);
    ctx.quadraticCurveTo(cx - w / 2, cy - h / 2, cx - w / 2 + w * 0.18, cy - h / 2);
    ctx.lineTo(cx + w / 2 - w * 0.18, cy - h / 2);
    ctx.quadraticCurveTo(cx + w / 2, cy - h / 2, cx + w / 2, cy - h / 2 + w * 0.18);
    ctx.lineTo(cx + w / 2, cy + h / 2);
    ctx.lineTo(cx, cy + h / 2 - w * 0.42);
    ctx.lineTo(cx - w / 2, cy + h / 2);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  // One slide or scene. anim: { t } seconds into a reel scene; without it, everything shows.
  function frame(ctx, spec, i, o, anim) {
    const [W, H] = SIZES[o.kind] || SIZES.post;
    const th = THEMES[spec.theme] || THEMES.ivory;
    const s = spec.slides[i];
    const n = spec.slides.length;
    const photo = spec.theme === "photo" ? o.photoImgs?.[(s.photo || 1) - 1] || o.photoImgs?.[0] : null;
    const kind = s.layout || (i === 0 ? "cover" : i === n - 1 && n > 1 ? "close" : "statement");
    ctx.save();
    spacing(ctx, 0);
    background(ctx, W, H, th, photo, anim ? 1 + 0.05 * clamp(anim.t / 5, 0, 1) : 1);
    ctx.fillStyle = grainPattern(ctx); ctx.fillRect(0, 0, W, H);
    const tall = H > 1500;
    const M = 104, maxW = W - M * 2;
    const top = tall ? 200 : 132, footY = H - (tall ? 210 : 132);
    // Reels: the heading's words rise in one by one, everything else fades in after.
    const per = 0.06, start = anim ? 0.15 : 0;
    const wordIn = anim ? (k) => ease((anim.t - start - k * per) / 0.42) : null;
    const after = (k) => (anim ? ease((anim.t - start - k * per - 0.2) / 0.5) : 1);
    const fade = (a) => { ctx.__alpha = a; ctx.globalAlpha = a; };

    // The top line: where in the set this is, and whose it is.
    if (n > 1) label(ctx, `${String(i + 1).padStart(2, "0")} / ${String(n).padStart(2, "0")}`, M, top, th.soft, 22);
    if (o.agent) label(ctx, o.agent, W - M, top, th.soft, 22, "right");

    let used = 0;
    if (kind === "cover" || kind === "statement") {
      const cover = kind === "cover";
      const head = fit(ctx, s.heading, th, cover ? (tall ? 156 : 140) : (tall ? 120 : 104), 60, maxW, cover ? 5 : 6, s.accent);
      const body = s.body ? layout(ctx, s.body, bodyFonts(), tall ? 44 : 40, maxW * 0.86, 1.4) : null;
      const kick = s.kicker ? 64 : 0;
      const block = kick + head.height + (body ? 48 + body.height : 0);
      const y0 = photo ? footY - 90 - block : Math.round((top + footY) / 2 - block / 2 + (cover ? 30 : 0));
      if (s.kicker) {
        ctx.fillStyle = th.accent; ctx.fillRect(M, y0 - 6, 56, 3);
        label(ctx, s.kicker, M + 76, y0 + 4, th.accent, 24);
      }
      used = words(ctx, head, M, y0 + kick, th.ink, th.accent, { appear: wordIn });
      if (body) { fade(after(used)); words(ctx, body, M, y0 + kick + head.height + 48, th.soft, th.soft); fade(1); }
    } else if (kind === "step" || kind === "stat") {
      const big = s.number || (kind === "step" ? String(i) : "");
      let numSize = kind === "stat" ? (tall ? 300 : 260) : (tall ? 380 : 330);
      // A long figure ("2 to 5%") gets smaller until it fits the width.
      ctx.font = `400 ${numSize}px ${SERIF}`;
      const nw = ctx.measureText(big).width;
      if (nw > maxW) numSize = Math.floor(numSize * maxW / nw);
      const head = fit(ctx, s.heading, th, tall ? 104 : 92, 56, maxW, 4, s.accent);
      const body = s.body ? layout(ctx, s.body, bodyFonts(), tall ? 44 : 40, maxW * 0.9, 1.4) : null;
      const kick = s.kicker ? 64 : 0;
      const block = numSize * 0.86 + 40 + kick + head.height + (body ? 44 + body.height : 0);
      const y0 = Math.round((top + footY) / 2 - block / 2 + 20);
      fade(anim ? ease((anim.t - 0.05) / 0.5) : 1);
      ctx.font = `${kind === "step" ? "italic " : ""}400 ${numSize}px ${SERIF}`;
      spacing(ctx, -numSize * 0.02);
      ctx.fillStyle = kind === "step" ? th.accent : th.ink;
      ctx.fillText(big, M - numSize * 0.04, y0 + numSize * 0.74);
      spacing(ctx, 0);
      fade(1);
      let y = y0 + numSize * 0.86 + 40;
      if (s.kicker) { label(ctx, s.kicker, M, y + 4, th.accent, 24); y += kick; }
      used = words(ctx, head, M, y, th.ink, th.accent, { appear: wordIn });
      if (body) { fade(after(used)); words(ctx, body, M, y + head.height + 44, th.soft, th.soft); fade(1); }
    } else if (kind === "list") {
      const head = fit(ctx, s.heading, th, tall ? 96 : 84, 54, maxW, 3, s.accent);
      const rows = s.points.map((p) => layout(ctx, p, bodyFonts(500), tall ? 42 : 38, maxW - 96, 1.3));
      const rowH = rows.map((r) => r.height + 52);
      const kick = s.kicker ? 64 : 0;
      const block = kick + head.height + 56 + rowH.reduce((a, b) => a + b, 0);
      let y = Math.round((top + footY) / 2 - block / 2 + 10);
      if (s.kicker) { label(ctx, s.kicker, M, y + 4, th.accent, 24); y += kick; }
      used = words(ctx, head, M, y, th.ink, th.accent, { appear: wordIn });
      y += head.height + 56;
      rows.forEach((r, k) => {
        fade(after(used + k * 3));
        ctx.fillStyle = th.rule; ctx.fillRect(M, y, maxW, 2);
        label(ctx, String(k + 1).padStart(2, "0"), M, y + 26 + r.size * 0.8, th.accent, 24);
        words(ctx, r, M + 96, y + 26, th.ink, th.ink);
        y += rowH[k];
      });
      fade(1);
    } else {
      // The last slide: one symbol, the line, what to do, centred.
      const head = fit(ctx, s.heading, th, tall ? 108 : 96, 56, maxW, 4, s.accent);
      const body = s.body ? layout(ctx, s.body, bodyFonts(), tall ? 44 : 40, maxW * 0.84, 1.4) : null;
      const icon = tall ? 120 : 104;
      const block = icon + 72 + head.height + (body ? 44 + body.height : 0);
      const y0 = Math.round((top + footY) / 2 - block / 2);
      fade(anim ? ease((anim.t - 0.05) / 0.5) : 1);
      bookmark(ctx, W / 2, y0 + icon / 2, icon, th.accent);
      fade(1);
      used = words(ctx, head, M, y0 + icon + 72, th.ink, th.accent, { align: "center", appear: wordIn, maxW });
      if (body) { fade(after(used)); words(ctx, body, M + (maxW - maxW * 0.84) / 2, y0 + icon + 72 + head.height + 44, th.soft, th.soft, { align: "center", maxW: maxW * 0.84 }); fade(1); }
    }

    // The footer strip: a hairline, the series on the left, the progress on the right.
    ctx.fillStyle = th.rule; ctx.fillRect(M, footY, maxW, 2);
    const series = spec.title || o.footer || "";
    if (series) label(ctx, series, M, footY + 54, th.soft, 20);
    if (n > 1) {
      const d = 9, gap = 12, wAll = n * d + (n - 1) * gap;
      for (let k = 0; k < n; k++) {
        ctx.beginPath();
        ctx.fillStyle = k === i ? th.accent : th.rule;
        const x = W - M - wAll + k * (d + gap) + (k === i ? 0 : 0);
        ctx.arc(x + d / 2, footY + 46, k === i ? d * 0.62 : d / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.__alpha = 1;
    ctx.restore();
  }

  async function prepare(spec, o) {
    o.photoImgs = spec.theme === "photo" && o.photos?.length ? await Promise.all(o.photos.map(load)) : [];
    if (document.fonts?.load) await Promise.all([`700 100px ${SANS}`, `500 40px ${SANS}`, `400 40px ${SANS}`, `600 24px ${SANS}`, `400 100px ${SERIF}`, `italic 400 100px ${SERIF}`].map((f) => document.fonts.load(f))).catch(() => {});
  }

  async function drawSlide(canvas, spec, i, o) {
    await prepare(spec, o);
    const [W, H] = SIZES[o.kind] || SIZES.post;
    canvas.width = W; canvas.height = H;
    frame(canvas.getContext("2d"), spec, i, o, null);
  }

  // How long each scene holds: long enough to read its words.
  const sceneLen = (s) => clamp(2.4 + (String(s.heading).split(/\s+/).length + String(s.body || "").split(/\s+/).length * 0.6 + (s.points || []).join(" ").split(/\s+/).length * 0.6) * 0.2, 2.8, 6);
  function timeline(spec) { let t = 0; return spec.slides.map((s) => { const d = sceneLen(s); const r = { start: t, dur: d }; t += d; return r; }); }
  const total = (spec) => timeline(spec).reduce((a, x) => a + x.dur, 0);

  // A reel at time t (seconds): the scene, crossfading into the next in its last 0.35s.
  function reelAt(ctx, spec, o, t) {
    const tl = timeline(spec);
    let i = tl.findIndex((x) => t < x.start + x.dur);
    if (i < 0) i = tl.length - 1;
    const local = t - tl[i].start;
    frame(ctx, spec, i, o, { t: local });
    const fade = 0.35, left = tl[i].dur - local;
    if (left < fade && i < tl.length - 1) {
      ctx.globalAlpha = 1 - left / fade;
      frame(ctx, spec, i + 1, o, { t: 0 });
      ctx.globalAlpha = 1;
    }
    // a thin line along the top: how far through the reel
    const [W] = SIZES[o.kind];
    ctx.fillStyle = (THEMES[spec.theme] || THEMES.ivory).rule; ctx.fillRect(0, 0, W, 8);
    ctx.fillStyle = (THEMES[spec.theme] || THEMES.ivory).accent; ctx.fillRect(0, 0, W * clamp(t / total(spec), 0, 1), 8);
  }

  // Plays a reel in a canvas on loop until stop() is called.
  async function playReel(canvas, spec, o) {
    await prepare(spec, o);
    const [W, H] = SIZES[o.kind] || SIZES.reel;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    const len = total(spec);
    let raf = 0, t0 = performance.now(), on = true;
    const tick = (now) => { if (!on) return; reelAt(ctx, spec, o, ((now - t0) / 1000) % len); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => { on = false; cancelAnimationFrame(raf); };
  }

  // Records the reel as a video file, in real time.
  async function recordReel(spec, o) {
    await prepare(spec, o);
    const [W, H] = SIZES[o.kind] || SIZES.reel;
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    c.style.cssText = "position:fixed;left:0;top:0;width:2px;height:2px;opacity:0;pointer-events:none";
    document.body.appendChild(c);
    const ctx = c.getContext("2d");
    const types = ["video/mp4;codecs=avc1.42E01E", "video/mp4", "video/webm;codecs=vp9", "video/webm"];
    const type = types.find((x) => window.MediaRecorder && MediaRecorder.isTypeSupported(x));
    if (!type) { c.remove(); throw new Error("This browser can't make videos. Try Safari or Chrome."); }
    const stream = c.captureStream(30);
    const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 10_000_000 });
    const parts = [];
    rec.ondataavailable = (e) => e.data.size && parts.push(e.data);
    const len = total(spec);
    reelAt(ctx, spec, o, 0);
    const done = new Promise((ok) => (rec.onstop = ok));
    rec.start(250);
    const t0 = performance.now();
    await new Promise((ok) => {
      const tick = (now) => {
        const t = (now - t0) / 1000;
        reelAt(ctx, spec, o, Math.min(t, len - 0.001));
        if (t >= len + 0.3) return ok();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    rec.stop();
    await done;
    stream.getTracks().forEach((x) => x.stop());
    c.remove();
    return new Blob(parts, { type: type.split(";")[0] });
  }

  window.Studio = { SIZES, THEMES, drawSlide, playReel, recordReel, total };
})();
