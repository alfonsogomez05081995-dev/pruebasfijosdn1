
import { db, storage } from './firebase';
import { collection, addDoc, getDocs, doc, updateDoc, query, where, getDoc, runTransaction, DocumentData } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { User } from '@/hooks/use-auth';

// Tipos
export interface Asset extends DocumentData {
  id?: string;
  name: string;
  serial: string;
  location?: string;
  assignedDate?: string;
  status: 'Activo' | 'Recibido pendiente' | 'En devolución' | 'En stock' | 'Baja';
  employeeId?: string;
  employeeName?: string;
  stock?: number;
}

export interface AssignmentRequest {
  id?: string;
  employeeId: string;
  employeeName: string;
  assetId: string;
  assetName: string;
  quantity: number;
  date: string;
  status: 'Pendiente de Envío' | 'Enviado' | 'Enviado Parcial' | 'Pendiente por Stock';
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

// ------ Generic Services ------
export const getUsers = async (role: 'Master' | 'Logistica' | 'Empleado'): Promise<User[]> => {
    // This is a mock implementation. In a real app, you'd query a 'users' collection.
    const mockUsers: User[] = [
        { id: '1', name: 'Luis G.', email: 'luisgm.ldv@gmail.com', role: 'Master' },
        { id: '2', name: 'Usuario de Logística', email: 'logistica@empresa.com', role: 'Logistica' },
        { id: '3', name: 'Usuario Empleado', email: 'empleado@empresa.com', role: 'Empleado' },
    ];
    return mockUsers.filter(u => u.role === role);
}

export const getAssetById = async (id: string): Promise<Asset | null> => {
    const assetRef = doc(db, 'assets', id);
    const assetSnap = await getDoc(assetRef);
    if (assetSnap.exists()) {
        return { id: assetSnap.id, ...assetSnap.data() } as Asset;
    } else {
        return null;
    }
};

// ------ Master Services ------
export const sendAssignmentRequest = async (request: Omit<AssignmentRequest, 'id' | 'date' | 'status'>) => {
  return await runTransaction(db, async (transaction) => {
    const assetRef = doc(db, "assets", request.assetId);
    const assetDoc = await transaction.get(assetRef);

    if (!assetDoc.exists()) {
      throw new Error("Asset not found!");
    }

    const assetData = assetDoc.data() as Asset;
    const currentStock = assetData.stock || 0;
    const hasEnoughStock = currentStock >= request.quantity;
    
    const newStatus = hasEnoughStock ? 'Pendiente de Envío' : 'Pendiente por Stock';

    const newRequest: Omit<AssignmentRequest, 'id'> = {
      ...request,
      date: new Date().toISOString().split('T')[0],
      status: newStatus,
    };

    const docRef = await addDoc(collection(db, 'assignmentRequests'), newRequest);
    
    return { id: docRef.id, ...newRequest };
  });
};


export const getReplacementRequests = async (): Promise<ReplacementRequest[]> => {
  const q = query(collection(db, 'replacementRequests'), where('status', '==', 'Pendiente'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReplacementRequest));
};

export const updateReplacementRequestStatus = async (id: string, status: 'Aprobado' | 'Rechazado') => {
  const requestRef = doc(db, 'replacementRequests', id);
  await updateDoc(requestRef, { status });
};


// ------ Logistica Services ------
export const addAsset = async (asset: { serial: string; description: string; location: string; stock: number }) => {
  const newAsset = {
    name: asset.description,
    serial: asset.serial,
    location: asset.location,
    stock: asset.stock,
    status: 'En stock', 
  };
  const docRef = await addDoc(collection(db, 'assets'), newAsset);
  return { id: docRef.id, ...newAsset };
};

export const getStockAssets = async (): Promise<Asset[]> => {
    const q = query(collection(db, 'assets'), where('status', '==', 'En stock'), where('stock', '>', 0));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
};

export const getAssignmentRequests = async (): Promise<AssignmentRequest[]> => {
    const q = query(collection(db, 'assignmentRequests'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AssignmentRequest));
};

export const processAssignmentRequest = async (id: string) => {
  // This needs a more complex transaction in a real app to decrement stock
  // and assign the asset to the user. For now, just updates status.
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

    