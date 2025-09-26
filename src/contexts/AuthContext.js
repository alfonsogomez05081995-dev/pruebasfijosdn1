import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
// Import query tools from firestore
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

// Crear el contexto
const AuthContext = createContext();

// Hook personalizado para usar el contexto
export function useAuth() {
  return useContext(AuthContext);
}

// Proveedor del contexto que envolverá toda la aplicación
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Función para login
  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  // Función para logout
  function logout() {
    return signOut(auth);
  }

  // Función para resetear contraseña
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

    console.log("Fetching user data for:", user.email);

    try {
      // Query for user document with matching lowercase email
      const q = query(collection(db, "users"), where("email_lowercase", "==", user.email.toLowerCase()));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // Assuming email is unique, take the first document
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        setUserData(userData);
        setUserRole(userData.role || null);
      } else {
        // No document found for this email
        console.log("No user document found for email:", user.email);
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
      await fetchUserData(user); // Pass the full user object
      setLoading(false);
    });

    // Cleanup function
    return unsubscribe;
  }, []);


  // Valor que estará disponible en todos los componentes
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
      {/* No renderizar hijos hasta terminar de verificar autenticación */}
      {!loading && children}
    </AuthContext.Provider>
  );
}