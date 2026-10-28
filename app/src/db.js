import { createClient } from "@libsql/client";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

// Same storage as the waitlist server: SQLite through libsql, a local file while testing and
// a hosted Turso database in production. Only DATABASE_URL changes between the two.
const url = process.env.DATABASE_URL || "file:./data/hopkins.db";
if (url.startsWith("file:") && url !== "file::memory:") mkdirSync(dirname(url.slice("file:".length)), { recursive: true });

export const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });

await client.executeMultiple(`
  -- A workspace is one business: a solo agent, a team or a brokerage. Its brand is the
  -- system every ad Hopkins makes for it follows.
  CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'free',
    brand TEXT NOT NULL DEFAULT '{}',
    first_live_at TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id),
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    pass_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS listings (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id),
    slug TEXT NOT NULL UNIQUE,
    address TEXT,
    city TEXT,
    area TEXT,
    price INTEGER,
    beds REAL,
    baths REAL,
    sqft INTEGER,
    home_type TEXT,
    features TEXT NOT NULL DEFAULT '[]',
    description TEXT,
    link TEXT,
    open_house TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    moment TEXT NOT NULL DEFAULT 'new',
    spend REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- Photos are resized in the browser before upload (about 1600px wide), so a blob in the
  -- database is fine for now and survives redeploys on hosts with no lasting disk.
  CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    listing_id TEXT,
    kind TEXT NOT NULL DEFAULT 'listing',
    label TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    mime TEXT NOT NULL,
    data BLOB NOT NULL,
    thumb BLOB,
    created_at TEXT NOT NULL
  );

  -- One chat per listing, plus a general chat (listing_id NULL). Hopkins' messages can
  -- carry cards: a set of ads, a run plan, an upgrade note, a report.
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    listing_id TEXT,
    role TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'text',
    body TEXT NOT NULL DEFAULT '',
    data TEXT,
    needs_action INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ads (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    listing_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    moment TEXT NOT NULL DEFAULT 'new',
    pattern TEXT NOT NULL,
    headline TEXT NOT NULL,
    primary_text TEXT NOT NULL,
    overlay TEXT NOT NULL,
    kicker TEXT,
    cta TEXT NOT NULL DEFAULT 'Learn more',
    photo_id TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    style TEXT NOT NULL DEFAULT '{}',
    revision INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- A run plan the owner said yes to. Until Meta is connected it waits there, which the
  -- app says plainly; nothing claims to be live when it isn't.
  CREATE TABLE IF NOT EXISTS launches (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    listing_id TEXT NOT NULL,
    ad_ids TEXT NOT NULL,
    budget REAL NOT NULL,
    days INTEGER NOT NULL,
    radius_miles INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'waiting_on_meta',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    listing_id TEXT NOT NULL,
    ad_id TEXT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    wants TEXT NOT NULL DEFAULT 'info',
    note TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    source TEXT,
    created_at TEXT NOT NULL
  );

  -- The testing record: one row per ad version that was put in front of people. Over time
  -- this is what tells Hopkins which kind of ad wins for which kind of listing, where.
  CREATE TABLE IF NOT EXISTS tests (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    listing_id TEXT NOT NULL,
    ad_id TEXT NOT NULL UNIQUE,
    home_type TEXT,
    city TEXT,
    price_band TEXT,
    pattern TEXT NOT NULL,
    moment TEXT NOT NULL,
    audience TEXT,
    spend REAL NOT NULL DEFAULT 0,
    leads INTEGER NOT NULL DEFAULT 0,
    started_at TEXT NOT NULL,
    ended_at TEXT
  );

  CREATE INDEX IF NOT EXISTS listings_ws_idx ON listings(workspace_id);
  CREATE INDEX IF NOT EXISTS messages_chat_idx ON messages(workspace_id, listing_id, created_at);
  CREATE UNIQUE INDEX IF NOT EXISTS ads_set_idx ON ads(listing_id, moment, version);
  CREATE INDEX IF NOT EXISTS leads_ws_idx ON leads(workspace_id, created_at);
  CREATE INDEX IF NOT EXISTS photos_listing_idx ON photos(listing_id);
  CREATE INDEX IF NOT EXISTS messages_listing_idx ON messages(listing_id, created_at);
  CREATE INDEX IF NOT EXISTS leads_listing_idx ON leads(listing_id);

  -- What pilot users tell the founder from the app (account menu, Send feedback).
  CREATE TABLE IF NOT EXISTS feedback (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    body TEXT NOT NULL,
    page TEXT,
    created_at TEXT NOT NULL
  );
`);

// Columns added after launch. CREATE TABLE above only applies to a brand new database, so
// existing ones get them here; the catch makes it a no-op once the column exists.
// ads_removed: ads on listings the agent deleted, so deleting a listing doesn't hand back free ads.
for (const sql of ["ALTER TABLE users ADD COLUMN avatar_id TEXT", "ALTER TABLE workspaces ADD COLUMN ads_removed INTEGER NOT NULL DEFAULT 0", "ALTER TABLE listings ADD COLUMN title TEXT", "ALTER TABLE ads ADD COLUMN name TEXT", "ALTER TABLE photos ADD COLUMN seen TEXT",
  // session_ver: bumped when the password changes, which signs out every other device.
  // reset_hash and reset_expires: a one time password reset link (only its hash is kept).
  "ALTER TABLE users ADD COLUMN session_ver INTEGER NOT NULL DEFAULT 0", "ALTER TABLE users ADD COLUMN last_seen TEXT",
  "ALTER TABLE users ADD COLUMN reset_hash TEXT", "ALTER TABLE users ADD COLUMN reset_expires TEXT", "ALTER TABLE users ADD COLUMN reset_asked TEXT",
  // untitled_no: a listing with no name or address is "Untitled 1", "Untitled 2"... for good.
  "ALTER TABLE listings ADD COLUMN untitled_no INTEGER",
  // undo: on the agent's latest message, the listing and its ads as they were before it, so
  // the message can be edited (hopkins.js, editMessage).
  "ALTER TABLE messages ADD COLUMN undo TEXT",
  // currency: the listing's own (EUR for "€1,250,000"); empty means US dollars.
  "ALTER TABLE listings ADD COLUMN currency TEXT"]) {
  // Only "already there" is expected; anything else is logged, not hidden.
  try { await client.execute(sql); } catch (err) { if (!/duplicate column/i.test(err.message)) console.error(`Migration failed (${sql}):`, err.message); }
}

export async function run(sql, args = []) {
  return client.execute({ sql, args });
}

// Rows come back as plain objects keyed by column name, so they can go straight to JSON.
function plain(result) {
  return result.rows.map((row) => Object.fromEntries(result.columns.map((c, i) => [c, row[i]])));
}

export async function get(sql, args = []) {
  return plain(await client.execute({ sql, args }))[0] || null;
}

export async function all(sql, args = []) {
  return plain(await client.execute({ sql, args }));
}

export const nowIso = () => new Date().toISOString();
