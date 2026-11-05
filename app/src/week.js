// The week (the pivot, 2026-11-03): Hopkins plans the agent's posts for a Monday to Sunday week, the
// agent looks once, changes anything in plain words and approves. A week is a chat of its own (a
// listings row with week_of set), so "make Thursday about the school opening" is said in that chat
// like any other change; each post in it is a creation whose spec carries its plan: the day (0 is
// Monday) and the time.
import { all, get, run, nowIso } from "./db.js";
import { randomUUID, randomBytes } from "node:crypto";
import { weekRange, makeSpec } from "./hopkins.js";

const safeJson = (s, fallback) => { try { return JSON.parse(s); } catch { return fallback; } };

// The Monday of this week in the agent's own timezone, as a plain date ("2026-11-02").
export function mondayOf(now = new Date(), tz = "UTC") {
  const from = new Date(weekRange(now, tz).from);
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(from);
}

export async function weekFor(ws, monday) {
  const chat = await get(`SELECT id, title, auto_title, week_of, week_status, week_approved_at FROM listings WHERE workspace_id = ? AND week_of = ? ORDER BY created_at DESC LIMIT 1`, [ws.id, monday]);
  if (!chat) return { monday, chat: null, status: "none", posts: [], photos: [] };
  const rows = await all(`SELECT id, kind, spec, version FROM creations WHERE listing_id = ? ORDER BY created_at`, [chat.id]);
  const posts = rows.map((r) => {
    const spec = safeJson(r.spec, { slides: [] });
    return { id: r.id, kind: r.kind, spec, version: r.version, day: Number(spec.plan?.day ?? 0), time: spec.plan?.time || "" };
  }).sort((a, b) => a.day - b.day || a.time.localeCompare(b.time));
  const photos = await all(`SELECT id FROM photos WHERE listing_id = ? ORDER BY position, created_at`, [chat.id]);
  return { monday, chat: { id: chat.id }, status: chat.week_status || "ready", planned: plannedCount(ws), approvedAt: chat.week_approved_at || null, posts, photos: photos.map((p) => p.id) };
}

const plannedCount = (ws) => (DAYS[Number(ws.brand?.post_often)] || DAYS[5]).length;
export async function approveWeek(ws, monday) {
  const chat = await get(`SELECT id FROM listings WHERE workspace_id = ? AND week_of = ?`, [ws.id, monday]);
  if (!chat) return { error: "Week not found" };
  await run(`UPDATE listings SET week_status = 'approved', week_approved_at = ? WHERE id = ?`, [nowIso(), chat.id]);
  return weekFor(ws, monday);
}

// Everything Hopkins has made, newest first, for the Library: each with the chat it lives in.
export async function library(ws) {
  const rows = await all(`SELECT c.id, c.kind, c.spec, c.version, c.listing_id, c.created_at, l.title, l.auto_title, l.address, l.week_of
    FROM creations c JOIN listings l ON l.id = c.listing_id WHERE c.workspace_id = ? ORDER BY c.updated_at DESC`, [ws.id]);
  const chats = [...new Set(rows.map((r) => r.listing_id))];
  const photoRows = chats.length ? await all(`SELECT id, listing_id FROM photos WHERE listing_id IN (${chats.map(() => "?").join(",")}) ORDER BY position, created_at`, chats) : [];
  const photosOf = (id) => photoRows.filter((p) => p.listing_id === id).map((p) => p.id);
  return rows.map((r) => ({ id: r.id, photos: photosOf(r.listing_id), kind: r.kind, spec: safeJson(r.spec, { slides: [] }), version: r.version, chat: r.listing_id, chatName: r.title || r.address || r.auto_title || "Untitled", week: r.week_of || null, created_at: r.created_at }));
}

