// Liquid Glass for the phone tab bar.
//
// The lens: a drop of glass behind the selected tab that moves on a spring, stretches along its
// path while it travels and squashes as it lands, swells when you press, and follows your
// finger if you drag across the bar, settling on the nearest tab when you let go. The glass also
// turns dark with light labels over dark content, like iOS.
//
// No refraction (the background bending at the glass edge): browsers can only do it with SVG
// filters inside backdrop-filter, which WebKit (every iPhone browser) doesn't support and Chrome
// draws with banding on high density screens. Tried and dropped on 2026-10-24.
(function () {
  const cap = document.getElementById("lgCap");
  const lens = document.getElementById("lgLens");
  if (!cap || !lens) return;
  const tabs = [...cap.querySelectorAll("a[data-nav]")];
  const phone = () => window.matchMedia("(max-width: 980px)").matches;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- the lens on a spring ----------

  const st = { x: 0, v: 0, target: 0, w: 0, press: 0, pressTarget: 0, pv: 0, running: false, ready: false };
  const PAD = 4;

  function geometry() {
    const r = cap.getBoundingClientRect();
    st.w = (r.width - PAD * 2) / tabs.length;
    lens.style.width = st.w + "px";
    return r;
  }
  const xFor = (i) => i * st.w;

  function draw() {
    // Stretch with speed along the direction of travel and thin a little across it, the way a
    // drop of liquid does; swell when pressed.
    const speed = Math.min(1, Math.abs(st.v) / 2200);
    const sx = 1 + speed * 0.32 + st.press * 0.16;
    const sy = 1 - speed * 0.14 + st.press * 0.24;
    lens.style.transform = `translateX(${st.x}px) scale(${sx.toFixed(4)},${sy.toFixed(4)})`;
  }

  let last = 0;
  function tick(t) {
    try { step(t); } catch (err) { st.running = false; last = 0; }
  }
  function step(t) {
    const dt = Math.min(0.032, (t - (last || t)) / 1000) || 0.016;
    last = t;
    // A slightly underdamped spring: it overshoots a touch and settles, like iOS.
    const k = dragging ? 900 : 380, c = dragging ? 48 : 26;
    const a = -k * (st.x - st.target) - c * st.v;
    st.v += a * dt;
    st.x += st.v * dt;
    const pk = 520, pc = 30;
    st.pv += (-pk * (st.press - st.pressTarget) - pc * st.pv) * dt;
    st.press += st.pv * dt;
    draw();
    const settled = Math.abs(st.x - st.target) < 0.2 && Math.abs(st.v) < 4 && Math.abs(st.press - st.pressTarget) < 0.002 && Math.abs(st.pv) < 0.02;
    if (settled && !dragging) {
      st.x = st.target; st.v = 0; st.press = st.pressTarget; st.pv = 0;
      draw();
      st.running = false;
      last = 0;
      return;
    }
    requestAnimationFrame(tick);
  }
  function kick() {
    if (reduce) { st.x = st.target; st.press = st.pressTarget; draw(); return; }
    if (!st.running) { st.running = true; requestAnimationFrame(tick); }
  }

  function current() {
    return tabs.findIndex((a) => a.classList.contains("on"));
  }

  function select(i, instant) {
    lens.style.opacity = i < 0 ? "0" : "1";
    if (i < 0) return;
    st.target = xFor(i);
    if (instant || !st.ready) { st.x = st.target; st.v = 0; draw(); st.ready = true; return; }
    kick();
  }

  // The app marks the active tab with .on; follow it whenever that changes.
  new MutationObserver(() => { if (!dragging) select(current()); }).observe(cap, { subtree: true, attributes: true, attributeFilter: ["class"] });
  window.addEventListener("resize", () => { geometry(); select(current(), true); });

  // ---------- press and drag across the bar ----------

  // Nothing here may leave the bar stuck. iOS can cancel a touch part way through (and reports
  // no position when it does), send its end somewhere other than the bar, or not send it at
  // all. So: the last known finger position decides where the lens lands whether the touch
  // ended or was cancelled; the end is also heard on the whole window; a new touch always
  // starts fresh, whatever happened to the last one; and a touch that never ends is let go of
  // after a few seconds.
  let dragging = false, lastX = 0, pointerId = null, navigatedAt = 0, watchdog = 0;
  const indexAt = (x) => Math.max(0, Math.min(tabs.length - 1, Math.round(x / st.w)));
  const clampX = (r, clientX) => Math.max(0, Math.min(r.width - PAD * 2 - st.w, clientX - r.left - PAD - st.w / 2));

  function settle() {
    clearTimeout(watchdog);
    dragging = false;
    pointerId = null;
    st.pressTarget = 0;
    setTimeout(() => lens.classList.remove("press"), 140);
  }

  cap.addEventListener("pointerdown", (e) => {
    if (!phone() || (e.pointerType === "mouse" && e.button !== 0)) return;
    if (dragging) settle();
    const r = geometry();
    if (st.w <= 0) return;
    dragging = true;
    lastX = e.clientX;
    pointerId = e.pointerId;
    try { cap.setPointerCapture(e.pointerId); } catch {}
    lens.classList.add("press");
    lens.style.opacity = "1";
    st.pressTarget = 1;
    st.target = clampX(r, e.clientX);
    kick();
    clearTimeout(watchdog);
    watchdog = setTimeout(() => { if (dragging) { settle(); select(current()); } }, 4000);
  });
  const move = (e) => {
    if (!dragging || e.pointerId !== pointerId) return;
    if (e.clientX) lastX = e.clientX;
    st.target = clampX(cap.getBoundingClientRect(), lastX);
  };
  function release(e) {
    if (!dragging || e.pointerId !== pointerId) return;
    if (e.type === "pointerup" && e.clientX) lastX = e.clientX;
    settle();
    const i = indexAt(clampX(cap.getBoundingClientRect(), lastX));
    st.target = xFor(i);
    kick();
    go(i);
  }
  function go(i) {
    const href = tabs[i].getAttribute("href");
    navigatedAt = Date.now();
    if (location.hash !== href) location.hash = href;
    else {
      // Tapping the tab you're already on takes you back to the top, like iOS.
      const page = document.querySelector("#main .page");
      if (page) page.scrollTo({ top: 0, behavior: "smooth" });
      select(i);
    }
  }
  cap.addEventListener("pointermove", move);
  window.addEventListener("pointermove", move, { passive: true });
  for (const type of ["pointerup", "pointercancel"]) {
    cap.addEventListener(type, release);
    window.addEventListener(type, release, true);
  }
  cap.addEventListener("lostpointercapture", (e) => { if (dragging && e.pointerId === pointerId) release(e); });
  // Leaving the app mid touch (a call, the app switcher) ends it without navigating.
  document.addEventListener("visibilitychange", () => { if (dragging) { settle(); select(current()); } });
  // The tap that follows a handled touch is swallowed so it doesn't navigate twice. Any other tap
  // (keyboard, or a touch this code never saw) goes through as a normal tab.
  cap.addEventListener("click", (e) => {
    if (Date.now() - navigatedAt < 700) { e.preventDefault(); return; }
    const a = e.target.closest("a[data-nav]");
    if (a && phone()) { e.preventDefault(); go(tabs.indexOf(a)); }
  });

  // ---------- light or dark glass, from what's behind ----------
  //
  // Apple's bar turns dark with light labels when the content under it is dark. The browser
  // can't read pixels under an element, so this looks at what is there: a photo or an ad is
  // sampled from a small copy of the image (same origin, so it's readable), anything else by
  // its background colour.
  const lumCache = new Map();
  function imageLum(url) {
    if (lumCache.has(url)) return lumCache.get(url);
    const entry = { grid: null };
    lumCache.set(url, entry);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = 24; c.height = 24;
      const g = c.getContext("2d", { willReadFrequently: true });
      g.drawImage(img, 0, 0, 24, 24);
      entry.grid = g.getImageData(0, 0, 24, 24).data;
      entry.w = img.naturalWidth; entry.h = img.naturalHeight;
      adapt();
    };
    img.src = url;
    return entry;
  }
  const lum = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  function colorLum(el) {
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      const m = getComputedStyle(e).backgroundColor.match(/[\d.]+/g);
      if (m && (m[3] === undefined || Number(m[3]) > 0.5)) return lum(+m[0], +m[1], +m[2]);
    }
    return 0.97;
  }
  function sampleAt(x, y) {
    const els = document.elementsFromPoint(x, y).filter((e) => !e.closest("#tabbar"));
    for (const el of els.slice(0, 4)) {
      if (el.tagName === "CANVAS" && el.width) {
        try {
          const r = el.getBoundingClientRect();
          const px = el.getContext("2d").getImageData(Math.floor(((x - r.left) / r.width) * el.width), Math.floor(((y - r.top) / r.height) * el.height), 1, 1).data;
          return lum(px[0], px[1], px[2]);
        } catch { break; }
      }
      const bg = getComputedStyle(el).backgroundImage;
      const m = bg && bg.match(/url\("?([^")]+)"?\)/);
      if (m) {
        const entry = imageLum(m[1]);
        if (!entry.grid) return null;
        // background-size: cover, centred
        const r = el.getBoundingClientRect();
        const s = Math.max(r.width / entry.w, r.height / entry.h);
        const iw = entry.w * s, ih = entry.h * s;
        const u = (x - r.left - (r.width - iw) / 2) / iw, v = (y - r.top - (r.height - ih) / 2) / ih;
        const gx = Math.max(0, Math.min(23, Math.floor(u * 24))), gy = Math.max(0, Math.min(23, Math.floor(v * 24)));
        const i = (gy * 24 + gx) * 4;
        return lum(entry.grid[i], entry.grid[i + 1], entry.grid[i + 2]);
      }
    }
    return colorLum(els[0]);
  }
  let adaptQueued = false;
  function adapt() {
    if (adaptQueued) return;
    adaptQueued = true;
    requestAnimationFrame(() => {
      adaptQueued = false;
      if (!phone()) return;
      for (const el of [cap, document.querySelector(".lg-circle")]) {
        const r = el.getBoundingClientRect();
        if (!r.width) continue;
        const ys = [r.top + r.height * 0.3, r.top + r.height * 0.7];
        const vals = [];
        for (let k = 0; k < 5; k++) for (const y of ys) { const v = sampleAt(r.left + (r.width * (k + 0.5)) / 5, y); if (v !== null) vals.push(v); }
        if (!vals.length) continue;
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
        // a little hysteresis so it doesn't flicker on mid tones
        const dark = el.classList.contains("dark") ? avg < 0.56 : avg < 0.46;
        el.classList.toggle("dark", dark);
      }
    });
  }
  document.addEventListener("scroll", adapt, { capture: true, passive: true });
  window.addEventListener("resize", adapt);
  new MutationObserver(adapt).observe(document.getElementById("main"), { childList: true, subtree: true });

  function start() {
    if (geometry().width <= 0) return;
    select(current(), true);
    adapt();
  }
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start);
  // The bar can be hidden at load (inside a listing); set it up the first time it shows.
  window.addEventListener("hashchange", () => setTimeout(() => {
    const visible = cap.getBoundingClientRect().width > 0;
    if (visible && st.w <= 0) start();
    else if (visible) select(current());
  }, 0));
})();
