const CACHE_NAME = 'gestnotes-v3'; // On passe à v3 pour forcer la mise à jour !

// Liste des fichiers indispensables pour le fonctionnement 100% hors-ligne
const ASSETS = [
  '/',
  '/index.html',
  '/bulletin.html',
  '/accueil.html',
  '/tailwind.min.js',
  '/fontawesome.min.css',
  '/html2pdf.bundle.min.js',
  '/idb-keyval.js', // <-- Ajout obligatoire pour la base de données !
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// 1. Installation : Création du cache et mise en mémoire des ressources
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
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
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(e.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        console.error('[Service Worker] Réseau indisponible et ressource non cachée :', e.request.url);
      });
    })
  );
});
