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

export type AssetStatus = 'activo' | 'recibido pendiente' | 'en devolución' | 'en stock' | 'baja';
export interface Asset {
  id: string;
  name: string;
  serial?: string;
  location?: string;
  status: AssetStatus;
  stock?: number;
  employeeId?: string;
  employeeName?: string;
  assignedDate?: Timestamp;
}

export type AssignmentStatus = 'pendiente de envío' | 'enviado' | 'pendiente por stock';
export interface AssignmentRequest {
  id: string;
  employeeId: string;
  employeeName: string;
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

export const addAsset = async (assetData: { name: string; serial?: string; location?: string; stock: number }): Promise<void> => {
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

// ------------------- MASTER SERVICES -------------------

export const getStockAssets = async (): Promise<Asset[]> => {
  const assetsRef = collection(db, "assets");
  const q = query(assetsRef, where("status", "==", "en stock"), where("stock", ">", 0));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
};

export const sendAssignmentRequest = async (request: Omit<AssignmentRequest, 'id' | 'date' | 'status'>): Promise<void> => {
  await addDoc(collection(db, "assignmentRequests"), {
    ...request,
    date: Timestamp.now(),
    status: 'pendiente de envío'
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

  const { imageFile, ...data } = requestData; // Exclude imageFile from Firestore data

  await addDoc(collection(db, "replacementRequests"), {
    ...data,
    imageUrl,
    date: Timestamp.now(),
    status: 'pendiente'
  });
};