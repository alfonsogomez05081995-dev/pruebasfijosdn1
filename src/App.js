import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/global.css';
// Componentes
// Componentes
import Login from './components/auth/Login';
import Dashboard from './pages/Dashboard';
import PrivateRoute from './components/auth/PrivateRoute';
import { PublicRoute } from './components/auth/PrivateRoute';
import Navigation from './components/common/Navigation';
import Unauthorized from './components/common/Unauthorized';
import ForgotPassword from './components/auth/ForgotPassword';
import CreateAdminUser from './components/admin/CreateAdminUser'; // Importación temporal

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          {/* Navigation se muestra solo cuando hay usuario autenticado */}
          {/* <Navigation /> */}
          
          <Routes>
            {/* Ruta temporal para crear el admin */}
            <Route path="/create-admin" element={<CreateAdminUser />} />

            {/* Rutas públicas */}
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } 
            />
            <Route 
              path="/forgot-password" 
              element={
                <PublicRoute>
                  <ForgotPassword />
                </PublicRoute>
              } 
            />
            
            {/* Rutas protegidas */}
            <Route 
              path="/dashboard" 
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              } 
            />
            
            {/* Rutas específicas por rol */}
            <Route 
              path="/master/*" 
              element={
                <PrivateRoute requiredRole="master">
                  <Dashboard />
                </PrivateRoute>
              } 
            />
            
            {/* Ruta para no autorizado */}
            <Route path="/unauthorized" element={<Unauthorized />} />
            
            {/* Ruta por defecto */}
            <Route path="/" element={<Login />} />
            
            {/* Ruta para páginas no encontradas */}
            <Route path="*" element={<div>Página no encontrada</div>} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;