import { randomUUID } from "node:crypto";

// The two waitlist endpoints, kept free of anything Netlify specific so they can be
// tested locally against a file database. netlify/functions/waitlist.mjs wires them to
// Turso, the same database the survey uses, so sign ups show up at /admin/waitlist on
// the survey server.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SIZES = new Set(["1", "2-5", "6-20", "21+"]);
const SPENDS = new Set(["<500", "500-2000", "2000-5000", "5000+"]);
const COUNTRIES = new Set([
  "United States", "Canada", "United Kingdom", "Ireland", "Australia", "United Arab Emirates", "Somewhere else",
]);
const SIZE_LABELS = { "1": "just them", "2-5": "2 to 5 agents", "6-20": "6 to 20 agents", "21+": "21 or more agents" };
const SPEND_LABELS = { "<500": "under $500", "500-2000": "$500 to $2,000", "2000-5000": "$2,000 to $5,000", "5000+": "$5,000 or more" };

// Same columns as the table in survey/src/db.js. Whichever side starts first creates it.
export const SCHEMA = `CREATE TABLE IF NOT EXISTS waitlist (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  business TEXT,
  country TEXT,
  team_size TEXT,
  monthly_spend TEXT,
  source TEXT,
  ref TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT
)`;

// A light brake on scripted sign ups. Kept in memory only, per warm function instance:
// addresses are never stored.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 12;
const hits = new Map();
function tooMany(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

function clean(value, max) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

const json = (body, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

// db: a libsql client. notify(title, message, tags) returns a promise that never rejects.
// It is not awaited, so a slow notification never delays a sign up; waitUntil keeps the
// function alive until it has gone out.
export function createHandler({ db, notify }) {
  let ready;
  const ensureTable = () => (ready ??= db.execute(SCHEMA).catch((err) => { ready = null; throw err; }));
  const one = async (sql, args) => (await db.execute({ sql, args })).rows[0];

  async function signUp(req, ip, ping) {
    const { email, source, ref, website } = await req.json().catch(() => ({}));
    // "website" is a field people never see; only bots fill it in. They get a normal
    // looking reply so they don't retry, and nothing is stored.
    if (website) return json({ ok: true, id: randomUUID() });
    if (tooMany(ip || "unknown")) return json({ error: "Too many tries. Please wait a few minutes." }, 429);

    const address = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!EMAIL_RE.test(address) || address.length > 200) return json({ error: "That email doesn't look right." }, 400);

    const existing = await one(`SELECT id FROM waitlist WHERE email = ?`, [address]);
    if (existing) return json({ ok: true, id: existing.id, already: true });

    const id = randomUUID();
    await db.execute({
      sql: `INSERT INTO waitlist (id, email, source, ref, created_at) VALUES (?, ?, ?, ?, ?)`,
      args: [id, address, clean(source, 40), clean(ref, 200), new Date().toISOString()],
    });
    const count = await one(`SELECT COUNT(*) AS n FROM waitlist`, []);
    ping("Hopkins waitlist", `New sign up. That's ${count?.n ?? "?"} on the list.`, ["tada"]);
    return json({ ok: true, id });
  }

  async function addDetails(req, id, ping) {
    const row = await one(`SELECT id FROM waitlist WHERE id = ?`, [id ?? ""]);
    if (!row) return json({ error: "unknown sign up" }, 404);

    const { business, country, size, spend } = await req.json().catch(() => ({}));
    const fields = {
      business: clean(business, 120),
      country: COUNTRIES.has(country) ? country : null,
      team_size: SIZES.has(size) ? size : null,
      monthly_spend: SPENDS.has(spend) ? spend : null,
    };
    await db.execute({
      sql: `UPDATE waitlist SET business = COALESCE(?, business), country = COALESCE(?, country),
              team_size = COALESCE(?, team_size), monthly_spend = COALESCE(?, monthly_spend), updated_at = ? WHERE id = ?`,
      args: [fields.business, fields.country, fields.team_size, fields.monthly_spend, new Date().toISOString(), row.id],
    });
    const parts = [
      SIZE_LABELS[fields.team_size],
      SPEND_LABELS[fields.monthly_spend] && `spends ${SPEND_LABELS[fields.monthly_spend]}`,
      fields.country,
    ].filter(Boolean);
    if (parts.length) ping("Hopkins waitlist", `Sign up details: ${parts.join(", ")}.`, ["memo"]);
    return json({ ok: true });
  }

  // id is set for the details step, ip is only used for the rate limit.
  return async function handle(req, { id, ip, waitUntil } = {}) {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
    const ping = (...args) => { const sent = notify(...args); waitUntil?.(sent); };
    try {
      await ensureTable();
      return id ? await addDetails(req, id, ping) : await signUp(req, ip, ping);
    } catch (err) {
      console.error("Waitlist error:", err.message);
      return json({ error: "Something went wrong. Please try again." }, 500);
    }
  };
}

// Push a notification to the founder's phone through ntfy. Off unless NTFY_TOPIC is set.
// Never put contact details in a message.
export function makeNotify(topic, server = "https://ntfy.sh") {
  return (title, message, tags = []) => {
    if (!topic) return Promise.resolve();
    return fetch(server, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, title, message, tags }),
      signal: AbortSignal.timeout(5000),
    })
      .then((res) => { if (!res.ok) console.error(`Notification failed with HTTP ${res.status}`); })
      .catch((err) => console.error("Notification failed:", err.message));
  };
}
