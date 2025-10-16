const CACHE_NAME = 'caltracker-v3';
const urlsToCache = [
  './',
  './index.html',
  './app-clean.js',
  './database.js',
  './config.js',
  './manifest.json',
  './404.html'
];

// Installation du service worker
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installation');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Cache ouvert');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.log('Service Worker: Erreur installation', error);
      })
  );
  // Force l'activation immédiate
  self.skipWaiting();
});

// Activation du service worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activation');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Suppression ancien cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Prendre le contrôle immédiatement
      return self.clients.claim();
    })
  );
});

// Interception des requêtes - SOLUTION ROBUSTE POUR IPHONE
self.addEventListener('fetch', (event) => {
  // Ignorer les requêtes non-GET et les requêtes externes
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Si trouvé dans le cache, retourner
        if (response) {
          console.log('Service Worker: Cache hit', event.request.url);
          return response;
        }
        
        // Sinon, faire la requête réseau
        return fetch(event.request)
          .then((response) => {
            // Vérifier si la réponse est valide
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Cloner la réponse pour la mettre en cache
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch((error) => {
            console.log('Service Worker: Erreur réseau', event.request.url, error);
            
            // SOLUTION CRITIQUE POUR IPHONE : Fallback vers index.html
            if (event.request.destination === 'document') {
              console.log('Service Worker: Fallback vers index.html');
              return caches.match('./index.html');
            }
            
            // Pour les autres ressources, essayer de les trouver dans le cache
            return caches.match(event.request);
          });
      })
      .catch((error) => {
        console.log('Service Worker: Erreur générale', error);
        // Dernier recours : index.html
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
        return new Response('Erreur de chargement', { status: 404 });
      })
  );
});

// Gestion des messages (pour debug)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});