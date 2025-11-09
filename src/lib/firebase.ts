/**
 * @file Este archivo se encarga de la inicialización y configuración de Firebase para la aplicación.
 * Centraliza la configuración para que los servicios de Firebase (Firestore, Auth, Storage)
 * puedan ser importados y utilizados en cualquier parte de la aplicación.
 * @see https://firebase.google.com/docs/web/setup
 */

// Importa las funciones necesarias de los SDK de Firebase.
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

/**
 * Objeto de configuración de Firebase.
 * Los valores se cargan desde variables de entorno para mantener la seguridad y flexibilidad.
 * Las variables con el prefijo NEXT_PUBLIC_ son expuestas de forma segura al cliente por Next.js.
 * Estos valores se deben definir en un archivo .env.local en la raíz del proyecto.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID // Opcional para Google Analytics
};

/**
 * Inicialización de la aplicación de Firebase.
 * Se utiliza un patrón singleton para evitar la reinicialización de la app en cada render,
 * lo cual es un comportamiento común en el entorno de desarrollo de Next.js con Hot Reload.
 * Si no hay aplicaciones inicializadas, se crea una nueva. Si ya existe, se obtiene la existente.
 */
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Se obtienen las instancias de los servicios de Firebase que se usarán en la aplicación.
const db = getFirestore(app); // Instancia de Cloud Firestore
const storage = getStorage(app); // Instancia de Firebase Storage
const auth = getAuth(app); // Instancia de Firebase Authentication

// Se exportan las instancias para que puedan ser utilizadas en otros archivos.
export { app, db, storage, auth };