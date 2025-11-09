// Importaciones necesarias de React y react-bootstrap para construir la interfaz de usuario.
import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Table, Badge, Modal, Form, Alert } from 'react-bootstrap';
// Importaciones de Firebase para interactuar con la base de datos de Firestore.
import { collection, getDocs, query, where, doc, updateDoc, writeBatch, onSnapshot } from 'firebase/firestore';
// Importación de la configuración de la base de datos y el contexto de autenticación.
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';

// Definición del componente principal del panel del empleado.
export default function EmployeeDashboard() {
  // Hook para acceder a la información del usuario actual.
  const { currentUser } = useAuth();
  // Estados para almacenar las solicitudes, los activos, el estado de carga y los mensajes de error/éxito.
  const [requests, setRequests] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  // Estados para controlar la visibilidad del modal y la solicitud seleccionada.
  const [showModal, setShowModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  // Estado para almacenar los comentarios de rechazo.
  const [rejectionComments, setRejectionComments] = useState('');

  // Carga los activos una vez y escucha las solicitudes en tiempo real.
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    setLoading(true);
    // Cargar activos una sola vez.
    const loadAssets = async () => {
      try {
        const assetsSnapshot = await getDocs(collection(db, 'assets'));
        const assetsData = assetsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAssets(assetsData);
      } catch (err) {
        setError('Error al cargar los activos. ' + err.message);
      }
    };

    loadAssets();

    // Escuchar las solicitudes del empleado en tiempo real.
    const requestsQuery = query(collection(db, 'requests'), where('employeeId', '==', currentUser.uid));
    const unsubscribe = onSnapshot(requestsQuery, (snapshot) => {
      const requestsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRequests(requestsData);
      setLoading(false);
    }, (err) => {
      setError('Error al escuchar las solicitudes en tiempo real: ' + err.message);
      setLoading(false);
    });

    // Limpia el listener cuando el componente se desmonta.
    return () => unsubscribe();
  }, [currentUser]);

  // Función para manejar la gestión de una solicitud, mostrando el modal.
  const handleManageRequest = (request) => {
    setSelectedRequest(request);
    setShowModal(true);
  };

  // Función para confirmar la recepción de los activos.
  const handleConfirmReceipt = async () => {
    if (!selectedRequest) return;
    try {
      const batch = writeBatch(db);
      const requestRef = doc(db, 'requests', selectedRequest.id);
      // Actualiza el estado de la solicitud a 'Recibido por el Empleado'.
      batch.update(requestRef, { status: 'Recibido por el Empleado' });

      // Actualiza el estado de los activos a 'Asignado y Recibido' y asigna al empleado.
      selectedRequest.assetIds.forEach(assetId => {
        const assetRef = doc(db, 'assets', assetId);
        batch.update(assetRef, { status: 'Asignado y Recibido', assignedTo: currentUser.uid });
      });

      await batch.commit(); // Ejecuta todas las operaciones del batch.
      setSuccess('Recepción confirmada con éxito.');
      setShowModal(false);
    } catch (err) {
      setError('Error al confirmar la recepción: ' + err.message);
    }
  };

  // Función para rechazar la recepción de los activos.
  const handleRejectReceipt = async () => {
    if (!selectedRequest || !rejectionComments) {
      setError('Debes proporcionar un motivo de rechazo.');
      return;
    }
    try {
      // Se utiliza un batch para realizar múltiples escrituras de forma atómica.
      const batch = writeBatch(db);
      const requestRef = doc(db, 'requests', selectedRequest.id);
      // Actualiza el estado de la solicitud a 'Rechazado' y añade los comentarios.
      batch.update(requestRef, { 
        status: 'Rechazado', 
        comments: rejectionComments 
      });

      // Revierte el estado de los activos a 'disponible'.
      selectedRequest.assetIds.forEach(assetId => {
        const assetRef = doc(db, 'assets', assetId);
        batch.update(assetRef, { status: 'disponible', assignedTo: null });
      });

      await batch.commit(); // Ejecuta todas las operaciones del batch.
      setSuccess('La asignación ha sido rechazada.');
      setShowModal(false);
      setRejectionComments('');
    } catch (err) {
      setError('Error al rechazar la asignación: ' + err.message);
    }
  };

  // Función para obtener los detalles de un activo a partir de su ID.
  const getAssetDetails = (assetId) => {
    return assets.find(asset => asset.id === assetId);
  };

  // Muestra un mensaje de carga mientras se obtienen los datos.
  if (loading) {
    return <Container className="text-center mt-5"><p>Cargando...</p></Container>;
  }

  // Renderizado del componente.
  return (
    <Container fluid>
      <Row className="my-4">
        <Col>
          <h2>Mis Activos Asignados</h2>
          {/* Muestra alertas de error o éxito. */}
          {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
          {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}
        </Col>
      </Row>

      <Card>
        <Card.Header><h5>Mis Solicitudes</h5></Card.Header>
        <Card.Body>
          {/* Tabla para mostrar las solicitudes del empleado. */}
          <Table striped bordered hover responsive size="sm">
            <thead>
              <tr>
                <th>ID de Solicitud</th>
                <th>Activos</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(req => (
                <tr key={req.id}>
                  <td>{req.id}</td>
                  <td>
                    <ul>
                      {/* Mapea los IDs de los activos para mostrar sus detalles. */}
                      {req.assetIds.map(assetId => {
                        const asset = getAssetDetails(assetId);
                        return asset ? <li key={assetId}>{asset.description} (Serial: {asset.serial})</li> : null;
                      })}
                    </ul>
                  </td>
                  <td><Badge bg="primary">{req.status}</Badge></td>
                  <td>
                    {/* Muestra el botón de 'Gestionar Entrega' si el estado es apropiado. */}
                    {(req.status === 'Pendiente de Envío' || req.status === 'En Proceso') && (
                      <Button variant="primary" size="sm" onClick={() => handleManageRequest(req)}>Gestionar Entrega</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* Modal para confirmar o rechazar la entrega de activos. */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Gestionar Entrega de Activos</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <h5>Activos en esta entrega:</h5>
          <ul>
            {selectedRequest?.assetIds.map(assetId => {
              const asset = getAssetDetails(assetId);
              return asset ? <li key={assetId}>{asset.description} (Serial: {asset.serial})</li> : null;
            })}
          </ul>
          <hr />
          <Form.Group className="mb-3">
            <Form.Label>Si rechazas la entrega, por favor explica el motivo:</Form.Label>
            <Form.Control 
              as="textarea" 
              rows={3} 
              value={rejectionComments}
              onChange={(e) => setRejectionComments(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          {/* Botones para rechazar o confirmar la recepción. */}
          <Button variant="danger" onClick={handleRejectReceipt} disabled={!rejectionComments}>Rechazar</Button>
          <Button variant="success" onClick={handleConfirmReceipt}>Confirmar Recibido</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}