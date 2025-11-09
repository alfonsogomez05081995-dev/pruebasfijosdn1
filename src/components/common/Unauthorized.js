// Importa la biblioteca de React para poder crear un componente.
import React from 'react';

/**
 * Componente Unauthorized.
 * 
 * Este componente se muestra cuando un usuario intenta acceder a una página
 * para la que no tiene los permisos necesarios.
 * 
 * @returns {JSX.Element} Un elemento JSX que informa al usuario sobre el acceso no autorizado.
 */
const Unauthorized = () => {
  return (
    <div>
      <h1>No Autorizado</h1>
      <p>No tienes permiso para ver esta página.</p>
    </div>
  );
};

// Exporta el componente Unauthorized para que pueda ser utilizado en otras partes de la aplicación.
export default Unauthorized;
