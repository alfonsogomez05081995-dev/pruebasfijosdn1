/**
 * @file Este archivo contiene todos los servicios de la aplicación para interactuar con Firebase.
 * Incluye la gestión de usuarios, logística, activos y más.
 */

import { db, storage } from './firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, where, writeBatch, getDoc, Timestamp, runTransaction, setDoc, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from 'uuid';
import {
    Role,
    User,
    Asset,
    AssignmentRequest,
    ReplacementRequest,
    DevolutionProcess,
    NewAssetData,
    AssignmentStatus,
    ReplacementStatus,
    AssetType,
    AssetHistoryEvent
} from './types';

export * from './types';

// Helper to add an event to an asset's history subcollection
const addAssetHistoryEvent = (
  transaction: any, // Can be a Transaction or a WriteBatch
  assetId: string,
  event: string,
  description: string,
  actor?: { id: string; name: string }
) => {
  const historyRef = doc(collection(db, `assets/${assetId}/history`));
  const historyEvent: Partial<AssetHistoryEvent> = {
    timestamp: Timestamp.now(),
    event,
    description,
  };
  if (actor) {
    historyEvent.userId = actor.id;
    historyEvent.userName = actor.name;
  }
  transaction.set(historyRef, historyEvent);
};

// ------------------- USER MANAGEMENT -------------------

/**
 * Creates an invitation document in the 'invitations' collection.
 * @param email - The email of the user to invite.
 * @param role - The role assigned to the user.
 * @param inviterId - The ID of the user making the invitation.
 * @throws If the email is already registered or already invited.
 */
export const inviteUser = async (email: string, role: Role, inviterId: string): Promise<void> => {
  const lowerCaseEmail = email.toLowerCase();

  // 1. Check if user already exists in the main users collection
  const usersQuery = query(collection(db, "users"), where("email", "==", lowerCaseEmail));
  const usersSnapshot = await getDocs(usersQuery);
  if (!usersSnapshot.empty) {
    throw new Error(`El correo '${lowerCaseEmail}' ya está registrado en el sistema.`);
  }

  // 2. Check if an invitation already exists
  const invitationRef = doc(db, "invitations", lowerCaseEmail);
  const invitationSnap = await getDoc(invitationRef);
  if (invitationSnap.exists()) {
    throw new Error(`El correo '${lowerCaseEmail}' ya ha sido invitado.`);
  }

  // 3. Create the invitation document with the email as the ID
  await setDoc(invitationRef, {
    role: role,
    invitedBy: inviterId,
    createdAt: Timestamp.now(),
  });
};

/**
 * Obtiene una lista de usuarios, opcionalmente filtrada por rol y/o por quién los invitó.
 * @param roleFilter - El rol por el cual filtrar los usuarios.
 * @param inviterId - El ID del usuario que invitó para filtrar los resultados.
 * @returns Una promesa que se resuelve en un array de objetos de usuario.
 */
export const getUsers = async (roleFilter?: Role, inviterId?: string): Promise<User[]> => {
  const usersRef = collection(db, "users");
  const queryConstraints = [];

  if (roleFilter) {
    queryConstraints.push(where("role", "==", roleFilter));
  }

  if (inviterId) {
    queryConstraints.push(where("invitedBy", "==", inviterId));
  }

  const q = queryConstraints.length > 0 ? query(usersRef, ...queryConstraints) : usersRef;
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
};

/**
 * Actualiza los datos de un usuario específico.
 * @param userId - El ID del usuario a actualizar.
 * @param updates - Un objeto con los campos a actualizar (nombre o rol).
 */
export const updateUser = async (userId: string, updates: Partial<Pick<User, 'name' | 'role'>>): Promise<void> => {
  await updateDoc(doc(db, "users", userId), updates);
};

/**
 * Elimina un usuario del sistema.
 * @param userId - El ID del usuario a eliminar.
 */
export const deleteUser = async (userId: string): Promise<void> => {
  await deleteDoc(doc(db, "users", userId));
};

// ------------------- LOGISTICS SERVICES -------------------

/**
 * Agrega un nuevo activo al inventario o actualiza el stock si ya existe (upsert).
 * La unicidad se determina por el número de serie para activos serializables,
 * o por la referencia para activos no serializables.
 * @param assetData - Los datos del activo a agregar o actualizar.
 */
