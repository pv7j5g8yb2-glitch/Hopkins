// The intro (Ismael, 2026-11-05), timed from Cosmos' app intro at 60 frames a second:
// the first photo fills the screen and settles (200ms), then a hard cut every 67ms, each photo
// centred, still and its own size, the phone ticking on every cut; the last one shrinks as the
// small pebble lands on it, the big pebble grows in beside it, they hold, the big one leaves, and
// it cuts to HOPKINS while eight photos come in out of a blur and then barely drift. Start, Next
// and a swipe move the pages like one feed; the last page turns the blue of its photo.
(() => {
  const $ = (s) => document.querySelector(s);
  const stage = $("#stage"), strobe = $("#strobe"), mark = $("#mark");
  const small = mark.querySelector(".p-small"), big = mark.querySelector(".p-big");
  const pages = [$("#p1"), $("#p2"), $("#p3"), $("#p4")];
  const foot = $("#foot"), pill = $("#pill"), pillText = $("#pillText"), dots = [...document.querySelectorAll("#dots i")];
  const CUT = 1000 / 15;
  const ease = "cubic-bezier(.22,1,.36,1)";
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const src = (k) => `/static/intro/${k}.jpg`;
  // Cosmos' strobe widths, as a share of the screen's width, in their order.
  const WIDTHS = [236, 218, 202, 164, 180, 206, 149, 206, 186, 192, 211, 136, 117, 208, 199, 194, 214, 186, 198, 179, 190, 221, 210, 220, 210, 200, 140, 90, 204, 168].map((w) => w / 249);
  // Where Cosmos' eight sit around the word: centre x, centre y, width (shares of the screen).
  const SPOTS = [[0.39, 0.296, 0.201], [0.632, 0.337, 0.165], [0.167, 0.35, 0.133], [0.865, 0.387, 0.1], [0.157, 0.59, 0.145], [0.841, 0.599, 0.124], [0.566, 0.652, 0.257], [0.319, 0.659, 0.108]];
  const WEEK = [["Monday", "Post"], ["Tuesday", "Reel"], ["Thursday", "Carousel"], ["Saturday", "Story"]];

  let order, sizes, W, H, page = 0, busy = false, played = false;
  const imgs = {};
  const load = (k) => imgs[k] || (imgs[k] = new Promise((ok) => { const i = new Image(); i.decoding = "async"; i.onload = () => (i.decode ? i.decode().catch(() => {}) : Promise.resolve()).then(() => ok(i)); i.onerror = () => ok(null); i.src = src(k); }));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const frame = () => new Promise((r) => requestAnimationFrame(r));
  const measure = () => { const r = stage.getBoundingClientRect(); W = r.width; H = r.height; };

  // A tick on the phone: Android vibrates; Safari has no vibrate, but toggling a switch ticks.
  const label = $("#tick");
  function tick() {
    try { if (navigator.vibrate && navigator.vibrate(7)) return; } catch {}
    try { label.click(); } catch {}
  }

  // A photo placed by its centre and width, its height from its own shape, never taller than max.
  function place(el, key, cx, cy, w, maxH = 0.62) {
    const [iw, ih] = sizes[key] || [4, 5];
    let pw = w * W, ph = pw * (ih / iw);
    if (ph > maxH * H) { pw *= (maxH * H) / ph; ph = maxH * H; }
    Object.assign(el.style, { width: `${pw}px`, height: `${ph}px`, left: `${cx * W - pw / 2}px`, top: `${cy * H - ph / 2}px` });
  }
  function photo(key, cls = "") {
    const el = document.createElement("img");
    el.src = src(key); el.alt = ""; el.className = cls; el.draggable = false;
    return el;
  }

  function build() {
    measure();
    // Page 1: the eight around the word, each drifting on its own slow clock.
    const collage = $("#collage"); collage.innerHTML = "";
    order.collage.forEach((k, i) => {
      if (!k) return;
      const el = photo(k, "drift");
      place(el, k, ...SPOTS[i], 0.2);
      el.style.setProperty("--d", `${7 + (i * 1.7) % 5}s`);
      el.style.setProperty("--dl", `${-i * 1.3}s`);
      el.style.setProperty("--dx", `${(i % 2 ? -1 : 1) * (1 + (i % 3) * 0.6)}px`);
      el.style.setProperty("--dy", `${(i % 3 ? 1 : -1) * (1.4 + (i % 2) * 0.8)}px`);
      collage.appendChild(el);
    });
    // Page 2: a street, a close up and a room, stacked.
    const stack = $("#stack"); stack.innerHTML = "";
    [[0.4, 0.37, 0.6], [0.72, 0.53, 0.3], [0.43, 0.68, 0.4]].forEach((p, i) => {
      const k = order.page2[i]; if (!k) return;
      const el = photo(k, "drift"); place(el, k, ...p, 0.3);
      el.style.setProperty("--d", `${8 + i * 2}s`); el.style.setProperty("--dl", `${-i * 2}s`);
      stack.appendChild(el);
    });
    // Page 3: the week.
    $("#grid").innerHTML = order.page3.map((k, i) => (k ? `<figure><img src="${src(k)}" alt="" draggable="false"><b>${WEEK[i][0]}</b><span>${WEEK[i][1]}</span></figure>` : "")).join("");
    // Page 4: one photo, its colour everywhere.
    const hero = $("#hero"); hero.innerHTML = "";
    const k = order.page4[0];
    if (k) { const el = photo(k); place(el, k, 0.5, 0.5, 0.62, 0.52); hero.appendChild(el); }
  }

  const show = (el, on) => el.classList.toggle("on", on);
  function setDots(i) { dots.forEach((d, n) => d.classList.toggle("on", n === i)); }

  async function strobeRun() {
    const keys = order.strobe;
    // Wait for the first photos (never more than 2.5s); any that still haven't come are skipped.
    const ready = keys.map((k) => load(k));
    await Promise.race([Promise.all(ready.slice(0, 10)), wait(2500)]);
    const els = [];
    for (const [i, k] of keys.entries()) {
      const el = photo(k);
      place(el, k, 0.5, 0.482, WIDTHS[i % WIDTHS.length]);
      el.style.position = "absolute";
      strobe.appendChild(el);
      els.push(el);
    }
    const loaded = await Promise.all(keys.map((k) => Promise.race([load(k), wait(0).then(() => null)])));
    const list = els.filter((_, i) => loaded[i] || i === 0);
    // The first photo fills the screen and settles to its size.
    const first = list[0];
    first.classList.add("on");
    const fill = Math.max(W / first.offsetWidth, H / first.offsetHeight);
    first.animate([{ transform: `scale(${fill})` }, { transform: "scale(1)" }], { duration: 200, easing: "cubic-bezier(.2,.7,.2,1)" });
    tick();
    await wait(200);
    // Hard cuts on a clock, so a slow frame never stretches the rhythm.
    const t0 = performance.now();
    let shown = 0;
    while (shown < list.length - 1 && !skipped) {
      await frame();
      const due = Math.min(list.length - 1, 1 + Math.floor((performance.now() - t0) / CUT));
      if (due !== shown) { list[shown].classList.remove("on"); list[due].classList.add("on"); shown = due; tick(); }
    }
    if (skipped) return;
    await wait(CUT);
    // Into the pebbles: the last photo shrinks as the small pebble lands on it, then it's gone.
    const last = list[list.length - 1];
    last.animate([{ transform: "scale(1)" }, { transform: "scale(.85)" }], { duration: CUT, easing: "linear", fill: "forwards" });
    mark.style.opacity = 1;
    big.style.transform = "scale(0)";
    small.animate([{ transform: "scale(.4)" }, { transform: "scale(1)" }], { duration: 120, easing: ease });
    await wait(CUT * 2);
    last.classList.remove("on");
    await wait(100);
    if (skipped) return;
    big.animate([{ transform: "scale(0)" }, { transform: "scale(1)" }], { duration: 170, easing: ease, fill: "forwards" });
    tick();
    mark.animate([{ transform: "translate(-50%,-50%) rotate(0deg)" }, { transform: "translate(-50%,-50%) rotate(7deg)" }], { duration: 1300, easing: "ease-in-out", fill: "forwards" });
    await wait(1150);
    if (skipped) return;
    big.animate([{ transform: "scale(1)" }, { transform: "scale(0)" }], { duration: 150, easing: "ease-in", fill: "forwards" });
    await wait(250);
    if (skipped) return;
    reveal();
  }

  // HOPKINS, cut in; the eight come out of a blur; the line, the legal line, the pill, the dashes.
  function reveal() {
    if (played) return;
    played = true;
    strobe.remove();
    mark.style.opacity = 0;
    const p1 = pages[0];
    show(p1, true);
    $("#word").style.opacity = 1;
    tick();
    const D = reduced ? 1 : 730;
    p1.querySelectorAll(".collage img").forEach((el) => el.animate([{ opacity: 0, filter: "blur(14px)", transform: "scale(1.04)" }, { opacity: 1, filter: "blur(0)", transform: "scale(1)" }], { duration: D, easing: ease, fill: "forwards" }));
    p1.querySelector(".line").animate([{ opacity: 0, filter: "blur(6px)" }, { opacity: 1, filter: "blur(0)" }], { duration: D, easing: ease, fill: "both" });
    foot.animate([{ opacity: 0 }, { opacity: 1 }], { duration: D, easing: ease, fill: "forwards" });
    show(foot, true);
    setDots(0);
    setTimeout(() => pill.classList.add("lit"), reduced ? 0 : D - 150);
    setTimeout(() => show($("#login"), true), reduced ? 0 : D);
  }

  let skipped = false;
  function skip() { if (played) return; skipped = true; reveal(); }

  // One surface: the page rises out as the next rises in from below.
  async function go(n) {
    if (busy || n < 0 || n === page) return;
    if (n >= pages.length) { location.href = `/signup${location.search}`; return; }
    busy = true;
    const from = pages[page], to = pages[n], up = n > page;
    const T = reduced ? 1 : 460;
    show(to, true);
    from.animate([{ transform: "translateY(0)", opacity: 1 }, { transform: `translateY(${up ? -14 : 14}%)`, opacity: 0 }], { duration: T, easing: ease, fill: "forwards" });
    to.animate([{ transform: `translateY(${up ? 22 : -22}%)`, opacity: 0 }, { transform: "translateY(0)", opacity: 1 }], { duration: T, easing: ease, fill: "forwards" });
    // the pill's words melt into the next ones; the legal line belongs to the first page only
    pillText.classList.add("swap");
    setTimeout(() => { pillText.textContent = to.dataset.pill; pillText.classList.remove("swap"); }, 180);
    $("#legal").style.opacity = n === 0 ? 1 : 0;
    document.body.classList.toggle("blue", n === 3);
    document.querySelector('meta[name="theme-color"]').content = n === 3 ? "#0A4593" : "#1F1F1F";
    setDots(n);
    tick();
    await wait(T);
    show(from, false);
    from.getAnimations().forEach((a) => a.cancel());
    page = n; busy = false;
  }

  pill.addEventListener("click", () => (played ? go(page + 1) : skip()));
  stage.addEventListener("pointerdown", (e) => { if (!played && !e.target.closest("a")) skip(); });
  let y0 = null;
  stage.addEventListener("touchstart", (e) => { y0 = e.touches[0].clientY; }, { passive: true });
  stage.addEventListener("touchend", (e) => {
    if (y0 == null || !played) return;
    const dy = e.changedTouches[0].clientY - y0; y0 = null;
    if (Math.abs(dy) > 40) go(page + (dy < 0 ? 1 : -1));
  });
  addEventListener("wheel", (e) => { if (played && Math.abs(e.deltaY) > 30) go(page + (e.deltaY > 0 ? 1 : -1)); }, { passive: true });
  addEventListener("keydown", (e) => {
    if (!played) { if (e.key === " " || e.key === "Enter") skip(); return; }
    if (["ArrowDown", "ArrowRight", " "].includes(e.key)) go(page + 1);
    if (["ArrowUp", "ArrowLeft"].includes(e.key)) go(page - 1);
    if (e.key === "Enter") go(page + 1);
  });
  addEventListener("resize", () => { if (played) build(); });

  fetch("/static/intro/order.json").then((r) => r.json()).then((o) => {
    order = o; sizes = o.sizes;
    build();
    // the rest load behind the strobe
    [...o.collage, ...o.page2, ...o.page3, ...o.page4].filter(Boolean).forEach(load);
    if (reduced || /[?&]skip\b/.test(location.search)) reveal(); else strobeRun();
  });
})();
