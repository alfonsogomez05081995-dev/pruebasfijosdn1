// Importa el SDK de Firebase Admin.
import * as admin from 'firebase-admin';

/**
 * Inicializa la aplicación de Firebase Admin si aún no está inicializada.
 * Esta función se asegura de que solo haya una instancia de la aplicación de Firebase Admin.
 * @returns La instancia de la aplicación de Firebase Admin.
 * @throws Si las variables de entorno necesarias no están configuradas.
 */
export async function initFirebaseAdmin() {
  // Si ya hay aplicaciones de Firebase Admin inicializadas, devuelve la primera.
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // Valida que las variables de entorno necesarias existan.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  // Si alguna de las variables de entorno no está configurada, lanza un error.
  if (!privateKey || !clientEmail || !projectId) {
    throw new Error(
      'Las variables de entorno de Firebase Admin (FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, NEXT_PUBLIC_FIREBASE_PROJECT_ID) no están configuradas. Revisa tu archivo .env.local'
    );
  }

  // Crea el objeto de cuenta de servicio con las credenciales de Firebase.
  const serviceAccount: admin.ServiceAccount = {
    projectId,
    clientEmail,
    // Reemplaza los caracteres de nueva línea escapados con saltos de línea reales.
    privateKey: privateKey.replace(/\\n/g, '\n'),
  };

  // Inicializa la aplicación de Firebase Admin con las credenciales y la configuración del bucket de almacenamiento.
  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: `${projectId}.appspot.com`,
  });
}