export const upsertAsset = async (assetData: NewAssetData): Promise<void> => {
  const isSerializable = ['equipo_de_computo', 'herramienta_electrica'].includes(assetData.tipo);
  let stockAssetsQuery;

  if (isSerializable) {
    if (!assetData.serial) {
      throw new Error(`El activo de tipo '${assetData.tipo}' debe tener un número de serie.`);
    }
    if (assetData.stock !== 1) {
        throw new Error(`La cantidad para activos con serial debe ser 1.`);
    }
    stockAssetsQuery = query(collection(db, "assets"), where("serial", "==", assetData.serial));
  } else {
    if (!assetData.reference) {
      throw new Error("El activo debe tener una referencia.");
    }
    stockAssetsQuery = query(
      collection(db, "assets"),
      where("reference", "==", assetData.reference),
      where("status", "==", "en stock")
    );
  }

  const stockAssetsSnapshot = await getDocs(stockAssetsQuery);

  await runTransaction(db, async (transaction) => {
    if (!stockAssetsSnapshot.empty) {
      const assetDoc = stockAssetsSnapshot.docs[0];
      const currentStock = assetDoc.data().stock || 0;
      if (!isSerializable) {
        transaction.update(assetDoc.ref, { stock: currentStock + assetData.stock });
        addAssetHistoryEvent(
          transaction,
          assetDoc.id,
          "Actualización de Stock",
          `Stock actualizado. Se añadieron ${assetData.stock} unidades. Nuevo stock: ${currentStock + assetData.stock}.`
        );
      }
    } else {
      const newAssetRef = doc(collection(db, "assets"));
      transaction.set(newAssetRef, {
        ...assetData,
        status: 'en stock',
        stock: isSerializable ? 1 : assetData.stock,
      });
      addAssetHistoryEvent(
        transaction,
        newAssetRef.id,
        "Creación",
        `Activo creado en stock con ${isSerializable ? `serial ${assetData.serial}` : `referencia ${assetData.reference}`}. Stock inicial: ${isSerializable ? 1 : assetData.stock}.`
      );
    }
  });
};


/**
 * Agrega múltiples activos en un lote, actualizando los existentes.
 * @param assets - Un array de objetos con los datos de los nuevos activos.
 */
export const addAssetsInBatch = async (assets: NewAssetData[]): Promise<void> => {
  // Usamos Promise.all para procesar todos los activos en paralelo.
  // Cada uno usará su propia transacción a través de upsertAsset.
  const promises = assets.map(assetData => upsertAsset(assetData));
  await Promise.all(promises);
};

/**
 * Agrega un nuevo activo al inventario o actualiza el stock si ya existe.
 * @param assetData - Los datos del activo a agregar.
 */
export const addAsset = async (assetData: NewAssetData): Promise<void> => {
    // Simplemente llama a la nueva función upsert
    await upsertAsset(assetData);
};

/**
 * Obtiene todos los activos del inventario, aplicando filtros según el rol del usuario.
 * @param userRole El rol del usuario que realiza la solicitud.
 * @returns Una promesa que se resuelve en un array de objetos de activo.
 */
export const getInventoryItems = async (userRole: Role): Promise<Asset[]> => {
  const assetsRef = collection(db, "assets"); // Corregido: usar la colección "assets"
  let q;

  // La lógica de filtrado ahora es idéntica a getStockAssets para consistencia.
  switch (userRole) {
    case "master_it":
      q = query(assetsRef, where("tipo", "==", "equipo_de_computo"));
      break;
    case "master_campo":
    case "master_depot":
      q = query(assetsRef, where("tipo", "in", ["herramienta_electrica", "herramienta_manual"]));
      break;
    case "logistica":
    case "master":
      // Los roles Master y Logistica pueden ver todos los activos sin filtrar por categoría.
      q = query(assetsRef);
      break;
    default:
      // Para cualquier otro rol, o si no se proporciona un rol, devuelve un array vacío.
      return [];
  }

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Asset));
};

/**
 * Actualiza los datos de un activo específico.
 * @param assetId - El ID del activo a actualizar.
 * @param data - Un objeto con los campos a actualizar.
 */
export const updateAsset = async (assetId: string, data: Partial<Asset>): Promise<void> => {
  const assetRef = doc(db, "assets", assetId);
  await updateDoc(assetRef, data);
};

/**
 * Elimina un activo del inventario.
 * @param assetId - El ID del activo a eliminar.
 */
