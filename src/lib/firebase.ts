// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth"; // Import getAuth

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB1ZM8tppg9wvPbVb-S_Tst3VdrzVmJR_4",
  authDomain: "pruebasfijosdn1.firebaseapp.com",
  projectId: "pruebasfijosdn1",
  storageBucket: "pruebasfijosdn1.firebasestorage.app",
  messagingSenderId: "1085419668125",
  appId: "1:1085419668125:web:3c9e059953cdd953774a74",
  measurementId: "G-S6EN39B1EX"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app); // Initialize auth

export { app, db, storage, auth }; // Export auth