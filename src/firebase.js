import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCZfCB30ZCrgfV787JNjZ5WoRrvgyN1GL0",
  authDomain: "pruebafijosdn.firebaseapp.com",
  projectId: "pruebafijosdn",
  storageBucket: "pruebafijosdn.firebasestorage.app",
  messagingSenderId: "479598312333",
  appId: "1:479598312333:web:e2ecd1de61bef748a85bc4",
  measurementId: "G-B0SNEXMG6B"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar Firestore
const db = getFirestore(app);

// Inicializar Authentication
const auth = getAuth(app);

// Inicializar Storage
const storage = getStorage(app);

export { db, auth, storage };
export default app;