export const deleteAsset = async (assetId: string): Promise<void> => {
  const assetRef = doc(db, "assets", assetId);
  await deleteDoc(assetRef);
};

/**
 * Obtiene los seriales disponibles para una referencia de activo específica.
 * @param reference - La referencia del activo.
 * @returns Una promesa que se resuelve en un array de strings con los seriales.
 */
export const getAvailableSerials = async (reference: string): Promise<string[]> => {
  const q = query(
    collection(db, "assets"),
    where("reference", "==", reference),
    where("status", "==", "en stock"),
    where("serial", "!=", null)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data().serial as string);
};

/**
 * Obtiene las solicitudes de asignación para el panel de logística.
 * Incluye solicitudes pendientes de envío y las que han sido rechazadas.
 * @returns Una promesa que se resuelve en un array de solicitudes de asignación.
 */
export const getAssignmentRequestsForLogistics = async (): Promise<AssignmentRequest[]> => {
  const requestsRef = collection(db, "assignmentRequests");
  const q = query(requestsRef, where("status", "in", ["pendiente de envío", "rechazado"]));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AssignmentRequest));
};


/**
 * Obtiene todas las solicitudes de asignación, independientemente de su estado.
 * @returns Una promesa que se resuelve en un array de todas las solicitudes de asignación.
 */
export const getAllAssignmentRequests = async (): Promise<AssignmentRequest[]> => {
  const requestsRef = collection(db, "assignmentRequests");
  const querySnapshot = await getDocs(requestsRef);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AssignmentRequest));
};

/**
 * Procesa una solicitud de asignación de activo.
 * @param requestId - El ID de la solicitud a procesar.
 * @param trackingNumber - El número de seguimiento del envío.
 * @param carrier - La empresa de transporte.
 * @param serialNumber - El número de serie del activo (si aplica).
 * @throws Si la solicitud, el usuario o el activo no se encuentran, o si no hay stock suficiente.
 */
export const processAssignmentRequest = async (
  requestId: string, 
  trackingNumber: string, 
  carrier: string, 
  serialNumber?: string
): Promise<void> => {
  await runTransaction(db, async (transaction) => {
    // 1. Get the request document
    const requestRef = doc(db, "assignmentRequests", requestId);
    const requestDoc = await transaction.get(requestRef);
    if (!requestDoc.exists()) {
      throw new Error("Solicitud no encontrada.");
    }
    const requestData = requestDoc.data() as Omit<AssignmentRequest, 'id'>;

    // 2. Get the assigned employee's user document to retrieve their UID
    const userRef = doc(db, "users", requestData.employeeId);
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists() || !userDoc.data()?.uid) {
      throw new Error("El documento del empleado asignado no es válido o no tiene un UID de autenticación.");
    }
    const employeeUid = userDoc.data()?.uid;

    // 3. Get the source asset from stock
    const stockAssetRef = doc(db, "assets", requestData.assetId);
    const stockAssetDoc = await transaction.get(stockAssetRef);
    if (!stockAssetDoc.exists()) {
      throw new Error("Activo en stock no encontrado.");
    }
    const stockAssetData = stockAssetDoc.data();

    // 4. Validate stock and serial number
    const isSerializable = ['equipo_de_computo', 'herramienta_electrica'].includes(stockAssetData.tipo);
    if (isSerializable && !serialNumber) {
      throw new Error("Se requiere un número de serial para este tipo de activo.");
    }
    if (isSerializable && requestData.quantity !== 1) {
      throw new Error("No se puede asignar más de una unidad de un activo con serial en una sola solicitud.");
    }
    const currentStock = stockAssetData.stock || 0;
    if (currentStock < requestData.quantity) {
      throw new Error(`Stock insuficiente. Stock actual: ${currentStock}, Solicitado: ${requestData.quantity}.`);
    }

    // 5. Create a new asset document for the employee
    const newAssetForEmployeeRef = doc(collection(db, "assets"));
    transaction.set(newAssetForEmployeeRef, {
      name: stockAssetData.name,
      reference: stockAssetData.reference || '',
      tipo: stockAssetData.tipo,
      serial: serialNumber || null,
      status: 'recibido pendiente',
      employeeId: requestData.employeeId,
      employeeUid: employeeUid, // Add the UID for security rules
      employeeName: requestData.employeeName,
      assignedDate: Timestamp.now(),
      stock: requestData.quantity, // The quantity being assigned to the employee
      originalRequestId: requestId, // <-- Link to the original request
    });

    // Add history event for the newly created asset
    addAssetHistoryEvent(
      transaction,
      newAssetForEmployeeRef.id,
      "Asignación Creada",
      `Activo enviado a ${requestData.employeeName}. Transportadora: ${carrier}, Guía: ${trackingNumber}.`
    );

    // 6. Decrement the stock of the source asset
    transaction.update(stockAssetRef, { stock: currentStock - requestData.quantity });

    // 7. Update the original request to mark as sent
    transaction.update(requestRef, {
      status: 'enviado',
      trackingNumber,
      carrier,
    });
  });
};




