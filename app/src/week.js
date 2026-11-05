// The week (the pivot, 2026-11-03): Hopkins plans the agent's posts for a Monday to Sunday week,
// the agent looks once, changes anything in plain words and approves. A week is a chat of its own
// (a listings row with week_of set). Planning it is a conversation, never a guess (Ismael,
// 2026-11-05): Plan my week opens that chat and Hopkins asks a few questions about the week (what
// to show, what's booked, what's on locally, something about them); from the answers it lays out a
// content calendar (day, time, format, the hook and what it covers) that the agent changes in
// words; only when they say go does Hopkins make the posts, one at a time, and the Week screen
// fills in. Each post is a creation whose spec carries its plan: the day (0 is Monday) and time.
//
// week_status: asking (questions asked), proposed (a calendar is waiting), making, ready,
// approved, failed.
import { all, get, run, nowIso } from "./db.js";
import { randomUUID, randomBytes } from "node:crypto";
import { weekRange, makeSpec, say } from "./hopkins.js";
import { weekPlanAI } from "./brain.js";

const safeJson = (s, fallback) => { try { return JSON.parse(s); } catch { return fallback; } };

// The Monday of this week in the agent's own timezone, as a plain date ("2026-11-02").
export function mondayOf(now = new Date(), tz = "UTC") {
  const from = new Date(weekRange(now, tz).from);
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(from);
}
const dates = (monday) => {
  const d = new Date(`${monday}T12:00:00Z`), e = new Date(d); e.setUTCDate(e.getUTCDate() + 6);
  const m = (x) => x.toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" });
  return m(d) === m(e) ? `${d.getUTCDate()} to ${e.getUTCDate()} ${m(d)}` : `${d.getUTCDate()} ${m(d)} to ${e.getUTCDate()} ${m(e)}`;
};

export async function weekFor(ws, monday) {
  const chat = await get(`SELECT id, week_status, week_approved_at, week_plan FROM listings WHERE workspace_id = ? AND week_of = ? ORDER BY created_at DESC LIMIT 1`, [ws.id, monday]);
  if (!chat) return { monday, chat: null, status: "none", plan: [], posts: [], photos: [] };
  const rows = await all(`SELECT id, kind, spec, version FROM creations WHERE listing_id = ? ORDER BY created_at`, [chat.id]);
  const posts = rows.map((r) => {
    const spec = safeJson(r.spec, { slides: [] });
    return { id: r.id, kind: r.kind, spec, version: r.version, day: Number(spec.plan?.day ?? 0), time: spec.plan?.time || "" };
  }).filter((p) => p.spec.plan).sort((a, b) => a.day - b.day || a.time.localeCompare(b.time));
  const photos = await all(`SELECT id FROM photos WHERE listing_id = ? ORDER BY position, created_at`, [chat.id]);
  const plan = safeJson(chat.week_plan, []) || [];
  return { monday, chat: { id: chat.id }, status: chat.week_status || "ready", plan, planned: plan.length || plannedCount(ws), approvedAt: chat.week_approved_at || null, posts, photos: photos.map((p) => p.id) };
}

