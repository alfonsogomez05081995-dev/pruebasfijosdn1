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

// Create context
const AuthContext = createContext();

// Custom hook to use the context
export function useAuth() {
  return useContext(AuthContext);
}

// Context provider
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Login function
  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  // Logout function
  function logout() {
    return signOut(auth);
  }

  // Password reset function
  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  // Fetch user data from Firestore
  const fetchUserData = async (user) => {
    if (!user) {
      setUserData(null);
      setUserRole(null);
      return;
    }

    try {
      // Query for user document with matching lowercase email
      const q = query(collection(db, "users"), where("email", "==", user.email.toLowerCase()));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const currentData = userDoc.data();

        if (currentData.status === 'invitado') {
          // This is an invited user logging in. Let's activate them and link their master.
          const invitationRef = doc(db, "invitations", user.email.toLowerCase());
          const invitationSnap = await getDoc(invitationRef);
          const masterId = invitationSnap.exists() ? invitationSnap.data().invitedBy : null;

          await updateDoc(userDoc.ref, {
            status: 'active',
            uid: user.uid, // Add the auth UID to the document
            masterId: masterId, // Link to the inviting master
          });
          // Re-fetch the (now updated) data to ensure UI has the latest info
          const updatedDoc = await getDoc(userDoc.ref);
          const updatedData = updatedDoc.data();
          setUserData({ id: updatedDoc.id, ...updatedData });
          setUserRole(updatedData.role || null);
        } else {
          // This is a normal active user
          setUserData({ id: userDoc.id, ...currentData });
          setUserRole(currentData.role || null);
        }
      } else {
        // No document found for this email
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

    // Cleanup function
    return unsubscribe;
  }, []);


  // Value available to all components
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