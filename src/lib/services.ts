/**
 * @file Este archivo contiene todos los servicios de la aplicación para interactuar con Firebase.
 * Incluye la gestión de usuarios, logística, activos y más.
 */

import { db } from './firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, where, writeBatch, getDoc, Timestamp, runTransaction, setDoc, orderBy, arrayUnion, limit, startAfter } from 'firebase/firestore';
import { formatFirebaseTimestamp } from './utils';
import imageCompression from 'browser-image-compression';
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

// Ayudante para agregar un evento al historial de un activo
const addAssetHistoryEvent = (
  transaction: any, // Puede ser una Transacción o un WriteBatch
  assetRef: any, // Pasar la DocumentReference del activo
  event: string,
  description: string,
  actor?: { id: string; name: string }
) => {
  const historyEvent: AssetHistoryEvent = {
    timestamp: Timestamp.now(),
    event,
    description,
    userId: actor?.id || null,
    userName: actor?.name || 'Usuario desconocido',
  };
  // Usar arrayUnion para agregar el nuevo evento al arreglo de historial
  transaction.update(assetRef, {
    history: arrayUnion(historyEvent)
  });
};

// ------------------- GESTIÓN DE USUARIOS -------------------

/**
 * Crea un documento de invitación en la colección 'invitations'.
 * @param email - El correo electrónico del usuario a invitar.
 * @param role - El rol asignado al usuario.
 * @param inviterId - El ID del usuario que realiza la invitación.
 * @throws Si el correo electrónico ya está registrado o ya ha sido invitado.
 */
export const inviteUser = async (email: string, role: Role, inviterId: string): Promise<void> => {
  const lowerCaseEmail = email.toLowerCase();

  // 1. Verificar si el usuario ya existe en la colección principal de usuarios
  const usersQuery = query(collection(db, "users"), where("email", "==", lowerCaseEmail));
  const usersSnapshot = await getDocs(usersQuery);
  if (!usersSnapshot.empty) {
    throw new Error(`El correo '${lowerCaseEmail}' ya está registrado en el sistema.`);
  }

  // 2. Verificar si ya existe una invitación
  const invitationRef = doc(db, "invitations", lowerCaseEmail);
  const invitationSnap = await getDoc(invitationRef);
  if (invitationSnap.exists()) {
    throw new Error(`El correo '${lowerCaseEmail}' ya ha sido invitado.`);
  }

  // 3. Crear el documento de invitación con el correo electrónico como ID
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

// ------------------- SERVICIOS DE LOGÍSTICA -------------------

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
          assetDoc.ref,
          "Actualización de Stock",
          `Stock actualizado. Se añadieron ${assetData.stock} unidades. Nuevo stock: ${currentStock + assetData.stock}.`
        );
      }
    } else { // Si no existe, se crea un nuevo activo
      const newAssetRef = doc(collection(db, "assets"));
      transaction.set(newAssetRef, {
        ...assetData,
        status: 'en stock',
        stock: isSerializable ? 1 : assetData.stock,
        history: [], // Inicializar historial
      });
      addAssetHistoryEvent(
        transaction,
        newAssetRef,
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
    const assetsRef = collection(db, "assets");
    let q;
  
    // 1. Filtrar activos según el rol del usuario
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
        q = query(assetsRef);
        break;
      default:
        return [];
    }
  
    const querySnapshot = await getDocs(q);
    const allAssets = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Asset));
  
    // 2. Separar activos serializados y no serializados
    const serializedAssets: Asset[] = [];
    const nonSerializedAssets: { [reference: string]: Asset } = {};
  
    allAssets.forEach(asset => {
      const isSerializable = ['equipo_de_computo', 'herramienta_electrica'].includes(asset.tipo);
  
      if (isSerializable) {
        // Los activos serializados se tratan como ítems únicos.
        serializedAssets.push(asset);
      } else {
        // Los activos no serializados se agrupan por referencia.
        const ref = asset.reference || asset.name;
        if (!nonSerializedAssets[ref]) {
          nonSerializedAssets[ref] = { ...asset, id: ref, totalStock: 0, assignedTo: [] };
        }
        if (asset.status === 'en stock') {
          nonSerializedAssets[ref].totalStock! += asset.stock || 0;
        } else if (asset.employeeName) {
          nonSerializedAssets[ref].assignedTo!.push({ employeeName: asset.employeeName, quantity: asset.stock || 1 });
        }
      }
    });
  
    // 3. Combinar ambos resultados
    const consolidatedList = Object.values(nonSerializedAssets);
    return [...serializedAssets, ...consolidatedList];
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
  return querySnapshot.docs.map(doc => {
    const data = doc.data() as AssignmentRequest;
    return {
      ...data,
      id: doc.id,
      formattedDate: formatFirebaseTimestamp(data.date),
    };
  });
};


