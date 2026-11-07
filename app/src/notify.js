// Phone notifications through ntfy (https://ntfy.sh). The ntfy app on a phone subscribes to
// a topic, and anything published to it arrives within seconds.
//
// Two uses: the founder's own topic (NTFY_TOPIC) for sign ups and approvals, and each
// workspace's own topic (set on the Brand page) so new leads reach the agent's phone.
// Topic names are the only secret, so messages never carry contact details: they say a
// lead arrived and the app has the rest.
const SERVER = process.env.NTFY_SERVER || "https://ntfy.sh";

export function notifyTopic(topic, title, message, tags = []) {
  if (!topic || !/^[A-Za-z0-9_-]{6,64}$/.test(topic)) return;
  fetch(SERVER, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, title, message, tags }),
    signal: AbortSignal.timeout(5000),
  })
    .then((res) => {
      if (!res.ok) console.error(`Notification failed with HTTP ${res.status}`);
    })
    .catch((err) => console.error("Notification failed:", err.message));
}

export function notifyFounder(title, message, tags = []) {
  notifyTopic(process.env.NTFY_TOPIC, title, message, tags);
}
