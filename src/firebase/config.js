import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// ==========================================================================
// 💡 PASTE YOUR FIREBASE CONFIG API KEYS DIRECTLY HERE BELOW:
// ==========================================================================
const firebaseConfig = {
  apiKey: "AIzaSyDrJ8gZptziQ_qMeJMJoRb1_-cTGaeqQIM",
  authDomain: "electrical-shop-system-8aee0.firebaseapp.com",
  projectId: "electrical-shop-system-8aee0",
  storageBucket: "electrical-shop-system-8aee0.firebasestorage.app",
  messagingSenderId: "370945983076",
  appId: "1:370945983076:web:9371859990bb9a0a6e5571"
};
// ==========================================================================

export function getFirebaseConfig() {
  return firebaseConfig;
}

export function saveStoredFirebaseConfig(config) {
  localStorage.setItem('volt_firebase_config', JSON.stringify(config));
  window.location.reload();
}

export function getStoredFirebaseConfig() {
  return firebaseConfig;
}

let app;
let db;
let isRealFirebase = true;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  
  // Clean direct Firestore connection (without IndexedDB multi-tab locking)
  db = getFirestore(app);
  isRealFirebase = true;
  console.log("🔥 Connected to Firebase Cloud Firestore project:", firebaseConfig.projectId);
} catch (error) {
  console.warn("Firebase initialization warning:", error.message);
  isRealFirebase = true;
}

export { app, db, isRealFirebase };
