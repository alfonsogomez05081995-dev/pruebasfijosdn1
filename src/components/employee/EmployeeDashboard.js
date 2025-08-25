import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Table, Badge, Modal, Form, Alert } from 'react-bootstrap';
import { collection, getDocs, query, where, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';

export default function EmployeeDashboard() {
  const { currentUser } = useAuth();
  const [requests, setRequests] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectionComments, setRejectionComments] = useState('');

  const loadData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      // Fetch requests for the current user
      const requestsQuery = query(collection(db, 'requests'), where('employeeId', '==', currentUser.uid));
      const requestsSnapshot = await getDocs(requestsQuery);
      const requestsData = requestsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRequests(requestsData);

      // Fetch all assets to get details
      const assetsSnapshot = await getDocs(collection(db, 'assets'));
      const assetsData = assetsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAssets(assetsData);

    } catch (err) {
      setError('Error al cargar los datos. ' + err.message);
    }
    setLoading(false);
  }, [currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleManageRequest = (request) => {
    setSelectedRequest(request);
    setShowModal(true);
  };

  const handleConfirmReceipt = async () => {
    if (!selectedRequest) return;
    try {
      const requestRef = doc(db, 'requests', selectedRequest.id);
      await updateDoc(requestRef, { status: 'Completada' });
      setSuccess('Recepción confirmada con éxito.');
      setShowModal(false);
      loadData();
    } catch (err) {
      setError('Error al confirmar la recepción: ' + err.message);
    }
  };

  const handleRejectReceipt = async () => {
    if (!selectedRequest || !rejectionComments) {
      setError('Debes proporcionar un motivo de rechazo.');
      return;
    }
    try {
      const batch = writeBatch(db);
      const requestRef = doc(db, 'requests', selectedRequest.id);
      batch.update(requestRef, { 
        status: 'Rechazado', 
        comments: rejectionComments 
      });

      // Revert assets to 'disponible'
      selectedRequest.assetIds.forEach(assetId => {
        const assetRef = doc(db, 'assets', assetId);
        batch.update(assetRef, { status: 'disponible', assignedTo: null });
      });

      await batch.commit();
      setSuccess('La asignación ha sido rechazada.');
      setShowModal(false);
      setRejectionComments('');
      loadData();
    } catch (err) {
      setError('Error al rechazar la asignación: ' + err.message);
    }
  };

  const getAssetDetails = (assetId) => {
    return assets.find(asset => asset.id === assetId);
  };

  if (loading) {
    return <Container className="text-center mt-5"><p>Cargando...</p></Container>;
  }

  return (
    <Container fluid>
      <Row className="my-4">
        <Col>
          <h2>Mis Activos Asignados</h2>
          {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
          {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}
        </Col>
      </Row>

      <Card>
        <Card.Header><h5>Mis Solicitudes</h5></Card.Header>
        <Card.Body>
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
                      {req.assetIds.map(assetId => {
                        const asset = getAssetDetails(assetId);
                        return asset ? <li key={assetId}>{asset.description} (Serial: {asset.serial})</li> : null;
                      })}
                    </ul>
                  </td>
                  <td><Badge bg="primary">{req.status}</Badge></td>
                  <td>
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

      {/* Confirmation Modal */}
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
          <Button variant="danger" onClick={handleRejectReceipt} disabled={!rejectionComments}>Rechazar</Button>
          <Button variant="success" onClick={handleConfirmReceipt}>Confirmar Recibido</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
