
import { db, storage } from './firebase';
import { collection, addDoc, getDocs, doc, updateDoc, query, where, getDoc, runTransaction, DocumentData, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { User, Role } from '@/hooks/use-auth';

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

// This function will create the initial set of users if they don't exist.
const initializeDefaultUsers = async () => {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', 'in', ['luisgm.ldv@gmail.com', 'logistica@empresa.com', 'empleado@empresa.com']));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        console.log("No default users found. Initializing...");
        const batch = writeBatch(db);
        const mockUsers: Omit<User, 'id'>[] = [
            { name: 'Luis G. (Master)', email: 'luisgm.ldv@gmail.com', role: 'Master' },
            { name: 'Usuario de Logística', email: 'logistica@empresa.com', role: 'Logistica' },
            { name: 'Usuario Empleado', email: 'empleado@empresa.com', role: 'Empleado' },
        ];

        mockUsers.forEach(user => {
            const userDocRef = doc(db, 'users', user.email); // Use email as ID
            batch.set(userDocRef, user);
        });

        await batch.commit();
        console.log("Default users initialized.");
    }
};

export const createUser = async (userData: Omit<User, 'id'>) => {
  try {
    const userRef = doc(db, 'users', userData.email);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        throw new Error(`El correo '${userData.email}' ya está registrado.`);
    }

    await setDoc(userRef, userData);
    console.log("User created successfully:", userData.email);
    return { id: userRef.id, ...userData };
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
};

export const getUsers = async (roleFilter?: Role): Promise<User[]> => {
    try {
        // Ensure default users are there if needed
        await initializeDefaultUsers();
        
        const usersRef = collection(db, 'users');
        let q;

        if (roleFilter) {
          q = query(usersRef, where('role', '==', roleFilter));
        } else {
          q = query(usersRef);
        }

        const querySnapshot = await getDocs(q);
        const users = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        
        if(users.length === 0 && !roleFilter) {
            console.log("No users found after init, returning empty array.");
            return [];
        }

        return users;
    } catch(error) {
        console.error("Error fetching users. This might be a Firestore Rules issue.", error);
        throw new Error("Could not fetch users. Check Firestore rules and network connection.");
    }
}

// ------ Master Services ------
export const sendAssignmentRequest = async (request: Omit<AssignmentRequest, 'id' | 'date' | 'status'>) => {
  try {
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

      // Create a new asset instance for the employee
      const newAssignedAsset: Asset = {
        ...assetData,
        stock: 1, 
        status: 'Recibido pendiente',
        assignedDate: new Date().toISOString().split('T')[0],
        employeeId: request.employeeId,
        employeeName: request.employeeName
      };
      delete newAssignedAsset.id;
      const newAssetRef = doc(collection(db, 'assets'));
      transaction.set(newAssetRef, newAssignedAsset);

      // Decrement stock from the main asset
      if (hasEnoughStock) {
        const newStock = currentStock - request.quantity;
        transaction.update(assetRef, { stock: newStock });
      }

      const newRequest: Omit<AssignmentRequest, 'id'> = {
        ...request,
        date: new Date().toISOString().split('T')[0],
        status: newStatus,
      };
      
      const docRef = doc(collection(db, 'assignmentRequests'));
      transaction.set(docRef, newRequest);
      
      return { status: newStatus, ...newRequest };
    });
  } catch (error) {
    console.error("Error sending assignment request:", error);
    throw error;
  }
};


export const getReplacementRequests = async (): Promise<ReplacementRequest[]> => {
  try {
    const q = query(collection(db, 'replacementRequests'), where('status', '==', 'Pendiente'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReplacementRequest));
  } catch (error) {
    console.error("Error fetching replacement requests:", error);
    throw error;
  }
};

export const updateReplacementRequestStatus = async (id: string, status: 'Aprobado' | 'Rechazado') => {
  try {
    const requestRef = doc(db, 'replacementRequests', id);
    await updateDoc(requestRef, { status });
  } catch (error) {
    console.error("Error updating replacement request status:", error);
    throw error;
  }
};


// ------ Logistica Services ------
export const addAsset = async (asset: { serial?: string; name: string; location?: string; stock: number }) => {
  try {
    const newAssetData: Omit<Asset, 'id' | 'assignedDate' | 'employeeId' | 'employeeName'> = {
        name: asset.name,
        serial: asset.serial || '',
        location: asset.location || '',
        stock: asset.stock || 0,
        status: 'En stock',
    };
    const docRef = await addDoc(collection(db, 'assets'), newAssetData);
    console.log("Asset added successfully:", docRef.id);
    return { id: docRef.id, ...newAssetData };
  } catch (error) {
    console.error("Error adding asset:", error);
    throw error;
  }
};

export const getStockAssets = async (): Promise<Asset[]> => {
    try {
        const q = query(collection(db, 'assets'), where('status', '==', 'En stock'), where('stock', '>', 0));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
    } catch(error) {
        console.error("Error fetching stock assets:", error);
        throw new Error("Could not fetch stock assets.");
    }
};

export const getAssignmentRequests = async (): Promise<AssignmentRequest[]> => {
    try {
        const q = query(collection(db, 'assignmentRequests'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AssignmentRequest));
    } catch (error) {
        console.error("Error fetching assignment requests:", error);
        throw new Error("Could not fetch assignment requests.");
    }
};

export const processAssignmentRequest = async (id: string) => {
    try {
        const requestRef = doc(db, 'assignmentRequests', id);
        await updateDoc(requestRef, { status: 'Enviado' });
    } catch(error) {
        console.error("Error processing assignment request:", error);
        throw new Error("Could not process assignment request.");
    }
};


// ------ Empleado Services ------

export const getMyAssignedAssets = async (employeeId: string): Promise<Asset[]> => {
    try {
        const q = query(collection(db, 'assets'), where('employeeId', '==', employeeId));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
    } catch (error) {
        console.error("Error fetching assigned assets:", error);
        throw new Error("Could not fetch assigned assets.");
    }
};

export const confirmAssetReceipt = async (id: string) => {
    try {
        const assetRef = doc(db, 'assets', id);
        await updateDoc(assetRef, { status: 'Activo' });
    } catch (error) {
        console.error("Error confirming asset receipt:", error);
        throw new Error("Could not confirm asset receipt.");
    }
};

export const submitReplacementRequest = async (requestData: Omit<ReplacementRequest, 'id' | 'date' | 'status' | 'imageUrl'> & { imageFile?: File }) => {
    try {
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
    } catch (error) {
        console.error("Error submitting replacement request:", error);
        throw new Error("Could not submit replacement request.");
    }
};

export const getAssetById = async (id: string): Promise<Asset | null> => {
    try {
        const assetRef = doc(db, 'assets', id);
        const assetSnap = await getDoc(assetRef);
        if (assetSnap.exists()) {
            return { id: assetSnap.id, ...assetSnap.data() } as Asset;
        } else {
            console.warn(`Asset with id ${id} not found.`);
            return null;
        }
    } catch (error) {
        console.error(`Error fetching asset by id ${id}:`, error);
        throw new Error("Could not fetch asset details.");
    }
};

    