/**
 * Reintenta el envío de una solicitud rechazada.
 * @param requestId El ID de la solicitud a reintentar.
 * @param trackingNumber El nuevo número de guía.
 * @param carrier La nueva transportadora.
 * @param serialNumber El nuevo serial, si aplica.
 */
export const retryAssignment = async (requestId: string, trackingNumber: string, carrier: string, serialNumber?: string): Promise<void> => {
    // 1. Find the disputed asset linked to this request
    const assetsQuery = query(collection(db, "assets"), where("originalRequestId", "==", requestId), where("status", "==", "en disputa"));
    const assetsSnapshot = await getDocs(assetsQuery);

    if (assetsSnapshot.empty) {
        // This case should ideally not happen if the flow is correct
        // However, we can still try to update the request.
        // This could happen if the asset was modified manually.
        console.warn(`No se encontró ningún activo en disputa para la solicitud ${requestId}. Se actualizará la solicitud de todos modos.`);
    }

    await runTransaction(db, async (transaction) => {
        // 2. Update the original request
        const requestRef = doc(db, "assignmentRequests", requestId);
        transaction.update(requestRef, {
            status: 'enviado',
            trackingNumber: trackingNumber,
            carrier: carrier,
            serialNumber: serialNumber || null,
            rejectionReason: ''
        });

        // 3. Update the asset's status back to 'recibido pendiente' if found
        if (!assetsSnapshot.empty) {
            const assetToUpdateRef = assetsSnapshot.docs[0].ref;
            transaction.update(assetToUpdateRef, {
                status: 'recibido pendiente',
                rejectionReason: '' // Clear rejection reason on the asset as well
            });
        }
    });
};

/**
 * Archiva una solicitud de asignación que no se puede completar.
 * @param requestId El ID de la solicitud a archivar.
 * @param reason El motivo por el cual se archiva.
 */
export const archiveAssignment = async (requestId: string, reason: string): Promise<void> => {
    const requestRef = doc(db, "assignmentRequests", requestId);
    await updateDoc(requestRef, {
        status: 'archivado',
        archiveReason: reason
    });
};


/**
 * Obtiene los procesos de devolución iniciados.
 * @returns Una promesa que se resuelve en un array de procesos de devolución.
 */
export const getDevolutionProcesses = async (): Promise<DevolutionProcess[]> => {
    const q = query(collection(db, "devolutionProcesses"), where("status", "==", "iniciado"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DevolutionProcess));
};

/**
 * Verifica la devolución de un activo como parte de un proceso de devolución.
 * @param processId - El ID del proceso de devolución.
 * @param assetId - El ID del activo a verificar.
 * @throws Si el proceso de devolución no se encuentra.
 */
export const verifyAssetReturn = async (processId: string, assetId: string): Promise<void> => {
    await runTransaction(db, async (transaction) => {
        const processRef = doc(db, "devolutionProcesses", processId);
        const assetRef = doc(db, "assets", assetId);

        const processDoc = await transaction.get(processRef);
        if (!processDoc.exists()) {
            throw new Error("Proceso de devolución no encontrado.");
        }

        const processData = processDoc.data() as DevolutionProcess;
        const updatedAssets = processData.assets.map(asset => 
            asset.id === assetId ? { ...asset, verified: true } : asset
        );

        transaction.update(processRef, { assets: updatedAssets });
        transaction.update(assetRef, { status: 'en stock', employeeId: ' ', employeeName: ' ' });

        addAssetHistoryEvent(
            transaction,
            assetId,
            "Devolución Verificada",
            "Logística verificó la devolución del activo. El activo vuelve a estar en stock."
        );
    });
};

