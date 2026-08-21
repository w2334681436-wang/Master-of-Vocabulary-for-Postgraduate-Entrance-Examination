const CACHE = "cizhan-static-v4";
const CORE = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./data/words.js",
  "./data/adventure.js",
  "./data/adventure-world-parts/arc-01.js",
  "./data/adventure-world-parts/arc-02.js",
  "./data/adventure-world-parts/arc-03.js",
  "./data/adventure-world-parts/arc-04.js",
  "./data/adventure-world-parts/arc-05.js",
  "./data/adventure-world-parts/arc-06.js",
  "./data/adventure-world-parts/arc-07.js",
  "./data/adventure-world-parts/arc-08.js",
  "./data/adventure-world-parts/arc-09.js",
  "./data/adventure-world-parts/arc-10.js",
  "./data/adventure-world-parts/arc-11.js",
  "./data/adventure-world-parts/arc-12.js",
  "./data/adventure-world.js",
  "./manifest.webmanifest",
  "./icons/icon-64.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match("./index.html")),
    );
    return;
  }
  if (requestUrl.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          }
          return response;
        }),
    ),
  );
});
