// The Hopkins app: one page, no build step. Views are drawn from template strings; every
// value from the server goes through esc() before it reaches the page.
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const main = $("#main");
  const ICON = {
    menu: '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    send: '<svg viewBox="0 0 24 24"><path d="M12 19V5M5.5 11.5 12 5l6.5 6.5"/></svg>',
    photo: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="m21 16-5-5-8 8"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    link: '<svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
    down: '<svg viewBox="0 0 24 24"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
    eye: '<svg viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    dots: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/></svg>',
    copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
    redo: '<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    alert: '<svg viewBox="0 0 24 24"><path d="M12 8v5M12 16.5v.5"/><circle cx="12" cy="12" r="9"/></svg>',
    chev: '<svg class="chev" viewBox="0 0 24 24"><path d="m8 10 4-4 4 4M8 14l4 4 4-4"/></svg>',
    square: '<svg viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="16" rx="2.5"/></svg>',
    tall: '<svg viewBox="0 0 24 24"><rect x="7" y="2.5" width="10" height="19" rx="2.5"/></svg>',
    brush: '<svg viewBox="0 0 24 24"><circle cx="8" cy="9" r="1.5"/><circle cx="15" cy="8" r="1.5"/><path d="M12 21a9 9 0 1 1 9-9c0 2.5-2 3-3.5 3H15a2 2 0 0 0-1.5 3.3A2 2 0 0 1 12 21z"/></svg>',
    shield: '<svg viewBox="0 0 24 24"><path d="M12 3l8 4v5c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V7z"/></svg>',
    out: '<svg viewBox="0 0 24 24"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"/></svg>',
    gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    chevr: '<svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg>',
    phone: '<svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z"/></svg>',
    msg: '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 20 12z"/></svg>',
    mail: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/></svg>',
    spark: '<svg viewBox="0 0 24 24"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/></svg>',
    people: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c1.2-3.6 3.8-5.5 7-5.5s5.8 1.9 7 5.5"/></svg>',
    chart: '<svg viewBox="0 0 24 24"><path d="M5 20V11M12 20V5M19 20v-6"/></svg>',
  };
  const S = { me: null, listings: [], inbox: [], current: null, selected: {}, format: "feed", pending: [], busy: false, showPhotos: false, showIssues: false, seen: {}, fresh: null };

  // ---------- helpers ----------

  async function api(path, opts = {}) {
    const res = await fetch(path, {
      method: opts.method || (opts.body ? "POST" : "GET"),
      headers: opts.body ? { "Content-Type": "application/json" } : {},
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    if (res.status === 401) { location.href = "/login"; throw new Error("signed out"); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Something went wrong. Try again.");
    return data;
  }

  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("on"), 2800);
  }

  function ago(iso) {
    const s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    if (s < 7 * 86400) return `${Math.floor(s / 86400)}d ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  const money = (n) => "$" + Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
  const listingName = (l) => l.address || l.area || l.city || "New listing";
  const photoUrl = (id, thumb) => (id ? `/photos/${id}${thumb ? "?thumb=1" : ""}` : null);
  const paid = () => S.me.workspace.plan === "paid";

  const initials = () => (S.me.user.name || S.me.user.email).split(/[\s@.]+/).map((w) => w[0]).join("").slice(0, 2);
  // Your profile photo if you've added one, your initials if not.
  const avatarStyle = () => (S.me.user.avatar_id ? `style="background:#ddd url(${photoUrl(S.me.user.avatar_id, true)}) center/cover;color:transparent"` : "");
  // The phone's top bar. Top level pages show the logo and your avatar; inside a listing it
  // shows a back arrow and the listing, like any messaging app.
  function mtop(title, extra = "", opts = {}) {
    if (opts.back) {
      return `<div class="mtop"><a class="icon-btn mback" href="${opts.back}" aria-label="Back">${ICON.back}</a><div class="ttl"><b>${esc(title)}</b>${opts.sub ? `<span>${esc(opts.sub)}</span>` : ""}</div>${extra}</div>`;
    }
    return `<div class="mtop"><a class="logo" href="#/today"><img src="/static/mark.svg" alt="">Hopkins</a>${extra}<button class="av" data-act="account" aria-label="Account" ${avatarStyle()}>${esc(initials())}</button></div>`;
  }
  const buzz = (ms = 8) => { try { navigator.vibrate && navigator.vibrate(ms); } catch {} };
  function celebrate(text) {
    $("#winText").textContent = text;
    $("#win").classList.add("on");
    buzz([10, 40, 18]);
    setTimeout(() => $("#win").classList.remove("on"), 1300);
  }

  // Photos are resized in the browser so uploads are quick on a phone connection.
  async function readImage(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = url;
      });
      return img;
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }
  function toData(img, max, type, quality) {
    const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * s);
    c.height = Math.round(img.naturalHeight * s);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL(type, quality).split(",")[1];
  }
  async function uploadPhoto(file, { listingId, kind } = {}) {
    const img = await readImage(file);
    const logo = kind === "logo";
    const type = logo && file.type === "image/png" ? "image/png" : "image/jpeg";
    const body = {
      data: toData(img, logo ? 800 : 1600, type, 0.86),
      thumb: logo ? undefined : toData(img, 512, "image/jpeg", 0.72),
      mime: type,
      listingId,
      kind,
      name: file.name,
    };
    return api("/api/photos", { body });
  }


  // ---------- menus ----------

  // One popover for every "more" menu: a dropdown on a laptop, a bottom sheet on a phone.
  // Items use the same data attributes as the rest of the page, so one click handler covers all.
  const phone = () => window.innerWidth <= 980;
  function openPop(anchor, html) {
    const pop = $("#pop");
    pop.innerHTML = `<div class="grab"></div>${html}`;
    pop.classList.add("on");
    pop.classList.toggle("lg", phone());
    if (phone()) { $("#sheetBg").classList.add("on"); buzz(6); return; }
    const r = anchor.getBoundingClientRect();
    const w = pop.offsetWidth, h = pop.offsetHeight;
    let left = Math.min(window.innerWidth - w - 8, Math.max(8, r.right - w));
    if (anchor.closest(".acct")) left = Math.max(8, r.left);
    const below = r.bottom + 6 + h < window.innerHeight;
    pop.style.left = left + "px";
    pop.style.top = (below ? r.bottom + 6 : r.top - h - 6) + "px";
  }
  const closePop = () => { $("#pop").classList.remove("on"); $("#sheetBg").classList.remove("on"); };

  function accountMenu() {
    const u = S.me.usage;
    const plan = paid()
      ? `<div class="note"><b>Paid plan</b>Billing starts when your first ad goes live.</div>`
      : `<div class="note"><b>Free plan</b><div class="meter"><i style="width:${Math.min(100, (u.adsMade / u.freeLimit) * 100)}%"></i></div>${Math.min(u.adsMade, u.freeLimit)} of ${u.freeLimit} free ads made</div>`;
    return `<div class="note" style="padding-bottom:2px"><b>${esc(S.me.workspace.name)}</b>${esc(S.me.user.email)}</div>${plan}<div class="sep"></div>
      <a href="#/settings">${ICON.gear}Settings</a><a href="#/brand">${ICON.brush}Brand</a>${S.me.admin ? `<a href="#/admin">${ICON.shield}Admin</a>` : ""}
      <div class="sep"></div><button data-act="logout">${ICON.out}Sign out</button>`;
  }

  function listingMenu() {
    const l = S.current.listing;
    const ad = adFor(S.selected[l.id]);
    const own = ad && paid()
      ? `<div class="sep"></div><button data-dl="feed">${ICON.down}Download feed image</button><button data-dl="story">${ICON.down}Download story image</button>
         <button data-copy="${esc(ad.primary_text)}" data-copied="Ad text copied">${ICON.copy}Copy ad text</button>`
      : "";
    return `<a href="/l/${esc(l.slug)}" target="_blank" rel="noopener">${ICON.eye}Open lead page</a>
      ${ad ? `<button data-copy="${esc(`${location.origin}/l/${l.slug}?v=${ad.id}`)}">${ICON.link}Copy ad link</button>` : ""}${own}
      <div class="sep"></div><button data-act="remake">${ICON.redo}${S.current.ads.length ? "Make 3 new versions" : "Make the ads"}</button>`;
  }

  // ---------- frame ----------

  async function loadMe() { S.me = await api("/api/me"); }
  async function loadListings() { S.listings = (await api("/api/listings")).listings; }
  async function loadInbox() { S.inbox = (await api("/api/inbox")).items; }

  function drawSide() {
    const route = location.hash.slice(2).split("/");
    const nav = route[0] === "l" ? "listings" : route[0] || "today";
    $$(".nv,.tabbar a").forEach((a) => a.classList.toggle("on", a.dataset.nav === nav));
    const waiting = S.inbox.filter((m) => m.needs_action).length;
    $$("[data-badge]").forEach((b) => (b.textContent = waiting || ""));
    $("#lists").innerHTML = S.listings.length
      ? S.listings.map((l) => `<a class="li ${route[0] === "l" && route[1] === l.id ? "on" : ""}" href="#/l/${l.id}">
          <i class="th" style="${l.photo_id ? `background-image:url(${photoUrl(l.photo_id, true)})` : ""}"></i>
          <div class="nm"><b>${esc(listingName(l))}</b><span>${esc(sideLine(l))}</span></div>${l.waiting ? '<i class="dotw" title="Waiting on you"></i>' : ""}</a>`).join("")
      : `<div class="empty-side">Nothing yet.</div>`;
    $("#acct").innerHTML = `<button data-act="account"><span class="av" ${avatarStyle()}>${esc(initials())}</span><span class="nm"><b>${esc(S.me.workspace.name)}</b><span>${paid() ? "Paid plan" : "Free plan"}</span></span>${ICON.chev}</button>`;
  }

  function sideLine(l) {
    if (l.status === "sold") return "Sold";
    if (l.waiting) return "Ads ready";
    if (l.approved) return l.leads ? `${l.leads} ${l.leads === 1 ? "lead" : "leads"}` : "Approved";
    return l.price ? money(l.price) : "Draft";
  }

  // ---------- routing ----------

  // Each route gets a number. A screen that finishes loading after you've already moved on
  // checks it and quietly stops, so a slow screen can never draw over the one you picked.
  let routeSeq = 0;
  const current = () => routeSeq;
  async function route() {
    const seq = ++routeSeq;
    closePop();
    const [view, id] = location.hash.slice(2).split("/");
    // Inside a listing or a new one, the phone goes full screen like a chat app.
    document.body.classList.toggle("focus", view === "l" || view === "new" || !S.me.workspace.brand.setup_done);
    try {
      if (!S.me.workspace.brand.setup_done && view !== "brand") { location.hash = "#/brand"; return; }
      if (view === "l" && id) await viewListing(id);
      else if (view === "new") viewNew();
      else if (view === "listings") viewListings();
      else if (view === "leads") await viewLeads();
      else if (view === "report") await viewReport();
      else if (view === "brand") await viewBrand();
      else if (view === "admin") await viewAdmin();
      else if (view === "settings") viewSettings();
      else await viewToday();
    } catch (e) {
      if (e.message !== "signed out" && seq === routeSeq) main.innerHTML = `${mtop("Hopkins")}<div class="page"><p class="err">${esc(e.message)}</p></div>`;
    }
    if (seq === routeSeq) drawSide();
  }

  const skeleton = () => `<div class="page"><div class="wrap"><div class="sk" style="height:34px;width:60%;margin-bottom:12px"></div><div class="sk" style="height:16px;width:40%;margin-bottom:28px"></div>
    <div class="sk" style="height:180px;border-radius:20px;margin-bottom:12px"></div><div class="sk" style="height:64px;margin-bottom:10px"></div><div class="sk" style="height:64px"></div></div></div>`;

  // ---------- Today: what Hopkins needs from you ----------

  async function viewToday() {
    const my = current();
    await loadInbox();
    if (my !== current()) return;
    const first = (S.me.user.name || "").split(" ")[0];
    const h = new Date().getHours();
    const greet = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
    const waiting = S.inbox.filter((m) => m.needs_action);
    const recent = S.inbox.filter((m) => !m.needs_action);
    const listingOf = (m) => S.listings.find((x) => x.id === m.listing_id);
    const bg = (m) => { const l = listingOf(m); return l && l.photo_id ? `background-image:url(${photoUrl(l.photo_id)})` : ""; };
    const where = (m) => m.address || m.area || m.city || "Your listing";
    const hero = (m) => {
      const isPlan = m.kind === "plan";
      return `<a class="hero" href="#/l/${m.listing_id}"><div class="ph" style="${bg(m)}"><span class="chip ${isPlan ? "gold" : ""}">${isPlan ? "Needs your yes" : "3 ads ready"}</span></div>
        <div class="bd"><div class="tx"><b>${esc(where(m))}</b><p>${esc(isPlan ? "Check the plan and say yes." : m.body)}</p></div><span class="btn">${isPlan ? "Review" : "See ads"}</span></div></a>`;
    };
    const icon = (m) => (m.kind === "lead" ? ICON.people : m.kind === "report" ? ICON.chart : ICON.spark);
    const titleFor = (m) => (m.kind === "lead" ? `New lead on ${where(m)}` : m.kind === "report" ? "Your Monday report" : where(m));
    const row = (m) => `<a class="row" href="${m.kind === "report" ? "#/report" : `#/l/${m.listing_id}`}"><span class="ic">${icon(m)}</span>
      <div class="tx"><b>${esc(titleFor(m))}</b><p>${esc(m.body)}</p></div><span class="when">${ago(m.created_at)}</span></a>`;

    const leadsWeek = S.inbox.filter((m) => m.kind === "lead").length;
    let body;
    if (!S.listings.length) {
      const brandDone = S.me.workspace.brand.setup_done;
      body = `<div class="progress"><div class="meter"><i style="width:${brandDone ? 34 : 6}%"></i></div>${brandDone ? "1 of 3 done" : "Let's start"}</div>
        <ol class="steps">
        <li class="${brandDone ? "done" : "next"}"><div class="tx"><b>Your brand</b><p>Colors, logo and voice.</p></div><a class="link" href="#/brand">${brandDone ? "Edit" : "Start"}</a></li>
        <li class="${brandDone ? "next" : ""}"><div class="tx"><b>Your first listing</b><p>Photos and a description. You get 3 ads to compare.</p></div>${brandDone ? `<a class="btn" href="#/new">Start</a>` : ""}</li>
        <li><div class="tx"><b>Your yes</b><p>Nothing runs until you say so.</p></div></li></ol>`;
    } else {
      body = `<div class="stats-mini"><div><b>${S.listings.length}</b>${S.listings.length === 1 ? "listing" : "listings"}</div><div><b>${leadsWeek}</b>${leadsWeek === 1 ? "lead" : "leads"} this week</div><div><b>${waiting.length}</b>waiting on you</div></div>
        ${waiting.length ? waiting.map(hero).join("") : `<div class="empty"><div class="ic">${ICON.check}</div><b>You're all caught up</b>When a listing comes in, a price changes or a lead arrives, it shows up here.<br><a class="btn" href="#/new">${ICON.plus}New listing</a></div>`}
        ${recent.length ? `<div class="sec">This week</div><div class="list">${recent.map(row).join("")}</div>` : ""}`;
    }
    const lede = !S.listings.length ? "Three steps to your first ads." : waiting.length ? `${waiting.length} ${waiting.length === 1 ? "thing needs" : "things need"} you today.` : "Nothing needs you right now.";
    main.innerHTML = `${mtop("Today")}<div class="page"><div class="wrap"><div class="head"><h1>${greet}${first ? `, <span class="serif">${esc(first)}</span>` : ""}</h1><p class="lede">${lede}</p></div>${body}</div></div>`;
  }

  // ---------- Listings ----------

  function viewListings() {
    const card = (l, i) => `<a class="card-l" href="#/l/${l.id}" style="animation-delay:${Math.min(i, 8) * 0.04}s"><div class="ph" style="${l.photo_id ? `background-image:url(${photoUrl(l.photo_id)})` : ""}">
      ${l.status === "sold" ? `<span class="chip green">Sold</span>` : l.waiting ? `<span class="chip gold">Ads ready</span>` : l.approved ? `<span class="chip">Approved</span>` : ""}</div>
      <div class="bd"><b>${esc(listingName(l))}</b><span>${esc([l.price ? money(l.price) : "", l.leads ? `${l.leads} ${l.leads === 1 ? "lead" : "leads"}` : ""].filter(Boolean).join(" · ") || "Draft")}</span></div></a>`;
    main.innerHTML = `${mtop("Listings")}<div class="page"><div class="wrap"><div class="head"><h1>Listings</h1><p class="lede">${S.listings.length ? `${S.listings.length} ${S.listings.length === 1 ? "home" : "homes"}` : "Every home you market lives here."}</p></div>
      <div class="cards">${S.listings.map(card).join("")}<a class="card-new" href="#/new">${ICON.plus}New listing</a></div></div></div>`;
  }

  // ---------- the composer (shared) ----------

  function composerHtml(placeholder, chips = []) {
    return `<div class="comp-wrap">${chips.length ? `<div class="chips">${chips.map(([label, act]) => `<button class="chip-btn${act.includes("class-go") ? " go" : ""}" ${act.replace(" class-go", "")}>${label}</button>`).join("")}</div>` : ""}
      <form class="comp lg" id="comp"><div class="att" id="att"></div>
      <div class="row-c"><label class="icon-btn" title="Add photos">${ICON.photo}<input type="file" id="files" accept="image/*" multiple hidden></label>
      <textarea id="ta" rows="1" placeholder="${esc(placeholder)}" enterkeyhint="send"></textarea>
      <button class="send" id="send" type="submit" aria-label="Send">${ICON.send}</button></div><div class="hint" id="hint"></div></form></div>`;
  }

  function bindComposer(onSend, { drop } = {}) {
    const ta = $("#ta"), comp = $("#comp");
    S.pending = [];
    const grow = () => { ta.style.height = "auto"; ta.style.height = Math.min(160, ta.scrollHeight) + "px"; };
    const drawAtt = () => {
      const html = S.pending.map((p, i) => `<div class="ph" style="background-image:url(${p.url})"><button type="button" data-rm="${i}" aria-label="Remove">×</button></div>`).join("");
      if (drop) drop(S.pending);
      else $("#att").innerHTML = html;
      $("#send").disabled = S.busy || (!ta.value.trim() && !S.pending.length);
    };
    const add = (files) => {
      for (const f of files) if (f.type.startsWith("image/")) S.pending.push({ file: f, url: URL.createObjectURL(f) });
      buzz(5);
      drawAtt();
    };
    S.addFiles = add;
    S.removeFile = (i) => { S.pending.splice(i, 1); drawAtt(); };
    ta.addEventListener("input", () => { grow(); drawAtt(); });
    ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing && !phone()) { e.preventDefault(); comp.requestSubmit(); } });
    $("#files").addEventListener("change", (e) => { add(e.target.files); e.target.value = ""; });
    $("#att").addEventListener("click", (e) => { const i = e.target.dataset.rm; if (i !== undefined) S.removeFile(Number(i)); });
    const zone = comp.closest(".chat") || comp;
    zone.addEventListener("dragover", (e) => { e.preventDefault(); comp.classList.add("drag"); });
    zone.addEventListener("dragleave", () => comp.classList.remove("drag"));
    zone.addEventListener("drop", (e) => { e.preventDefault(); comp.classList.remove("drag"); add(e.dataTransfer.files); });
    ta.addEventListener("paste", (e) => { const fs = [...(e.clipboardData?.files || [])]; if (fs.length) add(fs); });
    comp.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (S.busy) return;
      const text = ta.value.trim();
      if (!text && !S.pending.length) return;
      S.busy = true;
      $("#send").disabled = true;
      buzz(8);
      ta.blur();
      try {
        await onSend(text, S.pending.map((p) => p.file));
        ta.value = "";
        S.pending = [];
        grow();
      } catch (err) {
        toast(err.message);
      } finally {
        S.busy = false;
        if ($("#send")) drawAtt();
      }
    });
    drawAtt();
    if (!phone()) setTimeout(() => ta.focus(), 50);
  }

  function showTyping(text) {
    const t = $("#thread");
    if (!t) return;
    if (text) t.insertAdjacentHTML("beforeend", `<div class="me in"><span class="tx">${esc(text)}</span></div>`);
    t.insertAdjacentHTML("beforeend", `<div class="hk in" id="typing"><img class="m" src="/static/mark.svg" alt=""><div class="b"><span class="typing"><i></i><i></i><i></i></span></div></div>`);
    $("#msgs").scrollTop = $("#msgs").scrollHeight;
  }

  // Shows the work as it happens. Each step ticks off on its own; the last one waits for the
  // real answer, so it never says "done" before it is.
  function showWork(steps) {
    const t = $("#thread");
    t.insertAdjacentHTML("beforeend", `<div class="hk in"><img class="m" src="/static/mark.svg" alt=""><div class="b"><ul class="work" id="work">${steps.map((s) => `<li><i></i>${esc(s)}</li>`).join("")}</ul></div></div>`);
    $("#msgs").scrollTop = $("#msgs").scrollHeight;
    const items = $$("#work li");
    let i = 0;
    const tick = () => {
      items.forEach((el, k) => { el.className = k < i ? "done" : k === i ? "now" : ""; });
    };
    tick();
    const timer = setInterval(() => { if (i < items.length - 1) { i++; tick(); } }, 900);
    return async () => {
      clearInterval(timer);
      for (; i < items.length; i++) { tick(); await new Promise((r) => setTimeout(r, 160)); }
      items.forEach((el) => (el.className = "done"));
      await new Promise((r) => setTimeout(r, 350));
    };
  }

  // ---------- a new listing ----------

  const EXAMPLE = "Just listed: 412 Oak Street in Riverside, Austin, TX. 3 bed, 2 bath, 1,840 sq ft craftsman with a wraparound porch, renovated kitchen with a quartz island, fenced backyard and a home office. $649,000";

  function viewNew() {
    main.innerHTML = `${mtop("New listing", "", { back: "#/today" })}<section class="chat"><div class="ch"><div class="tt"><h2>New listing</h2></div></div>
      <div class="msgs" id="msgs"><div class="intro"><h1>What are you <span class="serif">selling?</span></h1><p>Add the photos, then paste the link or describe the home. You'll get 3 ads to compare.</p>
      ${!paid() && S.me.usage.adsMade >= S.me.usage.freeLimit ? `<div class="notice"><b>Your ${S.me.usage.freeLimit} free ads are used.</b> You can still add this listing. Its ads get made once you're on the paid plan.
        ${S.me.workspace.brand.upgrade_requested ? `<span class="small">Paid plan requested.</span>` : `<button class="link" data-upgrade>Ask for the paid plan</button>`}</div>` : ""}</div>
      <label class="drop" id="drop"><span class="ic">${ICON.photo}</span><b>Add photos</b><span>The more the better. Hopkins picks the best for each ad.</span><div class="grid" id="dropGrid"></div><input type="file" accept="image/*" multiple hidden id="dropFiles"></label>
      <div class="thread" id="thread" style="margin-top:18px"></div></div>
      ${composerHtml("Paste a link or describe the home", [["Try an example", 'data-act="example"']])}</section>`;
    const dropEl = $("#drop");
    $("#dropFiles").addEventListener("change", (e) => { S.addFiles(e.target.files); e.target.value = ""; });
    dropEl.addEventListener("dragover", (e) => { e.preventDefault(); dropEl.classList.add("drag"); });
    dropEl.addEventListener("dragleave", () => dropEl.classList.remove("drag"));
    dropEl.addEventListener("drop", (e) => { e.preventDefault(); dropEl.classList.remove("drag"); S.addFiles(e.dataTransfer.files); });
    $("#dropGrid").addEventListener("click", (e) => { const i = e.target.dataset.rm; if (i !== undefined) { e.preventDefault(); S.removeFile(Number(i)); } });
    bindComposer(async (text, files) => {
      // Clear the box straight away so it doesn't look like nothing happened.
      const ta = $("#ta");
      ta.value = "";
      ta.dispatchEvent(new Event("input"));
      try { await create(text, files); } catch (err) { ta.value = text; viewNew(); $("#ta").value = text; throw err; }
    }, {
      drop: (pending) => {
        dropEl.classList.toggle("has", pending.length > 0);
        $("#dropGrid").innerHTML = pending.length ? pending.map((p, i) => `<i style="background-image:url(${p.url});position:relative"><button type="button" data-rm="${i}" aria-label="Remove" style="position:absolute;right:4px;top:4px;width:22px;height:22px;border-radius:50%;background:rgba(42,15,20,.75);color:#fff;font-size:13px;line-height:22px">×</button></i>`).join("") + `<span class="more">${ICON.plus}</span>` : "";
      },
    });
    async function create(text, files) {
      $("#drop").style.display = "none";
      $(".intro").style.display = "none";
      $(".chips") && ($(".chips").style.display = "none");
      const shown = files.length ? `<div class="ph">${S.pending.slice(0, 8).map((p) => `<i style="background-image:url(${p.url})"></i>`).join("")}</div>` : "";
      $("#thread").insertAdjacentHTML("beforeend", `<div class="me in">${shown}<span class="tx">${esc(text || `${files.length} photos`)}</span></div>`);
      const finish = showWork([...(files.length ? [`Uploading ${files.length} ${files.length === 1 ? "photo" : "photos"}`] : []), "Reading the listing", ...(files.length ? ["Picking the best photo for each ad"] : []), "Writing 3 different ads", "Checking the wording"]);
      const photoIds = [], photoNames = {};
      for (const f of files) {
        const r = await uploadPhoto(f);
        photoIds.push(r.id);
        photoNames[r.id] = f.name;
      }
      const p = await api("/api/listings", { body: { text, photoIds, photoNames } });
      await finish();
      await Promise.all([loadMe(), loadListings()]);
      S.fresh = p.listing.id;
      location.hash = `#/l/${p.listing.id}`;
    }
  }

  // ---------- a listing: chat and preview ----------

  async function viewListing(id, keepScroll) {
    const my = current();
    if (!S.current || S.current.listing.id !== id) main.innerHTML = `${mtop("", "", { back: "#/listings" })}${skeleton()}`;
    const p = await api(`/api/listings/${id}`);
    if (my !== current()) return;
    drawListing(p, keepScroll);
  }

  function drawListing(p, keepScroll) {
    S.current = p;
    const l = p.listing;
    if (!S.selected[l.id]) S.selected[l.id] = 1;
    const prevScroll = keepScroll && $("#msgs") ? $("#msgs").scrollTop : null;
    const showPv = $("#lv") && $("#lv").classList.contains("showpv");
    const seen = S.seen[l.id] ?? (S.fresh === l.id ? 1 : p.messages.length);
    const reveal = S.fresh === l.id;
    S.fresh = null;
    const chip = l.status === "sold" ? `<span class="chip green">Sold</span>` : l.moment !== "new" ? `<span class="chip gold">${esc(S.me.moments[l.moment])}</span>` : "";
    const sub = [l.priceText, l.facts].filter(Boolean).join(" · ");
    const firstPhoto = p.photos[0];
    const chips = p.ads.length
      ? [["Run it", 'data-act="run" class-go'], ["Shorter", 'data-say="Make it shorter"'], ["Warmer", 'data-say="Make it warmer"'], ["More premium", 'data-say="Make it more premium"'], ["Another angle", 'data-say="Try another angle"'], ["Different photo", 'data-say="Use a different photo"']]
      : [["Make the ads", 'data-act="remake" class-go']];
    main.innerHTML = `${mtop(listingName(l), `${p.ads.length ? `<div class="seg ptab"><button data-act="chat" class="${showPv ? "" : "on"}">Chat</button><button data-act="ads" class="${showPv ? "on" : ""}">Ads</button></div>` : ""}<button class="icon-btn" data-act="listmenu" aria-label="More">${ICON.dots}</button>`, { back: "#/listings", sub })}
      <div class="lv ${showPv ? "showpv" : ""}" id="lv">
      <section class="chat"><div class="ch">${firstPhoto ? `<i class="thumb" style="background-image:url(${photoUrl(firstPhoto.id, true)})"></i>` : ""}<div class="tt"><h2>${esc(listingName(l))}</h2><span class="sub">${esc(sub)}</span></div>${chip}
        <div class="r"><button class="icon-btn" data-act="listmenu" aria-label="More">${ICON.dots}</button></div></div>
        <div class="msgs" id="msgs"><div class="thread" id="thread">${messagesHtml(p, seen, reveal)}</div></div>${composerHtml(p.ads.length ? `Ask for a change to version ${S.selected[l.id]}` : "Ask anything about this listing", chips)}</section>
      <section class="pv" id="pv"></section></div>`;
    S.seen[l.id] = p.messages.length;
    const msgs = $("#msgs");
    msgs.style.scrollBehavior = "auto";
    msgs.scrollTop = prevScroll ?? msgs.scrollHeight;
    msgs.style.scrollBehavior = "";
    drawMiniCards();
    drawPreview();
    bindComposer(async (text, files) => {
      if (files.length) {
        $("#hint").textContent = `Uploading ${files.length} ${files.length === 1 ? "photo" : "photos"}…`;
        for (const f of files) await uploadPhoto(f, { listingId: l.id });
        $("#hint").textContent = "";
        if (!text) {
          S.showPhotos = true;
          toast(`Added ${files.length} ${files.length === 1 ? "photo" : "photos"}`);
          return viewListing(l.id);
        }
      }
      await say(text);
    });
  }

  async function say(text) {
    const l = S.current.listing;
    showTyping(text);
    const my = current();
    const next = await api(`/api/listings/${l.id}/messages`, { body: { text, version: S.selected[l.id] } });
    if (my !== current()) return;
    drawListing(next);
    refreshSide();
  }

  function messagesHtml(p, seen, reveal) {
    const lastAds = [...p.messages].reverse().find((m) => m.kind === "ads");
    let prev = null;
    return p.messages.map((m, i) => {
      const anim = i >= seen ? " in" : "";
      const isFirst = prev !== m.role;
      prev = m.role;
      if (m.role === "agent") {
        const ph = m.data && m.data.photos ? `<div class="ph">${m.data.photos.slice(0, 8).map((id) => `<i style="background-image:url(${photoUrl(id, true)})"></i>`).join("")}</div>` : "";
        const long = m.body.length > 180;
        return `<div class="me${anim}${long ? " clamp" : ""}">${ph}<span class="tx">${esc(m.body)}</span>${long ? `<button class="more-btn" data-act="expand">Show more</button>` : ""}</div>`;
      }
      const mark = isFirst ? `<img class="m" src="/static/mark.svg" alt="">` : `<span class="m"></span>`;
      const wrap = (inner) => `<div class="hk${anim}">${mark}<div class="b">${inner}</div></div>`;
      const text = `<p>${esc(m.body)}</p>`;
      if (m.kind === "ads" && m === lastAds && p.ads.length) {
        return wrap(`${text}<div class="vers ${reveal ? "reveal" : ""}">${p.ads.map((a) => `<button class="vc ${a.version === S.selected[p.listing.id] ? "sel" : ""}" data-pick="${a.version}" data-open="1">
          <canvas data-mini="${a.version}" width="1080" height="1350"></canvas><span><b>${a.version}</b> · ${esc(S.me.patterns[a.pattern]?.name || a.pattern)}</span></button>`).join("")}</div>`);
      }
      if (m.kind === "plan") {
        const d = m.data;
        return wrap(`${text}<div class="plan"><div class="big">${money(d.budget)} <span class="serif" style="font-weight:400">over</span> ${d.days} days</div>
          <div class="meta">${money(d.perDay)} a day · ${esc(d.audience.location)}, ${d.audience.radiusMiles} miles · Housing category</div>
          ${m.needs_action ? `<div class="acts"><button class="btn" data-confirm="${m.id}">Yes, run it</button><button class="link" data-fill="Run it with $300 over 14 days">Change the budget</button></div>` : ""}</div>`);
      }
      if (m.kind === "upgrade") {
        const asked = S.me.workspace.brand.upgrade_requested;
        return wrap(`${text}<div class="acts"><button class="btn" data-upgrade ${asked ? "disabled" : ""}>${asked ? "Requested" : "Ask for the paid plan"}</button>
          ${asked ? `<span class="small">You'll get an email when your seat is ready.</span>` : ""}</div>`);
      }
      if (m.kind === "check") return wrap(`<div class="note-line">${esc(m.body)}<span class="small">A wording check, not legal advice.</span></div>`);
      if (m.kind === "lead") return wrap(`${text}<div class="acts"><a class="sec-btn" href="#/leads">${ICON.people}Open leads</a></div>`);
      return wrap(text);
    }).join("");
  }

  function adFor(version) {
    return S.current.ads.find((a) => a.version === version);
  }

  function renderOpts(ad, format) {
    const l = S.current.listing;
    const b = S.me.workspace.brand;
    return {
      ad, brand: b, format,
      photo: photoUrl(ad.photo_id),
      logo: b.logo_id ? photoUrl(b.logo_id) : null,
      watermark: !paid(),
      price: l.price ? (l.price >= 1e6 ? `$${(l.price / 1e6).toFixed(2).replace(/\.?0+$/, "")}M` : money(l.price)) : "",
      place: l.area || l.city || "",
    };
  }

  function drawMiniCards() {
    $$("canvas[data-mini]").forEach((c) => {
      const ad = adFor(Number(c.dataset.mini));
      if (ad) Creative.render(c, renderOpts(ad, "feed"));
    });
  }

  function pick(version) {
    const l = S.current.listing;
    S.selected[l.id] = version;
    $$(".vc").forEach((c) => c.classList.toggle("sel", Number(c.dataset.pick) === version));
    if ($("#ta")) $("#ta").placeholder = `Ask for a change to version ${version}`;
    buzz(5);
    drawPreview();
  }

  function drawPreview() {
    const p = S.current, l = p.listing, pv = $("#pv");
    if (!pv) return;
    if (!p.ads.length) {
      pv.innerHTML = `<div class="pvh"><span class="small">Preview</span></div><div class="empty-pv">Your ads show up here.<button class="btn" data-act="remake" style="margin-top:10px">Make the ads</button></div>`;
      return;
    }
    const v = S.selected[l.id];
    const ad = adFor(v) || p.ads[0];
    const b = S.me.workspace.brand;
    const handle = (b.instagram || b.business || "your.brand").replace(/^@/, "").toLowerCase().replace(/\s+/g, "");
    const ava = b.logo_id ? `style="background:#fff url(${photoUrl(b.logo_id)}) center/contain no-repeat"` : `style="background:${esc(b.primary || "#1F2A36")}"`;
    const issues = ad.issues || [];
    const short = ad.primary_text.length > 125;
    const feed = `<div class="igc"><div class="h"><i class="ava" ${ava}></i><div>${esc(handle)}<span>Sponsored</span></div></div><canvas id="big" width="1080" height="1350"></canvas>
      <div class="cta"><span>${esc(ad.cta)}</span><span>›</span></div>
      <div class="cp" id="cp"><b>${esc(handle)}</b>${esc(short ? ad.primary_text.slice(0, 125).replace(/\s\S*$/, "") : ad.primary_text)}${short ? '<span class="more" data-act="more">… more</span>' : ""}</div></div>`;
    const story = `<div class="story"><canvas id="big" width="1080" height="1920"></canvas><div class="bar"><i></i></div><div class="who"><i class="ava" ${ava}></i>${esc(handle)} <span>Sponsored</span></div><div class="go">${esc(ad.cta)}</div></div>`;
    const tabs = `<div class="seg">${p.ads.map((a) => `<button data-pick="${a.version}" class="${a.version === v ? "on" : ""}">${esc(S.me.patterns[a.pattern]?.name || "Version " + a.version)}</button>`).join("")}</div>`;
    const fmt = `<div class="seg"><button data-fmt="feed" class="${S.format === "feed" ? "on" : ""}" title="Feed post">Feed</button><button data-fmt="story" class="${S.format === "story" ? "on" : ""}" title="Story">Story</button></div>`;
    pv.innerHTML = `<div class="pvh">${tabs}${fmt}</div><div class="mbar">${tabs}${fmt}</div>
      <div class="stage" id="stage">${S.format === "feed" ? feed : story}<div class="dots">${p.ads.map((a) => `<i class="${a.version === v ? "on" : ""}"></i>`).join("")}</div></div>
      <div class="pvb">
        <div class="actrow lg"><button class="btn" data-act="run">Run it</button>${paid() ? `<button class="sec-btn" data-act="dlmenu">${ICON.down}<span>Download</span></button>` : ""}</div>
        ${paid() ? "" : `<p class="small" style="text-align:center">Free plan: previews only.</p>`}
        <div class="status ${issues.length ? "bad" : ""}">${issues.length ? `${ICON.alert}<button data-act="issues">${issues.length} wording ${issues.length === 1 ? "issue" : "issues"} to look at</button>` : `${ICON.check}Fair housing check passed`}<span style="margin-left:auto"></span><button data-act="photos">${S.showPhotos ? "Hide photos" : "Change photo"}</button></div>
        ${issues.length && S.showIssues ? `<div class="issues">${issues.map((i) => `"${esc(i.term)}" ${esc(i.why)}${i.suggestion ? `. Try "${esc(i.suggestion)}"` : ""}.`).join("<br>")}</div>` : ""}
        ${S.showPhotos ? photoStrip(ad) : ""}
      </div>`;
    Creative.render($("#big"), renderOpts(ad, S.format));
    bindStrip();
    // Swipe left or right on the ad to flip between the versions.
    const stage = $("#stage");
    let x0 = null, y0 = null;
    stage.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    stage.addEventListener("touchend", (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      x0 = null;
      if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
      const n = p.ads.length, cur = S.selected[l.id];
      pick(dx < 0 ? (cur % n) + 1 : ((cur + n - 2) % n) + 1);
    });
  }

  function photoStrip(ad) {
    const labels = S.me.photoLabels;
    return `<div class="strip">${S.current.photos.map((ph) => `<div class="p ${ad && ad.photo_id === ph.id ? "on" : ""}"><i data-use="${ph.id}" style="background-image:url(${photoUrl(ph.id, true)})" title="Use this photo"></i>
      <select data-label="${ph.id}" aria-label="What's in this photo"><option value="">Label</option>${labels.map((x) => `<option ${ph.label === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>`).join("")}
      <label class="add" title="Add photos">${ICON.plus}<input type="file" accept="image/*" multiple hidden data-addphotos></label></div>`;
  }

  function bindStrip() {
    const l = S.current.listing;
    $$("[data-label]").forEach((s) => s.addEventListener("change", async () => {
      await api(`/api/photos/${s.dataset.label}`, { method: "PATCH", body: { label: s.value || null } });
      const ph = S.current.photos.find((x) => x.id === s.dataset.label);
      if (ph) ph.label = s.value || null;
    }));
    const add = $("[data-addphotos]");
    if (add) add.addEventListener("change", async (e) => {
      const files = [...e.target.files];
      toast(`Uploading ${files.length} ${files.length === 1 ? "photo" : "photos"}…`);
      for (const f of files) await uploadPhoto(f, { listingId: l.id });
      await viewListing(l.id, true);
      refreshSide();
    });
  }

  async function refreshSide() {
    await Promise.all([loadMe(), loadListings(), loadInbox()]);
    drawSide();
  }

  // ---------- Leads ----------

  const STATUS = { new: "New", contacted: "Contacted", showing: "Showing booked", offer: "Offer", closed: "Closed", not_a_fit: "Not a fit" };
  const WANTS = { showing: "Wants a showing", info: "Has a question", offer: "Wants to talk about an offer" };

  async function viewLeads() {
    const my = current();
    main.innerHTML = `${mtop("Leads")}${skeleton()}`;
    const { leads } = await api("/api/leads");
    if (my !== current()) return;
    const fresh = leads.filter((x) => x.status === "new").length;
    const tel = (n) => n.replace(/[^\d+]/g, "");
    const item = (x, i) => `<div class="lead ${x.status === "new" ? "new" : ""}" style="animation-delay:${Math.min(i, 8) * 0.04}s"><span class="av">${esc(x.name.split(" ").map((w) => w[0]).join("").slice(0, 2))}</span>
      <div class="tx"><b>${esc(x.name)}</b><p>${esc(WANTS[x.wants] || x.wants)}${x.note ? `: "${esc(x.note)}"` : ""}</p>
      <div class="small">${esc(x.address || x.area || "Listing")} · ${x.version ? `${esc(S.me.patterns[x.pattern]?.name || "")} ad` : "Lead page"} · ${ago(x.created_at)}</div>
      <div class="acts">${x.phone ? `<a href="tel:${esc(tel(x.phone))}">${ICON.phone}Call</a><a href="sms:${esc(tel(x.phone))}">${ICON.msg}Text</a>` : ""}${x.email ? `<a href="mailto:${esc(x.email)}">${ICON.mail}Email</a>` : ""}
      <select data-lead="${x.id}" aria-label="Status">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${x.status === k ? "selected" : ""}>${v}</option>`).join("")}</select></div></div></div>`;
    main.innerHTML = `${mtop("Leads")}<div class="page"><div class="wrap"><div class="head"><h1>Leads</h1><p class="lede">${leads.length ? `${leads.length} in total${fresh ? `, ${fresh} new` : ""}. Tap to call or text.` : "Everyone who asks about a listing lands here."}</p></div>
      ${leads.length ? `<div class="list" style="border-top:0">${leads.map(item).join("")}</div>`
        : `<div class="empty"><div class="ic">${ICON.people}</div><b>No leads yet</b>Every listing has a lead page where buyers ask for a showing. Leads land here and on your phone.</div>`}</div></div>`;
    $$("[data-lead]").forEach((s) => s.addEventListener("change", async () => {
      await api(`/api/leads/${s.dataset.lead}`, { method: "PATCH", body: { status: s.value } });
      s.closest(".lead").classList.toggle("new", s.value === "new");
      buzz(6);
      toast("Saved");
    }));
  }

  // ---------- Monday report ----------

  async function viewReport() {
    const my = current();
    main.innerHTML = `${mtop("Report")}${skeleton()}`;
    const r = await api("/api/report");
    if (my !== current()) return;
    const pats = S.me.patterns;
    const most = Math.max(1, ...r.patterns.map((x) => x.leads || 0));
    const top = r.patterns.reduce((a, x) => ((x.leads || 0) > (a?.leads || 0) ? x : a), null);
    main.innerHTML = `${mtop("Report")}<div class="page"><div class="wrap">
      <p class="small">Last 7 days</p><div class="headline">${esc(r.headline)}</div>
      <div class="stats"><div class="stat"><span>Leads</span><b>${r.total}</b></div><div class="stat key"><span>Cost per lead</span><b>${r.cpl != null ? money(r.cpl) : "n/a"}</b></div>
        <div class="stat"><span>Asked for a showing</span><b>${r.showings}</b></div><div class="stat"><span>Spend</span><b>${money(r.spend)}</b></div></div>
      <h3>What I'd do next</h3><ul class="next">${r.next.length ? r.next.map((n) => `<li>${esc(n)}</li>`).join("") : "<li>Nothing to change this week.</li>"}</ul>
      <h3>By listing</h3>${r.listings.length ? r.listings.map((x) => `<div class="rl"><div class="tx"><a href="#/l/${x.id}"><b>${esc(x.name)}</b></a>
          <div class="small">${x.leads} ${x.leads === 1 ? "lead" : "leads"} · ${x.showings} ${x.showings === 1 ? "showing" : "showings"}${x.cpl != null ? ` · <b style="color:var(--bronze)">${money(x.cpl)} a lead</b>` : ""}</div></div>
          <input type="number" inputmode="decimal" min="0" step="1" value="${x.spend || ""}" placeholder="$ spent" data-spend="${x.id}" aria-label="Spend on ${esc(x.name)}"></div>`).join("")
        + `<p class="small" style="margin-top:10px">Spend fills in on its own once Meta is connected. Until then, type it in.</p>` : `<p class="small">No listings yet.</p>`}
      <h3>What's winning</h3>
      ${r.patterns.length ? r.patterns.map((x) => `<div class="bar-row ${top && x === top && x.leads ? "win" : ""}"><span class="nm">${esc(pats[x.pattern]?.name || x.pattern)}</span><span class="track"><i style="width:${((x.leads || 0) / most) * 100}%"></i></span><span class="n">${x.leads || 0} ${x.leads === 1 ? "lead" : "leads"}</span></div>`).join("")
        : `<p class="small">Every ad you approve is recorded here with the leads it brought, so you can see which kind of ad wins.</p>`}
    </div></div>`;
    $$("[data-spend]").forEach((i) => i.addEventListener("change", async () => {
      await api(`/api/listings/${i.dataset.spend}`, { method: "PATCH", body: { spend: Number(i.value) || 0 } });
      viewReport();
    }));
  }

  // ---------- Brand ----------

  const COUNTRIES = ["United States", "Canada", "Australia", "United Arab Emirates", "United Kingdom", "Ireland", "Somewhere else"];
  // Quick picks that look good on real listing photos: a main color with an accent that suits it.
  const PALETTES = [["#1F2A36", "#C8A96A"], ["#111111", "#E8E2D6"], ["#22352B", "#D9B98A"], ["#2A0F14", "#D7AE62"], ["#2C3E50", "#E07A5F"], ["#3B2F2F", "#C9A27E"], ["#0F3D5E", "#F2C14E"], ["#4A4E69", "#F2E9E4"]];

  async function viewBrand() {
    const b = S.me.workspace.brand;
    const first = !b.setup_done;
    const field = (k, label, ph = "", hint = "") => `<div class="fld"><label for="f_${k}">${label}</label><input id="f_${k}" name="${k}" value="${esc(b[k] || "")}" placeholder="${esc(ph)}" autocomplete="off">${hint ? `<p class="small">${hint}</p>` : ""}</div>`;
    const radio = (k, opts) => `<div class="choice">${opts.map(([v, l]) => `<label><input type="radio" name="${k}" value="${v}" ${(b[k] || opts[0][0]) === v ? "checked" : ""}>${l}</label>`).join("")}</div>`;
    main.innerHTML = `${first ? `<div class="mtop"><span class="logo"><img src="/static/mark.svg" alt="">Hopkins</span></div>` : mtop("Brand")}<div class="page"><div class="wrap">
      <div class="head"><h1>${first ? `Make it <span class="serif">yours</span>` : "Brand"}</h1><p class="lede">${first ? "One minute. Every ad follows this, so people start to recognize you." : "Every ad follows this."}</p></div>
      <div class="brandgrid"><form class="form" id="brandForm">
        <div class="group"><h4>Who you are</h4><div class="grid2">${field("business", "Business name", "Ellery Realty")}${field("agent_name", "Your name", "Sam Ellery")}${field("city", "Main city", "Austin")}${field("instagram", "Instagram", "@elleryrealty")}</div></div>
        <div class="group"><h4>How it looks</h4><div style="display:flex;flex-direction:column;gap:14px">
          <div><div class="colors"><label><input type="color" name="primary" value="${esc(b.primary || "#1F2A36")}">Main color</label><label><input type="color" name="accent" value="${esc(b.accent || "#C8A96A")}">Accent</label></div>
          <div class="swatches">${PALETTES.map(([p1, p2]) => `<button type="button" data-pal="${p1},${p2}" style="background:${p1}" aria-label="Use ${p1} and ${p2}"><i style="background:${p2}"></i></button>`).join("")}</div></div>
          <div class="logo-up"><i id="logoPrev" style="${b.logo_id ? `background-image:url(${photoUrl(b.logo_id)})` : ""}"></i><label class="sec-btn">Upload logo<input type="file" accept="image/png,image/jpeg,image/webp" hidden id="logoFile"></label>${b.logo_id ? `<button type="button" class="link" id="logoRm">Remove</button>` : ""}</div>
          ${radio("font", [["modern", "Modern"], ["classic", "Classic serif"]])}</div></div>
        <div class="group"><h4>How it sounds</h4>${radio("voice", [["plain", "Plain"], ["warm", "Warm"], ["premium", "Quiet luxury"]])}</div>
        <div class="group"><details class="more"><summary>More</summary><div class="inner">
          <div class="grid2">${field("phone", "Phone on lead pages", "(512) 555 0100")}<div class="fld"><label for="f_country">Country</label><select id="f_country" name="country">${COUNTRIES.map((c) => `<option ${b.country === c ? "selected" : ""}>${c}</option>`).join("")}</select></div></div>
          ${field("license", "License line", "DRE #01234567", "Small print on your lead pages, where your state asks for it.")}
        </div></details></div>
        <div class="save"><button class="btn" type="submit">${first ? "Continue" : "Save"}</button><span class="err" id="brandErr"></span></div>
      </form><div class="brandprev"><canvas id="brandCanvas"></canvas><p class="small">${phone() ? "Live preview. It changes as you go." : "A sample ad. Yours use your listing photos."}</p></div></div></div></div>`;
    const form = $("#brandForm");
    let logoId = b.logo_id || "";
    const sample = () => {
      const brand = Object.fromEntries(new FormData(form).entries());
      brand.logo_id = logoId;
      const l = S.listings.find((x) => x.photo_id);
      Creative.render($("#brandCanvas"), {
        ad: { pattern: "life", overlay: "Slow mornings on the porch.", kicker: `Just listed · ${brand.city || "Riverside"}` },
        brand, format: "feed", photo: l ? photoUrl(l.photo_id) : "/static/sample-home.jpg", logo: logoId ? photoUrl(logoId) : null, watermark: false,
      });
    };
    form.addEventListener("input", sample);
    sample();
    $$("[data-pal]").forEach((btn) => btn.addEventListener("click", () => {
      const [p1, p2] = btn.dataset.pal.split(",");
      form.primary.value = p1;
      form.accent.value = p2;
      buzz(5);
      sample();
    }));
    $("#logoFile").addEventListener("change", async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const r = await uploadPhoto(f, { kind: "logo" });
      logoId = r.id;
      $("#logoPrev").style.backgroundImage = `url(${photoUrl(logoId)})`;
      sample();
    });
    if ($("#logoRm")) $("#logoRm").addEventListener("click", () => { logoId = ""; $("#logoPrev").style.backgroundImage = ""; sample(); });
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      $("#brandErr").textContent = "";
      const body = Object.fromEntries(new FormData(form).entries());
      body.logo_id = logoId;
      try {
        await api("/api/brand", { method: "PUT", body });
        await loadMe();
        if (first) { celebrate("Looking good"); setTimeout(() => (location.hash = "#/today"), 900); }
        else toast("Saved");
      } catch (err) {
        $("#brandErr").textContent = err.message;
      }
    });
  }

  // ---------- Settings ----------

  function viewSettings() {
    const u = S.me.user, b = S.me.workspace.brand, use = S.me.usage;
    const fld = (id, label, value, type = "text", ph = "", auto = "off") => `<div class="fld"><label for="${id}">${label}</label><input id="${id}" type="${type}" value="${esc(value || "")}" placeholder="${esc(ph)}" autocomplete="${auto}"></div>`;
    main.innerHTML = `${mtop("Settings")}<div class="page"><div class="wrap" style="max-width:600px">
      <div class="head"><h1>Settings</h1></div>
      <div class="group"><h4>Profile</h4>
        <div class="set-av"><span class="av big" id="setAv" ${avatarStyle()}>${esc(initials())}</span><div>
          <label class="sec-btn">Change photo<input type="file" accept="image/*" hidden id="avFile"></label>
          ${u.avatar_id ? `<button class="link" data-act="avRemove" style="margin-left:10px">Remove</button>` : ""}</div></div>
        <div style="display:flex;flex-direction:column;gap:12px;margin-top:16px">
          ${fld("sName", "Your name", u.name, "text", "Sam Ellery", "name")}
          ${fld("sEmail", "Email", u.email, "email", "", "email")}
          <div class="fld hidden" id="sEmailPw">${`<label for="sEmailPass">Current password, to change your email</label><input id="sEmailPass" type="password" autocomplete="current-password">`}</div>
          <div><button class="sec-btn" data-act="saveProfile">Save profile</button></div></div></div>
      <div class="group"><h4>Business</h4>
        ${fld("sBiz", "Business, team or brokerage", b.business, "text", "Ellery Realty", "organization")}
        <div style="display:flex;gap:14px;align-items:center;margin-top:12px"><button class="sec-btn" data-act="saveBiz">Save</button><a class="link" href="#/brand">Colors, logo and voice</a></div></div>
      <div class="group"><h4>Password</h4><div style="display:flex;flex-direction:column;gap:12px">
        ${fld("sPwCur", "Current password", "", "password", "", "current-password")}${fld("sPwNew", "New password", "", "password", "At least 8 characters", "new-password")}
        <div><button class="sec-btn" data-act="savePw">Change password</button></div></div></div>
      <div class="group"><h4>Notifications</h4>
        ${fld("sAlerts", "Lead alerts on your phone", b.alerts_topic, "text", "ellery-leads-4821")}
        <p class="small" style="margin-top:6px">Install the free ntfy app, subscribe to a name only you know, and type the same name here. New leads reach your phone within seconds.</p>
        <div style="margin-top:12px"><button class="sec-btn" data-act="saveAlerts">Save</button></div></div>
      <div class="group"><h4>Plan</h4>${paid()
        ? `<p>Paid plan. Billing starts when your first ad goes live.</p>`
        : `<p>Free plan</p><div class="meter" style="max-width:260px"><i style="width:${Math.min(100, (use.adsMade / use.freeLimit) * 100)}%"></i></div><p class="small">${Math.min(use.adsMade, use.freeLimit)} of ${use.freeLimit} free ads made. Previews only.</p>
           <div style="margin-top:12px">${b.upgrade_requested ? `<span class="small">Paid plan requested. You'll get an email when your seat is ready.</span>` : `<button class="btn" data-upgrade>Ask for the paid plan</button>`}</div>`}</div>
      <div class="group"><h4>Account</h4><div style="display:flex;flex-direction:column;align-items:flex-start;gap:14px">
        <button class="sec-btn" data-act="logout">${ICON.out}Sign out</button>
        <button class="link danger" data-act="deleteAsk">Delete account</button></div></div>
    </div></div>`;
    $("#sEmail").addEventListener("input", (e) => $("#sEmailPw").classList.toggle("hidden", e.target.value.trim().toLowerCase() === u.email));
    $("#avFile").addEventListener("change", async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      toast("Uploading…");
      const r = await uploadPhoto(f, { kind: "avatar" });
      await api("/api/account", { method: "PATCH", body: { avatar_id: r.id } });
      await loadMe();
      drawSide();
      viewSettings();
      toast("Photo updated");
    });
  }

  async function settingsAction(act, t) {
    const val = (id) => ($(id) ? $(id).value : "");
    if (act === "saveProfile") {
      const body = { name: val("#sName"), email: val("#sEmail") };
      if (!$("#sEmailPw").classList.contains("hidden")) body.password = val("#sEmailPass");
      await api("/api/account", { method: "PATCH", body });
      await loadMe(); drawSide(); viewSettings(); buzz(6); toast("Profile saved");
    } else if (act === "saveBiz") {
      await api("/api/brand", { method: "PUT", body: { business: val("#sBiz") } });
      await loadMe(); drawSide(); buzz(6); toast("Saved");
    } else if (act === "savePw") {
      await api("/api/account/password", { body: { current: val("#sPwCur"), next: val("#sPwNew") } });
      $("#sPwCur").value = ""; $("#sPwNew").value = ""; buzz(6); toast("Password changed");
    } else if (act === "saveAlerts") {
      await api("/api/brand", { method: "PUT", body: { alerts_topic: val("#sAlerts") } });
      await loadMe(); buzz(6); toast("Saved");
    } else if (act === "avRemove") {
      await api("/api/account", { method: "PATCH", body: { avatar_id: "" } });
      await loadMe(); drawSide(); viewSettings(); toast("Photo removed");
    } else if (act === "deleteAsk") {
      openPop(t, `<div class="note"><b>Delete your account?</b>This deletes your listings, ads, leads and photos for good. It can't be undone.</div>
        <div style="padding:6px 10px 4px"><div class="fld"><label for="delPw">Your password</label><input id="delPw" type="password" autocomplete="current-password"></div></div>
        <button class="danger" data-act="deleteYes">${ICON.alert}Delete everything</button>`);
      setTimeout(() => $("#delPw") && $("#delPw").focus(), 50);
    } else if (act === "deleteYes") {
      await api("/api/account/delete", { body: { password: val("#delPw") } });
      location.href = "/signup";
    }
  }

  // ---------- Admin ----------

  async function viewAdmin() {
    const my = current();
    const { workspaces } = await api("/api/admin/workspaces");
    if (my !== current()) return;
    main.innerHTML = `${mtop("Admin")}<div class="page"><div class="wrap"><div class="head"><h1>Workspaces</h1><p class="lede">Switch a workspace to paid once they've agreed the price.</p></div>
      <div class="scroll-x"><table class="tbl"><thead><tr><th>Workspace</th><th>Listings</th><th>Ads</th><th>Leads</th><th>Asked to upgrade</th><th>Plan</th></tr></thead><tbody>
      ${workspaces.map((w) => `<tr><td><b>${esc(w.name)}</b><span class="small">${esc(w.emails || "")} · ${ago(w.created_at)}</span></td><td>${w.listings}</td><td>${w.ads}</td><td>${w.leads}</td>
        <td>${w.upgrade_requested ? ago(w.upgrade_requested) : ""}</td><td><select data-ws="${w.id}"><option value="free" ${w.plan === "free" ? "selected" : ""}>Free</option><option value="paid" ${w.plan === "paid" ? "selected" : ""}>Paid</option></select></td></tr>`).join("")}
      </tbody></table></div></div></div>`;
    $$("[data-ws]").forEach((s) => s.addEventListener("change", async () => {
      await api(`/api/admin/workspaces/${s.dataset.ws}`, { method: "PATCH", body: { plan: s.value } });
      toast("Saved");
      await loadMe();
      drawSide();
    }));
  }

  // ---------- clicks ----------

  async function download(format) {
    const l = S.current.listing;
    const ad = adFor(S.selected[l.id]);
    const c = document.createElement("canvas");
    await Creative.render(c, renderOpts(ad, format));
    c.toBlob((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${l.slug}-v${ad.version}-${format}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }, "image/png");
  }

  function showAds(on) {
    $("#lv").classList.toggle("showpv", on);
    $$(".mtop .seg button").forEach((b) => b.classList.toggle("on", b.dataset.act === (on ? "ads" : "chat")));
    buzz(5);
  }

  document.addEventListener("click", async (e) => {
    if (!e.target.closest("#pop") && !e.target.closest("[data-act=account],[data-act=listmenu],[data-act=dlmenu]")) closePop();
    const t = e.target.closest("[data-act],[data-pick],[data-fmt],[data-confirm],[data-fill],[data-upgrade],[data-copy],[data-dl],[data-use],[data-say]");
    if (!t) return;
    const act = t.dataset.act;
    if (t.closest("#pop") && act !== "deleteYes") closePop();
    const l = S.current && S.current.listing;
    try {
      if (["saveProfile", "saveBiz", "savePw", "saveAlerts", "avRemove", "deleteAsk", "deleteYes"].includes(act)) await settingsAction(act, t);
      else if (act === "account") openPop(t, accountMenu());
      else if (act === "listmenu") openPop(t, listingMenu());
      else if (act === "dlmenu") {
        const ad = adFor(S.selected[l.id]);
        openPop(t, `<button data-dl="feed">${ICON.down}Feed image</button><button data-dl="story">${ICON.down}Story image</button>
          <button data-copy="${esc(ad.primary_text)}" data-copied="Ad text copied">${ICON.copy}Copy ad text</button>
          <button data-copy="${esc(`${location.origin}/l/${l.slug}?v=${ad.id}`)}">${ICON.link}Copy ad link</button>
          <div class="sep"></div><div class="note">Post or boost it yourself. Send people to the ad link so the leads count here.</div>`);
      }
      else if (act === "logout") { await api("/api/logout", { body: {} }); location.href = "/login"; }
      else if (act === "chat" || act === "ads") showAds(act === "ads");
      else if (act === "expand") { const m = t.closest(".me"); m.classList.remove("clamp"); t.remove(); }
      else if (act === "example") { const ta = $("#ta"); ta.value = EXAMPLE; ta.dispatchEvent(new Event("input")); buzz(5); }
      else if (act === "more") { const ad = adFor(S.selected[l.id]); $("#cp").innerHTML = `<b>${esc(($("#cp b") || {}).textContent || "")}</b>${esc(ad.primary_text)}`; }
      else if (act === "photos") { S.showPhotos = !S.showPhotos; drawPreview(); }
      else if (act === "issues") { S.showIssues = !S.showIssues; drawPreview(); }
      else if (act === "remake") {
        const before = S.current.messages.length;
        toast(S.current.ads.length ? "Making 3 new versions…" : "Making the ads…");
        S.fresh = l.id;
        const next = await api(`/api/listings/${l.id}/remake`, { body: {} });
        drawListing(next);
        if (!next.ads.length && next.messages.length === before) toast("Making ads needs the paid plan");
        refreshSide();
      }
      else if (t.dataset.say) { if (!S.busy) { S.busy = true; buzz(6); try { await say(t.dataset.say); } finally { S.busy = false; } } }
      else if (t.dataset.pick) {
        pick(Number(t.dataset.pick));
        // On a phone, tapping an ad card in the chat opens it big.
        if (t.dataset.open && phone()) showAds(true);
      } else if (t.dataset.fmt) { S.format = t.dataset.fmt; buzz(5); drawPreview(); }
      else if (act === "run") {
        t.disabled = true;
        buzz(8);
        const next = await api(`/api/listings/${l.id}/run`, { body: { versions: [1, 2, 3] } });
        $("#lv").classList.remove("showpv");
        drawListing(next);
        refreshSide();
      } else if (t.dataset.confirm) {
        t.disabled = true;
        const next = await api(`/api/listings/${l.id}/run`, { body: { confirm: t.dataset.confirm } });
        celebrate("Approved");
        drawListing(next);
        refreshSide();
      } else if (t.dataset.fill) { const ta = $("#ta"); ta.value = t.dataset.fill; ta.dispatchEvent(new Event("input")); ta.focus(); }
      else if (t.dataset.upgrade !== undefined) {
        t.disabled = true;
        await api("/api/upgrade-request", { body: {} });
        await loadMe();
        t.textContent = "Requested";
        toast("Sent. You'll get an email when your seat is ready.");
      } else if (t.dataset.copy) { await navigator.clipboard.writeText(t.dataset.copy); buzz(6); toast(t.dataset.copied || "Link copied"); }
      else if (t.dataset.dl) { await download(t.dataset.dl); toast("Saved to your downloads"); }
      else if (t.dataset.use) {
        const v = S.selected[l.id];
        const idx = S.current.photos.findIndex((p) => p.id === t.dataset.use);
        buzz(6);
        drawListing(await api(`/api/listings/${l.id}/messages`, { body: { text: `Use photo ${idx + 1} on version ${v}`, version: v } }), true);
      }
    } catch (err) {
      toast(err.message);
      t.disabled = false;
    }
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closePop(); });
  window.addEventListener("resize", () => { if (!phone()) closePop(); });
  $("#sheetBg").addEventListener("click", closePop);
  window.addEventListener("hashchange", route);

  (async function start() {
    try {
      await Promise.all([loadMe(), loadListings(), loadInbox()]);
    } catch (e) {
      return;
    }
    if (!location.hash) location.hash = "#/today";
    else route();
    setInterval(async () => { try { await loadInbox(); await loadListings(); drawSide(); } catch {} }, 60000);
  })();
})();
