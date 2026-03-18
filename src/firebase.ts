import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBasJGqw4akPAfxwyTkfbiAp_TaqrF2uAg",
  authDomain: "portal-da-setup.firebaseapp.com",
  databaseURL: "https://portal-da-setup-default-rtdb.firebaseio.com",
  projectId: "portal-da-setup",
  storageBucket: "portal-da-setup.firebasestorage.app",
  messagingSenderId: "626041748136",
  appId: "1:626041748136:web:4a6e6a01f12fb44beb609d",
  measurementId: "G-GYSDXSZ70G"
};

// Initialize Firebase SDK
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Secondary app for user management (to avoid logging out the current admin)
export const secondaryApp = initializeApp(firebaseConfig, 'Secondary');
export const secondaryAuth = getAuth(secondaryApp);
