self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body || '',
            icon: data.icon || '/favicon.ico',
            badge: data.badge || '/favicon.ico',
            tag: data.tag || 'notification',
            data: data.data || {}
        };

        event.waitUntil(
            self.registration.showNotification(data.title || 'Notification', options)
        );
    }
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    // You can open a URL or perform other actions here
    const data = event.notification.data;
    if (data && data.workshop_id) {
        event.waitUntil(
            clients.matchAll({ type: 'window' }).then((clientList) => {
                for (let client of clientList) {
                    if (client.url.includes('/') && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow('/');
                }
            })
        );
    }
});

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