// Planning a week: Hopkins makes the posts one at a time in the background, from the agent's own
// answers (how often, what to post, Real Estate, Personal Brand or Both, their city), and the week
// screen fills in as each arrives. Nothing posts until the agent approves.
const DAYS = { 3: [0, 2, 4], 5: [0, 1, 2, 3, 4], 7: [0, 1, 2, 3, 4, 5, 6] };
const TIMES = ["18:30", "12:00", "19:00", "18:00", "12:30", "10:00", "11:00"];
const KINDS = ["carousel", "post", "reel", "carousel", "story", "post", "reel"];
const TOPICS = {
  "Just listed": "a just listed post", "Open houses": "an open house invite", "Just sold": "a just sold post", "Coming soon": "a coming soon teaser",
  "Local spots": "the best local spots", "Market updates": "what changed in the local market this month, without numbers you don't know", "Neighbourhood guides": "a neighbourhood guide", "Events": "things to do this weekend",
  "Behind the scenes": "a day in the life of a real estate agent", "Buyer tips": "practical tips for first time buyers", "Seller tips": "how to get a home ready to sell", "Your story": "why I became a real estate agent", "Client stories": "what buying a home is really like, told simply",
};
const busy = new Set();
export async function planWeek(ws, monday, agent = "") {
  let chat = await get(`SELECT id, week_status FROM listings WHERE workspace_id = ? AND week_of = ?`, [ws.id, monday]);
  if (chat && chat.week_status !== "failed") return weekFor(ws, monday);
  const b = ws.brand || {};
  const days = DAYS[Number(b.post_often)] || DAYS[5];
  const area = b.area || b.city || "";
  const picked = String(b.styles || "").split(",").map((x) => x.trim()).filter((x) => TOPICS[x]);
  const topics = picked.length ? picked : ["Buyer tips", "Local spots", "Seller tips"];
  const id = chat?.id || randomUUID(), now = nowIso();
  const label = new Date(`${monday}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" });
  if (chat) await run(`UPDATE listings SET week_status = 'planning' WHERE id = ?`, [id]);
  else await run(`INSERT INTO listings (id, workspace_id, slug, auto_title, week_of, week_status, created_at, updated_at, seen_at) VALUES (?,?,?,?,?,?,?,?,?)`, [id, ws.id, `w-${randomBytes(5).toString("hex")}`, `Week of ${label}`, monday, "planning", now, now, now]);
  if (!busy.has(id)) {
    busy.add(id);
    (async () => {
      let made = 0;
      for (const [i, day] of days.entries()) {
        const kind = KINDS[i % KINDS.length], topic = TOPICS[topics[i % topics.length]];
        const voice = b.content_style === "personal" ? " Make it personal, in the agent's own voice." : b.content_style === "both" && i % 2 ? " Make it personal, in the agent's own voice." : "";
        const request = `A ${kind} about ${topic}${area ? ` in ${area}` : ""}.${voice}`;
        try {
          const spec = await makeSpec({ kind, request, listing: null, photos: 0, agent });
          if (!spec) continue;
          spec.plan = { day, time: TIMES[i % TIMES.length] };
          const t = nowIso();
          await run(`INSERT INTO creations (id, workspace_id, listing_id, kind, spec, created_at, updated_at) VALUES (?,?,?,?,?,?,?)`, [randomUUID(), ws.id, id, kind, JSON.stringify(spec), t, t]);
          made++;
        } catch (err) { console.error("planWeek:", err.message); }
      }
      await run(`UPDATE listings SET week_status = ?, updated_at = ? WHERE id = ?`, [made ? "ready" : "failed", nowIso(), id]);
      if (made) await run(`INSERT INTO messages (id, workspace_id, listing_id, role, kind, body, created_at) VALUES (?,?,?,?,?,?,?)`, [randomUUID(), ws.id, id, "hopkins", "text", `Your week is ready: ${made} posts. Tell me anything to change, or approve it.`, nowIso()]);
      busy.delete(id);
    })();
  }
  return weekFor(ws, monday);
}
