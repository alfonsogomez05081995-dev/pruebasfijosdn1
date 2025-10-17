/**
 * @file Este archivo contiene todos los servicios de la aplicación para interactuar con Firebase.
 * Incluye la gestión de usuarios, logística, activos y más.
 */

import { db, storage } from './firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, where, writeBatch, getDoc, Timestamp, runTransaction } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from 'uuid';

// ------------------- TYPE DEFINITIONS -------------------

export type Role = 'master' | 'logistica' | 'empleado';

export interface User {
  id: string; 
  uid?: string; 
  name: string;
  email: string;
  role: Role;
  status: 'invitado' | 'activo';
}

export type AssetStatus = 'activo' | 'recibido pendiente' | 'en devolución' | 'en stock' | 'baja' | 'en disputa';
export type AssetType = 'equipo_computo' | 'herramienta_electrica' | 'herramienta_manual';

export interface Asset {
  id: string;
  reference?: string;
  name: string;
  serial?: string;
  location?: string;
  status: AssetStatus;
  tipo: AssetType;
  stock?: number;
  employeeId?: string;
  employeeUid?: string; // Added for security rules
  employeeName?: string;
  assignedDate?: Timestamp;
  rejectionReason?: string;
}

export type AssignmentStatus = 'pendiente de envío' | 'enviado' | 'pendiente por stock';
export interface AssignmentRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  assetId: string; 
  assetName: string;
  quantity: number;
  date: Timestamp;
  status: AssignmentStatus;
  trackingNumber?: string;
  carrier?: string;
}

export type ReplacementStatus = 'pendiente' | 'aprobado' | 'rechazado';
export interface ReplacementRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  assetId: string;
  assetName: string;
  serial: string;
  reason: string;
  justification: string;
  imageUrl?: string;
  date: Timestamp;
  status: ReplacementStatus;
}

export type DevolutionStatus = 'iniciado' | 'verificado por logística' | 'completado';
export interface DevolutionProcess {
    id: string;
    employeeId: string;
    employeeName: string;
    status: DevolutionStatus;
    date: Timestamp;
    assets: { id: string; name: string; serial?: string; verified: boolean }[];
}

// ------------------- USER MANAGEMENT -------------------

/**
 * Invita a un nuevo usuario al sistema.
 * @param email - El correo electrónico del usuario a invitar.
 * @param role - El rol asignado al usuario.
 * @throws Si el correo electrónico ya ha sido invitado o registrado.
 */
export const inviteUser = async (email: string, role: Role): Promise<void> => {
  const q = query(collection(db, "users"), where("email", "==", email.toLowerCase()));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    throw new Error(`El correo '${email}' ya ha sido invitado o registrado.`);
  }
  await addDoc(collection(db, "users"), {
    email: email.toLowerCase(),
    role: role,
    status: 'invitado',
    name: 'Usuario Pendiente',
  });
};

/**
 * Obtiene una lista de usuarios, opcionalmente filtrada por rol.
 * @param roleFilter - El rol por el cual filtrar los usuarios.
 * @returns Una promesa que se resuelve en un array de objetos de usuario.
 */
