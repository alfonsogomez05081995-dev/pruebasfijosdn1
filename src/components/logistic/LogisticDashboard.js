import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Table, Badge, Modal, Form, Alert } from 'react-bootstrap';
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  updateDoc,
  doc,
  writeBatch
} from 'firebase/firestore';
import { getAuth } from "firebase/auth";
import { db } from '../../firebase';

export default function LogisticDashboard() {
  const [assets, setAssets] = useState([]);
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // State for modals
  const [showCreateAssetModal, setShowCreateAssetModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // State for new asset form
  const [newAsset, setNewAsset] = useState({
    serial: '',
    description: '',
    type: 'pc',
    status: 'disponible',
    location: '',
  });

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const assetsSnapshot = await getDocs(collection(db, 'assets'));
      setAssets(assetsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const usersSnapshot = await getDocs(collection(db, 'users'));
      setUsers(usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const requestsSnapshot = await getDocs(collection(db, 'requests'));
      setRequests(requestsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    } catch (err) {
      setError('Error al cargar los datos. ' + err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateAsset = async (e) => {
    e.preventDefault();
    clearMessages();

    const serializableTypes = ['pc', 'monitor', 'keyboard', 'mouse', 'herramienta_electrica'];
    const isSerializable = serializableTypes.includes(newAsset.type);

    if (isSerializable && !newAsset.serial) {
      setError('El serial es obligatorio para este tipo de activo.');
      return;
    }
    if (!newAsset.description || !newAsset.type || !newAsset.location) {
      setError('Por favor, completa todos los campos obligatorios (Descripción, Tipo, Ubicación).');
      return;
    }

    try {
      // Check for serial uniqueness if serializable
      if (isSerializable && newAsset.serial) {
        const q = query(collection(db, "assets"), where("serial", "==", newAsset.serial));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setError(`El serial ${newAsset.serial} ya existe. Por favor, verifica.`);
          return;
        }
      }

      await addDoc(collection(db, "assets"), {
        ...newAsset,
        serial: isSerializable ? newAsset.serial : null, // Store null if not serializable
        createdAt: new Date(),
      });
      setSuccess(`Activo ${newAsset.description} (Serial: ${newAsset.serial || 'N/A'}) creado con éxito.`);
      setShowCreateAssetModal(false);
      setNewAsset({ serial: '', description: '', type: 'pc', status: 'disponible', location: '' });
      loadData(); // Refresh data
    } catch (err) {
      setError(`Error al crear el activo: ${err.message}`);
    }
  };

  const handleMarkAsSent = async (request) => {
    try {
      const requestRef = doc(db, 'requests', request.id);
      await updateDoc(requestRef, { status: 'En Proceso' });
      setSuccess(`Solicitud ${request.id} marcada como 'En Proceso'.`);
      loadData();
    } catch (err) {
      setError(`Error al marcar como enviado: ${err.message}`);
    }
  };

  const handleManageStock = (request) => {
    // Placeholder for future stock management logic
    alert(`Gestionar stock para solicitud ${request.id}. (Funcionalidad pendiente)`);
  };

  const getAssetDetails = (assetId) => {
    return assets.find(asset => asset.id === assetId);
  };

  const getUserDetails = (userId) => {
    return users.find(user => user.id === userId);
  };

  if (loading) {
    return <Container className="text-center mt-5"><p>Cargando...</p></Container>;
  }

  const pendingRequests = requests.filter(req => req.status === 'Pendiente de Envío' || req.status === 'Pendiente por Stock' || req.status === 'Rechazado');
  const completedRequests = requests.filter(req => req.status === 'Completada');

  return (
    <Container fluid>
      <Row className="my-4">
        <Col>
          <h2>Dashboard - Logística</h2>
          {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
          {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}
        </Col>
      </Row>

      {/* Gestión de Solicitudes */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header><h5>Gestión de Solicitudes</h5></Card.Header>
            <Card.Body>
              <Table striped bordered hover responsive size="sm">
                <thead>
                  <tr>
                    <th>ID Solicitud</th>
                    <th>Solicitante</th>
                    <th>Empleado Destino</th>
                    <th>Activos</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRequests.map(req => (
                    <tr key={req.id}>
                      <td>{req.id}</td>
                      <td>{getUserDetails(req.requesterId)?.nombre || 'N/A'}</td>
                      <td>{getUserDetails(req.employeeId)?.nombre || 'N/A'}</td>
                      <td>
                        <ul>
                          {req.assetIds.map(assetId => {
                            const asset = getAssetDetails(assetId);
                            return asset ? <li key={assetId}>{asset.description} (Serial: {asset.serial})</li> : null;
                          })}
                        </ul>
                      </td>
                      <td>
                        <Badge bg={req.status === 'Pendiente de Envío' ? 'info' : req.status === 'Pendiente por Stock' ? 'warning' : 'danger'}>
                          {req.status}
                        </Badge>
                        {req.comments && <p className="text-muted">Comentarios: {req.comments}</p>}
                      </td>
                      <td>
                        {req.status === 'Pendiente de Envío' && (
                          <Button variant="success" size="sm" onClick={() => handleMarkAsSent(req)}>Marcar como Enviado</Button>
                        )}
                        {req.status === 'Pendiente por Stock' && (
                          <Button variant="warning" size="sm" onClick={() => handleManageStock(req)}>Gestionar Stock</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Inventario de Activos */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header><h5>Inventario de Activos</h5></Card.Header>
            <Card.Body>
              <Button variant="primary" onClick={() => { clearMessages(); setShowCreateAssetModal(true); }}>Ingresar Nuevo Activo</Button>
              <Table striped bordered hover responsive size="sm" className="mt-3">
                <thead>
                  <tr>
                    <th>Serial</th>
                    <th>Descripción</th>
                    <th>Tipo</th>
                    <th>Estado</th>
                    <th>Asignado a</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map(asset => (
                    <tr key={asset.id}>
                      <td>{asset.serial}</td>
                      <td>{asset.description}</td>
                      <td><Badge bg="info">{asset.type}</Badge></td>
                      <td>
                        <Badge bg={asset.status === 'disponible' ? 'success' : 'warning'}>
                          {asset.status}
                        </Badge>
                      </td>
                      <td>{getUserDetails(asset.assignedTo)?.nombre || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Historial de Asignaciones */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header><h5>Historial de Asignaciones Completadas</h5></Card.Header>
            <Card.Body>
              <Table striped bordered hover responsive size="sm">
                <thead>
                  <tr>
                    <th>ID Solicitud</th>
                    <th>Empleado</th>
                    <th>Activos</th>
                    <th>Fecha Completada</th>
                  </tr>
                </thead>
                <tbody>
                  {completedRequests.map(req => (
                    <tr key={req.id}>
                      <td>{req.id}</td>
                      <td>{getUserDetails(req.employeeId)?.nombre || 'N/A'}</td>
                      <td>
                        <ul>
                          {req.assetIds.map(assetId => {
                            const asset = getAssetDetails(assetId);
                            return asset ? <li key={assetId}>{asset.description} (Serial: {asset.serial})</li> : null;
                          })}
                        </ul>
                      </td>
                      <td>{req.createdAt.toDate().toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Create Asset Modal (reused from MasterDashboard logic) */}
      <Modal show={showCreateAssetModal} onHide={() => setShowCreateAssetModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Ingresar Nuevo Activo</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleCreateAsset}>
            <Form.Group className="mb-3">
              <Form.Label>Serial</Form.Label>
              <Form.Control
                type="text"
                value={newAsset.serial}
                onChange={(e) => setNewAsset({...newAsset, serial: e.target.value})}
                placeholder="Solo para equipos serializados"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Descripción</Form.Label>
              <Form.Control type="text" value={newAsset.description} onChange={(e) => setNewAsset({...newAsset, description: e.target.value})} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Tipo</Form.Label>
              <Form.Select value={newAsset.type} onChange={(e) => setNewAsset({...newAsset, type: e.target.value})}>
                <option value="pc">PC</option>
                <option value="monitor">Monitor</option>
                <option value="keyboard">Teclado</option>
                <option value="mouse">Mouse</option>
                <option value="herramienta_electrica">Herramienta Eléctrica</option>
                <option value="herramienta_manual">Herramienta Manual</option>
                <option value="other">Otro</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Ubicación</Form.Label>
              <Form.Control type="text" value={newAsset.location} onChange={(e) => setNewAsset({...newAsset, location: e.target.value})} required />
            </Form.Group>
            <Button variant="primary" type="submit">Crear Activo</Button>
          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
}