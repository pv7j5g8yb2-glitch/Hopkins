// The Hopkins app: one page, no build step. Views are drawn from template strings; every
// value from the server goes through esc() before it reaches the page.
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const main = $("#main");
  // The mark inline (not an <img>) so its two pebbles can move: they spin and take turns while
  // Hopkins thinks, and the gold one rises into place when the reply lands, like the old
  // landing page demo.
  const MARK = (cls = "") => `<svg class="m mk ${cls}" viewBox="0 0 120 120" aria-hidden="true"><path d="M55.9 85.8C54.8 88.1 52.2 89.9 49.9 91.2C47.6 92.6 44.8 93.5 42.1 93.9C39.4 94.4 35.9 94.8 33.4 93.7C31.0 92.6 29.1 89.4 27.5 87.3C25.9 85.2 25.4 83.2 24.0 81.0C22.7 78.9 20.2 76.8 19.5 74.3C18.7 71.8 18.8 68.5 19.6 66.0C20.5 63.4 22.3 60.3 24.6 58.9C27.0 57.4 30.9 57.0 33.8 57.5C36.6 57.9 39.2 60.5 41.7 61.7C44.1 62.9 46.4 63.2 48.6 64.6C50.7 66.0 53.2 67.9 54.5 70.0C55.9 72.2 56.2 75.1 56.4 77.7C56.7 80.3 57.0 83.5 55.9 85.8Z" fill="url(#hpk-sun)"/><path d="M97.0 31.0C98.4 33.8 99.0 36.2 100.4 39.5C101.7 42.7 105.3 46.7 105.1 50.5C104.9 54.3 102.0 59.3 99.0 62.3C95.9 65.2 90.8 67.3 86.7 68.2C82.7 69.1 78.3 68.5 74.7 67.7C71.2 67.0 68.2 65.4 65.3 63.8C62.4 62.2 59.8 60.5 57.4 58.1C55.1 55.7 51.8 52.7 51.2 49.4C50.7 46.1 52.8 41.9 54.1 38.3C55.4 34.7 56.8 30.9 59.3 27.7C61.7 24.4 65.2 20.5 68.9 18.8C72.7 17.1 77.8 16.8 81.6 17.5C85.4 18.1 89.2 20.3 91.7 22.6C94.3 24.8 95.5 28.2 97.0 31.0Z" fill="url(#hpk-sun)"/></svg>`;

  const ICON = {
    menu: '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    send: '<svg viewBox="0 0 24 24"><path d="M12 19V5M5.5 11.5 12 5l6.5 6.5"/></svg>',
    stop: '<svg viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="2.6" fill="currentColor" stroke="none"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M9 6v12M15 6v12"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z"/></svg>',
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
    trash: '<svg viewBox="0 0 24 24"><path d="M5 7h14M10 7V5h4v2M7 7l1 12.5h8L17 7M10.5 11v5M13.5 11v5"/></svg>',
    flag: '<svg viewBox="0 0 24 24"><path d="M6 21V4M6 5h10l-2 3.5 2 3.5H6"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7 7 17"/></svg>',
    pen: '<svg viewBox="0 0 24 24"><path d="M5 19h3.5L19 8.5 15.5 5 5 15.5V19zM13.5 7l3.5 3.5"/></svg>',
    chevR: '<svg viewBox="0 0 24 24"><path d="m10 6.5 5.5 5.5-5.5 5.5"/></svg>',
    chev: '<svg class="chev" viewBox="0 0 24 24"><path d="m8 10 4-4 4 4M8 14l4 4 4-4"/></svg>',
    square: '<svg viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="16" rx="2.5"/></svg>',
    tall: '<svg viewBox="0 0 24 24"><rect x="7" y="2.5" width="10" height="19" rx="2.5"/></svg>',
    brush: '<svg viewBox="0 0 24 24"><circle cx="8" cy="9" r="1.5"/><circle cx="15" cy="8" r="1.5"/><path d="M12 21a9 9 0 1 1 9-9c0 2.5-2 3-3.5 3H15a2 2 0 0 0-1.5 3.3A2 2 0 0 1 12 21z"/></svg>',
    shield: '<svg viewBox="0 0 24 24"><path d="M12 3l8 4v5c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V7z"/></svg>',
    out: '<svg viewBox="0 0 24 24"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"/></svg>',
    gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    chevr: '<svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg>',
    up: '<svg viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 8-8M15 7h6v6"/></svg>',
    down: '<svg viewBox="0 0 24 24"><path d="M3 7l6 6 4-4 8 8M15 17h6v-6"/></svg>',
    phone: '<svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z"/></svg>',
    msg: '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 20 12z"/></svg>',
    mail: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/></svg>',
    spark: '<svg viewBox="0 0 24 24"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>',
    people: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c1.2-3.6 3.8-5.5 7-5.5s5.8 1.9 7 5.5"/></svg>',
    chart: '<svg viewBox="0 0 24 24"><path d="M5 20V11M12 20V5M19 20v-6"/></svg>',
  };
  const S = { me: null, listings: [], inbox: [], current: null, selected: {}, selecting: false, picked: new Set(), snaps: {}, snapImg: {}, snapQueue: Promise.resolve(), segPos: {}, styleAll: false, format: "feed", pending: [], busy: false, showIssues: false, seen: {}, fresh: null, chatCache: new Map(), leadsCache: null };

  // ---------- helpers ----------

  // The phone's own time zone: the server starts the agent's Monday at their midnight.
  const TZ = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; } })();
  async function api(path, opts = {}) {
    const method = opts.method || (opts.body ? "POST" : "GET");
    let res;
    // While Render swaps in a new version (every push) requests can fail for a minute. Reading is
    // safe to repeat, so a GET quietly tries again a couple of times before giving up.
    for (let attempt = 0; ; attempt++) {
      try {
        // keepalive: a message being sent still reaches the server if the page closes meanwhile.
        res = await fetch(path, { method, signal: opts.signal, keepalive: Boolean(opts.keepalive), headers: { ...(opts.body ? { "Content-Type": "application/json" } : {}), "X-Time-Zone": TZ }, body: opts.body ? JSON.stringify(opts.body) : undefined });
      } catch (err) {
        if (opts.signal?.aborted) throw Object.assign(new Error("Stopped"), { stopped: true });
        if (method === "GET" && attempt < 2) { await new Promise((r) => setTimeout(r, 1500)); continue; }
        throw Object.assign(new Error("No connection. Try again."), { offline: true });
      }
      if (res.status >= 502 && res.status <= 504 && method === "GET" && attempt < 2) { await new Promise((r) => setTimeout(r, 1500)); continue; }
      break;
    }
    if (res.status >= 502 && res.status <= 504) throw new Error("Hopkins is updating. Try again in a moment.");
    if (res.status === 401) { location.href = "/login"; throw new Error("signed out"); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
    return data;
  }

  // Notices ("Saved", "Listing deleted", every one of them) drop in from the top like a phone
  // notification and glide back up after a few seconds. They follow the finger: swipe up to send
  // one away early; pulled down, they stretch a little and spring back. Holding one keeps it.
  let toastTimer;
  const TOAST_MS = 3200;
  function toast(msg) {
    const t = $("#toast");
    if (!t.querySelector(".tmsg")) t.innerHTML = `<span class="tmsg"></span>`;
    const was = t.classList.contains("on");
    t.querySelector(".tmsg").textContent = msg;
    t.style.transform = "";
    t.classList.remove("bump");
    if (was) { void t.offsetWidth; t.classList.add("bump"); }
    t.classList.add("on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, TOAST_MS);
  }
  function hideToast() {
    const t = $("#toast");
    clearTimeout(toastTimer);
    t.style.transform = "";
    t.classList.remove("on", "drag", "bump");
  }
  (function swipeToast() {
    const t = $("#toast");
    let id = null, y0 = 0, dy = 0, last = 0, lastT = 0, v = 0;
    const end = (e) => {
      if (id === null || e.pointerId !== id) return;
      id = null;
      t.classList.remove("drag");
      // Flicked or dragged up far enough: away it goes. Otherwise back into place.
      if (dy < -28 || v < -0.4) hideToast();
      else { t.style.transform = ""; toastTimer = setTimeout(hideToast, 1800); }
    };
    t.addEventListener("pointerdown", (e) => {
      if (!t.classList.contains("on")) return;
      id = e.pointerId; y0 = last = e.clientY; lastT = e.timeStamp; dy = 0; v = 0;
      clearTimeout(toastTimer);
      t.classList.add("drag");
      try { t.setPointerCapture(id); } catch {}
    });
    t.addEventListener("pointermove", (e) => {
      if (e.pointerId !== id) return;
      dy = e.clientY - y0;
      if (e.timeStamp > lastT) { v = (e.clientY - last) / (e.timeStamp - lastT); last = e.clientY; lastT = e.timeStamp; }
      // Up follows the finger one to one; down resists, like iOS.
      const y = dy < 0 ? dy : Math.sqrt(dy) * 4;
      t.style.transform = `translate(-50%, ${y}px)`;
    });
    t.addEventListener("pointerup", end);
    t.addEventListener("pointercancel", end);
  })();

  // Hopkins writes Markdown like Claude or ChatGPT: bold, lists, small tables, short headings.
  // Everything is escaped first, so only these few shapes ever become HTML.
  function md(src) {
    const inline = (s) => esc(s)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s.,!?:;)]|$)/g, "$1<em>$2</em>");
    const isList = (l) => /^\s*([-*•]|\d+[.)])\s+/.test(l);
    const isRow = (l) => /^\s*\|.*\|\s*$/.test(l);
    const lines = String(src || "").replace(/\r/g, "").split("\n");
    const out = [];
    for (let i = 0; i < lines.length; ) {
      const l = lines[i];
      if (!l.trim()) { i++; continue; }
      if (isRow(l) && /^[\s|:-]+$/.test(lines[i + 1] || "")) {
        const cells = (r) => r.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
        const head = cells(l);
        const rows = [];
        for (i += 2; i < lines.length && isRow(lines[i]); i++) rows.push(cells(lines[i]));
        out.push(`<div class="mdt"><table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
        continue;
      }
      if (isList(l)) {
        const ordered = /^\s*\d+[.)]\s+/.test(l);
        const items = [];
        for (; i < lines.length && isList(lines[i]); i++) items.push(lines[i].replace(/^\s*([-*•]|\d+[.)])\s+/, ""));
        out.push(`<${ordered ? "ol" : "ul"}>${items.map((x) => `<li>${inline(x)}</li>`).join("")}</${ordered ? "ol" : "ul"}>`);
        continue;
      }
      const h = l.match(/^\s*#{1,6}\s+(.*)$/);
      if (h) { out.push(`<p class="mdh">${inline(h[1])}</p>`); i++; continue; }
      const para = [];
      for (; i < lines.length && lines[i].trim() && !isList(lines[i]) && !isRow(lines[i]) && !/^\s*#{1,6}\s/.test(lines[i]); i++) para.push(inline(lines[i]));
      out.push(`<p>${para.join("<br>")}</p>`);
    }
    return `<div class="md">${out.join("")}</div>`;
  }

  // A canvas shown big over the page; a tap anywhere puts it away.
  function zoomCanvas(c) {
    const z = document.createElement("div");
    z.className = "zoom";
    z.innerHTML = `<img alt="" src="${c.toDataURL("image/jpeg", 0.9)}">`;
    z.onclick = () => { z.classList.remove("on"); setTimeout(() => z.remove(), 220); };
    document.body.appendChild(z);
    requestAnimationFrame(() => z.classList.add("on"));
    buzz(5);
  }

  // A message as one plain line, for previews: no Markdown marks.
  const plainText = (s) => String(s || "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/(^|\s)\*([^*]+)\*/g, "$1$2").replace(/^\s*([-*•]|\d+[.)]|#{1,6})\s+/gm, "").replace(/\|/g, " ").replace(/\s+/g, " ").trim();

  function ago(iso) {
    const s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    if (s < 7 * 86400) return `${Math.floor(s / 86400)}d ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  const money = (n) => "$" + Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
  // A home's price in its own currency (ad spend stays in dollars).
  const SYM = { EUR: "€", GBP: "£", AED: "AED ", CAD: "$", AUD: "$" };
  // A rent is always per month: "$2,400/mo".
  // A rental is rented, not sold (2026-10-29).
  const doneWord = (l) => (l.deal === "rent" ? "Rented" : "Sold");
  const homePrice = (l, short) => !l.price ? "" : (SYM[l.currency] || "$") + (l.deal !== "rent" && short && l.price >= 1e6 ? `${(l.price / 1e6).toFixed(2).replace(/\.?0+$/, "")}M` : Number(l.price).toLocaleString("en-US")) + (l.deal === "rent" ? "/mo" : "");
  // A listing with no photo gets a cover made from its own details instead of an empty square,
  // in the brand's style: the black of the app icon with the two sunset pebbles drawn large and
  // faint, placed differently per listing.
  const PEBBLES = `<path fill="url(#hpk-sun)" d="M55.9 85.8C54.8 88.1 52.2 89.9 49.9 91.2C47.6 92.6 44.8 93.5 42.1 93.9C39.4 94.4 35.9 94.8 33.4 93.7C31.0 92.6 29.1 89.4 27.5 87.3C25.9 85.2 25.4 83.2 24.0 81.0C22.7 78.9 20.2 76.8 19.5 74.3C18.7 71.8 18.8 68.5 19.6 66.0C20.5 63.4 22.3 60.3 24.6 58.9C27.0 57.4 30.9 57.0 33.8 57.5C36.6 57.9 39.2 60.5 41.7 61.7C44.1 62.9 46.4 63.2 48.6 64.6C50.7 66.0 53.2 67.9 54.5 70.0C55.9 72.2 56.2 75.1 56.4 77.7C56.7 80.3 57.0 83.5 55.9 85.8Z"/><path fill="url(#hpk-sun)" d="M97.0 31.0C98.4 33.8 99.0 36.2 100.4 39.5C101.7 42.7 105.3 46.7 105.1 50.5C104.9 54.3 102.0 59.3 99.0 62.3C95.9 65.2 90.8 67.3 86.7 68.2C82.7 69.1 78.3 68.5 74.7 67.7C71.2 67.0 68.2 65.4 65.3 63.8C62.4 62.2 59.8 60.5 57.4 58.1C55.1 55.7 51.8 52.7 51.2 49.4C50.7 46.1 52.8 41.9 54.1 38.3C55.4 34.7 56.8 30.9 59.3 27.7C61.7 24.4 65.2 20.5 68.9 18.8C72.7 17.1 77.8 16.8 81.6 17.5C85.4 18.1 89.2 20.3 91.7 22.6C94.3 24.8 95.5 28.2 97.0 31.0Z"/>`;
  // A listing with no photo gets the Hopkins ground and pebbles, nothing written on it
  // (Ismael, 2026-10-27): the name and status are already on the card.
  function cover(l) {
    const h = [...String(l.id)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
    const x = -18 + (h % 40), y = -30 + ((h >> 6) % 45), turn = (h >> 11) % 360;
    return `<svg class="cv-art" viewBox="0 0 120 120" style="left:${x}%;top:${y}%;transform:rotate(${turn}deg)">${PEBBLES}</svg>`;
  }
  // Every chat shows the Hopkins cover, never the property photo (Ismael, 2026-10-29): the cards on
  // Today and Chats, and the small squares in the sidebar and on Report.
  const photoOrCover = (l) => ({ cls: " cover", style: "", inner: l ? cover(l) : "" });

  const baseName = (l) => l.title || l.address || l.auto_title || l.area || l.city || (l.untitled_no ? `Untitled ${l.untitled_no}` : "Untitled");
  // Two listings with the same name read "Naples" and "Naples 2", then 3 and so on, in the order
  // they were made, like files on a computer (Ismael, 2026-10-27).
  S.nameNo = {};
  function numberNames() {
    S.nameNo = {};
    const seen = {};
    for (const l of [...S.listings].sort((a, b) => String(a.created_at || "").localeCompare(String(b.created_at || "")))) {
      const key = baseName(l).trim().toLowerCase();
      seen[key] = (seen[key] || 0) + 1;
      if (seen[key] > 1) S.nameNo[l.id] = seen[key];
    }
  }
  const listingName = (l) => baseName(l) + (l && S.nameNo[l.id] ? ` ${S.nameNo[l.id]}` : "");
  const photoUrl = (id, thumb) => (id ? `/photos/${id}${thumb ? "?thumb=1" : ""}` : null);
  const paid = () => S.me.workspace.plan === "paid";

  // The person, not the brokerage they work at (Ismael, 2026-10-27).
  const myName = () => S.me.user.name || S.me.workspace.brand?.agent_name || S.me.user.email.split("@")[0];
  const initials = () => ((S.me.user.name || S.me.user.email).trim()[0] || "").toUpperCase();
  // Your profile photo if you've added one, your initials if not.
  const avatarStyle = () => (S.me.user.avatar_id ? `style="background:#ddd url(${photoUrl(S.me.user.avatar_id, true)}) center/cover;color:transparent"` : "");
  // The phone's top bar. Top level pages show the logo and your avatar; inside a listing it
  // shows a back arrow and the listing, like any messaging app.
  function mtop(title, extra = "", opts = {}) {
    if (opts.back) {
      return `<div class="mtop"><a class="icon-btn mback" href="${opts.back}" aria-label="Back">${ICON.back}</a><div class="ttl">${opts.rename ? `<button class="rn" data-act="renameAsk" data-id="${opts.rename}"><b>${esc(title)}</b></button>` : `<b>${esc(title)}</b>`}${opts.sub ? `<span>${esc(opts.sub)}</span>` : ""}</div>${extra}</div>`;
    }
    return `<div class="mtop"><a class="logo" href="#/today" aria-label="Hopkins, Today">${MARK(`lg-mark${Date.now() - (S.spinAt || 0) < 400 ? " once" : ""}`)}Hopkins</a>${extra}<button class="av" data-act="account" aria-label="Account" ${avatarStyle()}>${esc(initials())}</button></div>`;
  }
  const buzz = (ms = 8) => { try { navigator.vibrate && navigator.vibrate(ms); } catch {} };
  // Real moments get a plain notice, not a celebration (Ismael, 2026-10-30: it felt like a game).
  function celebrate(text) {
    toast(text);
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
  // How big a photo is kept: 1920 pixels on its short side (a story ad is 1920 tall, so a
  // landscape photo cropped for one is never stretched), at most 4096 on its long side, at JPEG
  // quality 0.92. Smaller photos keep their own size. Logos stay small.
  const fit = (w, h, max) => (max ? Math.min(1, max / Math.max(w, h)) : Math.min(1, 1920 / Math.min(w, h), 4096 / Math.max(w, h)));
  function toData(img, max, type, quality) {
    const s = fit(img.naturalWidth, img.naturalHeight, max);
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * s);
    c.height = Math.round(img.naturalHeight * s);
    const g = c.getContext("2d");
    g.imageSmoothingQuality = "high";
    g.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL(type, quality).split(",")[1];
  }
  // iPhones save photos as HEIC. Safari opens them; other browsers can't, so there they're opened
  // with libheif (WebAssembly) in background workers, several photos at once, and come back as
  // JPEGs already at the size above, so they're sent as they are, with no second compression.
  // The decoder only loads the first time a HEIC is picked.
  const HEIC = /\.(heic|heif)$/i;
  const isHeic = (f) => /image\/hei[cf]/.test(f.type) || HEIC.test(f.name || "");
  const isPhoto = (f) => f.type.startsWith("image/") || isHeic(f);
  const PREPARED = new WeakSet();
  const heicPool = { workers: [], queue: [], jobs: new Map(), id: 0 };
  function heicRun() {
    for (const w of heicPool.workers) {
      if (w.busy || !heicPool.queue.length) continue;
      const job = heicPool.queue.shift();
      w.busy = job;
      job.file.arrayBuffer().then((buffer) => w.postMessage({ id: job.id, buffer, short: 1920, long: 4096, quality: 0.92 }, [buffer]), (err) => w.finish(job, null, err));
    }
  }
  function heicJpeg(file) {
    if (!heicPool.workers.length) {
      const n = Math.max(1, Math.min(4, navigator.hardwareConcurrency || 2));
      for (let i = 0; i < n; i++) {
        const w = new Worker("/static/heic-worker.js");
        w.finish = (job, blob, err) => {
          w.busy = false;
          heicPool.jobs.delete(job.id);
          if (blob) job.done(blob); else job.fail(err || new Error("decode failed"));
          heicRun();
        };
        w.onmessage = ({ data }) => w.finish(heicPool.jobs.get(data.id), data.blob, data.error && new Error(data.error));
        w.onerror = () => w.busy && w.finish(w.busy, null);
        heicPool.workers.push(w);
      }
    }
    return new Promise((done, fail) => {
      const job = { id: ++heicPool.id, file, done, fail };
      heicPool.jobs.set(job.id, job);
      heicPool.queue.push(job);
      heicRun();
    });
  }
  let nativeHeic;
  async function openable(file) {
    if (!isHeic(file)) return file;
    if (nativeHeic === undefined) nativeHeic = await readImage(file).then(() => true, () => false);
    if (nativeHeic) return file;
    const jpeg = await heicJpeg(file);
    const out = new File([jpeg], (file.name || "photo").replace(HEIC, "") + ".jpg", { type: "image/jpeg" });
    PREPARED.add(out);
    return out;
  }
  async function uploadPhoto(file, { listingId, kind } = {}) {
    const img = await readImage(file).catch(() => { throw new Error("That photo couldn't be opened. Try a JPG or PNG."); });
    const logo = kind === "logo";
    const type = logo && file.type === "image/png" ? "image/png" : "image/jpeg";
    const asIs = PREPARED.has(file) && !logo;
    const body = {
      data: asIs ? await blobBase64(file) : toData(img, logo ? 800 : 0, type, 0.92),
      thumb: logo ? undefined : toData(img, 512, "image/jpeg", 0.8),
      mime: type,
      listingId,
      kind,
      name: file.name,
    };
    return api("/api/photos", { body });
  }
  const blobBase64 = (blob) => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });


  // ---------- menus ----------

  // One popover for every "more" menu: a dropdown on a laptop, a bottom sheet on a phone.
  // Items use the same data attributes as the rest of the page, so one click handler covers all.
  const phone = () => window.innerWidth <= 980;
  function openPop(anchor, html, { top = false, style = false } = {}) {
    const pop = $("#pop");
    pop.innerHTML = `<div class="grab"></div>${html}`;
    pop.classList.add("on");
    pop.classList.toggle("lg", phone());
    pop.classList.toggle("top", phone() && top);
    // The Style sheet leaves the ad in view (no dimming), so each change can be seen as it lands.
    pop.classList.toggle("stylesheet", style);
    $("#sheetBg").classList.toggle("clear", style);
    if (phone()) { $("#sheetBg").classList.add("on"); buzz(6); return; }
    const r = anchor.getBoundingClientRect();
    const w = pop.offsetWidth, h = pop.offsetHeight;
    let left = Math.min(window.innerWidth - w - 8, Math.max(8, r.right - w));
    if (anchor.closest(".acct,.lists,.rp-week")) left = Math.max(8, r.left);
    const below = r.bottom + 6 + h < window.innerHeight;
    pop.style.left = left + "px";
    pop.style.top = (below ? r.bottom + 6 : r.top - h - 6) + "px";
  }
  const closePop = () => {
    const pop = $("#pop");
    pop.classList.remove("on");
    pop.style.transform = pop.style.transition = "";
    $("#sheetBg").classList.remove("on");
    $("#sheetBg").style.opacity = "";
  };

  // On a phone every sheet can be swiped away like an iOS one: down for a sheet at the bottom, up
  // for one at the top (Ismael, 2026-10-27). It follows the finger, the backdrop fades with it, and
  // a short flick is enough. Taps, scrolling inside the sheet and sideways swipes are left alone.
  (function swipeSheets() {
    const pop = $("#pop"), bg = $("#sheetBg");
    let y0 = 0, x0 = 0, dy = 0, drag = false, armed = false, up = false, v = 0, lastY = 0, lastT = 0;
    pop.addEventListener("touchstart", (e) => {
      if (!phone() || !pop.classList.contains("on") || e.touches.length > 1) return;
      up = pop.classList.contains("top");
      // Inside a sheet that has scrolled, a pull only scrolls it back, unless it starts on the handle.
      armed = Boolean(e.target.closest(".grab")) || (up ? true : pop.scrollTop <= 0);
      y0 = lastY = e.touches[0].clientY; x0 = e.touches[0].clientX; lastT = Date.now(); dy = 0; v = 0; drag = false;
    }, { passive: true });
    pop.addEventListener("touchmove", (e) => {
      if (!armed) return;
      const my = e.touches[0].clientY - y0, mx = e.touches[0].clientX - x0;
      if (!drag) {
        if (Math.abs(my) < 6 && Math.abs(mx) < 6) return;
        // Sideways (the colour swatches) or the wrong way: not a dismiss.
        if (Math.abs(mx) > Math.abs(my) || (up ? my > 0 : my < 0)) { armed = false; return; }
        drag = true;
        pop.style.transition = "none";
        document.activeElement?.blur?.();
      }
      e.preventDefault();
      // How fast the finger is going right now, so a quick flick at the end counts.
      const now = Date.now(), y = e.touches[0].clientY;
      if (now > lastT) { v = 0.6 * ((y - lastY) / (now - lastT)) + 0.4 * v; lastY = y; lastT = now; }
      dy = up ? Math.min(0, my) : Math.max(0, my);
      pop.style.transform = `translateY(${dy}px)`;
      bg.style.opacity = String(Math.max(0, 1 - Math.abs(dy) / (pop.offsetHeight || 400)));
    }, { passive: false });
    const end = () => {
      if (!drag) { armed = false; return; }
      drag = armed = false;
      const dist = Math.abs(dy), speed = up ? -v : v;
      if (dist > Math.min(120, pop.offsetHeight * 0.3) || (speed > 0.4 && dist > 20)) {
        pop.style.transition = "transform .22s cubic-bezier(.2,.8,.2,1)";
        pop.style.transform = `translateY(${up ? -(pop.offsetHeight + 40) : pop.offsetHeight + 40}px)`;
        bg.style.transition = "opacity .22s";
        bg.style.opacity = "0";
        buzz(5);
        setTimeout(() => { bg.style.transition = ""; closePop(); }, 220);
      } else {
        pop.style.transition = "transform .3s cubic-bezier(.2,1.2,.3,1)";
        pop.style.transform = "";
        bg.style.opacity = "";
      }
    };
    pop.addEventListener("touchend", end);
    pop.addEventListener("touchcancel", end);
  })();
  // The sidebar ••• a menu came from, so Rename and Delete open in the same place.
  const from = (id) => (S.menuFrom && S.menuFrom.isConnected && S.menuFrom.dataset.id === id ? S.menuFrom : null);

  // The sidebar opens and closes like Claude's and ChatGPT's; closed, it's a slim rail.
  function setSide(slim) {
    $("#shell").classList.toggle("slim", slim);
    const label = slim ? "Open sidebar" : "Close sidebar";
    $("#sideT").setAttribute("aria-label", label);
    $("#sideT").title = label;
    try { localStorage.setItem("hk.side", slim ? "slim" : ""); } catch {}
  }

  function accountMenu() {
    const u = S.me.usage;
    const plan = paid()
      ? `<div class="note"><b>${esc(S.me.plan.name)}</b>Billed monthly. Cancel anytime.</div>`
      : `<div class="note"><b>Free</b></div>`;
    return `<div class="note" style="padding-bottom:2px"><b>${esc(myName())}</b>${esc(S.me.user.email)}</div>${plan}<div class="sep"></div>
      <a href="#/settings">${ICON.gear}Settings</a>${S.me.admin ? `<a href="#/admin">${ICON.shield}Admin</a><button data-act="demoOpen">${ICON.eye}Open demo account</button>` : ""}
      ${S.me.demo ? `<button data-act="demoLeave">${ICON.back}Back to my account</button>` : ""}<button data-act="feedbackAsk">${ICON.msg}Send feedback</button>
      <div class="sep"></div><button data-act="logout">${ICON.out}Sign out</button>`;
  }

  // The chat's ••• menu: Rename and Delete chat (Ismael, 2026-11-01). Running ads keep their one
  // tap Pause or Resume here too, so they can always be stopped (2026-10-31).
  function listingMenu() {
    const l = S.current.listing;
    const runBtn = l.run === "running" ? `<button data-act="pauseRun">${ICON.pause}Pause ads</button>` : l.run === "paused" ? `<button data-act="resumeRun">${ICON.play}Resume ads</button>` : "";
    return `${runBtn}<button data-act="renameAsk" data-id="${l.id}">${ICON.pen}Rename</button>
      <button class="danger" data-act="delListingAsk">${ICON.trash}Delete chat</button>`;
  }

  // ---------- frame ----------

  async function loadMe() {
    S.me = await api("/api/me");
  }

  async function loadListings() { S.listings = (await api("/api/listings")).listings; numberNames(); }
  async function loadInbox() { const r = await api("/api/inbox"); S.inbox = r.items; S.leadsWeek = r.leadsWeek; S.weekFrom = r.weekFrom; S.attention = r.attention || []; S.inboxLoaded = true; }

  // The tab you tapped lights up straight away, before its screen has loaded.
  function markNav() {
    const view = location.hash.slice(2).split("/")[0];
    const nav = view === "l" ? "listings" : view || "today";
    $$(".nv,.tabbar a").forEach((a) => a.classList.toggle("on", a.dataset.nav === nav));
  }

  function drawSide() {
    const route = location.hash.slice(2).split("/");
    markNav();
    $("#lists").innerHTML = S.listings.length
      ? S.listings.map((l) => `<a class="li ${route[0] === "l" && route[1] === l.id ? "on" : l.unread ? "unread" : ""}" href="#/l/${l.id}">
          <i class="th cover-mini"></i>
          <div class="nm"><b>${esc(listingName(l))}</b></div>${l.unread && !(route[0] === "l" && route[1] === l.id) ? `<span class="dot" aria-label="New reply"></span>` : ""}<button class="more" data-act="limenu" data-id="${l.id}" aria-label="More for ${esc(listingName(l))}">${ICON.dots}</button></a>`).join("")
      : `<div class="empty-side">Nothing yet.</div>`;
    $("#acct").innerHTML = `<button data-act="account"><span class="av" ${avatarStyle()}>${esc(initials())}</span><span class="nm"><b>${esc(myName())}</b><span>${paid() ? esc(S.me.plan.name) : "Free"}</span></span>${ICON.chev}</button>`;
  }

  // ---------- routing ----------

  // Each route gets a number. A screen that finishes loading after you've already moved on
  // checks it and quietly stops, so a slow screen can never draw over the one you picked.
  let routeSeq = 0;
  const current = () => routeSeq;
  async function route() {
    const seq = ++routeSeq;
    closePop();
    S.closeViewer?.();
    markNav();
    const [view, id] = location.hash.slice(2).split("/");
    // Setup comes first, once (Ismael, 2026-10-31): nothing else opens until it's done.
    const setupDone = S.me?.workspace?.brand?.onboarded === "yes";
    document.body.classList.toggle("onboarding", !setupDone);
    // The questions (Instagram, city, taste, appearance) come first, once, on the front door's own
    // screens (welcome.js); the demo account has its answers already.
    if (S.me?.workspace?.brand?.profiled !== "yes" && !S.me?.demo) { location.replace("/start"); return; }
    if (!setupDone && view !== "setup") { location.hash = id === "meta-failed" ? "#/setup/meta-failed" : "#/setup"; return; }
    if (setupDone && view === "setup") { location.hash = "#/today"; return; }
    if (view !== "listings") { S.selecting = false; document.body.classList.remove("selecting"); }
    // Inside a listing or a new one, the phone goes full screen like a chat app.
    document.body.classList.toggle("focus", view === "l" || view === "new");
    try {
      if (view === "l" && id) await viewListing(id);
      else if (view === "new") viewNew();
      else if (view === "listings") viewListings();
      else if (view === "leads") await viewLeads();
      else if (view === "library") await viewLibrary();
      else if (view === "report") {
        // From Today's "Active listings": the Active filter, or All when nothing is active, so it's
        // never an empty board (Ismael, 2026-10-31). Active counts the same way as on Today.
        if (id === "active") {
          S.repFilter = S.listings.some((l) => l.run === "running") ? "active" : "all";
          S.repMonday = mondayOf(new Date()); S.repFollow = true;
        }
        await viewReport();
        if (id === "active") $("#board")?.scrollIntoView({ block: "start" });
      }
      else if (view === "brand") { location.hash = "#/settings"; return; }
      else if (view === "setup") viewSetup(id === "meta-failed");
      else if (view === "admin") await viewAdmin();
      else if (view === "crm") viewCrm(id === "settings" ? "#/settings" : "#/today");
      else if (view === "settings") {
        viewSettings();
        if (id === "meta-failed") { toast("Couldn't connect to Meta. Please try again."); history.replaceState(null, "", "#/settings"); }
        if (id === "upgraded" && S.me.plan) { toast(`Upgraded to ${S.me.plan.name}`); history.replaceState(null, "", "#/settings"); }
      }
      else await viewWeek();
    } catch (e) {
      if (e.message !== "signed out" && seq === routeSeq) main.innerHTML = `${mtop("Hopkins")}<div class="page"><p class="err">${esc(e.message)}</p></div>`;
    }
    if (seq === routeSeq) drawSide();
  }

  const skeleton = () => `<div class="page"><div class="wrap"><div class="sk" style="height:34px;width:60%;margin-bottom:12px"></div><div class="sk" style="height:16px;width:40%;margin-bottom:28px"></div>
    <div class="sk" style="height:180px;border-radius:20px;margin-bottom:12px"></div><div class="sk" style="height:64px;margin-bottom:10px"></div><div class="sk" style="height:64px"></div></div></div>`;

  // ---------- Today: what Hopkins needs from you ----------

  // Today draws at once from what's already loaded, then again only if the fresh copy differs,
  // so tapping the tab never waits on the network.
  async function viewToday() {
    const my = current();
    if (S.inboxLoaded) drawToday();
    else slowSkeleton(my, "Today");
    await loadInbox();
    if (my !== current()) return;
    drawToday();
  }

  function drawToday() {
    const first = (S.me.user.name || "").split(" ")[0];
    const h = new Date().getHours();
    // Morning 5:00 to 11:59, afternoon 12:00 to 18:59, evening 19:00 to 4:59 (Ismael, 2026-11-01).
    const greet = h >= 5 && h < 12 ? "Good morning" : h >= 12 && h < 19 ? "Good afternoon" : "Good evening";
    // Each number opens its own tab, showing exactly what it counts (Ismael, 2026-10-29): Chats,
    // Leads (this week's) and Report (the listings with ads running, its Active filter).
    // Active: its ads are running now (not paused, not over).
    const active = S.listings.filter((l) => l.run === "running");
    // The Monday report lives on Report, not here (Ismael, 2026-10-27).
    const recent = S.inbox.filter((m) => !m.needs_action && m.kind !== "report");
    const where = (m) => listingName(m);
    // The 5 listings used most recently, labelled Recent like the sidebar (Ismael, 2026-10-29),
    // with the gold dot on one that has a reply not seen yet.
    const recentCard = (l) => {
      const pc = photoOrCover(l);
      return `<a class="hero" href="#/l/${l.id}"><div class="ph${pc.cls}" style="${pc.style}">${pc.inner}</div>
        <div class="bd"><div class="tx"><b>${esc(listingName(l))}</b></div>${l.unread ? `<span class="dot" aria-label="New reply"></span>` : ""}</div></a>`;
    };
    const icon = (m) => (m.kind === "lead" ? ICON.people : m.kind === "report" ? ICON.chart : ICON.spark);
    const titleFor = (m) => (m.kind === "lead" ? `New lead on ${where(m)}` : m.kind === "report" ? "Your Monday report" : where(m));
    const row = (m) => `<a class="row" href="${m.kind === "report" ? "#/report" : `#/l/${m.listing_id}`}"><span class="ic">${icon(m)}</span>
      <div class="tx"><b>${esc(titleFor(m))}</b><p>${esc(plainText(m.body))}</p></div><span class="when">${ago(m.created_at)}</span></a>`;

    const leadsWeek = S.leadsWeek ?? S.inbox.filter((m) => m.kind === "lead").length;
    let body;
    // Like Claude's home: the greeting and the box to ask. Until Meta and the CRM are connected,
    // a quiet row each underneath; nothing else to set up.
    // A real box (Ismael, 2026-10-31): type straight in, send, and the chat starts with it.
    const ask = `<form class="askbox" id="askbox" autocomplete="off"><i class="ask-sheen" aria-hidden="true"></i><textarea id="askTa" rows="1" placeholder="Ask Hopkins anything" enterkeyhint="send" aria-label="Ask Hopkins anything"></textarea><button type="submit" aria-label="Send" disabled>${ICON.send}</button></form>`;
    const m = S.me.meta || {};
    const c = S.me.crm || {};
    const setup = [
      !m.ready && !S.me.demo ? `<li><div class="tx"><b>Meta</b></div>${!m.available ? `<button class="link" data-act="metaSoon">Connect</button>` : m.connected ? `<a class="link" href="#/settings">Finish</a>` : `<a class="link" href="/api/meta/connect">Connect</a>`}</li>` : "",
      S.pushState === "off" ? `<li><div class="tx"><b>Notifications</b></div><button class="link" data-act="pushOn">Turn on</button></li>` : "",
    ].filter(Boolean).join("");
    const setupHtml = setup ? `<ul class="steps setup">${setup}</ul>` : "";
    if (!S.listings.length) {
      body = `${ask}${setupHtml}`;
    } else {
      // No numbers strip (Ismael, 2026-11-01): the greeting, the box, then the latest 5 chats.
      body = `${ask}
        ${attentionHtml()}${setupHtml}
        <div class="sec">Recent</div>${S.listings.slice(0, 5).map(recentCard).join("")}
        ${recent.length ? `<div class="sec">This week</div><div class="list">${recent.map(row).join("")}</div>` : ""}`;
    }
    // The count lives in the row below, so the line under the greeting is just the day.
    const lede = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
    const html = `${mtop("Today")}<div class="page" data-today><div class="wrap"><div class="head"><h1>${greet}${first ? `, ${esc(first)}` : ""}</h1><p class="lede">${lede}</p></div>${body}</div></div>`;
    // Never redrawn under someone typing in the box.
    const typing = $("#askTa") && (document.activeElement === $("#askTa") || $("#askTa").value);
    if (typing && main.querySelector(".page[data-today]")) return;
    if (html !== S.todayHtml || !main.querySelector(".page[data-today]")) { main.innerHTML = html; S.todayHtml = html; }
  }

  // What Hopkins noticed (src/attention.js): each item says what it is and has one button that does
  // exactly what its label says, and Dismiss. Nothing changes until it's tapped.
  function attentionHtml() {
    const items = S.attention || [];
    if (!items.length) return "";
    return `<div class="sec">Needs attention</div><div class="attn">${items.map((a) => `<div class="attn-i">
      <div class="tx"><b>${esc(a.title)}</b><p>${esc(a.body)}</p></div>
      <div class="attn-a"><button class="btn" data-act="attAct" data-id="${esc(a.id)}">${esc(a.action?.label || "Open")}</button><button class="link" data-act="attDismiss" data-id="${esc(a.id)}">Dismiss</button></div></div>`).join("")}</div>`;
  }

  const PEB = PEBBLES.replace(/ fill="url\(#hpk-sun\)"/g, "");
  // ---------- the week (the redesign, 2026-11-05): Hopkins' one goal on one screen ----------
  // The week's posts as the real posts, big, one per day, swiped through like a deck; the days
  // underneath; one pill to approve. A new account's first week is planned the moment they land.
  const DAY = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const DAY_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const KIND_LABEL = { post: "Post", carousel: "Carousel", reel: "Reel", story: "Story" };
  const tickEl = (() => { const l = document.createElement("label"); l.className = "hk-tick"; l.innerHTML = '<input type="checkbox" switch tabindex="-1">'; l.setAttribute("aria-hidden", "true"); document.body.appendChild(l); return l; })();
  // A light tick on every meaningful touch: Android vibrates, an iPhone ticks through the switch.
  const tick = () => { try { if (navigator.vibrate && navigator.vibrate(7)) return; } catch {} try { tickEl.click(); } catch {} };
  const weekDates = (monday) => {
    const d = new Date(`${monday}T12:00:00`);
    const end = new Date(d); end.setDate(d.getDate() + 6);
    const m = (x) => x.toLocaleDateString(undefined, { month: "long" });
    return d.getMonth() === end.getMonth() ? `${d.getDate()} to ${end.getDate()} ${m(d)}` : `${d.getDate()} ${m(d)} to ${end.getDate()} ${m(end)}`;
  };
  const dayDate = (monday, day) => { const d = new Date(`${monday}T12:00:00`); d.setDate(d.getDate() + day); return d.getDate(); };
  const postOpts = (p, photos) => ({ kind: p.kind, photos: (photos || []).map((id) => photoUrl(id)), portrait: S.me.user.avatar_id ? photoUrl(S.me.user.avatar_id) : null, agent: S.me.workspace.brand.agent_name || S.me.user.name || "", footer: S.me.workspace.brand.business || "" });

  async function viewWeek() {
    const my = current();
    if (S.week) drawWeek(); else main.innerHTML = `${mtop("Week")}<div class="hk-page"></div>`;
    let w = await api("/api/week");
    if (my !== current()) return;
    S.week = w;
    drawWeek();
    if (w.status === "making") pollWeek(my);
  }
  async function pollWeek(my) {
    await new Promise((r) => setTimeout(r, 1800));
    if (my !== current()) return;
    const w = await api("/api/week").catch(() => null);
    if (!w) return pollWeek(my);
    const grew = w.posts.length > (S.week?.posts.length || 0);
    S.week = w;
    if (grew || w.status !== "making") { drawWeek(); if (grew) tick(); }
    if (w.status === "making") pollWeek(my);
  }

  function drawWeek() {
    const w = S.week;
    const first = (S.me.user.name || "").split(" ")[0];
    const slots = w.posts.length;
    const state = { proposed: "Planned", making: "Making", ready: "Ready for you", approved: "Approved", failed: "Something went wrong" }[w.status] || "";
    // Nothing yet, or the questions are waiting: planning a week is a conversation in its chat.
    if (w.status === "none" || w.status === "asking" || (w.status === "failed" && !w.posts.length)) {
      const asking = w.status === "asking";
      main.innerHTML = `${mtop("Week")}<div class="hk-page hk-empty"><svg class="hk-pebbles" viewBox="0 0 120 120">${PEB}</svg>
        <h1>${w.status === "failed" ? "Something went wrong" : "Your week"}</h1><p>${w.status === "failed" ? "Please try again." : asking ? "Hopkins asked a few questions." : "A few quick questions, then Hopkins plans it."}</p><button class="hk-pill" data-act="${asking ? "openWeekChat" : "planWeek"}">${w.status === "failed" ? "Try again" : asking ? "Answer in chat" : "Plan my week"}</button></div>`;
      return;
    }
    // The calendar: what each day will be, before anything's made, then filling in as it's made.
    if (w.status === "proposed" || w.status === "making") return drawCalendar(w, first, state);
    const cards = Array.from({ length: slots }, (_, i) => {
      const p = w.posts[i];
      if (!p) return `<div class="wk-card wait" style="--i:${i}"><div class="wk-day"><b>&nbsp;</b></div><div class="wk-art"><i class="wk-shim"></i><svg class="hk-pebbles turn" viewBox="0 0 120 120">${PEB}</svg></div><div class="wk-meta">&nbsp;</div></div>`;
      const n = p.spec.slides?.length || 1;
      return `<button class="wk-card" data-act="openPost" data-i="${i}" style="--i:${i}"><div class="wk-day"><b>${DAY_LONG[p.day]}</b><span>${esc(p.time)}</span></div>
        <div class="wk-art${p.kind === "story" || p.kind === "reel" ? " tall" : ""}"><canvas data-wk="${i}"></canvas>${p.kind === "reel" ? `<i class="wk-badge">▶</i>` : n > 1 ? `<i class="wk-badge">1/${n}</i>` : ""}</div>
        <div class="wk-meta">${KIND_LABEL[p.kind]}${p.spec.title ? ` · ${esc(p.spec.title)}` : ""}</div></button>`;
    }).join("");
    const days = DAY.map((d, i) => { const has = w.posts.findIndex((p) => p.day === i); return `<button class="wk-dot${has >= 0 ? " has" : ""}" data-act="toDay" data-i="${has}" ${has < 0 ? "disabled" : ""}><span>${d}</span><b>${dayDate(w.monday, i)}</b></button>`; }).join("");
    const approved = w.status === "approved";
    main.innerHTML = `${mtop("Week")}<div class="hk-page wk">
      <header class="wk-head"><p class="wk-hi">${first ? `${esc(first)}, here's your week` : "Here's your week"}</p><h1>This week</h1>
        <div class="wk-sub"><span>${weekDates(w.monday)}</span><i class="wk-state ${w.status}">${w.status === "planning" ? `<svg viewBox="0 0 120 120">${PEB}</svg>` : ""}${state}</i></div></header>
      <div class="wk-deck" id="deck">${cards}</div>
      <nav class="wk-days" id="wkDays">${days}</nav>
      <div class="wk-dock"><button class="hk-pill wk-approve${approved ? " done" : ""}" data-act="approveWeek" ${approved || w.status !== "ready" ? "disabled" : ""}>
        <span class="t">${approved ? "Approved" : w.status === "planning" ? `${w.posts.length} of ${slots} ready` : "Approve the week"}</span><svg class="ck" viewBox="0 0 24 24"><path d="m6 12.5 4 4 8-9"/></svg></button>
        ${approved ? `<p class="wk-note">Tap a post to download it</p>` : w.status === "ready" ? `<p class="wk-note">Tap a post to change it</p>` : ""}</div>
    </div>`;
    w.posts.forEach((p, i) => { const c = main.querySelector(`canvas[data-wk="${i}"]`); if (c) Studio.drawSlide(c, p.spec, 0, postOpts(p, w.photos)); });
    deckMotion();
  }

  // The deck: the card in the middle stands up, the others lean back a little; a tick each time a
  // new day settles in the middle, and the day underneath lights with it.
  function deckMotion() {
    const deck = $("#deck"); if (!deck) return;
    let last = -1, raf = 0;
    const update = () => {
      raf = 0;
      const mid = deck.scrollLeft + deck.clientWidth / 2;
      let best = 0, bestD = Infinity;
      // A laptop shows three days side by side, flat; the first one in view is the day.
      if (matchMedia("(min-width: 981px)").matches) {
        const left = deck.scrollLeft + parseFloat(getComputedStyle(deck).paddingLeft);
        [...deck.children].forEach((c, i) => { c.style.transform = ""; c.style.opacity = ""; const d = Math.abs(c.offsetLeft - left); if (d < bestD) { bestD = d; best = i; } });
        if (best !== last) { if (last >= 0) tick(); last = best; const day = S.week.posts[best]?.day; $$("#wkDays .wk-dot").forEach((b, i) => b.classList.toggle("on", i === day)); }
        return;
      }
      [...deck.children].forEach((c, i) => {
        const cx = c.offsetLeft + c.offsetWidth / 2, d = (cx - mid) / deck.clientWidth;
        const a = Math.min(1, Math.abs(d) * 1.6);
        c.style.transform = `scale(${1 - a * 0.07}) rotateY(${(-d * 10).toFixed(2)}deg)`;
        c.style.opacity = String(1 - a * 0.35);
        if (Math.abs(d) < bestD) { bestD = Math.abs(d); best = i; }
      });
      if (best !== last) {
        if (last >= 0) tick();
        last = best;
        const day = S.week.posts[best]?.day;
        $$("#wkDays .wk-dot").forEach((b, i) => b.classList.toggle("on", i === day));
      }
    };
    deck.addEventListener("scroll", () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
    update();
  }

  // A post, opened: big, every slide swipeable (a reel plays), Change it and Download.
  function openPost(list, i, photos, { weekChat } = {}) {
    const p = list[i];
    const n = p.kind === "reel" ? 1 : p.spec.slides?.length || 1;
    const v = document.createElement("div");
    v.className = "hk-viewer";
    v.innerHTML = `<div class="vw-top"><button class="vw-x" data-v="close" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
      <div class="vw-t"><b>${p.day != null ? `${DAY_LONG[p.day]} · ${esc(p.time)}` : KIND_LABEL[p.kind]}</b><span>${p.day != null ? KIND_LABEL[p.kind] : ""}${p.spec.title ? `${p.day != null ? " · " : ""}${esc(p.spec.title)}` : ""}</span></div></div>
      <div class="vw-slides${p.kind === "story" || p.kind === "reel" ? " tall" : ""}" id="vwS">${Array.from({ length: n }, (_, k) => `<div class="vw-s"><canvas data-vs="${k}"></canvas></div>`).join("")}</div>
      ${n > 1 ? `<div class="vw-pips">${Array.from({ length: n }, (_, k) => `<i class="${k ? "" : "on"}"></i>`).join("")}</div>` : `<div class="vw-pips"></div>`}
      <div class="vw-acts">${weekChat ? `<button class="hk-pill ghost" data-v="change">Change it</button>` : ""}<button class="hk-pill" data-v="dl">Download</button></div>`;
    document.body.appendChild(v);
    requestAnimationFrame(() => v.classList.add("on"));
    tick();
    const o = postOpts(p, photos);
    let stop = null;
    if (p.kind === "reel") Studio.playReel(v.querySelector("canvas"), p.spec, o).then((s) => { stop = s; });
    else v.querySelectorAll("canvas[data-vs]").forEach((c) => Studio.drawSlide(c, p.spec, Number(c.dataset.vs), o));
    const sl = v.querySelector("#vwS");
    sl.addEventListener("scroll", () => { const k = Math.round(sl.scrollLeft / sl.clientWidth); v.querySelectorAll(".vw-pips i").forEach((x, j) => x.classList.toggle("on", j === k)); }, { passive: true });
    const esc_ = (e) => e.key === "Escape" && close();
    const close = () => { stop && stop(); S.closeViewer = null; document.removeEventListener("keydown", esc_); v.classList.remove("on"); setTimeout(() => v.remove(), 320); };
    S.closeViewer = close;
    document.addEventListener("keydown", esc_);
    // swipe down to put it away
    let y0 = null;
    v.addEventListener("touchstart", (e) => { y0 = e.touches[0].clientY; }, { passive: true });
    v.addEventListener("touchend", (e) => { if (y0 != null && e.changedTouches[0].clientY - y0 > 90) close(); y0 = null; });
    v.addEventListener("click", async (e) => {
      const a = e.target.closest("[data-v]")?.dataset.v;
      if (!a) return;
      tick();
      if (a === "close") close();
      if (a === "change") { close(); S.prefill = `Change ${DAY_LONG[p.day]}'s ${KIND_LABEL[p.kind].toLowerCase()}: `; location.hash = `#/l/${weekChat}`; }
      if (a === "dl") {
        const btn = e.target.closest("button"); btn.disabled = true; btn.textContent = p.kind === "reel" ? "Preparing video" : "Preparing";
        try {
          const name = (p.spec.title || p.kind).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || p.kind;
          if (p.kind === "reel") {
            const blob = await Studio.recordReel(p.spec, o), cv = document.createElement("canvas");
            await Studio.drawSlide(cv, p.spec, 0, o);
            const cover = await new Promise((r) => cv.toBlob(r, "image/png"));
            await saveFiles([new File([blob], `${name}.${blob.type.includes("mp4") ? "mp4" : "webm"}`, { type: blob.type }), new File([cover], `${name}-cover.png`, { type: "image/png" })]);
          }
          else {
            const files = [];
            for (let k = 0; k < (p.spec.slides?.length || 1); k++) { const cv = document.createElement("canvas"); await Studio.drawSlide(cv, p.spec, k, o); files.push(new File([await new Promise((r) => cv.toBlob(r, "image/png"))], `${name}-${k + 1}.png`, { type: "image/png" })); }
            await saveFiles(files);
          }
        } catch (err) { toast(err.message || "Something went wrong. Please try again."); }
        btn.disabled = false; btn.textContent = "Download";
      }
    });
  }

  // The calendar on Week: one row a day, the format and the hook; a made post shows in its row.
  function drawCalendar(w, first, state) {
    const making = w.status === "making";
    const rows = w.plan.map((d, i) => {
      const k = w.posts.findIndex((p) => p.day === d.day);
      const thumb = k >= 0 ? `<canvas data-cal="${k}"></canvas>` : making ? `<svg class="hk-pebbles turn" viewBox="0 0 120 120">${PEB}</svg>` : "";
      return `<button class="cal-row${k >= 0 ? " made" : ""}" ${k >= 0 ? `data-act="openPost" data-i="${k}"` : "disabled"} style="--i:${i}">
        <div class="cal-day"><span>${DAY[d.day]}</span><b>${dayDate(w.monday, d.day)}</b></div>
        <div class="cal-body"><small>${KIND_LABEL[d.kind]} · ${esc(d.time)}</small><b>${esc(d.title)}</b><p>${esc(d.idea)}</p></div>
        <div class="cal-th${thumb ? "" : " none"}">${thumb}</div></button>`;
    }).join("");
    main.innerHTML = `${mtop("Week")}<div class="hk-page wk cal-page">
      <header class="wk-head"><p class="wk-hi">${first ? `${esc(first)}, here's your week` : "Here's your week"}</p><h1>This week</h1>
        <div class="wk-sub"><span>${weekDates(w.monday)}</span><i class="wk-state ${w.status}">${making ? `<svg viewBox="0 0 120 120">${PEB}</svg>` : ""}${state}</i></div></header>
      <div class="cal-list">${rows}</div>
      <div class="wk-dock">${making ? `<button class="hk-pill wk-approve" disabled><span class="t">${w.posts.length} of ${w.plan.length} ready</span></button>` : `<button class="hk-pill wk-approve" data-act="makeWeek"><span class="t">Make the week</span></button><button class="link wk-note-btn" data-act="openWeekChat">Change it in chat</button>`}</div>
    </div>`;
    w.posts.forEach((p, k) => { const c = main.querySelector(`canvas[data-cal="${k}"]`); if (c) Studio.drawSlide(c, p.spec, 0, postOpts(p, w.photos)); });
  }

  async function weekAction(act, t) {
    if (act === "planWeek") { tick(); t.disabled = true; const r = await api("/api/week/start", { body: {} }); S.week = null; location.hash = `#/l/${r.chat}`; return true; }
    if (act === "openWeekChat") { tick(); location.hash = `#/l/${S.week?.chat?.id || S.current?.listing?.id}`; return true; }
    if (act === "makeWeek") {
      tick(); t.disabled = true;
      const w = await api("/api/week/make", { body: {} });
      S.week = w;
      const chatId = S.current?.listing?.week_of && location.hash.startsWith("#/l/") ? S.current.listing.id : null;
      if (chatId) { const p = await api(`/api/listings/${chatId}`); drawListing(p, true); }
      else { drawWeek(); pollWeek(current()); }
      return true;
    }
    if (act === "openPost") { openPost(S.week.posts, Number(t.dataset.i), S.week.photos, { weekChat: S.week.chat?.id }); return true; }
    if (act === "toDay") { tick(); const c = $("#deck").children[Number(t.dataset.i)]; const dk = $("#deck"); c && dk.scrollTo({ left: matchMedia("(min-width: 981px)").matches ? c.offsetLeft - parseFloat(getComputedStyle(dk).paddingLeft) : c.offsetLeft - (dk.clientWidth - c.offsetWidth) / 2, behavior: "smooth" }); return true; }
    if (act === "approveWeek") {
      tick(); t.classList.add("going");
      const w = await api("/api/week/approve", { body: {} });
      await new Promise((r) => setTimeout(r, 420));
      S.week = { ...S.week, ...w }; drawWeek(); return true;
    }
    if (act === "libFilter") { tick(); S.libKind = t.dataset.k; drawLibrary(); return true; }
    if (act === "openLib") { const i = Number(t.dataset.i), it = S.libShown[i]; openPost(S.libShown.map((x) => ({ ...x, day: null })), i, it.photos); return true; }
    return false;
  }

  // ---------- Library: everything Hopkins has made, like a wall of saved posts ----------
  async function viewLibrary() {
    const my = current();
    if (S.library) drawLibrary(); else main.innerHTML = `${mtop("Library")}<div class="hk-page"></div>`;
    const r = await api("/api/library");
    if (my !== current()) return;
    S.library = r.items; drawLibrary();
  }
  function drawLibrary() {
    const all = S.library || [];
    const k = S.libKind || "all";
    S.libShown = k === "all" ? all : all.filter((x) => x.kind === k);
    const kinds = [["all", "All"], ["carousel", "Carousels"], ["post", "Posts"], ["reel", "Reels"], ["story", "Stories"]].filter(([key]) => key === "all" || all.some((x) => x.kind === key));
    main.innerHTML = `${mtop("Library")}<div class="hk-page lib"><header class="hk-head"><h1>Library</h1><p>${all.length ? `${all.length} made by Hopkins` : ""}</p></header>
      ${all.length ? `<div class="lib-f">${kinds.map(([key, n]) => `<button class="lib-c${k === key ? " on" : ""}" data-act="libFilter" data-k="${key}">${n}</button>`).join("")}</div>
      <div class="lib-wall">${S.libShown.map((x, i) => `<button class="lib-i" data-act="openLib" data-i="${i}" style="--i:${i % 12}"><canvas data-lib="${i}"></canvas><span>${KIND_LABEL[x.kind]}</span></button>`).join("")}</div>`
      : `<div class="hk-empty in"><svg class="hk-pebbles" viewBox="0 0 120 120">${PEB}</svg><h1>Nothing here yet</h1><p>Every post Hopkins makes lands here.</p></div>`}</div>`;
    // drawn as they come into view, so a long library opens instantly
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (!e.isIntersecting) return; io.unobserve(e.target); const x = S.libShown[Number(e.target.dataset.lib)]; Studio.drawSlide(e.target, x.spec, 0, postOpts(x, x.photos)).then(() => e.target.classList.add("in")); }), { rootMargin: "300px" });
    main.querySelectorAll("canvas[data-lib]").forEach((c) => io.observe(c));
  }


  // ---------- Listings ----------

  // Clearing listings out, the way Photos does it: Select, tick the ones to go, Delete. Holding
  // a card (or right clicking it on a laptop) opens its own menu: select, mark as sold, delete.
  // Chats: every thread, a listing or not, like ChatGPT and Claude (Ismael, 2026-10-29).
  const properties = () => S.listings;
  function viewListings() {
    const props = properties();
    const sel = S.selecting && props.length;
    document.body.classList.toggle("selecting", Boolean(sel));
    if (!sel) S.picked = new Set();
    const card = (l, i) => { const pc = photoOrCover(l); return `<a class="card-l ${S.picked.has(l.id) ? "picked" : ""}" href="#/l/${l.id}" data-card="${l.id}" style="animation-delay:${sel ? 0 : Math.min(i, 8) * 0.04}s"><div class="ph${pc.cls}" style="${pc.style}">${pc.inner}${sel ? `<i class="tick">${ICON.check}</i>` : ""}</div>
      <div class="bd"><b>${esc(listingName(l))}</b>${l.unread ? `<span class="dot" aria-label="New reply"></span>` : ""}</div></a>`; };
    const n = S.picked.size;
    // A search bar where the count was (Ismael, 2026-10-29), in Liquid Glass on phones.
    const typing = document.activeElement?.id === "cq";
    const q = (S.chatQ || "").trim().toLowerCase();
    // Only what's on the card: a match on a hidden city or name read as wrong (Ismael, 2026-10-29).
    const shown = props.filter((l) => !q || listingName(l).toLowerCase().includes(q));
    const cardsHtml = () => shown.map(card).join("");
    const top = sel ? `<p class="lede">${n ? `${n} selected` : "Select chats to delete"}</p>` : props.length ? "" : `<p class="lede">Your chats appear here.</p>`;
    main.innerHTML = `${mtop("Chats")}<div class="page"><div class="wrap"><div class="head head-row"><div><h1>Chats</h1>${top}</div>
      ${props.length ? `<button class="sel-btn" data-act="selectMode">${sel ? "Done" : "Select"}</button>` : ""}</div>
      ${props.length && !sel ? `<label class="csearch lg">${ICON.search}<input type="search" id="cq" placeholder="Search chats" autocomplete="off" enterkeyhint="search" value="${esc(S.chatQ || "")}"></label>` : ""}
      <div class="cards ${sel ? "selecting" : ""}">${cardsHtml()}</div>${!shown.length && q ? `<p class="cnone">No chats found.</p>` : ""}</div></div>
      ${sel ? `<div class="selbar lg"><button class="sec-btn" data-act="selectAll">${n === props.length ? "Select none" : "Select all"}</button>
        <button class="btn del-btn" data-act="delPicked" ${n ? "" : "disabled"}>${ICON.trash}${n ? `Delete ${n}` : "Delete"}</button></div>` : ""}`;
    const box = $("#cq");
    if (box) {
      box.addEventListener("input", () => { S.chatQ = box.value; viewListings(); });
      // Redrawn while typing (a reply landed, or a letter typed): the cursor stays where it was.
      if (typing) { box.focus(); box.setSelectionRange(box.value.length, box.value.length); }
    }
    bindHold();
  }

  // Press and hold a card for its menu. A small move cancels it, so scrolling never opens it.
  function bindHold() {
    const cards = $(".cards");
    if (!cards) return;
    let timer = 0, x0 = 0, y0 = 0;
    const cancel = () => clearTimeout(timer);
    cards.addEventListener("pointerdown", (e) => {
      const c = e.target.closest("[data-card]");
      if (!c || S.selecting || e.pointerType === "mouse") return;
      x0 = e.clientX; y0 = e.clientY;
      timer = setTimeout(() => {
        S.heldAt = Date.now();
        // iOS starts selecting text on a long press; the menu is what was meant.
        const clear = () => { try { window.getSelection().removeAllRanges(); } catch {} };
        clear(); setTimeout(clear, 50); setTimeout(clear, 250);
        buzz(10); cardMenu(c);
      }, 480);
    });
    cards.addEventListener("pointermove", (e) => { if (Math.hypot(e.clientX - x0, e.clientY - y0) > 8) cancel(); });
    for (const t of ["pointerup", "pointercancel", "scroll"]) cards.addEventListener(t, cancel);
    cards.addEventListener("contextmenu", (e) => {
      const c = e.target.closest("[data-card]");
      if (!c || S.selecting) return;
      e.preventDefault();
      cancel();
      S.heldAt = Date.now();
      cardMenu(c);
    });
  }

  function cardMenu(c) {
    const l = S.listings.find((x) => x.id === c.dataset.card);
    if (!l) return;
    c.classList.add("held");
    setTimeout(() => c.classList.remove("held"), 300);
    openPop(c, `<div class="note"><b>${esc(listingName(l))}</b>${esc(homePrice(l))}</div>
      <button data-act="renameAsk" data-id="${l.id}">${ICON.pen}Rename</button>
      <button class="danger" data-act="delOne" data-id="${l.id}">${ICON.trash}Delete chat</button>`);
  }

  async function deleteListings(ids) {
    await api("/api/listings/delete", { body: { ids } });
    S.selecting = false;
    await Promise.all([loadMe(), loadListings(), loadInbox()]);
    toast(ids.length === 1 ? "Chat deleted" : `${ids.length} chats deleted`);
    if (S.current && ids.includes(S.current.listing.id)) { S.current = null; location.hash = "#/listings"; }
    if (location.hash.startsWith("#/listings")) viewListings();
    drawSide();
  }

  // ---------- the composer (shared) ----------

  function composerHtml(placeholder) {
    return `<div class="comp-wrap">
      <form class="comp lg" id="comp"><div id="editbar"></div><div class="att" id="att"></div>
      <div class="row-c"><label class="icon-btn add" title="Add photos" aria-label="Add photos">${ICON.plus}<input type="file" id="files" accept="image/*,.heic,.heif" multiple hidden></label>
      <textarea id="ta" rows="1" placeholder="${esc(placeholder)}" enterkeyhint="send"></textarea>
      <button class="send" id="send" type="submit" aria-label="Send">${ICON.send}</button></div><div class="hint" id="hint"></div></form></div>`;
  }

  // What the empty box says: "Ask Hopkins anything" until there's a conversation, then
  // "Reply to Hopkins" (Ismael, 2026-10-27, replacing the suggested next message).
  const ASK = "Ask Hopkins anything";
  const REPLY = "Reply to Hopkins";

  function bindComposer(onSend, { drop } = {}) {
    const ta = $("#ta"), comp = $("#comp");
    S.pending = [];
    const grow = () => { ta.style.height = "auto"; ta.style.height = Math.min(160, ta.scrollHeight) + "px"; };
    // Photos waiting to be sent sit in a tray inside the box, like Claude or ChatGPT: a
    // thumbnail each (× takes one out), a + to add more, and the count. While the big drop
    // area on the New listing screen is showing, they appear there instead.
    const drawAtt = () => {
      const n = S.pending.length;
      const dropShown = drop && $("#drop") && $("#drop").offsetParent !== null;
      if (drop) drop(S.pending);
      $("#att").innerHTML = n && !dropShown
        ? `<div class="att-row">${S.pending.map((p, i) => `<div class="ph${p.url ? "" : " wait"}" style="${p.url ? `background-image:url(${p.url})` : ""}"><button type="button" data-rm="${i}" aria-label="Remove photo ${i + 1}">×</button></div>`).join("")}<label class="att-more" for="files" aria-label="Add more photos">${ICON.plus}</label></div>
          <div class="att-note">${n} ${n === 1 ? "photo" : "photos"} ready to send</div>`
        : "";
      const pick = comp.querySelector("label.icon-btn");
      if (pick) pick.dataset.count = n || "";
      // While Hopkins works, Send turns into Stop (a square with soft corners, like ChatGPT and
      // Claude, Ismael 2026-10-28).
      const btn = $("#send");
      if (btn.classList.contains("stop") !== Boolean(S.busy)) {
        btn.classList.toggle("stop", Boolean(S.busy));
        btn.innerHTML = S.busy ? ICON.stop : ICON.send;
        btn.setAttribute("aria-label", S.busy ? "Stop" : "Send");
      }
      btn.disabled = !S.busy && ((!ta.value.trim() && !S.pending.length) || S.pending.some((p) => !p.file));
    };
    // Each photo shows in the tray at once; a HEIC one shimmers there while it's opened, and Send
    // waits until every photo is ready, like attachments in ChatGPT or Claude.
    const add = (files) => {
      const all = [...files], photos = all.filter(isPhoto);
      if (photos.length < all.length) toast("Only photos can be added");
      for (const f of photos) {
        const item = { file: null, url: "" };
        item.ready = openable(f).then(
          (ok) => { item.file = ok; item.url = URL.createObjectURL(ok); },
          () => { toast("That photo couldn't be opened. Try a JPG or PNG."); S.pending = S.pending.filter((p) => p !== item); },
        ).finally(drawAtt);
        S.pending.push(item);
      }
      if (photos.length) buzz(5);
      drawAtt();
    };
    S.addFiles = (files) => add(files);
    S.removeFile = (i) => { S.pending.splice(i, 1); drawAtt(); };
    ta.addEventListener("input", () => { grow(); drawAtt(); });
    ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing && !phone()) { e.preventDefault(); if (!S.busy) comp.requestSubmit(); } });
    ta.addEventListener("keydown", (e) => { if (e.key === "Escape" && S.editing) { e.preventDefault(); stopEdit(); } });
    $("#files").addEventListener("change", (e) => { add(e.target.files); e.target.value = ""; });
    $("#att").addEventListener("click", (e) => { const i = e.target.dataset.rm; if (i !== undefined) S.removeFile(Number(i)); });
    const zone = comp.closest(".chat") || comp;
    zone.addEventListener("dragover", (e) => { e.preventDefault(); comp.classList.add("drag"); });
    zone.addEventListener("dragleave", () => comp.classList.remove("drag"));
    zone.addEventListener("drop", (e) => { e.preventDefault(); comp.classList.remove("drag"); add(e.dataTransfer.files); });
    ta.addEventListener("paste", (e) => { const fs = [...(e.clipboardData?.files || [])]; if (fs.length) add(fs); });
    comp.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (S.busy) { if (S.stop) { buzz(8); S.stop(); S.stop = null; } return; }
      const text = ta.value.trim();
      if ((!text && !S.pending.length) || S.pending.some((p) => !p.file)) return;
      S.busy = true;
      buzz(8);
      ta.blur();
      // The box empties the moment it's sent, like any chat; the message is already in the
      // thread. Only if it fails to send does it come back, so nothing is lost.
      const pending = S.pending;
      ta.value = "";
      S.pending = [];
      grow();
      drawAtt();
      try {
        await onSend(text, pending.map((p) => p.file));
      } catch (err) {
        if (!err.stopped) {
          if (ta.isConnected && !ta.value) { ta.value = text; S.pending = pending; grow(); }
          toast(err.message);
        }
      } finally {
        S.busy = false;
        S.stop = null;
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
    t.insertAdjacentHTML("beforeend", `<div class="hk in" id="typing">${MARK("think")}<div class="b"></div></div>`);
    $("#msgs").scrollTop = $("#msgs").scrollHeight;
  }

  // While Hopkins works: the thinking mark on its own, the same as for any reply (Ismael,
  // 2026-10-27: no list of steps).
  function showWork() {
    const t = $("#thread");
    t.insertAdjacentHTML("beforeend", `<div class="hk in" id="work">${MARK("think")}<div class="b"></div></div>`);
    $("#msgs").scrollTop = $("#msgs").scrollHeight;
    // It stays until the reply is drawn over it, so a slow server never leaves a blank gap.
    return async () => {};
  }

  // ---------- a new listing ----------

  // ---------- the box on Today ----------
  //
  // Small things done properly (Ismael, 2026-10-31: "an intentional work of art"): the glass wakes
  // when you tap in (its rim brightens and a glint crosses it once), Today stays as it is
  // while you write, the box grows with what you type, Send lights up only when there's something
  // to send, and the words you sent rise from the box into the new chat as your first message.
  function askGrow(ta) {
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 132) + "px";
    const f = ta.closest("form");
    f.classList.toggle("has", Boolean(ta.value.trim()));
    f.querySelector("button").disabled = !ta.value.trim();
    f.classList.toggle("tall", ta.scrollHeight > 40);
  }
  document.addEventListener("input", (e) => { if (e.target.id === "askTa") askGrow(e.target); });
  document.addEventListener("focusin", (e) => {
    if (e.target.id !== "askTa") return;
    const f = e.target.closest("form");
    f.classList.remove("lit"); void f.offsetWidth; f.classList.add("lit");
    $(".page[data-today]")?.classList.add("asking");
  });
  document.addEventListener("focusout", (e) => {
    if (e.target.id !== "askTa") return;
    if (!e.target.value.trim()) $(".page[data-today]")?.classList.remove("asking");
  });
  document.addEventListener("keydown", (e) => {
    if (e.target.id === "askTa" && e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); e.target.form.requestSubmit(); }
  });
  document.addEventListener("submit", (e) => {
    if (e.target.id !== "askbox") return;
    e.preventDefault();
    const ta = $("#askTa");
    const text = ta.value.trim();
    if (!text) return ta.focus();
    // Where the words are now, so they can travel to where the chat puts them.
    const r = ta.getBoundingClientRect();
    const cs = getComputedStyle(ta);
    S.askFly = { text, x: r.left + parseFloat(cs.paddingLeft), y: r.top + parseFloat(cs.paddingTop), w: r.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) };
    S.askSend = text;
    ta.value = "";
    ta.blur();
    location.hash = "#/new";
  });
  function flyAsk() {
    const fly = S.askFly;
    S.askFly = null;
    if (!fly || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ghost = document.createElement("div");
    ghost.className = "ask-fly";
    ghost.textContent = fly.text;
    document.body.appendChild(ghost);
    document.body.classList.add("flying");
    // The chat redraws itself while this runs (the thread is made, then opened), so each frame
    // aims at wherever the first message is now.
    const t0 = performance.now(), D = 460;
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    function step(now) {
      const t = Math.min(1, (now - t0) / D);
      const target = $("#main .me .tx");
      const to = target ? target.getBoundingClientRect() : { left: fly.x, top: fly.y, width: fly.w };
      const k = ease(t);
      ghost.style.width = `${fly.w + (to.width + 1 - fly.w) * k}px`;
      ghost.style.transform = `translate(${fly.x + (to.left - fly.x) * k}px,${fly.y + (to.top - fly.y) * k}px)`;
      if (t < 1) return requestAnimationFrame(step);
      document.body.classList.remove("flying");
      ghost.classList.add("gone");
      setTimeout(() => ghost.remove(), 200);
    }
    requestAnimationFrame(step);
  }

  // iPhones only show :active presses when the page listens for touches; this empty listener is
  // what makes every button react the instant it's touched.
  document.addEventListener("touchstart", () => {}, { passive: true });

  // Tapping the logo goes to Today, and the mark turns once, the way it does while Hopkins thinks.
  document.addEventListener("click", (e) => {
    const logo = e.target.closest(".mtop .logo, .brand");
    if (!logo) return;
    const m = logo.querySelector(".mk");
    if (m) { m.classList.remove("once"); void m.getBoundingClientRect(); m.classList.add("once"); }
    // On a phone the header is drawn again as Today opens, so the new one carries the turn on.
    S.spinAt = Date.now();
    if (location.hash === "#/today") { e.preventDefault(); $("#main .page")?.scrollTo({ top: 0, behavior: "smooth" }); }
  });

  // The loading placeholder only appears when the network is genuinely slow (Ismael, 2026-10-31:
  // "seamless as possible"): nothing for the first 450ms, and never once the page has drawn.
  function slowSkeleton(my, title, opts) {
    const before = main.innerHTML;
    setTimeout(() => { if (my === current() && main.innerHTML === before) main.innerHTML = `${mtop(title, "", opts)}${skeleton()}`; }, 450);
  }
  // Every tab's data is fetched once the app has opened, so the first tap on each is instant.
  function warmTabs() {
    const go = () => {
      api("/api/leads").then((r) => { S.leadsCache = r.leads; }).catch(() => {});
      reportFor(mondayOf(new Date())).catch(() => {});
      for (const l of (S.listings || []).slice(0, 5)) if (!S.chatCache.has(l.id)) api(`/api/listings/${l.id}`).then((p) => S.chatCache.set(l.id, p)).catch(() => {});
    };
    (window.requestIdleCallback || ((f) => setTimeout(f, 800)))(go);
  }

  // The first name they signed up with, for the New chat line.
  // The top plan has nothing to upgrade to.
  const topPlan = () => paid() && S.me.plan?.id === S.me.plans.at(-1).id;
  const firstName = () => (S.me.user.name || "").trim().split(/\s+/)[0] || "there";
  // One line always: the font steps down until it fits, never below what reads comfortably.
  // Measured, not guessed: the line's real width at its full size is compared with the room there
  // is, and the size scales down to fit, never below a readable 18px. Nothing is clipped, so no
  // letter can be cut at the sides or the bottom (Ismael, 2026-11-01).
  function fitLine(el, min = 18) {
    if (!el || !el.isConnected) return;
    el.style.fontSize = "";
    const cs = getComputedStyle(el);
    const full = parseFloat(cs.fontSize);
    const room = el.parentElement.clientWidth - parseFloat(getComputedStyle(el.parentElement).paddingLeft) - parseFloat(getComputedStyle(el.parentElement).paddingRight);
    const ctx = (fitLine.c ||= document.createElement("canvas").getContext("2d"));
    ctx.font = `${cs.fontWeight} ${full}px ${cs.fontFamily}`;
    // letter-spacing isn't in the canvas measure: add it per character.
    const ls = parseFloat(cs.letterSpacing) || 0;
    const width = ctx.measureText(el.textContent).width + ls * el.textContent.length;
    if (room > 0 && width > room * 0.96) el.style.fontSize = `${Math.max(min, Math.floor(full * (room * 0.96) / width))}px`;
  }
  window.addEventListener("resize", () => fitLine($("#helloH")));
  // The font can arrive after the first fit, which made the line wider and cut it: fit again.
  document.fonts?.ready?.then(() => fitLine($("#helloH")));

  function viewNew() {
    S.newChat = [];
    main.innerHTML = `${mtop("New chat", "", { back: "#/today" })}<section class="chat"><div class="ch"><div class="tt"><h2>New chat</h2></div></div>
      <div class="msgs" id="msgs"><div class="intro hello"><h1 id="helloH">What are you working on, ${esc(firstName())}?</h1>
      ${!paid() && S.me.usage.adsMade >= S.me.usage.freeLimit ? `<div class="notice"><button class="link" data-upgrade>Upgrade your plan</button></div>` : ""}</div>
      <label class="drop quiet" id="drop"><div class="grid" id="dropGrid"></div><input type="file" accept="image/*,.heic,.heif" multiple hidden id="dropFiles"></label>
      <div class="thread" id="thread" style="margin-top:18px"></div></div>
      ${composerHtml(ASK)}</section>`;
    fitLine($("#helloH"));
    requestAnimationFrame(() => fitLine($("#helloH")));
    document.fonts?.ready?.then(() => fitLine($("#helloH")));
    const dropEl = $("#drop");
    // Photos come in through the + in the box, or dropped anywhere on the screen.
    const zone = $("section.chat");
    $("#dropFiles").addEventListener("change", (e) => { S.addFiles(e.target.files); e.target.value = ""; });
    zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("drag"); });
    zone.addEventListener("dragleave", (e) => { if (!zone.contains(e.relatedTarget)) zone.classList.remove("drag"); });
    zone.addEventListener("drop", (e) => { e.preventDefault(); zone.classList.remove("drag"); S.addFiles(e.dataTransfer.files); });
    $("#dropGrid").addEventListener("click", (e) => { const i = e.target.dataset.rm; if (i !== undefined) { e.preventDefault(); S.removeFile(Number(i)); } });
    bindComposer(async (text, files) => {
      // Clear the box straight away so it doesn't look like nothing happened.
      const ta = $("#ta");
      ta.value = "";
      ta.dispatchEvent(new Event("input"));
      try { await create(text, files); } catch (err) { if (!err.stopped) { ta.value = text; viewNew(); $("#ta").value = text; } throw err; }
    }, {
      drop: (pending) => {
        // The thread may already have opened in its place.
        if (!dropEl.isConnected) return;
        dropEl.classList.toggle("has", pending.length > 0);
        $("#dropGrid").innerHTML = pending.length ? pending.map((p, i) => `<i class="${p.url ? "" : "wait"}" style="${p.url ? `background-image:url(${p.url});` : ""}position:relative"><button type="button" data-rm="${i}" aria-label="Remove" style="position:absolute;right:4px;top:4px;width:22px;height:22px;border-radius:50%;background:rgba(12,12,14,.7);color:#fff;font-size:13px;line-height:22px">×</button></i>`).join("") + `<span class="more">${ICON.plus}</span>` : "";
      },
    });
    // Sent from the box on Today: it goes straight in, as if typed here, and its words fly into place.
    if (S.askSend) {
      const text = S.askSend;
      S.askSend = null;
      requestAnimationFrame(() => { $("#ta").value = text; $("#comp").requestSubmit(); });
    }
    // Like ChatGPT and Claude (Ismael, 2026-10-29): sending the first message makes the thread
    // at once. It's in the sidebar, named from the message, and opens with the thinking mark
    // while Hopkins answers there. Photos upload first, so they're part of that first message.
    async function create(text, files) {
      $("#drop").style.display = "none";
      $(".intro").style.display = "none";
      $("#thread").insertAdjacentHTML("beforeend", sentPhotos(files.map((f) => URL.createObjectURL(f)), " in") + (text ? `<div class="me in"><span class="tx">${esc(text)}</span></div>` : ""));
      flyAsk();
      const ctrl = new AbortController();
      // Stopped while the photos upload: no thread is made, and the photos go back in the box.
      S.stop = () => {
        ctrl.abort();
        $("#work") && $("#work").closest(".hk")?.remove();
        if (files.length) setTimeout(() => S.addFiles(files), 0);
      };
      showWork();
      const photoIds = [], photoNames = {};
      for (const f of files) {
        const r = await uploadPhoto(f);
        if (ctrl.signal.aborted) throw Object.assign(new Error("Stopped"), { stopped: true });
        photoIds.push(r.id);
        photoNames[r.id] = f.name;
      }
      const from = location.hash;
      const { listing } = await api("/api/listings/start", { body: { text, photoIds, photoNames }, signal: ctrl.signal, keepalive: true });
      // From here the thread exists: it shows in the sidebar and opens, whatever happens next.
      const id = listing.id;
      const here = () => location.hash === `#/l/${id}`;
      S.firstPending = id;
      S.fresh = id;
      S.seen[id] = 1;
      try {
        const [, , full] = await Promise.all([loadMe(), loadListings(), api(`/api/listings/${id}`).catch(() => null)]);
        if (full) S.ready = full;
        drawSide();
        // Only opens the chat if they're still where they sent it from: someone who has moved
        // on is never pulled back (Ismael, 2026-11-01). The answer waits with its dot.
        if (location.hash === from || location.hash === "#/new") location.hash = `#/l/${id}`;
        const signal = stoppable({ id });
        const next = await api(`/api/listings/${id}/first`, { body: {}, signal });
        S.firstPending = null;
        if (here() && !next.stopped) {
          if (next.focus && next.ads.some((a) => a.version === next.focus)) S.selected[id] = next.focus;
          drawListing(next);
        }
        refreshSide();
      } catch (err) {
        if (err.stopped) { S.firstPending = null; throw err; }
        // The connection dropped (the phone locked, the app was left): the server carries on,
        // so the thinking mark stays and the answer arrives when it's ready, no error.
        if (err.offline) { awaitAnswer(id, () => { S.firstPending = null; }); throw Object.assign(new Error("waiting"), { stopped: true }); }
        S.firstPending = null;
        // The thread and the message stay; the thinking mark goes and the error shows.
        $("#typing") && $("#typing").remove();
        refreshSide();
        toast(err.message);
        throw Object.assign(new Error(err.message), { stopped: true });
      }
    }
  }

  // ---------- a listing: chat and preview ----------

  async function viewListing(id, keepScroll) {
    const my = current();
    const ready = S.ready && S.ready.listing.id === id ? S.ready : null;
    S.ready = null;
    if (ready) return drawListing(ready, keepScroll);
    const cached = S.chatCache.get(id);
    if (cached) drawListing(cached, keepScroll);
    else if (!S.current || S.current.listing.id !== id) slowSkeleton(my, "", { back: "#/listings" });
    const p = await api(`/api/listings/${id}`);
    if (cached && my === current() && JSON.stringify(p) === JSON.stringify(cached)) return;
    if (my !== current()) return;
    drawListing(p, keepScroll);
  }

  function drawListing(p, keepScroll) {
    S.current = p;
    S.chatCache.set(p.listing.id, p);
    // On screen means read: the dot goes the moment the chat is open (like Claude's).
    const row = S.listings.find((x) => x.id === p.listing.id);
    if (p.listing.unread) { p.listing.unread = false; api(`/api/listings/${p.listing.id}/seen`, { body: {} }).catch(() => {}); }
    if (row && row.unread) { row.unread = 0; drawSide(); }
    // Still being answered on the server (reopened mid reply): the thinking mark, then the answer.
    const resumed = p.working && p.messages.at(-1)?.role === "agent" && !S.busy && S.firstPending !== p.listing.id;
    if (resumed && !S.waiting?.has(p.listing.id)) {
      (S.waiting ||= new Set()).add(p.listing.id);
      awaitAnswer(p.listing.id, () => S.waiting.delete(p.listing.id));
    }
    const awaitingFirst = (S.firstPending === p.listing.id && !p.messages.some((m) => m.role === "hopkins")) || resumed;
    S.editing = null;
    const l = p.listing;
    if (!S.selected[l.id]) S.selected[l.id] = 1;
    const prevScroll = keepScroll && $("#msgs") ? $("#msgs").scrollTop : null;
    const showPv = S.openAds || ($("#lv") && $("#lv").classList.contains("showpv"));
    S.openAds = false;
    const seen = S.seen[l.id] ?? (S.fresh === l.id ? 1 : p.messages.length);
    const reveal = S.fresh === l.id;
    S.fresh = null;
    const chip = l.status === "sold" ? `<span class="chip green">${doneWord(l)}</span>` : l.moment !== "new" ? `<span class="chip gold">${esc(l.deal === "rent" && l.moment === "sold" ? "Just rented" : S.me.moments[l.moment])}</span>` : "";
    const sub = [l.priceText, l.facts].filter(Boolean).join(" · ");
    const firstPhoto = p.photos[0];
    // One chat for everything (Ismael, 2026-11-01): no Chat and Ads switch, no separate ad
    // screen; an ad sits in the chat like a post, with Run ad and Download under it.
    main.innerHTML = `${mtop(listingName(l), `<button class="icon-btn" data-act="listmenu" aria-label="More">${ICON.dots}</button>`, { back: "#/listings", sub, rename: l.id })}
      <div class="lv noads" id="lv">
      <section class="chat"><div class="ch">${firstPhoto ? `<i class="thumb" style="background-image:url(${photoUrl(firstPhoto.id, true)})"></i>` : ""}<div class="tt"><button class="rn" data-act="renameAsk" data-id="${l.id}" title="Rename"><h2>${esc(listingName(l))}</h2></button><span class="sub">${esc(sub)}</span></div>${chip}
        <div class="r"><button class="icon-btn" data-act="listmenu" aria-label="More">${ICON.dots}</button></div></div>
        <div class="msgs" id="msgs"><div class="thread" id="thread">${messagesHtml(p, seen, reveal)}</div></div>${composerHtml(REPLY)}</section></div>`;
    S.seen[l.id] = p.messages.length;
    if (S.prefill) { const ta = $("#ta"); if (ta) { ta.value = S.prefill; setTimeout(() => { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); ta.dispatchEvent(new Event("input")); }, 60); } S.prefill = null; }
    const msgs = $("#msgs");
    msgs.style.scrollBehavior = "auto";
    msgs.scrollTop = prevScroll ?? msgs.scrollHeight;
    msgs.style.scrollBehavior = "";
    if (prevScroll == null) typeOut($$("#thread .hk.in"), msgs);
    drawMiniCards();
    drawPreview();
    settleSegs();
    bindComposer(async (text, files) => {
      // A chat with no ads yet: photos are part of the message, and a property sent here makes
      // it a listing with its ads (2026-10-29).
      if (files.length && !p.ads.length && !S.editing) {
        const urls = files.map((f) => URL.createObjectURL(f));
        $("#hint").textContent = `Uploading ${files.length} ${files.length === 1 ? "photo" : "photos"}…`;
        const ids = [];
        for (const f of files) ids.push((await uploadPhoto(f, { listingId: l.id })).id);
        $("#hint").textContent = "";
        return say(text, ids, urls);
      }
      if (files.length) {
        $("#hint").textContent = `Uploading ${files.length} ${files.length === 1 ? "photo" : "photos"}…`;
        for (const f of files) await uploadPhoto(f, { listingId: l.id });
        $("#hint").textContent = "";
        if (!text) {
          toast(`Added ${files.length} ${files.length === 1 ? "photo" : "photos"}`);
          return viewListing(l.id);
        }
      }
      if (S.editing) return sendEdit(S.editing.id, text);
      await say(text);
    });
    // A new thread, still waiting on its first answer: the thinking mark, like any reply.
    if (awaitingFirst) showTyping();
  }

  // Waiting for an answer the server is still writing after the connection dropped: checked every
  // few seconds for up to 15 minutes. It draws in the chat if they're there, otherwise the chat
  // gets its dot like any reply they haven't seen.
  async function awaitAnswer(id, done = () => {}) {
    const asked = Date.now();
    while (Date.now() - asked < 15 * 60 * 1000) {
      await new Promise((r) => setTimeout(r, Date.now() - asked < 60000 ? 2500 : 5000));
      let p;
      try { p = await api(`/api/listings/${id}`); } catch { continue; }
      const last = p.messages.at(-1);
      if (!last || last.role !== "hopkins") continue;
      done();
      if (location.hash === `#/l/${id}`) drawListing(p);
      refreshSide();
      return;
    }
    done();
  }

  // Stop: the app lets go at once, your message stays, the thinking mark goes. The server undoes
  // the reply when it ends, then the chat redraws with Edit on your message.
  function stoppable(l) {
    const ctrl = new AbortController();
    S.stop = () => {
      ctrl.abort();
      $("#typing") && $("#typing").remove();
      $("#work") && $("#work").closest(".hk")?.remove();
      const my = current();
      api(`/api/listings/${l.id}/stop`, { body: {} }).then((p) => { if (my === current() && !S.busy && p.listing) { drawListing(p, true); refreshSide(); } }).catch(() => {});
    };
    return ctrl.signal;
  }

  async function say(text, photoIds = [], urls = []) {
    const l = S.current.listing;
    if (urls.length) $("#thread")?.insertAdjacentHTML("beforeend", sentPhotos(urls, " in"));
    showTyping(text);
    const my = current();
    const signal = stoppable(l);
    let next;
    try {
      next = await api(`/api/listings/${l.id}/messages`, { body: { text, version: S.selected[l.id], ...(photoIds.length ? { photoIds } : {}) }, signal, keepalive: text.length < 30000 });
    } catch (err) {
      if (err.stopped) throw err;
      // The connection dropped but the message got there (keepalive): the server is answering,
      // so wait for it quietly instead of saying it failed.
      if (err.offline) {
        const got = await api(`/api/listings/${l.id}`).catch(() => null);
        if (got && got.messages.some((m) => m.role === "agent" && m.body === text)) { awaitAnswer(l.id); throw Object.assign(new Error("waiting"), { stopped: true }); }
      }
      // No answer (no signal, the server's down): stop thinking.
      $("#typing") && $("#typing").remove();
      // The message didn't go, so it goes back in the box (the composer keeps it), not in the chat.
      const mine = $$("#thread .me");
      if (mine.length) mine[mine.length - 1].remove();
      throw err;
    }
    // Gone before the reply came: it waits, with the dot beside the listing.
    if (my !== current()) { refreshSide(); return; }
    if (next.focus && next.ads.some((a) => a.version === next.focus)) S.selected[l.id] = next.focus;
    drawListing(next);
    refreshSide();
    // Asked again for something the free plan doesn't do: the card, not the same note again.
    if (next.upgrade) upgradeSheet(next.upgrade);
  }

  // ---------- copy and edit under a message ----------

  // Copy under every message, and Edit under every one you sent, always there (Ismael,
  // 2026-10-27: hidden until tapped, nobody found them). Edit never expires; the only messages
  // without it are ones an edit can't go back to (before an approved run, or the chat before
  // the listing existed). Any part of a message can also be selected and copied as usual.
  const msgActs = (attr, editable, mine) => `<div class="mact${mine ? " me-act" : ""}" ${attr}><button type="button" data-act="copyMsg" aria-label="Copy">${ICON.copy}</button>${editable ? `<button type="button" data-act="editMsg" aria-label="Edit">${ICON.pen}</button>` : ""}</div>`;

  // What gets copied: your words as you wrote them, Hopkins' without the bold and list marks.
  const copyable = (s) => String(s || "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/(^|\s)\*([^*\n]+)\*/g, "$1$2").replace(/^#{1,6}\s+/gm, "").replace(/^\s*[-*]\s+/gm, "• ").trim();

  function copyMsg(btn) {
    const row = btn.closest(".mact");
    let text = "";
    if (row.classList.contains("me-act")) text = $(".tx", row.previousElementSibling)?.textContent || "";
    else if (row.dataset.mid) text = copyable(S.current?.messages.find((m) => m.id === row.dataset.mid)?.body);
    else if (row.dataset.nc) text = copyable(S.newChat[Number(row.dataset.nc)]?.body);
    // Written inside the tap itself: iPhones refuse a copy that comes later.
    navigator.clipboard.writeText(text).then(() => {
      buzz(6);
      btn.innerHTML = ICON.check;
      btn.classList.add("done");
      clearTimeout(btn._t);
      btn._t = setTimeout(() => { btn.innerHTML = ICON.copy; btn.classList.remove("done"); }, 1400);
    }, () => toast("Couldn't copy"));
  }

  // Editing a message you sent: its words go back in the box, with a bar saying so, and it and
  // everything after it fade. Sending replaces them, and Hopkins answers the new wording as if
  // the old one was never said.
  function startEdit(row, text) {
    const ta = $("#ta");
    if (!ta || !row) return;
    const before = S.editing ? S.editing.before : ta.value;
    stopEdit(false);
    S.editing = { id: row.dataset.mid, nc: row.dataset.nc, before };
    row.previousElementSibling.classList.add("editing");
    let n = row;
    while ((n = n.nextElementSibling)) n.classList.add("fading");
    $("#editbar").innerHTML = `<div class="editing-bar">${ICON.pen}<span>Editing your message</span><button type="button" data-act="cancelEdit" aria-label="Stop editing">${ICON.x}</button></div>`;
    ta.value = text;
    ta.dispatchEvent(new Event("input"));
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
  }

  function stopEdit(restore = true) {
    if (!S.editing) return;
    const ta = $("#ta");
    if (restore && ta) { ta.value = S.editing.before; ta.dispatchEvent(new Event("input")); }
    S.editing = null;
    if ($("#editbar")) $("#editbar").innerHTML = "";
    $$("#thread .editing, #thread .fading").forEach((e) => e.classList.remove("editing", "fading"));
  }

  async function sendEdit(id, text) {
    const l = S.current.listing;
    const i = S.current.messages.findIndex((m) => m.id === id);
    const old = S.current.messages[i];
    stopEdit(false);
    // The old message and everything after it leave straight away; the new one takes its place.
    let n = $(`#thread .mact[data-mid="${id}"]`)?.previousElementSibling;
    while (n) { const next = n.nextElementSibling; n.remove(); n = next; }
    // The message that made the listing reads it again and writes the ads again: show that work.
    let finish = null;
    if (old?.data?.first) { $("#thread").insertAdjacentHTML("beforeend", `<div class="me in"><span class="tx">${esc(text)}</span></div>`); finish = showWork(); }
    else showTyping(text);
    const my = current();
    const signal = stoppable(l);
    let next;
    try {
      next = await api(`/api/messages/${id}/edit`, { body: { text, version: S.selected[l.id] }, signal });
      if (finish) await finish();
    } catch (err) {
      if (err.stopped) throw err;
      // Nothing changed: the chat comes back as it was, still editing, with the new words kept.
      if (my === current()) { drawListing(S.current, true); startEdit($(`#thread .mact[data-mid="${id}"]`), text); }
      throw err;
    }
    if (my !== current()) { refreshSide(); return; }
    S.seen[l.id] = i;
    if (next.focus && next.ads.some((a) => a.version === next.focus)) S.selected[l.id] = next.focus;
    drawListing(next);
    refreshSide();
    if (next.upgrade) upgradeSheet(next.upgrade);
  }

  // The plans, as a card over the screen: what Run it, a new creation past the free one, or
  // Upgrade opens. Self-serve: the button goes straight to Stripe Checkout.
  function upgradeSheet(reason = "plans", anchor) {
    // On a plan already, the picker starts at the next one up.
    if (!S.pickPlan) { const i = paid() ? S.me.plans.findIndex((p) => p.id === S.me.plan?.id) + 1 : 0; S.pickPlan = (S.me.plans[i] || S.me.plans[0]).id; }
    const pick = S.me.plans.find((p) => p.id === S.pickPlan);
    const title = reason === "run" ? "Upgrade to run ads" : reason === "plans" ? "Upgrade your plan" : "Upgrade to create more";
    openPop(anchor || $(".actrow [data-act=run]") || $(".mtop"), `<div class="upsell">
      <h3>${title}</h3>
      <div class="plans">${S.me.plans.map((p) => `<button class="pl${p.id === S.pickPlan ? " sel" : ""}" data-plan="${p.id}"><span><b>${esc(p.name)}</b></span><b>$${p.price}<span>/mo</span></b></button>`).join("")}</div>
      <button class="btn" data-checkout>Upgrade to ${esc(pick.name)}</button>
      <button class="link upsell-later" data-act="notNow">Not now</button></div>`);
  }

  // Photos the agent sent, like Claude shows them: the images themselves on the right, outside
  // the text bubble. One is shown big, two side by side, more in a grid with "+3" on the last.
  function sentPhotos(urls, anim = "") {
    if (!urls.length) return "";
    const shown = urls.slice(0, 6);
    const extra = urls.length - shown.length;
    return `<div class="sent n${Math.min(shown.length, 3)}${anim}">${shown.map((u, i) => `<i style="background-image:url(${u})">${extra && i === shown.length - 1 ? `<b>+${extra}</b>` : ""}</i>`).join("")}</div>`;
  }

  // Hopkins' new replies write themselves out word by word, like ChatGPT (Ismael, 2026-10-27).
  // The reply arrives whole (it's checked before it's sent), so the writing happens here. Every
  // word is laid out from the start and only fades in, so nothing reflows and nothing jumps;
  // timing follows the clock, not the frame rate, so a slow phone finishes on time; a long
  // reply speeds up so it never takes more than about 2 seconds. A tap, a new message, leaving
  // the screen or switching apps finishes it at once. The ad cards, buttons and Copy follow the
  // text. Reduced motion shows replies whole.
  const TYPE = { perWord: 30, maxMs: 2000, fade: 160 };
  function typeOut(nodes, scroller) {
    if (S.typing) S.typing.finish();
    nodes = nodes.filter((n) => n.isConnected && $(".md", n));
    if (!nodes.length || reduceMotion) return;
    const runs = nodes.map((n) => {
      const words = [];
      const walk = document.createTreeWalker($(".md", n), NodeFilter.SHOW_TEXT);
      const texts = [];
      while (walk.nextNode()) if (walk.currentNode.nodeValue.trim()) texts.push(walk.currentNode);
      for (const t of texts) {
        const frag = document.createDocumentFragment();
        for (const part of t.nodeValue.split(/(\s+)/)) {
          if (!part) continue;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); continue; }
          const w = document.createElement("span");
          w.className = "tw";
          w.textContent = part;
          frag.appendChild(w);
          words.push(w);
        }
        t.replaceWith(frag);
      }
      // Everything after the text (ad cards, buttons, Copy) waits for it.
      const later = [...$(".b", n).children].filter((c) => !c.classList.contains("md"));
      later.forEach((c) => c.classList.add("tw-later"));
      return { words, later, step: Math.min(TYPE.perWord, TYPE.maxMs / Math.max(1, words.length)) };
    });
    let start = performance.now(), ri = 0, wi = 0, raf = 0, follow = true, done = false;
    const stopFollow = () => { follow = false; };
    scroller.addEventListener("wheel", stopFollow, { passive: true });
    scroller.addEventListener("touchmove", stopFollow, { passive: true });
    // Start where the reply starts, so its first words are on screen.
    const first = nodes[0];
    const top = first.offsetTop - scroller.offsetTop - 140;
    if (top < scroller.scrollTop) scroller.scrollTop = Math.max(0, top);
    const keepInView = (el) => {
      if (!follow || !el) return;
      const r = el.getBoundingClientRect(), box = scroller.getBoundingClientRect();
      const comp = $(".comp-wrap");
      const bottom = Math.min(box.bottom, comp ? comp.getBoundingClientRect().top : box.bottom) - 24;
      if (r.bottom > bottom) scroller.scrollTop += r.bottom - bottom;
    };
    const finishRun = (run) => { run.words.forEach((w) => w.classList.add("on")); run.later.forEach((c) => c.classList.remove("tw-later")); };
    const finish = () => {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      runs.slice(ri).forEach(finishRun);
      scroller.removeEventListener("wheel", stopFollow);
      scroller.removeEventListener("touchmove", stopFollow);
      document.removeEventListener("visibilitychange", onHide);
      $("#thread")?.removeEventListener("click", finish);
      if (follow) scroller.scrollTop = scroller.scrollHeight;
      if (S.typing === handle) S.typing = null;
    };
    const onHide = () => { if (document.hidden) finish(); };
    const tick = (now) => {
      if (done) return;
      if (!scroller.isConnected) return finish();
      const run = runs[ri];
      const shown = Math.min(run.words.length, Math.floor((now - start) / run.step) + 1);
      for (; wi < shown; wi++) run.words[wi].classList.add("on");
      keepInView(run.words[wi - 1]);
      if (wi >= run.words.length) {
        run.later.forEach((c) => c.classList.remove("tw-later"));
        keepInView(run.later.at(-1));
        ri++; wi = 0; start = now + 120;
        if (ri >= runs.length) return finish();
      }
      raf = requestAnimationFrame(tick);
    };
    const handle = { finish };
    S.typing = handle;
    document.addEventListener("visibilitychange", onHide);
    $("#thread")?.addEventListener("click", finish);
    raf = requestAnimationFrame(tick);
  }

  function messagesHtml(p, seen, reveal) {
    const lastAds = [...p.messages].reverse().find((m) => m.kind === "ads");
    let prev = null;
    return p.messages.map((m, i) => {
      const anim = i >= seen ? " in" : "";
      const isFirst = prev !== m.role;
      prev = m.role;
      if (m.role === "agent") {
        const photos = m.data && m.data.photos ? sentPhotos(m.data.photos.map((id) => photoUrl(id, m.data.photos.length > 2)), anim) : "";
        // Photos sent on their own have no words; older ones were saved as "New listing".
        const body = photos && m.body === "New listing" ? "" : m.body;
        if (!body) return photos;
        const long = body.length > 180;
        return `${photos}<div class="me${anim}${long ? " clamp" : ""}"><span class="tx">${esc(body)}</span>${long ? `<button class="more-btn" data-act="expand">Show more</button>` : ""}</div>${msgActs(`data-mid="${m.id}"`, m.editable, true)}`;
      }
      const mark = isFirst ? (anim ? MARK("settle") : `<img class="m" src="/static/mark.svg" alt="">`) : `<span class="m"></span>`;
      const wrap = (inner, acts = true) => `<div class="hk${anim}">${mark}<div class="b">${inner}${acts ? msgActs(`data-mid="${m.id}"`, false) : ""}</div></div>`;
      const text = md(m.body);
      if (m.kind === "ads" && m === lastAds && p.ads.length) {
        // The ad itself, big, like a post: Run ad (until it runs) and Download.
        const one = p.ads.length === 1;
        const canRun = !["running", "paused"].includes(p.listing.run);
        return wrap(`${text}<div class="adin ${reveal ? "reveal" : ""}">${p.ads.map((a) => `<button class="vc ${one ? "solo" : a.version === S.selected[p.listing.id] ? "sel" : ""}" data-pick="${a.version}">
          <canvas data-mini="${a.version}" width="1080" height="1350"></canvas></button>`).join("")}</div>
          <div class="acts">${canRun ? `<button class="btn" data-act="run">Run ad</button>` : ""}<button class="btn btn-dark" data-dl="feed">Download</button></div>`);
      }
      // A reply that changed ads shows them as they were right then, so every round of changes
      // is visible where it happened. Drawn once into a small image and kept.
      const snap = m.data && Array.isArray(m.data.snapshot) ? m.data.snapshot : null;
      if (snap && snap.length) {
        return wrap(`${text}<div class="vers ${i >= seen ? "reveal" : ""}">${snap.map((a) => {
          const key = `${m.id}:${a.version}`;
          S.snaps[key] = a;
          return `<button class="vc ${a.version === S.selected[p.listing.id] ? "sel" : ""}" data-pick="${a.version}">
            <img class="snap" data-snap="${key}" alt="Ad ${a.version}" ${S.snapImg[key] ? `src="${S.snapImg[key]}"` : ""}>${snap.length > 1 ? `<span>Ad ${a.version}</span>` : ""}</button>`;
        }).join("")}</div>`);
      }
      if (m.kind === "plan") {
        const d = m.data;
        return wrap(`${text}<div class="plan"><div class="big">${money(d.budget)} over ${d.days} days</div>
          <div class="meta">${money(d.perDay)} a day · ${esc(d.audience.location)}, ${d.audience.radiusMiles} miles · Housing category</div>
          ${m.needs_action ? `<div class="acts"><button class="btn" data-confirm="${m.id}">Approve and run</button><button class="link" data-fill="Run it with $300 over 14 days">Change the budget</button></div>` : ""}</div>`);
      }
      if (m.kind === "upgrade") {
        return wrap(`${text}${paid() ? "" : `<div class="acts"><button class="btn" data-upgrade>Upgrade</button></div>`}`);
      }
      if (m.kind === "calendar") {
        // The week's plan, laid out; the latest one can be made while it's still the plan.
        const latestCal = [...p.messages].reverse().find((x) => x.kind === "calendar") === m;
        const live = latestCal && p.listing.week_status === "proposed";
        const rows = (m.data?.plan || []).map((d) => `<div class="cal-r"><div class="cal-d"><b>${DAY[d.day]}</b><span>${esc(d.time)}</span></div><div class="cal-t"><small>${KIND_LABEL[d.kind] || ""}</small><b>${esc(d.title)}</b><p>${esc(d.idea)}</p></div></div>`).join("");
        return wrap(`${text}<div class="cal${live ? "" : " old"}">${rows}</div>${live ? `<div class="acts"><button class="btn" data-act="makeWeek">Make the week</button></div>` : ""}`);
      }
      if (m.kind === "facts") {
        // the places Hopkins found, each with the page it came from, for the agent to check
        const live = [...p.messages].reverse().find((x) => x.role === "hopkins") === m;
        const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
        const rows = (m.data?.facts || []).map((f) => `<li><div><b>${esc(f.name)}</b>${f.where ? `<span>${esc(f.where)}</span>` : ""}${f.detail ? `<p>${esc(f.detail)}</p>` : ""}</div>${f.source ? `<a href="${esc(f.source)}" target="_blank" rel="noopener">${esc(host(f.source))}</a>` : ""}</li>`).join("");
        return wrap(`${text}<ul class="facts${live ? "" : " old"}">${rows}</ul>${live ? `<div class="acts"><button class="btn" data-act="factsGo">Make it</button></div>` : ""}`);
      }
      if (m.kind === "weekready") return wrap(`${text}<div class="acts"><a class="btn" href="#/today">Open Week</a></div>`);
      if (m.kind === "check") return wrap(`<div class="note-line">${esc(m.body)}<span class="small">A wording check, not legal advice.</span></div>`, false);
      if (m.kind === "lead") return wrap(`${text}<div class="acts"><a class="sec-btn" href="#/leads">${ICON.people}Open Leads</a></div>`);
      if (m.kind === "creation") {
        // The post, carousel, story or reel itself, drawn by Studio. Every version stays where it was
        // made, like Claude's: the latest message shows the live one, an earlier message shows the
        // version it made (kept with the message), so a change never makes the first one vanish.
        const c = (p.creations || []).find((x) => x.id === m.data?.creationId);
        const latest = c && [...p.messages].reverse().find((x) => x.kind === "creation" && x.data?.creationId === c.id) === m;
        const spec = !c ? null : latest ? c.spec : m.data?.spec;
        if (!c || !spec?.slides?.length) return wrap(text);
        const key = latest ? c.id : `${c.id}@${m.id}`;
        (S.crKeys || (S.crKeys = {}))[key] = { ...c, spec };
        const reel = c.kind === "reel";
        const frames = reel ? `<canvas class="cr-reel" data-crr="${key}"></canvas>` : spec.slides.map((_, k) => `<canvas class="cr-slide${c.kind === "story" ? " tall" : ""}" data-crs="${key}:${k}"></canvas>`).join("");
        return wrap(`${text}<div class="cr${latest ? "" : " old"}"><div class="cr-strip">${frames}</div>
          <div class="acts"><button class="btn" data-act="crDownload" data-id="${key}">${reel ? "Download video" : spec.slides.length > 1 ? `Download ${spec.slides.length} images` : "Download"}</button>${spec.caption ? `<button class="link" data-act="crCopy" data-id="${key}">Copy caption</button>` : ""}</div></div>`);
      }
      return wrap(text);
    }).join("");
  }

  function adFor(version) {
    return S.current.ads.find((a) => a.version === version);
  }

  function renderOpts(ad, format, l = S.current.listing) {
    const b = S.me.workspace.brand;
    return {
      ad, brand: b, format,
      photo: photoUrl(ad.photo_id),
      logo: b.logo_id ? photoUrl(b.logo_id) : null,
      face: S.me.user.avatar_id ? photoUrl(S.me.user.avatar_id) : null,
      watermark: false,
      price: homePrice(l, true),
      place: l.area || l.city || "",
    };
  }

  // Posts, carousels, stories and reels in the chat (web/studio.js).
  function studioOpts(c) {
    const b = S.me.workspace.brand;
    return { kind: c.kind, photos: (S.current?.photos || []).map((p) => photoUrl(p.id)), portrait: S.me.user.avatar_id ? photoUrl(S.me.user.avatar_id) : null, agent: b.agent_name || S.me.user.name || "", footer: b.business || "" };
  }
  function drawCreations() {
    (S.players || []).forEach((stop) => stop());
    S.players = [];
    const find = (id) => S.crKeys?.[id] || (S.current?.creations || []).find((x) => x.id === id);
    for (const el of $$("canvas[data-crs]")) {
      const [id, k] = el.dataset.crs.split(":");
      const c = find(id);
      if (c) Studio.drawSlide(el, c.spec, Number(k), studioOpts(c));
    }
    for (const el of $$("canvas[data-crr]")) {
      const c = find(el.dataset.crr);
      if (c) Studio.playReel(el, c.spec, studioOpts(c)).then((stop) => S.players.push(stop));
    }
  }
  async function saveFiles(files) {
    if (navigator.canShare && navigator.canShare({ files })) {
      try { await navigator.share({ files }); return; } catch (err) { if (err.name === "AbortError") return; }
    }
    for (const f of files) {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(f); a.download = f.name; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      await new Promise((r) => setTimeout(r, 350));
    }
  }
  async function downloadCreation(id, btn) {
    const c = S.crKeys?.[id] || (S.current?.creations || []).find((x) => x.id === id);
    if (!c) return;
    const name = (c.spec.title || c.kind).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || c.kind;
    const label = btn.textContent;
    btn.disabled = true;
    try {
      if (c.kind === "reel") {
        btn.textContent = "Preparing video";
        const blob = await Studio.recordReel(c.spec, studioOpts(c));
        // every reel comes with its cover
        const cv = document.createElement("canvas");
        await Studio.drawSlide(cv, c.spec, 0, studioOpts(c));
        const cover = await new Promise((r) => cv.toBlob(r, "image/png"));
        await saveFiles([new File([blob], `${name}.${blob.type.includes("mp4") ? "mp4" : "webm"}`, { type: blob.type }), new File([cover], `${name}-cover.png`, { type: "image/png" })]);
      } else {
        const files = [];
        for (let k = 0; k < c.spec.slides.length; k++) {
          const cv = document.createElement("canvas");
          await Studio.drawSlide(cv, c.spec, k, studioOpts(c));
          const blob = await new Promise((r) => cv.toBlob(r, "image/png"));
          files.push(new File([blob], `${name}-${k + 1}.png`, { type: "image/png" }));
        }
        await saveFiles(files);
      }
    } catch (err) { toast(err.message || "Something went wrong. Please try again."); }
    btn.disabled = false; btn.textContent = label;
  }

  function drawMiniCards() {
    drawCreations();
    $$("canvas[data-mini]").forEach((c) => {
      const ad = adFor(Number(c.dataset.mini));
      if (ad) Creative.render(c, renderOpts(ad, "feed"));
    });
    // Snapshots render one at a time through one canvas into small JPEGs, so a long chat with
    // many rounds of changes stays light on a phone.
    for (const img of $$("img[data-snap]:not([src])")) {
      const key = img.dataset.snap;
      S.snapQueue = S.snapQueue.then(async () => {
        if (!S.snapImg[key]) {
          const big = S.snapCanvas || (S.snapCanvas = document.createElement("canvas"));
          await Creative.render(big, renderOpts(S.snaps[key], "feed"));
          const small = document.createElement("canvas");
          small.width = 432; small.height = 540;
          small.getContext("2d").drawImage(big, 0, 0, 432, 540);
          S.snapImg[key] = small.toDataURL("image/jpeg", 0.85);
        }
        for (const el of $$(`img[data-snap="${key}"]`)) el.src = S.snapImg[key];
      }).catch(() => {});
    }
  }

  function pick(version) {
    const l = S.current.listing;
    S.selected[l.id] = version;
    $$(".vc").forEach((c) => c.classList.toggle("sel", Number(c.dataset.pick) === version));
    buzz(5);
    drawPreview();
  }

  function drawPreview() {
    const p = S.current, l = p.listing, pv = $("#pv");
    if (!pv) return;
    // No ads yet: no panel at all, the chat has the screen (Ismael, 2026-10-28).
    $("#lv")?.classList.toggle("noads", !p.ads.length);
    if (!p.ads.length) { pv.innerHTML = ""; return; }
    const v = S.selected[l.id];
    const ad = adFor(v) || p.ads[0];
    const b = S.me.workspace.brand;
    const handle = (b.instagram || b.business || "your.brand").replace(/^@/, "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9._]/g, "").slice(0, 30) || "your.brand";
    const ava = b.logo_id ? `style="background:#fff url(${photoUrl(b.logo_id)}) center/cover no-repeat"` : `style="background:${esc(b.primary || "#1F2A36")}"`;
    const issues = ad.issues || [];
    const short = ad.primary_text.length > 125;
    // Instagram's blue verified badge after the handle, wherever an account is shown (Ismael, 2026-10-25).
    const tick = `<svg class="verified" viewBox="0 0 40 40" aria-label="Verified"><path fill="#0095F6" fill-rule="evenodd" d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Zm7.415 11.225 2.254 2.287-11.43 11.5-6.835-6.93 2.244-2.258 4.587 4.581 9.18-9.18Z"/></svg>`;
    const feed = `<div class="igc"><div class="h"><i class="ava" ${ava}></i><div><span class="hn">${esc(handle)}${tick}</span><span>Sponsored</span></div></div><canvas id="big" width="1080" height="1350"></canvas>
      <div class="cta"><span>${esc(ad.cta)}</span><span>›</span></div>
      <div class="cp" id="cp"><b>${esc(handle)}${tick}</b>${esc(short ? ad.primary_text.slice(0, 125).replace(/\s\S*$/, "") : ad.primary_text)}${short ? '<span class="more" data-act="more">… more</span>' : ""}</div></div>`;
    const story = `<div class="story"><canvas id="big" width="1080" height="1920"></canvas><div class="bar"><i></i></div><div class="who"><i class="ava" ${ava}></i>${esc(handle)}${tick} <span>Sponsored</span></div><div class="go">${esc(ad.cta)}</div></div>`;
    const tabs = `<div class="seg" data-seg="ver">${p.ads.map((a) => `<button data-pick="${a.version}" class="${a.version === v ? "on" : ""}">Ad ${a.version}</button>`).join("")}</div>`;
    const fmt = `<div class="seg" data-seg="fmt"><button data-fmt="feed" class="${S.format === "feed" ? "on" : ""}" title="Feed post">Feed</button><button data-fmt="story" class="${S.format === "story" ? "on" : ""}" title="Story">Story</button></div>`;
    // On a phone the two formats are drawn as their shapes, so the ad names get the room.
    const shape = (w, h) => `<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><rect x="${10 - w / 2}" y="${10 - h / 2}" width="${w}" height="${h}" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>`;
    const fmtIcons = `<div class="seg fmt-icons" data-seg="fmt"><button data-fmt="feed" class="${S.format === "feed" ? "on" : ""}" aria-label="Feed post">${shape(12, 15)}</button><button data-fmt="story" class="${S.format === "story" ? "on" : ""}" aria-label="Story">${shape(9.5, 17)}</button></div>`;
    pv.innerHTML = `<div class="pvh">${tabs}${fmt}</div><div class="mbar">${tabs}${fmtIcons}</div>
      <div class="stage" id="stage">${S.format === "feed" ? feed : story}<div class="dots">${p.ads.map((a) => `<i class="${a.version === v ? "on" : ""}"></i>`).join("")}</div></div>
      <div class="pvb">
        <div class="actrow lg"><button class="btn" data-act="run">Run ad</button><button class="sec-btn" data-act="style" aria-label="Style">${ICON.brush}<span>Style</span></button><button class="sec-btn" data-act="dlmenu" aria-label="Download">${ICON.down}<span>Download</span></button></div>
        ${issues.length ? `<div class="status bad">${ICON.alert}<button data-act="issues">${issues.length} wording ${issues.length === 1 ? "issue" : "issues"} to look at</button></div>` : ""}
        ${issues.length && S.showIssues ? `<div class="issues">${issues.map((i) => `"${esc(i.term)}" ${esc(i.why)}${i.suggestion ? `. Try "${esc(i.suggestion)}"` : ""}.`).join("<br>")}</div>` : ""}
      </div>`;
    Creative.render($("#big"), renderOpts(ad, S.format));
    settleSegs();
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

  // The listing's photos: tap one to use it on this version. The number is the one to use in
  // the chat ("use photo 3"); what's in each photo is worked out behind the scenes.
  // ---------- the Style sheet: how an ad looks ----------
  // Every change shows on the ad straight away. "This one" or "All 3" says which versions.
  const SWATCH = {
    bg: ["#111111", "#1F2A44", "#2F5D46", "#6D1F2C", "#5B4873", "#6B4A35", "#F4EBDD", "#FFFFFF"],
    accent: ["#D7AE62", "#F4EBDD", "#FFFFFF", "#8A9A7B", "#E8B4C0", "#9CC3E6", "#111111"],
    text: ["#FBF8F3", "#FFFFFF", "#111111", "#2A0F14", "#D7AE62"],
  };
  function styleSheet() {
    const l = S.current.listing;
    const ad = adFor(S.selected[l.id]) || S.current.ads[0];
    const st = ad.style || {};
    const b = S.me.workspace.brand;
    const layout = st.layout || Creative.LAYOUT_FOR[ad.pattern] || "fade";
    const sw = (key, list, brandColour) => `<div class="sw">${[brandColour ? `<button class="dot brand ${!st[key] ? "on" : ""}" data-st="${key}" data-v="" style="--c:${esc(brandColour)}" title="Brand"></button>` : `<button class="dot auto ${!st[key] ? "on" : ""}" data-st="${key}" data-v="" title="Automatic">A</button>`]
      .concat(list.map((c) => `<button class="dot ${String(st[key] || "").toUpperCase() === c ? "on" : ""}" data-st="${key}" data-v="${c}" style="--c:${c}"></button>`)).join("")}
      <label class="dot pick" title="Any colour" style="--c:${esc(st[key] || "#888888")}"><input type="color" data-stpick="${key}" value="${esc(st[key] || brandColour || "#888888")}"></label></div>`;
    const chips = (key, opts, cur) => `<div class="stc">${opts.map(([v, label]) => `<button class="${cur === v ? "on" : ""}" data-st="${key}" data-v="${v}">${label}</button>`).join("")}</div>`;
    return `<div class="st-head"><canvas class="st-prev" id="stPrev" width="1080" height="1350" aria-hidden="true"></canvas><b>Style</b><div class="seg st-who" data-seg="stwho"><button class="${S.styleAll ? "" : "on"}" data-stwho="one">This ad</button><button class="${S.styleAll ? "on" : ""}" data-stwho="all">All ${S.current.ads.length}</button></div></div>
      <div class="st-row"><span>Layout</span>${chips("layout", [["fade", "Fade"], ["top", "Top"], ["split", "Split"], ["card", "Card"], ["frame", "Frame"]], layout)}</div>
      <div class="st-row"><span>Background</span>${sw("bg", SWATCH.bg, b.primary || "#1F2A36")}</div>
      <div class="st-row"><span>Label</span>${sw("accent", SWATCH.accent, b.accent || "#C8A96A")}</div>
      <div class="st-row"><span>Text</span>${sw("text", SWATCH.text, null)}</div>
      <div class="st-row"><span>Font</span>${chips("font", FONT_CHOICES, st.font || b.font || "modern")}</div>
      <div class="st-row"><span>Text size</span><div class="stc"><button data-stsize="-1" aria-label="Smaller">A−</button><button data-stsize="1" aria-label="Bigger">A+</button></div>${chips("align", [["left", "Left"], ["center", "Center"]], st.align || "left")}</div>
      <div class="st-row"><span>Photo</span>${chips("focus", [["top", "Top"], ["center", "Middle"], ["bottom", "Bottom"]], st.focus || "center")}</div>
      <div class="st-row"><span>Fade</span>${chips("fade", [["light", "Light"], ["normal", "Normal"], ["strong", "Strong"]], st.fade || "normal")}</div>
      <button class="st-reset" data-streset="1">Reset to brand style</button>
      <p class="st-more">For other changes, ask Hopkins in the chat.</p>`;
  }
  // The ad as it now looks, small, at the top of the sheet, so a change shows where your eyes are.
  function drawStylePreview() {
    const c = $("#stPrev");
    const ad = S.current && adFor(S.selected[S.current.listing.id]);
    if (c && ad) Creative.render(c, renderOpts(ad, "feed"));
  }

  // The Style sheet changes the ad on the spot (Ismael, 2026-10-27: it waited for the server,
  // slow on Render, then redrew the whole screen). The tapped option and the preview at the top
  // of the sheet change on the same frame; the big preview and the chat cards follow on the
  // next one; the server saves in the background, one change after another, and only its last
  // answer is kept. If a save fails, the listing reloads as it really is.
  const LOOK_KEYS = ["bg", "accent", "text", "font", "layout", "align", "focus", "fade", "size"];
  let styleSeq = 0, styleSave = Promise.resolve();
  function applyStyle(body) {
    const l = S.current.listing;
    const versions = S.styleAll ? S.current.ads.map((a) => a.version) : [S.selected[l.id]];
    for (const ad of S.current.ads.filter((a) => versions.includes(a.version))) {
      const st = { ...(ad.style || {}) };
      if (body.style.reset) LOOK_KEYS.forEach((k) => delete st[k]);
      for (const [k, v] of Object.entries(body.style)) {
        if (k === "reset") continue;
        if (v == null || v === "") delete st[k];
        else st[k] = typeof v === "string" && v.startsWith("#") ? v.toUpperCase() : v;
      }
      if (body.sizeStep) st.size = Math.round(Math.min(1.4, Math.max(0.7, (Number(st.size) || 1) + body.sizeStep)) * 100) / 100;
      ad.style = st;
    }
    buzz(5);
    if ($("#pop").classList.contains("on")) { const sc = $("#pop").scrollTop; $("#pop").innerHTML = `<div class="grab"></div>${styleSheet()}`; $("#pop").scrollTop = sc; settleSegs(); drawStylePreview(); }
    requestAnimationFrame(() => setTimeout(() => { if (S.current?.listing.id === l.id) { drawPreview(); drawMiniCards(); } }, 0));
    const seq = ++styleSeq;
    styleSave = styleSave
      .then(() => api(`/api/listings/${l.id}/style`, { method: "PATCH", body: { versions, ...body } }))
      .then((next) => { if (seq === styleSeq && S.current?.listing.id === l.id) S.current = next; })
      .catch((err) => { toast(err.message); if (S.current?.listing.id === l.id) viewListing(l.id, true); });
  }


  async function refreshSide() {
    await Promise.all([loadMe(), loadListings(), loadInbox()]);
    drawSide();
    // The Listings screen shows the unread dots too, so it redraws when a reply lands.
    if (location.hash.startsWith("#/listings") && !S.selecting) viewListings();
  }

  // ---------- Leads ----------

  const STATUS = { new: "New", contacted: "Contacted", showing: "Showing booked", offer: "Offer", closed: "Closed", not_a_fit: "Not a fit" };
  // On a rental, the offer step is the application (2026-10-29).
  const statusName = (x, k) => (k === "offer" && x.deal === "rent" ? "Application" : STATUS[k]);

  // Opens at once from what's already here, then quietly takes the fresh copy (redrawn only if it
  // changed and nobody is searching).
  async function viewLeads() {
    const my = current();
    if (S.leadsCache) await drawLeads(S.leadsCache, my);
    else slowSkeleton(my, "Leads");
    const { leads } = await api("/api/leads");
    if (my !== current()) return;
    const same = JSON.stringify(leads) === JSON.stringify(S.leadsCache);
    S.leadsCache = leads;
    if (!same && !$("#lq")?.value) await drawLeads(leads, my);
  }
  async function drawLeads(all, my) {
    // From Today's "Leads this week": only this week's, the same week Today counts.
    const week = location.hash === "#/leads/week";
    if (week && !S.weekFrom) await loadInbox();
    const leads = week ? all.filter((x) => x.created_at >= S.weekFrom) : all;
    const fresh = leads.filter((x) => x.status === "new").length;
    const tel = (n) => n.replace(/[^\d+]/g, "");
    // Each lead: the name, where it came from (the address and the ad) and how long ago, nothing
    // else (Ismael, 2026-11-01).
    const item = (x) => `<div class="lead ${x.status === "new" ? "new" : ""}"><span class="av">${esc(x.name.split(" ").map((w) => w[0]).join("").slice(0, 2))}</span>
      <div class="tx"><b>${esc(x.name)}</b>
      <div class="small">${esc(x.address || x.area || "Lead page")}${x.version ? ` · Ad ${x.version}` : ""} · ${ago(x.created_at)}</div>
      <div class="acts">${x.phone ? `<a href="tel:${esc(tel(x.phone))}">${ICON.phone}Call</a><a href="sms:${esc(tel(x.phone))}">${ICON.msg}Text</a>` : ""}${x.email ? `<a href="mailto:${esc(x.email)}">${ICON.mail}Email</a>` : ""}
      <select data-lead="${x.id}" aria-label="Status">${Object.keys(STATUS).map((k) => `<option value="${k}" ${x.status === k ? "selected" : ""}>${statusName(x, k)}</option>`).join("")}</select></div></div></div>`;
    main.innerHTML = `${mtop("Leads")}<div class="page"><div class="wrap"><div class="head head-row"><div><h1>Leads</h1>${leads.length && !week ? `<p class="lede">${leads.length} in total${fresh ? `, ${fresh} new` : ""}.</p>` : ""}</div>
      ${leads.length ? `<button class="sel-btn round" data-act="leadSearch" aria-label="Search leads">${ICON.search}</button>` : ""}</div>
      ${week ? `<a class="fchip" href="#/leads">This week ${ICON.x}</a>` : ""}
      ${leads.length ? `<div class="lsearch" id="lsearch" hidden>${ICON.search}<input type="search" id="lq" placeholder="Search leads" autocomplete="off" enterkeyhint="search"><button data-act="leadSearchClose">Cancel</button></div>
      <div class="list" id="leadList" style="border-top:0">${leads.map(item).join("")}</div><p class="lnone" id="lnone" hidden></p>`
        : week && all.length ? `<p class="cnone">No leads this week.</p>` : `<div class="empty"><div class="ic">${ICON.people}</div><b>No Leads Yet</b>Each lead also shows the ad it came from.</div>`}</div></div>`;
    $$("[data-lead]").forEach((s) => s.addEventListener("change", async () => {
      await api(`/api/leads/${s.dataset.lead}`, { method: "PATCH", body: { status: s.value } });
      s.closest(".lead").classList.toggle("new", s.value === "new");
      buzz(6);
      toast("Saved");
    }));
    // Search: name, phone, email, home, what they asked and the status, as they type.
    const words = leads.map((x) => [x.name, x.email, x.phone, x.phone && tel(x.phone), x.address, x.area, x.note, statusName(x, x.status), x.version && `Ad ${x.version}`].filter(Boolean).join(" ").toLowerCase());
    const rows = $$("#leadList .lead");
    $("#lq")?.addEventListener("input", (e) => {
      const q = e.target.value.trim().toLowerCase();
      const parts = q.split(/\s+/).filter(Boolean);
      let shown = 0;
      rows.forEach((r, i) => { const hit = parts.every((p) => words[i].includes(p) || (/\d/.test(p) && words[i].includes(p.replace(/[^\d+]/g, "")))); r.hidden = !hit; if (hit) shown++; });
      $("#lnone").hidden = Boolean(shown);
      $("#lnone").textContent = shown ? "" : `No leads match "${e.target.value.trim()}".`;
    });
  }

  function leadSearch(open) {
    const box = $("#lsearch");
    if (!box) return;
    box.hidden = !open;
    $("[data-act=leadSearch]").hidden = open;
    const q = $("#lq");
    if (open) { q.focus(); return; }
    q.value = "";
    q.dispatchEvent(new Event("input"));
  }

  // ---------- Monday report ----------

  // ---------- Report: one Monday to Sunday week at a time ----------

  // Weeks run Monday 00:00 to the next Monday 00:00 on the phone's own clock. Any week from the
  // one the account started in to this one can be picked, with the arrows or the calendar.
  const dayStart = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const mondayOf = (d) => addDays(dayStart(d), -((d.getDay() + 6) % 7));
  const sameDay = (a, b) => a.getTime() === b.getTime();
  const firstMonday = () => mondayOf(S.me.workspace.created_at ? new Date(S.me.workspace.created_at) : new Date());
  const DM = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });
  const MONTH_FIRST = DM.formatToParts(new Date(2026, 0, 5))[0].type === "month";
  function weekLabel(mon) {
    const now = mondayOf(new Date());
    if (sameDay(mon, now)) return "This week";
    if (sameDay(mon, addDays(now, -7))) return "Last week";
    const end = addDays(mon, 6);
    const part = (d, t) => DM.formatToParts(d).find((x) => x.type === t).value;
    const year = end.getFullYear() !== new Date().getFullYear() ? ` ${end.getFullYear()}` : "";
    if (mon.getMonth() === end.getMonth()) {
      const m = part(mon, "month");
      return (MONTH_FIRST ? `${m} ${mon.getDate()} to ${end.getDate()}` : `${mon.getDate()} to ${end.getDate()} ${m}`) + year;
    }
    return `${DM.format(mon)} to ${DM.format(end)}${year}`;
  }
  S.repCache = new Map();
  S.repSeq = 0;
  function reportFor(mon) {
    const key = mon.toISOString();
    const current = sameDay(mon, mondayOf(new Date()));
    // Past weeks don't change, so they're kept; this week is always fetched fresh.
    if (!current && S.repCache.has(key)) return Promise.resolve(S.repCache.get(key));
    return api(`/api/report?from=${encodeURIComponent(key)}&to=${encodeURIComponent(addDays(mon, 7).toISOString())}`).then((r) => { S.repCache.set(key, r); return r; });
  }

  async function viewReport() {
    const my = current();
    const now = mondayOf(new Date());
    if (!S.repMonday || S.repMonday > now || S.repMonday < firstMonday()) { S.repMonday = now; S.repFollow = true; }
    const mon = S.repMonday;
    const seq = ++S.repSeq;
    const cached = S.repCache.get(mon.toISOString());
    // A week seen before shows at once (this week refreshes behind it); a new one shows the
    // header straight away with the numbers loading under it.
    if (cached) drawReport(cached, mon);
    else if (!main.querySelector(".page[data-report]")) slowSkeleton(my, "Report");
    else reportHead(mon, true);
    let r;
    try { r = await reportFor(mon); }
    catch (err) { if (seq === S.repSeq && !cached) toast(err.message); return; }
    if (my !== current() || seq !== S.repSeq) return;
    drawReport(r, mon);
    // The week before is one tap away: fetch it now so the arrow is instant.
    const prev = addDays(mon, -7);
    if (prev >= firstMonday() && !S.repCache.has(prev.toISOString())) setTimeout(() => reportFor(prev).catch(() => {}), 300);
  }

  function reportHead(mon, loading = false) {
    const now = mondayOf(new Date());
    const head = main.querySelector(".rp-week");
    const html = `<button class="icon-btn rp-prev" data-act="repPrev" aria-label="Week before" ${mon <= firstMonday() ? "disabled" : ""}>${ICON.chevr}</button>
      <button class="rp-wl" data-act="repCal" aria-label="Select a week">${esc(weekLabel(mon))}${ICON.chev}</button>
      <button class="icon-btn" data-act="repNext" aria-label="Week after" ${mon >= now ? "disabled" : ""}>${ICON.chevr}</button>`;
    if (head) { head.innerHTML = html; main.querySelector(".page[data-report]")?.classList.toggle("loading", loading); }
    return html;
  }

  function drawReport(r, mon) {
    S.report = r;
    const today = dayStart(new Date());
    const thisWeek = sameDay(mon, mondayOf(today));
    const days = [...Array(7)].map((_, i) => addDays(mon, i));
    const counts = days.map(() => 0);
    for (const t of r.times || []) {
      const at = new Date(t).getTime();
      const i = days.findLastIndex((d) => at >= d.getTime());
      counts[Math.min(6, Math.max(0, i))]++;
    }
    const peak = Math.max(1, ...counts);
    const bars = days.map((d, i) => {
      const isToday = thisWeek && sameDay(d, today), later = thisWeek && d > today;
      return `<div class="rp-day${isToday ? " today" : ""}${later ? " later" : ""}"><span class="rp-bar"><i style="height:${counts[i] ? Math.max(8, (counts[i] / peak) * 100) : 0}%"></i></span><span class="rp-dl">${esc(d.toLocaleDateString(undefined, { weekday: "narrow" }))}</span></div>`;
    }).join("");
    // A finished week: up or down on the week before it, as a percentage, like Screen Time or
    // Shopify. The week still going has no percentage (half a week against a whole one, or
    // against a few days of last week, both read wrong): it shows last week's total beside it.
    const prev = r.lastWeek || 0;
    const pct = prev ? Math.round(((r.total - prev) / prev) * 100) : null;
    const delta = r.soFar ? `<span class="rp-vs">Last week <b>${r.lastWeekTotal || 0}</b></span>`
      : !r.total && !prev ? ""
        : pct === null ? `<span class="rp-delta up">${ICON.up}Up from 0</span> vs the week before`
          : pct > 0 ? `<span class="rp-delta up">${ICON.up}${pct}%</span> vs the week before`
            : pct < 0 ? `<span class="rp-delta down">${ICON.down}${-pct}%</span> vs the week before`
              : `<span class="rp-delta">No change</span> vs the week before`;
    const sub = delta;
    // Top-Performing Ads: the three ads with the most leads this week, each drawn as the real ad at
    // full size like in the chat, no ranks, names or counts (Ismael, 2026-11-01). A tap opens it.
    const top = (r.topAds || []).filter((a) => a.ad);
    const winning = top.length ? `<section class="ta"><h3>Top-Performing Ads</h3><div class="ta-row">${top.map((a, i) => `<a class="ta-card" href="#/l/${a.listing_id}" data-act="openAd" data-id="${a.listing_id}" data-v="${a.version}">
        <canvas class="ta-ad" data-top="${i}" width="1080" height="1350"></canvas></a>`).join("")}</div></section>` : "";
    S.topAds = top;

    main.innerHTML = `${mtop("Report")}<div class="page" data-report><div class="wrap">
      <div class="head"><h1>Report</h1><div class="rp-week">${reportHead(mon)}</div></div>
      <section class="rp-sum"><div class="rp-big"><b>${r.total}</b> ${r.total === 1 ? "Lead" : "Leads"}</div>${sub ? `<p class="rp-sub">${sub}</p>` : ""}
        <div class="rp-chart" role="img" aria-label="Leads each day: ${counts.join(", ")}">${bars}</div></section>
      ${winning}
      ${r.listings.length ? boardHtml(r) : ""}
    </div></div>`;
    for (const c of $$("canvas[data-top]")) {
      const t = S.topAds[Number(c.dataset.top)];
      if (t) Creative.render(c, renderOpts(t.ad, "feed", t.listing || {})).catch(() => {});
    }
  }

  // The listings, ranked: best first by what's picked (leads, showings, cost per lead, or newest),
  // filtered to all, running or with leads. The pick is remembered on this device.
  const SORTS = [["leads", "Most leads"], ["showings", "Most showings"], ["cpl", "Lowest cost per lead"], ["newest", "Most recent"]];
  const FILTERS = [["all", "All"], ["active", "Active"], ["inactive", "Inactive"]];
  try { S.repSort = localStorage.getItem("hk.repSort") || "leads"; S.repFilter = localStorage.getItem("hk.repFilter") || "all"; } catch { S.repSort = "leads"; S.repFilter = "all"; }
  if (!SORTS.some(([k]) => k === S.repSort)) S.repSort = "leads";
  if (!FILTERS.some(([k]) => k === S.repFilter)) S.repFilter = "all";
  function boardHtml(r) {
    const made = (x) => (S.listings.find((l) => l.id === x.id) || {}).created_at || "";
    // Active: its ads are running. Inactive: they aren't (not approved yet, or sold).
    const pass = { all: () => true, active: (x) => x.running && x.status !== "sold", inactive: (x) => !x.running || x.status === "sold" };
    const count = (k) => r.listings.filter(pass[k]).length;
    const by = S.repSort;
    const rows = r.listings.filter(pass[S.repFilter]).sort((a, b) =>
      by === "newest" ? made(b).localeCompare(made(a))
        : by === "cpl" ? (a.cpl == null) - (b.cpl == null) || (a.cpl ?? 0) - (b.cpl ?? 0) || b.leads - a.leads
          : by === "showings" ? b.showings - a.showings || b.leads - a.leads
            : b.leads - a.leads || b.showings - a.showings || b.allLeads - a.allLeads);
    const value = (x) => (by === "showings" ? x.showings : by === "cpl" ? x.cpl : x.leads);
    const best = by === "cpl" ? Math.min(...rows.map((x) => x.cpl).filter((v) => v != null)) : Math.max(1, ...rows.map((x) => value(x) || 0));
    const width = (x) => { const v = value(x); if (!v) return 0; return Math.max(4, by === "cpl" ? (best / v) * 100 : (v / best) * 100); };
    const ranked = by !== "newest";
    const row = (x, i) => {
      const v = value(x), lead = ranked && i === 0 && v;
      const medal = ranked && v && i < 3 ? ` m${i + 1}` : "";
      const unit = by === "showings" ? (v === 1 ? "showing" : "showings") : by === "cpl" ? (v != null ? "a lead" : "") : v === 1 ? "lead" : "leads";
      // Greyed only when nothing's happening: no Leads and no ads running. An active listing keeps
      // its colour even before its first Lead (Ismael, 2026-10-29).
      return `<button class="rb-row${v || pass.active(x) ? "" : " zero"}" data-act="reportListing" data-id="${x.id}">
        ${ranked ? `<span class="rb-rank${medal}">${v ? i + 1 : ""}</span>` : ""}
        <i class="th cover-mini"></i>
        <span class="rb-mid"><b>${esc(listingName(S.listings.find((l) => l.id === x.id) || { title: x.name }))}</b>
          <span class="rb-track"><i class="${lead ? "top" : ""}" style="width:${width(x)}%"></i></span></span>
        <span class="rb-n"><b>${by === "cpl" ? (v != null ? esc(money(v)) : "") : v || 0}</b><em>${unit}</em></span></button>`;
    };
    return `<section class="rb" id="board"><div class="rb-head"><h3>Ads</h3><button class="rb-sort" data-act="repSort">${esc(SORTS.find(([k]) => k === by)[1])}${ICON.chev}</button></div>
      <div class="rb-filters">${FILTERS.map(([k, label]) => `<button class="${S.repFilter === k ? "on" : ""}" data-act="repFilter" data-k="${k}">${label}<span>${count(k)}</span></button>`).join("")}</div>
      <div class="rb-list">${rows.length ? rows.map(row).join("") : `<p class="rb-empty">None this week.</p>`}</div></section>`;
  }
  const redrawBoard = () => { const b = $("#board"); if (b && S.report) b.outerHTML = boardHtml(S.report); };

  // Every week since the account started, as a calendar: months newest first, each row a Monday to
  // Sunday week. A tap anywhere on a row picks that week.
  function weekCalendar(t) {
    const today = dayStart(new Date()), first = firstMonday(), last = mondayOf(today);
    const wd = [...Array(7)].map((_, i) => addDays(last, i).toLocaleDateString(undefined, { weekday: "narrow" }));
    const months = [];
    for (let m = new Date(today.getFullYear(), today.getMonth(), 1); m >= new Date(first.getFullYear(), first.getMonth(), 1) && months.length < 36; m = new Date(m.getFullYear(), m.getMonth() - 1, 1)) months.push(m);
    const month = (m) => {
      const end = new Date(m.getFullYear(), m.getMonth() + 1, 0);
      let rows = "";
      for (let mon = mondayOf(m); mon <= end; mon = addDays(mon, 7)) {
        const ok = mon >= first && mon <= last;
        const on = sameDay(mon, S.repMonday);
        const cells = [...Array(7)].map((_, i) => { const d = addDays(mon, i); return `<span class="${d.getMonth() !== m.getMonth() ? "out" : ""}${sameDay(d, today) ? " now" : ""}">${d.getDate()}</span>`; }).join("");
        rows += `<button class="cal-wk${on ? " on" : ""}" data-act="repPick" data-mon="${mon.getTime()}" ${ok ? "" : "disabled"}>${cells}</button>`;
      }
      return `<div class="cal-m"><b>${esc(m.toLocaleDateString(undefined, { month: "long", year: "numeric" }))}</b><div class="cal-wd">${wd.map((x) => `<span>${esc(x)}</span>`).join("")}</div>${rows}</div>`;
    };
    openPop(t, `<div class="cal">${months.map(month).join("")}</div>`);
    // Open on the week that's showing.
    $("#pop .cal-wk.on")?.scrollIntoView({ block: "center" });
  }

  // One listing's week, and its spend, in a sheet: the only place spend is typed in until Meta
  // fills it.
  function reportSheet(t) {
    const x = S.report && S.report.listings.find((l) => l.id === t.dataset.id);
    if (!x) return;
    openPop(t, `<div class="note"><b>${esc(x.name)}</b>${esc(weekLabel(S.repMonday))}</div>
      <div class="rp-mini"><div><b>${x.leads}</b>${x.leads === 1 ? "Lead" : "Leads"}</div><div><b>${x.showings}</b>${x.showings === 1 ? "Showing" : "Showings"}</div><div><b>${x.cpl != null ? money(x.cpl) : "Not set"}</b>Per lead</div></div>
      <form class="spendf" data-id="${x.id}"><label for="spendIn">Ad spend to date</label><div class="row-s"><input id="spendIn" type="number" inputmode="decimal" min="0" step="1" value="${x.spend || ""}" placeholder="$0"><button class="btn" type="submit">Save</button></div>
      <p class="small">Available once Meta is connected.</p></form>
      <div class="sep"></div><a href="#/l/${x.id}">${ICON.eye}Open chat</a>`, { top: true });
  }

  // ---------- Brand ----------

  // The fonts an ad can use, in the order they're offered (Ismael, 2026-10-27).
  const FONT_CHOICES = [["modern", "Modern"], ["classic", "Classic"], ["elegant", "Elegant"], ["editorial", "Editorial"], ["bold", "Bold"], ["minimal", "Minimal"]];
  // Quick picks that look good on real listing photos: a main color with an accent that suits it.

  // ---------- Settings ----------

  // Meta (Facebook and Instagram): connect once, pick the ad account and the Page the ads run
  // under. One connection covers both apps.
  function metaGroup() {
    const m = S.me.meta || {};
    if (!m.available) return "";
    if (!m.connected) return `<div class="group"><h4>Meta</h4><p class="small">Facebook and Instagram ads.</p>
      <div style="margin-top:12px"><a class="btn" href="/api/meta/connect">${m.expired ? "Reconnect" : "Connect"}</a></div></div>`;
    return `<div class="group" id="metaGroup"><h4>Meta</h4>
      <div class="grid2"><div class="fld"><label for="metaAcct">Ad account</label><select id="metaAcct"><option value="">${esc(m.adAccountName || "Choose…")}</option></select></div>
      <div class="fld"><label for="metaPage">Facebook Page</label><select id="metaPage"><option value="">${esc(m.pageName || "Choose…")}</option></select></div></div>
      <div style="margin-top:12px"><button class="btn" data-act="metaOff">Disconnect</button></div></div>`;
  }
  async function fillMeta() {
    if (!S.me.meta?.connected || !$("#metaGroup")) return;
    const m = await api("/api/meta").catch(() => null);
    if (!m || !$("#metaGroup")) return;
    // Meta wouldn't answer with this login (expired or removed): say so, with the way back.
    if (m.error) {
      $("#metaGroup").insertAdjacentHTML("beforeend", `<p class="small" style="margin-top:10px">Connection expired. <a class="link" href="/api/meta/connect">Reconnect</a></p>`);
      return;
    }
    const fill = (sel, items, current) => {
      const el = $(sel);
      el.innerHTML = `${items.some((x) => x.id === current) ? "" : `<option value="">Choose…</option>`}${items.map((x) => `<option value="${esc(x.id)}" ${x.id === current ? "selected" : ""}>${esc(x.name)}</option>`).join("")}`;
    };
    fill("#metaAcct", m.adAccounts || [], m.adAccountId);
    fill("#metaPage", m.pages || [], m.pageId);
    const save = async (body) => { S.me.meta = await api("/api/meta", { method: "PATCH", body }); toast("Saved"); if (location.hash.startsWith("#/setup")) viewSetup(); };
    $("#metaAcct").addEventListener("change", (e) => e.target.value && save({ adAccountId: e.target.value }));
    $("#metaPage").addEventListener("change", (e) => e.target.value && save({ pageId: e.target.value }));
  }

  // The agent's CRM: each new Lead goes there as it comes in, by their Follow Up Boss API key.
  // Optional (Ismael, 2026-11-01). The webhook stays in the backend but has no fields on screen; an
  // old one still shows so it can be removed.
  function crmGroup(fld, { optional = false } = {}) {
    const c = S.me.crm || {};
    const failed = c.last && !c.last.ok ? `<p class="small warn" style="margin-top:10px">The last lead didn't reach ${esc(c.last.failed.map((f) => f === "webhook" ? "the webhook" : f).join(" or "))}.</p>` : "";
    const fub = c.fub
      ? `<div class="crm-row"><div><b>${esc(c.fubName || "Follow Up Boss")}</b><p class="small">Connected</p></div><button class="link" data-act="crmOff" data-which="fub">Disconnect</button></div>`
      : `<div style="display:flex;flex-direction:column;gap:12px">${fld("crmFub", optional ? "API Key <i>(optional)</i>" : "API Key", "", "password", "")}<div><button class="btn" data-act="crmSave" data-which="fub">Connect</button></div></div>`;
    const hook = c.hook ? `<div class="crm-row"><div><b>Webhook</b><p class="small">${esc(c.hook)}</p></div><button class="link" data-act="crmOff" data-which="hook">Remove</button></div>` : "";
    return `<div class="group" id="crm"><h4>Follow Up Boss</h4><div style="display:flex;flex-direction:column;gap:18px">${fub}${hook}</div>${failed}</div>`;
  }

  // The brokerage website (setup step 2 and Settings). Hopkins reads it end to end in the
  // background to know the agent; what it learnt stays in the chat, not on screen (Ismael, 2026-11-01).
  // A box like every other field: the site in it with Remove beside it, or empty with Add.
  function siteGroup() {
    const url = S.me.workspace.brand.website;
    const box = `<input id="siteUrl" type="url" value="${esc(url ? siteHost(url) : "")}" placeholder="yourbrokerage.com" autocomplete="off" aria-label="Your brokerage's website" ${url ? "readonly" : ""}>`;
    return `<div class="group" id="site"><h4>Website</h4><div class="fld inline">${box}<button class="btn" data-act="${url ? "siteRemove" : "siteSave"}">${url ? "Remove" : "Add"}</button></div></div>`;
  }
  const siteHost = (u) => String(u).replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];




  // The CRM on its own, from Today's setup: the same two fields, and Skip.
  // ---------- notifications (src/push.js, web/sw.js) ----------
  //
  // One button and the phone's own Allow. iPhones only allow it once Hopkins is on the Home
  // Screen (Apple's rule for every web app), so there the button becomes the two taps to get it there.
  const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const pushSupported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  async function pushState() {
    if (isIOS() && !standalone()) return "ios-browser";
    if (!pushSupported()) return "unsupported";
    if (Notification.permission === "denied") return "denied";
    try {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = reg && (await reg.pushManager.getSubscription());
      return sub && Notification.permission === "granted" ? "on" : "off";
    } catch { return "off"; }
  }
  const b64 = (s) => { const p = "=".repeat((4 - (s.length % 4)) % 4); const r = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from([...r].map((c) => c.charCodeAt(0))); };
  async function pushOn() {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return perm;
    const { key } = await api("/api/push");
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(key) });
    await api("/api/push", { body: { subscription: sub.toJSON() } });
    return "on";
  }
  async function pushOff() {
    const reg = await navigator.serviceWorker.getRegistration("/");
    const sub = reg && (await reg.pushManager.getSubscription());
    if (sub) { await api("/api/push", { method: "DELETE", body: { endpoint: sub.endpoint } }).catch(() => {}); await sub.unsubscribe(); }
  }
  // What the notifications row says and offers, wherever it appears. The title is the group's in
  // Settings and the step's in setup, never twice.
  const isMobile = () => isIOS() || /Android|Mobi/i.test(navigator.userAgent);
  const PUSH_WHY = "Get notified every time a new lead comes in.";
  function pushRow(state, { setup = false } = {}) {
    const title = setup ? `<b>Notifications</b>` : "";
    // In Settings: On and Off side by side, the chosen one white (Ismael, 2026-11-01).
    const pair = (on) => `<div class="onoff"><button class="${on ? "btn" : "btn btn-dark"}" data-act="${on ? "pushNoop" : "pushOn"}" aria-pressed="${on}">On</button><button class="${on ? "btn btn-dark" : "btn"}" data-act="${on ? "pushOff" : "pushNoop"}" aria-pressed="${!on}">Off</button></div>`;
    if (state === "on") return setup ? `<div class="push-row">${title}<p class="small">On</p></div>` : `<div class="push-row"><p class="small">${PUSH_WHY}</p>${pair(true)}</div>`;
    if (state === "ios-browser") return `<div class="push-row">${title}<p class="small">${PUSH_WHY}</p><p class="small">On iPhone, add Hopkins to your Home Screen first: tap Share, then Add to Home Screen, and open it from there.</p></div>`;
    if (state === "denied") return `<div class="push-row">${title}<p class="small">Blocked in your browser settings.</p></div>`;
    if (state === "unsupported") return `<div class="push-row">${title}<p class="small">Not available in this browser.</p></div>`;
    if (!setup) return `<div class="push-row"><p class="small">${PUSH_WHY}</p>${pair(false)}</div>`;
    return `<div class="push-row">${title}<p class="small">${PUSH_WHY}</p><div><button class="btn" data-act="pushOn">Turn on</button></div></div>`;
  }

  // A tapped notification opens Hopkins where it points.
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", (e) => { if (e.data?.go) { const u = new URL(e.data.go); location.hash = u.hash || "#/today"; } });
    // Kept registered so notifications keep arriving after the app's been closed.
    navigator.serviceWorker.getRegistration("/").then((r) => { if (r) navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {}); }).catch(() => {});
  }

  // ---------- setup, once, after sign up ----------
  //
  // Meta, the website and Follow Up Boss are how Hopkins knows the agent's business, so they come before
  // anything else. Meta has to be connected; it only lets someone through without it when Meta's own
  // login didn't work for them (before App Review only Meta testers can connect) or isn't set up yet.
  // The CRM is optional (Ismael, 2026-11-01). The website is required: it tells Hopkins the brokerage.
  function viewSetup(metaFailed = false) {
    if (metaFailed) S.metaFailed = true;
    const m = S.me.meta || {}, c = S.me.crm || {};
    const fld = (id, label, value, type = "text", ph = "") => `<div class="fld"><label for="${id}">${label}</label><input id="${id}" type="${type}" value="${esc(value || "")}" placeholder="${esc(ph)}" autocomplete="off"></div>`;
    const metaOk = m.ready || !m.available || S.metaWaived;
    const siteOk = Boolean(S.me.workspace.brand.website);
    const meta = !m.available
      ? `<div class="su-row"><div class="tx"><b>Meta</b><p class="small">Available soon</p></div></div>`
      : m.connected
        ? metaGroup()
        : `<div class="su-row"><div class="tx"><b>Meta</b>${S.metaFailed ? `<p class="small warn">Meta didn't connect.</p>` : ""}</div><a class="btn" href="/api/meta/connect">${S.metaFailed ? "Try again" : "Connect"}</a></div>
           ${S.metaFailed && !S.metaWaived ? `<button class="link su-later" data-act="metaWaive">Continue without Meta</button>` : ""}`;
    const crm = crmGroup(fld, { optional: true });
    // Notifications are a step on phones only: a laptop's browser asks by itself whenever they turn
    // them on in Settings (Ismael, 2026-11-01).
    const mobile = isMobile();
    const pushOk = !mobile || (S.pushState && S.pushState !== "off");
    main.innerHTML = `<div class="page setup-page"><div class="wrap" style="max-width:560px">
      <div class="su-logo">${MARK("")}<b>Hopkins</b></div>
      <div class="head"><h1>Connect Hopkins</h1></div>
      <div class="su-step"><span class="su-n">1</span>${meta}</div>
      <div class="su-step"><span class="su-n">2</span><div class="su-body">${siteGroup()}</div></div>
      <div class="su-step"><span class="su-n">3</span><div class="su-body">${crm}</div></div>
      ${mobile ? `<div class="su-step"><span class="su-n">4</span><div class="su-body" id="suPush">${pushRow(S.pushState || "off", { setup: true })}</div></div>` : ""}
      <div class="su-go"><button class="btn" id="suGo" ${metaOk && siteOk && pushOk ? "" : "disabled"}>Continue</button></div>
    </div></div>`;
    fillMeta();
    // Notifications: on, or not possible here (an iPhone tab, a blocked or unsupported browser).
    pushState().then((st) => {
      if (S.pushState === st || !location.hash.startsWith("#/setup")) return;
      S.pushState = st;
      viewSetup();
    });
    $("#siteUrl")?.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); $('[data-act="siteSave"]')?.click(); } });
    $("#suGo").addEventListener("click", async () => {
      await api("/api/brand", { method: "PUT", body: { onboarded: "yes" } });
      await loadMe();
      location.hash = "#/today";
    });
  }

  function viewCrm(back = "#/today") {
    S.crmBack = back;
    const fld = (id, label, value, type = "text", ph = "") => `<div class="fld"><label for="${id}">${label}</label><input id="${id}" type="${type}" value="${esc(value || "")}" placeholder="${esc(ph)}" autocomplete="off"></div>`;
    const c = S.me.crm || {};
    main.innerHTML = `${mtop("CRM", "", { back })}<div class="page"><div class="wrap" style="max-width:600px">
      <div class="head"><h1>Connect your CRM</h1></div>${crmGroup(fld).replace('<h4>CRM</h4>', "")}
      ${c.fub || c.hook ? `<div style="margin-top:20px"><a class="btn" href="${back}">Done</a></div>` : back === "#/today" ? `<div style="margin-top:20px"><button class="link" data-act="crmSkip">Skip</button></div>` : ""}
    </div></div>`;
  }
  const redrawCrm = () => (location.hash.startsWith("#/setup") ? viewSetup() : location.hash.startsWith("#/settings") ? viewSettings() : viewCrm(S.crmBack));

  function viewSettings() {
    const u = S.me.user, b = S.me.workspace.brand, use = S.me.usage;
    const fld = (id, label, value, type = "text", ph = "", auto = "off") => `<div class="fld"><label for="${id}">${label}</label><input id="${id}" type="${type}" value="${esc(value || "")}" placeholder="${esc(ph)}" autocomplete="${auto}"></div>`;
    main.innerHTML = `${mtop("You")}<div class="page"><div class="wrap" style="max-width:600px">
      <div class="head"><h1>You</h1></div>
      <div class="group"><h4>Your Hopkins</h4>${youRows()}</div>
      <div class="group"><h4>Appearance</h4><div class="you-modes">${[["light", "Light"], ["system", "System"], ["dark", "Dark"]].map(([k, n]) => `<button data-act="youTheme" data-k="${k}" class="${appearance() === k ? "on" : ""}">${n}</button>`).join("")}</div></div>
      <div class="group"><h4>Profile</h4>
        <div class="set-av"><span class="av big" id="setAv" ${avatarStyle()}>${esc(initials())}</span><div>
          <label class="btn">Change photo<input type="file" accept="image/*,.heic,.heif" hidden id="avFile"></label>
          ${u.avatar_id ? `<button class="link" data-act="avRemove" style="margin-left:10px">Remove</button>` : ""}</div></div>
        <div style="display:flex;flex-direction:column;gap:12px;margin-top:16px">
          ${fld("sName", "Your name", u.name, "text", "Sam Ellery", "name")}
          ${fld("sBiz", "Brokerage or team", b.business, "text", "Ellery Realty", "organization")}
          ${fld("sEmail", "Email", u.email, "email", "", "email")}
          <div class="fld hidden" id="sEmailPw">${`<label for="sEmailPass">Current password, required to change email</label><input id="sEmailPass" type="password" autocomplete="current-password">`}</div>
          <div><button class="btn" data-act="saveProfile">Save</button></div></div></div>
      <div class="group"><h4>Password</h4><div style="display:flex;flex-direction:column;gap:12px">
        ${fld("sPwCur", "Current password", "", "password", "", "current-password")}${fld("sPwNew", "New password", "", "password", "At least 8 characters", "new-password")}
        <div><button class="btn" data-act="savePw">Change password</button></div></div></div>
      <div class="group"><h4>Notifications</h4><div id="setPush">${pushRow(S.pushState || "off")}</div></div>

      <div class="group"><h4>Plan</h4><div class="plan-row"><div><p>${paid() ? esc(S.me.plan.name) : "Free"}</p>${paid() ? `<p class="small">Billed monthly. Cancel anytime.</p>` : ""}</div>
        ${topPlan() ? "" : `<button class="btn" data-upgrade>Upgrade</button>`}</div>
        ${paid() && S.me.billing.customer ? `<div style="margin-top:12px"><button class="btn" data-act="billing">Manage</button></div>` : ""}</div>
      <div class="group"><h4>Account</h4><div style="display:flex;flex-direction:column;align-items:flex-start;gap:14px">
        <button class="btn" data-act="logout">${ICON.out}Sign out</button>
        <button class="btn btn-red" data-act="deleteAsk">Delete account</button></div></div>
      <div class="legal-links"><a href="/terms" target="_blank" rel="noopener">Terms</a><a href="/privacy" target="_blank" rel="noopener">Privacy policy</a></div>
    </div></div>`;
    $("#sEmail").addEventListener("input", (e) => $("#sEmailPw").classList.toggle("hidden", e.target.value.trim().toLowerCase() === u.email));
    $("#avFile").addEventListener("change", async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      toast("Uploading…");
      let r;
      try { r = await uploadPhoto(await openable(f), { kind: "avatar" }); } catch (err) { return toast(err.message || "That photo couldn't be opened. Try a JPG or PNG."); }
      await api("/api/account", { method: "PATCH", body: { avatar_id: r.id } });
      await loadMe();
      drawSide();
      viewSettings();
      toast("Photo updated");
    });
    pushState().then((st) => { S.pushState = st; if ($("#setPush")) $("#setPush").innerHTML = pushRow(st); });
  }

  // ---------- You: the answers from the front door, each one changeable here ----------
  const YOU = [
    ["instagram", "Instagram", "text", "yourhandle"], ["business", "Brokerage", "text", "Brokerage name"], ["area", "Where you sell", "text", "Austin, Texas"],
    ["content_style", "Content", "one", [["listings", "Real Estate"], ["personal", "Personal Brand"], ["both", "Both"]]],
    ["post_often", "How often", "one", [["3", "3 times a week"], ["5", "5 times a week"], ["7", "Every day"]]],
    ["styles", "What to post", "many", ["Just listed", "Open houses", "Just sold", "Coming soon", "Local spots", "Market updates", "Neighbourhood guides", "Events", "Behind the scenes", "Buyer tips", "Seller tips", "Your story", "Client stories"], 0, 3],
    ["music", "Music", "many", ["Acoustic", "Piano", "Lo-fi", "Jazz", "Soul", "R&B", "Pop", "Indie", "Electronic", "House", "Cinematic", "Ambient", "Hip hop", "Classical"], 3],
  ];
  const chev = '<svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>';
  function youShown(k, kind, opts) {
    const b = S.me.workspace.brand;
    const v = b[k] || (k === "area" ? b.city : "") || "";
    if (kind === "one") return (opts.find(([key]) => key === v) || [])[1] || "";
    if (k === "instagram" && v) return `@${v.replace(/^@+/, "")}`;
    return v;
  }
  function youRows() {
    return `<div class="you-rows">${YOU.map(([k, label, kind, opts]) => S.youOpen === k ? `<div class="you-row" style="display:block">${youEditor(k, label, kind, opts)}</div>`
      : `<button class="you-row" data-act="youOpen" data-k="${k}"><b>${label}</b><span>${esc(youShown(k, kind, opts)) || "Add"}</span>${chev}</button>`).join("")}</div>`;
  }
  function youEditor(k, label, kind, opts) {
    const b = S.me.workspace.brand;
    const v = b[k] || (k === "area" ? b.city : "") || "";
    if (kind === "text") return `<div class="you-edit"><b>${label}</b><input class="in" id="youIn" value="${esc(v)}" placeholder="${esc(opts)}" autocomplete="off"><div><button class="btn" data-act="youSave" data-k="${k}">Save</button> <button class="link" data-act="youOpen" data-k="">Cancel</button></div></div>`;
    const on = kind === "many" ? new Set(String(v).split(",").map((x) => x.trim()).filter(Boolean)) : new Set([v]);
    const list = kind === "one" ? opts : opts.map((x) => [x, x]);
    return `<div class="you-edit"><b>${label}</b><div class="opts">${list.map(([key, n]) => `<button class="${on.has(key) ? "on" : ""}" data-act="youPick" data-k="${k}" data-v="${esc(key)}">${esc(n)}</button>`).join("")}</div><div><button class="link" data-act="youOpen" data-k="">Done</button></div></div>`;
  }
  const appearance = () => { try { return localStorage.getItem("hpk-appearance") || S.me?.workspace?.brand?.appearance || "dark"; } catch { return "dark"; } };
  function applyAppearance(a) {
    try { localStorage.setItem("hpk-appearance", a); } catch {}
    const t = a === "system" ? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark") : a;
    const go = () => { document.documentElement.dataset.theme = t; const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = t === "light" ? "#F4F3F1" : "#111111"; };
    if (document.documentElement.dataset.theme === t) return go();
    document.startViewTransition ? document.startViewTransition(go) : go();
  }
  applyAppearance(appearance());
  matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => { if (appearance() === "system") applyAppearance("system"); });
  async function youAction(act, t) {
    const k = t.dataset.k;
    if (act === "youOpen") { tick(); S.youOpen = k; viewSettings(); setTimeout(() => $("#youIn")?.focus(), 30); return true; }
    if (act === "youSave") {
      let v = $("#youIn").value.trim();
      if (k === "instagram") v = v.replace(/^@/, "");
      await api("/api/brand", { method: "PUT", body: k === "area" ? { area: v, city: v } : { [k]: v } });
      await loadMe(); S.youOpen = null; tick(); viewSettings(); toast("Saved"); return true;
    }
    if (act === "youPick") {
      const [, , kind, , max, min] = YOU.find((x) => x[0] === k);
      let v = t.dataset.v;
      if (kind === "many") {
        const cur = new Set(String(S.me.workspace.brand[k] || "").split(",").map((x) => x.trim()).filter(Boolean));
        if (cur.has(v)) { if (min && cur.size <= min) { toast("Pick at least three"); return true; } cur.delete(v); } else if (!max || cur.size < max) cur.add(v); else return true;
        v = [...cur].join(", ");
      }
      tick();
      await api("/api/brand", { method: "PUT", body: { [k]: v } });
      await loadMe(); if (kind === "one") S.youOpen = null; viewSettings(); return true;
    }
    if (act === "youTheme") { tick(); applyAppearance(k); api("/api/brand", { method: "PUT", body: { appearance: k } }).catch(() => {}); $$(".you-modes button").forEach((b) => b.classList.toggle("on", b.dataset.k === k)); return true; }
    return false;
  }


  async function settingsAction(act, t) {
    const val = (id) => ($(id) ? $(id).value : "");
    if (act === "saveProfile") {
      const body = { name: val("#sName"), email: val("#sEmail") };
      if (!$("#sEmailPw").classList.contains("hidden")) body.password = val("#sEmailPass");
      await api("/api/account", { method: "PATCH", body });
      if (val("#sBiz") !== (S.me.workspace.brand.business || "")) await api("/api/brand", { method: "PUT", body: { business: val("#sBiz") } });
      await loadMe(); drawSide(); viewSettings(); buzz(6); toast("Saved");
    } else if (act === "saveBiz") {
      await api("/api/brand", { method: "PUT", body: { business: val("#sBiz") } });
      await loadMe(); drawSide(); buzz(6); toast("Saved");
    } else if (act === "savePw") {
      await api("/api/account/password", { body: { current: val("#sPwCur"), next: val("#sPwNew") } });
      $("#sPwCur").value = ""; $("#sPwNew").value = ""; buzz(6); toast("Password changed");
    } else if (act === "alertsOn" || act === "alertsOff") {
      // A long random name, so nobody else can guess it and read the alerts.
      const topic = act === "alertsOn" ? `hopkins-${[...crypto.getRandomValues(new Uint8Array(9))].map((x) => "abcdefghijkmnpqrstuvwxyz23456789"[x % 32]).join("")}` : "";
      await api("/api/brand", { method: "PUT", body: { alerts_topic: topic } });
      await loadMe(); buzz(6); toast(topic ? "Lead alerts on" : "Lead alerts off");
      viewSettings();
    } else if (act === "crmSave") {
      const which = t.dataset.which;
      const v = val(which === "fub" ? "#crmFub" : "#crmHook").trim();
      if (!v) return toast(which === "fub" ? "Enter your API key" : "Enter a webhook URL");
      S.me.crm = await api("/api/crm", { method: "PUT", body: { [which]: v } });
      redrawCrm(); buzz(6); toast("Connected");
    } else if (act === "siteSave") {
      const v = val("#siteUrl").trim();
      if (!v) return toast("Enter your website");
      t.disabled = true;
      try {
        const r = await api("/api/site", { body: { url: v } });
        S.me.workspace.brand.website = r.website; S.me.site = r.site; S.siteEdit = false;
      } catch (err) { t.disabled = false; return toast(err.message || "Something went wrong. Please try again."); }
      toast("Connected");
      if (location.hash.startsWith("#/setup")) viewSetup();
      else $("#site").outerHTML = siteGroup();
    } else if (act === "siteRemove") {
      await api("/api/site", { method: "DELETE" });
      S.me.workspace.brand.website = ""; S.me.site = null;
      if (location.hash.startsWith("#/setup")) viewSetup();
      else $("#site").outerHTML = siteGroup();
      $("#siteUrl")?.focus();
    } else if (act === "crmOff") {
      S.me.crm = await api("/api/crm", { method: "PUT", body: { [t.dataset.which]: "" } });
      redrawCrm(); toast(t.dataset.which === "fub" ? "Disconnected" : "Removed");
    } else if (act === "pushOn") {
      t.disabled = true;
      let st;
      try { st = await pushOn(); } catch (err) { t.disabled = false; return toast("Something went wrong. Please try again."); }
      S.pushState = st === "on" ? "on" : st === "denied" ? "denied" : await pushState();
      if (S.pushState === "on") toast("Turned on");
      if (location.hash.startsWith("#/setup")) viewSetup();
      else if ($("#setPush")) $("#setPush").innerHTML = pushRow(S.pushState);
      else if (location.hash === "#/today" || !location.hash) { S.todayHtml = ""; drawToday(); }
    } else if (act === "pushOff") {
      await pushOff();
      S.pushState = "off";
      if ($("#setPush")) $("#setPush").innerHTML = pushRow("off");
      toast("Turned off");
    } else if (act === "metaWaive") {
      S.metaWaived = true;
      viewSetup();
    } else if (act === "crmSkip") {
      S.me.crm = await api("/api/crm", { method: "PUT", body: { skip: true } });
      location.hash = "#/today";
    } else if (act === "crmTest") {
      await api("/api/crm/test", { body: {} });
      toast("Test sent");
    } else if (act === "testAlert") {
      await api("/api/alerts/test", { body: {} });
      toast("Test sent");
    } else if (act === "avRemove") {
      await api("/api/account", { method: "PATCH", body: { avatar_id: "" } });
      await loadMe(); drawSide(); viewSettings(); toast("Photo removed");
    } else if (act === "deleteAsk") {
      openPop(t, `<div class="note"><b>Delete your account?</b>Your chats, ads, leads and photos will be permanently deleted.</div>
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
    const [{ workspaces, plans }, { feedback }] = await Promise.all([api("/api/admin/workspaces"), api("/api/admin/feedback")]);
    if (my !== current()) return;
    main.innerHTML = `${mtop("Admin")}<div class="page"><div class="wrap"><div class="head"><h1>Admin</h1><p class="lede">Only you see this.</p></div>
      <div class="adm">${workspaces.map((w) => `<div class="adm-row"><div class="adm-who"><b>${esc(w.name)}</b><span class="small">${esc(w.emails || "")}</span>
          <span class="small">Joined ${ago(w.created_at)} · last in ${w.last_seen ? ago(w.last_seen) : "never"} · ${w.listings} ${w.listings === 1 ? "listing" : "listings"}, ${w.ads} ads, ${w.leads} ${w.leads === 1 ? "Lead" : "Leads"}</span></div>
          <div class="adm-act"><select data-ws="${w.id}"><option value="free" ${w.plan === "free" ? "selected" : ""}>Free</option>${plans.map((p) => `<option value="${p.id}" ${w.tier === p.id ? "selected" : ""}>${esc(p.name)}, $${p.price}</option>`).join("")}</select>
          ${w.user_id ? `<button class="sec-btn" data-act="resetLink" data-user="${w.user_id}">${w.reset_asked ? `Reset requested ${ago(w.reset_asked)}` : "Reset link"}</button>` : ""}</div></div>`).join("")}</div>
      <div class="head" style="margin-top:34px"><h2>Feedback</h2></div>
      ${feedback.length ? `<div class="fb-list">${feedback.map((f) => `<div class="fb"><p>${esc(f.body)}</p><span class="small">${esc(f.name || "")} · ${esc(f.email || "")} · ${esc(f.page || "")} · ${ago(f.created_at)}</span></div>`).join("")}</div>` : `<p class="lede">No feedback yet.</p>`}
      </div></div>`;
    $$("[data-ws]").forEach((s) => s.addEventListener("change", async () => {
      await api(`/api/admin/workspaces/${s.dataset.ws}`, { method: "PATCH", body: { plan: s.value } });
      toast("Saved");
      await loadMe();
      drawSide();
    }));
  }

  // ---------- clicks ----------

  // The plan's ads, drawn at full size and kept on the server for Meta.
  async function sendRenders(planId) {
    const plan = S.current.messages.find((m) => m.id === planId)?.data;
    const ads = S.current.ads.filter((a) => (plan?.versions || []).includes(a.version));
    for (const ad of ads) {
      const c = document.createElement("canvas");
      await Creative.render(c, renderOpts(ad, "feed"));
      const blob = await new Promise((r) => c.toBlob(r, "image/png"));
      await api(`/api/ads/${ad.id}/render`, { body: { format: "feed", data: await blobBase64(blob) } });
    }
  }
  // Meta's answer comes a little after the approval; the chat picks it up while it's open.
  function waitForMeta(id, seen, tries = 0) {
    if (tries > 30) return;
    setTimeout(async () => {
      if (location.hash !== `#/l/${id}` || S.busy) return waitForMeta(id, seen, tries + 1);
      const p = await api(`/api/listings/${id}`).catch(() => null);
      if (!p || location.hash !== `#/l/${id}`) return;
      if (p.messages.length > seen) { drawListing(p, true); return; }
      waitForMeta(id, seen, tries + 1);
    }, 4000);
  }

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
    settleSegs();
  }

  // Segmented controls slide a lens to the chosen option instead of jumping (Chat and Ads, the
  // versions, Feed and Story, the Style sheet's "this one or all 3"); on a phone they're glass.
  // Screens redraw on every choice, so where each lens was is remembered and it slides from
  // there. Only transform and width animate, which keeps it smooth.
  // On a phone the pills move like the tab bar's lens (glass.js): on a spring that overshoots a
  // touch, stretching along its path and squashing as it lands, swelling under a finger, and
  // following a finger dragged across them. The state lives per row of pills, so the glide
  // carries on when the screen redraws mid move. On a laptop they slide with a CSS transition.
  const SPR = {};
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function drawSpring(s) {
    if (!s.el) return;
    const speed = Math.min(1, Math.abs(s.v) / 1800);
    const sx = 1 + speed * 0.28 + s.press * 0.12;
    const sy = 1 - speed * 0.12 + s.press * 0.2;
    s.el.style.width = `${s.w}px`;
    s.el.style.transform = `translateX(${s.x}px) scale(${sx.toFixed(4)},${sy.toFixed(4)})`;
  }
  function stepSpring(s, t) {
    const dt = Math.min(0.032, (t - (s.last || t)) / 1000) || 0.016;
    s.last = t;
    const k = s.drag ? 900 : 380, c = s.drag ? 48 : 26;
    s.v += (-k * (s.x - s.tx) - c * s.v) * dt;
    s.x += s.v * dt;
    s.wv += (-k * (s.w - s.tw) - c * s.wv) * dt;
    s.w += s.wv * dt;
    s.pv += (-520 * (s.press - s.pt) - 30 * s.pv) * dt;
    s.press += s.pv * dt;
    drawSpring(s);
    const still = Math.abs(s.x - s.tx) < 0.2 && Math.abs(s.v) < 4 && Math.abs(s.w - s.tw) < 0.2 && Math.abs(s.wv) < 4 && Math.abs(s.press - s.pt) < 0.002 && Math.abs(s.pv) < 0.02;
    if (still && !s.drag) {
      Object.assign(s, { x: s.tx, w: s.tw, v: 0, wv: 0, press: s.pt, pv: 0, running: false, last: 0 });
      drawSpring(s);
      return;
    }
    requestAnimationFrame((t2) => stepSpring(s, t2));
  }
  function kickSpring(s) {
    if (reduceMotion) { Object.assign(s, { x: s.tx, w: s.tw, press: s.pt }); drawSpring(s); return; }
    if (!s.running) { s.running = true; s.last = 0; requestAnimationFrame((t) => stepSpring(s, t)); }
  }

  // A finger on a row of pills: the lens swells and follows it, and lands on the nearest pill.
  let segDrag = null;
  const pillAt = (seg, clientX) => {
    const r = seg.getBoundingClientRect();
    const x = clientX - r.left + seg.scrollLeft;
    let best = null, d = Infinity;
    for (const b of seg.querySelectorAll(":scope > button")) {
      const dist = Math.abs(b.offsetLeft + b.offsetWidth / 2 - x);
      if (dist < d) { d = dist; best = b; }
    }
    return best;
  };
  function followPill(drag, clientX) {
    const { seg, s } = drag;
    const pills = [...seg.querySelectorAll(":scope > button")];
    const b = pillAt(seg, clientX);
    if (!b) return;
    const r = seg.getBoundingClientRect();
    s.tw = b.offsetWidth;
    const min = pills[0].offsetLeft, max = pills.at(-1).offsetLeft + pills.at(-1).offsetWidth - s.tw;
    s.tx = Math.max(min, Math.min(max, clientX - r.left + seg.scrollLeft - s.tw / 2));
  }
  function bindPillDrag(seg, key) {
    if (seg.dataset.drag) return;
    seg.dataset.drag = "1";
    seg.addEventListener("pointerdown", (e) => {
      // A row long enough to scroll sideways keeps the finger for scrolling.
      if (!phone() || seg.scrollWidth > seg.clientWidth + 2 || !SPR[key]) return;
      const s = SPR[key];
      segDrag = { seg, s, id: e.pointerId, startX: e.clientX, lastX: e.clientX, moved: false };
      s.drag = true;
      s.pt = 1;
      s.el.classList.add("press");
      followPill(segDrag, e.clientX);
      kickSpring(s);
    });
  }
  window.addEventListener("pointermove", (e) => {
    if (!segDrag || e.pointerId !== segDrag.id) return;
    if (e.clientX) segDrag.lastX = e.clientX;
    if (Math.abs(segDrag.lastX - segDrag.startX) > 6) segDrag.moved = true;
    followPill(segDrag, segDrag.lastX);
  }, { passive: true });
  const endPill = (e) => {
    if (!segDrag || e.pointerId !== segDrag.id) return;
    const { seg, s, moved, lastX } = segDrag;
    segDrag = null;
    s.drag = false;
    s.pt = 0;
    const el = s.el;
    setTimeout(() => el && el.classList.remove("press"), 140);
    const b = pillAt(seg, lastX);
    if (b) { s.tx = b.offsetLeft; s.tw = b.offsetWidth; }
    kickSpring(s);
    // A drag that ends on another pill picks it (a plain tap is picked by its own click).
    if (moved && b && !b.classList.contains("on")) b.click();
  };
  window.addEventListener("pointerup", endPill, true);
  window.addEventListener("pointercancel", endPill, true);

  function settleSegs() {
    for (const seg of $$(".seg[data-seg]")) {
      const on = seg.querySelector(":scope > button.on");
      let lens = seg.querySelector(":scope > .seg-lens");
      if (!lens) {
        lens = document.createElement("i");
        lens.className = "seg-lens";
        seg.prepend(lens);
        seg.classList.add("lensed");
      }
      if (!on || !seg.offsetWidth) { lens.style.opacity = "0"; continue; }
      const key = `${seg.dataset.seg}:${seg.parentElement ? seg.parentElement.className : ""}`;
      const x = on.offsetLeft, w = on.offsetWidth;
      const prev = S.segPos[key];
      S.segPos[key] = { x, w };
      // A long row of names keeps the chosen one in view.
      if (seg.scrollWidth > seg.clientWidth) {
        if (x < seg.scrollLeft) seg.scrollLeft = x - 8;
        else if (x + w > seg.scrollLeft + seg.clientWidth) seg.scrollLeft = x + w - seg.clientWidth + 8;
      }
      lens.style.opacity = "1";
      if (phone() && seg.closest(".mtop, .mbar, .pop")) {
        // The same glass as the tab bar: its rim, its sheen and its lens.
        seg.classList.add("lg", "pill-glass");
        lens.style.transition = "none";
        const st = SPR[key] || (SPR[key] = { x: prev ? prev.x : x, w: prev ? prev.w : w, v: 0, wv: 0, press: 0, pv: 0, pt: 0 });
        st.el = lens;
        if (!st.drag) { st.tx = x; st.tw = w; }
        drawSpring(st);
        kickSpring(st);
        bindPillDrag(seg, key);
        continue;
      }
      if (!lens.dataset.placed) {
        lens.style.transition = "none";
        lens.style.transform = `translateX(${(prev || { x }).x}px)`;
        lens.style.width = `${(prev || { w }).w}px`;
        void lens.offsetWidth;
        lens.style.transition = "";
        lens.dataset.placed = "1";
      }
      lens.style.transform = `translateX(${x}px)`;
      lens.style.width = `${w}px`;
    }
  }

  document.addEventListener("click", async (e) => {
    // The tap that ends a press and hold doesn't also open the listing.
    // (or close the menu it just opened, when the finger lifts over the backdrop).
    if (S.heldAt && Date.now() - S.heldAt < 700 && !e.target.closest("#pop")) { e.preventDefault(); return; }
    // In Select, tapping a card ticks it.
    const picked = S.selecting && e.target.closest("[data-card]");
    if (picked) {
      e.preventDefault();
      const id = picked.dataset.card;
      S.picked.has(id) ? S.picked.delete(id) : S.picked.add(id);
      buzz(5);
      return viewListings();
    }
    const pl = e.target.closest("[data-plan]");
    if (pl) {
      S.pickPlan = pl.dataset.plan;
      $$("#pop .pl").forEach((x) => x.classList.toggle("sel", x === pl));
      const go = $("#pop [data-checkout]");
      if (go) go.textContent = `Upgrade to ${S.me.plans.find((p) => p.id === S.pickPlan).name}`;
      buzz(5);
      return;
    }
    if (!e.target.closest("#pop") && !e.target.closest("[data-act=account],[data-act=listmenu],[data-act=limenu],[data-act=dlmenu],[data-act=repCal],[data-act=repSort]")) closePop();
    const t = e.target.closest("[data-act],[data-pick],[data-fmt],[data-confirm],[data-fill],[data-upgrade],[data-checkout],[data-copy],[data-dl],[data-use],[data-say]");
    if (!t) return;
    const act = t.dataset.act;
    if (await weekAction(act, t)) return;
    if (await youAction(act, t)) return;
    if (t.closest("#pop") && act !== "deleteYes") closePop();
    const l = S.current && S.current.listing;
    try {
      if (act === "copyMsg") return copyMsg(t);
      if (act === "editMsg") {
        const row = t.closest(".mact");
        const m = row.dataset.mid && S.current?.messages.find((x) => x.id === row.dataset.mid);
        buzz(5);
        return startEdit(row, m ? m.body : $(".tx", row.previousElementSibling).textContent);
      }
      if (act === "cancelEdit") { stopEdit(); return $("#ta")?.focus(); }
      if (["saveProfile", "saveBiz", "savePw", "alertsOn", "alertsOff", "testAlert", "avRemove", "deleteAsk", "deleteYes", "crmSave", "crmOff", "crmTest", "crmSkip", "metaWaive", "pushOn", "pushOff", "siteSave", "siteRemove"].includes(act)) await settingsAction(act, t);
      else if (act === "factsGo") { const ta = $("#ta"); ta.value = "go"; ta.dispatchEvent(new Event("input", { bubbles: true })); $("#comp").requestSubmit(); }
      else if (act === "crDownload") await downloadCreation(t.dataset.id, t);
      else if (act === "crCopy") {
        const c = S.crKeys?.[t.dataset.id] || (S.current?.creations || []).find((x) => x.id === t.dataset.id);
        if (c) { await navigator.clipboard.writeText(c.spec.caption || ""); toast("Copied"); }
      }
      else if (act === "attAct" || act === "attDismiss") {
        t.disabled = true;
        const r = await api(`/api/attention/${t.dataset.id}`, { body: { choice: act === "attDismiss" ? "dismiss" : "act" } });
        S.attention = r.attention || [];
        if (r.notice) toast(r.notice);
        await refreshSide();
        if (r.go) location.hash = r.go; else viewToday();
      }
      else if (act === "pauseRun" || act === "resumeRun") {
        const next = await api(`/api/listings/${l.id}/${act === "pauseRun" ? "pause" : "resume"}`, { body: {} });
        drawListing(next, true);
        refreshSide();
        toast(next.listing.run === "paused" ? "Ads paused" : next.listing.run === "running" ? "Ads resumed" : next.messages.at(-1)?.body || "Done");
      }
      else if (act === "billing") { const { url } = await api("/api/billing/portal", { body: {} }); location.href = url; }
      else if (act === "metaOff") { await api("/api/meta", { method: "DELETE" }); await loadMe(); viewSettings(); toast("Meta disconnected"); }
      else if (act === "account") openPop(t, accountMenu());
      else if (act === "reportListing") reportSheet(t);
      else if (act === "openAd") { S.selected[t.dataset.id] = Number(t.dataset.v); S.openAds = true; }
      else if (act === "demoOpen" || act === "demoLeave") {
        // A fresh demo agent, or back to the founder's own account: a clean reload either way.
        t.disabled = true;
        if (act === "demoOpen") t.textContent = "Building the demo";
        await api(act === "demoOpen" ? "/api/admin/demo" : "/api/demo/leave", { body: {} });
        location.hash = "#/today";
        location.reload();
      }
      else if (act === "repPrev" || act === "repNext") {
        const next = addDays(S.repMonday, act === "repPrev" ? -7 : 7);
        if (next < firstMonday() || next > mondayOf(new Date())) return;
        S.repMonday = next;
        S.repFollow = sameDay(next, mondayOf(new Date()));
        buzz(4);
        viewReport();
      }
      else if (act === "repCal") weekCalendar(t);
      else if (act === "repSort") openPop(t, `<div class="note"><b>Sort by</b></div>${SORTS.map(([k, label]) => `<button data-act="repSortPick" data-k="${k}">${S.repSort === k ? ICON.check : "<i class=\"ck\"></i>"}${label}</button>`).join("")}`);
      else if (act === "repSortPick" || act === "repFilter") {
        if (act === "repSortPick") S.repSort = t.dataset.k; else S.repFilter = t.dataset.k;
        try { localStorage.setItem("hk.repSort", S.repSort); localStorage.setItem("hk.repFilter", S.repFilter); } catch {}
        buzz(4);
        redrawBoard();
      }
      else if (act === "repPick") {
        S.repMonday = new Date(Number(t.dataset.mon));
        S.repFollow = sameDay(S.repMonday, mondayOf(new Date()));
        buzz(5);
        viewReport();
      }
      else if (act === "listmenu") { S.menuFrom = null; openPop(t, listingMenu()); }
      else if (act === "limenu") {
        // The ••• on a listing in the sidebar: rename or delete, like a chat in Claude or ChatGPT.
        e.preventDefault();
        S.menuFrom = t;
        openPop(t, `<button data-act="renameAsk" data-id="${t.dataset.id}">${ICON.pen}Rename</button>
          <button class="danger" data-act="delOne" data-id="${t.dataset.id}">${ICON.trash}Delete</button>`);
      }
      else if (act === "sideToggle") setSide(!$("#shell").classList.contains("slim"));
      else if (act === "leadSearch") leadSearch(true);
      else if (act === "leadSearchClose") leadSearch(false);
      else if (act === "style") {
        openPop(t, styleSheet(), { style: true });
        settleSegs();
        drawStylePreview();
      }
      else if (act === "resetLink") {
        const { link } = await api(`/api/admin/users/${t.dataset.user}/reset-link`, { body: {} });
        // Shown rather than copied straight away: iPhones only allow copying inside the tap itself.
        openPop(t, `<div class="note"><b>Reset link</b>Single use, valid for 48 hours. Signs them out on other devices.</div>
          <div class="note" style="word-break:break-all;user-select:all;-webkit-user-select:all">${esc(link)}</div>
          <button data-copy="${esc(link)}" data-copied="Reset link copied">${ICON.copy}Copy link</button>`);
      }
      else if (act === "metaSoon") toast("Not available yet");
      else if (act === "feedbackAsk") {
        openPop($(".mtop .av") || t, `<div class="note"><b>Send feedback</b>Report a problem or suggest a feature.</div>
          <form class="feedback"><textarea id="fbIn" rows="4" maxlength="3000" placeholder="Describe the issue or idea"></textarea>
          <button class="btn" type="submit">Send</button></form>`, { top: true });
        $("#fbIn").focus();
      }
      else if (act === "renameAsk") {
        const item = S.listings.find((x) => x.id === t.dataset.id) || (S.current && S.current.listing.id === t.dataset.id ? S.current.listing : null);
        if (!item) return;
        // On a phone it opens at the top, so the keyboard doesn't cover it.
        openPop(from(item.id) || $(`[data-card="${item.id}"]`) || $("[data-act=listmenu]") || t, `<div class="note"><b>Rename chat</b></div>
          <form class="rename" data-id="${item.id}"><input id="renameIn" maxlength="80" value="${esc(listingName(item))}" placeholder="${esc(item.address || "Name this chat")}" autocomplete="off" enterkeyhint="done">
          <button class="btn" type="submit">Save</button></form>`, { top: true });
        // Focused in the same tap, or iOS won't bring up the keyboard.
        const input = $("#renameIn");
        input.focus();
        input.select();
      }
      else if (act === "selectMode") { S.selecting = !S.selecting; buzz(5); viewListings(); }
      else if (act === "selectAll") { const props = properties(); S.picked = S.picked.size === props.length ? new Set() : new Set(props.map((x) => x.id)); buzz(5); viewListings(); }
      else if (act === "selectOne") { S.selecting = true; S.picked = new Set([t.dataset.id]); viewListings(); }
      else if (act === "markSold") {
        await api(`/api/listings/${t.dataset.id}`, { method: "PATCH", body: { status: t.dataset.sold === "1" ? "sold" : "active" } });
        await loadListings();
        toast(t.dataset.rent === "1" ? (t.dataset.sold === "1" ? "Marked as rented" : "Marked as for rent") : t.dataset.sold === "1" ? "Marked as sold" : "Marked as for sale");
        viewListings(); drawSide();
      } else if (act === "delOne" || act === "delPicked") {
        const ids = act === "delOne" ? [t.dataset.id] : [...S.picked];
        const name = ids.length === 1 ? listingName(S.listings.find((x) => x.id === ids[0]) || {}) : `${ids.length} chats`;
        openPop(act === "delPicked" ? t : from(ids[0]) || $(`[data-card="${ids[0]}"]`) || t, `<div class="note"><b>${ids.length === 1 ? "Delete chat?" : `Delete ${ids.length} chats?`}</b>This can't be undone.</div>
          <button class="danger" data-act="delYes" data-ids="${ids.join(",")}">${ICON.trash}Delete ${ids.length === 1 ? "chat" : `${ids.length} chats`}</button>`);
      } else if (act === "delYes") await deleteListings(t.dataset.ids.split(","));
      else if (act === "delListingAsk") {
        openPop($("[data-act=listmenu]") || t, `<div class="note"><b>Delete chat?</b>This can't be undone.</div>
          <button class="danger" data-act="delListingYes">${ICON.trash}Delete chat</button>`);
      } else if (act === "delListingYes") {
        await api(`/api/listings/${l.id}`, { method: "DELETE" });
        S.current = null;
        await Promise.all([loadMe(), loadListings(), loadInbox()]);
        toast("Chat deleted");
        location.hash = "#/listings";
      }
      else if (act === "dlmenu") {
        const ad = adFor(S.selected[l.id]);
        openPop(t, `<button data-dl="feed">${ICON.down}Feed image</button><button data-dl="story">${ICON.down}Story image</button>
          <button data-copy="${esc(ad.primary_text)}" data-copied="Ad text copied">${ICON.copy}Copy ad text</button>
          <button data-copy="${esc(`${location.origin}/l/${l.slug}?v=${ad.id}`)}">${ICON.link}Copy ad link</button>
          <div class="sep"></div><div class="note">Use the ad link so leads are tracked.</div>`);
      }
      else if (act === "logout") { await api("/api/logout", { body: {} }); location.href = "/login"; }
      else if (act === "chat" || act === "ads") showAds(act === "ads");
      else if (act === "expand") { const m = t.closest(".me"); m.classList.remove("clamp"); t.remove(); }
      else if (act === "more") { const ad = adFor(S.selected[l.id]); $("#cp").innerHTML = `<b>${esc(($("#cp b") || {}).textContent || "")}</b>${esc(ad.primary_text)}`; }
      else if (act === "issues") { S.showIssues = !S.showIssues; drawPreview(); }
      else if (act === "remake" && !paid() && S.me.usage.adsMade >= S.me.usage.freeLimit) upgradeSheet("limit");
      else if (act === "remake") {
        const before = S.current.messages.length;
        toast(S.current.ads.length ? "Creating new ads…" : "Creating ads…");
        S.fresh = l.id;
        const next = await api(`/api/listings/${l.id}/remake`, { body: {} });
        drawListing(next);
        if (!next.ads.length && next.messages.length === before) toast("New ads require an upgrade");
        refreshSide();
      }
      else if (t.dataset.say) { if (!S.busy) { S.busy = true; buzz(6); try { await say(t.dataset.say); } finally { S.busy = false; } } }
      else if (t.dataset.pick) {
        pick(Number(t.dataset.pick));
      } else if (t.dataset.fmt) { S.format = t.dataset.fmt; buzz(5); drawPreview(); }
      else if (act === "run" && !paid()) { buzz(8); upgradeSheet("run", t); }
      else if (act === "run") {
        t.disabled = true;
        buzz(8);
        const next = await api(`/api/listings/${l.id}/run`, { body: { versions: S.current.ads.map((a) => a.version) } });
        drawListing(next);
        refreshSide();
      } else if (t.dataset.confirm) {
        t.disabled = true;
        // With Meta connected, each approved ad goes as the app draws it (feed size, PNG).
        if (S.me.meta?.ready) await sendRenders(t.dataset.confirm).catch((err) => { t.disabled = false; throw err; });
        const next = await api(`/api/listings/${l.id}/run`, { body: { confirm: t.dataset.confirm } });
        celebrate("Approved");
        drawListing(next);
        refreshSide();
        if (S.me.meta?.ready) waitForMeta(l.id, next.messages.length);
      } else if (t.dataset.fill) { const ta = $("#ta"); ta.value = t.dataset.fill; ta.dispatchEvent(new Event("input")); ta.focus(); }
      else if (t.dataset.upgrade !== undefined) upgradeSheet("plans", t);
      else if (t.dataset.checkout !== undefined) {
        const { url } = await api("/api/billing/checkout", { body: { plan: S.pickPlan || S.me.plans[0].id } });
        location.href = url;
      } else if (t.dataset.copy) { await navigator.clipboard.writeText(t.dataset.copy); buzz(6); toast(t.dataset.copied || "Link copied"); }
      else if (t.dataset.dl) { await download(t.dataset.dl); toast("Downloaded"); }
      else if (t.dataset.use) {
        const v = S.selected[l.id];
        const idx = S.current.photos.findIndex((p) => p.id === t.dataset.use);
        buzz(6);
        drawListing(await api(`/api/listings/${l.id}/messages`, { body: { text: `Use photo ${idx + 1} on ad ${v}`, version: v } }), true);
      }
    } catch (err) {
      toast(err.message);
      t.disabled = false;
    }
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closePop(); });
  window.addEventListener("resize", () => { if (!phone()) closePop(); });
  // Renaming a listing (from its card menu or its ··· menu).
  document.addEventListener("submit", async (e) => {
    const f = e.target.closest("form.spendf");
    if (!f) return;
    e.preventDefault();
    const spend = Number($("#spendIn").value) || 0;
    closePop();
    try {
      await api(`/api/listings/${f.dataset.id}`, { method: "PATCH", body: { spend } });
      toast("Spend saved");
      S.repCache.clear();
      if (location.hash.startsWith("#/report")) viewReport();
    } catch (err) { toast(err.message); }
  });
  document.addEventListener("submit", async (e) => {
    const fb = e.target.closest("form.feedback");
    if (fb) {
      e.preventDefault();
      const body = $("#fbIn").value.trim();
      if (!body) return;
      closePop();
      try {
        await api("/api/feedback", { body: { body, page: location.hash || "#/today" } });
        toast("Feedback sent");
      } catch (err) { toast(err.message); }
      return;
    }
    const f = e.target.closest("form.rename");
    if (!f) return;
    e.preventDefault();
    const id = f.dataset.id;
    const title = $("#renameIn").value.trim();
    closePop();
    // The new name shows straight away, everywhere it appears; the save happens behind it and is
    // undone on screen if it fails.
    const redraw = (value) => {
      for (const l of S.listings) if (l.id === id) l.title = value;
      numberNames();
      if (S.current && S.current.listing.id === id) S.current.listing.title = value;
      if (location.hash.startsWith("#/listings")) viewListings();
      else if (S.current && S.current.listing.id === id && location.hash.startsWith(`#/l/${id}`)) drawListing(S.current, true);
      drawSide();
    };
    const before = (S.listings.find((l) => l.id === id) || (S.current && S.current.listing) || {}).title || null;
    redraw(title || null);
    try {
      await api(`/api/listings/${id}`, { method: "PATCH", body: { title } });
      toast(title ? "Renamed" : "Name reset");
    } catch (err) {
      redraw(before);
      toast(err.message);
    }
  });

  // On a phone the app's screens behave like an app: pressing and holding never starts selecting
  // text. Things worth copying (messages, ad text, anything you type in) still can be.
  const COPYABLE = "input, textarea, .md, .me, .pvb";
  document.addEventListener("selectstart", (e) => {
    const el = e.target.nodeType === 1 ? e.target : e.target.parentElement;
    if (phone() && !(el && el.closest(COPYABLE))) e.preventDefault();
  });

  // The Style sheet's own controls.
  $("#pop").addEventListener("click", (e) => {
    const t = e.target.closest("[data-st],[data-stwho],[data-stsize],[data-streset]");
    if (!t || !S.current) return;
    // The sheet redraws under the finger; the page's own click handling mustn't read that as a
    // tap outside it and close it.
    e.stopPropagation();
    if (t.dataset.stwho) { S.styleAll = t.dataset.stwho === "all"; $("#pop").innerHTML = `<div class="grab"></div>${styleSheet()}`; settleSegs(); drawStylePreview(); buzz(5); return; }
    if (t.dataset.stsize) return applyStyle({ style: {}, sizeStep: Number(t.dataset.stsize) * 0.1 });
    if (t.dataset.streset) return applyStyle({ style: { reset: true } });
    applyStyle({ style: { [t.dataset.st]: t.dataset.v || null } });
  });
  $("#pop").addEventListener("change", (e) => {
    const k = e.target.dataset && e.target.dataset.stpick;
    if (k) applyStyle({ style: { [k]: e.target.value } });
  });

  $("#sheetBg").addEventListener("click", () => { if (!(S.heldAt && Date.now() - S.heldAt < 700)) closePop(); });
  window.addEventListener("hashchange", route);
  // The date, the greeting and the report's days follow the phone's clock: at 00:00 (and at noon
  // and 18:00 for the greeting) the screen on show is redrawn, also when the app comes back from
  // the background after the day changed.
  const dayKey = () => { const d = new Date(), h = d.getHours(); return `${d.toDateString()} ${h >= 5 && h < 12 ? 0 : h >= 12 && h < 19 ? 1 : 2}`; };
  let shownDay = dayKey();
  const checkDay = () => {
    const now = dayKey();
    if (now === shownDay) return;
    const newDate = now.split(" ").slice(0, 4).join(" ") !== shownDay.split(" ").slice(0, 4).join(" ");
    shownDay = now;
    const view = location.hash.slice(2).split("/")[0] || "today";
    if (view === "today") viewWeek();
    else if (view === "report" && newDate) {
      // Watching this week when a new one starts: move on with it.
      if (S.repFollow) S.repMonday = mondayOf(new Date());
      viewReport();
    }
  };
  setInterval(checkDay, 30000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) checkDay(); });
  try { if (localStorage.getItem("hk.side") === "slim") setSide(true); } catch {}

  (async function start() {
    try {
      await Promise.all([loadMe(), loadListings(), loadInbox()]);
    } catch (e) {
      return;
    }
    if (!location.hash) location.hash = "#/today";
    else route();
    warmTabs();
    // Whether this device has notifications on, so Today can offer them once if not.
    pushState().then((st) => { S.pushState = st; if (st === "off" && (location.hash === "#/today" || !location.hash)) { S.todayHtml = ""; drawToday(); } }).catch(() => {});
    setInterval(async () => { try { await loadInbox(); await loadListings(); drawSide(); } catch {} }, 60000);
  })();
})();
