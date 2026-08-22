"use client"

import { useEffect } from 'react';
import { isDemoMode } from '@/lib/demo/config';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    if (isDemoMode) {
      // Remove legacy workers that cached old Vercel deployments and could keep
      // delivering push notifications after the app switched to Demo Mode.
      void navigator.serviceWorker.getRegistrations().then(async (registrations) => {
        await Promise.all(registrations.map(async (registration) => {
          const notifications = await registration.getNotifications().catch(() => []);
          notifications.forEach(notification => notification.close());
          const subscription = await registration.pushManager?.getSubscription().catch(() => null);
          await subscription?.unsubscribe().catch(() => false);
          await registration.unregister();
        }));

        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames
              .filter(name => name.startsWith('projtrack-'))
              .map(name => caches.delete(name))
          );
        }
      }).catch(error => console.warn('Unable to clean up legacy notifications:', error));
      return;
    }

    navigator.serviceWorker
      .register('/firebase-messaging-sw.js')
      .then((registration) => {
        console.log('Service Worker registration successful:', registration);
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
  }, []);

  return null; // This component doesn't render anything
}
