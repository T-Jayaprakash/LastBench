import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getMessaging, isSupported } from 'firebase/messaging';
import { getFunctions } from 'firebase/functions';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Firebase Configuration - All values should come from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Log config (hide sensitive parts)
console.log('🔧 Firebase Config:', {
  apiKey: firebaseConfig.apiKey ? '✅ Set' : '❌ Missing',
  authDomain: firebaseConfig.authDomain || '❌ Missing',
  databaseURL: firebaseConfig.databaseURL || '❌ Missing',
  projectId: firebaseConfig.projectId || '❌ Missing',
  storageBucket: firebaseConfig.storageBucket || '❌ Missing',
  messagingSenderId: firebaseConfig.messagingSenderId ? '✅ Set' : '❌ Missing',
  appId: firebaseConfig.appId ? '✅ Set' : '❌ Missing'
});

// Warn if critical config is missing
if (!firebaseConfig.databaseURL) {
  console.warn('⚠️ VITE_FIREBASE_DATABASE_URL is missing! Realtime Database will not work.');
  console.warn('Please create a Realtime Database in Firebase Console and add the URL to .env.local');
}

const app = initializeApp(firebaseConfig);

// Firestore
export const db = getFirestore(app);

// Realtime Database
export const rtdb = getDatabase(app);

// Auth
export const auth = getAuth(app);

// Storage
export const storage = getStorage(app);

// Messaging (with support check)
let messaging: any = null;
isSupported().then(supported => {
  if (supported) {
    messaging = getMessaging(app);
  }
}).catch(() => {
  console.warn('Firebase Messaging not supported in this environment');
});
export { messaging };

// Cloud Functions
export const functions = getFunctions(app);

export default app;

