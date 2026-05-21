// Service Worker - Web Push 알림 처리

self.addEventListener('push', function (event) {
  let data = { title: '알림', body: '새 알림이 있습니다.' };
  try {
    data = event.data.json();
  } catch (e) {
    data.body = event.data ? event.data.text() : '새 알림이 있습니다.';
  }

  const options = {
    body: data.body,
    icon: '/logo192.png',
    badge: '/favicon.ico',
    vibrate: [200, 100, 200],
    tag: 'emp-push',
    renotify: true,
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});
