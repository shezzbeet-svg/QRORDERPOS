self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('qrpos-static').then(cache => cache.addAll(['/manifest.json']))
  );
});

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
    event.waitUntil(self.syncOutbox && self.syncOutbox());
  }
});