/**
 * Completa un proceso de devolución si todos los activos han sido verificados.
 * @param processId - El ID del proceso de devolución a completar.
 * @throws Si el proceso no se encuentra o si no todos los activos han sido verificados.
 */
export const completeDevolutionProcess = async (processId: string): Promise<void> => {
    const processRef = doc(db, "devolutionProcesses", processId);
    const processDoc = await getDoc(processRef);
    if (!processDoc.exists()) {
        throw new Error("Proceso de devolución no encontrado.");
    }
    const processData = processDoc.data() as DevolutionProcess;
    const allVerified = processData.assets.every(asset => asset.verified);

    if (allVerified) {
        await updateDoc(processRef, { status: 'completado' });
    } else {
        throw new Error("No todos los activos han sido verificados.");
    }
};


// ------------------- MASTER SERVICES -------------------

/**
 * Obtiene los activos que están en stock y tienen una cantidad mayor que cero, filtrados por el rol del master.
 * @param role El rol del usuario que realiza la solicitud.
 * @returns Una promesa que se resuelve en un array de activos en stock.
 */
export const getStockAssets = async (role: Role): Promise<Asset[]> => {
  const assetsRef = collection(db, "assets");
  let q;

  const baseQueryConstraints = [where("status", "==", "en stock"), where("stock", ">", 0)];

  switch (role) {
    case 'master_it':
      q = query(assetsRef, ...baseQueryConstraints, where("tipo", "==", "equipo_de_computo"));
      break;
    case 'master_campo':
    case 'master_depot':
      q = query(assetsRef, ...baseQueryConstraints, where("tipo", "in", ["herramienta_electrica", "herramienta_manual"]));
      break;
    case 'logistica':
    case 'master':
      q = query(assetsRef, ...baseQueryConstraints);
      break;
    default:
      // For any other role, return an empty array as they should not be accessing this master-level data.
      return [];
  }

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
};

/**
 * Envía una solicitud de asignación de activo.
 * @param request - Los datos de la solicitud de asignación.
 * @returns Una promesa que se resuelve en un objeto con el estado de la nueva solicitud.
 * @throws Si el activo no se encuentra.
 */
export const sendAssignmentRequest = async (request: Omit<AssignmentRequest, 'id' | 'date' | 'status'>): Promise<{status: AssignmentStatus}> => {
  return await runTransaction(db, async (transaction) => {
    const assetRef = doc(db, "assets", request.assetId);
    const assetDoc = await transaction.get(assetRef);

    if (!assetDoc.exists()) {
      throw new Error("Activo no encontrado.");
    }

    const currentStock = assetDoc.data().stock || 0;
    const newStatus: AssignmentStatus = currentStock >= request.quantity ? 'pendiente de envío' : 'pendiente por stock';

    const newRequestRef = doc(collection(db, "assignmentRequests"));
    transaction.set(newRequestRef, {
      ...request,
      date: Timestamp.now(),
      status: newStatus,
    });

    return { status: newStatus };
  });
};

/**
 * Envía múltiples solicitudes de asignación en un lote.
 * @param requests - Un array de objetos de solicitud de asignación.
 */
export const sendBulkAssignmentRequests = async (
  requests: {
    employeeId: string;
    employeeName: string;
    assetId: string;
    assetName: string;
    quantity: number;
  }[]
): Promise<void> => {
  const batch = writeBatch(db);
  const requestsRef = collection(db, "assignmentRequests");

  // This implementation assumes stock has been pre-validated on the client.
  // All requests are set to 'pendiente de envío'.
  for (const request of requests) {
    const newRequestRef = doc(requestsRef);
    batch.set(newRequestRef, {
      ...request,
      date: Timestamp.now(),
      status: 'pendiente de envío',
    });
  }

  await batch.commit();
};

/**
 * Obtiene las solicitudes de reemplazo pendientes para un master específico.
 * @param masterId - El ID del master.
 * @returns Una promesa que se resuelve en un array de solicitudes de reemplazo.
 */
export const getReplacementRequestsForMaster = async (masterId: string): Promise<ReplacementRequest[]> => {
    const q = query(
        collection(db, "replacementRequests"),
        where("masterId", "==", masterId),
        where("status", "==", "pendiente de aprobacion master")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReplacementRequest));
};

/**
 * Aprueba una solicitud de reemplazo.
 * Esto actualiza el estado de la solicitud, el estado del activo original y crea una nueva solicitud de asignación para logística.
 * @param requestId - El ID de la solicitud de reemplazo a aprobar.
 */
