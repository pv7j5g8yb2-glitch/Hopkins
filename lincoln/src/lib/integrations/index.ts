import { db, uid } from "../db";
import { seal } from "../secret";
import * as google from "./google";
import * as microsoft from "./microsoft";
import type { Connection, FileHit, Inbound, OfficeKind, Provider } from "./types";

export type { Connection, FileHit, Inbound, OfficeKind, Provider } from "./types";
export { settingsOf } from "./types";

const P = { google, microsoft } as const;

export const PROVIDERS: { id: Provider; name: string; services: string[]; configured: () => boolean }[] = [
  { id: "google", name: "Google", services: ["Gmail", "Drive", "Docs", "Sheets", "Slides", "Calendar"], configured: google.configured },
  { id: "microsoft", name: "Microsoft", services: ["Outlook", "Word", "Excel", "PowerPoint", "OneDrive", "SharePoint", "Teams"], configured: microsoft.configured },
];
export const isProvider = (v: string): v is Provider => v === "google" || v === "microsoft";
export const authUrl = (p: Provider, state: string) => P[p].authUrl(state);

export const connectionsOf = (firmId: string, userId?: string) =>
  (userId
    ? db().prepare("SELECT * FROM mailboxes WHERE firm_id = ? AND user_id = ? ORDER BY created_at").all(firmId, userId)
    : db().prepare("SELECT * FROM mailboxes WHERE firm_id = ? ORDER BY created_at").all(firmId)) as Connection[];
export const connection = (firmId: string, userId: string, p: Provider) => db().prepare("SELECT * FROM mailboxes WHERE firm_id = ? AND user_id = ? AND provider = ?").get(firmId, userId, p) as Connection | undefined;
/** The connection to act through: the user's own first, otherwise any in the firm. */
export const firmMailbox = (firmId: string, userId?: string) => (userId ? connectionsOf(firmId, userId)[0] : undefined) ?? connectionsOf(firmId)[0];

/** Completes a sign in. Mail already in the inbox is marked as seen, so only new mail is worked. */
export async function connect(p: Provider, firmId: string, userId: string, code: string) {
  const t = await P[p].exchange(code);
  const d = db();
  d.prepare("DELETE FROM mailboxes WHERE firm_id = ? AND user_id = ? AND provider = ?").run(firmId, userId, p);
  const id = uid();
  d.prepare("INSERT INTO mailboxes (id, firm_id, user_id, provider, email, refresh_enc, access_enc, expires_at, created_at, settings) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '{}')").run(id, firmId, userId, p, t.email, seal(t.refresh), seal(t.access), t.expires, new Date().toISOString());
  const c = d.prepare("SELECT * FROM mailboxes WHERE id = ?").get(id) as Connection;
  const seen = d.prepare("INSERT OR IGNORE INTO inbound_seen (mailbox_id, msg_id) VALUES (?, ?)");
  for (const m of await P[p].listInbox(c)) seen.run(id, m);
  return t.email;
}

export async function fetchNew(c: Connection): Promise<Inbound[]> {
  const d = db();
  const seen = d.prepare("SELECT 1 FROM inbound_seen WHERE mailbox_id = ? AND msg_id = ?");
  const fresh = (await P[c.provider].listInbox(c)).filter((id) => !seen.get(c.id, id)).slice(0, 5);
  const out: Inbound[] = [];
  for (const id of fresh) {
    out.push(await P[c.provider].readMessage(c, id));
    d.prepare("INSERT OR IGNORE INTO inbound_seen (mailbox_id, msg_id) VALUES (?, ?)").run(c.id, id);
  }
  return out;
}

export const send = (c: Connection, to: string, subject: string, body: string, threadId?: string | null) => (c.provider === "google" ? google.send(c, to, subject, body, threadId) : microsoft.send(c, to, subject, body));
export const addEvent = (c: Connection, e: { title: string; date: string; details: string }) => P[c.provider].addEvent(c, e);
export const searchFiles = (c: Connection, q: string): Promise<FileHit[]> => P[c.provider].searchFiles(c, q);
export const download = (c: Connection, id: string) => P[c.provider].download(c, id);
export const upload = (c: Connection, name: string, kind: OfficeKind, data: Buffer) => P[c.provider].upload(c, name, kind, data);
export const teamsChannels = (c: Connection) => microsoft.channels(c);
export const teamsPost = (c: Connection, teamId: string, channelId: string, html: string) => microsoft.post(c, teamId, channelId, html);
