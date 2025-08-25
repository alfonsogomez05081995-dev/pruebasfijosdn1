
import { db, storage } from './firebase';
import { collection, addDoc, getDocs, doc, updateDoc, query, where, getDoc, runTransaction, DocumentData, serverTimestamp, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { User } from '@/hooks/use-auth';

// Tipos
export interface Asset extends DocumentData {
  id?: string;
  name: string;
  serial?: string;
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

// ------ User Management Services ------
export const createUser = async (userData: Omit<User, 'id'>) => {
  // Use email as a document ID to prevent duplicates
  const userRef = doc(db, 'users', userData.email);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    throw new Error(`El correo '${userData.email}' ya está registrado.`);
  }

  await setDoc(userRef, userData);
  return { id: userRef.id, ...userData };
};

export const getUsers = async (roleFilter?: 'Master' | 'Logistica' | 'Empleado'): Promise<User[]> => {
    const usersRef = collection(db, 'users');
    let q = query(usersRef);

    if (roleFilter) {
      q = query(usersRef, where('role', '==', roleFilter));
    }

    const querySnapshot = await getDocs(q);

    const users = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
    
    // Always ensure the default Master user is present if the collection is empty or doesn't contain it
    const masterUserExists = users.some(u => u.email === 'luisgm.ldv@gmail.com');
    if (!masterUserExists) {
        users.push({ id: 'luisgm.ldv@gmail.com', name: 'Luis G. (Master)', email: 'luisgm.ldv@gmail.com', role: 'Master' });
    }

    return users;
}

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
    
    const docRef = doc(collection(db, 'assignmentRequests'));
    transaction.set(docRef, newRequest);
    
    return { status: newStatus, ...newRequest };
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
export const addAsset = async (asset: { serial?: string; name: string; location?: string; stock: number }) => {
  const newAssetData: Omit<Asset, 'id'> = {
    name: asset.name,
    serial: asset.serial || '',
    location: asset.location || '',
    stock: asset.stock || 0,
    status: 'En stock',
  };
  const docRef = await addDoc(collection(db, 'assets'), newAssetData);
  return { id: docRef.id, ...newAssetData };
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

export const getAssetById = async (id: string): Promise<Asset | null> => {
    const assetRef = doc(db, 'assets', id);
    const assetSnap = await getDoc(assetRef);
    if (assetSnap.exists()) {
        return { id: assetSnap.id, ...assetSnap.data() } as Asset;
    } else {
        return null;
    }
};
