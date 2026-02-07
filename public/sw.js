self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const action = event.action; // "done" or default
  const habitId = event.notification.data?.habitId;

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: "window" });

      // If app is open, focus it and postMessage
      for (const client of allClients) {
        if ("focus" in client) {
          client.focus();
          client.postMessage({ type: "NOTIF_ACTION", action, habitId });
          return;
        }
      }

      // Otherwise open app
      const client = await self.clients.openWindow("/");
      client?.postMessage({ type: "NOTIF_ACTION", action, habitId });
    })()
  );
});

