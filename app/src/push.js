import webpush from "web-push";
import { randomUUID } from "node:crypto";
import { run, get, all, nowIso } from "./db.js";
import { seal, unseal } from "./meta.js";

// Notifications straight to the agent's phone or laptop (Ismael, 2026-11-01: "just an accept
// notifications button"), through the browser's own push, no app to install and nothing to copy.
// Hopkins makes its own keys the first time and keeps the private one sealed.
let keys = null;
let sendImpl = (sub, payload, opts) => webpush.sendNotification(sub, payload, opts);
export function setPushSendForTests(f) { sendImpl = f; }

export async function pushKeys() {
  if (keys) return keys;
  await run(`CREATE TABLE IF NOT EXISTS app_keys (name TEXT PRIMARY KEY, value TEXT NOT NULL)`);
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    keys = { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  } else {
    const row = await get(`SELECT value FROM app_keys WHERE name = 'vapid'`);
    if (row) keys = JSON.parse(unseal(row.value));
    else {
      keys = webpush.generateVAPIDKeys();
      await run(`INSERT OR IGNORE INTO app_keys (name, value) VALUES ('vapid', ?)`, [seal(JSON.stringify(keys))]);
      // Two servers starting at once: keep whichever was saved first.
      keys = JSON.parse(unseal((await get(`SELECT value FROM app_keys WHERE name = 'vapid'`)).value));
    }
  }
  webpush.setVapidDetails(`mailto:${process.env.PUSH_CONTACT || "gethopkins@gmail.com"}`, keys.publicKey, keys.privateKey);
  return keys;
}

const okEndpoint = (u) => { try { const h = new URL(u); return h.protocol === "https:"; } catch { return false; } };

export async function savePush(ws, userId, sub, ua = "") {
  if (!sub || !okEndpoint(sub.endpoint) || !sub.keys?.p256dh || !sub.keys?.auth) return false;
  await run(`DELETE FROM push_subs WHERE endpoint = ?`, [sub.endpoint]);
  await run(`INSERT INTO push_subs (id, workspace_id, user_id, endpoint, p256dh, auth, ua, created_at) VALUES (?,?,?,?,?,?,?,?)`,
    [randomUUID(), ws.id, userId, sub.endpoint, sub.keys.p256dh, sub.keys.auth, String(ua).slice(0, 200), nowIso()]);
  return true;
}
export const dropPush = (ws, endpoint) => run(`DELETE FROM push_subs WHERE workspace_id = ? AND endpoint = ?`, [ws.id, endpoint]);
export const pushCount = async (wsId) => Number((await get(`SELECT COUNT(*) AS n FROM push_subs WHERE workspace_id = ?`, [wsId]))?.n || 0);

// To every device the workspace turned notifications on for. A device that's gone (unsubscribed,
// app removed) is forgotten; nothing here ever throws into the caller.
export async function pushTo(wsId, { title, body, url = "/#/today", tag } = {}) {
  try {
    const subs = await all(`SELECT * FROM push_subs WHERE workspace_id = ?`, [wsId]);
    if (!subs.length) return 0;
    await pushKeys();
    const payload = JSON.stringify({ title: String(title || "Hopkins").slice(0, 80), body: String(body || "").slice(0, 200), url, tag });
    let sent = 0;
    await Promise.all(subs.map(async (s) => {
      try {
        await sendImpl({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 24 * 3600, urgency: "high" });
        sent++;
      } catch (err) {
        if (err?.statusCode === 404 || err?.statusCode === 410) await run(`DELETE FROM push_subs WHERE id = ?`, [s.id]);
        else console.error("Push failed:", err?.statusCode || "", err?.message || err);
      }
    }));
    return sent;
  } catch (err) {
    console.error("Push failed:", err.message);
    return 0;
  }
}
