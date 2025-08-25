
import { DocumentData } from 'firebase/firestore';
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

// --- In-Memory Mock Database ---

let mockUsers: User[] = [
  { id: 'luisgm.ldv@gmail.com', name: 'Luis G. (Master)', email: 'luisgm.ldv@gmail.com', role: 'Master' },
  { id: 'logistica@empresa.com', name: 'Usuario de Logística', email: 'logistica@empresa.com', role: 'Logistica' },
  { id: 'empleado@empresa.com', name: 'Usuario Empleado', email: 'empleado@empresa.com', role: 'Empleado' },
];

let mockAssets: Asset[] = [
    { id: 'asset-1', name: 'Laptop Dell XPS 15', status: 'En stock', stock: 10, serial: 'DXPS15-STOCK', location: 'Bodega Central' },
    { id: 'asset-2', name: 'Monitor LG 27"', status: 'En stock', stock: 5, serial: 'MLG27-STOCK', location: 'Bodega Central' },
    { id: 'asset-3', name: 'Teclado Mecánico', status: 'Activo', employeeId: 'empleado@empresa.com', employeeName: 'Usuario Empleado', assignedDate: '2023-10-01', serial: 'TM-123' },
    { id: 'asset-4', name: 'Mouse Logitech MX', status: 'Recibido pendiente', employeeId: 'empleado@empresa.com', employeeName: 'Usuario Empleado', assignedDate: '2023-10-26', serial: 'MLMX-456' },
];

let mockAssignmentRequests: AssignmentRequest[] = [
    { id: 'req-1', assetId: 'asset-1', assetName: 'Laptop Dell XPS 15', employeeId: 'empleado@empresa.com', employeeName: 'Usuario Empleado', quantity: 1, status: 'Pendiente de Envío', date: '2023-10-25' }
];

let mockReplacementRequests: ReplacementRequest[] = [
    { id: 'rep-req-1', employee: 'Usuario Empleado', employeeId: 'empleado@empresa.com', asset: 'Teclado Mecánico', assetId: 'asset-3', serial: 'TM-123', reason: 'Desgaste', justification: 'La tecla "A" no funciona bien.', status: 'Pendiente', date: '2023-10-26' }
];


// ------ User Management Services ------

export const createUser = async (userData: Omit<User, 'id'>): Promise<User> => {
  console.log("Mock createUser called with:", userData);
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const existing = mockUsers.find(u => u.email === userData.email);
      if (existing) {
        reject(new Error(`El correo '${userData.email}' ya está registrado.`));
        return;
      }
      const newUser: User = {
        id: userData.email, // Using email as ID for simplicity
        ...userData
      };
      mockUsers.push(newUser);
      console.log("Current mockUsers:", mockUsers);
      resolve(newUser);
    }, 500);
  });
};

export const getUsers = async (roleFilter?: Role): Promise<User[]> => {
    console.log("Mock getUsers called. Returning:", mockUsers);
    return new Promise((resolve) => {
        setTimeout(() => {
            if (roleFilter) {
                resolve(mockUsers.filter(user => user.role === roleFilter));
            } else {
                resolve(mockUsers);
            }
        }, 300);
    });
}

// ------ Master Services ------
export const sendAssignmentRequest = async (request: Omit<AssignmentRequest, 'id' | 'date' | 'status'>): Promise<{ status: AssignmentRequest['status'], id: string }> => {
    console.log("Mock sendAssignmentRequest called with:", request);
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const assetToAssign = mockAssets.find(a => a.id === request.assetId && a.status === 'En stock');
            if (!assetToAssign) {
                return reject(new Error("Activo no encontrado o sin stock."));
            }
            const currentStock = assetToAssign.stock || 0;
            const newStatus = currentStock >= request.quantity ? 'Pendiente de Envío' : 'Pendiente por Stock';

            if (newStatus === 'Pendiente de Envío') {
                assetToAssign.stock = currentStock - request.quantity;
                for (let i = 0; i < request.quantity; i++) {
                    const newAssignedAsset: Asset = {
                        id: uuidv4(),
                        name: assetToAssign.name,
                        serial: `${assetToAssign.serial?.replace('-STOCK','') || 'SN'}-${Date.now()}-${i}`,
                        location: assetToAssign.location,
                        status: 'Recibido pendiente',
                        assignedDate: new Date().toISOString().split('T')[0],
                        employeeId: request.employeeId,
                        employeeName: request.employeeName
                    };
                    mockAssets.push(newAssignedAsset);
                }
            }
            
            const newRequest: AssignmentRequest = {
                ...request,
                id: uuidv4(),
                date: new Date().toISOString().split('T')[0],
                status: newStatus,
            };
            mockAssignmentRequests.push(newRequest);
            console.log("Current mockAssignmentRequests:", mockAssignmentRequests);
            console.log("Current mockAssets:", mockAssets);
            resolve({ status: newStatus, id: newRequest.id! });
        }, 500);
    });
};


