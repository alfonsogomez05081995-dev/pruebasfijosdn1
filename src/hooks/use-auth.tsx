
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

export type Role = 'Master' | 'Logistica' | 'Empleado';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password_unused: string) => boolean;
  logout: () => void;
}

// Mock users are only for initial login. Real user data will come from Firestore.
const mockUsers: Omit<User, 'id'>[] = [
  { name: 'Luis G. (Master)', email: 'luisgm.ldv@gmail.com', role: 'Master' },
  { name: 'Usuario de Logística', email: 'logistica@empresa.com', role: 'Logistica' },
  { name: 'Usuario Empleado', email: 'empleado@empresa.com', role: 'Empleado' },
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
        console.error("Could not parse user from local storage", error)
        localStorage.removeItem('user');
    }
    setLoading(false);
  }, []);

  const login = (email: string, password_unused: string): boolean => {
    // In a real app, this would call a service to get user data from Firestore
    // For this simulation, we find a mock user and create a user object.
    const foundUser = mockUsers.find(u => u.email === email); // Password check is ignored for this simulation
    if (foundUser) {
      // The ID is typically the document ID from Firestore, which for users we've set to be the email.
      const userToStore = { ...foundUser, id: email };
      setUser(userToStore);
      localStorage.setItem('user', JSON.stringify(userToStore));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
