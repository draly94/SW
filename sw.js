// Minimal Service Worker for Online-Only PWA
self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', () => {
    console.log('[PWA] Active and online-only');
});

// Standard fetch listener (required for PWA installation)
self.addEventListener('fetch', (event) => {
    // Just fetch from the network without caching
    event.respondWith(fetch(event.request));
});
self.addEventListener('push', (event) => {
  const data = event.data.json();
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/sw/icon-192.png'
  });
});
