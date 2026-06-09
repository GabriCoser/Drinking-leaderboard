// Service worker minimale: serve per l'installabilità PWA.
// Network-first, nessuna cache dei dati (l'app è live per natura).
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {})
