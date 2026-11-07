// Hopkins' notifications (src/push.js sends them). Shows each one and, when tapped, opens Hopkins
// on the right screen, in the window already open if there is one. No caching: the app always
// loads fresh.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "Hopkins", {
    body: d.body || "",
    icon: "/static/icon-192.png",
    tag: d.tag || undefined,
    data: { url: d.url || "/#/today" },
  }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || "/#/today", self.location.origin).href;
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const w of wins) {
      if (new URL(w.url).origin !== self.location.origin) continue;
      await w.focus();
      w.postMessage({ go: url });
      return;
    }
    await self.clients.openWindow(url);
  })());
});
