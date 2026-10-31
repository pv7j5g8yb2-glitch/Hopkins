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
