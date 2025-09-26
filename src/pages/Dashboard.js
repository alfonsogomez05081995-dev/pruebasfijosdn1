import React from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/router';

// Importar los dashboards específicos de cada rol
import MasterDashboard from '../components/master/MasterDashboard';
import LogisticDashboard from '../components/logistic/LogisticDashboard';
import EmployeeDashboard from '../components/employee/EmployeeDashboard';

export default function Dashboard() {
  const { userRole, userData, logout } = useAuth() || {};
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  // Función para renderizar el dashboard según el rol
  const renderDashboard = () => {
    if (!userRole) {
      return (
        <Card>
          <Card.Body className="text-center">
            <h4>Error al cargar el perfil</h4>
            <p>
              No pudimos cargar los datos de tu perfil. Esto puede deberse a que
              tu usuario no tiene un rol asignado en el sistema.
            </p>
            <p>Por favor, contacta al administrador.</p>
          </Card.Body>
        </Card>
      );
    }

    switch (userRole) {
      case 'master':
        return <MasterDashboard />;
      case 'logistic':
        return <LogisticDashboard />;
      case 'employee':
        return <EmployeeDashboard />;
      default:
        return (
          <Card>
            <Card.Body className="text-center">
              <h4>Rol no reconocido: '{userRole}'</h4>
              <p>Tu rol no es válido para acceder a ningún panel.</p>
              <p>Por favor, contacta al administrador del sistema.</p>
            </Card.Body>
          </Card>
        );
    }
  };

  return (
    <Container fluid className="px-4">
      {/* Header del Dashboard */}
      <Row className="my-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="h3 mb-1">Panel de Control - FijosDN</h1>
              <p className="text-muted mb-0">
                Bienvenido/a, {userData?.nombre || 'Usuario'}
              </p>
              <small className="text-muted">Rol: {userRole}</small>
            </div>
            <Button variant="outline-danger" onClick={handleLogout}>
              Cerrar Sesión
            </Button>
          </div>
        </Col>
      </Row>

      {/* Contenido del Dashboard */}
      <Row>
        <Col>
          {renderDashboard()}
        </Col>
      </Row>
    </Container>
  );
}