
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

    if (snapshot.docs.length < 3) {
        console.log("Default users missing. Initializing...");
        const batch = writeBatch(db);
        const mockUsers: Omit<User, 'id'>[] = [
            { name: 'Luis G. (Master)', email: 'luisgm.ldv@gmail.com', role: 'Master' },
            { name: 'Usuario de Logística', email: 'logistica@empresa.com', role: 'Logistica' },
            { name: 'Usuario Empleado', email: 'empleado@empresa.com', role: 'Empleado' },
        ];

        mockUsers.forEach(user => {
            const userDocRef = doc(db, 'users', user.email); // Use email as ID
            batch.set(userDocRef, user, { merge: true }); // Use merge to avoid overwriting if user exists
        });

        await batch.commit();
        console.log("Default users initialized/verified.");
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
        
        return users;
    } catch(error) {
        console.error("Error fetching users. This might be a Firestore Rules issue.", error);
        throw new Error("No se pudieron cargar los usuarios. Verifique las reglas de Firestore.");
    }
}

// ------ Master Services ------
export const sendAssignmentRequest = async (request: Omit<AssignmentRequest, 'id' | 'date' | 'status'>) => {
  try {
    return await runTransaction(db, async (transaction) => {
      const assetRef = doc(db, "assets", request.assetId);
      const assetDoc = await transaction.get(assetRef);

      if (!assetDoc.exists()) {
        throw new Error("El activo seleccionado ya no existe.");
      }

      const assetData = assetDoc.data() as Asset;
      const currentStock = assetData.stock || 0;
      
      const newStatus = currentStock >= request.quantity ? 'Pendiente de Envío' : 'Pendiente por Stock';

      if (newStatus === 'Pendiente de Envío') {
         // Create a new assigned asset for the employee
        const newAssignedAsset: Asset = {
          ...assetData,
          stock: undefined, // Individual assets don't have stock
          status: 'Recibido pendiente',
          assignedDate: new Date().toISOString().split('T')[0],
          employeeId: request.employeeId,
          employeeName: request.employeeName
        };
        delete newAssignedAsset.id; // Firestore will generate a new ID
        
        // This creates a completely new document for the assigned asset
        const newAssetRef = doc(collection(db, 'assets'));
        transaction.set(newAssetRef, newAssignedAsset);
        
        // Decrement stock from the main inventory asset
        const newStock = currentStock - request.quantity;
        transaction.update(assetRef, { stock: newStock });
      }

      // Create the request document regardless of stock
      const newRequestData: Omit<AssignmentRequest, 'id'> = {
        ...request,
        date: new Date().toISOString().split('T')[0],
        status: newStatus,
      };
      
      const requestRef = doc(collection(db, 'assignmentRequests'));
      transaction.set(requestRef, newRequestData);
      
      return { status: newStatus, ...newRequestData };
    });
  } catch (error) {
    console.error("Error en la transacción de asignación:", error);
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
    // Check if an asset with the same name already exists to avoid duplicates in stock
    const assetsRef = collection(db, 'assets');
    const q = query(assetsRef, where("name", "==", asset.name), where("status", "==", "En stock"));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
       // Asset exists, so update its stock
       const existingAssetDoc = querySnapshot.docs[0];
       const existingAssetRef = doc(db, 'assets', existingAssetDoc.id);
       const newStock = (existingAssetDoc.data().stock || 0) + asset.stock;
       await updateDoc(existingAssetRef, { stock: newStock, location: asset.location });
       console.log("Asset stock updated successfully for:", asset.name);
       return { id: existingAssetDoc.id, ...existingAssetDoc.data(), stock: newStock, location: asset.location };

    } else {
      // Asset doesn't exist, create a new one
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
    }
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
        throw new Error("No se pudieron cargar los activos en stock.");
    }
};

export const getAssignmentRequests = async (): Promise<AssignmentRequest[]> => {
    try {
        const q = query(collection(db, 'assignmentRequests'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AssignmentRequest));
    } catch (error) {
        console.error("Error fetching assignment requests:", error);
        throw new Error("No se pudieron cargar las solicitudes de asignación.");
    }
};

export const processAssignmentRequest = async (id: string) => {
    try {
        const requestRef = doc(db, 'assignmentRequests', id);
        await updateDoc(requestRef, { status: 'Enviado' });
    } catch(error) {
        console.error("Error processing assignment request:", error);
        throw new Error("No se pudo procesar la solicitud.");
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
        throw new Error("No se pudieron cargar los activos asignados.");
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
        throw new Error("No se pudo enviar la solicitud de reposición.");
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
        throw new Error("No se pudieron obtener los detalles del activo.");
    }
};