export const approveReplacementRequest = async (requestId: string, actor: { id: string; name: string }): Promise<void> => {
  await runTransaction(db, async (transaction) => {
    const requestRef = doc(db, "replacementRequests", requestId);
    const requestDoc = await transaction.get(requestRef);

    if (!requestDoc.exists()) {
      throw new Error("Solicitud de reemplazo no encontrada.");
    }

    const requestData = requestDoc.data() as ReplacementRequest;

    // 1. Update replacement request status
    transaction.update(requestRef, { status: 'aprobado' });

    // 2. Update the original asset's status
    const assetRef = doc(db, "assets", requestData.assetId);
    transaction.update(assetRef, { status: 'reemplazo_en_logistica' });

    // 3. Create a new assignment request for logistics
    const newAssignmentRef = doc(collection(db, "assignmentRequests"));
    transaction.set(newAssignmentRef, {
      assetName: `Reemplazo para: ${requestData.assetName}`,
      assetId: requestData.assetId, // This is the ID of the asset to be replaced
      employeeId: requestData.employeeId,
      employeeName: requestData.employeeName,
      masterId: requestData.masterId,
      quantity: 1, // Replacements are one-to-one
      status: 'pendiente de envío',
      type: 'reemplazo',
      date: Timestamp.now(),
      originalReplacementRequestId: requestId,
    });

    // 4. Add history event
    addAssetHistoryEvent(
      transaction,
      requestData.assetId,
      "Reemplazo Aprobado",
      `Master ${actor.name} aprobó la solicitud. Pasa a logística.`,
      actor
    );
  });
};

/**
 * Rechaza una solicitud de reemplazo.
 * @param requestId - El ID de la solicitud de reemplazo a rechazar.
 * @param reason - El motivo del rechazo.
 */
export const rejectReplacementRequest = async (requestId: string, reason: string, actor: { id: string; name: string }): Promise<void> => {
  await runTransaction(db, async (transaction) => {
    const requestRef = doc(db, "replacementRequests", requestId);
    const requestDoc = await transaction.get(requestRef);
    if (!requestDoc.exists()) {
      throw new Error("Solicitud de reemplazo no encontrada.");
    }
    const requestData = requestDoc.data() as ReplacementRequest;

    // 1. Update request status
    transaction.update(requestRef, {
      status: 'rechazado',
      rejectionReason: reason,
    });

    // 2. Add history event to the asset
    addAssetHistoryEvent(
      transaction,
      requestData.assetId,
      "Reemplazo Rechazado",
      `Master ${actor.name} rechazó la solicitud. Motivo: ${reason}`,
      actor
    );
  });
};

/**
 * Actualiza el estado de una solicitud de reemplazo (aprobada o rechazada).
 * @param requestId - El ID de la solicitud de reemplazo a actualizar.
 * @param status - El nuevo estado: 'aprobado' or 'rechazado'.
 * @param reason - El motivo del rechazo (solo si el estado es 'rechazado').
 */
export const updateReplacementRequestStatus = async (requestId: string, status: ReplacementStatus, actor: { id: string; name: string }, reason?: string): Promise<void> => {
  if (status === 'aprobado') {
    await approveReplacementRequest(requestId, actor);
  } else if (status === 'rechazado') {
    if (!reason) {
      throw new Error("Se requiere un motivo para rechazar la solicitud.");
    }
    await rejectReplacementRequest(requestId, reason, actor);
  } else {
    // Opcional: manejar otros estados o lanzar un error si el estado no es válido
    throw new Error(`Estado '${status}' no válido para la actualización.`);
  }
};

// ------------------- EMPLOYEE SERVICES -------------------

/**
 * Obtiene todos los activos asignados a un empleado específico.
 * @param employeeId - El ID del empleado.
 * @returns Una promesa que se resuelve en un array de activos asignados.
 */
