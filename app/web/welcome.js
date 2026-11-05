// Hopkins' front door (Ismael, 2026-11-05), timed from Cosmos' app at 60 frames a second.
// Intro: the first photo fills the screen and settles (200ms), a hard cut every 67ms, each photo
// centred and its own size; the last shrinks as the small pebble lands on it, the big pebble grows
// in beside it, they hold, the big one leaves, and it cuts to HOPKINS while eight homes gravitate
// in out of a blur and keep floating. Start, Next or a swipe move the pages like one feed.
// Then one question at a time: the email decides sign in or sign up.
(() => {
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const stage = $("#stage"), strobe = $("#strobe"), mark = $("#mark");
  const small = mark.querySelector(".p-small"), big = mark.querySelector(".p-big");
  const pages = [$("#p1"), $("#p2"), $("#p3"), $("#p4")];
  const foot = $("#foot"), pill = $("#pill"), pillText = $("#pillText"), dots = [...document.querySelectorAll("#dots i")];
  const CUT = 1000 / 15;
  const ease = "cubic-bezier(.22,1,.36,1)";
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const src = (k) => `/static/intro/${k}.jpg`;
  const params = new URLSearchParams(location.search);
  const invite = params.get("invite") || sessionStorage.getItem("hpk-invite") || "";
  if (invite) sessionStorage.setItem("hpk-invite", invite);
  // Cosmos' strobe widths, as a share of the screen's width, in their order.
  const WIDTHS = [236, 218, 202, 164, 180, 206, 149, 206, 186, 192, 211, 136, 117, 208, 199, 194, 214, 186, 198, 179, 190, 221, 210, 220, 210, 200, 140, 90, 204, 168].map((w) => w / 249);
  // The eight homes around the word: centre x, centre y, width (shares of the screen), each its own
  // size so none of it reads as a grid.
  const SPOTS = [[0.24, 0.3, 0.3], [0.64, 0.275, 0.21], [0.9, 0.37, 0.16], [0.47, 0.375, 0.15], [0.14, 0.615, 0.2], [0.49, 0.67, 0.28], [0.85, 0.62, 0.22], [0.13, 0.755, 0.13]];
  const WEEK = [["Monday", "Post"], ["Tuesday", "Reel"], ["Thursday", "Carousel"], ["Saturday", "Story"]];

  let order, sizes, W, H, page = 0, busy = false, played = false, skipped = false;
  const imgs = {};
  const load = (k) => imgs[k] || (imgs[k] = new Promise((ok) => { const i = new Image(); i.decoding = "async"; i.onload = () => (i.decode ? i.decode().catch(() => {}) : Promise.resolve()).then(() => ok(i)); i.onerror = () => ok(null); i.src = src(k); }));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const frame = () => new Promise((r) => requestAnimationFrame(r));
  const measure = () => { const r = stage.getBoundingClientRect(); W = r.width; H = r.height; };

  // A tick: Android vibrates; on an iPhone a switch toggled inside a tap ticks. Neither works
  // before the first tap (browsers' rule), so the strobe only ticks where the phone allows it.
  const label = $("#tick");
  function tick() {
    try { if (navigator.vibrate && navigator.vibrate(8)) return; } catch {}
    try { label.click(); } catch {}
  }

  function place(el, key, cx, cy, w, maxH = 0.62) {
    const [iw, ih] = sizes[key] || [4, 5];
    let pw = w * W, ph = pw * (ih / iw);
    if (ph > maxH * H) { pw *= (maxH * H) / ph; ph = maxH * H; }
    Object.assign(el.style, { width: `${pw}px`, height: `${ph}px`, left: `${cx * W - pw / 2}px`, top: `${cy * H - ph / 2}px` });
  }
  function photo(key) {
    const el = document.createElement("img");
    el.src = src(key); el.alt = ""; el.draggable = false;
    return el;
  }

  // ---------- floating: every photo on its own slow path, a little closer or further away, and
  // leaning towards the pointer or the tilt of the phone ----------
  const floaters = [];
  let lookX = 0, lookY = 0, tx = 0, ty = 0;
  addEventListener("pointermove", (e) => { lookX = (e.clientX / innerWidth - 0.5) * 2; lookY = (e.clientY / innerHeight - 0.5) * 2; }, { passive: true });
  addEventListener("deviceorientation", (e) => { if (e.gamma == null) return; lookX = Math.max(-1, Math.min(1, e.gamma / 25)); lookY = Math.max(-1, Math.min(1, (e.beta - 45) / 25)); }, { passive: true });
  function float(el, i, depth = 1, enter = null) {
    floaters.push({ el, ax: 5 + ((i * 37) % 7), ay: 6 + ((i * 53) % 8), fx: 0.00021 + ((i * 13) % 9) * 0.00003, fy: 0.00017 + ((i * 29) % 7) * 0.00003, px: i * 1.7, py: i * 2.3, rot: 0.5 + ((i * 7) % 5) * 0.22, depth, enter });
  }
  function drift(now) {
    tx += (lookX - tx) * 0.05; ty += (lookY - ty) * 0.05;
    for (const f of floaters) {
      if (!f.el.isConnected) continue;
      let k = 1, ox = 0, oy = 0, s = 1, blur = 0, op = 1;
      if (f.enter) {
        const p = Math.min(1, (now - f.enter.t0) / f.enter.d);
        k = 1 - Math.pow(1 - p, 4);
        ox = f.enter.dx * (1 - k); oy = f.enter.dy * (1 - k);
        s = 0.9 + 0.1 * k; blur = 16 * (1 - k); op = Math.min(1, p * 1.6);
        if (p >= 1) f.enter = null;
      }
      const x = Math.sin(now * f.fx + f.px) * f.ax + tx * 10 * f.depth + ox;
      const y = Math.cos(now * f.fy + f.py) * f.ay + ty * 8 * f.depth + oy;
      const r = Math.sin(now * f.fx * 0.7 + f.py) * f.rot;
      const b = s * (1 + Math.sin(now * f.fy * 0.6 + f.px) * 0.012);
      f.el.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) rotate(${r.toFixed(3)}deg) scale(${b.toFixed(4)})`;
      if (blur > 0.05 || op < 1) { f.el.style.filter = `blur(${blur.toFixed(1)}px)`; f.el.style.opacity = op; }
      else if (f.el.style.filter) { f.el.style.filter = ""; f.el.style.opacity = 1; }
    }
    requestAnimationFrame(drift);
  }
  requestAnimationFrame(drift);

  // How far a photo can float from where it's placed (its path plus the lean), kept clear of text.
  const ROOM = 24;
  const rel = (el) => { const r = el.getBoundingClientRect(), s = stage.getBoundingClientRect(); return { top: r.top - s.top, bottom: r.bottom - s.top, left: r.left - s.left, right: r.right - s.left }; };
  function textBox(el) { const r = document.createRange(); r.selectNodeContents(el); const b = r.getBoundingClientRect(), s = stage.getBoundingClientRect(); return { top: b.top - s.top, bottom: b.bottom - s.top, left: b.left - s.left, right: b.right - s.left }; }
  // Moves and, if it must, shrinks a placed photo into [top, bottom], inside the screen's sides.
  function keepIn(el, top, bottom) {
    let w = parseFloat(el.style.width), h = parseFloat(el.style.height), x = parseFloat(el.style.left), y = parseFloat(el.style.top);
    const room = bottom - top;
    if (h > room) { const k = room / h; x += (w - w * k) / 2; w *= k; h = room; }
    y = Math.min(Math.max(y, top), bottom - h);
    x = Math.min(Math.max(x, ROOM / 2), W - ROOM / 2 - w);
    Object.assign(el.style, { width: `${w}px`, height: `${h}px`, left: `${x}px`, top: `${y}px` });
  }
  function build() {
    measure();
    floaters.length = 0;
    stage.style.setProperty("--lineSize", `${Math.max(16, Math.min(21, W * 0.05))}px`);
    stage.style.setProperty("--wordSize", `${Math.round(W * 0.118)}px`);
    const collage = $("#collage"); collage.innerHTML = "";
    order.collage.forEach((k, i) => {
      if (!k) return;
      const el = photo(k); place(el, k, ...SPOTS[i], 0.17);
      // the bigger the photo, the closer it seems: it moves more with the tilt
      el.style.zIndex = Math.round(SPOTS[i][2] * 10);
      collage.appendChild(el); float(el, i, 0.4 + SPOTS[i][2] * 2.2);
    });
    // above the word or below it, never over the line at the top, the word or the legal line
    {
      const line = textBox(pages[0].querySelector(".line")), word = textBox($("#word")), legal = rel($("#legal"));
      const footTop = Math.min(legal.top, rel(pill).top);
      collage.querySelectorAll("img").forEach((el, i) => {
        const above = SPOTS[i][1] < 0.485;
        keepIn(el, above ? line.bottom + ROOM : word.bottom + ROOM, above ? word.top - ROOM : footTop - ROOM);
      });
    }
    const stack = $("#stack"); stack.innerHTML = "";
    [[0.36, 0.37, 0.66, 0.34], [0.77, 0.52, 0.38, 0.3], [0.44, 0.685, 0.5, 0.3]].forEach((p, i) => {
      const k = order.page2[i]; if (!k) return;
      const el = photo(k); place(el, k, p[0], p[1], p[2], p[3]); el.style.zIndex = i === 1 ? 3 : 1;
      stack.appendChild(el); float(el, i + 10, 0.8);
    });
    const lineBottom = textBox(pages[1].querySelector(".line")).bottom, pillTop = rel(pill).top;
    stack.querySelectorAll("img").forEach((el) => keepIn(el, lineBottom + ROOM, pillTop - ROOM));
    // the week's grid as large as the screen allows above the button
    const cell = Math.min((W * 0.86 - 10) / 2, ((H * 0.64 - 100) / 2) * 0.8);
    const grid = $("#grid");
    grid.style.width = `${cell * 2 + 10}px`;
    grid.innerHTML = order.page3.map((k, i) => (k ? `<figure><img src="${src(k)}" alt="" draggable="false"><b>${WEEK[i][0]}</b><span>${WEEK[i][1]}</span></figure>` : "")).join("");
    const hero = $("#hero"); hero.innerHTML = "";
    const k = order.page4[0];
    if (k) { const el = photo(k); place(el, k, 0.5, 0.505, 0.78, 0.58); hero.appendChild(el); float(el, 21, 0.6); keepIn(el, textBox(pages[3].querySelector(".line")).bottom + ROOM, rel(pill).top - ROOM); }
  }

  const show = (el, on) => el.classList.toggle("on", on);
  const setDots = (i) => dots.forEach((d, n) => d.classList.toggle("on", n === i));

  async function strobeRun() {
    const keys = order.strobe;
    await Promise.race([Promise.all(keys.slice(0, 10).map(load)), wait(2500)]);
    const els = keys.map((k, i) => { const el = photo(k); place(el, k, 0.5, 0.485, WIDTHS[i % WIDTHS.length]); strobe.appendChild(el); return el; });
    const loaded = await Promise.all(keys.map((k) => Promise.race([load(k), wait(0).then(() => null)])));
    const list = els.filter((_, i) => loaded[i] || i === 0);
    const first = list[0];
    first.classList.add("on");
    const fill = Math.max(W / first.offsetWidth, H / first.offsetHeight);
    first.animate([{ transform: `scale(${fill})` }, { transform: "scale(1)" }], { duration: 200, easing: "cubic-bezier(.2,.7,.2,1)" });
    tick();
    await wait(200);
    const t0 = performance.now();
    let shown = 0;
    while (shown < list.length - 1 && !skipped) {
      await frame();
      const due = Math.min(list.length - 1, 1 + Math.floor((performance.now() - t0) / CUT));
      if (due !== shown) { list[shown].classList.remove("on"); list[due].classList.add("on"); shown = due; tick(); }
    }
    if (skipped) return;
    await wait(CUT);
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
    if (!skipped) reveal();
  }

  // HOPKINS cuts in; the homes come in from further out, out of a blur, and settle into floating.
  function reveal() {
    if (played) return;
    played = true;
    strobe.remove();
    mark.style.opacity = 0;
    show(pages[0], true);
    $("#word").style.opacity = 1;
    const t0 = performance.now(), D = reduced ? 1 : 1100;
    const cx = W / 2, cy = H * 0.485;
    for (const f of floaters) {
      if (!f.el.closest("#collage")) continue;
      const r = f.el.getBoundingClientRect(), s = stage.getBoundingClientRect();
      const ex = r.left - s.left + r.width / 2 - cx, ey = r.top - s.top + r.height / 2 - cy;
      f.enter = { t0, d: D, dx: ex * 0.05, dy: ey * 0.05 };
      f.el.style.opacity = 0;
    }
    pages[0].querySelector(".line").animate([{ opacity: 0, filter: "blur(6px)" }, { opacity: 1, filter: "blur(0)" }], { duration: 730, easing: ease, fill: "both" });
    foot.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 730, easing: ease, fill: "forwards" });
    show(foot, true);
    setDots(0);
    setTimeout(() => pill.classList.add("lit"), reduced ? 0 : 580);
    setTimeout(() => show($("#login"), true), reduced ? 0 : 730);
  }
  const skip = () => { if (!played) { skipped = true; reveal(); } };

  async function go(n) {
    if (busy || n < 0 || n === page) return;
    if (n >= pages.length) { openFlow("email"); return; }
    busy = true;
    const from = pages[page], to = pages[n], up = n > page;
    const T = reduced ? 1 : 440;
    show(to, true);
    from.animate([{ transform: "translateY(0)", opacity: 1 }, { transform: `translateY(${up ? -16 : 16}%)`, opacity: 0 }], { duration: T, easing: ease, fill: "forwards" });
    to.animate([{ transform: `translateY(${up ? 24 : -24}%)`, opacity: 0 }, { transform: "translateY(0)", opacity: 1 }], { duration: T, easing: ease, fill: "forwards" });
    pillText.classList.add("swap");
    setTimeout(() => { pillText.textContent = to.dataset.pill; pillText.classList.remove("swap"); }, 160);
    $("#legal").style.opacity = n === 0 ? 1 : 0;
    document.body.classList.toggle("blue", n === 3);
    themeColor(n === 3 ? "#0A4593" : "#1F1F1F");
    setDots(n);
    await wait(T);
    show(from, false);
    from.getAnimations().forEach((a) => a.cancel());
    page = n; busy = false;
  }
  const themeColor = (c) => { document.querySelector('meta[name="theme-color"]').content = c; };

  pill.addEventListener("click", () => { tick(); played ? go(page + 1) : skip(); });
  $("#login").addEventListener("click", () => { tick(); openFlow("email"); });
  stage.addEventListener("pointerdown", (e) => { if (!played && !e.target.closest("a,button")) skip(); });
  let y0 = null;
  stage.addEventListener("touchstart", (e) => { y0 = e.touches[0].clientY; }, { passive: true });
  stage.addEventListener("touchend", (e) => {
    if (y0 == null || !played) return;
    const dy = e.changedTouches[0].clientY - y0; y0 = null;
    if (Math.abs(dy) > 40) { tick(); go(page + (dy < 0 ? 1 : -1)); }
  });
  addEventListener("wheel", (e) => { if (inFlow || !played || Math.abs(e.deltaY) < 30) return; go(page + (e.deltaY > 0 ? 1 : -1)); }, { passive: true });
  addEventListener("keydown", (e) => {
    if (inFlow) return;
    if (!played) { if (e.key === " " || e.key === "Enter") skip(); return; }
    if (["ArrowDown", "ArrowRight", " ", "Enter"].includes(e.key)) go(page + 1);
    if (["ArrowUp", "ArrowLeft"].includes(e.key)) go(page - 1);
  });
  addEventListener("resize", () => { if (played && !inFlow) build(); });

  // ---------- the questions ----------
  const flow = $("#flow"), screen = $("#screen"), goBtn = $("#go"), goText = $("#goText"), goCount = $("#goCount"), aside = $("#aside"), backBtn = $("#back"), barFill = $("#barFill");
  let inFlow = false, step = null, history = [], cur = null;
  const A = { email: "", password: "", name: "", invite, instagram: "", area: "", styles: new Set(), likes: new Set(), music: new Set(), agents: [], business: "", content_style: "", post_often: "", profile: false, appearance: localStorage.getItem("hpk-appearance") || "dark", created: false, exists: false, needInvite: false };
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const STYLES = [
    ["Listings", ["Just listed", "Open houses", "Just sold", "Coming soon"]],
    ["Your city", ["Local spots", "Market updates", "Neighbourhood guides", "Events"]],
    ["You", ["Behind the scenes", "Buyer tips", "Seller tips", "Your story", "Client stories"]],
  ];
  const ICON = {
    plus: '<svg viewBox="0 0 24 24"><path d="M12 6v12M6 12h12"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="m6 12.5 4 4 8-9"/></svg>',
    eye: '<svg viewBox="0 0 24 24"><path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/></svg>',
    eyeOff: '<svg viewBox="0 0 24 24"><path d="M2.5 12s3.5-6.5 9.5-6.5c2 0 3.7.7 5.1 1.7M21.5 12s-3.5 6.5-9.5 6.5c-2 0-3.7-.7-5.1-1.7"/><path d="M4 20 20 4"/></svg>',
    sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></svg>',
    half: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17" /><path d="M12 3.5a8.5 8.5 0 0 0 0 17" fill="currentColor" stroke="none"/></svg>',
    moon: '<svg viewBox="0 0 24 24"><path d="M19.5 14.5A8 8 0 1 1 9.5 4.5a6.5 6.5 0 0 0 10 10Z"/></svg>',
  };
  const PEBBLES = mark.querySelector("svg").innerHTML;
  const iphone = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const pushOk = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && !(iphone && !standalone()) && Notification.permission === "default";

  async function api(path, body, method = "POST") {
    const r = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || "Something went wrong. Please try again.");
    return d;
  }
  const saveBrand = (b) => api("/api/brand", b, "PUT").catch(() => {});

  // The new account's questions, in order; their count fills the bar.
  // The questions that shape someone's Hopkins, asked once, after sign up or at the first sign in.
  const profilePath = () => ["instagram", "business", "area", "content_style", "post_often", "styles", "likes", "agents", "music", "appearance", ...(pushOk() ? ["notify"] : []), "ready"];
  const signupPath = () => (A.profile ? profilePath() : ["email", ...(A.needInvite ? ["invite"] : []), "password", "name", ...profilePath()]);
  // A question with a few answers: tap one and it moves on, like Cosmos' gender screen.
  const options = (field, list) => `<div class="opts">${list.map(([k, t, d]) => `<button class="opt${A[field] === k ? " on" : ""}" type="button" data-opt="${k}"><b>${esc(t)}</b>${d ? `<span>${esc(d)}</span>` : ""}</button>`).join("")}</div>`;
  const chips = (set, groups) => `<div class="chips">${groups.map(([h, list]) => `${h ? `<h3>${h}</h3>` : ""}<div>${list.map((c) => `<button class="chip${A[set].has(c) ? " on" : ""}" type="button" data-chip="${esc(c)}" data-set="${set}">${esc(c)}<i>${A[set].has(c) ? ICON.check : ICON.plus}</i></button>`).join("")}</div>`).join("")}</div>`;

  // An input that is the whole screen: big, centred, no box.
  const bigInput = (id, attrs, value) => `<div class="field">${attrs.at ? `<label class="at"><span>@</span><input class="big" id="${id}" ${attrs.html} value="${esc(value)}" size="1"></label>` : `<input class="big" id="${id}" ${attrs.html} value="${esc(value)}">`}${attrs.eye ? `<button class="eye" id="eye" type="button" aria-label="Show password">${ICON.eyeOff}</button>` : ""}</div>`;

  const STEPS = {
    email: {
      title: "Enter your email address", sub: "Sign up or log in",
      body: () => bigInput("in", { html: 'type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" placeholder="Email address" enterkeyhint="next"' }, A.email),
      valid: () => EMAIL.test(val().trim()),
      async next() {
        A.email = val().trim();
        const r = await api("/api/email-status", { email: A.email });
        A.exists = r.exists;
        A.needInvite = !r.exists && !r.open && !A.invite;
        return r.exists ? "login" : A.needInvite ? "invite" : "password";
      },
    },
    login: {
      title: "Welcome back", sub: () => `Enter the password for ${esc(A.email)}`,
      body: () => bigInput("in", { html: 'type="password" autocomplete="current-password" placeholder="Password" enterkeyhint="go"', eye: true }, ""),
      aside: "Forgot password?", onAside: () => to("forgot"),
      valid: () => val().length > 0,
      async next() {
        await api("/api/login", { email: A.email, password: val() });
        return startProfile();
      },
    },
    forgot: {
      title: "Reset your password", sub: "Hopkins emails you a link",
      body: () => bigInput("in", { html: 'type="email" inputmode="email" autocomplete="email" autocapitalize="off" placeholder="Email address" enterkeyhint="send"' }, A.email),
      valid: () => EMAIL.test(val().trim()), label: "Send link",
      async next() { A.email = val().trim(); await api("/api/forgot", { email: A.email }); return "sent"; },
    },
    sent: {
      title: "Check your email", sub: () => `If ${A.email} has an account, a reset link is on its way.`,
      body: () => '<div class="field"></div>', valid: () => true, label: "Back to log in", next: async () => "email",
    },
    reset: {
      title: "Choose a new password", sub: "At least 8 characters",
      body: () => bigInput("in", { html: 'type="password" autocomplete="new-password" placeholder="New password" enterkeyhint="go"', eye: true }, ""),
      valid: () => val().length >= 8,
      async next() { await api("/api/reset", { t: params.get("t"), password: val() }); return finish(); },
    },
    invite: {
      title: "Enter your invite code", sub: "Hopkins is invite only for now",
      body: () => bigInput("in", { html: 'type="text" autocapitalize="characters" autocomplete="off" spellcheck="false" placeholder="Invite code" enterkeyhint="next"' }, A.invite),
      valid: () => val().trim().length >= 3,
      async next() { A.invite = val().trim(); return "password"; },
    },
    password: {
      title: "Create a password", sub: "New to Hopkins? Keep your account secure",
      body: () => bigInput("in", { html: 'type="password" autocomplete="new-password" placeholder="Password" enterkeyhint="next"', eye: true }, A.password),
      valid: () => val().length >= 8,
      // while it's too short, the line underneath says what it needs, like Cosmos
      hint: () => (val().length && val().length < 8 ? "Use at least 8 characters" : null),
      async next() { A.password = val(); return "name"; },
    },
    name: {
      title: "Enter your full name", sub: "This goes on your posts",
      body: () => bigInput("in", { html: 'type="text" autocomplete="name" autocapitalize="words" placeholder="Full name" enterkeyhint="next"' }, A.name),
      valid: () => val().trim().length >= 2,
      async next() {
        A.name = val().trim();
        if (!A.created) {
          await api("/api/signup", { email: A.email, password: A.password, name: A.name, invite: A.invite });
          A.created = true;
          sessionStorage.removeItem("hpk-invite");
        }
        return "instagram";
      },
    },
    instagram: {
      title: "Your Instagram handle", sub: "Where Hopkins posts for you",
      body: () => bigInput("in", { at: true, html: 'type="text" autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false" placeholder="yourhandle" enterkeyhint="next"' }, A.instagram),
      valid: () => /^[A-Za-z0-9._]{1,30}$/.test(val().trim().replace(/^@/, "")),
      hint: () => (val() && !/^[A-Za-z0-9._@]*$/.test(val()) ? "Letters, numbers, full stops and underscores only" : null),
      async next() { A.instagram = val().trim().replace(/^@/, ""); saveBrand({ instagram: A.instagram }); return "business"; },
    },
    business: {
      title: "Your brokerage", sub: "It goes on your posts",
      body: () => bigInput("in", { html: 'type="text" autocomplete="organization" autocapitalize="words" placeholder="Brokerage name" enterkeyhint="next"' }, A.business),
      valid: () => val().trim().length >= 2, aside: "Skip", onAside: () => to("area"),
      async next() { A.business = val().trim(); saveBrand({ business: A.business }); return "area"; },
    },
    area: {
      title: "Where do you sell?", sub: "A city or a neighbourhood",
      body: () => bigInput("in", { html: 'type="text" autocomplete="address-level2" autocapitalize="words" placeholder="Austin, Texas" enterkeyhint="next"' }, A.area),
      valid: () => val().trim().length >= 2,
      async next() { A.area = val().trim(); saveBrand({ city: A.area, area: A.area }); return "content_style"; },
    },
    content_style: {
      title: "How do you want to show up?", sub: "Hopkins plans your week around it",
      body: () => options("content_style", [["listings", "Real estate only", "Your listings, the market and your city"], ["personal", "Personal brand too", "You, your story and your life as well"]]),
      field: "content_style", valid: () => !!A.content_style,
      async next() { saveBrand({ content_style: A.content_style }); return "post_often"; },
    },
    post_often: {
      title: "How often should Hopkins post?", sub: "You approve the week first, every Monday",
      body: () => options("post_often", [["3", "3 times a week"], ["5", "5 times a week"], ["7", "Every day"]]),
      field: "post_often", valid: () => !!A.post_often,
      async next() { saveBrand({ post_often: A.post_often }); return "styles"; },
    },
    styles: {
      title: "What do you want to post?", sub: "Pick three to plan your first week.<br>You can change it anytime.",
      body: () => chips("styles", STYLES),
      valid: () => A.styles.size >= 3, count: () => `${Math.min(A.styles.size, 3)} / 3`,
      async next() { saveBrand({ styles: [...A.styles].join(", ") }); return "likes"; },
    },
    likes: {
      title: "Pick five you love", sub: "Hopkins designs your posts around your taste",
      body: () => `<div class="wall${A.likes.size >= 5 ? " full" : ""}">${order.likes.map((k) => `<button type="button" class="${A.likes.has(k) ? "on" : ""}" data-like="${k}"><img src="${src(k)}" alt="" loading="lazy" draggable="false"><i>${ICON.check}</i></button>`).join("")}</div>`,
      valid: () => A.likes.size === 5, count: () => `${A.likes.size} / 5`,
      async next() { saveBrand({ likes: [...A.likes].join(",") }); return "agents"; },
    },
    agents: {
      title: "Agents whose content you like", sub: "Up to 3 Instagram handles. Hopkins learns from their style.",
      body: () => `${bigInput("in", { at: true, html: 'type="text" autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false" placeholder="theirhandle" enterkeyhint="done"' }, "")}<div class="handles" id="handles"></div>`,
      valid: () => A.agents.length > 0 || /^[A-Za-z0-9._]{1,30}$/.test(val().trim().replace(/^@/, "")),
      aside: "Skip", onAside: () => to("music"),
      // Enter adds the handle; Continue adds what's typed and moves on
      onEnter() { return addAgent(); },
      async next() { addAgent(); saveBrand({ agents: A.agents.join(",") }); return "music"; },
      mount: () => drawHandles(),
    },
    music: {
      title: "Music for your reels", sub: "Pick up to three",
      body: () => chips("music", [["", ["Acoustic", "Piano", "Lo-fi", "Jazz", "Soul", "R&B", "Pop", "Indie", "Electronic", "House", "Cinematic", "Ambient", "Hip hop", "Classical"]]]),
      max: 3, valid: () => A.music.size >= 1, count: () => `${A.music.size} / 3`,
      async next() { saveBrand({ music: [...A.music].join(", ") }); return "appearance"; },
    },
    appearance: {
      title: "Select your appearance", sub: "You can always change it in Settings",
      body: () => `<div class="preview"><div class="phone"><div class="ps"><span>9:41</span><span>●●●</span></div><div class="ph"><svg viewBox="0 0 120 120">${PEBBLES}</svg>This week<span>Mon</span></div><div class="pg">${order.collage.slice(0, 6).map((k) => `<img src="${src(k)}" alt="">`).join("")}</div><div class="pt"><i></i><i></i><i></i></div></div></div>
        <div class="modes">${[["light", "Light", ICON.sun], ["system", "System", ICON.half], ["dark", "Dark", ICON.moon]].map(([k, n, ic]) => `<button class="mode${A.appearance === k ? " on" : ""}" type="button" data-mode="${k}">${ic}${n}</button>`).join("")}</div>`,
      valid: () => true, label: "Confirm",
      async next() { saveBrand({ appearance: A.appearance }); return pushOk() ? "notify" : "ready"; },
    },
    notify: {
      title: "Know when your week is ready", sub: "Hopkins tells you on Monday, and when anything needs you",
      body: () => `<div class="field"><svg viewBox="0 0 120 120" style="width:84px;fill:var(--fink)">${PEBBLES}</svg></div>`,
      valid: () => true, label: "Turn on notifications", aside: "Not now", onAside: () => to("ready"),
      async next() { await pushOn().catch(() => {}); return "ready"; },
    },
    ready: {
      title: "", sub: "",
      body: () => `<div class="making"><svg viewBox="0 0 120 120">${PEBBLES}</svg><p>Setting up your Hopkins</p></div>`,
      valid: () => false,
      // every answer is saved before Hopkins opens; the pebbles turn while it happens
      async auto() {
        await Promise.all([saveBrand({ profiled: "yes", onboarded: "yes" }), wait(2600)]);
        finish();
      },
    },
  };
  const val = () => (screen.querySelector("#in")?.value || "");

  // Notifications, the same way the app turns them on (app.js pushOn).
  const b64 = (s) => { const p = "=".repeat((4 - (s.length % 4)) % 4); const r = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from([...r].map((c) => c.charCodeAt(0))); };
  async function pushOn() {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
    if ((await Notification.requestPermission()) !== "granted") return;
    const { key } = await api("/api/push", null, "GET");
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(key) });
    await api("/api/push", { subscription: sub.toJSON() });
  }
  // After signing in: straight into Hopkins, or first the questions if they haven't answered them.
  async function startProfile() {
    const me = await fetch("/api/me").then((r) => r.json()).catch(() => null);
    const b = me?.workspace?.brand || {};
    if (!me || me.demo || b.profiled === "yes") { finish(); return null; }
    A.profile = true; A.created = true;
    A.name = me.user?.name || ""; A.instagram = b.instagram || ""; A.business = b.business || ""; A.area = b.area || b.city || "";
    history.length = 0;
    return "instagram";
  }
  function addAgent() {
    const i = cur?.querySelector("#in"); if (!i) return false;
    const h = i.value.trim().replace(/^@/, "");
    if (!/^[A-Za-z0-9._]{1,30}$/.test(h)) return false;
    if (!A.agents.includes(h) && A.agents.length < 3) A.agents.push(h);
    i.value = ""; fitAt(); drawHandles(); setReady(); tick();
    return true;
  }
  function drawHandles() {
    const box = cur?.querySelector("#handles"); if (!box) return;
    box.innerHTML = A.agents.map((h, n) => `<button class="chip on" type="button" data-rm="${n}">@${esc(h)}<i><svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7 7 17"/></svg></i></button>`).join("");
    box.querySelectorAll("[data-rm]").forEach((b) => b.addEventListener("click", () => { A.agents.splice(Number(b.dataset.rm), 1); tick(); drawHandles(); setReady(); }));
    const inp = cur.querySelector("#in"); if (inp) inp.disabled = A.agents.length >= 3;
  }
  async function finish() {
    flow.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: "forwards", easing: ease });
    setTimeout(() => location.replace("/"), 240);
    return null;
  }

  function applyTheme() {
    const light = A.appearance === "light" || (A.appearance === "system" && matchMedia("(prefers-color-scheme: light)").matches);
    if (light) document.documentElement.dataset.flowTheme = "light"; else delete document.documentElement.dataset.flowTheme;
    if (inFlow) themeColor(light ? "#F3F2F0" : "#151515");
  }

  function openFlow(first) {
    if (inFlow) return;
    inFlow = true;
    stage.classList.add("gone");
    document.body.classList.remove("blue");
    document.body.classList.add("flowing");
    applyTheme();
    flow.classList.add("on");
    to(first, { root: true });
  }

  function progress() {
    const path = signupPath(), i = path.indexOf(step);
    const onPath = i >= 0 && !(step === "email" && false);
    $("#bar").style.opacity = ["login", "forgot", "sent", "reset", "ready"].includes(step) ? 0 : 1;
    barFill.style.width = `${onPath ? Math.max(8, ((i + 1) / path.length) * 100) : 8}%`;
  }

  function setReady() {
    const s = STEPS[step];
    const ok = !!s.valid();
    goBtn.classList.toggle("ready", ok);
    const c = s.count ? s.count() : "";
    goCount.textContent = c;
    goBtn.classList.toggle("count", !!c);
    if (s.hint) {
      const h = s.hint(), sub = cur.querySelector(".sub");
      if (!sub.classList.contains("err") || h) { sub.textContent = h || subText(s); sub.classList.toggle("hinted", !!h); }
    }
  }
  const subText = (s) => (typeof s.sub === "function" ? s.sub() : s.sub);

  // A new question: the old one lifts away as the new one settles in (220ms), the field keeps the
  // keyboard up, and the bar slides on.
  function to(id, { root = false, back = false } = {}) {
    if (!root && step && !back) history.push(step);
    step = id;
    const s = STEPS[id];
    const el = document.createElement("div");
    el.className = "step";
    el.innerHTML = `<h2>${s.title}</h2><p class="sub">${subText(s)}</p>${s.body()}`;
    const old = cur;
    screen.appendChild(el);
    cur = el;
    if (old) {
      old.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: `translateY(${back ? 10 : -10}px)` }], { duration: 180, easing: ease, fill: "forwards" }).finished.then(() => old.remove());
      el.animate([{ opacity: 0, transform: `translateY(${back ? -12 : 14}px)`, filter: "blur(4px)" }, { opacity: 1, transform: "none", filter: "blur(0)" }], { duration: 300, easing: ease, delay: 60, fill: "backwards" });
    } else el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420, easing: ease });
    goText.textContent = s.label || "Continue";
    $("#fdock").classList.toggle("hide", !!s.field || !!s.auto);
    aside.textContent = s.aside || "";
    // Back: never to before the account was made, and never off the first question
    const lockedBefore = A.created ? history.lastIndexOf("name") : -1;
    backBtn.classList.toggle("on", history.length > 0 && !(A.created && history.length - 1 <= lockedBefore) && !["sent"].includes(id));
    goBtn.classList.remove("busy");
    progress();
    const input = el.querySelector("#in");
    if (input) {
      input.addEventListener("input", () => { const sub = cur.querySelector(".sub"); if (sub.classList.contains("err")) { sub.classList.remove("err"); sub.textContent = subText(s); } setReady(); fitAt(); });
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); if (s.onEnter && s.onEnter()) return; submit(); } });
      input.focus({ preventScroll: true });
      fitAt();
    }
    const eye = el.querySelector("#eye");
    if (eye) eye.addEventListener("click", () => { tick(); const shown = input.type === "text"; input.type = shown ? "password" : "text"; eye.innerHTML = shown ? ICON.eyeOff : ICON.eye; input.focus(); });
    el.querySelectorAll("[data-chip]").forEach((b) => b.addEventListener("click", () => {
      const set = A[b.dataset.set], k = b.dataset.chip;
      if (set.has(k)) set.delete(k); else if (!s.max || set.size < s.max) set.add(k); else return;
      tick();
      b.classList.toggle("on", set.has(k)); b.querySelector("i").innerHTML = set.has(k) ? ICON.check : ICON.plus;
      setReady();
    }));
    el.querySelectorAll("[data-opt]").forEach((b) => b.addEventListener("click", () => {
      if (goBtn.classList.contains("busy")) return;
      tick();
      A[s.field] = b.dataset.opt;
      el.querySelectorAll("[data-opt]").forEach((x) => x.classList.toggle("on", x === b));
      setTimeout(submit, 220);
    }));
    if (s.mount) s.mount();
    if (s.auto) s.auto();
    el.querySelectorAll("[data-like]").forEach((b) => b.addEventListener("click", () => {
      const k = b.dataset.like;
      if (A.likes.has(k)) A.likes.delete(k); else if (A.likes.size < 5) A.likes.add(k); else return;
      tick();
      b.classList.toggle("on", A.likes.has(k));
      el.querySelector(".wall").classList.toggle("full", A.likes.size >= 5);
      setReady();
    }));
    el.querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => {
      tick();
      A.appearance = b.dataset.mode;
      try { localStorage.setItem("hpk-appearance", A.appearance); } catch {}
      el.querySelectorAll("[data-mode]").forEach((x) => x.classList.toggle("on", x === b));
      applyTheme();
    }));
    setReady();
  }
  // The @ handle sizes itself to what's typed, so the @ sits right against it.
  function fitAt() {
    const i = cur?.querySelector(".at .big"); if (i) i.style.width = `${Math.max(i.value.length || i.placeholder.length, 1) + 0.6}ch`;
    const b = cur?.querySelector(".big");
    if (b) { b.style.fontSize = ""; let fs = 30; while (fs > 18 && b.scrollWidth > b.clientWidth + 1) { fs -= 1; b.style.fontSize = `${fs}px`; } }
  }

  async function submit() {
    const s = STEPS[step];
    if (!s.valid() || goBtn.classList.contains("busy")) return;
    goBtn.classList.add("busy");
    try {
      const nextId = await s.next();
      if (nextId) to(nextId); else goBtn.classList.remove("busy");
    } catch (err) {
      goBtn.classList.remove("busy");
      const sub = cur.querySelector(".sub");
      sub.textContent = err.message; sub.classList.add("err");
    }
  }
  goBtn.addEventListener("click", () => { tick(); submit(); });
  aside.addEventListener("click", () => { tick(); STEPS[step].onAside?.(); });
  backBtn.addEventListener("click", () => { tick(); const prev = history.pop(); if (prev) to(prev, { back: true }); });
  matchMedia("(prefers-color-scheme: light)").addEventListener("change", applyTheme);

  // Keep the button just above the keyboard, the way an app does.
  if (window.visualViewport) {
    const kb = () => { const v = visualViewport; document.documentElement.style.setProperty("--kb", `${Math.max(0, innerHeight - v.height - v.offsetTop)}px`); };
    visualViewport.addEventListener("resize", kb); visualViewport.addEventListener("scroll", kb);
  }

  // ---------- which door ----------
  // Someone who has signed in on this device before (the hpk_known cookie, set by the server on every
  // sign in and every visit to the app) goes straight to the email question; someone new gets the
  // intro. /login, /forgot and /reset open their question directly.
  const known = /(?:^|;\s*)hpk_known=1/.test(document.cookie);
  const path = location.pathname;
  fetch("/static/intro/order.json").then((r) => r.json()).then((o) => {
    order = o; sizes = o.sizes;
    if (path === "/start") return startProfile().then((id) => id && openFlow(id));
    if (path === "/login") return openFlow("email");
    if (path === "/forgot") return openFlow("forgot");
    if (path === "/reset") return openFlow("reset");
    if (known && !params.has("intro") && path !== "/signup") return openFlow("email");
    build();
    [...o.collage, ...o.page2, ...o.page3, ...o.page4].filter(Boolean).forEach(load);
    if (reduced || params.has("skip")) reveal(); else strobeRun();
  });
})();
