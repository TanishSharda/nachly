const CACHE_VERSION = "naachly-v8";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const MAX_DYNAMIC_ITEMS = 50;

// Critical assets to pre-cache during install
const PRECACHE_URLS = [
  "/manifest.json",
  "/brand-logo.svg",
];

// Install — pre-cache shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== DYNAMIC_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Trim dynamic cache to prevent storage bloat
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
    return trimCache(cacheName, maxItems);
  }
}

// Fetch strategies
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, external, and chrome-extension requests
  if (
    request.method !== "GET" ||
    url.origin !== location.origin ||
    url.protocol === "chrome-extension:"
  ) {
    return;
  }

  // Always fetch latest Next.js build assets to avoid hydration mismatches.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(fetch(request));
    return;
  }

  // Keep PWA metadata/icons fresh so home-screen icon updates are picked up.
  if (url.pathname === "/manifest.json" || url.pathname.startsWith("/icons/") || url.pathname === "/brand-logo.svg") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Strategy 1: Cache-first for non-Next static assets (images, fonts, custom JS/CSS)
  // But skip video files since they use HTTP range requests (206 responses) which Cache API doesn't support
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|webp|avif|woff2?)$/)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  // Strategy 1b: Network-first for video files (they use range requests / 206 responses)
  if (url.pathname.match(/\.(mp4|webm)$/)) {
    event.respondWith(
      fetch(request).catch(() => {
        // If offline, no cached video available - that's okay for streaming
        return new Response("Video unavailable offline", { status: 503 });
      })
    );
    return;
  }

  // Strategy 2: Network-first for pages to avoid stale HTML/theme flashes
  if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, clone);
              trimCache(DYNAMIC_CACHE, MAX_DYNAMIC_ITEMS);
            });
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || caches.match("/");
        })
    );
    return;
  }

  // Strategy 3: Network-first for API/data requests
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
