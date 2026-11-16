// Sube el numero de VERSION cada vez que cambies HTML, CSS o JS.
// El archivo data/cuadrante.json NO depende de esto: siempre se pide primero al servidor.
const VERSION = 'turnos-v2';
const SHELL = [
  './',
  'index.html',
  'styles.css',
  'app.js',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Datos: red primero, cache solo si no hay conexion
  if (url.pathname.includes('/data/')) {
    e.respondWith(
      fetch(req, { cache: 'no-store' })
        .then((res) => {
          const copia = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copia));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Resto: cache primero y se refresca en segundo plano
  e.respondWith(
    caches.match(req).then((enCache) => {
      const red = fetch(req)
        .then((res) => {
          const copia = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copia));
          return res;
        })
        .catch(() => enCache);
      return enCache || red;
    })
  );
});
