// public/sw.js
self.addEventListener('install', (event) => {
  console.log('Service worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service worker activating...');
  event.waitUntil(clients.claim());
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const postId = event.notification.data?.post_id;
  const baseUrl = self.location.origin;
  const url = postId ? `${baseUrl}/user/dashboard/posts/${postId}` : `${baseUrl}/user/dashboard`;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(baseUrl) && 'focus' in client) {
          // If there's an open window, focus it and navigate
          client.focus();
          if (postId) {
            client.postMessage({ type: 'navigate', url: `/user/dashboard/posts/${postId}` });
          }
          return;
        }
      }
      // No open window, open new one
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});