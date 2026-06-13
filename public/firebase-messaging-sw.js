/* OshiHub Service Worker
 * - FCM（Web Push）のバックグラウンド受信
 * - PWA: 画面（HTML）のオフラインフォールバック
 * ※ Service Worker は import.meta.env を読めないため firebaseConfig は公開値を直書き。
 */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyDTL62Ei1kZKytGR-o5Z52EIDIl2sgTVT4',
  authDomain: 'oshilink-b8fab.firebaseapp.com',
  projectId: 'oshilink-b8fab',
  storageBucket: 'oshilink-b8fab.firebasestorage.app',
  messagingSenderId: '779073398413',
  appId: '1:779073398413:web:62d5ed2f5e1d6edb92e4c4',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || 'OshiHub'
  const options = {
    body: (payload.notification && payload.notification.body) || '',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    data: payload.data || {},
  }
  self.registration.showNotification(title, options)
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((wins) => {
      for (const w of wins) {
        if ('focus' in w) return w.focus()
      }
      return clients.openWindow(url)
    })
  )
})

// ---- PWA シェルキャッシュ ----
const CACHE = 'oshihub-shell-v2'
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.add('/index.html')))
  self.skipWaiting()
})
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put('/index.html', copy))
          return res
        })
        .catch(() => caches.match('/index.html'))
    )
  }
})
