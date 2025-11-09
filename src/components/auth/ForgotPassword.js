// Importa React para poder definir y usar componentes de React.
import React from 'react';

// Define el componente funcional ForgotPassword.
// Este componente renderiza la página para que los usuarios puedan solicitar un restablecimiento de contraseña.
const ForgotPassword = () => {
  // El retorno del componente contiene la estructura JSX que se renderizará en el DOM.
  return (
    <div>
      {/* Título de la página */}
      <h2>Olvidé mi Contraseña</h2>
      {/* Texto descriptivo para el usuario */}
      <p>Esta es la página para recuperar la contraseña.</p>
      {/* Aquí se podría agregar un formulario para que el usuario ingrese su correo electrónico
          y un botón para enviar la solicitud de restablecimiento de contraseña. */}
    </div>
  );
};

// Exporta el componente ForgotPassword para que pueda ser importado y utilizado en otras partes de la aplicación.
export default ForgotPassword;
