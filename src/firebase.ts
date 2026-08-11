import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Firebase Web config is public by design. Environment variables can override
// these values on Vercel, while the project config keeps the static deploy working
// when Vercel has not been configured with VITE_* variables yet.
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAoqE-4Bs12AHznNVNW-TZbCpaGssYabuo',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'edu-ride-22ed0.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'edu-ride-22ed0',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'edu-ride-22ed0.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '118616013092',
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID || '1:118616013092:web:54312cbd243068f21d5bb1',
};
export const firebaseReady = Boolean(config.apiKey && config.projectId);
export const db = firebaseReady
  ? getFirestore(getApps().length ? getApps()[0] : initializeApp(config))
  : null;
