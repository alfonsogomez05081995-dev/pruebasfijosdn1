// Importa las dependencias necesarias de React, React Router y React Bootstrap.
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext'; // Hook para acceder al contexto de autenticación.
import { Spinner, Container } from 'react-bootstrap'; // Componentes para la interfaz de usuario.

// --- Componente de Ruta Privada ---
// Este componente protege rutas que solo deben ser accesibles por usuarios autenticados
// y, opcionalmente, con un rol específico.
export default function PrivateRoute({ children, requiredRole }) {
  // Obtiene el estado de autenticación, el rol del usuario y el estado de carga del contexto.
  const { currentUser, userRole, loading } = useAuth();

  // 1. Manejo del estado de carga:
  // Mientras se verifica si el usuario está autenticado, se muestra un spinner.
  // Esto previene redirecciones prematuras antes de que se resuelva el estado de autenticación.
  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  // 2. Verificación de autenticación:
  // Si no hay un usuario autenticado (currentUser es null), se redirige al usuario
  // a la página de login. `replace` evita que la ruta de login se añada al historial.
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // 3. Verificación de rol (opcional):
  // Si se ha especificado un `requiredRole` y el rol del usuario (`userRole`) no coincide,
  // se le redirige a una página de "No Autorizado".
  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  // 4. Acceso concedido:
  // Si el usuario está autenticado y cumple con el rol requerido (si aplica),
  // se renderiza el componente hijo (`children`), permitiendo el acceso a la ruta protegida.
  return children;
}

// --- Componente de Ruta Pública ---
// Este componente se usa para rutas que no deberían ser accesibles si el usuario ya ha iniciado sesión,
// como la página de login o de registro.
export function PublicRoute({ children }) {
  // Obtiene solo el usuario actual del contexto de autenticación.
  const { currentUser } = useAuth();

  // Si el usuario ya está autenticado, se le redirige al dashboard principal.
  // Esto evita que un usuario que ya ha iniciado sesión vea de nuevo la página de login.
  if (currentUser) {
    return <Navigate to="/dashboard" replace />;
  }

  // Si no hay un usuario autenticado, se renderiza el componente hijo (la página pública).
  return children;
}
