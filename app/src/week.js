// The week (the pivot, 2026-11-03): Hopkins plans the agent's posts for a Monday to Sunday week, the
// agent looks once, changes anything in plain words and approves. A week is a chat of its own (a
// listings row with week_of set), so "make Thursday about the school opening" is said in that chat
// like any other change; each post in it is a creation whose spec carries its plan: the day (0 is
// Monday) and the time.
import { all, get, run, nowIso } from "./db.js";
import { weekRange } from "./hopkins.js";

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
  return { monday, chat: { id: chat.id }, status: chat.week_status || "ready", approvedAt: chat.week_approved_at || null, posts, photos: photos.map((p) => p.id) };
}

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
