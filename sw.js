// No cache name or assets list needed

self.addEventListener('install', (event) => {
  // Forces the waiting service worker to become the active service worker immediately
  self.skipWaiting();
  console.log('[SW] Installed');
});

self.addEventListener('activate', (event) => {
  // Delete all existing caches from previous versions
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)));
    })
  );
  // Take control of all open tabs immediately
  self.clients.claim();
  console.log('[SW] Activated and Caches Cleared');
});

// NETWORK ONLY STRATEGY
self.addEventListener('fetch', (event) => {
  // Just fetch from the network and do nothing else
  event.respondWith(fetch(event.request));
});
