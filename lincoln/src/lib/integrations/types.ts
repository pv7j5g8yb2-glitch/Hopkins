export type Provider = "google" | "microsoft";

/** A connected Google or Microsoft account. One sign in covers every service under it. */
export type Connection = {
  id: string; firm_id: string; user_id: string; provider: Provider; email: string;
  refresh_enc: string; access_enc: string | null; expires_at: number | null;
  last_check: string | null; last_error: string | null; settings: string | null;
};

/** verified: the sender's domain authenticated the message (DMARC), or it came from inside the same organisation. */
export type Inbound = { id: string; threadId: string; from: string; fromName: string; subject: string; text: string; attachments: { name: string; type: string; data: Buffer }[]; verified?: boolean; bulk?: boolean };
export type FileHit = { id: string; name: string; modified: string | null; where: string };
export type OfficeKind = "document" | "spreadsheet" | "presentation";

export const OFFICE_MIME: Record<OfficeKind, string> = {
  document: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  spreadsheet: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  presentation: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};
export const OFFICE_EXT: Record<OfficeKind, string> = { document: "docx", spreadsheet: "xlsx", presentation: "pptx" };

export type Settings = { folderId?: string; teams?: { teamId: string; channelId: string; name: string }; watchUntil?: number; subId?: string; subUntil?: number };
export const settingsOf = (c: Connection): Settings => { try { return JSON.parse(c.settings ?? "{}"); } catch { return {}; } };