export const getReplacementRequests = async (): Promise<ReplacementRequest[]> => {
    console.log("Mock getReplacementRequests called.");
    return new Promise((resolve) => setTimeout(() => resolve(mockReplacementRequests), 300));
};

export const updateReplacementRequestStatus = async (id: string, status: 'Aprobado' | 'Rechazado'): Promise<void> => {
    console.log(`Mock updateReplacementRequestStatus called for id: ${id} with status: ${status}`);
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const requestIndex = mockReplacementRequests.findIndex(r => r.id === id);
            if (requestIndex > -1) {
                mockReplacementRequests[requestIndex].status = status;
                resolve();
            } else {
                reject(new Error("Solicitud no encontrada."));
            }
        }, 500);
    });
};


// ------ Logistica Services ------
export const addAsset = async (asset: { serial?: string; name: string; location?: string; stock: number }): Promise<Asset> => {
    console.log("Mock addAsset called with:", asset);
    return new Promise((resolve) => {
        setTimeout(() => {
            const existingAsset = mockAssets.find(a => a.name.toLowerCase() === asset.name.toLowerCase() && a.status === 'En stock');
            if (existingAsset) {
                existingAsset.stock = (existingAsset.stock || 0) + asset.stock;
                existingAsset.location = asset.location || existingAsset.location;
                console.log("Updated existing asset:", existingAsset);
                resolve(existingAsset);
            } else {
                const newAsset: Asset = {
                    id: uuidv4(),
                    name: asset.name,
                    serial: asset.serial || `SN-STOCK-${uuidv4().slice(0,4)}`,
                    location: asset.location,
                    stock: asset.stock,
                    status: 'En stock',
                };
                mockAssets.push(newAsset);
                console.log("Created new asset:", newAsset);
                resolve(newAsset);
            }
            console.log("Current mockAssets:", mockAssets);
        }, 500);
    });
};


export const getStockAssets = async (): Promise<Asset[]> => {
    console.log("Mock getStockAssets called.");
    return new Promise((resolve) => setTimeout(() => {
        resolve(mockAssets.filter(a => a.status === 'En stock' && (a.stock || 0) > 0));
    }, 300));
};

export const getAssignmentRequests = async (): Promise<AssignmentRequest[]> => {
    console.log("Mock getAssignmentRequests called.");
    return new Promise((resolve) => setTimeout(() => resolve(mockAssignmentRequests), 300));
};

export const processAssignmentRequest = async (id: string): Promise<void> => {
    console.log(`Mock processAssignmentRequest called for id: ${id}`);
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const requestIndex = mockAssignmentRequests.findIndex(r => r.id === id);
            if (requestIndex > -1) {
                mockAssignmentRequests[requestIndex].status = 'Enviado';
                resolve();
            } else {
                reject(new Error("Solicitud no encontrada."));
            }
        }, 500);
    });
};


// ------ Empleado Services ------

export const getMyAssignedAssets = async (employeeId: string): Promise<Asset[]> => {
    console.log(`Mock getMyAssignedAssets called for employeeId: ${employeeId}`);
    return new Promise((resolve) => setTimeout(() => {
        resolve(mockAssets.filter(a => a.employeeId === employeeId));
    }, 300));
};

export const confirmAssetReceipt = async (id: string): Promise<void> => {
    console.log(`Mock confirmAssetReceipt called for id: ${id}`);
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const assetIndex = mockAssets.findIndex(a => a.id === id);
            if (assetIndex > -1) {
                mockAssets[assetIndex].status = 'Activo';
                resolve();
            } else {
                reject(new Error("Activo no encontrado."));
            }
        }, 500);
    });
};

export const submitReplacementRequest = async (requestData: Omit<ReplacementRequest, 'id' | 'date' | 'status' | 'imageUrl'> & { imageFile?: File }): Promise<ReplacementRequest> => {
    console.log("Mock submitReplacementRequest called with:", requestData);
    return new Promise((resolve) => {
        setTimeout(() => {
            const newRequest: ReplacementRequest = {
                ...requestData,
                id: uuidv4(),
                imageUrl: requestData.imageFile ? URL.createObjectURL(requestData.imageFile) : undefined,
                date: new Date().toISOString().split('T')[0],
                status: 'Pendiente',
            };
            mockReplacementRequests.push(newRequest);
            console.log("Current mockReplacementRequests:", mockReplacementRequests);
            resolve(newRequest);
        }, 500);
    });
};

export const getAssetById = async (id: string): Promise<Asset | null> => {
    console.log(`Mock getAssetById called for id: ${id}`);
    return new Promise((resolve) => {
        setTimeout(() => {
            const asset = mockAssets.find(a => a.id === id);
            resolve(asset || null);
        }, 300);
    });
};
