/* Phone notifications of the installed app (Web Push): loaded into the generated service worker
 * (vite.config.ts workbox.importScripts). The server sends { title, body, url } (WebPushService). */
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  const options = {
    body: data.body || '',
    icon: '/pwa/trabot-icon-192.png',
    badge: '/pwa/trabot-icon-192.png',
    dir: 'rtl',
    lang: 'fa',
    data: { url: data.url || '/' },
  };
  // a burst (e.g. many cargo suggestions) shares one tag: the newer one replaces the shown one, silently unless renotify
  if (data.tag) {
    options.tag = data.tag;
    options.renotify = data.renotify === true;
  }
  event.waitUntil(self.registration.showNotification(data.title || 'ترابوت', options));
});

// tapping it opens the page the notification is about, in the app's window when it is already open
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => client.url.startsWith(self.location.origin));
      if (open) return open.navigate(url).then((client) => (client || open).focus());
      return self.clients.openWindow(url);
    }),
  );
});
