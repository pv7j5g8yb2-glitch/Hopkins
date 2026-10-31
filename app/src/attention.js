// What needs the agent's attention (Ismael, 2026-10-31: Hopkins stops waiting to be asked). Found
// from Hopkins' own records only: listings, runs, each ad's numbers from Meta, and Leads. Every
// item comes with a minimum of evidence (never "failing" after a few dollars), says exactly what
// its button does (which ads, how much money, how long), changes nothing until the agent taps it,
// and is raised once: dismissed means it stays dismissed.

import { randomUUID } from "node:crypto";
import { run, get, all, nowIso } from "./db.js";
import { notifyTopic } from "./notify.js";
import { metaReady, unseal, updateAdSet } from "./meta.js";
import { getWorkspace, loadListing, listingTitle, proposeRun, changeRun, pauseOrResume, PROPERTY } from "./hopkins.js";

const DAY = 86400000;
const money = (n) => `$${Math.round(n).toLocaleString("en-US")}`;
const ago = (iso, now) => {
  const h = Math.round((now - new Date(iso).getTime()) / 3600000);
  return h < 48 ? `${h} hours ago` : `${Math.round(h / 24)} days ago`;
};
const runEnd = (l) => new Date(new Date(l.created_at).getTime() + (Number(l.days) + 1) * DAY);
const WANTS = { showing: "Asked for a showing", offer: "Wants to talk about an offer", apply: "Wants to apply", info: "Asked a question" };

// Thresholds, kept in one place so they're easy to judge and change.
export const RULES = {
  idleAfterHours: 48, // ads made and nothing ever run
  followupAfterHours: 24, // a Lead still marked New
  noLeadsMinDays: 3, // a run spending with no Leads at all
  noLeadsMinSpend: 50,
  shiftMinDays: 4, // one ad with Leads, another with none, same budget each
  shiftWinnerLeads: 3,
  shiftLoserMinSpend: 20,
  endingWithinHours: 48, // a run with Leads about to end
};

