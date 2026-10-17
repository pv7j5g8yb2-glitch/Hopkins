import { createClient } from "@libsql/client";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const url = process.env.DATABASE_URL || "file:./data/survey.db";
if (url.startsWith("file:")) mkdirSync(dirname(url.slice("file:".length)), { recursive: true });

export const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });

await client.executeMultiple(`
  CREATE TABLE IF NOT EXISTS responses (
    id TEXT PRIMARY KEY,
    segment_slug TEXT NOT NULL,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    status TEXT NOT NULL DEFAULT 'in_progress',
    current_question_number INTEGER NOT NULL,
    current_question_text TEXT NOT NULL,
    current_question_text_localized TEXT,
    source_ref TEXT,
    respondent_name TEXT,
    respondent_language TEXT,
    respondent_role TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    wants_updates TEXT,
    problem_summary TEXT,
    problem_summary_localized TEXT
  );

  CREATE TABLE IF NOT EXISTS answers (
    id TEXT PRIMARY KEY,
    response_id TEXT NOT NULL REFERENCES responses(id),
    question_number INTEGER NOT NULL,
    question_kind TEXT NOT NULL,
    question_text TEXT NOT NULL,
    question_text_localized TEXT,
    answer_text TEXT NOT NULL,
    answer_text_original TEXT,
    answered_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS translation_bundles (
    language TEXT PRIMARY KEY,
    bundle TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS answers_response_idx ON answers(response_id);

  -- Hopkins waitlist sign ups from the landing page. Separate from survey responses:
  -- different people, different purpose. Email is the only required field; the rest
  -- comes from the optional second step and can stay empty.
  CREATE TABLE IF NOT EXISTS waitlist (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    business TEXT,
    instagram TEXT,
    country TEXT,
    team_size TEXT,
    monthly_spend TEXT,
    source TEXT,
    ref TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT
  );

  -- Daily visit counts for the waitlist page, by link source. Counts only: no IP
  -- addresses, no cookies, nothing that identifies a visitor.
  CREATE TABLE IF NOT EXISTS waitlist_visits (
    day TEXT NOT NULL,
    ref TEXT NOT NULL,
    visits INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (day, ref)
  );
`);

// The CREATE TABLE above only takes effect on a brand new database. The live database
// already exists without these columns, so they need adding explicitly here; the catch
// makes this a no-op on every later startup once a column is already there.
const migrations = [
  ["responses", "respondent_language", "TEXT"],
  ["responses", "respondent_role", "TEXT"],
  ["responses", "current_question_text_localized", "TEXT"],
  ["responses", "wants_updates", "TEXT"],
  ["responses", "problem_summary", "TEXT"],
  ["responses", "problem_summary_localized", "TEXT"],
  ["answers", "question_text_localized", "TEXT"],
  ["answers", "answer_text_original", "TEXT"],
  ["translation_bundles", "source_hash", "TEXT"],
  ["waitlist", "instagram", "TEXT"],
];
for (const [table, column, type] of migrations) {
  try {
    await client.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  } catch (err) {
    if (!/duplicate column/i.test(err.message)) throw err;
  }
}

export async function run(sql, args = []) {
  return client.execute({ sql, args });
}

export async function get(sql, args = []) {
  const res = await client.execute({ sql, args });
  return res.rows[0] ?? null;
}

export async function all(sql, args = []) {
  const res = await client.execute({ sql, args });
  return res.rows;
}
