import { Timestamp } from 'firebase/firestore';

// ------------------- TYPE DEFINITIONS -------------------

export type Role = 'master' | 'master_it' | 'master_campo' | 'master_depot' | 'logistica' | 'empleado';

export interface User {
  id: string; 
  uid?: string; 
  name: string;
  email: string;
  role: Role;
  status: 'invitado' | 'activo';
}

export type AssetStatus = 'activo' | 'recibido pendiente' | 'en devolución' | 'en stock' | 'baja' | 'en disputa';
export type AssetType = 'equipo_de_computo' | 'herramienta_electrica' | 'herramienta_manual';

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

// Type for creating new assets, used in logistics services
export type NewAssetData = {
  reference?: string;
  name: string;
  serial?: string;
  location: string;
  stock: number;
  tipo: AssetType;
};