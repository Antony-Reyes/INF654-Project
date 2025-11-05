// Service Worker for Game Reminders PWA with Firebase & IndexedDB Support
const CACHE_NAME = 'game-reminders-v3'; // Updated version for Firebase integration
const urlsToCache = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/css/reset.css',
  '/images/logo.png',
  '/images/icons/icon-48x48.png',
  '/images/icons/icon-72x72.png',
  '/images/icons/icon-96x96.png',
  '/images/icons/icon-144x144.png',
  '/images/icons/icon-192x192.png',
  '/images/icons/icon-512x512.png',
  '/manifest.json',
  // Add JavaScript files for Firebase and IndexedDB
  '/js/app.js',
  '/js/firebase-config.js',
  '/js/indexeddb.js',
  '/js/reminders.js',
  '/js/sync.js',
  '/js/ui.js',
  '/data/games.json'
];

// Install Event - Cache all essential resources
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell and content');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[Service Worker] ✅ All files cached successfully!');
      })
      .catch((error) => {
        console.error('[Service Worker] ❌ Caching failed:', error);
        // Log which file failed
        urlsToCache.forEach(url => {
          fetch(url).catch(err => console.error('Failed to fetch:', url));
        });
      })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Claim clients immediately
  return self.clients.claim();
});

// Fetch Event - Serve cached content when offline, handle Firebase requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Don't cache Firebase API requests - let them fail/succeed naturally
  if (url.hostname.includes('firebaseio.com') || 
      url.hostname.includes('firestore.googleapis.com') ||
      url.hostname.includes('googleapis.com')) {
    console.log('[Service Worker] 🔥 Firebase request - bypassing cache:', event.request.url);
    event.respondWith(fetch(event.request));
    return;
  }

  // Handle all other requests with cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return the cached response
        if (response) {
          console.log('[Service Worker] ✅ Serving from cache:', event.request.url);
          return response;
        }
        
        // Not in cache - fetch from network
        console.log('[Service Worker] 🌐 Fetching from network:', event.request.url);
        return fetch(event.request)
          .then((networkResponse) => {
            // Check if valid response
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            
            // Clone the response
            const responseToCache = networkResponse.clone();
            
            // Add to cache for future use (dynamic caching)
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
                console.log('[Service Worker] 📦 Cached new resource:', event.request.url);
              });
            
            return networkResponse;
          })
          .catch((error) => {
            console.error('[Service Worker] ❌ Fetch failed (you are offline):', error);
            // Return a simple offline message for failed fetches
            return new Response(
              '<html><body><h1>Offline</h1><p>You are currently offline and this resource is not cached.</p></body></html>',
              { headers: { 'Content-Type': 'text/html' } }
            );
          });
      })
  );
});

// Listen for messages from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Handle sync trigger from the app
  if (event.data && event.data.type === 'SYNC_DATA') {
    console.log('[Service Worker] 📤 Sync request received');
    // Notify the app that sync should begin
    event.ports[0].postMessage({ type: 'SYNC_STARTED' });
  }
});

// Background Sync - Sync offline data when connection is restored
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] 🔄 Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-reminders') {
    event.waitUntil(
      // Notify all clients to perform sync
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'PERFORM_SYNC',
            message: 'Connection restored - syncing data with Firebase'
          });
        });
      })
    );
  }
});

// Handle push notifications (for future reminder notifications)
self.addEventListener('push', (event) => {
  console.log('[Service Worker] 🔔 Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'Game Reminder Notification',
    icon: '/images/icons/icon-192x192.png',
    badge: '/images/icons/icon-96x96.png',
    vibrate: [200, 100, 200],
    tag: 'game-reminder',
    requireInteraction: false
  };
  
  event.waitUntil(
    self.registration.showNotification('Game Reminders', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] 👆 Notification clicked');
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if available
        for (const client of clientList) {
          if (client.url.includes(self.registration.scope) && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open new window
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});