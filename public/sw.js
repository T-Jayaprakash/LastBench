// Genfess Service Worker for PWA support
// Version: 2.0.0 - Enhanced for iOS PWA compatibility

const CACHE_NAME = 'genfess-v2';
const STATIC_CACHE = 'genfess-static-v2';
const DYNAMIC_CACHE = 'genfess-dynamic-v2';

// Static assets to cache on install
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/assets/Genfess.png',
    '/assets/icon.png',
    '/assets/splash.png',
    '/manifest.json'
];

// API routes that should always be network-first
const API_ROUTES = [
    '/api/',
    'firestore.googleapis.com',
    'firebase',
    'googleapis.com'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker v2...');
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('[SW] Pre-caching static assets');
                return cache.addAll(STATIC_ASSETS.map(url => {
                    return new Request(url, { cache: 'reload' });
                })).catch(err => {
                    console.log('[SW] Pre-cache failed for some assets:', err);
                    // Continue even if some assets fail to cache
                    return Promise.resolve();
                });
            })
    );
    // Force activation without waiting for existing pages to close
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker v2...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Delete old cache versions
                    if (!cacheName.includes('-v2')) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    // Take control of all pages immediately
    self.clients.claim();
});

// Helper: Check if request is for an API route
function isApiRequest(url) {
    return API_ROUTES.some(route => url.includes(route));
}

// Helper: Check if request is for a static asset
function isStaticAsset(url) {
    return url.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ico)$/i);
}

// Fetch event - network-first for API, cache-first for static assets
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = request.url;

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip cross-origin requests except for CDN assets
    if (!url.startsWith(self.location.origin) && !url.includes('gstatic.com')) {
        return;
    }

    // API requests: Network first, fallback to offline response
    if (isApiRequest(url)) {
        event.respondWith(
            fetch(request)
                .catch(() => {
                    return new Response(
                        JSON.stringify({ error: 'offline', message: 'You are offline' }),
                        {
                            headers: { 'Content-Type': 'application/json' },
                            status: 503
                        }
                    );
                })
        );
        return;
    }

    // Static assets: Cache first, then network
    if (isStaticAsset(url)) {
        event.respondWith(
            caches.match(request)
                .then((cachedResponse) => {
                    if (cachedResponse) {
                        // Return cached version, but update cache in background
                        fetch(request).then((networkResponse) => {
                            if (networkResponse.ok) {
                                caches.open(STATIC_CACHE).then((cache) => {
                                    cache.put(request, networkResponse);
                                });
                            }
                        }).catch(() => { });
                        return cachedResponse;
                    }
                    // Not in cache, fetch from network
                    return fetch(request).then((networkResponse) => {
                        if (networkResponse.ok) {
                            const responseToCache = networkResponse.clone();
                            caches.open(STATIC_CACHE).then((cache) => {
                                cache.put(request, responseToCache);
                            });
                        }
                        return networkResponse;
                    });
                })
                .catch(() => {
                    // Return offline placeholder for images
                    if (url.match(/\.(png|jpg|jpeg|gif|svg)$/i)) {
                        return caches.match('/assets/Genfess.png');
                    }
                    return caches.match('/');
                })
        );
        return;
    }

    // HTML pages: Network first with cache fallback
    event.respondWith(
        fetch(request)
            .then((networkResponse) => {
                // Cache the page for offline access
                if (networkResponse.ok) {
                    const responseToCache = networkResponse.clone();
                    caches.open(DYNAMIC_CACHE).then((cache) => {
                        cache.put(request, responseToCache);
                    });
                }
                return networkResponse;
            })
            .catch(() => {
                // Check cache first
                return caches.match(request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    // Return the main page for SPA routing
                    return caches.match('/');
                });
            })
    );
});

// Handle push notifications
self.addEventListener('push', (event) => {
    console.log('[SW] Push notification received');

    let data = {};
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data = {
                title: 'Genfess',
                body: event.data.text()
            };
        }
    }

    const title = data.title || 'Genfess';
    const options = {
        body: data.body || 'New notification',
        icon: '/assets/Genfess.png',
        badge: '/assets/Genfess.png',
        image: data.image || undefined,
        vibrate: [100, 50, 100],
        tag: data.tag || 'genfess-notification',
        renotify: true,
        requireInteraction: data.requireInteraction || false,
        data: {
            url: data.url || '/',
            postId: data.postId,
            commentId: data.commentId,
            dateOfArrival: Date.now(),
            primaryKey: data.id || Date.now()
        },
        actions: data.actions || [
            { action: 'open', title: 'Open' },
            { action: 'dismiss', title: 'Dismiss' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event.action);
    event.notification.close();

    if (event.action === 'dismiss') {
        return;
    }

    const notificationData = event.notification.data || {};
    let targetUrl = notificationData.url || '/';

    // Build deep link URL
    if (notificationData.postId) {
        targetUrl = `/post/${notificationData.postId}`;
        if (notificationData.commentId) {
            targetUrl += `?commentId=${notificationData.commentId}`;
        }
    }

    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then((clientList) => {
            // Check if there's already a window/tab open
            for (const client of clientList) {
                if (client.url.includes(self.registration.scope) && 'focus' in client) {
                    // Navigate to the target URL and focus
                    if (targetUrl !== '/') {
                        client.navigate(targetUrl);
                    }
                    return client.focus();
                }
            }
            // Open a new window if none exists
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
    console.log('[SW] Notification closed');
});

// Background sync for offline posts
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync:', event.tag);

    if (event.tag === 'sync-posts') {
        event.waitUntil(syncPendingPosts());
    }
});

// Function to sync pending posts when online
async function syncPendingPosts() {
    try {
        const cache = await caches.open('genfess-pending');
        const requests = await cache.keys();

        for (const request of requests) {
            try {
                const response = await cache.match(request);
                const data = await response.json();

                // Send to server
                await fetch('/api/posts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                // Remove from pending cache
                await cache.delete(request);
            } catch (error) {
                console.error('[SW] Failed to sync post:', error);
            }
        }
    } catch (error) {
        console.error('[SW] Sync failed:', error);
    }
}

// Periodic background sync for app updates
self.addEventListener('periodicsync', (event) => {
    console.log('[SW] Periodic sync:', event.tag);

    if (event.tag === 'check-updates') {
        event.waitUntil(checkForUpdates());
    }
});

async function checkForUpdates() {
    try {
        const response = await fetch('/version.json', { cache: 'no-store' });
        const data = await response.json();

        // Notify clients about available update
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'UPDATE_AVAILABLE',
                version: data.version
            });
        });
    } catch (error) {
        console.error('[SW] Update check failed:', error);
    }
}

// Handle messages from clients
self.addEventListener('message', (event) => {
    console.log('[SW] Message received:', event.data);

    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: 'v2' });
    }
});

console.log('[SW] Service worker loaded - v2');
