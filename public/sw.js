// Immense Air CRM Service Worker with Mobile Phone Push & Notification Support
const CACHE_NAME = 'immense-crm-v2';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/immense-air-icon.png',
  '/immense-logo.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Network-first strategy for dynamic API and CRM updates
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip caching for API and non-GET requests
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// Handle phone notification clicks (When agent/admin taps notification banner on mobile)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If CRM is already open, focus it
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Handle incoming background push message
self.addEventListener('push', (event) => {
  let data = {
    title: 'Immense Air CRM Alert',
    body: 'You have a new update in your CRM.',
    url: '/',
    tag: 'crm-push',
  };

  if (event.data) {
    try {
      data = Object.assign(data, event.data.json());
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [300, 100, 300, 100, 300],
    tag: data.tag || 'immense-crm-alert',
    renotify: true,
    data: {
      url: data.url || '/',
      dateOfArrival: Date.now(),
    },
    actions: [
      { action: 'open', title: 'Open CRM' }
    ]
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});