// Everything that needs attention right now, each with a stable key.
export async function findAttention(ws, now = Date.now()) {
  const out = [];
  const listings = await all(`SELECT * FROM listings WHERE workspace_id = ? AND status != 'archived' AND ${PROPERTY()}`, [ws.id]);
  const byId = Object.fromEntries(listings.map((l) => [l.id, l]));
  const name = (l) => listingTitle(l);

  // 1. Ads ready, nothing ever run.
  for (const l of listings) {
    if (l.status === "sold") continue;
    const ads = await all(`SELECT id, status, created_at FROM ads WHERE listing_id = ?`, [l.id]);
    if (!ads.length || ads.some((a) => a.status === "approved")) continue;
    if (await get(`SELECT 1 FROM launches WHERE listing_id = ?`, [l.id])) continue;
    const newest = Math.max(...ads.map((a) => new Date(a.created_at).getTime()));
    if (now - newest < RULES.idleAfterHours * 3600000) continue;
    out.push({ key: `idle:${l.id}`, kind: "idle", listing_id: l.id,
      title: `${name(l)} isn't being advertised`,
      body: `${ads.length} ${ads.length === 1 ? "ad is" : "ads are"} ready and nothing is running.`,
      action: { type: "plan", label: "Prepare a plan" } });
  }

  // 2. Leads still marked New after a day.
  const leads = await all(`SELECT * FROM leads WHERE workspace_id = ? AND status = 'new' AND created_at <= ? AND created_at >= ?`,
    [ws.id, new Date(now - RULES.followupAfterHours * 3600000).toISOString(), new Date(now - 14 * DAY).toISOString()]);
  for (const ld of leads) {
    const l = byId[ld.listing_id];
    out.push({ key: `followup:${ld.id}`, kind: "followup", listing_id: ld.listing_id,
      title: `${ld.name} is waiting for a reply`,
      body: `${WANTS[ld.wants] || WANTS.info}${l ? ` on ${name(l)}` : ""} ${ago(ld.created_at, now)}. Still marked New.`,
      action: { type: "open", label: "Open Leads", href: "#/leads" } });
  }

  // Runs: what each one has spent and brought in.
  const launches = await all(`SELECT * FROM launches WHERE workspace_id = ? AND status IN ('waiting_on_meta','sent')`, [ws.id]);
  for (const r of launches) {
    const l = byId[r.listing_id];
    if (!l || runEnd(r) <= new Date(now)) continue;
    const adIds = JSON.parse(r.ad_ids || "[]");
    if (!adIds.length) continue;
    const days = (now - new Date(r.created_at).getTime()) / DAY;
    const leadRows = await all(`SELECT ad_id, COUNT(*) AS n FROM leads WHERE listing_id = ? AND created_at >= ? GROUP BY ad_id`, [r.listing_id, r.created_at]);
    const leadsOf = (id) => Number(leadRows.find((x) => x.ad_id === id)?.n || 0);
    const total = adIds.reduce((s, id) => s + leadsOf(id), 0);
    const meta = await all(`SELECT meta_ads.*, ads.version FROM meta_ads JOIN ads ON ads.id = meta_ads.ad_id WHERE launch_id = ?`, [r.id]);

    // 3. Spending on Meta, no Leads at all.
    const spent = Number(r.meta_spend || 0);
    if (r.meta_campaign_id && total === 0 && days >= RULES.noLeadsMinDays && spent >= Math.max(RULES.noLeadsMinSpend, 0.25 * Number(r.budget))) {
      out.push({ key: `noleads:${r.id}`, kind: "noleads", listing_id: r.listing_id,
        title: `${name(l)}: ${money(spent)} spent, no Leads yet`,
        body: `After ${Math.floor(days)} days on Facebook and Instagram. New ideas usually do better than more budget: ask Hopkins for them in the chat.`,
        action: { type: "pause", label: "Pause the ads" } });
    }

    // 4. One ad bringing Leads, another none, on the same budget each.
    if (r.meta_campaign_id && meta.length > 1 && days >= RULES.shiftMinDays) {
      const ranked = meta.map((m) => ({ ...m, leads: leadsOf(m.ad_id) })).sort((a, b) => b.leads - a.leads);
      const win = ranked[0];
      const each = Number(r.budget) / meta.length;
      for (const lose of ranked.slice(1)) {
        if (win.leads < RULES.shiftWinnerLeads || lose.leads > 0 || Number(lose.spend || 0) < RULES.shiftLoserMinSpend || lose.status === "PAUSED") continue;
        const left = Math.max(0, Math.floor(each - Number(lose.spend || 0)));
        if (left < 10) continue;
        out.push({ key: `shift:${r.id}:${lose.ad_id}`, kind: "shift", listing_id: r.listing_id,
          title: `Ad ${lose.version} on ${name(l)} has no Leads, Ad ${win.version} has ${win.leads}`,
          body: `Same budget each over ${Math.floor(days)} days. Ad ${lose.version} has spent ${money(Number(lose.spend || 0))}; ${money(left)} of its budget is left.`,
          action: { type: "shift", label: `Pause Ad ${lose.version}, move ${money(left)} to Ad ${win.version}`, launch: r.id, lose: lose.ad_id, win: win.ad_id, amount: left } });
      }
    }

    // 5. A run that's working, about to end.
    const left = runEnd(r).getTime() - now;
    if (total > 0 && left > 0 && left <= RULES.endingWithinHours * 3600000) {
      const perDay = Number(r.budget) / Number(r.days);
      const add = Math.round(perDay * 7);
      out.push({ key: `ending:${r.id}`, kind: "ending", listing_id: r.listing_id,
        title: `${name(l)}'s ads end ${new Date(runEnd(r)).toLocaleDateString("en-GB", { weekday: "long" })}`,
        body: `${total} ${total === 1 ? "Lead" : "Leads"} so far. Another week at the same ${money(perDay)} a day costs ${money(add)} more.`,
        action: { type: "extend", label: `Run another week (+${money(add)})`, launch: r.id } });
    }
  }
  return out;
}

