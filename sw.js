"use strict";

const prefix = "light-atlas-";
const version = prefix + "2";
const appFiles = [
  "./index.html", "./style.css?v=2", "./levels.js?v=2", "./optics.js?v=2", "./game.js?v=2",
  "./manifest.webmanifest", "./art/observatory.webp", "./art/icon-192.png", "./art/icon-512.png", "./art/exo-2.ttf",
];
const cachedUrls = new Set(appFiles.map((file) => new URL(file, self.registration.scope).href));

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(version);
    await cache.addAll(appFiles);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(prefix) && key !== version).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || !request.url.startsWith(self.registration.scope)) return;
  if (request.mode === "navigate") {
    const url = new URL(request.url);
    const scope = new URL(self.registration.scope);
    if (![scope.pathname, scope.pathname + "index.html"].includes(url.pathname)) return;
    event.respondWith((async () => {
      try {
        return await fetch(request);
      } catch {
        const cache = await caches.open(version);
        return await cache.match(new URL("./index.html", self.registration.scope)) || Response.error();
      }
    })());
  } else if (cachedUrls.has(request.url)) {
    event.respondWith((async () => {
      const cache = await caches.open(version);
      return await cache.match(request) || await fetch(request);
    })());
  }
});
