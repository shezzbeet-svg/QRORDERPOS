self.addEventListener('install', event => {
 codex/build-modular-frontend-for-restaurant-pos-yluvnu
  self.skipWaiting();

 main
  event.waitUntil(
    caches.open('qrpos-static').then(cache => cache.addAll(['/manifest.json']))
  );
});

 codex/build-modular-frontend-for-restaurant-pos-yluvnu
self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});


 main
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  event.respondWith(
    caches.match(request).then(cached =>
      cached || fetch(request).then(res => {
        const copy = res.clone();
        caches.open('qrpos-dynamic').then(cache => cache.put(request, copy));
        return res;
      })
    )
  );
});

self.addEventListener('sync', event => {
  if (event.tag === 'sync-outbox') {
 codex/build-modular-frontend-for-restaurant-pos-yluvnu
    event.waitUntil(
      self.clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then(clients => {
          clients.forEach(client => client.postMessage({ type: 'SYNC_OUTBOX' }));
        })
    );

    event.waitUntil(self.syncOutbox && self.syncOutbox());
 main
  }
});
