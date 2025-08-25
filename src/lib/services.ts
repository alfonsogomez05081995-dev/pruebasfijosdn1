
import { db, storage } from './firebase';
import { collection, addDoc, getDocs, doc, updateDoc, query, where, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

// Tipos
export interface Asset {
  id?: string;
  name: string;
  serial: string;
  assignedDate: string;
  status: 'Activo' | 'Recibido pendiente' | 'En devolución';
  employeeId?: string;
  employeeName?: string;
}

export interface AssignmentRequest {
  id?: string;
  employee: string;
  asset: string;
  quantity: number;
  date: string;
  status: 'Pendiente' | 'Enviado' | 'Enviado Parcial';
}

export interface ReplacementRequest {
  id?: string;
  employee: string;
  employeeId: string;
  asset: string;
  assetId: string;
  serial: string;
  reason: string;
  justification: string;
  imageUrl?: string;
  date: string;
  status: 'Pendiente' | 'Aprobado' | 'Rechazado';
}

// ------ Master Services ------

export const sendAssignmentRequest = async (request: Omit<AssignmentRequest, 'id' | 'date' | 'status'>) => {
  const newRequest: AssignmentRequest = {
    ...request,
    date: new Date().toISOString().split('T')[0],
    status: 'Pendiente',
  };
  const docRef = await addDoc(collection(db, 'assignmentRequests'), newRequest);
  return { id: docRef.id, ...newRequest };
};

export const getReplacementRequests = async (): Promise<ReplacementRequest[]> => {
  const q = query(collection(db, 'replacementRequests'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReplacementRequest));
};

export const updateReplacementRequestStatus = async (id: string, status: 'Aprobado' | 'Rechazado') => {
  const requestRef = doc(db, 'replacementRequests', id);
  await updateDoc(requestRef, { status });
};


// ------ Logistica Services ------

export const addAsset = async (asset: { serial: string; description: string; location: string; }) => {
  const newAsset = {
    name: asset.description,
    serial: asset.serial,
    location: asset.location,
    status: 'En stock', // Status inicial
  };
  const docRef = await addDoc(collection(db, 'assets'), newAsset);
  return { id: docRef.id, ...newAsset };
};

export const getAssignmentRequests = async (): Promise<AssignmentRequest[]> => {
    const q = query(collection(db, 'assignmentRequests'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AssignmentRequest));
};

export const processAssignmentRequest = async (id: string) => {
    const requestRef = doc(db, 'assignmentRequests', id);
    await updateDoc(requestRef, { status: 'Enviado' });
};


// ------ Empleado Services ------

export const getMyAssignedAssets = async (employeeId: string): Promise<Asset[]> => {
    const q = query(collection(db, 'assets'), where('employeeId', '==', employeeId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
};

export const confirmAssetReceipt = async (id: string) => {
    const assetRef = doc(db, 'assets', id);
    await updateDoc(assetRef, { status: 'Activo' });
};

export const submitReplacementRequest = async (requestData: Omit<ReplacementRequest, 'id' | 'date' | 'status' | 'imageUrl'> & { imageFile?: File }) => {
    let imageUrl = '';
    if (requestData.imageFile) {
        const imageRef = ref(storage, `justifications/${uuidv4()}`);
        const snapshot = await uploadBytes(imageRef, requestData.imageFile);
        imageUrl = await getDownloadURL(snapshot.ref);
    }

    const newRequest: Omit<ReplacementRequest, 'id'> = {
        ...requestData,
        imageUrl,
        date: new Date().toISOString().split('T')[0],
        status: 'Pendiente',
    };
    const docRef = await addDoc(collection(db, 'replacementRequests'), newRequest);
    return { id: docRef.id, ...newRequest };
};

export const getAssetById = async (id: string): Promise<Asset | null> => {
    const assetRef = doc(db, 'assets', id);
    const assetSnap = await getDoc(assetRef);
    if (assetSnap.exists()) {
        return { id: assetSnap.id, ...assetSnap.data() } as Asset;
    } else {
        return null;
    }
};

