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
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';

export default function MasterDashboard() {
  const { currentUser } = useAuth();
  const [assets, setAssets] = useState([]);
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // State for modals
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showCreateAssetModal, setShowCreateAssetModal] = useState(false);
  const [showAssignAssetModal, setShowAssignAssetModal] = useState(false);

  // State for forms
  const [newUser, setNewUser] = useState({ email: '', password: '', nombre: '', apellido: '', role: 'employee' });
  const [newAsset, setNewAsset] = useState({ serial: '', description: '', type: 'pc', status: 'disponible' });
  const [assignment, setAssignment] = useState({ selectedUser: '', selectedAssets: [] });
  const [assetFilter, setAssetFilter] = useState('all');

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

      const requestsSnapshot = await getDocs(query(collection(db, 'requests'), where('requesterId', '==', currentUser.uid)));
      setRequests(requestsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    } catch (err) {
      setError('Error al cargar los datos. ' + err.message);
    }
    setLoading(false);
  }, [currentUser.uid]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    clearMessages();
    console.log("Attempting to create user...");
    if (!newUser.email || !newUser.password || !newUser.nombre || !newUser.role) {
      setError('Por favor, completa todos los campos obligatorios.');
      console.log("Validation failed: Missing required fields.");
      return;
    }
    try {
      const auth = getAuth();
      const userCredential = await createUserWithEmailAndPassword(auth, newUser.email, newUser.password);
      const user = userCredential.user;
      console.log("User created in Firebase Auth:", user.uid);

      // Add user details to Firestore
      await setDoc(doc(db, "users", user.uid), {
        nombre: newUser.nombre,
        apellido: newUser.apellido,
        email: newUser.email,
        email_lowercase: newUser.email.toLowerCase(), // Add this line
        role: newUser.role,
        createdAt: new Date(),
      });
      console.log("User details added to Firestore.");

      setSuccess(`Usuario ${newUser.email} creado con éxito.`);
      setShowCreateUserModal(false);
      setNewUser({ email: '', password: '', nombre: '', apellido: '', role: 'employee' });
      loadData(); // Refresh data
    } catch (err) {
      console.error("Error during user creation:", err);
      setError(`Error al crear usuario: ${err.message}`);
    }
  };

  const handleCreateAsset = async (e) => {
    e.preventDefault();
    clearMessages();
    // ... (existing asset creation logic)
  };

  const handleAssignmentSelection = (assetId) => {
    setAssignment(prev => {
      const selectedAssets = prev.selectedAssets.includes(assetId)
        ? prev.selectedAssets.filter(id => id !== assetId)
        : [...prev.selectedAssets, assetId];
      return { ...prev, selectedAssets };
    });
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    clearMessages();
    if (!assignment.selectedUser || assignment.selectedAssets.length === 0) {
      setError('Debes seleccionar un empleado y al menos un activo.');
      return;
    }

    try {
      const selectedAssetDetails = assets.filter(asset => assignment.selectedAssets.includes(asset.id));
      const allAvailable = selectedAssetDetails.every(asset => asset.status === 'disponible');
      const requestStatus = allAvailable ? 'Pendiente de Envío' : 'Pendiente por Stock';

      // Create new request
      const newRequestRef = await addDoc(collection(db, 'requests'), {
        requesterId: currentUser.uid,
        employeeId: assignment.selectedUser,
        assetIds: assignment.selectedAssets,
        status: requestStatus,
        createdAt: new Date(),
      });

      // If all assets are available, update their status
      if (allAvailable) {
        const batch = writeBatch(db);
        assignment.selectedAssets.forEach(assetId => {
          const assetRef = doc(db, 'assets', assetId);
          batch.update(assetRef, { status: 'asignado', assignedTo: assignment.selectedUser });
        });
        await batch.commit();
        console.log(`NOTIFICACIÓN: Nueva solicitud de asignación (${newRequestRef.id}) creada. Notificar al personal de logística.`);
      } else {
        console.log(`ALERTA: Solicitud (${newRequestRef.id}) creada con stock pendiente. Notificar a todos los actores.`);
      }

      setSuccess(`Solicitud de asignación creada con estado: ${requestStatus}.`);
      setShowAssignAssetModal(false);
      setAssignment({ selectedUser: '', selectedAssets: [] });
      loadData();
    } catch (err) {
      setError(`Error al crear la solicitud: ${err.message}`);
    }
  };

  if (loading) {
    return <Container className="text-center mt-5"><p>Cargando...</p></Container>;
  }

  return (
    <Container fluid>
      <Row className="my-4">
        <Col>
          <h2>Dashboard - Master</h2>
          {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
          {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}
        </Col>
      </Row>

      {/* Action Cards */}
      <Row className="mb-4">
        <Col md={4}>
          <Card>
            <Card.Header>Gestión de Usuarios</Card.Header>
            <Card.Body>
              <Button variant="primary" onClick={() => { console.log("Crear Usuario button clicked."); clearMessages(); setShowCreateUserModal(true); }}>Crear Usuario</Button>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card>
            <Card.Header>Gestión de Activos</Card.Header>
            <Card.Body>
              <Button variant="secondary" onClick={() => { clearMessages(); setShowCreateAssetModal(true); }}>Crear Activo</Button>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card>
            <Card.Header>Asignación de Activos</Card.Header>
            <Card.Body>
              <Button variant="success" onClick={() => { clearMessages(); setShowAssignAssetModal(true); }}>Solicitar Asignación</Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Requests Table */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header><h5>Solicitudes de Asignación</h5></Card.Header>
            <Card.Body>
              <Table striped bordered hover responsive size="sm">
                <thead>
                  <tr>
                    <th>ID de Solicitud</th>
                    <th>Empleado</th>
                    <th>Estado</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map(req => (
                    <tr key={req.id}>
                      <td>{req.id}</td>
                      <td>{users.find(u => u.id === req.employeeId)?.nombre || 'N/A'}</td>
                      <td><Badge bg="info">{req.status}</Badge></td>
                      <td>{req.createdAt.toDate().toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Assets Table */}
      <Row>
        <Col>
          <Card>
            <Card.Header><h5>Activos Registrados</h5></Card.Header>
            <Card.Body>
              {/* Assets table content remains here */}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Modals */}
      {/* Create User Modal */}
      <Modal show={showCreateUserModal} onHide={() => setShowCreateUserModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Crear Nuevo Usuario</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleCreateUser}>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control type="email" value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Contraseña</Form.Label>
              <Form.Control type="password" value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Nombre</Form.Label>
              <Form.Control type="text" value={newUser.nombre} onChange={(e) => setNewUser({...newUser, nombre: e.target.value})} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Apellido</Form.Label>
              <Form.Control type="text" value={newUser.apellido} onChange={(e) => setNewUser({...newUser, apellido: e.target.value})} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Rol</Form.Label>
              <Form.Select value={newUser.role} onChange={(e) => setNewUser({...newUser, role: e.target.value})}>
                <option value="employee">Empleado</option>
                <option value="logistic">Logística</option>
                <option value="master">Master</option>
              </Form.Select>
            </Form.Group>
            <Button variant="primary" type="submit">Crear</Button>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Create Asset Modal */}
      <Modal show={showCreateAssetModal} onHide={() => setShowCreateAssetModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Crear Nuevo Activo</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleCreateAsset}>
            <Form.Group className="mb-3">
              <Form.Label>Serial</Form.Label>
              <Form.Control type="text" value={newAsset.serial} onChange={(e) => setNewAsset({...newAsset, serial: e.target.value})} required />
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
                <option value="other">Otro</option>
              </Form.Select>
            </Form.Group>
            <Button variant="primary" type="submit">Crear Activo</Button>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Assign Asset Modal */}
      <Modal show={showAssignAssetModal} onHide={() => setShowAssignAssetModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Solicitar Asignación de Activo</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleCreateAssignment}>
            <Form.Group className="mb-3">
              <Form.Label>Seleccionar Empleado</Form.Label>
              <Form.Select
                value={assignment.selectedUser}
                onChange={(e) => setAssignment({ ...assignment, selectedUser: e.target.value })}
                required
              >
                <option value="">Selecciona un empleado...</option>
                {users.filter(u => u.role === 'employee').map(user => (
                  <option key={user.id} value={user.id}>{user.nombre} {user.apellido}</option>
                ))}
              </Form.Select>
            </Form.Group>

            <hr />
            <h6>Seleccionar Activos</h6>
            <Form.Group className="mb-3">
              <Form.Label>Filtrar por tipo de activo</Form.Label>
              <Form.Select
                value={assetFilter}
                onChange={(e) => setAssetFilter(e.target.value)}
              >
                <option value="all">Todos</option>
                {[...new Set(assets.map(a => a.type))].map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </Form.Select>
            </Form.Group>
            <Table striped bordered hover responsive size="sm">
              <thead>
                <tr>
                  <th></th>
                  <th>Serial</th>
                  <th>Descripción</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {assets.filter(a => assetFilter === 'all' || a.type === assetFilter).map(asset => (
                  <tr key={asset.id}>
                    <td>
                      <Form.Check
                        type="checkbox"
                        checked={assignment.selectedAssets.includes(asset.id)}
                        onChange={() => handleAssignmentSelection(asset.id)}
                      />
                    </td>
                    <td>{asset.serial}</td>
                    <td>{asset.description}</td>
                    <td><Badge bg="info">{asset.type}</Badge></td>
                    <td>
                      <Badge bg={asset.status === 'disponible' ? 'success' : 'warning'}>
                        {asset.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Button variant="primary" type="submit">Crear Solicitud</Button>
          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
}