/* eslint-disable no-undef */
// CACHING SETUP
const CACHE_NAME = 'lastbench-cache-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/assets/Genfess.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Give the service worker access to Firebase Messaging.
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// https://firebase.google.com/docs/web/setup#config-object
const firebaseConfig = {
    apiKey: "AIzaSyAFmoY4HpFzJHzmxloSQmkH2H2d9zWkkD0",
    authDomain: "genfess-ac0e8.firebaseapp.com",
    projectId: "genfess-ac0e8",
    storageBucket: "genfess-ac0e8.firebasestorage.app",
    messagingSenderId: "731705712640",
    appId: "1:731705712640:web:18156bdd611204191bb8e5",
    measurementId: "G-ZJCMC4NYHE"
};

firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    // Customize notification here
    const notificationTitle = payload.data.title || payload.notification.title || 'LastBench';
    const notificationOptions = {
        body: payload.data.body || payload.notification.body,
        icon: payload.data.icon || '/favicon.svg', // Icon path
        data: payload.data // Pass data for click handler
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle Notification Click
self.addEventListener('notificationclick', function (event) {
    console.log('[firebase-messaging-sw.js] Notification click Received.', event);

    event.notification.close();

    const data = event.notification.data;
    let url = '/';

    // Determine URL based on data
    if (data?.postId) {
        url = `/post/${data.postId}`;
        if (data.commentId) url += `?commentId=${data.commentId}`;
    } else if (data?.url) {
        url = data.url;
    }

    // Focus existing window or open new one
    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then(function (clientList) {
            // Check if there's already a tab open
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url.includes(self.registration.scope) && 'focus' in client) {
                    // If we want to navigate within the focused tab, we can do client.navigate(url)
                    if (url !== '/') {
                        client.navigate(url);
                    }
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});
