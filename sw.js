const CACHE_NAME = 'gestnotes-v2'; // Passez de v1 à v2

// Liste des fichiers indispensables pour le fonctionnement 100% hors-ligne
const ASSETS = [
  '/',
  '/index.html',
  '/bulletin.html',
  '/accueil.html', // Ajout de l'accueil au cache
  './tailwind.min.js',
  './fontawesome.min.css',
  './html2pdf.bundle.min.js',
  '/manifest.json',
  './icon-192.png', // Vos icônes locales
  './icon-512.png'
];

// 1. Installation : Création du cache et mise en mémoire des ressources
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // On utilise add() un par un pour ne pas tout bloquer en cas d'erreur sur une ressource
        const promises = ASSETS.map(url => 
            cache.add(url).catch(err => console.warn('[SW] Ressource non mise en cache :', url))
        );
        return Promise.all(promises);
      })
      .then(() => self.skipWaiting()) 
  );
});

// 2. Activation : Nettoyage automatique des anciens caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Suppression de l\'ancien cache :', key);
            // Suppression de l'ancien stockage pour libérer l'espace de l'appareil
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim()) 
  );
});

// 3. Stratégie "Cache First, avec fallback Réseau et mise en cache dynamique"
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      // 1. Si le fichier est dans le cache, on le sert instantanément
      if (cachedResponse) {
        return cachedResponse;
      }

      // 2. Sinon, on va le chercher sur le réseau
      return fetch(e.request).then((networkResponse) => {
        // Si la réponse est valide, on l'ajoute dynamiquement au cache (ex: pour le CDN Tailwind)
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        console.error('[Service Worker] Réseau indisponible et ressource non cachée :', e.request.url);
        // Optionnel : retourner une page d'erreur 404 hors-ligne ici si nécessaire
      });
    })
  );
});
