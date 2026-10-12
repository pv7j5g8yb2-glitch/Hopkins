// Push notifications to the founder's phone through ntfy (https://ntfy.sh): the server
// publishes to a private topic, the ntfy app on the phone subscribes to it. Off unless
// NTFY_TOPIC is set. The topic name is the only secret (anyone who knows it can read
// it), so keep it long and random, and never put contact details in a message.
const TOPIC = process.env.NTFY_TOPIC;
const SERVER = process.env.NTFY_SERVER || "https://ntfy.sh";

export const notificationsEnabled = Boolean(TOPIC);

// Fire-and-forget: a slow or failing notification must never delay or break a
// respondent's survey, so callers don't await it and errors are only logged.
export function notify(title, message, tags = []) {
  if (!TOPIC) return;
  fetch(SERVER, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic: TOPIC, title, message, tags }),
    signal: AbortSignal.timeout(5000),
  })
    .then((res) => {
      if (!res.ok) console.error(`Notification failed with HTTP ${res.status}`);
    })
    .catch((err) => console.error("Notification failed:", err.message));
}
