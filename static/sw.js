self.addEventListener('install', (e) => {
    console.log('[Service Worker] Install');
});

self.addEventListener('fetch', (e) => {
    // Basic fetch handler, needed for PWA installability criteria
    e.respondWith(fetch(e.request));
});
