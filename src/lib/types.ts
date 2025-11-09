// Importa el tipo Timestamp de Firestore para manejar fechas y horas.
import { Timestamp } from 'firebase/firestore';

// ------------------- DEFINICIONES DE TIPOS -------------------

// Define los roles de usuario disponibles en la aplicación.
export type Role = 'master' | 'master_it' | 'master_campo' | 'master_depot' | 'logistica' | 'empleado';

// Define la estructura de un objeto de usuario.
export interface User {
  id: string; // ID del documento en Firestore.
  uid?: string; // UID de Firebase Authentication.
  name: string; // Nombre del usuario.
  email: string; // Correo electrónico del usuario.
  role: Role; // Rol del usuario.
  status: 'invitado' | 'activo'; // Estado de la cuenta del usuario.
}

// Define los posibles estados de un activo.
export type AssetStatus = 'activo' | 'recibido pendiente' | 'en devolución' | 'en stock' | 'baja' | 'en disputa' | 'reemplazo solicitado' | 'reemplazo_en_logistica';
// Define los tipos de activos que se pueden gestionar.
export type AssetType = 'equipo_de_computo' | 'herramienta_electrica' | 'herramienta_manual';

// Define la estructura de un objeto de activo.
export interface Asset {
  id: string; // ID del documento en Firestore.
  reference?: string; // Referencia del activo.
  name: string; // Nombre o descripción del activo.
  serial?: string; // Número de serie del activo (si aplica).
  location?: string; // Ubicación del activo en la bodega.
  status: AssetStatus; // Estado actual del activo.
  tipo: AssetType; // Tipo de activo.
  stock?: number; // Cantidad de activos en stock.
  employeeId?: string; // ID del empleado al que está asignado.
  employeeUid?: string; // UID del empleado al que está asignado (para reglas de seguridad).
  employeeName?: string; // Nombre del empleado al que está asignado.
  assignedDate?: Timestamp; // Fecha en que se asignó el activo.
  rejectionReason?: string; // Motivo del rechazo si el empleado no lo acepta.
  assignedTo?: { employeeName: string; quantity: number; serial?: string }[]; // Para agrupar asignaciones.
  totalStock?: number; // Para mostrar el stock consolidado.
  history?: AssetHistoryEvent[]; // Historial de eventos del activo.
}

// Define los posibles estados de una solicitud de asignación.
export type AssignmentStatus = 'pendiente de envío' | 'enviado' | 'pendiente por stock' | 'rechazado' | 'archivado';
// Define la estructura de una solicitud de asignación.
export interface AssignmentRequest {
  id: string; // ID del documento en Firestore.
  employeeId: string; // ID del empleado al que se le asigna.
  employeeName: string; // Nombre del empleado.
  assetId: string; // ID del activo solicitado.
  assetName: string; // Nombre del activo.
  quantity: number; // Cantidad solicitada.
  date: Timestamp; // Fecha de la solicitud.
  status: AssignmentStatus; // Estado de la solicitud.
  trackingNumber?: string; // Número de guía del envío.
  carrier?: string; // Transportadora.
  masterId?: string; // ID del master que crea la solicitud.
  masterName?: string; // Nombre del master.
  rejectionReason?: string; // Motivo del rechazo por parte del empleado.
  originalReplacementRequestId?: string; // ID de la solicitud de reemplazo original (si aplica).
  formattedDate?: string; // Fecha formateada para mostrar en la UI.
  sentDate?: Timestamp; // Fecha en que logística procesa el envío.
  formattedSentDate?: string; // Fecha de envío formateada.
}

// Define los posibles estados de una solicitud de reemplazo.
export type ReplacementStatus = 'pendiente de aprobacion master' | 'aprobado' | 'rechazado';
// Define la estructura de una solicitud de reemplazo.
export interface ReplacementRequest {
  id: string; // ID del documento en Firestore.
  employeeId: string; // ID del empleado que solicita.
  employeeName: string; // Nombre del empleado.
  masterId: string; // ID del master que debe aprobar.
  assetId: string; // ID del activo a reemplazar.
  assetName: string; // Nombre del activo.
  serial: string; // Serial del activo.
  reason: string; // Motivo del reemplazo (daño, robo, etc.).
  justification: string; // Justificación detallada.
  imageUrl?: string; // URL de la imagen de evidencia.
  date: Timestamp; // Fecha de la solicitud.
  status: ReplacementStatus; // Estado de la solicitud.
}

// Define los posibles estados de un proceso de devolución.
export type DevolutionStatus = 'iniciado' | 'verificado por logística' | 'completado';
// Define la estructura de un proceso de devolución.
export interface DevolutionProcess {
  id: string; // ID del documento en Firestore.
  employeeId: string; // ID del empleado que devuelve.
  employeeName: string; // Nombre del empleado.
  status: DevolutionStatus; // Estado del proceso.
  date: Timestamp; // Fecha de inicio del proceso.
  formattedDate?: string; // Fecha formateada.
  assets: { id: string; name: string; serial?: string; verified: boolean }[]; // Lista de activos a devolver.
}

// Define la estructura de los datos para crear un nuevo activo.
export type NewAssetData = {
  reference?: string; // Referencia del activo.
  name: string; // Nombre del activo.
  serial?: string; // Serial del activo.
  location: string; // Ubicación en bodega.
  stock: number; // Cantidad.
  tipo: AssetType; // Tipo de activo.
};

// Define la estructura de un evento en el historial de un activo.
export interface AssetHistoryEvent {
  id?: string; // ID del evento.
  timestamp: Timestamp; // Fecha y hora del evento.
  event: string; // Nombre del evento (ej: "Asignado", "Devuelto").
  description: string; // Descripción detallada del evento.
  userId?: string | null; // ID del usuario que realizó la acción.
  userName?: string | null; // Nombre del usuario.
  formattedDate?: string; // Fecha formateada.
};