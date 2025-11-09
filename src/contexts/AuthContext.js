// Indica que este componente se ejecuta en el lado del cliente.
"use client";

// Importa las funciones y hooks necesarios de React y Firebase.
import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import { collection, query, where, getDocs, updateDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

// Crea el contexto de autenticación.
const AuthContext = createContext();

// Hook personalizado para usar el contexto de autenticación.
export function useAuth() {
  return useContext(AuthContext);
}

// Proveedor de contexto de autenticación.
export function AuthProvider({ children }) {
  // Estados para el usuario actual, su rol, sus datos y el estado de carga.
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Función para iniciar sesión con correo y contraseña.
  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  // Función para cerrar sesión.
  function logout() {
    return signOut(auth);
  }

  // Función para restablecer la contraseña.
  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  // Función para obtener los datos del usuario desde Firestore.
  const fetchUserData = async (user) => {
    // Si no hay usuario, resetea los estados de datos y rol.
    if (!user) {
      setUserData(null);
      setUserRole(null);
      return;
    }

    try {
      // Crea una consulta para obtener el documento del usuario con el correo electrónico en minúsculas.
      const q = query(collection(db, "users"), where("email", "==", user.email.toLowerCase()));
      const querySnapshot = await getDocs(q);

      // Si se encuentra el documento del usuario.
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const currentData = userDoc.data();

        // Si el usuario tiene estado 'invitado', lo activa y lo vincula a su master.
        if (currentData.status === 'invitado') {
          const invitationRef = doc(db, "invitations", user.email.toLowerCase());
          const invitationSnap = await getDoc(invitationRef);
          const masterId = invitationSnap.exists() ? invitationSnap.data().invitedBy : null;

          // Actualiza el documento del usuario con el estado 'activo', el UID y el ID del master.
          await updateDoc(userDoc.ref, {
            status: 'active',
            uid: user.uid,
            masterId: masterId,
          });
          // Vuelve a obtener los datos actualizados para asegurar que la UI tenga la información más reciente.
          const updatedDoc = await getDoc(userDoc.ref);
          const updatedData = updatedDoc.data();
          setUserData({ id: updatedDoc.id, ...updatedData });
          setUserRole(updatedData.role || null);
        } else {
          // Si es un usuario activo normal, solo establece los datos y el rol.
          setUserData({ id: userDoc.id, ...currentData });
          setUserRole(currentData.role || null);
        }
      } else {
        // Si no se encuentra ningún documento para este correo electrónico, resetea los estados.
        setUserData(null);
        setUserRole(null);
      }
    } catch (error) {
      // Maneja los errores al obtener los datos del usuario.
      console.error("Error fetching user data:", error);
      setUserData(null);
      setUserRole(null);
    }
  };

  // Efecto para observar los cambios en el estado de autenticación.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      await fetchUserData(user);
      setLoading(false);
    });

    // Devuelve la función de limpieza para desuscribirse del observador.
    return unsubscribe;
  }, []);


  // Valor del contexto que estará disponible para todos los componentes hijos.
  const value = {
    currentUser,
    userRole,
    userData,
    login,
    logout,
    resetPassword
  };

  return (
    // Proveedor de contexto que envuelve a los componentes hijos.
    <AuthContext.Provider value={value}>
      {/* Renderiza los componentes hijos solo cuando la carga ha finalizado. */}
      {!loading && children}
    </AuthContext.Provider>
  );
}