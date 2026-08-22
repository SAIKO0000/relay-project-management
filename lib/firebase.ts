import { getApps, initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, MessagePayload, Messaging } from 'firebase/messaging';
import { isDemoMode } from '@/lib/demo/config';

// Firebase configuration for portfolio demo
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean)

// Initialize Firebase Cloud Messaging only on client side
let messaging: Messaging | null = null;

const initializeMessaging = () => {
  if (!isDemoMode && isFirebaseConfigured && typeof window !== 'undefined' && 'serviceWorker' in navigator && 'Notification' in window) {
    try {
      const app = getApps()[0] ?? initializeApp(firebaseConfig)
      messaging = getMessaging(app);
      return messaging;
    } catch (error) {
      console.warn('Failed to initialize Firebase messaging:', error);
      return null;
    }
  }
  return null;
};

export { messaging, initializeMessaging };

// VAPID key
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export const requestNotificationPermission = async (): Promise<string | null> => {
  try {
    // Check if we're in a browser environment with required APIs
    if (isDemoMode || !VAPID_KEY || typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) {
      console.warn('Browser does not support notifications or service workers');
      return null;
    }

    // Initialize messaging
    const currentMessaging = initializeMessaging();
    if (!currentMessaging) {
      console.warn('Failed to initialize Firebase messaging');
      return null;
    }

    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('Notification permission granted.');
      
      const token = await getToken(currentMessaging, {
        vapidKey: VAPID_KEY,
      });
      
      if (token) {
        return token;
      } else {
        console.log('No registration token available.');
        return null;
      }
    } else {
      console.log('Unable to get permission to notify.');
      return null;
    }
  } catch (error) {
    console.error('An error occurred while retrieving token:', error);
    return null;
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    if (typeof window !== 'undefined') {
      const currentMessaging = initializeMessaging();
      if (currentMessaging) {
        onMessage(currentMessaging, (payload: MessagePayload) => {
          console.log('Message received. ', payload);
          resolve(payload);
        });
      } else {
        resolve(null);
      }
    } else {
      resolve(null);
    }
  });
