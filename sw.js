const CACHE_NAME = 'caltracker-v5';
// Détermine automatiquement le sous-chemin (ex: /user/CalTracker/ sur GitHub Pages)
const BASE_PATH = (() => {
  try {
    const swScope = new URL(self.registration.scope);
    // Le scope se termine par un slash et pointe vers le dossier du site
    return swScope.pathname.endsWith('/') ? swScope.pathname : swScope.pathname + '/';
  } catch {
    return '/';
  }
})();

// Liste des fichiers à mettre en cache.
// Tous les chemins sont préfixés par BASE_PATH.
const urlsToCache = [
  `${BASE_PATH}`,
  `${BASE_PATH}index.html`,
  `${BASE_PATH}app-clean.js`,
  `${BASE_PATH}database.js`,
  `${BASE_PATH}config.js`,
  `${BASE_PATH}manifest.json`,
  `${BASE_PATH}404.html`,
  `${BASE_PATH}icon.jpg`
];

// Installation du service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  // Activation immédiate
  self.skipWaiting();
});

// Activation du service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// Interception des requêtes
self.addEventListener('fetch', (event) => {
  // Ignorer les requêtes non-GET ou externes
  if (event.request.method !== 'GET' ||
      !event.request.url.startsWith(self.location.origin)) {
    return;
  }
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      // Si pas dans le cache, faire la requête réseau
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      }).catch(() => {
        // Fallback vers la page principale en cas d’erreur réseau
        if (event.request.destination === 'document') {
          return caches.match(`${BASE_PATH}index.html`);
        }
        // Sinon, chercher dans le cache
        return caches.match(event.request);
      });
    }).catch(() => {
      // Dernier recours : page principale ou message d’erreur
      if (event.request.destination === 'document') {
        return caches.match(`${BASE_PATH}index.html`);
      }
      return new Response('Erreur de chargement', { status: 404 });
    })
  );
});

// Gestion de messages (facultatif)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
