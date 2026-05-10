/* ═══════════════════════════════════════
   مدارك النخبة — Service Worker v1
   كاش ذكي + عمل بدون نت
═══════════════════════════════════════ */

var CACHE_NAME = 'madarek-v1';
var OFFLINE_URL = '/index.html';

// الملفات الأساسية اللي نخزّنها أول ما التطبيق ينزل
var PRECACHE = [
  '/',
  '/index.html',
  '/login.html',
  '/register.html',
  '/dashboard.html',
  '/select-section.html',
  '/pricing.html',
  '/contact.html',
  '/favicon.svg',
  '/manifest.json'
];

// ─── التثبيت: تخزين الملفات الأساسية ───
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(PRECACHE);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// ─── التفعيل: حذف الكاش القديم ───
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(name) {
          return name !== CACHE_NAME;
        }).map(function(name) {
          return caches.delete(name);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// ─── جلب الطلبات: الشبكة أولاً، لو فشل نرجع للكاش ───
self.addEventListener('fetch', function(event) {
  var request = event.request;

  // تجاهل طلبات غير GET وطلبات API
  if (request.method !== 'GET') return;
  if (request.url.indexOf('supabase.co') !== -1) return;
  if (request.url.indexOf('googleapis.com') !== -1) return;
  if (request.url.indexOf('googletagmanager.com') !== -1) return;
  if (request.url.indexOf('chrome-extension') !== -1) return;

  event.respondWith(
    fetch(request).then(function(response) {
      // لو الطلب ناجح — نحدّث الكاش ونرجع الرد
      if (response && response.status === 200) {
        var responseClone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(request, responseClone);
        });
      }
      return response;
    }).catch(function() {
      // لو الشبكة فشلت — نرجع من الكاش
      return caches.match(request).then(function(cached) {
        return cached || caches.match(OFFLINE_URL);
      });
    })
  );
});

// ─── إشعارات Push ───
self.addEventListener('push', function(event) {
  var data = {};
  try { data = event.data.json(); } catch(e) { data = { title: 'مدارك النخبة', body: event.data ? event.data.text() : 'عندك إشعار جديد!' }; }

  var options = {
    body: data.body || '',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    dir: 'rtl',
    lang: 'ar',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' },
    actions: data.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'مدارك النخبة', options)
  );
});

// ─── الضغط على الإشعار ───
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // لو التطبيق مفتوح — نركّز عليه
      for (var i = 0; i < clientList.length; i++) {
        if (clientList[i].url.indexOf(self.location.origin) !== -1) {
          clientList[i].navigate(url);
          return clientList[i].focus();
        }
      }
      // لو مو مفتوح — نفتح نافذة جديدة
      return clients.openWindow(url);
    })
  );
});
