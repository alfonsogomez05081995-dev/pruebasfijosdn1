import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Card, Alert } from 'react-bootstrap';

export default function CreateAdminUser() {
  const { currentUser } = useAuth();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateProfile = async () => {
    if (!currentUser) {
      setError('Debes iniciar sesión para crear un perfil.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, {
        email: currentUser.email,
        email_lowercase: currentUser.email.toLowerCase(), // Add this line
        nombre: 'Luis G.', // Puedes cambiar esto si lo deseas
        role: 'master',
      });
      setMessage(
        '¡Perfil de administrador creado exitosamente! Por favor, refresca la página para ver el dashboard.'
      );
    } catch (e) {
      console.error('Error al crear el perfil:', e);
      setError('Ocurrió un error al crear el perfil en la base de datos.');
    }

    setLoading(false);
  };

  return (
    <Card style={{ maxWidth: '400px', margin: '2rem auto' }}>
      <Card.Body>
        <h3 className="text-center mb-4">Crear Perfil de Administrador</h3>
        {message && <Alert variant="success">{message}</Alert>}
        {error && <Alert variant="danger">{error}</Alert>}
        <p>
          Haz clic en el botón de abajo para crear el registro de perfil para el
          usuario actual (<strong>{currentUser?.email}</strong>) con el rol de
          'master'.
        </p>
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