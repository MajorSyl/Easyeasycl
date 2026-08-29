// Minimal app-shell service worker. Goal is graceful offline degradation
// only -- no data sync, no push, no background work.
//
// The web build's JS bundle filename is content-hashed and changes on every
// deploy (e.g. /_expo/static/js/web/entry-<hash>.js), so it can't be
// hardcoded into a precache list here (this file isn't processed by the
// build, it ships as a static file). Instead this uses a "network-first,
// cache as you go" strategy: every successful same-origin GET response is
// stored as a side effect, so after a single normal (online) visit, the
// exact files that visit actually used -- including whatever the current
// hashed bundle is -- are cached for next time. A visit that's offline
// before ever loading the app once has nothing to fall back to; that's
// expected and out of scope here.
//
// Bump CACHE_NAME whenever this file's caching behavior changes, so old
// caches from a previous version get cleaned up on activate.
const CACHE_NAME = 'easyfen-shell-v1';
const PRECACHE_URLS = ['/', '/manifest.json', '/favicon.ico'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => {
        // A single failed precache request (e.g. offline install, which
        // shouldn't normally happen) must not block activation entirely.
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Only the app shell is this service worker's job. Supabase API/storage
  // calls (and anything else cross-origin) pass straight through untouched
  // -- caching those would mean serving stale listings/messages, which is
  // worse than the network error the app already handles.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok) {
          const responseCopy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseCopy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        // Offline deep link to a route that was never individually cached
        // (this is a client-rendered single-page app) -- fall back to the
        // cached shell rather than a browser error page.
        if (request.mode === 'navigate') {
          const shell = await caches.match('/');
          if (shell) return shell;
        }
        return Response.error();
      })
  );
});
