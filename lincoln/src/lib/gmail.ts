import { db, uid } from "./db";
import { open, seal } from "./secret";

// Gmail through Google's own API: read the inbox, fetch attachments, send mail as the attorney.
// Needs GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and APP_URL. Tokens are stored encrypted, per firm.

export type Mailbox = { id: string; firm_id: string; user_id: string; provider: string; email: string; refresh_enc: string; access_enc: string | null; expires_at: number | null; last_check: string | null; last_error: string | null };
export type Inbound = { id: string; threadId: string; from: string; fromName: string; subject: string; text: string; attachments: { name: string; type: string; data: Buffer }[] };

const SCOPES = ["openid", "email", "https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/gmail.send"];
export const googleConfigured = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.APP_URL);
const redirectUri = () => `${process.env.APP_URL!.replace(/\/$/, "")}/api/connect/google/callback`;

export function authUrl(state: string) {
  const q = new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, redirect_uri: redirectUri(), response_type: "code", scope: SCOPES.join(" "), access_type: "offline", prompt: "consent", include_granted_scopes: "true", state });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

async function token(body: Record<string, string>) {
  const res = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, ...body }) });
  const data = (await res.json()) as { access_token?: string; refresh_token?: string; expires_in?: number; id_token?: string; error_description?: string; error?: string };
  if (!res.ok || !data.access_token) throw new Error(data.error_description ?? data.error ?? `Google replied ${res.status}`);
  return data;
}

/** Completes the connection and records the mailbox. Mail already in the inbox is not processed. */
export async function connect(firmId: string, userId: string, code: string) {
  const t = await token({ code, grant_type: "authorization_code", redirect_uri: redirectUri() });
  if (!t.refresh_token) throw new Error("Google did not return offline access.");
  const claims = JSON.parse(Buffer.from((t.id_token ?? "..").split(".")[1] ?? "", "base64url").toString() || "{}") as { email?: string };
  const email = (claims.email ?? "").toLowerCase();
  const d = db();
  d.prepare("DELETE FROM mailboxes WHERE firm_id = ? AND user_id = ? AND provider = 'google'").run(firmId, userId);
  const id = uid();
  d.prepare("INSERT INTO mailboxes (id, firm_id, user_id, provider, email, refresh_enc, access_enc, expires_at, created_at) VALUES (?, ?, ?, 'google', ?, ?, ?, ?, ?)").run(id, firmId, userId, email, seal(t.refresh_token), seal(t.access_token!), Date.now() + (t.expires_in ?? 3000) * 1000, new Date().toISOString());
  const mb = d.prepare("SELECT * FROM mailboxes WHERE id = ?").get(id) as Mailbox;
  const ins = d.prepare("INSERT OR IGNORE INTO inbound_seen (mailbox_id, msg_id) VALUES (?, ?)");
  for (const m of await list(mb)) ins.run(id, m);
  return email;
}

async function access(mb: Mailbox) {
  if (mb.access_enc && mb.expires_at && mb.expires_at > Date.now() + 60_000) return open(mb.access_enc);
  const t = await token({ refresh_token: open(mb.refresh_enc), grant_type: "refresh_token" });
  db().prepare("UPDATE mailboxes SET access_enc = ?, expires_at = ? WHERE id = ?").run(seal(t.access_token!), Date.now() + (t.expires_in ?? 3000) * 1000, mb.id);
  return t.access_token!;
}

async function api<T>(mb: Mailbox, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, { ...init, headers: { Authorization: `Bearer ${await access(mb)}`, "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  if (!res.ok) throw new Error(`Gmail replied ${res.status}`);
  return (await res.json()) as T;
}

async function list(mb: Mailbox) {
  const r = await api<{ messages?: { id: string }[] }>(mb, `messages?q=${encodeURIComponent("in:inbox newer_than:3d -from:me")}&maxResults=25`);
  return (r.messages ?? []).map((m) => m.id);
}

type Part = { mimeType: string; filename?: string; headers?: { name: string; value: string }[]; body?: { data?: string; attachmentId?: string; size?: number }; parts?: Part[] };

/** New mail since the last check, with text and PDF attachments. */
export async function fetchNew(mb: Mailbox): Promise<Inbound[]> {
  const d = db();
  const seen = d.prepare("SELECT 1 FROM inbound_seen WHERE mailbox_id = ? AND msg_id = ?");
  const fresh = (await list(mb)).filter((id) => !seen.get(mb.id, id)).slice(0, 5);
  const out: Inbound[] = [];
  for (const id of fresh) {
    const m = await api<{ id: string; threadId: string; payload: Part }>(mb, `messages/${id}?format=full`);
    const h = (n: string) => m.payload.headers?.find((x) => x.name.toLowerCase() === n)?.value ?? "";
    const fromRaw = h("from");
    const email = (/<([^>]+)>/.exec(fromRaw)?.[1] ?? fromRaw).trim().toLowerCase();
    const fromName = fromRaw.replace(/<[^>]+>/, "").replace(/"/g, "").trim() || email;
    let text = "";
    const attachments: Inbound["attachments"] = [];
    const walk = async (p: Part) => {
      if (p.mimeType === "text/plain" && p.body?.data && !p.filename) text += Buffer.from(p.body.data, "base64url").toString("utf8");
      if (p.filename && /pdf$/i.test(p.mimeType + p.filename) && p.body?.attachmentId && (p.body.size ?? 0) < 25 * 1024 * 1024) {
        const a = await api<{ data: string }>(mb, `messages/${id}/attachments/${p.body.attachmentId}`);
        attachments.push({ name: p.filename, type: "application/pdf", data: Buffer.from(a.data, "base64url") });
      }
      for (const c of p.parts ?? []) await walk(c);
    };
    await walk(m.payload);
    out.push({ id, threadId: m.threadId, from: email, fromName, subject: h("subject"), text: text.slice(0, 20000), attachments });
    d.prepare("INSERT OR IGNORE INTO inbound_seen (mailbox_id, msg_id) VALUES (?, ?)").run(mb.id, id);
  }
  return out;
}

const header = (v: string) => (/^[\x20-\x7e]*$/.test(v) ? v : `=?UTF-8?B?${Buffer.from(v).toString("base64")}?=`);

export async function send(mb: Mailbox, to: string, subject: string, body: string, threadId?: string | null) {
  const raw = [`From: ${mb.email}`, `To: ${to}`, `Subject: ${header(subject)}`, "MIME-Version: 1.0", "Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: base64", "", Buffer.from(body).toString("base64")].join("\r\n");
  return api<{ id: string; threadId: string }>(mb, "messages/send", { method: "POST", body: JSON.stringify({ raw: Buffer.from(raw).toString("base64url"), ...(threadId ? { threadId } : {}) }) });
}

export const firmMailbox = (firmId: string, userId?: string) =>
  (userId ? (db().prepare("SELECT * FROM mailboxes WHERE firm_id = ? AND user_id = ?").get(firmId, userId) as Mailbox | undefined) : undefined) ??
  (db().prepare("SELECT * FROM mailboxes WHERE firm_id = ? ORDER BY created_at LIMIT 1").get(firmId) as Mailbox | undefined);
