// The Hopkins app: one page, no build step. Views are drawn from template strings; every
// value from the server goes through esc() before it reaches the page.
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const main = $("#main");
  const MARK = '<img class="m" src="/static/mark.svg" alt="">';
  const ICON = {
    menu: '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    send: '<svg viewBox="0 0 24 24"><path d="M12 19V5M5.5 11.5 12 5l6.5 6.5"/></svg>',
    photo: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="m21 16-5-5-8 8"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    link: '<svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
    down: '<svg viewBox="0 0 24 24"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
    heart: '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
    bubble: '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 20 12z"/></svg>',
    plane: '<svg viewBox="0 0 24 24"><path d="M21 4 3 11l7 2 2 7z"/></svg>',
    eye: '<svg viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  };
  const S = { me: null, listings: [], inbox: [], current: null, selected: {}, format: "feed", pending: [], busy: false };

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
    return `<div class="mtop"><button data-act="menu" aria-label="Menu">${ICON.menu}</button><img src="/static/mark.svg" alt=""><span class="ttl">${esc(title)}</span>${extra}</div>`;
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

  // ---------- frame ----------

  async function loadMe() {
    S.me = await api("/api/me");
    $("#adminNav").classList.toggle("hidden", !S.me.admin);
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
          <div style="min-width:0">${esc(listingName(l))}<span>${esc(sideLine(l))}</span></div>${l.waiting ? '<i class="dotw" title="Waiting on you"></i>' : ""}</a>`).join("")
      : `<div class="empty-side">Your listings show up here.</div>`;
    const u = S.me.usage;
    $("#planbox").innerHTML = paid()
      ? `<b>Paid plan</b>Billing starts when your first ad goes live.`
      : `<b>Free plan</b><div class="meter"><i style="width:${Math.min(100, (u.adsMade / u.freeLimit) * 100)}%"></i></div>${Math.min(u.adsMade, u.freeLimit)} of ${u.freeLimit} free ads made. Previews only.`;
    const name = S.me.user.name || S.me.user.email;
    $("#team").innerHTML = `<div class="av">${esc(name.slice(0, 2))}</div><div style="min-width:0">${esc(S.me.workspace.name)}<span>${esc(S.me.user.email)}</span></div><button data-act="logout">Sign out</button>`;
  }

  function sideLine(l) {
    if (l.status === "sold") return "Sold";
    if (l.approved) return `Approved${l.leads ? ` · ${l.leads} ${l.leads === 1 ? "lead" : "leads"}` : ""}`;
    if (l.waiting) return "Ads ready";
    return l.price ? money(l.price) : "Drafts";
  }

  // ---------- routing ----------

  async function route() {
    $("#shell").classList.remove("menu");
    const [view, id] = location.hash.slice(2).split("/");
    try {
      if (!S.me.workspace.brand.setup_done && view !== "brand" && !S.me.workspace.brand.skipped) { location.hash = "#/brand"; return; }
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
    const greet = h < 12 ? "Morning" : h < 18 ? "Afternoon" : "Evening";
    const waiting = S.inbox.filter((m) => m.needs_action);
    const recent = S.inbox.filter((m) => !m.needs_action);
    const thumbFor = (m) => {
      const l = S.listings.find((x) => x.id === m.listing_id);
      return l && l.photo_id ? `background-image:url(${photoUrl(l.photo_id, true)})` : "";
    };
    const titleFor = (m) => {
      const where = m.address || m.area || m.city || "your listing";
      if (m.kind === "ads") return `Ads ready for ${where}`;
      if (m.kind === "plan") return `A run plan for ${where} needs your yes`;
      if (m.kind === "lead") return `New lead · ${where}`;
      if (m.kind === "report") return "Your Monday report";
      return where;
    };
    const item = (m) => `<a class="item" href="${m.kind === "report" ? "#/report" : `#/l/${m.listing_id}`}"><i class="th" style="${thumbFor(m)}"></i>
      <div class="tx"><b>${esc(titleFor(m))}</b><p>${esc(m.body)}</p></div><span class="when">${ago(m.created_at)}</span></a>`;

    let body;
    if (!S.listings.length) {
      const brandDone = S.me.workspace.brand.setup_done;
      body = `<div class="steps">
        <div class="step ${brandDone ? "done" : ""}"><span class="n">${brandDone ? "✓" : "1"}</span><b>Your brand</b><p>Colors, logo and voice. Every ad follows them.</p><a class="ghost" href="#/brand">${brandDone ? "Change it" : "Set it up"}</a></div>
        <div class="step"><span class="n">2</span><b>Your first listing</b><p>Photos and the link or the description. I make 3 ads from it.</p><a class="btn" href="#/new">Send a listing</a></div>
        <div class="step"><span class="n">3</span><b>Your yes</b><p>You see the plan first. Nothing runs until you say so.</p></div></div>`;
    } else {
      body = `${waiting.length ? `<div class="sec" style="margin-bottom:10px">Waiting on you</div><div class="items">${waiting.map(item).join("")}</div>` : `<div class="items"><div class="item"><div class="tx"><b>Nothing needs you right now.</b><p>When a listing comes in, a price changes or a lead arrives, I'll have it ready here.</p></div><a class="btn" href="#/new">New listing</a></div></div>`}
        ${recent.length ? `<div class="sec" style="margin:26px 0 10px">This week</div><div class="items">${recent.map(item).join("")}</div>` : ""}`;
    }
    main.innerHTML = `${mtop("Today")}<div class="page"><div class="hello"><img src="/static/mark.svg" alt=""><div><h1>${greet}${first ? `, ${esc(first)}` : ""}.</h1>
      <p class="lede" style="margin:4px 0 0">${waiting.length ? `${waiting.length} ${waiting.length === 1 ? "thing needs" : "things need"} you.` : S.listings.length ? "Here's your week." : "Three steps and your first ads are ready."}</p></div></div>${body}</div>`;
  }

  // ---------- the composer (shared) ----------

  function composerHtml(placeholder) {
    return `<form class="comp" id="comp"><div class="att" id="att"></div>
      <textarea id="ta" rows="1" placeholder="${esc(placeholder)}"></textarea>
      <div class="cb"><label>${ICON.photo}<span>Photos</span><input type="file" id="files" accept="image/*" multiple hidden></label>
      <span class="hint" id="hint"></span><button class="send" id="send" type="submit" aria-label="Send">${ICON.send}</button></div></form>`;
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
    setTimeout(() => ta.focus(), 50);
  }

  function showTyping(text) {
    const msgs = $("#msgs");
    if (!msgs) return;
    if (text) msgs.insertAdjacentHTML("beforeend", `<div class="me">${esc(text)}</div>`);
    msgs.insertAdjacentHTML("beforeend", `<div class="hk" id="typing">${MARK}<div class="t"><span class="typing"><i></i><i></i><i></i></span></div></div>`);
    msgs.scrollTop = msgs.scrollHeight;
  }

  // ---------- a new listing ----------

  function viewNew() {
    main.innerHTML = `${mtop("New listing")}<section class="chat"><div class="ch"><h2>New listing</h2></div>
      <div class="msgs" id="msgs"><div class="hk">${MARK}<div class="t"><p>Send me the listing. Drop the photos in, then paste the link or the description: the price, beds and baths, and the best thing about the home.</p>
      <p class="small" style="margin-top:8px">I'll make 3 different ads from it, with previews. Nothing runs until you say yes.</p></div></div></div>
      ${composerHtml("Paste a link or describe the home")}</section>`;
    bindComposer(async (text, files) => {
      const shown = text || `${files.length} ${files.length === 1 ? "photo" : "photos"}`;
      showTyping(shown);
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
    const momentPill = l.status === "sold" ? `<span class="pill green">Sold</span>` : `<span class="pill ${l.moment === "new" ? "" : "gold"}">${esc(S.me.moments[l.moment] || "Just listed")}</span>`;
    main.innerHTML = `${mtop(listingName(l), `<button class="ghost ptab" data-act="ptab">Preview</button>`)}<div class="lv" id="lv">
      <section class="chat"><div class="ch"><div style="min-width:0"><h2>${esc(listingName(l))}</h2><div class="sub">${esc([l.priceText, l.facts].filter(Boolean).join(" · ") || "Details still to come")}</div></div>${momentPill}
        <div class="r"><a class="ghost" href="/l/${esc(l.slug)}" target="_blank" rel="noopener">${ICON.eye}Lead page</a></div></div>
        <div class="msgs" id="msgs">${messagesHtml(p)}</div>${composerHtml(p.ads.length ? `Tell me what to change on version ${S.selected[l.id]}` : "Tell me about the home")}</section>
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
          toast(`Added ${files.length} ${files.length === 1 ? "photo" : "photos"}. Pick one under the preview to use it.`);
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
        const ph = m.data && m.data.photos ? `<div class="grid6">${m.data.photos.slice(0, 6).map((id) => `<i style="background-image:url(${photoUrl(id, true)})"></i>`).join("")}</div>` : "";
        return `<div class="me">${ph}${esc(m.body)}</div>`;
      }
      let extra = "";
      if (m.kind === "ads" && m === lastAds && p.ads.length) {
        extra = `<div class="vers">${p.ads.map((a) => `<button class="vc ${a.version === S.selected[p.listing.id] ? "sel" : ""}" data-pick="${a.version}"><canvas data-mini="${a.version}" width="1080" height="1350"></canvas>
          <div class="b"><div class="k">Version ${a.version}<em>${esc(S.me.patterns[a.pattern]?.name || a.pattern)}</em></div><div class="h">${esc(a.headline)}</div></div></button>`).join("")}</div>`;
      } else if (m.kind === "plan") {
        const d = m.data;
        extra = `<div class="card"><div class="row"><span>Budget</span><b>${money(d.budget)} over ${d.days} days</b></div>
          <div class="row"><span>Per day</span><b>${money(d.perDay)}</b></div>
          <div class="row"><span>Versions</span><b>${d.versions.join(", ")}</b></div>
          <div class="row"><span>Where</span><b>${esc(d.audience.location)}, ${d.audience.radiusMiles} mile radius</b></div>
          <div class="row"><span>Category</span><b>Housing (no age, gender or ZIP targeting)</b></div>
          <div class="row"><span>Placements</span><b>${esc(d.audience.placements)}</b></div>
          ${m.needs_action ? `<div class="acts"><button class="btn" data-confirm="${m.id}">Yes, run it</button><button class="ghost" data-fill="Run it with $300 over 14 days">Change the budget</button></div>` : `<p class="small" style="margin-top:8px">Answered.</p>`}</div>`;
      } else if (m.kind === "upgrade") {
        const asked = S.me.workspace.brand.upgrade_requested;
        extra = `<div class="card"><div class="row"><span>Hopkins</span><b>From $${S.me.usage.priceFrom} a month</b></div>
          <div class="row"><span>Billing starts</span><b>When your first ad goes live</b></div>
          <div class="row"><span>Ad spend</span><b>Yours, no cut taken</b></div>
          <div class="acts"><button class="btn" data-upgrade ${asked ? "disabled" : ""}>${asked ? "Requested" : "Ask for the paid plan"}</button></div>
          <p class="small" style="margin-top:8px">${asked ? "You'll get an email when your seat is ready." : "Paid seats are opening to early access teams first."}</p></div>`;
      } else if (m.kind === "check") {
        extra = "";
        return `<div class="hk">${MARK}<div class="t"><div class="card warn" style="margin-top:0"><p>${esc(m.body)}</p><p class="small" style="margin-top:6px">A wording check against fair housing rules, not legal advice.</p></div></div></div>`;
      } else if (m.kind === "lead") {
        return `<div class="hk">${MARK}<div class="t"><div class="card lead" style="margin-top:0"><p>${esc(m.body)}</p><div class="acts"><a class="ghost" href="#/leads">Open leads</a></div></div></div></div>`;
      }
      return `<div class="hk">${MARK}<div class="t"><p>${esc(m.body)}</p>${extra}</div></div>`;
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
      pv.innerHTML = `<div class="pvh">Preview</div><div class="center-empty" style="padding:30px">The ads show up here once I've made them.</div>${photoStrip(null)}`;
      bindStrip(null);
      return;
    }
    const v = S.selected[l.id];
    const ad = adFor(v) || p.ads[0];
    const b = S.me.workspace.brand;
    const handle = (b.instagram || b.business || "your.brand").replace(/^@/, "").toLowerCase().replace(/\s+/g, "");
    const ava = b.logo_id ? `style="background-image:url(${photoUrl(b.logo_id)});background-color:#fff;background-size:contain;background-repeat:no-repeat"` : `style="background:${esc(b.primary || "#1F2A36")}"`;
    const link = `${location.origin}/l/${l.slug}?v=${ad.id}`;
    const issues = ad.issues || [];
    const feed = `<div class="igc"><div class="h"><i class="ava" ${ava}></i><div>${esc(handle)}<span>Sponsored</span></div></div><canvas id="big" width="1080" height="1350"></canvas>
      <div class="cta"><span>${esc(ad.cta)}</span><span>›</span></div><div class="icons">${ICON.heart}${ICON.bubble}${ICON.plane}</div>
      <div class="cp" id="cp"><b>${esc(handle)}</b>${esc(ad.primary_text.length > 125 ? ad.primary_text.slice(0, 125).replace(/\s\S*$/, "") : ad.primary_text)}${ad.primary_text.length > 125 ? '<span class="more" data-act="more">… more</span>' : ""}</div></div>`;
    const story = `<div class="story"><canvas id="big" width="1080" height="1920"></canvas><div class="bar"><i></i></div><div class="who"><i class="ava" ${ava} style="width:24px;height:24px;border-radius:50%;display:inline-block"></i>${esc(handle)} <span>Sponsored</span></div><div class="go">${esc(ad.cta)}</div></div>`;
    pv.innerHTML = `<div class="pvh">Preview<div class="seg"><button data-fmt="feed" class="${S.format === "feed" ? "on" : ""}">Feed</button><button data-fmt="story" class="${S.format === "story" ? "on" : ""}">Story</button></div></div>
      <div class="vtabs">${p.ads.map((a) => `<button data-pick="${a.version}" class="${a.version === v ? "on" : ""}"><b>Version ${a.version}</b>${esc(S.me.patterns[a.pattern]?.name || "")}</button>`).join("")}</div>
      <div class="stage">${S.format === "feed" ? feed : story}</div>
      <div class="pvb">
        <div class="chk ${issues.length ? "bad" : ""}"><i class="dot"></i><div>${issues.length ? `Wording to look at: ${issues.map((i) => `"${esc(i.term)}" ${esc(i.why)}`).join("; ")}.` : "Fair housing wording check passed. Runs in Meta's Housing category: no age, gender or ZIP targeting."}</div></div>
        <button class="btn big" data-act="run">Run it</button>
        <div style="display:flex;gap:8px">${paid()
          ? `<button class="ghost" data-dl="feed">${ICON.down}Feed image</button><button class="ghost" data-dl="story">${ICON.down}Story image</button>`
          : `<span class="small">Previews only on the free plan. Downloads and running come with the paid plan.</span>`}</div>
        <div class="sec">Where the ad sends people</div>
        <div class="linkrow"><code>${esc(link)}</code><button class="ghost" data-copy="${esc(link)}">${ICON.link}Copy</button></div>
        <div class="sec">Photo for version ${ad.version}</div>
        ${photoStrip(ad)}
        <p class="small">${esc(S.me.patterns[ad.pattern]?.why || "")} Revision ${ad.revision}.</p>
      </div>`;
    Creative.render($("#big"), renderOpts(ad, S.format));
    bindStrip(ad);
  }

  function photoStrip(ad) {
    const photos = S.current.photos;
    const labels = S.me.photoLabels;
    return `<div class="strip">${photos.map((ph) => `<div class="p ${ad && ad.photo_id === ph.id ? "on" : ""}"><i data-use="${ph.id}" style="background-image:url(${photoUrl(ph.id, true)})" title="Use this photo"></i>
      <select data-label="${ph.id}"><option value="">Label</option>${labels.map((x) => `<option ${ph.label === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>`).join("")}
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
  const WANTS = { showing: "A showing", info: "A question", offer: "Talk about an offer" };

  async function viewLeads() {
    const { leads } = await api("/api/leads");
    const rows = leads.map((x) => `<tr><td><b>${esc(x.name)}</b><span class="small">${ago(x.created_at)}</span></td>
      <td>${esc(x.address || x.area || "Listing")}</td><td><span class="tag ${x.wants === "showing" ? "" : "plum"}">${esc(WANTS[x.wants] || x.wants)}</span>${x.note ? `<span class="small" style="max-width:240px">"${esc(x.note)}"</span>` : ""}</td>
      <td>${x.phone ? `<a href="tel:${esc(x.phone)}"><b>${esc(x.phone)}</b></a>` : ""}${x.email ? `<span class="small"><a href="mailto:${esc(x.email)}">${esc(x.email)}</a></span>` : ""}</td>
      <td>${x.version ? `Version ${x.version}<span class="small">${esc(S.me.patterns[x.pattern]?.name || "")}</span>` : `<span class="small">Lead page</span>`}</td>
      <td><select data-lead="${x.id}">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${x.status === k ? "selected" : ""}>${v}</option>`).join("")}</select></td></tr>`).join("");
    main.innerHTML = `${mtop("Leads")}<div class="page"><div class="wrap"><h1>Leads</h1><p class="lede">Everyone who asked about a listing, newest first, with the ad version that brought them in.</p>
      ${leads.length ? `<div class="scroll-x"><table class="tbl"><thead><tr><th>Who</th><th>Listing</th><th>Wants</th><th>Contact</th><th>From</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>`
        : `<div class="item"><div class="tx"><b>No leads yet.</b><p>Each listing has a lead page where buyers ask for a showing. Once ads run they send people there, and leads land here and on your phone.</p></div></div>`}</div></div>`;
    $$("[data-lead]").forEach((s) => s.addEventListener("change", async () => {
      await api(`/api/leads/${s.dataset.lead}`, { method: "PATCH", body: { status: s.value } });
      toast("Saved");
    }));
  }

  // ---------- Monday report ----------

  async function viewReport() {
    const r = await api("/api/report");
    const pats = S.me.patterns;
    main.innerHTML = `${mtop("Monday report")}<div class="page"><div class="wrap">
      <div class="sec">The last 7 days</div><div class="big-head" style="margin-top:6px">${esc(r.headline)}</div>
      <div class="tiles"><div class="tile"><span>Leads</span><b>${r.total}</b></div>
        <div class="tile key"><span>Cost per lead</span><b>${r.cpl != null ? money(r.cpl) : "n/a"}</b><small>${r.spend > 0 ? "" : "Add what you spent below"}</small></div>
        <div class="tile"><span>Asked for a showing</span><b>${r.showings}</b></div><div class="tile"><span>Spend</span><b>${money(r.spend)}</b></div></div>
      <h3>What I'd do next</h3><ul class="next">${r.next.length ? r.next.map((n) => `<li>${esc(n)}</li>`).join("") : "<li>Nothing to change this week.</li>"}</ul>
      <h3>By listing</h3>${r.listings.length ? `<div class="scroll-x"><table class="tbl"><thead><tr><th>Listing</th><th>Leads</th><th>Showings</th><th>Spend</th><th>Cost per lead</th><th>By version</th></tr></thead><tbody>
        ${r.listings.map((x) => `<tr><td><a href="#/l/${x.id}"><b>${esc(x.name)}</b></a><span class="small">${x.running ? "Approved" : x.drafts ? "Drafts" : x.status}</span></td><td>${x.leads}</td><td>${x.showings}</td>
          <td><input type="number" min="0" step="1" value="${x.spend || ""}" placeholder="0" data-spend="${x.id}"></td><td>${x.cpl != null ? `<b>${money(x.cpl)}</b>` : `<span class="small">n/a</span>`}</td>
          <td>${Object.keys(x.byVersion).length ? Object.entries(x.byVersion).map(([v, n]) => `V${v}: ${n}`).join(", ") : `<span class="small">None yet</span>`}</td></tr>`).join("")}</tbody></table></div>
        <p class="small" style="margin-top:8px">Spend comes in on its own once your Meta ad account is connected. Until then, type what you spent and the cost per lead works it out.</p>` : `<p class="small">No listings yet.</p>`}
      <h3>What's winning so far</h3><p class="small" style="margin-bottom:10px">Every ad you approve goes into your testing record: the kind of listing, the city, the idea behind the ad, and the leads it brought. Over time this shows which kind of ad wins for which kind of listing.</p>
      ${r.patterns.length ? `<table class="tbl"><thead><tr><th>Idea</th><th>Ads approved</th><th>Leads</th></tr></thead><tbody>${r.patterns.map((x) => `<tr><td><b>${esc(pats[x.pattern]?.name || x.pattern)}</b><span class="small">${esc(pats[x.pattern]?.why || "")}</span></td><td>${x.ads}</td><td>${x.leads || 0}</td></tr>`).join("")}</tbody></table>`
        : `<div class="item"><div class="tx"><b>Nothing recorded yet.</b><p>The record starts with your first yes.</p></div></div>`}
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
    const field = (k, label, ph = "", hint = "", type = "text") => `<div class="fld"><label for="f_${k}">${label}</label><input id="f_${k}" name="${k}" type="${type}" value="${esc(b[k] || "")}" placeholder="${esc(ph)}">${hint ? `<p class="small">${hint}</p>` : ""}</div>`;
    const radio = (k, opts) => `<div class="choice">${opts.map(([v, l]) => `<label><input type="radio" name="${k}" value="${v}" ${(b[k] || opts[0][0]) === v ? "checked" : ""}>${l}</label>`).join("")}</div>`;
    main.innerHTML = `${mtop("Brand")}<div class="page"><div class="wrap">
      <h1>${first ? "First, your brand." : "Your brand"}</h1><p class="lede">${first ? "One minute. Every ad I make follows it, every time, so people start to recognize you." : "Every ad follows this. Change it and the previews update."}</p>
      <div class="brandgrid"><form class="form" id="brandForm">
        ${field("business", "Business name", "Ellery Realty")}${field("agent_name", "Your name, as it goes on ads", "Sam Ellery")}
        ${field("city", "Main city", "Austin")}<div class="fld"><label for="f_country">Country</label><select id="f_country" name="country">${COUNTRIES.map((c) => `<option ${b.country === c ? "selected" : ""}>${c}</option>`).join("")}</select></div>
        ${field("phone", "Phone on your lead pages", "(512) 555 0100")}${field("instagram", "Instagram handle", "@elleryrealty")}
        <div class="fld full"><label>Colors</label><div class="colors"><label><input type="color" name="primary" value="${esc(b.primary || "#1F2A36")}">Main</label><label><input type="color" name="accent" value="${esc(b.accent || "#C8A96A")}">Accent</label></div></div>
        <div class="fld full"><label>Logo</label><div class="logo-up"><i id="logoPrev" style="${b.logo_id ? `background-image:url(${photoUrl(b.logo_id)})` : ""}"></i><label class="ghost">Upload<input type="file" accept="image/png,image/jpeg,image/webp" hidden id="logoFile"></label>${b.logo_id ? `<button type="button" class="ghost" id="logoRm">Remove</button>` : ""}</div><p class="small">A PNG with a clear background works best.</p></div>
        <div class="fld full"><label>Type</label>${radio("font", [["modern", "Modern (bold sans)"], ["classic", "Classic (serif)"]])}</div>
        <div class="fld full"><label>Voice</label>${radio("voice", [["plain", "Plain and direct"], ["warm", "Warm and friendly"], ["premium", "Quiet luxury"]])}</div>
        ${field("license", "License line (optional)", "DRE #01234567", "Shown in small print on your lead pages, where your state asks for it.")}
        <div class="fld full"><label for="f_alerts_topic">Lead alerts on your phone</label><input id="f_alerts_topic" name="alerts_topic" value="${esc(b.alerts_topic || "")}" placeholder="ellery-leads-4821">
          <p class="small">Install the free ntfy app, subscribe to a name only you know, and type the same name here. New leads reach your phone within seconds. Contact details stay in Hopkins.</p></div>
        <div class="full" style="display:flex;gap:10px;align-items:center"><button class="btn" type="submit">${first ? "Save and continue" : "Save"}</button><span class="err" id="brandErr"></span></div>
      </form><div class="brandprev"><div class="sec" style="margin-bottom:8px">How your ads look</div><canvas id="brandCanvas"></canvas><p class="small" style="margin-top:8px">A sample. Your real ads use your listing photos.</p></div></div></div></div>`;
    const form = $("#brandForm");
    let logoId = b.logo_id || "";
    const sample = () => {
      const fd = new FormData(form);
      const brand = Object.fromEntries(fd.entries());
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
    main.innerHTML = `${mtop("Admin")}<div class="page"><div class="wrap"><h1>Workspaces</h1><p class="lede">Every account. Switch a workspace to paid once they've agreed the price.</p>
      <div class="scroll-x"><table class="tbl"><thead><tr><th>Workspace</th><th>Signed up</th><th>Listings</th><th>Ads</th><th>Leads</th><th>Asked to upgrade</th><th>Plan</th></tr></thead><tbody>
      ${workspaces.map((w) => `<tr><td><b>${esc(w.name)}</b><span class="small">${esc(w.emails || "")}</span></td><td>${ago(w.created_at)}</td><td>${w.listings}</td><td>${w.ads}</td><td>${w.leads}</td>
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

  document.addEventListener("click", async (e) => {
    const t = e.target.closest("[data-act],[data-pick],[data-fmt],[data-confirm],[data-fill],[data-upgrade],[data-copy],[data-dl],[data-use]");
    if (!t) return;
    const l = S.current && S.current.listing;
    try {
      if (t.dataset.act === "menu") $("#shell").classList.toggle("menu");
      else if (t.dataset.act === "logout") { await api("/api/logout", { body: {} }); location.href = "/login"; }
      else if (t.dataset.act === "ptab") { $("#lv").classList.toggle("showpv"); t.textContent = $("#lv").classList.contains("showpv") ? "Chat" : "Preview"; }
      else if (t.dataset.act === "more") { const ad = adFor(S.selected[l.id]); $("#cp").innerHTML = `<b>${esc(($("#cp b") || {}).textContent || "")}</b>${esc(ad.primary_text)}`; }
      else if (t.dataset.pick) {
        S.selected[l.id] = Number(t.dataset.pick);
        $$(".vc").forEach((c) => c.classList.toggle("sel", Number(c.dataset.pick) === S.selected[l.id]));
        $("#ta").placeholder = `Tell me what to change on version ${S.selected[l.id]}`;
        drawPreview();
      } else if (t.dataset.fmt) { S.format = t.dataset.fmt; drawPreview(); }
      else if (t.dataset.act === "run") {
        t.disabled = true;
        const next = await api(`/api/listings/${l.id}/run`, { body: { versions: [1, 2, 3] } });
        drawListing(next);
        $("#lv").classList.remove("showpv");
        refreshSide();
      } else if (t.dataset.confirm) {
        t.disabled = true;
        const next = await api(`/api/listings/${l.id}/run`, { body: { confirm: t.dataset.confirm } });
        drawListing(next);
        refreshSide();
      } else if (t.dataset.fill) { const ta = $("#ta"); ta.value = t.dataset.fill; ta.focus(); }
      else if (t.dataset.upgrade !== undefined) {
        t.disabled = true;
        await api("/api/upgrade-request", { body: {} });
        await loadMe();
        t.textContent = "Requested";
        toast("Sent. You'll get an email when your seat is ready.");
      } else if (t.dataset.copy) { await navigator.clipboard.writeText(t.dataset.copy); toast("Link copied"); }
      else if (t.dataset.dl) {
        const ad = adFor(S.selected[l.id]);
        const c = document.createElement("canvas");
        await Creative.render(c, renderOpts(ad, t.dataset.dl));
        c.toBlob((blob) => {
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `${l.slug}-v${ad.version}-${t.dataset.dl}.png`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        }, "image/png");
      } else if (t.dataset.use) {
        const v = S.selected[l.id];
        const idx = S.current.photos.findIndex((p) => p.id === t.dataset.use);
        showTyping(`Use photo ${idx + 1} on version ${v}`);
        const next = await api(`/api/listings/${l.id}/messages`, { body: { text: `Use photo ${idx + 1} on version ${v}`, version: v } });
        drawListing(next);
      }
    } catch (err) {
      toast(err.message);
      t.disabled = false;
    }
  });
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
