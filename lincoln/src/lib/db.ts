import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { seed } from "./seed";

// One SQLite file for this first version. Every table carries firm_id and every query in
// queries.ts filters on it. Before any real client data: Postgres with row level security and a
// key per firm (see docs/LINCOLN-V1.md, security minimum).

const SCHEMA = `
CREATE TABLE IF NOT EXISTS firms (id TEXT PRIMARY KEY, name TEXT NOT NULL, demo INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, firm_id TEXT NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL, role TEXT NOT NULL, initials TEXT NOT NULL, password_hash TEXT, created_at TEXT);
CREATE UNIQUE INDEX IF NOT EXISTS u_users_email ON users(email);
CREATE TABLE IF NOT EXISTS password_resets (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at TEXT NOT NULL, used_at TEXT);
CREATE TABLE IF NOT EXISTS outbox (id TEXT PRIMARY KEY, recipient TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL, at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS cases (
  id TEXT PRIMARY KEY, firm_id TEXT NOT NULL, ref TEXT NOT NULL, client TEXT NOT NULL, counterpart TEXT,
  type_code TEXT NOT NULL, type_name TEXT NOT NULL, family TEXT NOT NULL, stage TEXT NOT NULL, state TEXT NOT NULL,
  waiting_on TEXT, summary TEXT, attorney_id TEXT, paralegal_id TEXT, opened_at TEXT NOT NULL,
  next_date TEXT, next_date_label TEXT, sensitive INTEGER NOT NULL DEFAULT 0, pages INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY, firm_id TEXT NOT NULL, case_id TEXT NOT NULL, n INTEGER NOT NULL, title TEXT NOT NULL, kind TEXT NOT NULL,
  page_from INTEGER, page_to INTEGER, doc_date TEXT, source TEXT, language TEXT, is_scan INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL, note TEXT, received_at TEXT
);
CREATE TABLE IF NOT EXISTS criteria (
  id TEXT PRIMARY KEY, firm_id TEXT NOT NULL, case_id TEXT NOT NULL, n INTEGER NOT NULL, code TEXT NOT NULL, name TEXT NOT NULL,
  citation TEXT NOT NULL, recommendation TEXT NOT NULL, strength TEXT NOT NULL, summary TEXT, weakness TEXT, evidence TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS issues (
  id TEXT PRIMARY KEY, firm_id TEXT NOT NULL, case_id TEXT NOT NULL, kind TEXT NOT NULL, severity TEXT NOT NULL, title TEXT NOT NULL,
  detail TEXT, sources TEXT, status TEXT NOT NULL, resolution TEXT, created_at TEXT NOT NULL, resolved_at TEXT
);
CREATE TABLE IF NOT EXISTS dates (id TEXT PRIMARY KEY, firm_id TEXT NOT NULL, case_id TEXT NOT NULL, label TEXT NOT NULL, date TEXT NOT NULL, kind TEXT NOT NULL, source TEXT);
CREATE TABLE IF NOT EXISTS activity (id TEXT PRIMARY KEY, firm_id TEXT NOT NULL, case_id TEXT, at TEXT NOT NULL, actor TEXT NOT NULL, kind TEXT NOT NULL, text TEXT NOT NULL, minutes INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY, firm_id TEXT NOT NULL, case_id TEXT NOT NULL, kind TEXT NOT NULL, title TEXT NOT NULL, brief TEXT NOT NULL,
  least_sure TEXT, if_wrong TEXT, payload TEXT NOT NULL, status TEXT NOT NULL, assignee_id TEXT, created_at TEXT NOT NULL,
  decided_at TEXT, decided_by TEXT, due TEXT
);
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY, firm_id TEXT NOT NULL, case_id TEXT, direction TEXT NOT NULL, party TEXT NOT NULL, party_role TEXT,
  subject TEXT NOT NULL, body TEXT NOT NULL, at TEXT NOT NULL, state TEXT NOT NULL, lincoln_note TEXT
);
CREATE TABLE IF NOT EXISTS drafts (id TEXT PRIMARY KEY, firm_id TEXT NOT NULL, case_id TEXT NOT NULL, title TEXT NOT NULL, kind TEXT NOT NULL, status TEXT NOT NULL, version INTEGER NOT NULL, content TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS chat (id TEXT PRIMARY KEY, firm_id TEXT NOT NULL, user_id TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS kv (firm_id TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY (firm_id, key));
CREATE INDEX IF NOT EXISTS i_cases_firm ON cases(firm_id);
CREATE INDEX IF NOT EXISTS i_docs_case ON documents(firm_id, case_id);
CREATE INDEX IF NOT EXISTS i_act_firm ON activity(firm_id, at);
CREATE INDEX IF NOT EXISTS i_appr_firm ON approvals(firm_id, status);
CREATE INDEX IF NOT EXISTS i_msg_firm ON messages(firm_id, at);
`;

const TABLES = ["sessions", "kv", "chat", "drafts", "messages", "approvals", "activity", "dates", "issues", "criteria", "documents", "cases", "users", "firms"];

/** Where the database lives. On Render this is the persistent disk (DATA_DIR=/var/data). */
export const dataDir = () => process.env.DATA_DIR || path.join(process.cwd(), "data");

type G = typeof globalThis & { __lincolnDb?: Database.Database };

export function db(): Database.Database {
  const g = globalThis as G;
  if (g.__lincolnDb) return g.__lincolnDb;
  const dir = dataDir();
  fs.mkdirSync(dir, { recursive: true });
  const d = new Database(path.join(dir, "lincoln.db"));
  d.pragma("journal_mode = WAL");
  d.pragma("foreign_keys = ON");
  d.exec(SCHEMA);
  const n = d.prepare("SELECT COUNT(*) AS n FROM firms").get() as { n: number };
  if (n.n === 0) seed(d);
  g.__lincolnDb = d;
  return d;
}

/** Wipes the demo firm and seeds it again. Only ever touches a firm marked demo. */
export function resetDemo(firmId: string) {
  const d = db();
  const firm = d.prepare("SELECT demo FROM firms WHERE id = ?").get(firmId) as { demo: number } | undefined;
  if (!firm || firm.demo !== 1) throw new Error("Only the demo workspace can be reset");
  const tx = d.transaction(() => {
    for (const t of TABLES) {
      if (t === "sessions") d.prepare("DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE firm_id = ?)").run(firmId);
      else if (t === "firms") d.prepare("DELETE FROM firms WHERE id = ?").run(firmId);
      else d.prepare(`DELETE FROM ${t} WHERE firm_id = ?`).run(firmId);
    }
    seed(d);
  });
  tx();
}

export const uid = () => crypto.randomUUID().replace(/-/g, "").slice(0, 16);
