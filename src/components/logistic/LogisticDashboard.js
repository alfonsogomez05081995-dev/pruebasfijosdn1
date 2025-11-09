// Importa las dependencias necesarias de React y React-Bootstrap.
import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Table, Badge, Modal, Form, Alert } from 'react-bootstrap';
// Importa funciones de Firebase Firestore para interactuar con la base de datos.
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  updateDoc,
  doc,
  writeBatch,
  onSnapshot
} from 'firebase/firestore';
// Importa la configuración de la base de datos de Firebase.
import { db } from '../../lib/firebase';

// Define el componente funcional LogisticDashboard.
export default function LogisticDashboard() {
  // Define los estados para almacenar los activos, usuarios, solicitudes, y el estado de la UI.
  const [assets, setAssets] = useState([]); // Almacena la lista de todos los activos.
  const [users, setUsers] = useState([]); // Almacena la lista de todos los usuarios.
  const [requests, setRequests] = useState([]); // Almacena la lista de todas las solicitudes.
  const [loading, setLoading] = useState(true); // Indica si los datos se están cargando.
  const [error, setError] = useState(''); // Almacena mensajes de error.
  const [success, setSuccess] = useState(''); // Almacena mensajes de éxito.

  // Estados para controlar la visibilidad de los modales.
  const [showCreateAssetModal, setShowCreateAssetModal] = useState(false); // Controla el modal de creación de activos.
  const [selectedRequest, setSelectedRequest] = useState(null); // Almacena la solicitud seleccionada (actualmente no se usa pero está para futuras implementaciones).

  // Estado para el formulario de creación de un nuevo activo.
  const [newAsset, setNewAsset] = useState({
    serial: '',
    description: '',
    type: 'pc',
    status: 'disponible',
    location: '',
  });

  // Función para limpiar los mensajes de error y éxito.
  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  // useEffect para configurar listeners de Firestore en tiempo real para activos, usuarios y solicitudes.
  // Esto asegura que el dashboard siempre muestre los datos más actualizados.
  useEffect(() => {
    setLoading(true);

    // Listener para la colección 'assets'.
    const unsubscribeAssets = onSnapshot(collection(db, 'assets'), (snapshot) => {
      setAssets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.error("Error listening to assets:", err);
      setError('Error al cargar activos en tiempo real: ' + err.message);
    });

    // Listener para la colección 'users'.
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.error("Error listening to users:", err);
      setError('Error al cargar usuarios en tiempo real: ' + err.message);
    });

    // Listener para la colección 'requests'.
    const unsubscribeRequests = onSnapshot(collection(db, 'requests'), (snapshot) => {
      console.log("LogisticDashboard: onSnapshot fired for requests!");
      const requestsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log("LogisticDashboard: requestsData from snapshot:", requestsData);
      setRequests(requestsData);
      setLoading(false); // Se considera que los datos principales están listos.
    }, (err) => {
      console.error("LogisticDashboard: Error listening to requests in real-time:", err);
      setError('Error al escuchar las solicitudes en tiempo real: ' + err.message);
      setLoading(false);
    });

    // Función de limpieza para desmontar los listeners cuando el componente se desmonte.
    return () => {
      unsubscribeAssets();
      unsubscribeUsers();
      unsubscribeRequests();
    };
  }, []); // El array vacío asegura que el efecto se ejecute solo una vez (al montar).

  // Maneja la creación de un nuevo activo.
  const handleCreateAsset = async (e) => {
    e.preventDefault(); // Previene el comportamiento por defecto del formulario.
    clearMessages(); // Limpia mensajes previos.

    // Define qué tipos de activos requieren un número de serie.
    const serializableTypes = ['pc', 'monitor', 'keyboard', 'mouse', 'herramienta_electrica'];
    const isSerializable = serializableTypes.includes(newAsset.type);

    // Validaciones del formulario.
    if (isSerializable && !newAsset.serial) {
      setError('El serial es obligatorio para este tipo de activo.');
      return;
    }
    if (!newAsset.description || !newAsset.type || !newAsset.location) {
      setError('Por favor, completa todos los campos obligatorios (Descripción, Tipo, Ubicación).');
      return;
    }

    try {
      // Verifica si el serial ya existe para activos que lo requieren.
      if (isSerializable && newAsset.serial) {
        const q = query(collection(db, "assets"), where("serial", "==", newAsset.serial));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setError(`El serial ${newAsset.serial} ya existe. Por favor, verifica.`);
          return;
        }
      }

      // Añade el nuevo activo a la colección 'assets' en Firestore.
      await addDoc(collection(db, "assets"), {
        ...newAsset,
        serial: isSerializable ? newAsset.serial : null, // Guarda null si no es serializable.
        createdAt: new Date(),
      });
      setSuccess(`Activo ${newAsset.description} (Serial: ${newAsset.serial || 'N/A'}) creado con éxito.`);
      setShowCreateAssetModal(false); // Cierra el modal.
      setNewAsset({ serial: '', description: '', type: 'pc', status: 'disponible', location: '' }); // Resetea el formulario.
      loadData(); // Recarga los datos para mostrar el nuevo activo.
    } catch (err) {
      setError(`Error al crear el activo: ${err.message}`);
    }
  };

  // Marca una solicitud como 'Enviado'.
  const handleMarkAsSent = async (request) => {
    try {
      const requestRef = doc(db, 'requests', request.id);
      await updateDoc(requestRef, { status: 'Enviado' });
      setSuccess(`Solicitud ${request.id} marcada como 'Enviado'.`);
    } catch (err) {
      setError(`Error al marcar como enviado: ${err.message}`);
    }
  };

  // Función placeholder para la gestión de stock (funcionalidad futura).
  const handleManageStock = (request) => {
    alert(`Gestionar stock para solicitud ${request.id}. (Funcionalidad pendiente)`);
  };

  // Obtiene los detalles de un activo por su ID.
  const getAssetDetails = (assetId) => {
    return assets.find(asset => asset.id === assetId);
  };

  // Obtiene los detalles de un usuario por su ID.
  const getUserDetails = (userId) => {
    return users.find(user => user.id === userId);
  };

  // Muestra un mensaje de carga mientras los datos se están obteniendo.
  if (loading) {
    return <Container className="text-center mt-5"><p>Cargando...</p></Container>;
  }

  // Filtra las solicitudes en dos categorías: pendientes de acción y el historial.
  const pendingRequests = requests.filter(
    req => req.status === 'Pendiente de Envío' || req.status === 'Pendiente por Stock'
  );
  const completedRequests = requests.filter(
    req => req.status !== 'Pendiente de Envío' && req.status !== 'Pendiente por Stock'
  );

  // Renderiza el dashboard de logística.
  return (
    <Container fluid>
      <Row className="my-4">
        <Col>
          <h2>Dashboard - Logística</h2>
          {/* Muestra alertas de error o éxito */}
          {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
          {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}
        </Col>
      </Row>

      {/* Sección para la Gestión de Solicitudes Pendientes */}
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

      {/* Sección para el Inventario de Activos */}
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

      {/* Sección para el Historial de Asignaciones Completadas */}
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
                    <th>Estado</th>
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
                      {/* Muestra la fecha de creación de la solicitud */}
                      <td>{req.createdAt.toDate().toLocaleDateString()}</td>
                      <td>
                        <Badge bg={req.status === 'Completada' ? 'success' : 'primary'}>
                          {req.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Modal para crear un nuevo activo */}
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
