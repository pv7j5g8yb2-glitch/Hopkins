// Setup from the agent's own website (Ismael, 2026-10-31): they paste their site and Hopkins fills
// in what the site says about them (business name, logo, colours, phone, email, Instagram, city)
// for them to check before saving. Only what the page really says; nothing guessed. Sites that
// block apps are left alone and the agent fills the form in by hand.

import { downloadImage } from "./listing.js";

const PRIVATE = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.|\[?::1)/;
const decode = (s) => String(s).replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#(\d+);/g, (_, d) => String.fromCharCode(d));

let fetchImpl = (...a) => fetch(...a);
export function setSiteFetchForTests(f) { fetchImpl = f; }

async function get(url, accept = "text/html") {
  const u = new URL(url);
  if (!/^https?:$/.test(u.protocol) || PRIVATE.test(u.hostname)) return null;
  const res = await fetchImpl(u, { headers: { "User-Agent": "Mozilla/5.0 (compatible; HopkinsBot/0.1)", Accept: accept }, redirect: "follow", signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;
  return { text: (await res.text()).slice(0, 1_500_000), url: res.url || String(u) };
}

// A colour's saturation and lightness, to leave out whites, blacks and greys.
function hsl(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  const s = max === min ? 0 : l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
  return { s, l };
}
const full = (h) => (h.length === 4 ? `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}` : h).toUpperCase();

export function brandFromPage(html, base) {
  const meta = (name) => {
    const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${name}["']`, "i"));
    return m ? decode(m[1] || m[2]).trim() : null;
  };
  const abs = (h) => { try { return new URL(decode(h), base).href; } catch { return null; } };
  const out = {};
  const title = meta("og:site_name") || ((html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || "").trim();
  if (title) out.business = decode(title).split(/\s+[|–—\-·:]\s+/)[0].trim().slice(0, 120);
  const tel = html.match(/href=["']tel:([^"']+)["'][^>]*>([^<]{6,30})</i) || html.match(/href=["']tel:([^"']+)["']/i);
  if (tel) out.phone = decode(tel[2] || tel[1]).replace(/%20/g, " ").trim().slice(0, 40);
  const mail = html.match(/href=["']mailto:([^"'?]+)/i);
  if (mail) out.email = decode(mail[1]).trim().slice(0, 120);
  const ig = [...html.matchAll(/instagram\.com\/([A-Za-z0-9_.]{2,30})\/?["'?]/gi)].map((m) => m[1]).find((h) => !/^(p|reel|reels|explore|stories|accounts|share)$/i.test(h));
  if (ig) out.instagram = `@${ig}`;
  // schema.org says where they work
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    const city = m[1].match(/"addressLocality"\s*:\s*"([^"]{2,60})"/);
    if (city && !out.city) out.city = city[1];
  }
  // the logo: the site's own icon for phones, or an image called logo
  const touch = html.match(/<link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]*href=["']([^"']+)["']/i) || html.match(/<link[^>]+href=["']([^"']+)["'][^>]*rel=["'][^"']*apple-touch-icon/i);
  const logoImg = html.match(/<img[^>]+(?:class|id|alt|src)=["'][^"']*logo[^"']*["'][^>]*>/i);
  const logoSrc = logoImg && (logoImg[0].match(/\ssrc=["']([^"']+)["']/i) || [])[1];
  out.logos = [logoSrc, touch && touch[1]].filter((x) => x && !/\.svg(\?|$)/i.test(x)).map(abs).filter(Boolean);
  // the colours the site uses most, leaving out white, black and greys
  const theme = meta("theme-color");
  const counts = {};
  for (const m of html.matchAll(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)) { const h = full(`#${m[1]}`); counts[h] = (counts[h] || 0) + 1; }
  const colours = Object.entries(counts).filter(([h]) => { const { s, l } = hsl(h); return s > 0.25 && l > 0.08 && l < 0.85; }).sort((a, b) => b[1] - a[1]).map(([h]) => h);
  const pool = [theme && /^#[0-9a-f]{3,6}$/i.test(theme) ? full(theme) : null, ...colours].filter(Boolean);
  const dark = pool.find((h) => hsl(h).l < 0.45);
  if (dark) out.primary = dark;
  const accent = pool.find((h) => h !== out.primary && Math.abs(hsl(h).l - hsl(out.primary || "#000000").l) > 0.12);
  if (accent) out.accent = accent;
  return out;
}

export async function readSite(url) {
  let u;
  try { u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`); } catch { return null; }
  let page;
  try { page = await get(u.href); } catch { return null; }
  if (!page || page.text.length < 200) return null;
  // The site's own stylesheets often hold its colours: the first two, from the same site.
  let css = "";
  for (const m of [...page.text.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi)].slice(0, 2)) {
    try { const h = new URL(decode(m[1]), page.url); if (h.host === new URL(page.url).host) css += (await get(h.href, "text/css"))?.text.slice(0, 300_000) || ""; } catch {}
  }
  const found = brandFromPage(page.text + css, page.url);
  let logo = null;
  for (const l of found.logos) { logo = await downloadImage(l).catch(() => null); if (logo) break; }
  delete found.logos;
  return { ...found, logo };
}

// ---------- the whole site, end to end (Ismael, 2026-11-01) ----------
//
// The agent's brokerage site is read like a person going through it: the home page, then the pages
// it links to that matter (about, team, listings, areas, contact, blog), up to 15, politely (it
// asks robots.txt first and identifies itself as HopkinsBot). For each page it notes what a UX
// review needs: headings, forms and their fields, buttons and calls to action, images without
// descriptions, the mobile viewport, page weight and how long it took, a property search, contact
// details and pages that don't open. The model then turns that into a profile and a UX review
// (src/brain.js siteAnalysisAI). Nothing is guessed: only what the pages hold.
const SKIP_EXT = /\.(jpe?g|png|gif|webp|svg|pdf|zip|mp4|mov|css|js|ico|xml|json|txt)(\?|$)/i;
const WORTH = /about|team|agent|our-|contact|listing|propert|home-?search|search|buy|sell|valuation|value|neighbo|communit|area|blog|market|service|testimon|review|career|join/i;
const strip = (h) => decode(String(h).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

async function robotsAllows(origin) {
  try {
    const r = await get(`${origin}/robots.txt`, "text/plain");
    if (!r) return () => true;
    const rules = [];
    let mine = false;
    for (const line of r.text.split(/\r?\n/)) {
      const [k, ...v] = line.split(":");
      const key = k.trim().toLowerCase(), val = v.join(":").trim();
      if (key === "user-agent") mine = val === "*" || /hopkins/i.test(val);
      else if (mine && key === "disallow" && val) rules.push(val);
    }
    return (path) => !rules.some((x) => path.startsWith(x));
  } catch { return () => true; }
}

function pageFacts(html, url, ms, bytes) {
  const all = (re) => [...html.matchAll(re)];
  const heads = all(/<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi).map((m) => `h${m[1]}: ${strip(m[2]).slice(0, 90)}`).filter((x) => x.length > 4).slice(0, 12);
  const forms = all(/<form[\s\S]*?<\/form>/gi).map((f) => {
    const names = [...f[0].matchAll(/<(input|select|textarea)[^>]*?(?:name|placeholder|aria-label)=["']([^"']{1,40})["'][^>]*>/gi)].map((m) => m[2]).filter((n) => !/token|csrf|hidden|honeypot/i.test(n));
    const submit = (f[0].match(/<button[^>]*>([\s\S]*?)<\/button>/i) || f[0].match(/type=["']submit["'][^>]*value=["']([^"']+)/i) || [])[1];
    return `${names.slice(0, 8).join(", ")}${submit ? ` → "${strip(submit).slice(0, 30)}"` : ""}`;
  }).slice(0, 4);
  const ctas = [...new Set(all(/<(a|button)[^>]*>([\s\S]{2,80}?)<\/\1>/gi).map((m) => strip(m[2])).filter((t) => /contact|call|schedule|book|tour|showing|search|valuation|value|worth|sign ?up|subscribe|get started|apply|message|email|text|chat|download/i.test(t) && t.length < 45))].slice(0, 10);
  const imgs = all(/<img\b[^>]*>/gi);
  const noAlt = imgs.filter((m) => !/\salt=["'][^"']+["']/i.test(m[0])).length;
  const text = strip(html);
  return {
    url,
    title: strip((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "").slice(0, 120),
    description: ((html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i) || [])[1] || "").slice(0, 200),
    heads, forms, ctas,
    images: imgs.length, imagesWithoutAlt: noAlt,
    viewport: /<meta[^>]+name=["']viewport["']/i.test(html),
    ms, kb: Math.round(bytes / 1024),
    search: /idx|ihomefinder|showcase|buying-?buddy|realtyna|diverse ?solutions|home ?search|property ?search|search homes|mls/i.test(html),
    phone: /href=["']tel:/i.test(html), email: /href=["']mailto:/i.test(html),
    chat: /intercom|drift|tidio|livechat|crisp|messenger|whatsapp/i.test(html),
    words: text.split(" ").length,
    text: text.slice(0, 1400),
  };
}

export async function crawlSite(url, { max = 15 } = {}) {
  let start;
  try { start = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`); } catch { return null; }
  if (PRIVATE.test(start.hostname)) return null;
  const allowed = await robotsAllows(start.origin);
  const seen = new Set(), queue = [start.href], pages = [], broken = [];
  let host = start.host;
  while (queue.length && pages.length < max) {
    const batch = queue.splice(0, 4);
    await Promise.all(batch.map(async (href) => {
      const key = href.replace(/[#?].*$/, "").replace(/\/$/, "");
      if (seen.has(key)) return;
      seen.add(key);
      const u = new URL(href);
      if (!allowed(u.pathname)) return;
      const t0 = Date.now();
      let page;
      try { page = await get(href); } catch { page = null; }
      if (!page) { if (pages.length) broken.push(u.pathname); return; }
      if (!pages.length) host = new URL(page.url).host; // follow the home page's own redirect
      pages.push(pageFacts(page.text, page.url, Date.now() - t0, page.text.length));
      const links = [...page.text.matchAll(/<a[^>]+href=["']([^"'#]+)["']/gi)].map((m) => { try { return new URL(decode(m[1]), page.url); } catch { return null; } })
        .filter((l) => l && l.host === host && /^https?:$/.test(l.protocol) && !SKIP_EXT.test(l.pathname));
      // The pages that say most about the business first.
      links.sort((a, b) => (WORTH.test(b.pathname) ? 1 : 0) - (WORTH.test(a.pathname) ? 1 : 0));
      for (const l of links) { const k = l.href.replace(/[#?].*$/, "").replace(/\/$/, ""); if (!seen.has(k) && queue.length < 60 && !queue.includes(l.href)) queue.push(l.href.replace(/#.*$/, "")); }
    }));
  }
  if (!pages.length) return null;
  return { site: start.origin, pages, broken: broken.slice(0, 10), https: start.protocol === "https:" };
}

// What the pages measurably show, without any model: the checks a UX review always starts with.
// These stand even when the model is busy, and are never a guess.
export function siteChecks(crawl) {
  const out = [];
  const pages = crawl.pages, home = pages[0];
  const path = (u) => { try { const x = new URL(u).pathname; return !x || x === "/" ? "Home page" : x; } catch { return u; } };
  if (!crawl.https) out.push({ issue: "The site isn't on https, so browsers mark it as not secure.", where: "Every page", fix: "Turn on SSL with the host (usually free) and redirect http to https." });
  const noView = pages.filter((p) => !p.viewport);
  if (noView.length) out.push({ issue: "No mobile viewport, so phones show a shrunk desktop page.", where: noView.slice(0, 3).map((p) => path(p.url)).join(", "), fix: "Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">." });
  if (!pages.some((p) => p.forms.length)) out.push({ issue: "No contact or enquiry form on any page read.", where: "Whole site", fix: "Add a short form (name, email or phone, message) on the home page and each property page." });
  if (!pages.some((p) => p.phone)) out.push({ issue: "No tap to call phone link.", where: "Whole site", fix: "Make the phone number a tel: link in the header." });
  const longForms = pages.flatMap((p) => p.forms.filter((f) => f.split(",").length >= 7).map(() => path(p.url)));
  if (longForms.length) out.push({ issue: "A form asks for 7 or more things, which loses enquiries on a phone.", where: [...new Set(longForms)].slice(0, 3).join(", "), fix: "Ask for name, email or phone and one message; get the rest on the call." });
  const slow = pages.filter((p) => p.ms > 3000 || p.kb > 1500);
  if (slow.length) out.push({ issue: "Slow or heavy pages.", where: slow.slice(0, 3).map((p) => `${path(p.url)} (${(p.ms / 1000).toFixed(1)}s, ${p.kb} KB)`).join(", "), fix: "Compress images and cut scripts the page doesn't need." });
  const alt = pages.reduce((n, p) => n + p.imagesWithoutAlt, 0), imgs = pages.reduce((n, p) => n + p.images, 0);
  if (imgs && alt / imgs > 0.3) out.push({ issue: `${alt} of ${imgs} images have no description, which hurts screen readers and search.`, where: "Across the site", fix: "Give each property and team photo a short alt text." });
  const noH1 = pages.filter((p) => !p.heads.some((h) => h.startsWith("h1")));
  if (noH1.length) out.push({ issue: "Pages without a main heading.", where: noH1.slice(0, 3).map((p) => path(p.url)).join(", "), fix: "Give each page one clear h1 that says what it is." });
  const noDesc = pages.filter((p) => !p.description);
  if (noDesc.length) out.push({ issue: "Pages with no search description.", where: noDesc.slice(0, 3).map((p) => path(p.url)).join(", "), fix: "Write a one line meta description for each page." });
  if (crawl.broken.length) out.push({ issue: "Links that don't open.", where: crawl.broken.slice(0, 4).join(", "), fix: "Fix or remove those links." });
  if (home && !home.ctas.length) out.push({ issue: "The home page has no clear call to action.", where: "Home page", fix: "Put one button near the top: search homes, or book a call." });
  return out;
}
