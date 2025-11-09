// Importa las dependencias necesarias de React y React Router.
import React from 'react';
import { Link } from 'react-router-dom';

// Define el componente de navegación.
const Navigation = () => {
  // Renderiza una lista de enlaces de navegación.
  return (
    <nav>
      <ul>
        {/* Enlace a la página del dashboard. */}
        <li><Link to="/dashboard">Dashboard</Link></li>
        {/* Enlace a la página de login. */}
        <li><Link to="/login">Login</Link></li>
      </ul>
    </nav>
  );
};

// Exporta el componente para su uso en otras partes de la aplicación.
export default Navigation;