export const getUsers = async (roleFilter?: Role): Promise<User[]> => {
  const usersRef = collection(db, "users");
  const q = roleFilter ? query(usersRef, where("role", "==", roleFilter)) : usersRef;
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

export type NewAssetData = {
  reference?: string;
  name: string;
  serial?: string;
  location: string;
  stock: number;
  tipo: AssetType;
};

/**
 * Agrega múltiples activos en un lote.
 * @param assets - Un array de objetos con los datos de los nuevos activos.
 */
export const addAssetsInBatch = async (assets: NewAssetData[]): Promise<void> => {
  const batch = writeBatch(db);

  assets.forEach((assetData) => {
    const newAssetRef = doc(collection(db, "assets"));
    batch.set(newAssetRef, { ...assetData, status: 'en stock' });
  });

  await batch.commit();
};

/**
 * Agrega un nuevo activo al inventario o actualiza el stock si ya existe.
 * @param assetData - Los datos del activo a agregar.
 */
export const addAsset = async (assetData: { reference?: string; name: string; serial?: string; location?: string; stock: number; tipo: AssetType }): Promise<void> => {
  await runTransaction(db, async (transaction) => {
    const stockAssetsQuery = query(collection(db, "assets"), where("name", "==", assetData.name), where("status", "==", "en stock"));
    const stockAssetsSnapshot = await getDocs(stockAssetsQuery);
    
    if (!stockAssetsSnapshot.empty) {
      const assetDoc = stockAssetsSnapshot.docs[0];
      const currentStock = assetDoc.data().stock || 0;
      transaction.update(assetDoc.ref, { stock: currentStock + assetData.stock });
    } else {
      const newAssetRef = doc(collection(db, "assets"));
      transaction.set(newAssetRef, { ...assetData, status: 'en stock' });
    }
  });
};

/**
 * Obtiene todos los activos del inventario.
 * @returns Una promesa que se resuelve en un array de objetos de activo.
 */
export const getInventory = async (): Promise<Asset[]> => {
  const assetsRef = collection(db, "assets");
  const querySnapshot = await getDocs(assetsRef);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
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
 * Obtiene las solicitudes de asignación pendientes de envío.
 * @returns Una promesa que se resuelve en un array de solicitudes de asignación.
 */
export const getAssignmentRequests = async (): Promise<AssignmentRequest[]> => {
  const requestsRef = collection(db, "assignmentRequests");
  const q = query(requestsRef, where("status", "==", "pendiente de envío"));
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
    const isSerializable = ['equipo_computo', 'herramienta_electrica'].includes(stockAssetData.tipo);
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
    });

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
 * Obtiene los activos que están en stock y tienen una cantidad mayor que cero.
 * @returns Una promesa que se resuelve en un array de activos en stock.
 */
export const getStockAssets = async (): Promise<Asset[]> => {
  const assetsRef = collection(db, "assets");
  const q = query(assetsRef, where("status", "==", "en stock"), where("stock", ">", 0));
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
 * Obtiene las solicitudes de reemplazo pendientes.
 * @returns Una promesa que se resuelve en un array de solicitudes de reemplazo.
 */
export const getReplacementRequests = async (): Promise<ReplacementRequest[]> => {
  const q = query(collection(db, "replacementRequests"), where("status", "==", "pendiente"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReplacementRequest));
};

/**
 * Actualiza el estado de una solicitud de reemplazo.
 * @param id - El ID de la solicitud de reemplazo a actualizar.
 * @param status - El nuevo estado de la solicitud.
 */
export const updateReplacementRequestStatus = async (id: string, status: ReplacementStatus): Promise<void> => {
  await updateDoc(doc(db, "replacementRequests", id), { status });
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
 * Confirma la recepción de un activo.
 * @param assetId - El ID del activo a confirmar.
 */
export const confirmAssetReceipt = async (assetId: string): Promise<void> => {
  await updateDoc(doc(db, "assets", assetId), { status: 'activo' });
};

/**
 * Rechaza la recepción de un activo.
 * @param assetId - El ID del activo a rechazar.
 * @param reason - La razón del rechazo.
 */
export const rejectAssetReceipt = async (assetId: string, reason: string): Promise<void> => {
  await updateDoc(doc(db, "assets", assetId), { 
    status: 'en disputa', 
    rejectionReason: reason 
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

    for (const assetDoc of assetsSnapshot.docs) {
        batch.update(assetDoc.ref, { status: 'en devolución' });
        const assetData = assetDoc.data();
        assetsForProcess.push({ 
            id: assetDoc.id, 
            name: assetData.name, 
            serial: assetData.serial || 'N/A',
            verified: false 
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