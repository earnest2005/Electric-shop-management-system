import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  enableMultiTabIndexedDbPersistence 
} from 'firebase/firestore';

// Default Live Project Config for electrical-shop-system-8aee0
const LIVE_FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDrJ8gZptziQ_qMeJMJoRb1_-cTGaeqQIM",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "electrical-shop-system-8aee0.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "electrical-shop-system-8aee0",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "electrical-shop-system-8aee0.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "370945983076",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:370945983076:web:9371859990bb9a0a6e5571"
};

export function getFirebaseConfig() {
  // Check LocalStorage override if custom keys were saved
  try {
    const saved = localStorage.getItem('volt_firebase_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.apiKey && !parsed.apiKey.includes('your_api_key')) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Could not parse saved firebase config:", e);
  }

  return LIVE_FIREBASE_CONFIG;
}

export function saveStoredFirebaseConfig(config) {
  localStorage.setItem('volt_firebase_config', JSON.stringify(config));
  window.location.reload();
}

export function getStoredFirebaseConfig() {
  return getFirebaseConfig();
}

let app;
let db;
let isRealFirebase = true;

const currentConfig = getFirebaseConfig();

try {
  if (!getApps().length) {
    app = initializeApp(currentConfig);
  } else {
    app = getApp();
  }
  
  db = getFirestore(app);

  // Enable multi-tab offline persistence
  enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore persistence warning: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore persistence unsupported in browser');
    }
  });

  isRealFirebase = true;
  console.log("🔥 Connected to Live Firebase Cloud Firestore project:", currentConfig.projectId);
} catch (error) {
  console.warn("Firebase initialization warning:", error.message);
  isRealFirebase = true;
}

export { app, db, isRealFirebase };
