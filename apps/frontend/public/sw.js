// Minimal service worker to enable PWA install prompt
// Network-first strategy — the app works fine without caching
self.addEventListener('fetch', () => {});
