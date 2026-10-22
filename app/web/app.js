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
  };
  const S = { me: null, listings: [], inbox: [], current: null, selected: {}, format: "feed", pending: [], busy: false, showPhotos: false, showIssues: false };

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

  function mtop(title, extra = "") {
    return `<div class="mtop"><button class="icon-btn" data-act="menu" aria-label="Menu">${ICON.menu}</button><span class="ttl">${esc(title)}</span>${extra}</div>`;
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

  // One popover for every "more" menu. Items inside use the same data attributes as the
  // rest of the page, so the click handler below covers them too.
  function openPop(anchor, html) {
    const pop = $("#pop");
    pop.innerHTML = html;
    pop.classList.add("on");
    const r = anchor.getBoundingClientRect();
    const w = pop.offsetWidth, h = pop.offsetHeight;
    let left = Math.min(window.innerWidth - w - 8, Math.max(8, r.right - w));
    if (anchor.closest(".acct")) left = Math.max(8, r.left);
    const below = r.bottom + 6 + h < window.innerHeight;
    pop.style.left = left + "px";
    pop.style.top = (below ? r.bottom + 6 : r.top - h - 6) + "px";
  }
  const closePop = () => $("#pop").classList.remove("on");

  function accountMenu() {
    const u = S.me.usage;
    const plan = paid()
      ? `<div class="note"><b>Paid plan</b>Billing starts when your first ad goes live.</div>`
      : `<div class="note"><b>Free plan</b><div class="meter"><i style="width:${Math.min(100, (u.adsMade / u.freeLimit) * 100)}%"></i></div>${Math.min(u.adsMade, u.freeLimit)} of ${u.freeLimit} free ads made</div>`;
    return `${plan}<div class="sep"></div><a href="#/brand">${ICON.brush}Brand</a>${S.me.admin ? `<a href="#/admin">${ICON.shield}Admin</a>` : ""}
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
      ${S.current.ads.length ? `<div class="sep"></div><button data-act="remake">${ICON.redo}Make 3 new versions</button>` : ""}`;
  }

  // ---------- frame ----------

  async function loadMe() {
    S.me = await api("/api/me");
  }
  async function loadListings() {
    S.listings = (await api("/api/listings")).listings;
  }
  async function loadInbox() {
    S.inbox = (await api("/api/inbox")).items;
  }

  function drawSide() {
    const route = location.hash.slice(2).split("/");
    $$(".nv").forEach((a) => a.classList.toggle("on", a.dataset.nav === route[0]));
    const waiting = S.inbox.filter((m) => m.needs_action).length;
    $("#badge").textContent = waiting || "";
    $("#lists").innerHTML = S.listings.length
      ? S.listings.map((l) => `<a class="li ${route[0] === "l" && route[1] === l.id ? "on" : ""}" href="#/l/${l.id}">
          <i class="th" style="${l.photo_id ? `background-image:url(${photoUrl(l.photo_id, true)})` : ""}"></i>
          <div class="nm"><b>${esc(listingName(l))}</b><span>${esc(sideLine(l))}</span></div>${l.waiting ? '<i class="dotw" title="Waiting on you"></i>' : ""}</a>`).join("")
      : `<div class="empty-side">Nothing yet.</div>`;
    const name = S.me.user.name || S.me.user.email;
    $("#acct").innerHTML = `<button data-act="account"><span class="av">${esc(name.slice(0, 2))}</span><span class="nm"><b>${esc(S.me.workspace.name)}</b><span>${paid() ? "Paid plan" : "Free plan"}</span></span>${ICON.chev}</button>`;
  }

  function sideLine(l) {
    if (l.status === "sold") return "Sold";
    if (l.waiting) return "Ads ready";
    if (l.approved) return l.leads ? `${l.leads} ${l.leads === 1 ? "lead" : "leads"}` : "Approved";
    return l.price ? money(l.price) : "Draft";
  }

  // ---------- routing ----------

  async function route() {
    $("#shell").classList.remove("menu");
    closePop();
    const [view, id] = location.hash.slice(2).split("/");
    try {
      if (!S.me.workspace.brand.setup_done && view !== "brand") { location.hash = "#/brand"; return; }
      if (view === "l" && id) await viewListing(id);
      else if (view === "new") viewNew();
      else if (view === "leads") await viewLeads();
      else if (view === "report") await viewReport();
      else if (view === "brand") await viewBrand();
      else if (view === "admin") await viewAdmin();
      else await viewToday();
    } catch (e) {
      if (e.message !== "signed out") main.innerHTML = `${mtop("Hopkins")}<div class="page"><p class="err">${esc(e.message)}</p></div>`;
    }
    drawSide();
  }

  // ---------- Today: what Hopkins needs from you ----------

  async function viewToday() {
    await loadInbox();
    const first = (S.me.user.name || "").split(" ")[0];
    const h = new Date().getHours();
    const greet = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
    const waiting = S.inbox.filter((m) => m.needs_action);
    const recent = S.inbox.filter((m) => !m.needs_action);
    const thumbFor = (m) => {
      const l = S.listings.find((x) => x.id === m.listing_id);
      return l && l.photo_id ? `background-image:url(${photoUrl(l.photo_id, true)})` : "";
    };
    const titleFor = (m) => {
      const where = m.address || m.area || m.city || "Your listing";
      if (m.kind === "ads") return `Ads ready for ${where}`;
      if (m.kind === "plan") return `${where} is waiting for your yes`;
      if (m.kind === "lead") return `New lead on ${where}`;
      if (m.kind === "report") return "Your Monday report";
      return where;
    };
    const row = (m) => `<a class="row" href="${m.kind === "report" ? "#/report" : `#/l/${m.listing_id}`}"><i class="th" style="${thumbFor(m)}"></i>
      <div class="tx"><b>${esc(titleFor(m))}</b><p>${esc(m.body)}</p></div><span class="when">${ago(m.created_at)}</span>${m.needs_action ? '<i class="dotw"></i>' : ""}</a>`;

    let body;
    if (!S.listings.length) {
      body = `<ol class="steps">
        <li class="${S.me.workspace.brand.setup_done ? "done" : ""}"><div class="tx"><b>Your brand</b><p>Colors, logo and voice. Every ad follows them.</p></div><a class="link" href="#/brand">Edit</a></li>
        <li><div class="tx"><b>Your first listing</b><p>Photos and the link or the description. You get 3 ads to compare.</p></div><a class="btn" href="#/new">New listing</a></li>
        <li><div class="tx"><b>Your yes</b><p>You see the plan first. Nothing runs until you say so.</p></div></li></ol>`;
    } else if (!waiting.length && !recent.length) {
      body = `<div class="empty"><b>You're all caught up.</b>When a listing comes in, a price changes or a lead arrives, it shows up here.</div>`;
    } else {
      body = `${waiting.length ? `<div class="sec">Waiting on you</div><div class="list">${waiting.map(row).join("")}</div>` : ""}
        ${recent.length ? `<div class="sec">This week</div><div class="list">${recent.map(row).join("")}</div>` : ""}`;
    }
    const lede = waiting.length ? `${waiting.length} ${waiting.length === 1 ? "thing needs" : "things need"} you.` : S.listings.length ? "Nothing needs you right now." : "Three steps to your first ads.";
    main.innerHTML = `${mtop("Today")}<div class="page"><div class="wrap"><div class="head"><h1>${greet}${first ? `, ${esc(first)}` : ""}</h1><p class="lede">${lede}</p></div>${body}</div></div>`;
  }

  // ---------- the composer (shared) ----------

  function composerHtml(placeholder) {
    return `<div class="comp-wrap"><form class="comp" id="comp"><div class="att" id="att"></div>
      <div class="row-c"><textarea id="ta" rows="1" placeholder="${esc(placeholder)}"></textarea>
      <label class="icon-btn" title="Add photos">${ICON.photo}<input type="file" id="files" accept="image/*" multiple hidden></label>
      <button class="send" id="send" type="submit" aria-label="Send">${ICON.send}</button></div><div class="hint" id="hint"></div></form></div>`;
  }

  function bindComposer(onSend) {
    const ta = $("#ta"), comp = $("#comp");
    S.pending = [];
    const grow = () => { ta.style.height = "auto"; ta.style.height = Math.min(180, ta.scrollHeight) + "px"; };
    const drawAtt = () => {
      $("#att").innerHTML = S.pending.map((p, i) => `<div class="ph" style="background-image:url(${p.url})"><button type="button" data-rm="${i}">×</button></div>`).join("");
      $("#send").disabled = S.busy;
    };
    const add = (files) => {
      for (const f of files) if (f.type.startsWith("image/")) S.pending.push({ file: f, url: URL.createObjectURL(f) });
      drawAtt();
    };
    ta.addEventListener("input", grow);
    ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); comp.requestSubmit(); } });
    $("#files").addEventListener("change", (e) => { add(e.target.files); e.target.value = ""; });
    $("#att").addEventListener("click", (e) => { const i = e.target.dataset.rm; if (i !== undefined) { S.pending.splice(Number(i), 1); drawAtt(); } });
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
      try {
        await onSend(text, S.pending.map((p) => p.file));
        ta.value = "";
        S.pending = [];
        drawAtt();
        grow();
      } catch (err) {
        toast(err.message);
      } finally {
        S.busy = false;
        if ($("#send")) $("#send").disabled = false;
      }
    });
    if (window.innerWidth > 980) setTimeout(() => ta.focus(), 50);
  }

  function showTyping(text) {
    const t = $("#thread");
    if (!t) return;
    if (text) t.insertAdjacentHTML("beforeend", `<div class="me">${esc(text)}</div>`);
    t.insertAdjacentHTML("beforeend", `<div class="hk" id="typing"><span class="typing"><i></i><i></i><i></i></span></div>`);
    $("#msgs").scrollTop = $("#msgs").scrollHeight;
  }

  // ---------- a new listing ----------

  function viewNew() {
    main.innerHTML = `${mtop("New listing")}<section class="chat"><div class="ch"><div class="tt"><h2>New listing</h2></div></div>
      <div class="msgs" id="msgs"><div class="thread" id="thread"><div class="hk"><p>Send me the listing. Add the photos, then paste the link or describe the home: price, beds and baths, and the best thing about it.</p>
      <p class="muted" style="margin-top:6px">You'll get 3 different ads to compare. Nothing runs until you say yes.</p></div></div></div>
      ${composerHtml("Paste a link or describe the home")}</section>`;
    bindComposer(async (text, files) => {
      showTyping(text || `${files.length} ${files.length === 1 ? "photo" : "photos"}`);
      $("#hint").textContent = files.length ? `Uploading ${files.length} ${files.length === 1 ? "photo" : "photos"}…` : "Reading the listing…";
      const photoIds = [], photoNames = {};
      for (const f of files) {
        const r = await uploadPhoto(f);
        photoIds.push(r.id);
        photoNames[r.id] = f.name;
      }
      $("#hint").textContent = "Writing the ads…";
      const p = await api("/api/listings", { body: { text, photoIds, photoNames } });
      await Promise.all([loadMe(), loadListings()]);
      location.hash = `#/l/${p.listing.id}`;
    });
  }

  // ---------- a listing: chat and preview ----------

  async function viewListing(id, keepScroll) {
    const p = await api(`/api/listings/${id}`);
    drawListing(p, keepScroll);
  }

  function drawListing(p, keepScroll) {
    S.current = p;
    const l = p.listing;
    if (!S.selected[l.id]) S.selected[l.id] = 1;
    const prevScroll = keepScroll && $("#msgs") ? $("#msgs").scrollTop : null;
    const showPv = $("#lv") && $("#lv").classList.contains("showpv");
    const chip = l.status === "sold" ? `<span class="chip green">Sold</span>` : l.moment !== "new" ? `<span class="chip gold">${esc(S.me.moments[l.moment])}</span>` : "";
    main.innerHTML = `${mtop(listingName(l), `<div class="seg ptab"><button data-act="chat" class="${showPv ? "" : "on"}">Chat</button><button data-act="ads" class="${showPv ? "on" : ""}">Ads</button></div><button class="icon-btn" data-act="listmenu" aria-label="More">${ICON.dots}</button>`)}
      <div class="lv ${showPv ? "showpv" : ""}" id="lv">
      <section class="chat"><div class="ch"><div class="tt"><h2>${esc(listingName(l))}</h2><span class="sub">${esc([l.priceText, l.facts].filter(Boolean).join(" · "))}</span></div>${chip}
        <div class="r"><button class="icon-btn" data-act="listmenu" aria-label="More">${ICON.dots}</button></div></div>
        <div class="msgs" id="msgs"><div class="thread" id="thread">${messagesHtml(p)}</div></div>${composerHtml(p.ads.length ? "Ask for a change" : "Tell me about the home")}</section>
      <section class="pv" id="pv"></section></div>`;
    const msgs = $("#msgs");
    msgs.scrollTop = prevScroll ?? msgs.scrollHeight;
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
      showTyping(text);
      const next = await api(`/api/listings/${l.id}/messages`, { body: { text, version: S.selected[l.id] } });
      drawListing(next);
      refreshSide();
    });
  }

  function messagesHtml(p) {
    const lastAds = [...p.messages].reverse().find((m) => m.kind === "ads");
    return p.messages.map((m) => {
      if (m.role === "agent") {
        const ph = m.data && m.data.photos ? `<div class="ph">${m.data.photos.slice(0, 8).map((id) => `<i style="background-image:url(${photoUrl(id, true)})"></i>`).join("")}</div>` : "";
        return `<div class="me">${ph}${esc(m.body)}</div>`;
      }
      const text = `<p>${esc(m.body)}</p>`;
      if (m.kind === "ads" && m === lastAds && p.ads.length) {
        return `<div class="hk">${text}<div class="vers">${p.ads.map((a) => `<button class="vc ${a.version === S.selected[p.listing.id] ? "sel" : ""}" data-pick="${a.version}">
          <canvas data-mini="${a.version}" width="1080" height="1350"></canvas><span><b>${a.version}</b> · ${esc(S.me.patterns[a.pattern]?.name || a.pattern)}</span></button>`).join("")}</div></div>`;
      }
      if (m.kind === "plan") {
        const d = m.data;
        return `<div class="hk">${text}<div class="plan"><div class="big">${money(d.budget)} over ${d.days} days</div>
          <div class="meta">${money(d.perDay)} a day · ${esc(d.audience.location)}, ${d.audience.radiusMiles} miles · Housing category</div>
          ${m.needs_action ? `<div class="acts"><button class="btn" data-confirm="${m.id}">Yes, run it</button><button class="link" data-fill="Run it with $300 over 14 days">Change the budget</button></div>` : ""}</div></div>`;
      }
      if (m.kind === "upgrade") {
        const asked = S.me.workspace.brand.upgrade_requested;
        return `<div class="hk">${text}<div class="acts"><button class="btn" data-upgrade ${asked ? "disabled" : ""}>${asked ? "Requested" : "Ask for the paid plan"}</button>
          <span class="small">${asked ? "You'll get an email when your seat is ready." : ""}</span></div></div>`;
      }
      if (m.kind === "check") return `<div class="hk"><div class="note-line">${esc(m.body)}<span class="small">A wording check, not legal advice.</span></div></div>`;
      if (m.kind === "lead") return `<div class="hk">${text}<a class="link" href="#/leads">Open leads</a></div>`;
      return `<div class="hk">${text}</div>`;
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

  function drawPreview() {
    const p = S.current, l = p.listing, pv = $("#pv");
    if (!pv) return;
    if (!p.ads.length) {
      pv.innerHTML = `<div class="pvh"><span class="small">Preview</span></div><div class="empty-pv">Your ads show up here.<span class="small">Add photos and the details in the chat.</span></div>`;
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
    const tabs = (cls) => `<div class="seg ${cls}">${p.ads.map((a) => `<button data-pick="${a.version}" class="${a.version === v ? "on" : ""}">${esc(S.me.patterns[a.pattern]?.name || "Version " + a.version)}</button>`).join("")}</div>`;
    const fmt = `<div class="seg"><button data-fmt="feed" class="${S.format === "feed" ? "on" : ""}" title="Feed" aria-label="Feed">${ICON.square.replace("<svg", '<svg width="15" height="15"')}</button><button data-fmt="story" class="${S.format === "story" ? "on" : ""}" title="Story" aria-label="Story">${ICON.tall.replace("<svg", '<svg width="15" height="15"')}</button></div>`;
    pv.innerHTML = `<div class="pvh">${tabs("")}${fmt}</div>
      <div class="pvh-m" style="display:none"></div>
      <div class="stage">${S.format === "feed" ? feed : story}</div>
      <div class="pvb">
        <div class="actrow"><button class="btn" data-act="run">Run it</button>${paid() ? `<button class="sec-btn" data-act="dlmenu">${ICON.down}Download</button>` : ""}</div>
        ${paid() ? "" : `<p class="small" style="text-align:center">Free plan: previews only.</p>`}
        <div class="status ${issues.length ? "bad" : ""}">${issues.length ? `${ICON.alert}<button data-act="issues">${issues.length} wording ${issues.length === 1 ? "issue" : "issues"} to look at</button>` : `${ICON.check}Fair housing check passed`}<span style="margin-left:auto"></span><button data-act="photos">${S.showPhotos ? "Hide photos" : "Change photo"}</button></div>
        ${issues.length && S.showIssues ? `<div class="issues">${issues.map((i) => `"${esc(i.term)}" ${esc(i.why)}${i.suggestion ? `. Try "${esc(i.suggestion)}"` : ""}.`).join("<br>")}</div>` : ""}
        ${S.showPhotos ? photoStrip(ad) : ""}
      </div>`;
    if (window.innerWidth <= 980) $(".pvh-m").outerHTML = `<div style="display:flex;justify-content:space-between;gap:8px;padding:12px 16px 0">${tabs("")}${fmt}</div>`;
    Creative.render($("#big"), renderOpts(ad, S.format));
    bindStrip();
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
    const { leads } = await api("/api/leads");
    const rows = leads.map((x) => `<tr><td><b>${esc(x.name)}</b><span class="small">${esc(WANTS[x.wants] || x.wants)}${x.note ? `: "${esc(x.note)}"` : ""}</span></td>
      <td>${esc(x.address || x.area || "Listing")}<span class="small">${x.version ? `${esc(S.me.patterns[x.pattern]?.name || "")} ad` : "Lead page"} · ${ago(x.created_at)}</span></td>
      <td>${x.phone ? `<a href="tel:${esc(x.phone)}">${esc(x.phone)}</a>` : ""}${x.email ? `<span class="small"><a href="mailto:${esc(x.email)}">${esc(x.email)}</a></span>` : ""}</td>
      <td><select data-lead="${x.id}">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${x.status === k ? "selected" : ""}>${v}</option>`).join("")}</select></td></tr>`).join("");
    main.innerHTML = `${mtop("Leads")}<div class="page"><div class="wrap"><div class="head"><h1>Leads</h1><p class="lede">Everyone who asked about a listing, and the ad that brought them.</p></div>
      ${leads.length ? `<div class="scroll-x"><table class="tbl"><thead><tr><th>Who</th><th>Listing</th><th>Contact</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>`
        : `<div class="empty"><b>No leads yet.</b>Every listing has a lead page where buyers ask for a showing. Leads land here and on your phone.</div>`}</div></div>`;
    $$("[data-lead]").forEach((s) => s.addEventListener("change", async () => {
      await api(`/api/leads/${s.dataset.lead}`, { method: "PATCH", body: { status: s.value } });
      toast("Saved");
    }));
  }

  // ---------- Monday report ----------

  async function viewReport() {
    const r = await api("/api/report");
    const pats = S.me.patterns;
    main.innerHTML = `${mtop("Report")}<div class="page"><div class="wrap">
      <p class="small">Last 7 days</p><div class="headline">${esc(r.headline)}</div>
      <div class="stats"><div class="stat"><span>Leads</span><b>${r.total}</b></div><div class="stat key"><span>Cost per lead</span><b>${r.cpl != null ? money(r.cpl) : "n/a"}</b></div>
        <div class="stat"><span>Asked for a showing</span><b>${r.showings}</b></div><div class="stat"><span>Spend</span><b>${money(r.spend)}</b></div></div>
      <h3>What I'd do next</h3><ul class="next">${r.next.length ? r.next.map((n) => `<li>${esc(n)}</li>`).join("") : "<li>Nothing to change this week.</li>"}</ul>
      <h3>By listing</h3>${r.listings.length ? `<div class="scroll-x"><table class="tbl"><thead><tr><th>Listing</th><th>Leads</th><th>Showings</th><th>Spend</th><th>Cost per lead</th></tr></thead><tbody>
        ${r.listings.map((x) => `<tr><td><a href="#/l/${x.id}"><b>${esc(x.name)}</b></a><span class="small">${Object.keys(x.byVersion).length ? Object.entries(x.byVersion).map(([v, n]) => `Version ${v}: ${n}`).join(", ") : x.running ? "Approved" : "Not running"}</span></td><td>${x.leads}</td><td>${x.showings}</td>
          <td><input type="number" min="0" step="1" value="${x.spend || ""}" placeholder="Add" data-spend="${x.id}" aria-label="Spend"></td><td>${x.cpl != null ? money(x.cpl) : `<span class="muted">n/a</span>`}</td></tr>`).join("")}</tbody></table></div>
        <p class="small" style="margin-top:10px">Spend fills in on its own once Meta is connected. Until then, type it in.</p>` : `<p class="small">No listings yet.</p>`}
      <h3>What's winning</h3>
      ${r.patterns.length ? `<table class="tbl"><thead><tr><th>Idea</th><th>Ads approved</th><th>Leads</th></tr></thead><tbody>${r.patterns.map((x) => `<tr><td><b>${esc(pats[x.pattern]?.name || x.pattern)}</b><span class="small">${esc(pats[x.pattern]?.why || "")}</span></td><td>${x.ads}</td><td>${x.leads || 0}</td></tr>`).join("")}</tbody></table>`
        : `<p class="small">Every ad you approve is recorded here with the leads it brought, so you can see which kind of ad wins for which kind of listing.</p>`}
    </div></div>`;
    $$("[data-spend]").forEach((i) => i.addEventListener("change", async () => {
      await api(`/api/listings/${i.dataset.spend}`, { method: "PATCH", body: { spend: Number(i.value) || 0 } });
      viewReport();
    }));
  }

  // ---------- Brand ----------

  const COUNTRIES = ["United States", "Canada", "Australia", "United Arab Emirates", "United Kingdom", "Ireland", "Somewhere else"];

  async function viewBrand() {
    const b = S.me.workspace.brand;
    const first = !b.setup_done;
    const field = (k, label, ph = "", hint = "") => `<div class="fld"><label for="f_${k}">${label}</label><input id="f_${k}" name="${k}" value="${esc(b[k] || "")}" placeholder="${esc(ph)}">${hint ? `<p class="small">${hint}</p>` : ""}</div>`;
    const radio = (k, opts) => `<div class="choice">${opts.map(([v, l]) => `<label><input type="radio" name="${k}" value="${v}" ${(b[k] || opts[0][0]) === v ? "checked" : ""}>${l}</label>`).join("")}</div>`;
    main.innerHTML = `${mtop("Brand")}<div class="page"><div class="wrap">
      <div class="head"><h1>${first ? "Set up your brand" : "Brand"}</h1><p class="lede">${first ? "One minute. Every ad follows it, so people start to recognize you." : "Every ad follows this."}</p></div>
      <div class="brandgrid"><form class="form" id="brandForm">
        <div class="group"><h4>Who you are</h4><div class="grid2">${field("business", "Business name", "Ellery Realty")}${field("agent_name", "Your name", "Sam Ellery")}${field("city", "Main city", "Austin")}${field("instagram", "Instagram", "@elleryrealty")}</div></div>
        <div class="group"><h4>How it looks</h4><div style="display:flex;flex-direction:column;gap:14px">
          <div class="colors"><label><input type="color" name="primary" value="${esc(b.primary || "#1F2A36")}">Main color</label><label><input type="color" name="accent" value="${esc(b.accent || "#C8A96A")}">Accent</label></div>
          <div class="logo-up"><i id="logoPrev" style="${b.logo_id ? `background-image:url(${photoUrl(b.logo_id)})` : ""}"></i><label class="sec-btn">Upload logo<input type="file" accept="image/png,image/jpeg,image/webp" hidden id="logoFile"></label>${b.logo_id ? `<button type="button" class="link" id="logoRm">Remove</button>` : ""}</div>
          ${radio("font", [["modern", "Modern"], ["classic", "Classic serif"]])}</div></div>
        <div class="group"><h4>How it sounds</h4>${radio("voice", [["plain", "Plain"], ["warm", "Warm"], ["premium", "Quiet luxury"]])}</div>
        <div class="group"><details class="more"><summary>More</summary><div class="inner">
          <div class="grid2">${field("phone", "Phone on lead pages", "(512) 555 0100")}<div class="fld"><label for="f_country">Country</label><select id="f_country" name="country">${COUNTRIES.map((c) => `<option ${b.country === c ? "selected" : ""}>${c}</option>`).join("")}</select></div></div>
          ${field("license", "License line", "DRE #01234567", "Small print on your lead pages, where your state asks for it.")}
          ${field("alerts_topic", "Lead alerts on your phone", "ellery-leads-4821", "Install the free ntfy app, subscribe to a name only you know, and type it here.")}
        </div></details></div>
        <div class="save"><button class="btn" type="submit">${first ? "Continue" : "Save"}</button><span class="err" id="brandErr"></span></div>
      </form><div class="brandprev"><canvas id="brandCanvas"></canvas><p class="small" style="margin-top:8px">A sample ad. Yours use your listing photos.</p></div></div></div></div>`;
    const form = $("#brandForm");
    let logoId = b.logo_id || "";
    const sample = () => {
      const brand = Object.fromEntries(new FormData(form).entries());
      brand.logo_id = logoId;
      const l = S.listings.find((x) => x.photo_id);
      Creative.render($("#brandCanvas"), {
        ad: { pattern: "life", overlay: "Slow mornings on the porch.", kicker: `Just listed · ${brand.city || "Riverside"}` },
        brand, format: "feed", photo: l ? photoUrl(l.photo_id) : null, logo: logoId ? photoUrl(logoId) : null, watermark: false,
      });
    };
    form.addEventListener("input", sample);
    sample();
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
        toast("Saved");
        if (first) location.hash = "#/today";
      } catch (err) {
        $("#brandErr").textContent = err.message;
      }
    });
  }

  // ---------- Admin ----------

  async function viewAdmin() {
    const { workspaces } = await api("/api/admin/workspaces");
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

  document.addEventListener("click", async (e) => {
    if (!e.target.closest("#pop") && !e.target.closest("[data-act=account],[data-act=listmenu],[data-act=dlmenu]")) closePop();
    const t = e.target.closest("[data-act],[data-pick],[data-fmt],[data-confirm],[data-fill],[data-upgrade],[data-copy],[data-dl],[data-use]");
    if (!t) return;
    if (t.closest("#pop")) closePop();
    const l = S.current && S.current.listing;
    const act = t.dataset.act;
    try {
      if (act === "menu") $("#shell").classList.toggle("menu");
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
      else if (act === "chat" || act === "ads") { $("#lv").classList.toggle("showpv", act === "ads"); $$(".mtop .seg button").forEach((b) => b.classList.toggle("on", b.dataset.act === act)); }
      else if (act === "more") { const ad = adFor(S.selected[l.id]); $("#cp").innerHTML = `<b>${esc(($("#cp b") || {}).textContent || "")}</b>${esc(ad.primary_text)}`; }
      else if (act === "photos") { S.showPhotos = !S.showPhotos; drawPreview(); }
      else if (act === "issues") { S.showIssues = !S.showIssues; drawPreview(); }
      else if (act === "remake") { toast("Making 3 new versions…"); drawListing(await api(`/api/listings/${l.id}/remake`, { body: {} })); refreshSide(); }
      else if (t.dataset.pick) {
        S.selected[l.id] = Number(t.dataset.pick);
        $$(".vc").forEach((c) => c.classList.toggle("sel", Number(c.dataset.pick) === S.selected[l.id]));
        drawPreview();
      } else if (t.dataset.fmt) { S.format = t.dataset.fmt; drawPreview(); }
      else if (act === "run") {
        t.disabled = true;
        const next = await api(`/api/listings/${l.id}/run`, { body: { versions: [1, 2, 3] } });
        $("#lv").classList.remove("showpv");
        drawListing(next);
        refreshSide();
      } else if (t.dataset.confirm) {
        t.disabled = true;
        drawListing(await api(`/api/listings/${l.id}/run`, { body: { confirm: t.dataset.confirm } }));
        refreshSide();
      } else if (t.dataset.fill) { const ta = $("#ta"); ta.value = t.dataset.fill; ta.focus(); }
      else if (t.dataset.upgrade !== undefined) {
        t.disabled = true;
        await api("/api/upgrade-request", { body: {} });
        await loadMe();
        t.textContent = "Requested";
        toast("Sent. You'll get an email when your seat is ready.");
      } else if (t.dataset.copy) { await navigator.clipboard.writeText(t.dataset.copy); toast(t.dataset.copied || "Link copied"); }
      else if (t.dataset.dl) await download(t.dataset.dl);
      else if (t.dataset.use) {
        const v = S.selected[l.id];
        const idx = S.current.photos.findIndex((p) => p.id === t.dataset.use);
        drawListing(await api(`/api/listings/${l.id}/messages`, { body: { text: `Use photo ${idx + 1} on version ${v}`, version: v } }), true);
      }
    } catch (err) {
      toast(err.message);
      t.disabled = false;
    }
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closePop(); });
  window.addEventListener("resize", closePop);
  $("#scrim").addEventListener("click", () => $("#shell").classList.remove("menu"));
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
