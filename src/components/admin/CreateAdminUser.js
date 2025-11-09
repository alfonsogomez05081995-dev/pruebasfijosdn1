// Importa las dependencias necesarias de React y Firebase.
import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase'; // Importa la instancia de la base de datos de Firebase.
import { useAuth } from '../../contexts/AuthContext'; // Hook para acceder al contexto de autenticación.
import { Button, Card, Alert } from 'react-bootstrap'; // Componentes de UI de React Bootstrap.

// Define el componente funcional CreateAdminUser.
export default function CreateAdminUser() {
  // Obtiene el usuario actual del contexto de autenticación.
  const { currentUser } = useAuth() || {};
  // Define estados para mensajes, errores y estado de carga.
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Función para manejar la creación del perfil de administrador.
  const handleCreateProfile = async () => {
    // Si no hay un usuario autenticado, muestra un error.
    if (!currentUser) {
      setError('Debes iniciar sesión para crear un perfil.');
      return;
    }

    // Inicia el estado de carga y limpia los mensajes de error y éxito.
    setLoading(true);
    setError('');
    setMessage('');

    try {
      // Crea una referencia al documento del usuario en la colección 'users'.
      const userRef = doc(db, 'users', currentUser.uid);
      // Establece los datos del perfil del usuario en Firestore.
      await setDoc(userRef, {
        email: currentUser.email,
        email_lowercase: currentUser.email.toLowerCase(), // Almacena el email en minúsculas para búsquedas insensibles a mayúsculas.
        nombre: 'Luis G.', // Nombre por defecto para el perfil.
        role: 'master', // Asigna el rol de 'master' (administrador).
      });
      // Muestra un mensaje de éxito si la operación es correcta.
      setMessage(
        '¡Perfil de administrador creado exitosamente! Por favor, refresca la página para ver el dashboard.'
      );
    } catch (e) {
      // Captura y muestra cualquier error que ocurra durante la creación del perfil.
      console.error('Error al crear el perfil:', e);
      setError('Ocurrió un error al crear el perfil en la base de datos.');
    }

    // Finaliza el estado de carga.
    setLoading(false);
  };

  // Renderiza el componente.
  return (
    <Card style={{ maxWidth: '400px', margin: '2rem auto' }}>
      <Card.Body>
        <h3 className="text-center mb-4">Crear Perfil de Administrador</h3>
        {/* Muestra mensajes de éxito o error si existen. */}
        {message && <Alert variant="success">{message}</Alert>}
        {error && <Alert variant="danger">{error}</Alert>}
        <p>
          Haz clic en el botón de abajo para crear el registro de perfil para el
          usuario actual (<strong>{currentUser?.email}</strong>) con el rol de
          'master'.
        </p>
        {/* Botón para disparar la creación del perfil, se deshabilita durante la carga. */}
        <Button
          disabled={loading || !currentUser}
          onClick={handleCreateProfile}
          className="w-100"
        >
          {loading ? 'Creando...' : 'Crear Perfil de Administrador'}
        </Button>
      </Card.Body>
    </Card>
  );
}
