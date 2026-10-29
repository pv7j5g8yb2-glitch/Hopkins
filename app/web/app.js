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
  const MARK = (cls = "") => `<svg class="m mk ${cls}" viewBox="0 0 120 120" aria-hidden="true"><path d="M55.9 85.8C54.8 88.1 52.2 89.9 49.9 91.2C47.6 92.6 44.8 93.5 42.1 93.9C39.4 94.4 35.9 94.8 33.4 93.7C31.0 92.6 29.1 89.4 27.5 87.3C25.9 85.2 25.4 83.2 24.0 81.0C22.7 78.9 20.2 76.8 19.5 74.3C18.7 71.8 18.8 68.5 19.6 66.0C20.5 63.4 22.3 60.3 24.6 58.9C27.0 57.4 30.9 57.0 33.8 57.5C36.6 57.9 39.2 60.5 41.7 61.7C44.1 62.9 46.4 63.2 48.6 64.6C50.7 66.0 53.2 67.9 54.5 70.0C55.9 72.2 56.2 75.1 56.4 77.7C56.7 80.3 57.0 83.5 55.9 85.8Z" fill="#5B4873"/><path d="M97.0 31.0C98.4 33.8 99.0 36.2 100.4 39.5C101.7 42.7 105.3 46.7 105.1 50.5C104.9 54.3 102.0 59.3 99.0 62.3C95.9 65.2 90.8 67.3 86.7 68.2C82.7 69.1 78.3 68.5 74.7 67.7C71.2 67.0 68.2 65.4 65.3 63.8C62.4 62.2 59.8 60.5 57.4 58.1C55.1 55.7 51.8 52.7 51.2 49.4C50.7 46.1 52.8 41.9 54.1 38.3C55.4 34.7 56.8 30.9 59.3 27.7C61.7 24.4 65.2 20.5 68.9 18.8C72.7 17.1 77.8 16.8 81.6 17.5C85.4 18.1 89.2 20.3 91.7 22.6C94.3 24.8 95.5 28.2 97.0 31.0Z" fill="#D7AE62"/></svg>`;

  const ICON = {
    menu: '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    send: '<svg viewBox="0 0 24 24"><path d="M12 19V5M5.5 11.5 12 5l6.5 6.5"/></svg>',
    stop: '<svg viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="2.6" fill="currentColor" stroke="none"/></svg>',
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
  const S = { me: null, listings: [], inbox: [], current: null, selected: {}, selecting: false, picked: new Set(), snaps: {}, snapImg: {}, snapQueue: Promise.resolve(), segPos: {}, styleAll: false, format: "feed", pending: [], busy: false, showIssues: false, seen: {}, fresh: null };

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
        res = await fetch(path, { method, signal: opts.signal, headers: { ...(opts.body ? { "Content-Type": "application/json" } : {}), "X-Time-Zone": TZ }, body: opts.body ? JSON.stringify(opts.body) : undefined });
      } catch (err) {
        if (opts.signal?.aborted) throw Object.assign(new Error("Stopped"), { stopped: true });
        if (method === "GET" && attempt < 2) { await new Promise((r) => setTimeout(r, 1500)); continue; }
        throw new Error("No connection. Try again.");
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
    if (!t.firstChild) t.innerHTML = `<img src="/static/mark.svg" alt=""><span></span>`;
    const was = t.classList.contains("on");
    t.lastChild.textContent = msg;
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
  const homePrice = (l, short) => !l.price ? "" : (SYM[l.currency] || "$") + (short && l.price >= 1e6 ? `${(l.price / 1e6).toFixed(2).replace(/\.?0+$/, "")}M` : Number(l.price).toLocaleString("en-US"));
  // A listing with no photo gets a cover made from its own details instead of an empty square,
  // in the brand's style: oxblood ground, the price in gold (the number that matters), the
  // facts in cream, and the two pebbles drawn large and faint, placed differently per listing.
  const PEBBLES = `<path fill="#5B4873" d="M55.9 85.8C54.8 88.1 52.2 89.9 49.9 91.2C47.6 92.6 44.8 93.5 42.1 93.9C39.4 94.4 35.9 94.8 33.4 93.7C31.0 92.6 29.1 89.4 27.5 87.3C25.9 85.2 25.4 83.2 24.0 81.0C22.7 78.9 20.2 76.8 19.5 74.3C18.7 71.8 18.8 68.5 19.6 66.0C20.5 63.4 22.3 60.3 24.6 58.9C27.0 57.4 30.9 57.0 33.8 57.5C36.6 57.9 39.2 60.5 41.7 61.7C44.1 62.9 46.4 63.2 48.6 64.6C50.7 66.0 53.2 67.9 54.5 70.0C55.9 72.2 56.2 75.1 56.4 77.7C56.7 80.3 57.0 83.5 55.9 85.8Z"/><path fill="#D7AE62" d="M97.0 31.0C98.4 33.8 99.0 36.2 100.4 39.5C101.7 42.7 105.3 46.7 105.1 50.5C104.9 54.3 102.0 59.3 99.0 62.3C95.9 65.2 90.8 67.3 86.7 68.2C82.7 69.1 78.3 68.5 74.7 67.7C71.2 67.0 68.2 65.4 65.3 63.8C62.4 62.2 59.8 60.5 57.4 58.1C55.1 55.7 51.8 52.7 51.2 49.4C50.7 46.1 52.8 41.9 54.1 38.3C55.4 34.7 56.8 30.9 59.3 27.7C61.7 24.4 65.2 20.5 68.9 18.8C72.7 17.1 77.8 16.8 81.6 17.5C85.4 18.1 89.2 20.3 91.7 22.6C94.3 24.8 95.5 28.2 97.0 31.0Z"/>`;
  // A listing with no photo gets the Hopkins ground and pebbles, nothing written on it
  // (Ismael, 2026-10-27): the name and status are already on the card.
  function cover(l) {
    const h = [...String(l.id)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
    const x = -18 + (h % 40), y = -30 + ((h >> 6) % 45), turn = (h >> 11) % 360;
    return `<svg class="cv-art" viewBox="0 0 120 120" style="left:${x}%;top:${y}%;transform:rotate(${turn}deg)">${PEBBLES}</svg>`;
  }
  const photoOrCover = (l, thumb) => (l && l.photo_id ? { cls: "", style: `background-image:url(${photoUrl(l.photo_id, thumb)})`, inner: "" } : { cls: " cover", style: "", inner: l ? cover(l) : "" });

  const baseName = (l) => l.title || l.address || l.area || l.city || (l.untitled_no ? `Untitled ${l.untitled_no}` : "Untitled");
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
  const initials = () => (S.me.user.name || S.me.user.email).split(/[\s@.]+/).map((w) => w[0]).join("").slice(0, 2);
  // Your profile photo if you've added one, your initials if not.
  const avatarStyle = () => (S.me.user.avatar_id ? `style="background:#ddd url(${photoUrl(S.me.user.avatar_id, true)}) center/cover;color:transparent"` : "");
  // The phone's top bar. Top level pages show the logo and your avatar; inside a listing it
  // shows a back arrow and the listing, like any messaging app.
  function mtop(title, extra = "", opts = {}) {
    if (opts.back) {
      return `<div class="mtop"><a class="icon-btn mback" href="${opts.back}" aria-label="Back">${ICON.back}</a><div class="ttl">${opts.rename ? `<button class="rn" data-act="renameAsk" data-id="${opts.rename}"><b>${esc(title)}</b></button>` : `<b>${esc(title)}</b>`}${opts.sub ? `<span>${esc(opts.sub)}</span>` : ""}</div>${extra}</div>`;
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
      ? `<div class="note"><b>Pro</b>Billed monthly. Cancel anytime.</div>`
      : `<div class="note"><b>Free plan</b><div class="meter"><i style="width:${Math.min(100, (u.adsMade / u.freeLimit) * 100)}%"></i></div>${Math.min(u.adsMade, u.freeLimit)} of ${u.freeLimit} free ads made</div>`;
    return `<div class="note" style="padding-bottom:2px"><b>${esc(myName())}</b>${esc(S.me.user.email)}</div>${plan}<div class="sep"></div>
      <a href="#/settings">${ICON.gear}Settings</a><a href="#/brand">${ICON.brush}Brand</a>${S.me.admin ? `<a href="#/admin">${ICON.shield}Admin</a>` : ""}
      ${S.me.demo ? `<button data-act="demoLeave">${ICON.back}Back to my account</button>` : ""}<button data-act="feedbackAsk">${ICON.msg}Send feedback</button>
      <div class="sep"></div><button data-act="logout">${ICON.out}Sign out</button>`;
  }

  function listingMenu() {
    const l = S.current.listing;
    const ad = adFor(S.selected[l.id]);
    const own = ad
      ? `<div class="sep"></div><button data-dl="feed">${ICON.down}Download feed image</button><button data-dl="story">${ICON.down}Download story image</button>
         <button data-copy="${esc(ad.primary_text)}" data-copied="Ad text copied">${ICON.copy}Copy ad text</button>`
      : "";
    return `<button data-act="renameAsk" data-id="${l.id}">${ICON.pen}Rename</button><a href="/l/${esc(l.slug)}" target="_blank" rel="noopener">${ICON.eye}Open Lead page</a>
      ${ad ? `<button data-copy="${esc(`${location.origin}/l/${l.slug}?v=${ad.id}`)}">${ICON.link}Copy ad link</button>` : ""}${own}
      <div class="sep"></div><button data-act="remake">${ICON.redo}${S.current.ads.length ? "Create new ads" : "Create ads"}</button>
      <button class="danger" data-act="delListingAsk">${ICON.trash}Delete listing</button>`;
  }

  // ---------- frame ----------

  async function loadMe() {
    S.me = await api("/api/me");
  }

  async function loadListings() { S.listings = (await api("/api/listings")).listings; numberNames(); }
  async function loadInbox() { const r = await api("/api/inbox"); S.inbox = r.items; S.leadsWeek = r.leadsWeek; S.inboxLoaded = true; }

  // The tab you tapped lights up straight away, before its screen has loaded.
  function markNav() {
    const view = location.hash.slice(2).split("/")[0];
    const nav = view === "l" ? "listings" : view || "today";
    $$(".nv,.tabbar a").forEach((a) => a.classList.toggle("on", a.dataset.nav === nav));
  }

  function drawSide() {
    const route = location.hash.slice(2).split("/");
    markNav();
    const waiting = S.inbox.filter((m) => m.needs_action).length;
    $$("[data-badge]").forEach((b) => (b.textContent = waiting || ""));
    $("#lists").innerHTML = S.listings.length
      ? S.listings.map((l) => `<a class="li ${route[0] === "l" && route[1] === l.id ? "on" : ""}" href="#/l/${l.id}">
          <i class="th${l.photo_id ? "" : " cover-mini"}" style="${l.photo_id ? `background-image:url(${photoUrl(l.photo_id, true)})` : ""}"></i>
          <div class="nm"><b>${esc(listingName(l))}</b></div><button class="more" data-act="limenu" data-id="${l.id}" aria-label="More for ${esc(listingName(l))}">${ICON.dots}</button></a>`).join("")
      : `<div class="empty-side">Nothing yet.</div>`;
    $("#acct").innerHTML = `<button data-act="account"><span class="av" ${avatarStyle()}>${esc(initials())}</span><span class="nm"><b>${esc(myName())}</b><span>${paid() ? "Pro" : "Free plan"}</span></span>${ICON.chev}</button>`;
  }

  // ---------- routing ----------

  // Each route gets a number. A screen that finishes loading after you've already moved on
  // checks it and quietly stops, so a slow screen can never draw over the one you picked.
  let routeSeq = 0;
  const current = () => routeSeq;
  async function route() {
    const seq = ++routeSeq;
    closePop();
    markNav();
    const [view, id] = location.hash.slice(2).split("/");
    if (view !== "listings") { S.selecting = false; document.body.classList.remove("selecting"); }
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

  // Today draws at once from what's already loaded, then again only if the fresh copy differs,
  // so tapping the tab never waits on the network.
  async function viewToday() {
    const my = current();
    if (S.inboxLoaded) drawToday();
    else main.innerHTML = `${mtop("Today")}${skeleton()}`;
    await loadInbox();
    if (my !== current()) return;
    drawToday();
  }

  function drawToday() {
    const first = (S.me.user.name || "").split(" ")[0];
    const h = new Date().getHours();
    const greet = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
    const waiting = S.inbox.filter((m) => m.needs_action);
    // The Monday report lives on Report, not here (Ismael, 2026-10-27).
    const recent = S.inbox.filter((m) => !m.needs_action && m.kind !== "report");
    const listingOf = (m) => S.listings.find((x) => x.id === m.listing_id);
    const where = (m) => listingName(m);
    // Just the home and its name (Ismael, 2026-10-27): the whole card opens it, no tag or button.
    const hero = (m) => {
      const pc = photoOrCover(listingOf(m));
      return `<a class="hero" href="#/l/${m.listing_id}"><div class="ph${pc.cls}" style="${pc.style}">${pc.inner}</div>
        <div class="bd"><div class="tx"><b>${esc(where(m))}</b></div></div></a>`;
    };
    const icon = (m) => (m.kind === "lead" ? ICON.people : m.kind === "report" ? ICON.chart : ICON.spark);
    const titleFor = (m) => (m.kind === "lead" ? `New Lead on ${where(m)}` : m.kind === "report" ? "Your Monday report" : where(m));
    const row = (m) => `<a class="row" href="${m.kind === "report" ? "#/report" : `#/l/${m.listing_id}`}"><span class="ic">${icon(m)}</span>
      <div class="tx"><b>${esc(titleFor(m))}</b><p>${esc(plainText(m.body))}</p></div><span class="when">${ago(m.created_at)}</span></a>`;

    const leadsWeek = S.leadsWeek ?? S.inbox.filter((m) => m.kind === "lead").length;
    let body;
    if (!S.listings.length) {
      const brandDone = S.me.workspace.brand.setup_done;
      body = `<div class="progress"><div class="meter"><i style="width:${brandDone ? 34 : 6}%"></i></div>${brandDone ? "1 of 3 done" : "Let's start"}</div>
        <ol class="steps">
        <li class="${brandDone ? "done" : "next"}"><div class="tx"><b>Your brand</b><p>Colours, logo and font.</p></div><a class="link" href="#/brand">${brandDone ? "Edit" : "Start"}</a></li>
        <li class="${brandDone ? "next" : ""}"><div class="tx"><b>Your first listing</b><p>Photos and a description.</p></div>${brandDone ? `<a class="btn" href="#/new">Start</a>` : ""}</li>
        <li><div class="tx"><b>Your approval</b><p>Nothing runs without it.</p></div></li></ol>`;
    } else {
      body = `<nav class="stats-mini" aria-label="At a glance">
          <a href="#/listings"><b>${S.listings.length}</b><span>${S.listings.length === 1 ? "Listing" : "Listings"}</span></a>
          <a href="#/leads"><b>${leadsWeek}</b><span>${leadsWeek === 1 ? "Lead" : "Leads"} this week</span></a>
          <a href="#/today" data-act="toWaiting"><b>${waiting.length}</b><span>Needs your review</span></a></nav>

        ${waiting.length ? waiting.map(hero).join("") : `<div class="empty"><div class="ic">${ICON.check}</div><b>You're all caught up</b>New ads and Leads appear here.<br><a class="btn" href="#/new">${ICON.plus}New listing</a></div>`}
        ${recent.length ? `<div class="sec">This week</div><div class="list">${recent.map(row).join("")}</div>` : ""}`;
    }
    // The count lives in the row below, so the line under the greeting is just the day.
    const lede = !S.listings.length ? "Three steps to your first ads." : new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
    const html = `${mtop("Today")}<div class="page" data-today><div class="wrap"><div class="head"><h1>${greet}${first ? `, <span class="serif">${esc(first)}</span>` : ""}</h1><p class="lede">${lede}</p></div>${body}</div></div>`;
    if (html !== S.todayHtml || !main.querySelector(".page[data-today]")) { main.innerHTML = html; S.todayHtml = html; }
  }

  // ---------- Listings ----------

  // Clearing listings out, the way Photos does it: Select, tick the ones to go, Delete. Holding
  // a card (or right clicking it on a laptop) opens its own menu: select, mark as sold, delete.
  function viewListings() {
    const sel = S.selecting && S.listings.length;
    document.body.classList.toggle("selecting", Boolean(sel));
    if (!sel) S.picked = new Set();
    const card = (l, i) => { const pc = photoOrCover(l); return `<a class="card-l ${S.picked.has(l.id) ? "picked" : ""}" href="#/l/${l.id}" data-card="${l.id}" style="animation-delay:${sel ? 0 : Math.min(i, 8) * 0.04}s"><div class="ph${pc.cls}" style="${pc.style}">${pc.inner}${sel ? `<i class="tick">${ICON.check}</i>` : ""}
      ${l.status === "sold" ? `<span class="chip green">Sold</span>` : l.waiting ? `<span class="chip gold">Ads ready</span>` : l.approved ? `<span class="chip">Approved</span>` : ""}</div>
      <div class="bd"><b>${esc(listingName(l))}</b></div></a>`; };
    const n = S.picked.size;
    const lede = sel ? (n ? `${n} selected` : "Select listings to delete") : S.listings.length ? `${S.listings.length} ${S.listings.length === 1 ? "home" : "homes"}` : "Your listings appear here.";
    main.innerHTML = `${mtop("Listings")}<div class="page"><div class="wrap"><div class="head head-row"><div><h1>Listings</h1><p class="lede">${lede}</p></div>
      ${S.listings.length ? `<button class="sel-btn" data-act="selectMode">${sel ? "Done" : "Select"}</button>` : ""}</div>
      <div class="cards ${sel ? "selecting" : ""}">${S.listings.map(card).join("")}${sel ? "" : `<a class="card-new" href="#/new">${ICON.plus}New listing</a>`}</div></div></div>
      ${sel ? `<div class="selbar lg"><button class="sec-btn" data-act="selectAll">${n === S.listings.length ? "Select none" : "Select all"}</button>
        <button class="btn del-btn" data-act="delPicked" ${n ? "" : "disabled"}>${ICON.trash}${n ? `Delete ${n}` : "Delete"}</button></div>` : ""}`;
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
      <a href="#/l/${l.id}">${ICON.eye}Open</a>
      <button data-act="renameAsk" data-id="${l.id}">${ICON.pen}Rename</button>
      <button data-act="selectOne" data-id="${l.id}">${ICON.check}Select</button>
      <button data-act="markSold" data-id="${l.id}" data-sold="${l.status === "sold" ? 0 : 1}">${ICON.flag}${l.status === "sold" ? "Mark as for sale" : "Mark as sold"}</button>
      <div class="sep"></div><button class="danger" data-act="delOne" data-id="${l.id}">${ICON.trash}Delete listing</button>`);
  }

  async function deleteListings(ids) {
    await api("/api/listings/delete", { body: { ids } });
    S.selecting = false;
    await Promise.all([loadMe(), loadListings(), loadInbox()]);
    toast(ids.length === 1 ? "Listing deleted" : `${ids.length} listings deleted`);
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

  const EXAMPLE = "Just listed: 412 Oak Street in Riverside, Austin, TX. 3 bed, 2 bath, 1,840 sq ft craftsman with a wraparound porch, renovated kitchen with a quartz island, fenced backyard and a home office. $649,000";

  const LISTINGISH = [
    /https?:\/\//i,
    /\$\s?\d|\b\d[\d,.]*\s?(k|m|million)\b|\b\d{3},\d{3}\b/i,
    /\b\d+(\.\d)?\s*(bed|bd|br|bath|ba)(room)?s?\b/i,
    /\b[\d,]+\s*(sq\.?\s*f(ee|oo)?t|sqft|square f(ee|oo)t|sf)\b/i,
    /\b\d+\s+[a-z]+(\s[a-z]+)?\s+(st|street|ave|avenue|rd|road|dr|drive|ln|lane|blvd|boulevard|way|ct|court|pl|place|terrace|crescent)\b/i,
    /\b(just listed|new listing|for sale|listing for)\b/i,
  ];

  function viewNew() {
    S.newChat = [];
    main.innerHTML = `${mtop("New listing", "", { back: "#/today" })}<section class="chat"><div class="ch"><div class="tt"><h2>New listing</h2></div></div>
      <div class="msgs" id="msgs"><div class="intro"><h1>What are you <span class="serif">selling?</span></h1><p>Add photos, then paste the link or describe the home. <button class="link" data-act="example">Try an example</button></p>
      ${!paid() && S.me.usage.adsMade >= S.me.usage.freeLimit ? `<div class="notice"><b>Your ${S.me.usage.freeLimit} free ads are used.</b> Ads for this listing need Pro.
        ${S.me.workspace.brand.upgrade_requested ? `<span class="small">Pro requested.</span>` : `<button class="link" data-upgrade>Ask for Pro</button>`}</div>` : ""}</div>
      <label class="drop" id="drop"><span class="ic">${ICON.photo}</span><b>Add photos</b><span>Hopkins picks the best photo for each ad.</span><div class="grid" id="dropGrid"></div><input type="file" accept="image/*,.heic,.heif" multiple hidden id="dropFiles"></label>
      <div class="thread" id="thread" style="margin-top:18px"></div></div>
      ${composerHtml(ASK)}</section>`;
    const dropEl = $("#drop");
    $("#dropFiles").addEventListener("change", (e) => { S.addFiles(e.target.files); e.target.value = ""; });
    dropEl.addEventListener("dragover", (e) => { e.preventDefault(); dropEl.classList.add("drag"); });
    dropEl.addEventListener("dragleave", () => dropEl.classList.remove("drag"));
    dropEl.addEventListener("drop", (e) => { e.preventDefault(); dropEl.classList.remove("drag"); S.addFiles(e.dataTransfer.files); });
    $("#dropGrid").addEventListener("click", (e) => { const i = e.target.dataset.rm; if (i !== undefined) { e.preventDefault(); S.removeFile(Number(i)); } });
    bindComposer(async (text, files) => {
      if (S.editing && S.editing.nc != null) {
        const at = Number(S.editing.nc);
        let n = $(`#thread .mact.me-act[data-nc="${at}"]`)?.previousElementSibling;
        stopEdit(false);
        while (n) { const next = n.nextElementSibling; n.remove(); n = next; }
        S.newChat.length = at;
      }
      // Clear the box straight away so it doesn't look like nothing happened.
      const ta = $("#ta");
      ta.value = "";
      ta.dispatchEvent(new Event("input"));
      try { await create(text, files); } catch (err) { if (!err.stopped) { ta.value = text; viewNew(); $("#ta").value = text; } throw err; }
    }, {
      drop: (pending) => {
        dropEl.classList.toggle("has", pending.length > 0);
        $("#dropGrid").innerHTML = pending.length ? pending.map((p, i) => `<i class="${p.url ? "" : "wait"}" style="${p.url ? `background-image:url(${p.url});` : ""}position:relative"><button type="button" data-rm="${i}" aria-label="Remove" style="position:absolute;right:4px;top:4px;width:22px;height:22px;border-radius:50%;background:rgba(42,15,20,.75);color:#fff;font-size:13px;line-height:22px">×</button></i>`).join("") + `<span class="more">${ICON.plus}</span>` : "";
      },
    });
    async function create(text, files) {
      $("#drop").style.display = "none";
      $(".intro").style.display = "none";
      $("#thread").insertAdjacentHTML("beforeend", sentPhotos(files.map((f) => URL.createObjectURL(f)), " in") + (text ? `<div class="me in"><span class="tx">${esc(text)}</span></div>${msgActs(`data-nc="${S.newChat.length}"`, true, true)}` : ""));
      // Only a message that looks like a listing shows the listing steps. Anything else ("Hello",
      // "what's 1+2?") gets the thinking mark and a reply; the server decides for sure. A number on
      // its own isn't a listing (2026-10-27): it takes a price, beds, baths, size, a street
      // address, a link or photos, the same things the server looks for.
      const listingish = files.length || LISTINGISH.some((re) => re.test(text));
      // Stop: your message stays and the conversation carries on here; no listing is made, and
      // any photos you sent go back in the box.
      const ctrl = new AbortController();
      S.stop = () => {
        ctrl.abort();
        $("#typing") && $("#typing").remove();
        $("#work") && $("#work").closest(".hk")?.remove();
        S.newChat.push({ role: "agent", body: text || "(sent photos)" });
        api("/api/new/stop", { body: {} }).catch(() => {});
        if (files.length) setTimeout(() => S.addFiles(files), 0);
      };
      const signal = ctrl.signal;
      if (!listingish) {
        showTyping();
        const my = current();
        const p = await api("/api/listings", { body: { text, history: S.newChat }, signal });
        if (my !== current()) return;
        $("#typing") && $("#typing").remove();
        if (p.listing) { await Promise.all([loadMe(), loadListings()]); S.fresh = p.listing.id; S.seen[p.listing.id] = S.newChat.length + 1; location.hash = `#/l/${p.listing.id}`; return; }
        S.newChat.push({ role: "agent", body: text }, { role: "hopkins", body: p.chat.reply });
        $("#thread").insertAdjacentHTML("beforeend", `<div class="hk in">${MARK("settle")}<div class="b">${md(p.chat.reply)}${msgActs(`data-nc="${S.newChat.length - 1}"`, false)}</div></div>`);
        typeOut([$("#thread .hk:last-child")], $("#msgs"));
          $("#ta").placeholder = REPLY;
        $("#msgs").scrollTop = $("#msgs").scrollHeight;
        return;
      }
      const finish = showWork();
      const photoIds = [], photoNames = {};
      for (const f of files) {
        const r = await uploadPhoto(f);
        if (signal.aborted) throw Object.assign(new Error("Stopped"), { stopped: true });
        photoIds.push(r.id);
        photoNames[r.id] = f.name;
      }
      const p = await api("/api/listings", { body: { text, photoIds, photoNames, history: S.newChat }, signal });
      if (p.stopped) return;
      if (p.chat) {
        // It wasn't a listing after all: the reply takes the thinking mark's place.
        $("#work").closest(".hk").remove();
        S.newChat.push({ role: "agent", body: text }, { role: "hopkins", body: p.chat.reply });
        $("#thread").insertAdjacentHTML("beforeend", `<div class="hk in">${MARK("settle")}<div class="b">${md(p.chat.reply)}${msgActs(`data-nc="${S.newChat.length - 1}"`, false)}</div></div>`);
        typeOut([$("#thread .hk:last-child")], $("#msgs"));
          $("#ta").placeholder = REPLY;
        $("#msgs").scrollTop = $("#msgs").scrollHeight;
        return;
      }
      await finish();
      // The listing loads while the chat and the thinking mark are still on screen, then takes
      // their place in one go: no grey placeholder in between.
      const [, , full] = await Promise.all([loadMe(), loadListings(), api(`/api/listings/${p.listing.id}`).catch(() => null)]);
      if (full) S.ready = full;
      S.fresh = p.listing.id;
      // The conversation so far is already on screen; only what's new animates in.
      if (S.newChat.length) S.seen[p.listing.id] = S.newChat.length + 1;
      location.hash = `#/l/${p.listing.id}`;
    }
  }

  // ---------- a listing: chat and preview ----------

  async function viewListing(id, keepScroll) {
    const my = current();
    const ready = S.ready && S.ready.listing.id === id ? S.ready : null;
    S.ready = null;
    if (ready) return drawListing(ready, keepScroll);
    if (!S.current || S.current.listing.id !== id) main.innerHTML = `${mtop("", "", { back: "#/listings" })}${skeleton()}`;
    const p = await api(`/api/listings/${id}`);
    if (my !== current()) return;
    drawListing(p, keepScroll);
  }

  function drawListing(p, keepScroll) {
    S.current = p;
    S.editing = null;
    const l = p.listing;
    if (!S.selected[l.id]) S.selected[l.id] = 1;
    const prevScroll = keepScroll && $("#msgs") ? $("#msgs").scrollTop : null;
    const showPv = S.openAds || ($("#lv") && $("#lv").classList.contains("showpv"));
    S.openAds = false;
    const seen = S.seen[l.id] ?? (S.fresh === l.id ? 1 : p.messages.length);
    const reveal = S.fresh === l.id;
    S.fresh = null;
    const chip = l.status === "sold" ? `<span class="chip green">Sold</span>` : l.moment !== "new" ? `<span class="chip gold">${esc(S.me.moments[l.moment])}</span>` : "";
    const sub = [l.priceText, l.facts].filter(Boolean).join(" · ");
    const firstPhoto = p.photos[0];
    main.innerHTML = `${mtop(listingName(l), `${p.ads.length ? `<div class="seg ptab" data-seg="view"><button data-act="chat" class="${showPv ? "" : "on"}">Chat</button><button data-act="ads" class="${showPv ? "on" : ""}">Ads</button></div>` : ""}<button class="icon-btn" data-act="listmenu" aria-label="More">${ICON.dots}</button>`, { back: "#/listings", sub, rename: l.id })}
      <div class="lv ${showPv ? "showpv" : ""} ${p.ads.length ? "" : "noads"}" id="lv">
      <section class="chat"><div class="ch">${firstPhoto ? `<i class="thumb" style="background-image:url(${photoUrl(firstPhoto.id, true)})"></i>` : ""}<div class="tt"><button class="rn" data-act="renameAsk" data-id="${l.id}" title="Rename"><h2>${esc(listingName(l))}</h2></button><span class="sub">${esc(sub)}</span></div>${chip}
        <div class="r"><button class="icon-btn" data-act="listmenu" aria-label="More">${ICON.dots}</button></div></div>
        <div class="msgs" id="msgs"><div class="thread" id="thread">${messagesHtml(p, seen, reveal)}</div></div>${composerHtml(REPLY)}</section>
      <section class="pv" id="pv"></section></div>`;
    S.seen[l.id] = p.messages.length;
    const msgs = $("#msgs");
    msgs.style.scrollBehavior = "auto";
    msgs.scrollTop = prevScroll ?? msgs.scrollHeight;
    msgs.style.scrollBehavior = "";
    if (prevScroll == null) typeOut($$("#thread .hk.in"), msgs);
    drawMiniCards();
    drawPreview();
    settleSegs();
    bindComposer(async (text, files) => {
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

  async function say(text) {
    const l = S.current.listing;
    showTyping(text);
    const my = current();
    const signal = stoppable(l);
    let next;
    try {
      next = await api(`/api/listings/${l.id}/messages`, { body: { text, version: S.selected[l.id] }, signal });
    } catch (err) {
      if (err.stopped) throw err;
      // No answer (no signal, the server's down): stop thinking.
      $("#typing") && $("#typing").remove();
      // The message didn't go, so it goes back in the box (the composer keeps it), not in the chat.
      const mine = $$("#thread .me");
      if (mine.length) mine[mine.length - 1].remove();
      throw err;
    }
    if (my !== current()) return;
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
    if (my !== current()) return;
    S.seen[l.id] = i;
    if (next.focus && next.ads.some((a) => a.version === next.focus)) S.selected[l.id] = next.focus;
    drawListing(next);
    refreshSide();
    if (next.upgrade) upgradeSheet(next.upgrade);
  }

  // The paid plan, as a card over the screen: what Run it (or a new ad past the free 3) needs.
  // It replaces posting the same upgrade note into the chat every time.
  function upgradeSheet(reason = "run", anchor) {
    const asked = S.me.workspace.brand.upgrade_requested;
    const title = reason === "run" ? `Ready to <span class="serif">run?</span>` : `You've used your <span class="serif">3 free ads.</span>`;
    const line = reason === "run"
      ? "Running ads requires Pro."
      : "New ads require Pro. Changes are included.";
    openPop(anchor || $(".actrow [data-act=run]") || $(".mtop"), `<div class="upsell">
      <img class="upsell-mark" src="/static/mark.svg" alt="">
      <h3>${title}</h3><p>${line}</p>
      <ul><li><b>From $${S.me.usage.priceFrom} a month</b>, billed monthly</li><li>Month to month, cancel anytime</li><li>No cut of your ad spend</li><li>30% off the first year if you joined the waitlist</li></ul>
      ${asked ? `<p class="upsell-done">Pro requested.</p>` : `<button class="btn" data-upgrade>Ask for Pro</button>`}
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
      // A reply that changed ads shows them as they were right then, so every round of changes
      // is visible where it happened. Drawn once into a small image and kept.
      const snap = m.data && Array.isArray(m.data.snapshot) ? m.data.snapshot : null;
      if (snap && snap.length) {
        return wrap(`${text}<div class="vers ${i >= seen ? "reveal" : ""}">${snap.map((a) => {
          const key = `${m.id}:${a.version}`;
          S.snaps[key] = a;
          return `<button class="vc ${a.version === S.selected[p.listing.id] ? "sel" : ""}" data-pick="${a.version}" data-open="1">
            <img class="snap" data-snap="${key}" alt="Ad ${a.version}" ${S.snapImg[key] ? `src="${S.snapImg[key]}"` : ""}><span>Ad ${a.version}</span></button>`;
        }).join("")}</div>`);
      }
      if (m.kind === "ads" && m === lastAds && p.ads.length) {
        return wrap(`${text}<div class="vers ${reveal ? "reveal" : ""}">${p.ads.map((a) => `<button class="vc ${a.version === S.selected[p.listing.id] ? "sel" : ""}" data-pick="${a.version}" data-open="1">
          <canvas data-mini="${a.version}" width="1080" height="1350"></canvas><span>Ad ${a.version}</span></button>`).join("")}</div>`);
      }
      if (m.kind === "plan") {
        const d = m.data;
        return wrap(`${text}<div class="plan"><div class="big">${money(d.budget)} <span class="serif" style="font-weight:400">over</span> ${d.days} days</div>
          <div class="meta">${money(d.perDay)} a day · ${esc(d.audience.location)}, ${d.audience.radiusMiles} miles · Housing category</div>
          ${m.needs_action ? `<div class="acts"><button class="btn" data-confirm="${m.id}">Approve and run</button><button class="link" data-fill="Run it with $300 over 14 days">Change the budget</button></div>` : ""}</div>`);
      }
      if (m.kind === "upgrade") {
        const asked = S.me.workspace.brand.upgrade_requested;
        return wrap(`${text}<div class="acts"><button class="btn" data-upgrade ${asked ? "disabled" : ""}>${asked ? "Requested" : "Ask for Pro"}</button>
          ${asked ? `<span class="small">You'll get an email when your seat is ready.</span>` : ""}</div>`);
      }
      if (m.kind === "check") return wrap(`<div class="note-line">${esc(m.body)}<span class="small">A wording check, not legal advice.</span></div>`, false);
      if (m.kind === "lead") return wrap(`${text}<div class="acts"><a class="sec-btn" href="#/leads">${ICON.people}Open Leads</a></div>`);
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
      face: S.me.user.avatar_id ? photoUrl(S.me.user.avatar_id) : null,
      watermark: false,
      price: homePrice(l, true),
      place: l.area || l.city || "",
    };
  }

  function drawMiniCards() {
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
      <div class="small">${esc(x.address || x.area || "Listing")} · ${x.version ? `Ad ${x.version}` : "Lead page"} · ${ago(x.created_at)}</div>
      <div class="acts">${x.phone ? `<a href="tel:${esc(tel(x.phone))}">${ICON.phone}Call</a><a href="sms:${esc(tel(x.phone))}">${ICON.msg}Text</a>` : ""}${x.email ? `<a href="mailto:${esc(x.email)}">${ICON.mail}Email</a>` : ""}
      <select data-lead="${x.id}" aria-label="Status">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${x.status === k ? "selected" : ""}>${v}</option>`).join("")}</select></div></div></div>`;
    main.innerHTML = `${mtop("Leads")}<div class="page"><div class="wrap"><div class="head head-row"><div><h1>Leads</h1>${leads.length ? `<p class="lede">${leads.length} in total${fresh ? `, ${fresh} new` : ""}.</p>` : ""}</div>
      ${leads.length ? `<button class="sel-btn round" data-act="leadSearch" aria-label="Search Leads">${ICON.search}</button>` : ""}</div>
      ${leads.length ? `<div class="lsearch" id="lsearch" hidden>${ICON.search}<input type="search" id="lq" placeholder="Search Leads" autocomplete="off" enterkeyhint="search"><button data-act="leadSearchClose">Cancel</button></div>
      <div class="list" id="leadList" style="border-top:0">${leads.map(item).join("")}</div><p class="lnone" id="lnone" hidden></p>`
        : `<div class="empty"><div class="ic">${ICON.people}</div><b>No Leads yet</b>Each Lead shows the ad it came from.</div>`}</div></div>`;
    $$("[data-lead]").forEach((s) => s.addEventListener("change", async () => {
      await api(`/api/leads/${s.dataset.lead}`, { method: "PATCH", body: { status: s.value } });
      s.closest(".lead").classList.toggle("new", s.value === "new");
      buzz(6);
      toast("Saved");
    }));
    // Search: name, phone, email, home, what they asked and the status, as they type.
    const words = leads.map((x) => [x.name, x.email, x.phone, x.phone && tel(x.phone), x.address, x.area, x.note, WANTS[x.wants], STATUS[x.status], x.version && `Ad ${x.version}`].filter(Boolean).join(" ").toLowerCase());
    const rows = $$("#leadList .lead");
    $("#lq")?.addEventListener("input", (e) => {
      const q = e.target.value.trim().toLowerCase();
      const parts = q.split(/\s+/).filter(Boolean);
      let shown = 0;
      rows.forEach((r, i) => { const hit = parts.every((p) => words[i].includes(p) || (/\d/.test(p) && words[i].includes(p.replace(/[^\d+]/g, "")))); r.hidden = !hit; if (hit) shown++; });
      $("#lnone").hidden = Boolean(shown);
      $("#lnone").textContent = shown ? "" : `No Leads match "${e.target.value.trim()}".`;
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
    else if (!main.querySelector(".page[data-report]")) main.innerHTML = `${mtop("Report")}${skeleton()}`;
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
    // Top ads: the three single ads with the most Leads this week, each shown as itself (its photo
    // and its line) with its count. A tap opens that ad.
    const top = r.topAds || [];
    const winning = top.length ? `<section class="ta"><h3>Top ads</h3><div class="ta-row">${top.map((a, i) => {
      const l = S.listings.find((x) => x.id === a.listing_id);
      return `<a class="ta-card" href="#/l/${a.listing_id}" data-act="openAd" data-id="${a.listing_id}" data-v="${a.version}">
        <div class="ta-ph" style="${a.photo_id ? `background-image:url(${photoUrl(a.photo_id, true)})` : ""}"><span class="rb-rank m${i + 1}">${i + 1}</span><b>${esc(a.overlay)}</b></div>
        <div class="ta-bd"><span class="ta-nm">${esc(a.name)}</span><span class="ta-n"><b>${a.leads}</b> ${a.leads === 1 ? "Lead" : "Leads"}</span></div>
        <span class="ta-where">${esc(l ? listingName(l) : "")} · Ad ${a.version}</span></a>`;
    }).join("")}</div></section>` : "";

    main.innerHTML = `${mtop("Report")}<div class="page" data-report><div class="wrap">
      <div class="head"><h1>Report</h1><div class="rp-week">${reportHead(mon)}</div></div>
      <section class="rp-sum"><div class="rp-big"><b>${r.total}</b> ${r.total === 1 ? "Lead" : "Leads"}</div>${sub ? `<p class="rp-sub">${sub}</p>` : ""}
        <div class="rp-chart" role="img" aria-label="Leads each day: ${counts.join(", ")}">${bars}</div></section>
      ${winning}
      ${r.listings.length ? boardHtml(r) : ""}
    </div></div>`;
  }

  // The listings, ranked: best first by what's picked (leads, showings, cost per lead, or newest),
  // filtered to all, running or with leads. The pick is remembered on this device.
  const SORTS = [["leads", "Most Leads"], ["showings", "Most showings"], ["cpl", "Lowest cost per Lead"], ["newest", "Most recent"]];
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
      const unit = by === "showings" ? (v === 1 ? "showing" : "showings") : by === "cpl" ? (v != null ? "a Lead" : "") : v === 1 ? "Lead" : "Leads";
      return `<button class="rb-row${v ? "" : " zero"}" data-act="reportListing" data-id="${x.id}">
        ${ranked ? `<span class="rb-rank${medal}">${v ? i + 1 : ""}</span>` : ""}
        <i class="th${x.photo_id ? "" : " cover-mini"}" style="${x.photo_id ? `background-image:url(${photoUrl(x.photo_id, true)})` : ""}"></i>
        <span class="rb-mid"><b>${esc(listingName(S.listings.find((l) => l.id === x.id) || { title: x.name }))}</b>
          <span class="rb-track"><i class="${lead ? "top" : ""}" style="width:${width(x)}%"></i></span></span>
        <span class="rb-n"><b>${by === "cpl" ? (v != null ? esc(money(v)) : "") : v || 0}</b><em>${unit}</em></span></button>`;
    };
    return `<section class="rb" id="board"><div class="rb-head"><h3>Listings</h3><button class="rb-sort" data-act="repSort">${esc(SORTS.find(([k]) => k === by)[1])}${ICON.chev}</button></div>
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
      <div class="rp-mini"><div><b>${x.leads}</b>${x.leads === 1 ? "Lead" : "Leads"}</div><div><b>${x.showings}</b>${x.showings === 1 ? "Showing" : "Showings"}</div><div><b>${x.cpl != null ? money(x.cpl) : "Not set"}</b>Per Lead</div></div>
      <form class="spendf" data-id="${x.id}"><label for="spendIn">Ad spend to date</label><div class="row-s"><input id="spendIn" type="number" inputmode="decimal" min="0" step="1" value="${x.spend || ""}" placeholder="$0"><button class="btn" type="submit">Save</button></div>
      <p class="small">Available once Meta is connected.</p></form>
      <div class="sep"></div><a href="#/l/${x.id}">${ICON.eye}Open listing</a>`, { top: true });
  }

  // ---------- Brand ----------

  // The fonts an ad can use, in the order they're offered (Ismael, 2026-10-27).
  const FONT_CHOICES = [["modern", "Modern"], ["classic", "Classic"], ["elegant", "Elegant"], ["editorial", "Editorial"], ["bold", "Bold"], ["minimal", "Minimal"]];
  const COUNTRIES = ["United States", "Canada", "Australia", "United Arab Emirates", "United Kingdom", "Ireland", "Somewhere else"];
  // Quick picks that look good on real listing photos: a main color with an accent that suits it.
  const PALETTES = [["#1F2A36", "#C8A96A"], ["#111111", "#E8E2D6"], ["#22352B", "#D9B98A"], ["#2A0F14", "#D7AE62"], ["#2C3E50", "#E07A5F"], ["#3B2F2F", "#C9A27E"], ["#0F3D5E", "#F2C14E"], ["#4A4E69", "#F2E9E4"]];

  async function viewBrand() {
    const b = S.me.workspace.brand;
    const first = !b.setup_done;
    const field = (k, label, ph = "", hint = "") => `<div class="fld"><label for="f_${k}">${label}</label><input id="f_${k}" name="${k}" value="${esc(b[k] || "")}" placeholder="${esc(ph)}" autocomplete="off">${hint ? `<p class="small">${hint}</p>` : ""}</div>`;
    const radio = (k, opts) => `<div class="choice">${opts.map(([v, l]) => `<label><input type="radio" name="${k}" value="${v}" ${(b[k] || opts[0][0]) === v ? "checked" : ""}>${l}</label>`).join("")}</div>`;
    main.innerHTML = `${first ? `<div class="mtop"><span class="logo"><img src="/static/mark.svg" alt="">Hopkins</span></div>` : mtop("Brand")}<div class="page"><div class="wrap">
      <div class="head"><h1>${first ? `Make it <span class="serif">yours</span>` : "Brand"}</h1></div>
      <div class="brandgrid"><form class="form" id="brandForm">
        <div class="group"><h4>Details</h4><div class="grid2">${field("business", "Business name", "Ellery Realty")}${field("agent_name", "Your name", "Sam Ellery")}${field("city", "Main city", "Austin")}${field("instagram", "Instagram", "@elleryrealty")}</div></div>
        <div class="group"><h4>Branding</h4><div style="display:flex;flex-direction:column;gap:14px">
          <div><div class="colors"><label><input type="color" name="primary" value="${esc(b.primary || "#1F2A36")}">Main colour</label><label><input type="color" name="accent" value="${esc(b.accent || "#C8A96A")}">Accent</label></div>
          <div class="swatches">${PALETTES.map(([p1, p2]) => `<button type="button" data-pal="${p1},${p2}" style="background:${p1}" aria-label="Use ${p1} and ${p2}"><i style="background:${p2}"></i></button>`).join("")}</div></div>
          <div class="logo-up"><i id="logoPrev" style="${b.logo_id ? `background-image:url(${photoUrl(b.logo_id)})` : ""}"></i><label class="sec-btn">Upload logo<input type="file" accept="image/png,image/jpeg,image/webp" hidden id="logoFile"></label>${b.logo_id ? `<button type="button" class="link" id="logoRm">Remove</button>` : ""}</div></div></div>
        <div class="group"><h4>Font</h4><div class="fonts">${FONT_CHOICES.map(([v, l]) => { const f = Creative.FONTS[v]; return `<label class="fontc"><input type="radio" name="font" value="${v}" ${(b.font || "modern") === v ? "checked" : ""}><span style="font-family:'${f.family}';font-weight:${f.weight}">Aa</span><em>${l}</em></label>`; }).join("")}</div></div>
        <div class="group"><details class="more"><summary>More</summary><div class="inner">
          <div class="grid2">${field("phone", "Phone on Lead pages", "(512) 555 0100")}<div class="fld"><label for="f_country">Country</label><select id="f_country" name="country">${COUNTRIES.map((c) => `<option ${b.country === c ? "selected" : ""}>${c}</option>`).join("")}</select></div></div>
          ${field("license", "License line", "DRE #01234567", "Shown on your Lead pages where your state requires it.")}
        </div></details></div>
        <div class="save"><button class="btn" type="submit">${first ? "Continue" : "Save"}</button><span class="err" id="brandErr"></span></div>
      </form><div class="brandprev"><canvas id="brandCanvas" role="button" aria-label="Expand preview"></canvas><p class="small">${phone() ? "Live preview. Tap to expand." : "Sample ad"}</p></div></div></div></div>`;
    const form = $("#brandForm");
    let logoId = b.logo_id || "";
    const sample = () => {
      const brand = Object.fromEntries(new FormData(form).entries());
      brand.logo_id = logoId;
      const l = S.listings.find((x) => x.photo_id);
      $("#brandCanvas").onclick = () => zoomCanvas($("#brandCanvas"));
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
        if (first) { celebrate("Brand saved"); setTimeout(() => (location.hash = "#/today"), 900); }
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
          <label class="sec-btn">Change photo<input type="file" accept="image/*,.heic,.heif" hidden id="avFile"></label>
          ${u.avatar_id ? `<button class="link" data-act="avRemove" style="margin-left:10px">Remove</button>` : ""}</div></div>
        <div style="display:flex;flex-direction:column;gap:12px;margin-top:16px">
          ${fld("sName", "Your name", u.name, "text", "Sam Ellery", "name")}
          ${fld("sEmail", "Email", u.email, "email", "", "email")}
          <div class="fld hidden" id="sEmailPw">${`<label for="sEmailPass">Current password, required to change email</label><input id="sEmailPass" type="password" autocomplete="current-password">`}</div>
          <div><button class="sec-btn" data-act="saveProfile">Save profile</button></div></div></div>
      <div class="group"><h4>Business</h4>
        ${fld("sBiz", "Business, team or brokerage", b.business, "text", "Ellery Realty", "organization")}
        <div style="display:flex;gap:14px;align-items:center;margin-top:12px"><button class="sec-btn" data-act="saveBiz">Save</button><a class="link" href="#/brand">Colours, logo and font</a></div></div>
      <div class="group"><h4>Password</h4><div style="display:flex;flex-direction:column;gap:12px">
        ${fld("sPwCur", "Current password", "", "password", "", "current-password")}${fld("sPwNew", "New password", "", "password", "At least 8 characters", "new-password")}
        <div><button class="sec-btn" data-act="savePw">Change password</button></div></div></div>
      <div class="group"><h4>Lead alerts</h4>${b.alerts_topic
        ? `<p>On. New Leads are sent to your phone.</p>
           <ol class="steps-small"><li>Install ntfy from the App Store or Google Play.</li><li>Tap +, then subscribe to <b>${esc(b.alerts_topic)}</b> <button class="link" data-copy="${esc(b.alerts_topic)}" data-copied="Name copied">Copy</button></li><li>Send a test to check it arrives.</li></ol>
           <div style="display:flex;gap:14px;align-items:center;margin-top:12px"><button class="sec-btn" data-act="testAlert">Send a test alert</button><button class="link" data-act="alertsOff">Turn off</button></div>`
        : `<p class="small">Get a notification for every new Lead.</p>
           <div style="margin-top:12px"><button class="sec-btn" data-act="alertsOn">Turn on Lead alerts</button></div>`}</div>
      <div class="group"><h4>Plan</h4>${paid()
        ? `<p>Billed monthly. Cancel anytime.</p>`
        : `<p>Free plan</p><div class="meter" style="max-width:260px"><i style="width:${Math.min(100, (use.adsMade / use.freeLimit) * 100)}%"></i></div><p class="small">${Math.min(use.adsMade, use.freeLimit)} of ${use.freeLimit} free ads made.</p>
           <div style="margin-top:12px">${b.upgrade_requested ? `<span class="small">Pro requested.</span>` : `<button class="btn" data-upgrade>Ask for Pro</button>`}</div>`}</div>
      <div class="group"><h4>Account</h4><div style="display:flex;flex-direction:column;align-items:flex-start;gap:14px">
        <button class="sec-btn" data-act="logout">${ICON.out}Sign out</button>
        <button class="link danger" data-act="deleteAsk">Delete account</button><a class="link" href="/privacy" target="_blank" rel="noopener">Privacy policy</a></div></div>
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
    } else if (act === "alertsOn" || act === "alertsOff") {
      // A long random name, so nobody else can guess it and read the alerts.
      const topic = act === "alertsOn" ? `hopkins-${[...crypto.getRandomValues(new Uint8Array(9))].map((x) => "abcdefghijkmnpqrstuvwxyz23456789"[x % 32]).join("")}` : "";
      await api("/api/brand", { method: "PUT", body: { alerts_topic: topic } });
      await loadMe(); buzz(6); toast(topic ? "Lead alerts on" : "Lead alerts off");
      viewSettings();
    } else if (act === "testAlert") {
      await api("/api/alerts/test", { body: {} });
      toast("Test sent");
    } else if (act === "avRemove") {
      await api("/api/account", { method: "PATCH", body: { avatar_id: "" } });
      await loadMe(); drawSide(); viewSettings(); toast("Photo removed");
    } else if (act === "deleteAsk") {
      openPop(t, `<div class="note"><b>Delete your account?</b>Your listings, ads, Leads and photos will be permanently deleted.</div>
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
    const [{ workspaces }, { feedback }] = await Promise.all([api("/api/admin/workspaces"), api("/api/admin/feedback")]);
    if (my !== current()) return;
    main.innerHTML = `${mtop("Admin")}<div class="page"><div class="wrap"><div class="head head-row"><div><h1>Admin</h1><p class="lede">Only you see this.</p></div><button class="sec-btn" data-act="demoOpen">Open demo account</button></div>
      <div class="adm">${workspaces.map((w) => `<div class="adm-row"><div class="adm-who"><b>${esc(w.name)}</b><span class="small">${esc(w.emails || "")}</span>
          <span class="small">Joined ${ago(w.created_at)} · last in ${w.last_seen ? ago(w.last_seen) : "never"} · ${w.listings} ${w.listings === 1 ? "listing" : "listings"}, ${w.ads} ads, ${w.leads} ${w.leads === 1 ? "Lead" : "Leads"}${w.upgrade_requested ? ` · <b>asked to upgrade ${ago(w.upgrade_requested)}</b>` : ""}</span></div>
          <div class="adm-act"><select data-ws="${w.id}"><option value="free" ${w.plan === "free" ? "selected" : ""}>Free</option><option value="paid" ${w.plan === "paid" ? "selected" : ""}>Pro</option></select>
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
    if (!e.target.closest("#pop") && !e.target.closest("[data-act=account],[data-act=listmenu],[data-act=limenu],[data-act=dlmenu],[data-act=repCal],[data-act=repSort]")) closePop();
    const t = e.target.closest("[data-act],[data-pick],[data-fmt],[data-confirm],[data-fill],[data-upgrade],[data-copy],[data-dl],[data-use],[data-say]");
    if (!t) return;
    const act = t.dataset.act;
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
      if (["saveProfile", "saveBiz", "savePw", "alertsOn", "alertsOff", "testAlert", "avRemove", "deleteAsk", "deleteYes"].includes(act)) await settingsAction(act, t);
      else if (act === "account") openPop(t, accountMenu());
      else if (act === "reportListing") reportSheet(t);
      else if (act === "openAd") { S.selected[t.dataset.id] = Number(t.dataset.v); S.openAds = true; }
      else if (act === "demoOpen" || act === "demoLeave") {
        // A fresh demo agent, or back to the founder's own account: a clean reload either way.
        t.disabled = true;
        if (act === "demoOpen") t.textContent = "Building the demo";
        await api(act === "demoOpen" ? "/api/admin/demo" : "/api/demo/leave", { body: {} });
        location.hash = act === "demoOpen" ? "#/today" : "#/admin";
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
      else if (act === "toWaiting") {
        // The first thing waiting is right below; a tap brings it into view.
        e.preventDefault();
        $(".hero")?.scrollIntoView({ behavior: "smooth", block: "start" });
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
        openPop(from(item.id) || $(`[data-card="${item.id}"]`) || $("[data-act=listmenu]") || t, `<div class="note"><b>Rename listing</b></div>
          <form class="rename" data-id="${item.id}"><input id="renameIn" maxlength="80" value="${esc(listingName(item))}" placeholder="${esc(item.address || "Name this listing")}" autocomplete="off" enterkeyhint="done">
          <button class="btn" type="submit">Save</button></form>`, { top: true });
        // Focused in the same tap, or iOS won't bring up the keyboard.
        const input = $("#renameIn");
        input.focus();
        input.select();
      }
      else if (act === "selectMode") { S.selecting = !S.selecting; buzz(5); viewListings(); }
      else if (act === "selectAll") { S.picked = S.picked.size === S.listings.length ? new Set() : new Set(S.listings.map((x) => x.id)); buzz(5); viewListings(); }
      else if (act === "selectOne") { S.selecting = true; S.picked = new Set([t.dataset.id]); viewListings(); }
      else if (act === "markSold") {
        await api(`/api/listings/${t.dataset.id}`, { method: "PATCH", body: { status: t.dataset.sold === "1" ? "sold" : "active" } });
        await loadListings();
        toast(t.dataset.sold === "1" ? "Marked as sold" : "Marked as for sale");
        viewListings(); drawSide();
      } else if (act === "delOne" || act === "delPicked") {
        const ids = act === "delOne" ? [t.dataset.id] : [...S.picked];
        const name = ids.length === 1 ? listingName(S.listings.find((x) => x.id === ids[0]) || {}) : `${ids.length} listings`;
        openPop(act === "delPicked" ? t : from(ids[0]) || $(`[data-card="${ids[0]}"]`) || t, `<div class="note"><b>Delete ${esc(name)}?</b>${ids.length === 1 ? "Its" : "Their"} ads, chats, photos and Leads go too. It can't be undone.</div>
          <button class="danger" data-act="delYes" data-ids="${ids.join(",")}">${ICON.trash}Delete ${ids.length === 1 ? "listing" : `${ids.length} listings`}</button>`);
      } else if (act === "delYes") await deleteListings(t.dataset.ids.split(","));
      else if (act === "delListingAsk") {
        openPop($("[data-act=listmenu]") || t, `<div class="note"><b>Delete ${esc(listingName(l))}?</b>Its ads, chat, photos and Leads will also be deleted. This can't be undone.</div>
          <button class="danger" data-act="delListingYes">${ICON.trash}Delete listing</button>`);
      } else if (act === "delListingYes") {
        await api(`/api/listings/${l.id}`, { method: "DELETE" });
        S.current = null;
        await Promise.all([loadMe(), loadListings(), loadInbox()]);
        toast("Listing deleted");
        location.hash = "#/listings";
      }
      else if (act === "dlmenu") {
        const ad = adFor(S.selected[l.id]);
        openPop(t, `<button data-dl="feed">${ICON.down}Feed image</button><button data-dl="story">${ICON.down}Story image</button>
          <button data-copy="${esc(ad.primary_text)}" data-copied="Ad text copied">${ICON.copy}Copy ad text</button>
          <button data-copy="${esc(`${location.origin}/l/${l.slug}?v=${ad.id}`)}">${ICON.link}Copy ad link</button>
          <div class="sep"></div><div class="note">Post or boost it yourself. Use the ad link so Leads are tracked here.</div>`);
      }
      else if (act === "logout") { await api("/api/logout", { body: {} }); location.href = "/login"; }
      else if (act === "chat" || act === "ads") showAds(act === "ads");
      else if (act === "expand") { const m = t.closest(".me"); m.classList.remove("clamp"); t.remove(); }
      else if (act === "example") { const ta = $("#ta"); ta.value = EXAMPLE; ta.dispatchEvent(new Event("input")); buzz(5); }
      else if (act === "more") { const ad = adFor(S.selected[l.id]); $("#cp").innerHTML = `<b>${esc(($("#cp b") || {}).textContent || "")}</b>${esc(ad.primary_text)}`; }
      else if (act === "issues") { S.showIssues = !S.showIssues; drawPreview(); }
      else if (act === "remake" && !paid() && S.me.usage.adsMade >= S.me.usage.freeLimit) upgradeSheet("limit");
      else if (act === "remake") {
        const before = S.current.messages.length;
        toast(S.current.ads.length ? "Creating new ads…" : "Creating ads…");
        S.fresh = l.id;
        const next = await api(`/api/listings/${l.id}/remake`, { body: {} });
        drawListing(next);
        if (!next.ads.length && next.messages.length === before) toast("New ads require Pro");
        refreshSide();
      }
      else if (t.dataset.say) { if (!S.busy) { S.busy = true; buzz(6); try { await say(t.dataset.say); } finally { S.busy = false; } } }
      else if (t.dataset.pick) {
        pick(Number(t.dataset.pick));
        // On a phone, tapping an ad card in the chat opens it big.
        if (t.dataset.open && phone()) showAds(true);
      } else if (t.dataset.fmt) { S.format = t.dataset.fmt; buzz(5); drawPreview(); }
      else if (act === "run" && !paid()) { buzz(8); upgradeSheet("run", t); }
      else if (act === "run") {
        t.disabled = true;
        buzz(8);
        const next = await api(`/api/listings/${l.id}/run`, { body: { versions: S.current.ads.map((a) => a.version) } });
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
        S.me.workspace.brand.upgrade_requested = new Date().toISOString();
        await api("/api/upgrade-request", { body: {} });
        await loadMe();
        t.textContent = "Requested";
        toast("Sent");
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
  const dayKey = () => { const d = new Date(), h = d.getHours(); return `${d.toDateString()} ${h < 12 ? 0 : h < 18 ? 1 : 2}`; };
  let shownDay = dayKey();
  const checkDay = () => {
    const now = dayKey();
    if (now === shownDay) return;
    const newDate = now.split(" ").slice(0, 4).join(" ") !== shownDay.split(" ").slice(0, 4).join(" ");
    shownDay = now;
    const view = location.hash.slice(2).split("/")[0] || "today";
    if (view === "today") (newDate ? viewToday() : drawToday());
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
    setInterval(async () => { try { await loadInbox(); await loadListings(); drawSide(); } catch {} }, 60000);
  })();
})();
