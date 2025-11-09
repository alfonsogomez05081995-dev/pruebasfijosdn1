// Importaciones necesarias de React, React Bootstrap y Firebase.
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
import { db } from '../../lib/firebase'; // Asegúrate de que la ruta a tu configuración de Firebase sea correcta.
import { useAuth } from '../../contexts/AuthContext'; // Hook para acceder al contexto de autenticación.

// Componente principal del Dashboard para el rol 'Master'.
export default function MasterDashboard() {
  // Hook para obtener el usuario actual del contexto de autenticación.
  const { currentUser } = useAuth();
  
  // Estados para almacenar los datos de la aplicación.
  const [assets, setAssets] = useState([]); // Lista de todos los activos.
  const [users, setUsers] = useState([]); // Lista de todos los usuarios.
  const [requests, setRequests] = useState([]); // Lista de solicitudes de asignación.
  
  // Estados para la UI y manejo de errores/éxito.
  const [loading, setLoading] = useState(true); // Indica si los datos se están cargando.
  const [error, setError] = useState(''); // Mensajes de error.
  const [success, setSuccess] = useState(''); // Mensajes de éxito.

  // Estados para controlar la visibilidad de los modales.
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showCreateAssetModal, setShowCreateAssetModal] = useState(false);
  const [showAssignAssetModal, setShowAssignAssetModal] = useState(false);

  // Estados para los datos de los formularios.
  const [newUser, setNewUser] = useState({ email: '', password: '', nombre: '', apellido: '', role: 'employee' });
  const [newAsset, setNewAsset] = useState({ serial: '', description: '', type: 'pc', status: 'disponible' });
  const [assignment, setAssignment] = useState({ selectedUser: '', selectedAssets: [] });
  const [assetFilter, setAssetFilter] = useState('all'); // Filtro para la tabla de activos en el modal de asignación.

  // Función para limpiar los mensajes de error y éxito.
  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  // Carga los datos iniciales (activos, usuarios, solicitudes) desde Firestore.
  // useCallback memoriza la función para evitar recrearla en cada render, optimizando el rendimiento.
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Cargar activos.
      const assetsSnapshot = await getDocs(collection(db, 'assets'));
      setAssets(assetsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Cargar usuarios.
      const usersSnapshot = await getDocs(collection(db, 'users'));
      setUsers(usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Cargar solicitudes creadas por el usuario actual.
      const requestsSnapshot = await getDocs(query(collection(db, 'requests'), where('requesterId', '==', currentUser.uid)));
      setRequests(requestsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    } catch (err) {
      setError('Error al cargar los datos. ' + err.message);
    }
    setLoading(false);
  }, [currentUser.uid]); // La dependencia currentUser.uid asegura que la función se recree si el usuario cambia.

  // useEffect se ejecuta después del primer render y cada vez que `loadData` cambia.
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Maneja la creación de un nuevo usuario.
  const handleCreateUser = async (e) => {
    e.preventDefault(); // Previene el comportamiento por defecto del formulario.
    clearMessages();
    console.log("Intentando crear usuario...");
    // Validación simple de campos.
    if (!newUser.email || !newUser.password || !newUser.nombre || !newUser.role) {
      setError('Por favor, completa todos los campos obligatorios.');
      console.log("Validación fallida: Faltan campos requeridos.");
      return;
    }
    try {
      const auth = getAuth();
      // Crea el usuario en Firebase Authentication.
      const userCredential = await createUserWithEmailAndPassword(auth, newUser.email, newUser.password);
      const user = userCredential.user;
      console.log("Usuario creado en Firebase Auth:", user.uid);

      // Guarda los detalles adicionales del usuario en Firestore.
      await setDoc(doc(db, "users", user.uid), {
        nombre: newUser.nombre,
        apellido: newUser.apellido,
        email: newUser.email,
        email_lowercase: newUser.email.toLowerCase(), // Campo en minúsculas para búsquedas insensibles a mayúsculas.
        role: newUser.role,
        createdAt: new Date(),
      });
      console.log("Detalles del usuario añadidos a Firestore.");

      setSuccess(`Usuario ${newUser.email} creado con éxito.`);
      setShowCreateUserModal(false); // Cierra el modal.
      setNewUser({ email: '', password: '', nombre: '', apellido: '', role: 'employee' }); // Resetea el formulario.
      loadData(); // Recarga los datos para mostrar el nuevo usuario.
    } catch (err) {
      console.error("Error durante la creación del usuario:", err);
      setError(`Error al crear usuario: ${err.message}`);
    }
  };

  // Maneja la creación de un nuevo activo (lógica pendiente de implementación).
  const handleCreateAsset = async (e) => {
    e.preventDefault();
    clearMessages();
    // Aquí iría la lógica para añadir un nuevo activo a la colección 'assets' en Firestore.
    // Por ejemplo: await addDoc(collection(db, 'assets'), newAsset);
    console.log("Funcionalidad de crear activo no implementada.", newAsset);
    // Deberías añadir manejo de éxito y error, y recargar los datos.
  };

  // Maneja la selección y deselección de activos en el modal de asignación.
  const handleAssignmentSelection = (assetId) => {
    setAssignment(prev => {
      const selectedAssets = prev.selectedAssets.includes(assetId)
        ? prev.selectedAssets.filter(id => id !== assetId) // Deseleccionar
        : [...prev.selectedAssets, assetId]; // Seleccionar
      return { ...prev, selectedAssets };
    });
  };

  // Maneja la creación de una nueva solicitud de asignación.
  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    clearMessages();
    if (!assignment.selectedUser || assignment.selectedAssets.length === 0) {
      setError('Debes seleccionar un empleado y al menos un activo.');
      return;
    }

    try {
      // Comprueba la disponibilidad de los activos seleccionados.
      const selectedAssetDetails = assets.filter(asset => assignment.selectedAssets.includes(asset.id));
      const allAvailable = selectedAssetDetails.every(asset => asset.status === 'disponible');
      const requestStatus = allAvailable ? 'Pendiente de Envío' : 'Pendiente por Stock';

      // Crea el documento de la solicitud en Firestore.
      const newRequestRef = await addDoc(collection(db, 'requests'), {
        requesterId: currentUser.uid, // Quién crea la solicitud (el Master).
        employeeId: assignment.selectedUser, // Para quién es la solicitud.
        assetIds: assignment.selectedAssets, // Qué activos se solicitan.
        status: requestStatus,
        createdAt: new Date(),
      });

      // Si todos los activos están disponibles, actualiza su estado a 'asignado' en un lote.
      if (allAvailable) {
        const batch = writeBatch(db);
        assignment.selectedAssets.forEach(assetId => {
          const assetRef = doc(db, 'assets', assetId);
          batch.update(assetRef, { status: 'asignado', assignedTo: assignment.selectedUser });
        });
        await batch.commit();
        console.log(`NOTIFICACIÓN: Nueva solicitud de asignación (${newRequestRef.id}) creada. Notificar al personal de logística.`);
      } else {
        // Si no, solo se crea la solicitud pero no se actualizan los activos.
        console.log(`ALERTA: Solicitud (${newRequestRef.id}) creada con stock pendiente. Notificar a todos los actores.`);
      }

      setSuccess(`Solicitud de asignación creada con estado: ${requestStatus}.`);
      setShowAssignAssetModal(false);
      setAssignment({ selectedUser: '', selectedAssets: [] }); // Resetea el formulario de asignación.
      loadData(); // Recarga todos los datos.
    } catch (err) {
      setError(`Error al crear la solicitud: ${err.message}`);
    }
  };

  // Muestra un mensaje de carga mientras los datos no están listos.
  if (loading) {
    return <Container className="text-center mt-5"><p>Cargando...</p></Container>;
  }

  // Renderizado del componente.
  return (
    <Container fluid>
      {/* Encabezado y alertas */}
      <Row className="my-4">
        <Col>
          <h2>Dashboard - Master</h2>
          {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
          {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}
        </Col>
      </Row>

      {/* Tarjetas de Acciones Rápidas */}
      <Row className="mb-4">
        <Col md={4}>
          <Card>
            <Card.Header>Gestión de Usuarios</Card.Header>
            <Card.Body>
              <Button variant="primary" onClick={() => { console.log("Botón 'Crear Usuario' clickeado."); clearMessages(); setShowCreateUserModal(true); }}>Crear Usuario</Button>
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

      {/* Tabla de Solicitudes de Asignación */}
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

      {/* Tabla de Activos Registrados (Contenido pendiente) */}
      <Row>
        <Col>
          <Card>
            <Card.Header><h5>Activos Registrados</h5></Card.Header>
            <Card.Body>
              {/* Aquí se podría mostrar una tabla con todos los activos, similar a la de solicitudes. */}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Modales */}
      
      {/* Modal para Crear Usuario */}
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

      {/* Modal para Crear Activo */}
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

      {/* Modal para Asignar Activo */}
      <Modal show={showAssignAssetModal} onHide={() => setShowAssignAssetModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Solicitar Asignación de Activo</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleCreateAssignment}>
            {/* Selección de Empleado */}
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
            {/* Filtro de Activos */}
            <Form.Group className="mb-3">
              <Form.Label>Filtrar por tipo de activo</Form.Label>
              <Form.Select
                value={assetFilter}
                onChange={(e) => setAssetFilter(e.target.value)}
              >
                <option value="all">Todos</option>
                {/* Crea opciones de filtro basadas en los tipos de activos existentes */}
                {[...new Set(assets.map(a => a.type))].map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </Form.Select>
            </Form.Group>
            {/* Tabla de Activos para Selección */}
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