// Keeps the stored list in step with what's true now: new items are added (and sent to the
// agent's phone once), items no longer true go away, dismissed ones never come back.
export async function refreshAttention(ws, now = Date.now()) {
  const found = await findAttention(ws, now);
  const stored = await all(`SELECT * FROM attention WHERE workspace_id = ?`, [ws.id]);
  const fresh = [];
  for (const f of found) {
    const had = stored.find((s) => s.key === f.key);
    if (had) {
      if (had.status === "open") await run(`UPDATE attention SET title = ?, body = ?, action = ? WHERE id = ?`, [f.title, f.body, JSON.stringify(f.action), had.id]);
      continue;
    }
    const id = randomUUID();
    await run(`INSERT INTO attention (id, workspace_id, listing_id, key, kind, title, body, action, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [id, ws.id, f.listing_id || null, f.key, f.kind, f.title, f.body, JSON.stringify(f.action), "open", nowIso()]);
    fresh.push(f);
  }
  for (const s of stored) if (s.status === "open" && !found.some((f) => f.key === s.key)) await run(`UPDATE attention SET status = 'gone', resolved_at = ? WHERE id = ?`, [nowIso(), s.id]);
  if (fresh.length && ws.brand?.alerts_topic) for (const f of fresh) notifyTopic(ws.brand.alerts_topic, f.title, f.body);
  return openAttention(ws);
}

export async function openAttention(ws) {
  const rows = await all(`SELECT * FROM attention WHERE workspace_id = ? AND status = 'open' ORDER BY created_at DESC`, [ws.id]);
  return rows.map((r) => ({ id: r.id, kind: r.kind, listing_id: r.listing_id, title: r.title, body: r.body, action: JSON.parse(r.action || "{}") }));
}

// The agent tapped the button (or Dismiss). Returns what to show: a notice and, when the work goes
// on in a chat (a plan to approve, a change Hopkins reports there), that chat.
export async function actOnAttention(ws, id, choice) {
  const item = await get(`SELECT * FROM attention WHERE id = ? AND workspace_id = ? AND status = 'open'`, [id, ws.id]);
  if (!item) return { error: "This has already been handled." };
  const done = (status = "done") => run(`UPDATE attention SET status = ?, resolved_at = ? WHERE id = ?`, [status, nowIso(), id]);
  if (choice === "dismiss") { await done("dismissed"); return { notice: "Dismissed" }; }
  const a = JSON.parse(item.action || "{}");
  const listing = item.listing_id ? await loadListing(ws.id, item.listing_id) : null;
  if (a.type === "open") { await done(); return { go: a.href }; }
  if (!listing) { await done("gone"); return { error: "Listing not found" }; }
  if (a.type === "plan") {
    await proposeRun(ws, listing);
    await done();
    return { go: `#/l/${listing.id}` };
  }
  if (a.type === "pause") {
    await pauseOrResume(ws, listing.id, "pause");
    await done();
    return { go: `#/l/${listing.id}` };
  }
  if (a.type === "extend") {
    const l = await get(`SELECT * FROM launches WHERE id = ? AND workspace_id = ?`, [a.launch, ws.id]);
    if (!l) { await done("gone"); return { error: "That run has ended." }; }
    const days = Number(l.days) + 7;
    await changeRun(ws, listing, { budget: (Number(l.budget) / Number(l.days)) * days, days });
    await done();
    return { go: `#/l/${listing.id}` };
  }
  if (a.type === "shift") {
    const r = await shiftBudget(ws, listing, a);
    if (r.ok) await done();
    return r.ok ? { go: `#/l/${listing.id}` } : { error: r.error };
  }
  return { error: "Something went wrong. Please try again." };
}

// Pauses the ad that brings nothing and gives what's left of its budget to the one that brings
// Leads. Both on Meta, all or nothing; the chat says what changed, from the facts.
async function shiftBudget(ws, listing, a) {
  const l = await get(`SELECT * FROM launches WHERE id = ? AND workspace_id = ?`, [a.launch, ws.id]);
  const lose = await get(`SELECT meta_ads.*, ads.version FROM meta_ads JOIN ads ON ads.id = meta_ads.ad_id WHERE meta_ads.ad_id = ? AND launch_id = ?`, [a.lose, a.launch]);
  const win = await get(`SELECT meta_ads.*, ads.version FROM meta_ads JOIN ads ON ads.id = meta_ads.ad_id WHERE meta_ads.ad_id = ? AND launch_id = ?`, [a.win, a.launch]);
  if (!l || !lose || !win || !metaReady()) return { error: "That run has changed. Nothing was moved." };
  const conn = await get(`SELECT * FROM meta_connections WHERE workspace_id = ?`, [ws.id]);
  if (!conn) return { error: "Meta isn't connected. Nothing was moved." };
  const token = unseal(conn.token);
  const n = Number((await get(`SELECT COUNT(*) AS n FROM meta_ads WHERE launch_id = ?`, [l.id])).n) || 1;
  const each = Math.floor((Number(l.budget) * 100) / n);
  try {
    await updateAdSet(token, lose.adset_id, { status: "PAUSED" });
    try {
      await updateAdSet(token, win.adset_id, { lifetime_budget: each + Math.round(a.amount * 100) });
    } catch (err) {
      await updateAdSet(token, lose.adset_id, { status: "ACTIVE" }).catch(() => {});
      throw err;
    }
  } catch (err) {
    const { say } = await import("./hopkins.js");
    await say(ws, listing.id, `Nothing changed: ${String(err.message).replace(/\.$/, "")}.`);
    return { error: "Meta didn't accept the change. Nothing was moved." };
  }
  await run(`UPDATE meta_ads SET status = 'PAUSED' WHERE ad_id = ?`, [lose.ad_id]);
  const { say } = await import("./hopkins.js");
  await say(ws, listing.id, `Done. **Ad ${lose.version}** is paused on Facebook and Instagram, and **Ad ${win.version}** has its ${money(a.amount)} on top of its own budget. The total stays ${money(Number(l.budget))}.`);
  return { ok: true };
}

// Every account, every half hour, so the phone hears about things without the app being open.
export async function watchAll() {
  const wss = await all(`SELECT id FROM workspaces`);
  for (const w of wss) {
    try { await refreshAttention(await getWorkspace(w.id)); } catch (err) { console.error("Checking what needs attention failed:", err.message); }
  }
}