/**
 * Obtiene una lista paginada de todas las solicitudes de asignación.
 * @param pageSize - El número máximo de solicitudes a devolver por página.
 * @param lastVisible - El último documento visible desde el cual comenzar la paginación.
 * @returns Un objeto que contiene la lista de solicitudes y el último documento visible de la página actual.
 */
export const getAllAssignmentRequests = async (
  pageSize: number,
  lastVisible: any = null
): Promise<{ requests: AssignmentRequest[]; lastVisible: any }> => {
  const requestsRef = collection(db, "assignmentRequests");
  
  const queryConstraints: (ReturnType<typeof orderBy> | ReturnType<typeof limit> | ReturnType<typeof startAfter>)[] = [
    orderBy("date", "desc"),
    limit(pageSize)
  ];

  if (lastVisible) {
    queryConstraints.push(startAfter(lastVisible));
  }

  const q = query(requestsRef, ...queryConstraints);

  const querySnapshot = await getDocs(q);
  const requests = querySnapshot.docs.map(doc => {
    const data = doc.data() as AssignmentRequest;
    return {
      ...data,
      id: doc.id,
      formattedDate: formatFirebaseTimestamp(data.date),
      formattedSentDate: formatFirebaseTimestamp(data.sentDate),
    };
  });

  const newLastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
  return { requests, lastVisible: newLastVisible };
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
  actor: { id: string; name: string },
  serialNumber?: string
): Promise<void> => {
  await runTransaction(db, async (transaction) => {
    // 1. Obtener el documento de solicitud
    const requestRef = doc(db, "assignmentRequests", requestId);
    const requestDoc = await transaction.get(requestRef);
    if (!requestDoc.exists()) {
      throw new Error("Solicitud no encontrada.");
    }
    const requestData = requestDoc.data() as Omit<AssignmentRequest, 'id'>;

    // 2. Obtener el documento de usuario del empleado asignado para recuperar su UID
    const userRef = doc(db, "users", requestData.employeeId);
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists() || !userDoc.data()?.uid) {
      throw new Error("El documento del empleado asignado no es válido o no tiene un UID de autenticación.");
    }
    const employeeUid = userDoc.data()?.uid;

    // 3. Obtener el activo de origen del stock
    const stockAssetRef = doc(db, "assets", requestData.assetId);
    const stockAssetDoc = await transaction.get(stockAssetRef);
    if (!stockAssetDoc.exists()) {
      throw new Error("Activo en stock no encontrado.");
    }
    // CORRECCIÓN: Asegurarse de que el activo que se va a asignar esté realmente en stock.
    if (stockAssetDoc.data().status !== 'en stock') {
      throw new Error("Activo en stock no encontrado.");
    }
    const stockAssetData = stockAssetDoc.data();

    // 4. Validar stock y número de serie
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

    // 5. Crear un nuevo documento de activo para el empleado
    const newAssetForEmployeeRef = doc(collection(db, "assets"));
    transaction.set(newAssetForEmployeeRef, {
      name: stockAssetData.name,
      reference: stockAssetData.reference || '',
      tipo: stockAssetData.tipo,
      serial: serialNumber || null,
      status: 'recibido pendiente',
      employeeId: requestData.employeeId,
      employeeUid: employeeUid, // Agregar el UID para las reglas de seguridad
      employeeName: requestData.employeeName,
      assignedDate: Timestamp.now(),
      stock: requestData.quantity, // La cantidad que se asigna al empleado
      originalRequestId: requestId, // <-- Enlace a la solicitud original
      originalReplacementRequestId: requestData.originalReplacementRequestId || null, // <-- Propagar el ID de reemplazo
      history: [], // Inicializar historial
    });

    // Agregar evento de historial para el activo recién creado
    addAssetHistoryEvent(
      transaction,
      newAssetForEmployeeRef,
      "Asignación Creada",
      `Activo enviado a ${requestData.employeeName}. Transportadora: ${carrier}, Guía: ${trackingNumber}.`
    );

    // 6. Disminuir el stock del activo de origen
    transaction.update(stockAssetRef, { stock: currentStock - requestData.quantity });

    // 7. Actualizar la solicitud original para marcarla como enviada
    transaction.update(requestRef, {
      status: 'enviado',
      trackingNumber,
      carrier,
      sentDate: Timestamp.now(), // <-- CORRECCIÓN: Guardar la fecha de envío
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
export const retryAssignment = async (
    requestId: string, 
    trackingNumber: string, 
    carrier: string, 
    actor: { id: string; name: string },
    serialNumber?: string
): Promise<void> => {
    // 1. Encontrar el activo en disputa vinculado a esta solicitud
    const assetsQuery = query(collection(db, "assets"), where("originalRequestId", "==", requestId), where("status", "==", "en disputa"));
    const assetsSnapshot = await getDocs(assetsQuery);

    if (assetsSnapshot.empty) {
        // Este caso idealmente no debería ocurrir si el flujo es correcto
        // Sin embargo, aún podemos intentar actualizar la solicitud.
        // Esto podría suceder si el activo se modificó manualmente.
        console.warn(`No se encontró ningún activo en disputa para la solicitud ${requestId}. Se actualizará la solicitud de todos modos.`);
    }

    await runTransaction(db, async (transaction) => {
        // 2. Actualizar la solicitud original
        const requestRef = doc(db, "assignmentRequests", requestId);
        transaction.update(requestRef, {
            status: 'enviado',
            trackingNumber: trackingNumber,
            carrier: carrier,
            serialNumber: serialNumber || null,
            rejectionReason: ''
        });

        // 3. Actualizar el estado del activo a 'recibido pendiente' si se encuentra
        if (!assetsSnapshot.empty) {
            const assetToUpdateRef = assetsSnapshot.docs[0].ref;
            transaction.update(assetToUpdateRef, {
                status: 'recibido pendiente',
                rejectionReason: '' // Limpiar también el motivo de rechazo en el activo
            });
            addAssetHistoryEvent(
                transaction,
                assetToUpdateRef,
                "Reintento de Envío",
                `Logística reintentó el envío. Nueva guía: ${trackingNumber}, Transportadora: ${carrier}.`,
                actor
            );
        }
    });
};

/**
 * Archiva una solicitud de asignación que no se puede completar.
 * @param requestId El ID de la solicitud a archivar.
 * @param reason El motivo por el cual se archiva.
 */
export const archiveAssignment = async (requestId: string, reason: string): Promise<void> => {
    await runTransaction(db, async (transaction) => {
        const requestRef = doc(db, "assignmentRequests", requestId);
        const requestDoc = await transaction.get(requestRef);

        if (!requestDoc.exists()) {
            throw new Error("La solicitud de asignación no fue encontrada.");
        }
        const requestData = requestDoc.data();

        // 1. Encontrar el activo en disputa asociado a esta solicitud
        const disputedAssetQuery = query(
            collection(db, "assets"),
            where("originalRequestId", "==", requestId),
            where("status", "==", "en disputa")
        );
        const disputedAssetsSnapshot = await getDocs(disputedAssetQuery);

        if (!disputedAssetsSnapshot.empty) {
            const disputedAssetDoc = disputedAssetsSnapshot.docs[0];
            const stockAssetRef = doc(db, "assets", requestData.assetId);
            const stockAssetDoc = await transaction.get(stockAssetRef);

            if (stockAssetDoc.exists()) {
                // 2. Revertir el stock del activo original
                const currentStock = stockAssetDoc.data().stock || 0;
                transaction.update(stockAssetRef, { stock: currentStock + requestData.quantity });
            }

            // 3. Eliminar el activo que estaba "en disputa" ya que nunca se entregó
            transaction.delete(disputedAssetDoc.ref);
        }

        // 4. Actualizar la solicitud original a 'archivado'
        transaction.update(requestRef, {
            status: 'archivado',
            archiveReason: reason
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
    return querySnapshot.docs.map(doc => {
        const data = doc.data() as DevolutionProcess;
        return {
            ...data,
            id: doc.id,
            formattedDate: formatFirebaseTimestamp(data.date),
        };
    });
};

/**
 * Da de baja un activo devuelto, adjuntando una justificación y una imagen de evidencia.
 * @param processId - El ID del proceso de devolución.
 * @param assetId - El ID del activo a dar de baja.
 * @param justification - El motivo para dar de baja el activo.
 * @param imageFile - El archivo de imagen como evidencia.
 * @param actor - El usuario de logística que realiza la acción.
 */
export const decommissionAsset = async (
  processId: string,
  assetId: string,
  justification: string,
  imageFile: File,
  actor: { id: string; name: string }
): Promise<void> => {
  // 1. Comprimir y convertir la imagen a Base64
  const options = {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 800,
    useWebWorker: true,
  };
  const compressedFile = await imageCompression(imageFile, options);
  const imageUrl = await fileToBase64(compressedFile);

  // 2. Ejecutar la transacción en Firestore
  await runTransaction(db, async (transaction) => {
    const processRef = doc(db, "devolutionProcesses", processId);
    const assetRef = doc(db, "assets", assetId);

    const processDoc = await transaction.get(processRef);
    if (!processDoc.exists()) {
      throw new Error("Proceso de devolución no encontrado.");
    }

    // Marcar el activo como verificado/procesado en el documento de devolución
    const processData = processDoc.data() as DevolutionProcess;
    const updatedAssets = processData.assets.map(asset =>
      asset.id === assetId ? { ...asset, verified: true } : asset
    );
    transaction.update(processRef, { assets: updatedAssets });

    // Actualizar el estado del activo a 'baja'
    transaction.update(assetRef, { status: 'baja', stock: 0, employeeId: '', employeeName: '' });

    // Añadir un evento de historial detallado
    addAssetHistoryEvent(
      transaction,
      assetRef,
      "Activo Dado de Baja",
      `Dado de baja por ${actor.name}. Motivo: ${justification}. Evidencia: ${imageUrl.substring(0, 50)}...`,
      actor
    );
  });
};

/**
 * Verifica la devolución de un activo como parte de un proceso de devolución.
 * @param processId - El ID del proceso de devolución.
 * @param assetId - El ID del activo a verificar.
 * @throws Si el proceso de devolución no se encuentra.
 */
export const verifyAssetReturn = async (processId: string, assetId: string): Promise<void> => {
    await runTransaction(db, async (transaction) => {
        // Esta función ahora solo maneja el retorno a stock.
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
        // Se asegura de que el stock sea 1 si es un activo serializable, o se mantiene si no lo es.
        transaction.update(assetRef, { status: 'en stock', employeeId: '', employeeName: '' });

        addAssetHistoryEvent(
            transaction,
            assetRef,
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


// ------------------- SERVICIOS MAESTROS -------------------

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
      // Para cualquier otro rol, devuelve un array vacío ya que no deberían acceder a estos datos de nivel maestro.
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
      masterId: request.masterId, // <-- CORRECCIÓN: Asegurar que el masterId se guarde.
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
    justification: string;
    assignmentType: string;
    masterId: string;
    masterName: string;
  }[]
): Promise<void> => {
  const batch = writeBatch(db);
  const requestsRef = collection(db, "assignmentRequests");

  // Esta implementación asume que el stock ha sido pre-validado en el cliente.
  // Todas las solicitudes se establecen en 'pendiente de envío'.
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
 * Obtiene el historial de solicitudes de asignación para un master específico.
 * @param masterId - El ID del master.
 * @returns Una promesa que se resuelve en un array de solicitudes de asignación.
 */
export const getAssignmentRequestsForMaster = async (masterId: string): Promise<AssignmentRequest[]> => {
  const requestsRef = collection(db, "assignmentRequests");
  const q = query(requestsRef, where("masterId", "==", masterId), orderBy("date", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => {
    const data = doc.data() as AssignmentRequest;
    return {
      ...data,
      id: doc.id,
      formattedDate: formatFirebaseTimestamp(data.date),
    };
  });
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

    // CORRECCIÓN: Buscar un activo genérico en stock que coincida con la referencia del activo a reemplazar.
    const originalAssetRef = doc(db, "assets", requestData.assetId);
    const originalAssetDoc = await transaction.get(originalAssetRef);
    if (!originalAssetDoc.exists()) {
      throw new Error("El activo original a reemplazar no fue encontrado.");
    }
    const originalAssetData = originalAssetDoc.data();

    const stockAssetQuery = query(
      collection(db, "assets"),
      where("reference", "==", originalAssetData.reference),
      where("status", "==", "en stock"),
      where("stock", ">", 0)
    );
    const stockAssetsSnapshot = await getDocs(stockAssetQuery);
    if (stockAssetsSnapshot.empty) {
      throw new Error(`No hay stock disponible para el reemplazo del activo con referencia '${originalAssetData.reference}'.`);
    }
    const stockAssetForReplacement = stockAssetsSnapshot.docs[0]; // Tomar la primera unidad disponible en stock.

    // 1. Actualizar el estado de la solicitud de reemplazo
    transaction.update(requestRef, { status: 'aprobado' });

    // 2. Actualizar el estado del activo original (el dañado)
    transaction.update(originalAssetRef, { status: 'reemplazo_en_logistica' });

    // 3. Crear una nueva solicitud de asignación para logística usando el activo de stock.
    const newAssignmentRef = doc(collection(db, "assignmentRequests"));
    transaction.set(newAssignmentRef, {
      assetName: stockAssetForReplacement.data().name,
      assetId: stockAssetForReplacement.id, // ID del activo genérico en stock
      employeeId: requestData.employeeId,
      employeeName: requestData.employeeName,
      masterId: requestData.masterId,
      quantity: 1, // Los reemplazos son uno a uno
      status: 'pendiente de envío',
      type: 'reemplazo',
      date: Timestamp.now(), // El campo que faltaba
      originalReplacementRequestId: requestId, // <-- Esto es correcto
    });

    // 4. Añadir evento de historial al activo original
    addAssetHistoryEvent(
      transaction,
      originalAssetRef,
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

    // 1. Actualizar el estado de la solicitud
    transaction.update(requestRef, {
      status: 'rechazado',
      rejectionReason: reason,
    });

    // 2. Revertir el estado del activo original a 'activo'
    const assetRef = doc(db, "assets", requestData.assetId);
    transaction.update(assetRef, { status: 'activo' });

    // 2. Agregar evento de historial al activo
    addAssetHistoryEvent(
      transaction,
      assetRef,
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

// ------------------- SERVICIOS PARA EMPLEADOS -------------------

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
    // --- FASE DE LECTURA ---
    // Todas las lecturas deben ocurrir antes que cualquier escritura.
    const newAssetRef = doc(db, "assets", assetId);
    const newAssetDoc = await transaction.get(newAssetRef);

    if (!newAssetDoc.exists()) {
      throw new Error("El activo que intenta confirmar no fue encontrado.");
    }

    const newAssetData = newAssetDoc.data();
    let oldAssetRef: any = null;

    // Si es un reemplazo, leemos la solicitud original para encontrar el activo antiguo.
    if (newAssetData.originalReplacementRequestId) {
      const replacementRequestRef = doc(db, "replacementRequests", newAssetData.originalReplacementRequestId);
      const replacementRequestDoc = await transaction.get(replacementRequestRef);
      if (replacementRequestDoc.exists()) {
        const oldAssetId = replacementRequestDoc.data().assetId;
        oldAssetRef = doc(db, "assets", oldAssetId);
      }
    }

    // --- FASE DE ESCRITURA ---
    // Ahora que todas las lecturas están hechas, podemos escribir.
    transaction.update(newAssetRef, { status: 'activo' });
    addAssetHistoryEvent(transaction, newAssetRef, "Recepción Confirmada", `El empleado ${actor.name} confirmó la recepción del activo.`, actor);

    if (oldAssetRef) {
      transaction.update(oldAssetRef, { status: 'reemplazado' });
      addAssetHistoryEvent(transaction, oldAssetRef, "Activo Reemplazado", `Reemplazado por un nuevo activo.`, actor);
    }
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

    // 3. Agregar evento de historial
    addAssetHistoryEvent(
      transaction,
      assetRef,
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
  // Esta función ahora es reemplazada efectivamente por submitReplacementRequest
  // pero la mantenemos para evitar cambios bruscos si se llama en otro lugar.
  // La nueva lógica está en submitReplacementRequest.
  console.warn("createReplacementRequest está obsoleto. Use submitReplacementRequest en su lugar.");
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
 * Envía una solicitud de reemplazo. Sube una imagen de justificación directamente
 * a Firebase Storage y luego crea el documento de solicitud en Firestore dentro de una transacción.
 * @param requestData - Los datos de la solicitud, incluyendo el archivo de imagen.
 */

// Helper para convertir un archivo a Base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export const submitReplacementRequest = async (
  requestData: Omit<ReplacementRequest, 'id' | 'date' | 'status' | 'imageUrl' | 'masterId'> & { imageFile: File }
): Promise<void> => {
  const { imageFile, ...dataForDb } = requestData;

  if (!imageFile) {
    throw new Error("No se proporcionó ningún archivo de imagen para la justificación.");
  }

  // Paso 1: Comprimir la imagen en el cliente antes de convertirla.
  const options = {
    maxSizeMB: 0.5, // Apuntar a un tamaño máximo de 0.5 MB
    maxWidthOrHeight: 800, // Redimensionar a un máximo de 800px en el lado más largo
    useWebWorker: true, // Usar Web Worker para no bloquear la UI
  };

  let compressedFile;
  try {
    compressedFile = await imageCompression(imageFile, options);
  } catch (error) {
    throw new Error("No se pudo comprimir la imagen. Por favor, intente con otra imagen.");
  }

  // Paso 2: Convertir la imagen comprimida a una cadena Base64.
  const imageUrl = await fileToBase64(compressedFile);

  // Paso 3: Ejecutar la transacción de Firestore, guardando la cadena Base64 en el campo imageUrl.
  await runTransaction(db, async (transaction) => {
    const userRef = doc(db, "users", dataForDb.employeeId);
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists() || !userDoc.data()?.invitedBy) {
      throw new Error("No se pudo encontrar el master asociado a este usuario.");
    }
    const masterId = userDoc.data().invitedBy;

    const newRequestRef = doc(collection(db, "replacementRequests"));
    transaction.set(newRequestRef, { ...dataForDb, masterId, imageUrl, date: Timestamp.now(), status: 'pendiente de aprobacion master' });

    const assetRef = doc(db, "assets", dataForDb.assetId);
    transaction.update(assetRef, { status: 'reemplazo_solicitado' });

    addAssetHistoryEvent(
      transaction,
      assetRef,
      "Solicitud de Reemplazo",
      `Empleado solicitó reemplazo. Motivo: ${dataForDb.reason}`,
      { id: dataForDb.employeeId, name: dataForDb.employeeName }
    );
  });
};

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
        // Agregar evento de historial para cada activo
        addAssetHistoryEvent(
            batch,
            assetDoc.ref,
            "Devolución Iniciada",
            `Empleado ${employeeName} inició el proceso de devolución.`,
            actor
        );
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



// ------------------- SERVICIOS DE HISTORIAL -------------------

/**
 * Obtiene el registro de eventos históricos para un activo específico.
 * @param assetId - El ID del activo.
 * @returns Una promesa que se resuelve en un array de eventos de historial, ordenados por fecha.
 */
export const getAssetHistory = async (assetId: string): Promise<AssetHistoryEvent[]> => {
  const assetRef = doc(db, "assets", assetId);
  const assetDoc = await getDoc(assetRef);
  if (!assetDoc.exists() || !assetDoc.data().history) {
    return [];
  }
  const history = assetDoc.data().history as AssetHistoryEvent[];
  // Ordenar por marca de tiempo descendente y formatear fecha
  return history
    .sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis())
    .map(event => ({
      ...event,
      formattedDate: formatFirebaseTimestamp(event.timestamp),
    }));
};