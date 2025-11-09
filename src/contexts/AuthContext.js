"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import { collection, query, where, getDocs, updateDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

// Crear contexto
const AuthContext = createContext();

// Hook personalizado para usar el contexto
export function useAuth() {
  return useContext(AuthContext);
}

// Proveedor de contexto
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Función de inicio de sesión
  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  // Función de cierre de sesión
  function logout() {
    return signOut(auth);
  }

  // Función de reseteo de contraseña
  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  // Obtener datos del usuario desde Firestore
  const fetchUserData = async (user) => {
    if (!user) {
      setUserData(null);
      setUserRole(null);
      return;
    }

    try {
      // Consulta para el documento de usuario con el correo electrónico en minúsculas
      const q = query(collection(db, "users"), where("email", "==", user.email.toLowerCase()));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const currentData = userDoc.data();

        if (currentData.status === 'invitado') {
          // Este es un usuario invitado que inicia sesión. Vamos a activarlo y vincularlo a su master.
          const invitationRef = doc(db, "invitations", user.email.toLowerCase());
          const invitationSnap = await getDoc(invitationRef);
          const masterId = invitationSnap.exists() ? invitationSnap.data().invitedBy : null;

          await updateDoc(userDoc.ref, {
            status: 'active',
            uid: user.uid, // Añadir el UID de autenticación al documento
            masterId: masterId, // Vincular al master que lo invitó
          });
          // Volver a obtener los datos (ahora actualizados) para asegurar que la UI tenga la información más reciente
          const updatedDoc = await getDoc(userDoc.ref);
          const updatedData = updatedDoc.data();
          setUserData({ id: updatedDoc.id, ...updatedData });
          setUserRole(updatedData.role || null);
        } else {
          // Este es un usuario activo normal
          setUserData({ id: userDoc.id, ...currentData });
          setUserRole(currentData.role || null);
        }
      } else {
        // No se encontró ningún documento para este correo electrónico
        setUserData(null);
        setUserRole(null);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      setUserData(null);
      setUserRole(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      await fetchUserData(user);
      setLoading(false);
    });

    // Función de limpieza
    return unsubscribe;
  }, []);


  // Valor disponible para todos los componentes
  const value = {
    currentUser,
    userRole,
    userData,
    login,
    logout,
    resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}