"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import { collection, query, where, getDocs, updateDoc, getDoc, doc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

// 1. Crear el Contexto de Autenticación
// Este contexto proporcionará la información de autenticación a todos los componentes hijos.
const AuthContext = createContext();

/**
 * 2. Hook Personalizado (useAuth)
 * Facilita el acceso al contexto de autenticación desde cualquier componente.
 * @returns El objeto de valor del contexto, que incluye el usuario actual, rol, datos, y funciones de autenticación.
 */
export function useAuth() {
  return useContext(AuthContext);
}

/**
 * 3. Proveedor de Autenticación (AuthProvider)
 * Componente que envuelve la aplicación y gestiona el estado de autenticación.
 * @param {object} props - Propiedades del componente, incluyendo `children`.
 */
export function AuthProvider({ children }) {
  // --- Estados del Contexto ---
  const [currentUser, setCurrentUser] = useState(null); // Almacena el objeto de usuario de Firebase Auth.
  const [userRole, setUserRole] = useState(null);       // Almacena el rol del usuario (ej. 'master', 'empleado').
  const [userData, setUserData] = useState(null);       // Almacena los datos completos del usuario desde Firestore.
  const [loading, setLoading] = useState(true);         // Indica si el estado de autenticación se está cargando.

  // --- Funciones de Autenticación ---

  /**
   * Inicia sesión de un usuario con correo y contraseña.
   * @param {string} email - Correo del usuario.
   * @param {string} password - Contraseña del usuario.
   * @returns Una promesa que se resuelve con las credenciales del usuario.
   */
  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  /**
   * Cierra la sesión del usuario actual.
   * @returns Una promesa que se resuelve cuando el usuario ha cerrado sesión.
   */
  function logout() {
    return signOut(auth);
  }

  /**
   * Envía un correo para restablecer la contraseña.
   * @param {string} email - El correo al que se enviará el enlace de reseteo.
   * @returns Una promesa que se resuelve cuando el correo ha sido enviado.
   */
  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  /**
   * Obtiene los datos del usuario desde la colección 'users' en Firestore.
   * Esta función es clave para sincronizar Firebase Auth con los datos de la aplicación.
   * @param {object} user - El objeto de usuario de Firebase Auth.
   */
  const fetchUserData = async (user) => {
    if (!user) {
      // Si no hay usuario, resetea los estados.
      setUserData(null);
      setUserRole(null);
      return;
    }

    try {
      // Busca al usuario en Firestore usando su correo electrónico.
      const q = query(collection(db, "users"), where("email", "==", user.email.toLowerCase()));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const currentData = userDoc.data();

        // Lógica especial para usuarios 'invitados' que inician sesión por primera vez.
        if (currentData.status === 'invitado') {
          // Busca la invitación original para obtener el ID del master que lo invitó.
          const invitationRef = doc(db, "invitations", user.email.toLowerCase());
          const invitationSnap = await getDoc(invitationRef);
          const masterId = invitationSnap.exists() ? invitationSnap.data().invitedBy : null;

          // Actualiza el documento del usuario para activarlo.
          await updateDoc(userDoc.ref, {
            status: 'active', // Cambia el estado a 'activo'.
            uid: user.uid,    // Añade el UID de autenticación al documento.
            masterId: masterId, // Vincula al master que lo invitó.
          });

          // Vuelve a obtener los datos actualizados para la UI.
          const updatedDoc = await getDoc(userDoc.ref);
          const updatedData = updatedDoc.data();
          setUserData({ id: updatedDoc.id, ...updatedData });
          setUserRole(updatedData.role || null);
        } else {
          // Para usuarios activos normales, simplemente establece los datos.
          setUserData({ id: userDoc.id, ...currentData });
          setUserRole(currentData.role || null);
        }
      } else {
        // Si no se encuentra el documento en Firestore, resetea los estados.
        console.error(`No se encontró un documento de usuario para el correo: ${user.email}`);
        setUserData(null);
        setUserRole(null);
      }
    } catch (error) {
      console.error("Error al obtener los datos del usuario:", error);
      setUserData(null);
      setUserRole(null);
    }
  };

  // --- Efecto de Suscripción ---

  // Se ejecuta una vez al montar el componente para suscribirse a los cambios de estado de autenticación.
  useEffect(() => {
    // onAuthStateChanged es un observador que se dispara cuando el usuario inicia o cierra sesión.
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user); // Actualiza el usuario de Firebase Auth.
      await fetchUserData(user); // Obtiene/actualiza los datos de Firestore.
      setLoading(false); // Marca la carga como completada.
    });

    // La función de limpieza se ejecuta al desmontar el componente para evitar fugas de memoria.
    return unsubscribe;
  }, []); // El array vacío asegura que el efecto se ejecute solo una vez.


  // 4. Valor del Contexto
  // Objeto que se pone a disposición de todos los componentes consumidores.
  const value = {
    currentUser,
    userRole,
    userData,
    loading, // Exporta el estado de carga
    login,
    logout,
    resetPassword
  };

  // 5. Renderizado del Proveedor
  // Solo renderiza los componentes hijos cuando la carga inicial ha terminado.
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}