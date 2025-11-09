// Importa las dependencias necesarias de React y react-bootstrap.
import React, { useState } from 'react';
import {
  Form,
  Button,
  Card,
  Alert,
  Container,
  Row,
  Col,
  Spinner
} from 'react-bootstrap';
// Importa el hook de autenticación y utilidades de enrutamiento.
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

// Define el componente funcional Login.
export default function Login() {
  // Estados para el email, la contraseña, los errores y el estado de carga.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Obtiene la función de login del contexto de autenticación.
  const { login } = useAuth();
  // Hook para la navegación programática.
  const navigate = useNavigate();

  // Maneja el envío del formulario de login.
  async function handleSubmit(e) {
    e.preventDefault(); // Previene el comportamiento por defecto del formulario.

    // Validaciones básicas para asegurar que los campos no estén vacíos.
    if (!email || !password) {
      setError('Por favor completa todos los campos');
      return;
    }

    try {
      setError(''); // Limpia errores previos.
      setLoading(true); // Activa el estado de carga.
      await login(email, password); // Llama a la función de login.
      navigate('/dashboard'); // Redirige al dashboard si el login es exitoso.
    } catch (error) {
      // Maneja los errores de login.
      console.error('Login failed. Full error object:', error);
      const errorMessage = `Error: ${error.message}
Code: ${error.code}`;
      setError(errorMessage); // Muestra un mensaje de error al usuario.
    }

    setLoading(false); // Desactiva el estado de carga.
  }

  // Renderiza el formulario de login.
  return (
    <Container
      className="d-flex align-items-center justify-content-center"
      style={{ minHeight: "100vh", backgroundColor: "#f8f9fa" }}
    >
      <Row className="w-100" style={{ maxWidth: "400px" }}>
        <Col>
          <Card className="shadow">
            <Card.Body className="p-4">
              <div className="text-center mb-4">
                <h2 className="fw-bold">FijosDN</h2>
                <p className="text-muted">Sistema de Gestión de Activos</p>
              </div>

              {/* Muestra una alerta si hay un error. */}
              {error && <Alert variant="danger" className="mb-3" style={{ whiteSpace: 'pre-wrap' }}>{error}</Alert>}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="usuario@empresa.com"
                  />
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label>Contraseña</Form.Label>
                  <Form.Control
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Ingresa tu contraseña"
                  />
                </Form.Group>

                <Button
                  disabled={loading}
                  className="w-100 py-2 fw-bold"
                  type="submit"
                  variant="primary"
                >
                  {/* Muestra un spinner o el texto del botón según el estado de carga. */}
                  {loading ? (
                    <>
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        role="status"
                        aria-hidden="true"
                        className="me-2"
                      />
                      Iniciando sesión...
                    </>
                  ) : (
                    'Iniciar Sesión'
                  )}
                </Button>
              </Form>

              <div className="text-center mt-3">
                <Link to="/forgot-password" className="text-decoration-none">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </Card.Body>
          </Card>

          <div className="text-center mt-3">
            <p className="text-muted">
              Sistema de gestión de activos fijos v1.0
            </p>
          </div>
        </Col>
      </Row>
    </Container>
  );
}
