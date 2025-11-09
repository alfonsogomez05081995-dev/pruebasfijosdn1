import { Timestamp } from 'firebase/firestore';

/**
 * @file Este archivo centraliza todas las definiciones de tipos y interfaces de TypeScript
 * para el modelo de datos de la aplicación. Proporciona una fuente única de verdad
 * para la estructura de los datos, mejorando la mantenibilidad y la seguridad de tipos.
 */

// =================================================================================
// --------------------------- TIPOS Y ENTIDADES PRINCIPALES -----------------------
// =================================================================================

/**
 * Define los roles de usuario permitidos en el sistema.
 * - `master`: Rol de superadministrador con acceso total.
 * - `master_it`, `master_campo`, `master_depot`: Roles de master especializados con acceso a ciertos tipos de activos.
 * - `logistica`: Rol para la gestión de inventario y envíos.
 * - `empleado`: Rol estándar para usuarios que reciben y gestionan activos.
 */
export type Role = 'master' | 'master_it' | 'master_campo' | 'master_depot' | 'logistica' | 'empleado';

/**
 * Interfaz que representa a un usuario en la colección `users` de Firestore.
 */
export interface User {
  id: string; // ID del documento en Firestore.
  uid?: string; // UID de Firebase Authentication, se añade después del registro.
  name: string; // Nombre del usuario.
  email: string; // Correo electrónico del usuario.
  role: Role; // Rol del usuario en el sistema.
  status: 'invitado' | 'activo'; // Estado del usuario.
}

/**
 * Define los posibles estados de un activo a lo largo de su ciclo de vida.
 */
export type AssetStatus = 
  | 'activo'                // Asignado y en uso por un empleado.
  | 'recibido pendiente'    // Enviado al empleado, pero aún no confirmado.
  | 'en devolución'         // El empleado ha iniciado el proceso de devolución.
  | 'en stock'              // Disponible en el inventario.
  | 'baja'                  // Desechado y fuera de circulación.
  | 'en disputa'            // El empleado rechazó la recepción.
  | 'reemplazo_solicitado'  // El empleado ha solicitado un reemplazo.
  | 'reemplazo_en_logistica'; // El master aprobó el reemplazo, logística debe actuar.

/**
 * Define los tipos de activos que se pueden gestionar.
 */
export type AssetType = 'equipo_de_computo' | 'herramienta_electrica' | 'herramienta_manual';

/**
 * Interfaz que representa un activo en la colección `assets` de Firestore.
 */
export interface Asset {
  id: string; // ID del documento en Firestore.
  reference?: string; // Referencia o SKU del producto.
  name: string; // Nombre o descripción del activo.
  serial?: string; // Número de serie (si es un activo serializable).
  location?: string; // Ubicación física del activo (ej. 'Bodega Central').
  status: AssetStatus; // Estado actual del activo en su ciclo de vida.
  tipo: AssetType; // Categoría del activo.
  stock?: number; // Cantidad de unidades (para activos no serializables).
  employeeId?: string; // ID del documento del empleado al que está asignado.
  employeeUid?: string; // UID de autenticación del empleado (para reglas de seguridad).
  employeeName?: string; // Nombre del empleado asignado.
  assignedDate?: Timestamp; // Fecha de asignación.
  rejectionReason?: string; // Motivo si el empleado rechazó la recepción.
  history?: AssetHistoryEvent[]; // Array de eventos que registran la vida del activo.

  // Campos opcionales para vistas consolidadas (no siempre presentes en el documento).
  assignedTo?: { employeeName: string; quantity: number; serial?: string }[];
  totalStock?: number;
}

/**
 * Define los posibles estados de una solicitud de asignación.
 */
export type AssignmentStatus = 'pendiente de envío' | 'enviado' | 'pendiente por stock' | 'rechazado' | 'archivado';

/**
 * Interfaz para una solicitud de asignación en la colección `assignmentRequests`.
 */
export interface AssignmentRequest {
  id: string; // ID del documento.
  employeeId: string; // ID del empleado destinatario.
  employeeName: string;
  assetId: string; // ID del activo solicitado.
  assetName: string;
  quantity: number; // Cantidad solicitada.
  date: Timestamp; // Fecha de creación de la solicitud.
  status: AssignmentStatus; // Estado actual de la solicitud.
  masterId?: string; // ID del master que creó la solicitud.
  masterName?: string;
  trackingNumber?: string; // Número de guía del envío.
  carrier?: string; // Empresa de transporte.
  rejectionReason?: string; // Motivo si fue rechazada por el empleado.
  originalReplacementRequestId?: string; // Enlace si esta asignación es para un reemplazo.
  sentDate?: Timestamp; // Fecha en que logística procesa el envío.
  
  // Campos opcionales para la UI.
  formattedDate?: string;
  formattedSentDate?: string;
}

/**
 * Define los posibles estados de una solicitud de reemplazo.
 */
export type ReplacementStatus = 'pendiente de aprobacion master' | 'aprobado' | 'rechazado';

/**
 * Interfaz para una solicitud de reemplazo en la colección `replacementRequests`.
 */
export interface ReplacementRequest {
  id: string; // ID del documento.
  employeeId: string; // ID del empleado que solicita.
  employeeName: string;
  masterId: string; // ID del master que debe aprobar.
  assetId: string; // ID del activo a reemplazar.
  assetName: string;
  serial: string;
  reason: string; // Motivo (daño, robo, etc.).
  justification: string; // Descripción detallada.
  imageUrl?: string; // URL o Base64 de la imagen de evidencia.
  date: Timestamp; // Fecha de la solicitud.
  status: ReplacementStatus; // Estado de la solicitud.
}

/**
 * Define los posibles estados de un proceso de devolución.
 */
export type DevolutionStatus = 'iniciado' | 'verificado por logística' | 'completado';

/**
 * Interfaz para un proceso de devolución en la colección `devolutionProcesses`.
 */
export interface DevolutionProcess {
  id: string; // ID del documento.
  employeeId: string;
  employeeName: string;
  status: DevolutionStatus;
  date: Timestamp;
  assets: { id: string; name: string; serial?: string; verified: boolean }[]; // Lista de activos a devolver.
  
  // Campo opcional para la UI.
  formattedDate?: string;
}

/**
 * Tipo de datos para la creación de un nuevo activo.
 * Usado en los formularios de logística.
 */
export type NewAssetData = {
  reference?: string;
  name: string;
  serial?: string;
  location: string;
  stock: number;
  tipo: AssetType;
};

/**
 * Interfaz para un evento en el historial de un activo.
 * Se almacena como un array dentro de cada documento de activo.
 */
export interface AssetHistoryEvent {
  id?: string;
  timestamp: Timestamp; // Fecha y hora del evento.
  event: string; // Nombre del evento (ej. "Creación", "Asignación Aprobada").
  description: string; // Descripción detallada.
  userId?: string | null; // ID del usuario que realizó la acción.
  userName?: string | null; // Nombre del usuario.

  // Campo opcional para la UI.
  formattedDate?: string;
};