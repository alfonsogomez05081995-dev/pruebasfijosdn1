import * as admin from 'firebase-admin';

/**
 * @file Este archivo se encarga de la inicialización del SDK de Firebase Admin.
 * El SDK de Admin se utiliza para operaciones de backend (ej. en API Routes de Next.js)
 * que requieren privilegios elevados, como la creación de usuarios sin contraseña
 * o la modificación de datos sin pasar por las reglas de seguridad de Firestore.
 */

/**
 * Inicializa la aplicación de Firebase Admin.
 * Utiliza un patrón singleton para asegurar que la inicialización ocurra solo una vez.
 *
 * @returns {admin.app.App} La instancia de la aplicación de Firebase Admin.
 * @throws Si las variables de entorno necesarias no están configuradas.
 */
export async function initFirebaseAdmin() {
  // Patrón Singleton: si ya hay una aplicación inicializada, la devuelve.
  // Esto es crucial en entornos serverless o de desarrollo para evitar errores.
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // Valida que las variables de entorno necesarias para la cuenta de servicio existan.
  // Estas variables deben estar en un archivo .env.local y NO deben tener el prefijo NEXT_PUBLIC_
  // para mantenerlas seguras en el servidor.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!privateKey || !clientEmail || !projectId) {
    throw new Error(
      'Las variables de entorno de Firebase Admin (FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, NEXT_PUBLIC_FIREBASE_PROJECT_ID) no están configuradas. Revisa tu archivo .env.local'
    );
  }

  // Construye el objeto de la cuenta de servicio para las credenciales.
  const serviceAccount: admin.ServiceAccount = {
    projectId,
    clientEmail,
    // La clave privada a menudo se almacena en una sola línea en las variables de entorno.
    // Este reemplazo restaura los saltos de línea para que sea una clave PEM válida.
    privateKey: privateKey.replace(/\\n/g, '\n'),
  };

  // Inicializa la aplicación de Firebase Admin con las credenciales de la cuenta de servicio.
  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    // Opcional: Define el bucket de Firebase Storage si se va a usar desde el admin SDK.
    storageBucket: `${projectId}.appspot.com`,
  });
}