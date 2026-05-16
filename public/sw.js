const CACHE = "kafe-v1";

// Çevrimdışı çalışırken gösterilecek temel sayfalar
const STATIK_DOSYALAR = [
  "/",
  "/index.html",
  "/manifest.json"
];

// Service Worker kurulduğunda temel dosyaları önbelleğe al
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(STATIK_DOSYALAR))
  );
});

// İstek gelince önce önbelleğe bak, yoksa internetten çek
self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request).then(response => {
        // Gelen cevabı önbelleğe kaydet
        return caches.open(CACHE).then(cache => {
          cache.put(e.request, response.clone());
          return response;
        });
      }).catch(() => cached); // İnternet yoksa önbellekten yükle
    })
  );
});