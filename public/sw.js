const CACHE_NAME = `wedding-media-v1:${self.registration.scope}`;
const MAX_AGE = 90 * 24 * 60 * 60 * 1000;
const CACHED_AT = 'x-wedding-cached-at';
const assets = new URL('assets/', self.registration.scope);

self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await self.clients.claim();
    const cache = await caches.open(CACHE_NAME);
    for (const request of await cache.keys()) {
      const response = await cache.match(request);
      if (Date.now() - Number(response.headers.get(CACHED_AT)) >= MAX_AGE) {
        await cache.delete(request);
      }
    }
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== assets.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request, {cache: 'no-cache'}));
    return;
  }
  if (!url.href.startsWith(assets.href) || !/\.(png|jpe?g|webp|avif|woff2?)$/i.test(url.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME).catch(() => null);
    const cached = await cache?.match(request);
    if (cached && Date.now() - Number(cached.headers.get(CACHED_AT)) < MAX_AGE) return cached;
    if (cached) await cache.delete(request);
    const response = await fetch(request, {cache: 'no-cache'});
    if (cache && response.ok) {
      const copy = response.clone();
      event.waitUntil((async () => {
        const headers = new Headers(copy.headers);
        headers.set(CACHED_AT, String(Date.now()));
        headers.delete('content-encoding');
        headers.delete('content-length');
        await cache.put(request, new Response(await copy.arrayBuffer(), {status: copy.status, headers}));
      })().catch(() => {}));
    }
    return response;
  })());
});
