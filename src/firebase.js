import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getDatabase } from "firebase/database";

// Firebase web config identifies the public project; database rules protect its data.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDOrV7CDDL57-Fa4e_m09aUSQ9HRZhfEWs",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "sixydashy.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://sixydashy-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "sixydashy",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "sixydashy.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "994645586219",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:994645586219:web:c71222adf6592db994956e",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-JLH3EQ4PSC",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);

export function connectAnonymously() {
  return signInAnonymously(auth);
}
