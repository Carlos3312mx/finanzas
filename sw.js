const CACHE_NAME = "finance-planner-cache-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./storage.js",
  "./engine.js",
  "./app.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "https://cdn.jsdelivr.net/npm/chart.js"
];

// Instalar Service Worker y almacenar recursos en caché
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Almacenando recursos del Dashboard en caché");
      return cache.addAll(ASSETS);
    })
  );
});

// Activar Service Worker y limpiar cachés antiguas
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[Service Worker] Limpiando caché antigua:", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
});

// Estrategia Cache-First con actualización de red
self.addEventListener("fetch", (e) => {
  // Evitar interceptar peticiones a la API de OpenAI
  if (e.request.url.includes("api.openai.com")) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Devolver la caché inmediatamente y actualizar en segundo plano
        fetch(e.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, networkResponse));
          }
        }).catch((err) => console.log("[Service Worker] Omitiendo actualización de red (Offline)"));
        return cachedResponse;
      }
      return fetch(e.request);
    })
  );
});
