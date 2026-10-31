import { run, get, all, nowIso } from "./db.js";
import { getWorkspace, stopAllRuns } from "./hopkins.js";
import { stripeReady, cancelSubscription } from "./stripe.js";
import { notifyFounder } from "./notify.js";

// Every table that holds an account's data. Deleting an account (or every account) clears all of
// them; ad_renders goes through its ads.
export const ACCOUNT_TABLES = ["attention", "creations", "meta_ads", "meta_connections", "leads", "tests", "launches", "ads", "messages", "photos", "listings", "feedback", "users"];

// Removes one workspace and everything in it. Its ads stop on Meta first (the caller does that,
// so it can refuse when Meta won't pause), and a paid subscription is ended.
export async function wipeWorkspace(wsId) {
  const ws = await get(`SELECT stripe_subscription FROM workspaces WHERE id = ?`, [wsId]);
  if (ws?.stripe_subscription && stripeReady()) {
    try { await cancelSubscription(ws.stripe_subscription); } catch (err) { console.error("Cancelling the subscription failed:", err.message); }
  }
  await run(`DELETE FROM ad_renders WHERE ad_id IN (SELECT id FROM ads WHERE workspace_id = ?)`, [wsId]);
  for (const t of ACCOUNT_TABLES) await run(`DELETE FROM ${t} WHERE workspace_id = ?`, [wsId]);
  await run(`DELETE FROM workspaces WHERE id = ?`, [wsId]);
}

// A clean start for everyone, once (Ismael, 2026-10-31: "delete every user and even mine so that
// I genuinely start from the beginning as any user would"). Runs when the server starts and a
// marker says it hasn't run yet. Every running ad is paused on Meta first; if Meta refuses for any
// account, nothing is deleted and it tries again on the next start, so no ad keeps spending
// with nobody able to see it.
export const FRESH_START = "2026-10-31";
export async function freshStart(key = FRESH_START) {
  await run(`CREATE TABLE IF NOT EXISTS app_flags (key TEXT PRIMARY KEY, done_at TEXT NOT NULL)`);
  const flag = `fresh-start:${key}`;
  if (await get(`SELECT 1 FROM app_flags WHERE key = ?`, [flag])) return { done: false };
  const workspaces = await all(`SELECT id FROM workspaces`);
  const refused = [];
  for (const { id } of workspaces) {
    const ws = await getWorkspace(id);
    const listings = (await all(`SELECT id FROM listings WHERE workspace_id = ?`, [id])).map((r) => r.id);
    try { await stopAllRuns(ws, listings); } catch (err) { refused.push(`${ws?.name || id}: ${err.message}`); }
  }
  if (refused.length) {
    console.error("Fresh start held back, Meta wouldn't pause:", refused.join("; "));
    notifyFounder("Hopkins fresh start held back", `Meta wouldn't pause ads for: ${refused.join("; ").slice(0, 250)}. Pause them in Ads Manager; it tries again on the next deploy.`, ["warning"]);
    return { done: false, refused };
  }
  for (const { id } of workspaces) await wipeWorkspace(id);
  // Anything left without a workspace (rows from accounts deleted before every table was cleared).
  await run(`DELETE FROM ad_renders`);
  for (const t of ACCOUNT_TABLES) await run(`DELETE FROM ${t}`);
  await run(`INSERT INTO app_flags (key, done_at) VALUES (?, ?)`, [flag, nowIso()]);
  console.log(`Fresh start: ${workspaces.length} accounts deleted.`);
  return { done: true, accounts: workspaces.length };
}