export const getMyAssignedAssets = async (employeeId: string): Promise<Asset[]> => {
  const q = query(collection(db, "assets"), where("employeeId", "==", employeeId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
};

/**
 * Obtiene las solicitudes de reemplazo pendientes para un empleado específico.
 * @param employeeId - El ID del empleado.
 * @returns Una promesa que se resuelve en un array de solicitudes de reemplazo pendientes.
 */
export const getPendingReplacementRequestsForEmployee = async (employeeId: string): Promise<ReplacementRequest[]> => {
    const q = query(
        collection(db, "replacementRequests"),
        where("employeeId", "==", employeeId),
        where("status", "==", "pendiente de aprobacion master")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReplacementRequest));
};

/**
 * Confirma la recepción de un activo.
 * @param assetId - El ID del activo a confirmar.
 */
export const confirmAssetReceipt = async (assetId: string, actor: { id: string; name: string }): Promise<void> => {
  await runTransaction(db, async (transaction) => {
    const assetRef = doc(db, "assets", assetId);
    transaction.update(assetRef, { status: 'activo' });
    addAssetHistoryEvent(
      transaction,
      assetId,
      "Recepción Confirmada",
      `El empleado ${actor.name} confirmó la recepción del activo.`,
      actor
    );
  });
};

/**
 * Rechaza la recepción de un activo. Esta acción es transaccional.
 * @param assetId El ID del activo que el empleado está rechazando.
 * @param reason La razón del rechazo.
 */
export const rejectAssetReceipt = async (assetId: string, reason: string, actor: { id: string; name: string }): Promise<void> => {
  await runTransaction(db, async (transaction) => {
    const assetRef = doc(db, "assets", assetId);
    const assetDoc = await transaction.get(assetRef);

    if (!assetDoc.exists() || !assetDoc.data().originalRequestId) {
      throw new Error("El activo no es válido o no tiene una solicitud de asignación original.");
    }

    const assetData = assetDoc.data();
    const originalRequestId = assetData.originalRequestId;

    // 1. Actualizar el estado del activo a 'en disputa'
    transaction.update(assetRef, { 
      status: 'en disputa', 
      rejectionReason: reason 
    });

    // 2. Actualizar la solicitud de asignación original a 'rechazado'
    const requestRef = doc(db, "assignmentRequests", originalRequestId);
    transaction.update(requestRef, { 
      status: 'rechazado', 
      rejectionReason: reason 
    });

    // 3. Add history event
    addAssetHistoryEvent(
      transaction,
      assetId,
      "Recepción Rechazada",
      `Rechazado por ${actor.name}. Motivo: ${reason}`,
      actor
    );
  });
};

/**
 * Crea una nueva solicitud de reemplazo para la aprobación del master.
 * @param employeeId - El ID del empleado que realiza la solicitud.
 * @param assetId - El ID del activo a reemplazar.
 * @param reason - El motivo del reemplazo.
 * @throws Si el empleado o el activo no se encuentran, o si el empleado no tiene un master asociado.
 */
export const createReplacementRequest = async (employeeId: string, assetId: string, reason: string): Promise<void> => {
  await runTransaction(db, async (transaction) => {
    // --- ALL READS FIRST ---

    // 1. Read user document
    const userRef = doc(db, "users", employeeId);
    const userDoc = await transaction.get(userRef);

    if (!userDoc.exists()) {
      throw new Error("Usuario empleado no encontrado.");
    }
    const employeeData = userDoc.data();

    // 2. Read asset document
    const assetRef = doc(db, "assets", assetId);
    const assetDoc = await transaction.get(assetRef);

    if (!assetDoc.exists()) {
      throw new Error("Activo no encontrado.");
    }
    const assetData = assetDoc.data();

    // 3. Conditionally read invitation document if needed
    let masterId = employeeData.masterId;
    let invitationDoc = null; // Keep track of the invitation doc if we read it
    if (!masterId && !employeeData.invitedBy) {
      const invitationRef = doc(db, "invitations", employeeData.email.toLowerCase());
      invitationDoc = await transaction.get(invitationRef);
    }

    // --- ALL WRITES LAST ---

    // Now, determine the masterId and perform writes.
    let masterIdFound = employeeData.masterId;
    let needsUserUpdate = false;

    if (!masterIdFound) {
      if (employeeData.invitedBy) {
        masterIdFound = employeeData.invitedBy;
        needsUserUpdate = true;
      } else if (invitationDoc && invitationDoc.exists()) {
        masterIdFound = invitationDoc.data().invitedBy;
        needsUserUpdate = true;
      } else {
        throw new Error("No se pudo encontrar el master asociado a este usuario. Ni 'masterId', ni 'invitedBy' en el perfil del usuario, ni una invitación original fueron encontrados.");
      }
    }

    // Perform user update if we discovered the masterId in this transaction
    if (needsUserUpdate) {
      transaction.update(userRef, { masterId: masterIdFound });
    }

    // Create the new replacement request
    const newRequestRef = doc(collection(db, "replacementRequests"));
    transaction.set(newRequestRef, {
      employeeId: employeeId,
      employeeName: employeeData.name || 'N/A',
      masterId: masterIdFound,
      assetId: assetId,
      assetName: assetData.name || 'N/A',
      serial: assetData.serial || 'N/A',
      reason: reason,
      justification: '',
      imageUrl: '',
      date: Timestamp.now(),
      status: 'pendiente de aprobacion master',
    });

    // Add history event to the asset
    addAssetHistoryEvent(
      transaction,
      assetId,
      "Solicitud de Reemplazo",
      `Empleado solicitó reemplazo. Motivo: ${reason}`,
      { id: employeeId, name: employeeData.name || 'N/A' }
    );
  });
};

/**
 * Obtiene un activo por su ID.
 * @param assetId - El ID del activo a obtener.
 * @returns Una promesa que se resuelve en el objeto del activo o null si no se encuentra.
 */
export const getAssetById = async (assetId: string): Promise<Asset | null> => {
  const docSnap = await getDoc(doc(db, "assets", assetId));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Asset;
};

/**
 * Envía una solicitud de reemplazo de activo.
 * @param requestData - Los datos de la solicitud, incluyendo opcionalmente un archivo de imagen.
 */
export const submitReplacementRequest = async (requestData: Omit<ReplacementRequest, 'id' | 'date' | 'status' | 'imageUrl'> & { imageFile?: File }): Promise<void> => {
  let imageUrl = '';
  if (requestData.imageFile) {
    const storageRef = ref(storage, `justifications/${uuidv4()}-${requestData.imageFile.name}`);
    const snapshot = await uploadBytes(storageRef, requestData.imageFile);
    imageUrl = await getDownloadURL(snapshot.ref);
  }

  const { imageFile, ...data } = requestData;

  await addDoc(collection(db, "replacementRequests"), {
    ...data,
    imageUrl,
    date: Timestamp.now(),
    status: 'pendiente'
  });
};

/**
 * Inicia el proceso de devolución de todos los activos de un empleado.
 * @param employeeId - El ID del empleado que inicia la devolución.
 * @param employeeName - El nombre del empleado.
 * @throws Si el empleado no tiene activos para devolver.
 */
export const initiateDevolutionProcess = async (employeeId: string, employeeName: string): Promise<void> => {
    const assetsToReturnQuery = query(collection(db, "assets"), where("employeeId", "==", employeeId), where("status", "==", "activo"));
    const assetsSnapshot = await getDocs(assetsToReturnQuery);

    if (assetsSnapshot.empty) {
        throw new Error("No tienes activos con estado 'activo' para devolver.");
    }

    const batch = writeBatch(db);
    const assetsForProcess = [];
    const actor = { id: employeeId, name: employeeName };

    for (const assetDoc of assetsSnapshot.docs) {
        batch.update(assetDoc.ref, { status: 'en devolución' });
        const assetData = assetDoc.data();
        assetsForProcess.push({
            id: assetDoc.id,
            name: assetData.name,
            serial: assetData.serial || 'N/A',
            verified: false
        });
        // Add history event for each asset
        const historyRef = doc(collection(db, `assets/${assetDoc.id}/history`));
        batch.set(historyRef, {
            timestamp: Timestamp.now(),
            event: "Devolución Iniciada",
            description: `Empleado ${employeeName} inició el proceso de devolución.`,
            userId: actor.id,
            userName: actor.name
        });
    }

    const devolutionRef = doc(collection(db, "devolutionProcesses"));
    batch.set(devolutionRef, {
        employeeId,
        employeeName,
        assets: assetsForProcess,
        status: 'iniciado',
        date: Timestamp.now(),
    });

    await batch.commit();
};



// ------------------- HISTORY SERVICES -------------------

/**
 * Gets the historical event log for a specific asset.
 * @param assetId - The ID of the asset.
 * @returns A promise that resolves to an array of history events, ordered by date.
 */
export const getAssetHistory = async (assetId: string): Promise<AssetHistoryEvent[]> => {
  const historyRef = collection(db, `assets/${assetId}/history`);
  const q = query(historyRef, orderBy("timestamp", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AssetHistoryEvent));
};