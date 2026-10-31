// Posts, carousels, stories and reels, drawn from what the model wrote (src/brain.js
// creationAI). Carousels and posts are 1080x1350 slides, stories and reels 1080x1920. A reel is
// the same scenes animated: the words rise in one by one, a scene holds long enough to read, then
// the next crossfades in. Recorded in the browser as an MP4 where it can be (iPhone, recent
// Chrome), WebM otherwise.
(() => {
  const SIZES = { carousel: [1080, 1350], post: [1080, 1350], story: [1080, 1920], reel: [1080, 1920] };
  const THEMES = {
    paper: { bg: ["#F3EFE8", "#ECE6DB"], ink: "#141414", soft: "rgba(20,20,20,.72)", accent: "#D9532F", rule: "rgba(20,20,20,.14)" },
    night: { bg: ["#102552", "#060E24"], ink: "#FFFFFF", soft: "rgba(255,255,255,.8)", accent: "#FFB49A", rule: "rgba(255,255,255,.18)" },
    bold: { bg: ["#1E3A2C", "#15281F"], ink: "#F5EFE4", soft: "rgba(245,239,228,.82)", accent: "#E8C36A", rule: "rgba(245,239,228,.2)" },
    photo: { bg: ["#0B1430", "#060B1A"], ink: "#FFFFFF", soft: "rgba(255,255,255,.86)", accent: "#FFC8A8", rule: "rgba(255,255,255,.22)" },
  };
  const FONT = '"Inter Tight", Helvetica, Arial, sans-serif';
  const imgs = {};
  const load = (src) => imgs[src] || (imgs[src] = new Promise((ok) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; }));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = (x) => 1 - Math.pow(1 - clamp(x, 0, 1), 3);

  // Lines of words that fit a width, each word with its x, so a reel can bring words in one by one.
  function layout(ctx, text, size, weight, maxW, lineH) {
    ctx.font = `${weight} ${size}px ${FONT}`;
    const space = ctx.measureText(" ").width;
    const lines = [];
    let line = [], w = 0;
    for (const word of String(text).split(/\s+/).filter(Boolean)) {
      const ww = ctx.measureText(word).width;
      if (line.length && w + space + ww > maxW) { lines.push(line); line = []; w = 0; }
      line.push({ word, x: line.length ? w + space : 0, w: ww });
      w = line.length === 1 ? ww : w + space + ww;
    }
    if (line.length) lines.push(line);
    return { lines, size, weight, lineH: size * lineH, height: lines.length * size * lineH };
  }
  // The biggest heading size that keeps it to a few lines.
  function fit(ctx, text, start, min, maxW, maxLines) {
    for (let s = start; s >= min; s -= 4) { const L = layout(ctx, text, s, 700, maxW, 1.02); if (L.lines.length <= maxLines) return L; }
    return layout(ctx, text, min, 700, maxW, 1.02);
  }

  function background(ctx, W, H, th, photo, zoom = 1) {
    if (photo) {
      const r = Math.max(W / photo.width, H / photo.height) * zoom;
      const w = photo.width * r, h = photo.height * r;
      ctx.drawImage(photo, (W - w) / 2, (H - h) / 2, w, h);
      const g = ctx.createLinearGradient(0, H * 0.25, 0, H);
      g.addColorStop(0, "rgba(6,11,26,0)"); g.addColorStop(0.55, "rgba(6,11,26,.62)"); g.addColorStop(1, "rgba(6,11,26,.9)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const t = ctx.createLinearGradient(0, 0, 0, H * 0.22);
      t.addColorStop(0, "rgba(6,11,26,.45)"); t.addColorStop(1, "rgba(6,11,26,0)");
      ctx.fillStyle = t; ctx.fillRect(0, 0, W, H * 0.22);
      return;
    }
    const g = ctx.createLinearGradient(0, 0, W * 0.3, H);
    g.addColorStop(0, th.bg[0]); g.addColorStop(1, th.bg[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  // A fine grain, so flat colour looks printed rather than on a screen.
  let grain = null;
  function grainPattern(ctx) {
    if (grain) return grain;
    const c = document.createElement("canvas"); c.width = c.height = 160;
    const x = c.getContext("2d"), d = x.createImageData(160, 160);
    for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 10; }
    x.putImageData(d, 0, 0);
    return (grain = ctx.createPattern(c, "repeat"));
  }

  function words(ctx, L, x, y, color, appear) {
    ctx.font = `${L.weight} ${L.size}px ${FONT}`;
    ctx.fillStyle = color;
    ctx.textBaseline = "alphabetic";
    let k = 0;
    L.lines.forEach((line, li) => {
      for (const w of line) {
        const a = appear ? appear(k) : 1;
        k++;
        if (a <= 0) continue;
        ctx.globalAlpha = a;
        ctx.fillText(w.word, x + w.x, y + li * L.lineH + L.size * 0.8 + (1 - a) * 26);
      }
    });
    ctx.globalAlpha = 1;
    return k;
  }

  // One slide or scene. anim: { t } seconds into a reel scene; without it, everything shows.
  function frame(ctx, spec, i, o, anim) {
    const [W, H] = SIZES[o.kind] || SIZES.post;
    const th = THEMES[spec.theme] || THEMES.paper;
    const s = spec.slides[i];
    const n = spec.slides.length;
    const photo = spec.theme === "photo" ? o.photoImgs?.[(s.photo || 1) - 1] || o.photoImgs?.[0] : null;
    ctx.save();
    ctx.letterSpacing = "0px";
    background(ctx, W, H, th, photo, anim ? 1 + 0.05 * clamp(anim.t / 5, 0, 1) : 1);
    ctx.fillStyle = grainPattern(ctx); ctx.fillRect(0, 0, W, H);
    const M = 96, maxW = W - M * 2, tall = H > 1500;
    const cover = i === 0, last = i === n - 1 && n > 1;
    // top: where in the set this is, and whose it is
    ctx.font = `600 30px ${FONT}`;
    ctx.fillStyle = th.accent;
    if (n > 1) ctx.fillText(`${String(i + 1).padStart(2, "0")} / ${String(n).padStart(2, "0")}`, M, tall ? 170 : 130);
    ctx.font = `500 28px ${FONT}`;
    ctx.fillStyle = th.soft;
    const who = o.agent || "";
    if (who) { const w = ctx.measureText(who).width; ctx.fillText(who, W - M - w, tall ? 170 : 130); }
    // the words
    try { ctx.letterSpacing = "-2px"; } catch {}
    const head = fit(ctx, s.heading, cover ? (tall ? 132 : 118) : (tall ? 104 : 92), 54, maxW, cover ? 5 : 4);
    try { ctx.letterSpacing = "0px"; } catch {}
    const body = s.body ? layout(ctx, s.body, tall ? 46 : 40, 400, maxW, 1.34) : null;
    const gap = body ? (tall ? 44 : 36) : 0;
    const block = head.height + gap + (body ? body.height : 0);
    const y0 = photo ? H - (tall ? 300 : 200) - block : cover ? Math.round(H * (tall ? 0.36 : 0.3)) : (tall ? 360 : 260);
    if (!photo && !cover) { ctx.fillStyle = th.accent; ctx.fillRect(M, y0 - 44, 64, 6); }
    const start = anim ? 0.2 : 0;
    const per = 0.07;
    try { ctx.letterSpacing = "-2px"; } catch {}
    const count = words(ctx, head, M, y0, th.ink, anim ? (k) => ease((anim.t - start - k * per) / 0.4) : null);
    try { ctx.letterSpacing = "0px"; } catch {}
    if (body) {
      const bt = start + count * per + 0.25;
      ctx.globalAlpha = anim ? ease((anim.t - bt) / 0.5) : 1;
      words(ctx, body, M, y0 + head.height + gap, th.soft, null);
      ctx.globalAlpha = 1;
    }
    // bottom: a hairline and the way on
    const by = H - (tall ? 200 : 120);
    ctx.fillStyle = th.rule; ctx.fillRect(M, by, maxW, 2);
    ctx.font = `500 28px ${FONT}`;
    ctx.fillStyle = th.soft;
    const foot = o.kind === "carousel" && !last ? "Swipe" : o.footer || "";
    if (foot) ctx.fillText(foot, M, by + 52);
    if (o.kind === "carousel" && !last) {
      ctx.strokeStyle = th.accent; ctx.lineWidth = 4; ctx.lineCap = "round";
      const ax = W - M, ay = by + 42;
      ctx.beginPath(); ctx.moveTo(ax - 54, ay); ctx.lineTo(ax, ay); ctx.moveTo(ax - 16, ay - 14); ctx.lineTo(ax, ay); ctx.lineTo(ax - 16, ay + 14); ctx.stroke();
    }
    ctx.restore();
  }

  async function prepare(spec, o) {
    o.photoImgs = spec.theme === "photo" && o.photos?.length ? await Promise.all(o.photos.map(load)) : [];
    if (document.fonts?.load) await Promise.all([document.fonts.load(`700 100px ${FONT}`), document.fonts.load(`400 40px ${FONT}`), document.fonts.load(`600 30px ${FONT}`)]).catch(() => {});
  }

  async function drawSlide(canvas, spec, i, o) {
    await prepare(spec, o);
    const [W, H] = SIZES[o.kind] || SIZES.post;
    canvas.width = W; canvas.height = H;
    frame(canvas.getContext("2d"), spec, i, o, null);
  }

  // How long each scene holds: long enough to read its words.
  const sceneLen = (s) => clamp(2.4 + (String(s.heading).split(/\s+/).length + String(s.body || "").split(/\s+/).length * 0.6) * 0.2, 2.8, 5);
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
    ctx.fillStyle = "rgba(255,255,255,.22)"; ctx.fillRect(0, 0, W, 8);
    ctx.fillStyle = (THEMES[spec.theme] || THEMES.paper).accent; ctx.fillRect(0, 0, W * clamp(t / total(spec), 0, 1), 8);
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
