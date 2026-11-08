/* Push only. No fetch listener, caches, session storage or offline responses. */
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data?.json() ?? {}; } catch { /* Always display a visible, safe fallback. */ }
  const kind = data.kind === "habit" ? "habit" : data.kind === "task" ? "task" : "test";
  event.waitUntil(self.registration.showNotification("Lane’s Lair", {
    body: kind === "test" ? "Notifications are ready on this device." : "You have a reminder waiting in your Lair.",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: typeof data.tag === "string" ? data.tag.slice(0, 100) : "lair-reminder",
    data: { url: kind === "habit" ? "/habits" : kind === "task" ? "/tasks" : "/settings#notifications" },
  }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = event.notification.data?.url;
  const safePath = ["/tasks", "/habits", "/settings#notifications"].includes(path) ? path : "/";
  const target = new URL(safePath, self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin) { await client.navigate(target); return client.focus(); }
    }
    return self.clients.openWindow(target);
  })());
});
