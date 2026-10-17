import { createClient } from "@libsql/client/web";

import { createHandler, makeNotify } from "../../lib/signup.mjs";

// Netlify function for the waitlist form. Writes to the survey's Turso database, so set
// the same DATABASE_URL and DATABASE_AUTH_TOKEN here as on the survey server, plus
// NTFY_TOPIC for phone notifications.
const handle = createHandler({
  db: createClient({ url: process.env.DATABASE_URL, authToken: process.env.DATABASE_AUTH_TOKEN }),
  notify: makeNotify(process.env.NTFY_TOPIC, process.env.NTFY_SERVER),
});

export default (req, context) =>
  handle(req, { id: context.params?.id, ip: context.ip, waitUntil: (p) => context.waitUntil(p) });

export const config = { path: ["/api/waitlist", "/api/waitlist/:id/details"] };
