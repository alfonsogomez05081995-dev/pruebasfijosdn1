
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
export type AssetType = 'computo' | 'electrica' | 'manual';

export interface Asset {
  id: string;
  name: string;
  serial?: string;
  location?: string;
  status: AssetStatus;
  tipo: AssetType;
  stock?: number;
  employeeId?: string;
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

export const getUsers = async (roleFilter?: Role): Promise<User[]> => {
  const usersRef = collection(db, "users");
  const q = roleFilter ? query(usersRef, where("role", "==", roleFilter)) : usersRef;
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
};

export const updateUser = async (userId: string, updates: Partial<Pick<User, 'name' | 'role'>>): Promise<void> => {
  await updateDoc(doc(db, "users", userId), updates);
};

export const deleteUser = async (userId: string): Promise<void> => {
  await deleteDoc(doc(db, "users", userId));
};

// ------------------- LOGISTICS SERVICES -------------------

export const addAsset = async (assetData: { name: string; serial?: string; location?: string; stock: number; tipo: AssetType }): Promise<void> => {
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

export const getAssignmentRequests = async (): Promise<AssignmentRequest[]> => {
  const requestsRef = collection(db, "assignmentRequests");
  const q = query(requestsRef, where("status", "==", "pendiente de envío"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AssignmentRequest));
};

export const processAssignmentRequest = async (requestId: string): Promise<void> => {
  await updateDoc(doc(db, "assignmentRequests", requestId), { status: 'enviado' });
};

export const getDevolutionProcesses = async (): Promise<DevolutionProcess[]> => {
    const q = query(collection(db, "devolutionProcesses"), where("status", "==", "iniciado"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DevolutionProcess));
};

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

export const getStockAssets = async (): Promise<Asset[]> => {
  const assetsRef = collection(db, "assets");
  const q = query(assetsRef, where("status", "==", "en stock"), where("stock", ">", 0));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
};

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

export const getReplacementRequests = async (): Promise<ReplacementRequest[]> => {
  const q = query(collection(db, "replacementRequests"), where("status", "==", "pendiente"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReplacementRequest));
};

export const updateReplacementRequestStatus = async (id: string, status: ReplacementStatus): Promise<void> => {
  await updateDoc(doc(db, "replacementRequests", id), { status });
};

// ------------------- EMPLOYEE SERVICES -------------------

export const getMyAssignedAssets = async (employeeId: string): Promise<Asset[]> => {
  const q = query(collection(db, "assets"), where("employeeId", "==", employeeId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
};

export const confirmAssetReceipt = async (assetId: string): Promise<void> => {
  await updateDoc(doc(db, "assets", assetId), { status: 'activo' });
};

export const rejectAssetReceipt = async (assetId: string, reason: string): Promise<void> => {
  await updateDoc(doc(db, "assets", assetId), { 
    status: 'en disputa', 
    rejectionReason: reason 
  });
};

export const getAssetById = async (assetId: string): Promise<Asset | null> => {
  const docSnap = await getDoc(doc(db, "assets", assetId));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Asset;
};

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