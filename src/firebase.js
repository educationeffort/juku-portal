import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDEdRLwaZ2dzUj8joHlJY-vSIW5QOov-2o",
  authDomain: "effort-portal.firebaseapp.com",
  projectId: "effort-portal",
  storageBucket: "effort-portal.firebasestorage.app",
  messagingSenderId: "895090986437",
  appId: "1:895090986437:web:7e2597ef407cccfa15cfac"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
