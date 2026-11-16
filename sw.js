// Sube el numero de VERSION cada vez que cambies la logica del service worker.
// Estrategia: red primero (siempre la version mas nueva) y, si no hay conexion
// o tarda mas de 4 s, se usa la copia guardada en el movil.
const VERSION = 'turnos-v9';
const ESPERA_MS = 4000;
const SHELL = [
  './',
  'index.html',
  'styles.css',
  'app.js',
  'manifest.webmanifest',
  'data/cuadrante.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => Promise.all(SHELL.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function conLimite(promesa, ms) {
  return new Promise((ok, ko) => {
    const t = setTimeout(() => ko(new Error('tiempo')), ms);
    promesa.then((r) => { clearTimeout(t); ok(r); }, (e) => { clearTimeout(t); ko(e); });
  });
}

async function redPrimero(req) {
  const cache = await caches.open(VERSION);
  try {
    const res = await conLimite(fetch(req.url, { cache: 'no-cache' }), ESPERA_MS);
    if (res.ok) cache.put(req.url, res.clone());
    return res;
  } catch (err) {
    const copia = await cache.match(req.url, { ignoreSearch: true });
    if (copia) return copia;
    if (req.mode === 'navigate') {
      const inicio = (await cache.match('./')) || (await cache.match('index.html'));
      if (inicio) return inicio;
    }
    throw err;
  }
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== location.origin) return;
  e.respondWith(redPrimero(req));
});