const plannedCount = (ws) => (DAYS[Number(ws.brand?.post_often)] || DAYS[5]).length;
export async function approveWeek(ws, monday) {
  const chat = await get(`SELECT id, week_status FROM listings WHERE workspace_id = ? AND week_of = ?`, [ws.id, monday]);
  if (!chat) return { error: "Week not found" };
  if (!["ready", "approved"].includes(chat.week_status)) return { error: "The week isn't ready yet" };
  await run(`UPDATE listings SET week_status = 'approved', week_approved_at = COALESCE(week_approved_at, ?) WHERE id = ?`, [nowIso(), chat.id]);
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

// ---------- planning it in its chat ----------
const DAYS = { 3: [0, 2, 4], 5: [0, 1, 2, 3, 4], 7: [0, 1, 2, 3, 4, 5, 6] };
const TIMES = ["18:30", "12:00", "19:00", "18:00", "12:30", "10:00", "11:00"];
const KINDS = ["carousel", "reel", "post", "carousel", "reel", "story", "post"];
const STYLE_WORDS = { listings: "Real Estate", personal: "Personal Brand", both: "Real Estate and Personal Brand" };

// Plan my week: the week's chat, opened with a few questions. Asked once; a week already under
// way opens where it is.
export async function startWeek(ws, monday) {
  const chat = await get(`SELECT id, week_status FROM listings WHERE workspace_id = ? AND week_of = ?`, [ws.id, monday]);
  if (chat && chat.week_status !== "failed") return { chat: chat.id, status: chat.week_status };
  const id = chat?.id || randomUUID(), now = nowIso();
  const label = new Date(`${monday}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" });
  if (chat) await run(`UPDATE listings SET week_status = 'asking', week_plan = NULL WHERE id = ?`, [id]);
  else await run(`INSERT INTO listings (id, workspace_id, slug, auto_title, week_of, week_status, created_at, updated_at, seen_at) VALUES (?,?,?,?,?,?,?,?,?)`, [id, ws.id, `w-${randomBytes(5).toString("hex")}`, `Week of ${label}`, monday, "asking", now, now, now]);
  const b = ws.brand || {};
  const n = plannedCount(ws), area = b.area || b.city || "";
  const style = STYLE_WORDS[b.content_style] ? `, ${STYLE_WORDS[b.content_style]}` : "";
  await say(ws, id, `Let's plan your week, ${dates(monday)}: ${n} posts${style}. A few quick questions first, so it's about your real week:

1. Any listings to show? An address or a link, or none.
2. Open houses or anything else booked?
3. Anything going on${area ? ` in ${area.split(",")[0]}` : " locally"} worth posting about?
4. One thing you'd like people to know about you this week?

Answer in one message, as short as you like.`, "text", { weekAsk: true });
  return { chat: id, status: "asking" };
}

// What the agent said in the week's chat, oldest first, for the plan.
async function answers(listingId) {
  const rows = await all(`SELECT body FROM messages WHERE listing_id = ? AND role = 'agent' ORDER BY created_at`, [listingId]);
  return rows.map((r) => r.body).filter(Boolean).join("\n").slice(0, 3000);
}

// Without a model: a sound week from their answers at the front door.
const TOPICS = {
  "Just listed": ["Just listed", "The one detail that sells this home, then the facts and how to see it"],
  "Open houses": ["Open house this weekend", "Where, when and the one reason to stop by"],
  "Just sold": ["Just sold", "What it took, told simply, and what it means for the next seller"],
  "Coming soon": ["Coming soon", "A first look before it hits the market"],
  "Local spots": ["My favorite local spots", "Three places I send every client who moves here"],
  "Market updates": ["What changed in the market", "What buyers and sellers should do about it, without numbers you can't stand behind"],
  "Neighbourhood guides": ["Living in my neighborhood", "What a normal week here looks like"],
  "Events": ["Things to do this weekend", "What's on, so people can make plans"],
  "Behind the scenes": ["A day in my week", "What really happens between showings"],
  "Buyer tips": ["Before you tour a home", "Three things to sort first, so nothing surprises you"],
  "Seller tips": ["Before you list", "What to fix, what to leave, and what buyers notice first"],
  "Your story": ["Why I do this", "How I got into real estate and what I care about"],
  "Client stories": ["What buying a home is really like", "One client's story, told simply"],
};
export function fallbackPlan(ws) {
  const b = ws.brand || {};
  const days = DAYS[Number(b.post_often)] || DAYS[5];
  const picked = String(b.styles || "").split(",").map((x) => x.trim()).filter((x) => TOPICS[x]);
  const topics = picked.length ? picked : ["Buyer tips", "Local spots", "Seller tips"];
  return days.map((day, i) => { const [title, idea] = TOPICS[topics[i % topics.length]]; return { day, time: TIMES[i % TIMES.length], kind: KINDS[i % KINDS.length], title, idea }; });
}
// The plan as the model gave it, fitted to the days they post and the formats the app can make.
function fitPlan(ws, days) {
  const want = DAYS[Number(ws.brand?.post_often)] || DAYS[5];
  const fb = fallbackPlan(ws);
  const got = Array.isArray(days) ? days.filter((d) => d && d.title) : [];
  return want.map((day, i) => {
    const d = got.find((x) => Number(x.day) === day) || got[i] || fb[i];
    const time = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(d.time || "")) ? d.time : fb[i].time;
    const kind = ["carousel", "post", "reel", "story"].includes(d.kind) ? d.kind : fb[i].kind;
    const s = (v, n) => String(v || "").replace(/\s*[–—]\s*/g, ", ").replace(/(\w)\s-\s(\w)/g, "$1, $2").trim().slice(0, n);
    return { day, time, kind, title: s(d.title, 70) || fb[i].title, idea: s(d.idea, 200) || fb[i].idea };
  });
}

const GO = /^\s*(yes|yep|yeah|yup|go|go ahead|go for it|make it|make them|make (the|my) week|looks? (good|great|perfect)|sounds? (good|great)|perfect|love it|approve|approved|do it|let'?s go|ship it|great|ok|okay|all good)\b/i;
const BUT = /\b(but|except|change|swap|instead|move|replace|add|remove|drop|switch|make (monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/i;
const DAY_RE = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)\b/i;
const DAY_N = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6 };

// A message in a week's chat. Returns null when it isn't about planning the week (a question, a
// change to one post once they're made), so the chat answers it as usual.
export async function weekTurn(ws, listing, text, { makeCreation } = {}) {
  const status = listing.week_status;
  if (status === "asking" || status === "proposed") {
    if (status === "proposed" && GO.test(text) && !BUT.test(text)) return makeWeek(ws, listing);
    if (/\?\s*$/.test(text) && status === "proposed") return null;
    const previous = status === "proposed" ? safeJson(listing.week_plan, null) : null;
    const b = ws.brand || {};
    const r = await weekPlanAI({ answers: await answers(listing.id), request: previous ? text : "", previous, days: DAYS[Number(b.post_often)] || DAYS[5], brand: { area: b.area || b.city || "", styles: b.styles || "", content_style: STYLE_WORDS[b.content_style] || "", agent: b.agent_name || "", business: b.business || "" }, week: dates(listing.week_of) });
    const plan = fitPlan(ws, r?.days || (previous || fallbackPlan(ws)));
    await run(`UPDATE listings SET week_status = 'proposed', week_plan = ?, updated_at = ? WHERE id = ?`, [JSON.stringify(plan), nowIso(), listing.id]);
    const line = previous ? "Here's the week with that change." : "Here's your week.";
    await say(ws, listing.id, `${line} Tell me anything to change, or make it.`, "calendar", { plan });
    return { calendar: true };
  }
  if (status === "ready" && GO.test(text) && !BUT.test(text) && !/\?\s*$/.test(text)) {
    await approveWeek(ws, listing.week_of);
    await say(ws, listing.id, "Approved. Posting to Instagram isn't connected yet, so download each post on its day.");
    return {};
  }
  // "make Thursday about the school opening": a change to that day's post.
  const m = text.match(DAY_RE);
  if (m && makeCreation && ["ready", "approved"].includes(status)) {
    const day = DAY_N[m[1].toLowerCase().slice(0, 3)];
    const rows = await all(`SELECT * FROM creations WHERE listing_id = ?`, [listing.id]);
    const c = rows.map((x) => ({ ...x, spec: safeJson(x.spec, null) })).find((x) => x.spec?.plan && Number(x.spec.plan.day) === day);
    if (c) return makeCreation(ws, listing, text, c.kind, c);
  }
  return null;
}

// Go: the posts are made one at a time in the background, from the calendar, and the Week screen
// fills in as each arrives. Nothing posts until the agent approves.
const busy = new Set();
export async function makeWeek(ws, listing) {
  const plan = fitPlan(ws, safeJson(listing.week_plan, null) || fallbackPlan(ws));
  await run(`UPDATE listings SET week_status = 'making', week_plan = ?, updated_at = ? WHERE id = ?`, [JSON.stringify(plan), nowIso(), listing.id]);
  await say(ws, listing.id, "Making your week now. Each post shows on Week as it's done.");
  if (!busy.has(listing.id)) {
    busy.add(listing.id);
    const b = ws.brand || {};
    const agent = [b.agent_name, b.business].filter(Boolean).join(", ");
    const area = b.area || b.city || "";
    const notes = await answers(listing.id);
    (async () => {
      let made = 0;
      for (const item of plan) {
        const voice = b.content_style === "personal" ? " In the agent's own voice, personal." : "";
        const request = `A ${item.kind} titled "${item.title}": ${item.idea}.${area ? ` For people in ${area}.` : ""}${voice}${notes ? `\nWhat the agent said about this week (use only what fits this post): ${notes}` : ""}`;
        try {
          const spec = await makeSpec({ kind: item.kind, request, listing: null, photos: 0, agent, area });
          if (!spec) continue;
          spec.plan = { day: item.day, time: item.time };
          const t = nowIso();
          await run(`INSERT INTO creations (id, workspace_id, listing_id, kind, spec, created_at, updated_at) VALUES (?,?,?,?,?,?,?)`, [randomUUID(), ws.id, listing.id, item.kind, JSON.stringify(spec), t, t]);
          made++;
        } catch (err) { console.error("makeWeek:", err.message); }
      }
      await say(ws, listing.id, made ? `Your week is ready: ${made} posts. Approve it on Week, or tell me what to change.` : "Something went wrong. Please try again.", made ? "weekready" : "text");
      await run(`UPDATE listings SET week_status = ?, updated_at = ? WHERE id = ?`, [made ? "ready" : "proposed", nowIso(), listing.id]);
      busy.delete(listing.id);
    })();
  }
  return { making: true };
}
export async function makeWeekFor(ws, monday) {
  const listing = await get(`SELECT * FROM listings WHERE workspace_id = ? AND week_of = ?`, [ws.id, monday]);
  if (!listing) return { error: "Week not found" };
  if (listing.week_status !== "proposed") return weekFor(ws, monday);
  await makeWeek(ws, listing);
  return weekFor(ws, monday);
}
