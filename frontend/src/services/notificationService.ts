export interface NotificationSubscription {
    endpoint: string;
    expirationTime: number | null;
    keys: {
        p256dh: string;
        auth: string;
    };
}

export const notificationService = {
    /**
     * Check if the browser supports service workers and push notifications
     */
    isSupported(): boolean {
        return 'serviceWorker' in navigator && 'PushManager' in window;
    },

    /**
     * Register the service worker
     */
    async registerServiceWorker(): Promise<ServiceWorkerRegistration> {
        if (!('serviceWorker' in navigator)) {
            throw new Error('Service Workers are not supported in this browser');
        }

        try {
            const registration = await navigator.serviceWorker.register('/service-worker.js', {
                scope: '/'
            });
            
            // Wait for the service worker to become active
            if (registration.installing) {
                await new Promise(resolve => {
                    registration.installing?.addEventListener('statechange', function() {
                        if (this.state === 'activated') {
                            resolve(null);
                        }
                    });
                });
            }
            
            return registration;
        } catch (error) {
            console.error('Service Worker registration failed:', error);
            throw error;
        }
    },

    /**
     * Get the VAPID public key from the backend
     */
    async getVapidPublicKey(): Promise<string> {
        const response = await fetch('/api/v1/notifications/public-key');
        if (!response.ok) {
            throw new Error('Failed to get VAPID public key');
        }
        const data = await response.json();
        return data.vapid_public_key;
    },

    /**
     * Request notification permission from the user
     */
    async requestNotificationPermission(): Promise<NotificationPermission> {
        if ('Notification' in window) {
            if (Notification.permission === 'granted') {
                return 'granted';
            }

            if (Notification.permission !== 'denied') {
                const permission = await Notification.requestPermission();
                return permission;
            }
        }
        return Notification.permission || 'denied';
    },

    /**
     * Subscribe to push notifications
     */
    async subscribeToPushNotifications(): Promise<PushSubscription> {
        try {
            // Ensure service worker is registered
            let registration = null;
            
            if ('serviceWorker' in navigator) {
                const existingRegistration = await navigator.serviceWorker.getRegistration('/');
                if (existingRegistration) {
                    registration = existingRegistration;
                } else {
                    registration = await this.registerServiceWorker();
                }
            }

            if (!registration) {
                throw new Error('Failed to get or register service worker');
            }

            // Get the active service worker (with timeout)
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('Service worker ready timeout after 10s')), 10000);
            });
            
            try {
                await Promise.race([navigator.serviceWorker.ready, timeoutPromise]);
            } catch (error) {
                console.warn('Service worker ready warning:', error);
                // Proceed anyway as registration might still work
            }

            // Get the VAPID public key
            const vapidPublicKey = await this.getVapidPublicKey();

            // Subscribe to push notifications
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey)
            });

            // Send subscription to backend
            await this.sendSubscriptionToBackend(subscription);

            return subscription;
        } catch (error) {
            console.error('Error in subscribeToPushNotifications:', error)
            throw error
        }
    },

    /**
     * Unsubscribe from push notifications
     */
    async unsubscribeFromPushNotifications(): Promise<void> {
        try {
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.ready;
                const subscription = await registration.pushManager.getSubscription();

                if (subscription) {
                    // Notify backend
                    await this.sendUnsubscriptionToBackend(subscription);
                    // Unsubscribe locally
                    await subscription.unsubscribe();
                }
            }
        } catch (error) {
            console.error('Failed to unsubscribe from push notifications:', error);
            throw error;
        }
    },

    /**
     * Check if the user is already subscribed to push notifications
     */
    async isSubscribed(): Promise<boolean> {
        try {
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.ready;
                const subscription = await registration.pushManager.getSubscription();
                return subscription !== null;
            }
            return false;
        } catch (error) {
            console.error('Failed to check subscription status:', error);
            return false;
        }
    },

    /**
     * Send subscription to the backend
     */
    async sendSubscriptionToBackend(subscription: PushSubscription): Promise<void> {
        try {
            const body = JSON.stringify({
                endpoint: subscription.endpoint,
                keys: {
                    p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh') as ArrayBuffer | null),
                    auth: this.arrayBufferToBase64(subscription.getKey('auth') as ArrayBuffer | null)
                }
            })

            const response = await fetch('/api/v1/notifications/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: body
            });

            const responseData = await response.json()

            if (!response.ok) {
                throw new Error(`Failed to subscribe: ${response.status} - ${JSON.stringify(responseData)}`);
            }
        } catch (error) {
            console.error('Error in sendSubscriptionToBackend:', error)
            throw error
        }
    },

    /**
     * Send unsubscription to the backend
     */
    async sendUnsubscriptionToBackend(subscription: PushSubscription): Promise<void> {
        const response = await fetch('/api/v1/notifications/unsubscribe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                endpoint: subscription.endpoint
            })
        });

        if (!response.ok) {
            throw new Error('Failed to send unsubscription to backend');
        }
    },

    /**
     * Convert VAPID key from Base64 to Uint8Array
     */
    urlBase64ToUint8Array(base64String: string): BufferSource {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }

        return outputArray as BufferSource;
    },

    /**
     * Convert ArrayBuffer to Base64
     */
    arrayBufferToBase64(buffer: ArrayBuffer | null): string {
        if (!buffer) return '';
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]!);
        }
        return window.btoa(binary);
    },

    /**
     * Check if user is logged in
     */
    async isUserLoggedIn(): Promise<boolean> {
        try {
            const meResponse = await fetch('/api/v1/profile/me', {
                credentials: 'include'
            });
            return meResponse.ok;
        } catch (error) {
            return false;
        }
    },

    /**
     * Initialize push notifications (without requesting permission)
     * Should be called after app loads to check if user is logged in
     * and auto-subscribe if already granted
     */
    async initializeIfLoggedIn(): Promise<void> {
        try {
            // Check if user is logged in
            const isLoggedIn = await this.isUserLoggedIn();

            if (!isLoggedIn) {
                return;
            }

            // User is logged in
            if (!this.isSupported()) {
                console.log('Push notifications are not supported in this browser');
                return;
            }

            // If permission already granted, auto-subscribe
            if (Notification.permission === 'granted') {
                const isAlreadySubscribed = await this.isSubscribed();
                if (!isAlreadySubscribed) {
                    try {
                        await this.subscribeToPushNotifications();
                        console.log('Successfully subscribed to push notifications');
                    } catch (error) {
                        console.error('Failed to auto-subscribe:', error);
                    }
                }
            }
            // If permission denied, don't ask again
            // If permission not determined, wait for user interaction
        } catch (error) {
            console.error('Error initializing push notifications:', error);
        }
    }
};
