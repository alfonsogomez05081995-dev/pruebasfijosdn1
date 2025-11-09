'use client';
// Importaciones de React, Next.js, y componentes de UI.
import { useEffect, useState, FormEvent, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Check, X, UserPlus, FilePenLine, Trash2, AlertTriangle, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Importaciones de la lógica de la aplicación.
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  Role,
  inviteUser,
  getUsers,
  updateUser,
  deleteUser,
  getReplacementRequestsForMaster,
  rejectReplacementRequest,
  sendBulkAssignmentRequests,
  getStockAssets,
  getAssignmentRequestsForMaster,
  approveReplacementRequest,
  Asset,
  ReplacementRequest,
} from "@/lib/services";

/**
 * Componente MasterPage.
 * Este es el panel de control para los usuarios con rol 'master'.
 * Permite gestionar usuarios (invitar, editar, eliminar), aprobar/rechazar solicitudes de reemplazo,
 * y crear asignaciones de activos para los empleados.
 */
export default function MasterPage() {
  // --- Hooks y Estados ---
  const { userData, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  // Estados para almacenar los datos obtenidos de Firestore.
  const [replacementRequests, setReplacementRequests] = useState<ReplacementRequest[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [stockAssets, setStockAssets] = useState<Asset[]>([]);
  const [assignmentHistory, setAssignmentHistory] = useState<any[]>([]);

  // Estados para controlar los diálogos y sus formularios.
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [requestToActOn, setRequestToActOn] = useState<ReplacementRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false);
  const [currentUserForAction, setCurrentUserForAction] = useState<User | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [assignmentRows, setAssignmentRows] = useState([{ id: 1, assetId: '', quantity: 1 }]);
  const [justification, setJustification] = useState('');
  const [assignmentType, setAssignmentType] = useState<'primera_vez' | 'reposicion' | ''>('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<Role | ''| undefined>('');

  // Efecto para proteger la ruta, solo accesible para roles 'master'.
  useEffect(() => {
    if (!loading && (!userData || !userData.role.startsWith('master'))) {
      router.push('/');
    }
  }, [userData, loading, router]);

  /**
   * Obtiene todos los datos necesarios para el panel del master.
   * `useCallback` se usa para memorizar la función y optimizar el rendimiento.
   */
  const fetchAllData = useCallback(async () => {
    if (!userData) return;
    try {
      const isOriginalMaster = userData.role === 'master';
      // Ejecuta todas las peticiones en paralelo para mayor eficiencia.
      const [requests, fetchedEmployees, fetchedAssets, allSystemUsers, history] = await Promise.all([
        getReplacementRequestsForMaster(userData.id),
        getUsers('empleado', isOriginalMaster ? undefined : userData.id),
        getStockAssets(userData.role),
        getUsers(undefined, isOriginalMaster ? undefined : userData.id),
        getAssignmentRequestsForMaster(userData.id),
      ]);
  
      setReplacementRequests(requests);
      setEmployees(fetchedEmployees);
      setStockAssets(fetchedAssets);
      setAllUsers(allSystemUsers);
      setAssignmentHistory(history);
    } catch (error: any) {
      console.error("Error al obtener los datos:", error);
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'No se pudieron cargar los datos.' });
    }
  }, [userData, toast]);

  // Efecto para cargar los datos cuando el componente se monta.
  useEffect(() => {
    if (userData) {
      fetchAllData();
    }
  }, [userData, fetchAllData]);

  // --- Manejadores de Acciones ---

  /**
   * Añade una nueva fila al formulario de asignación múltiple.
   */
  const addAssignmentRow = () => {
    setAssignmentRows([...assignmentRows, { id: Date.now(), assetId: '', quantity: 1 }]);
  };

  /**
   * Elimina una fila del formulario de asignación múltiple.
   * @param {number} id - El ID de la fila a eliminar.
   */
  const removeAssignmentRow = (id: number) => {
    setAssignmentRows(assignmentRows.filter(row => row.id !== id));
  };

  /**
   * Maneja los cambios en los campos de una fila de asignación.
   * @param {number} id - El ID de la fila.
   * @param {'assetId' | 'quantity'} field - El campo que cambió.
   * @param {string | number} value - El nuevo valor.
   */
  const handleAssignmentRowChange = (id: number, field: 'assetId' | 'quantity', value: string | number) => {
    setAssignmentRows(assignmentRows.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  /**
   * Maneja el envío del formulario de asignación múltiple.
   */
  const handleBulkAssignmentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const employee = employees.find(e => e.id === selectedEmployee);
    if (!employee || !assignmentType || !justification) {
      toast({ variant: "destructive", title: "Error", description: "Por favor, complete todos los campos." });
      return;
    }
    // ... (lógica de validación y creación de solicitudes)
    const requests = assignmentRows.map(row => { /* ... */ });
    try {
      await sendBulkAssignmentRequests(requests);
      toast({ title: "Solicitudes Enviadas", description: `Se han creado ${requests.length} solicitudes.` });
      // Reinicia el formulario.
      setSelectedEmployee('');
      setAssignmentRows([{ id: 1, assetId: '', quantity: 1 }]);
      setJustification('');
      setAssignmentType('');
      await fetchAllData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al Enviar", description: error.message });
    }
  };

  /**
   * Abre el diálogo para rechazar una solicitud de reemplazo.
   * @param {ReplacementRequest} request - La solicitud a rechazar.
   */
  const handleOpenRejectionDialog = (request: ReplacementRequest) => {
    setRequestToActOn(request);
    setRejectionDialogOpen(true);
    setRejectionReason('');
  };
  
  /**
   * Maneja el envío del formulario de rechazo de una solicitud.
   */
  const handleRejectSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!requestToActOn || !rejectionReason || !userData) return;
    try {
      await rejectReplacementRequest(requestToActOn.id, rejectionReason, { id: userData.id, name: userData.name });
      toast({ title: "Solicitud Rechazada" });
      setRejectionDialogOpen(false);
      await fetchAllData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };
  
  /**
   * Maneja la aprobación de una solicitud de reemplazo.
   * @param {string} id - El ID de la solicitud a aprobar.
   */
  const handleApproveRequest = async (id: string) => {
    if (!userData) return;
    try {
      await approveReplacementRequest(id, { id: userData.id, name: userData.name }); 
      toast({ title: `Solicitud Aprobada` });
      await fetchAllData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo aprobar la solicitud." });
    }
  };  

  /**
   * Maneja el envío del formulario para invitar a un nuevo usuario.
   */
  const handleInviteUserSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newUserEmail || !newUserRole || !userData) return;
    try {
      await inviteUser(newUserEmail, newUserRole, userData.id);
      toast({ title: "Usuario Invitado", description: `Se ha enviado una invitación a ${newUserEmail}.` });
      setUserDialogOpen(false);
      await fetchAllData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al invitar", description: error.message });
    }
  };

  /**
   * Abre el diálogo de edición para un usuario específico.
   * @param {User} userToEdit - El usuario a editar.
   */
  const handleEditUserClick = (userToEdit: User) => {
    setCurrentUserForAction(userToEdit);
    setNewUserName(userToEdit.name);
    setNewUserEmail(userToEdit.email);
    setNewUserRole(userToEdit.role);
    setEditUserDialogOpen(true);
  }

  /**
   * Maneja el envío del formulario para actualizar los datos de un usuario.
   */
  const handleUpdateUserSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentUserForAction || !newUserName || !newUserRole) return;
    try {
        await updateUser(currentUserForAction.id, { name: newUserName, role: newUserRole });
        toast({ title: "Usuario Actualizado" });
        setEditUserDialogOpen(false);
        await fetchAllData();
    } catch (error: any) {
        toast({ variant: "destructive", title: "Error al actualizar", description: error.message });
    }
  }

  /**
   * Abre el diálogo de confirmación para eliminar un usuario.
   * @param {User} userToDelete - El usuario a eliminar.
   */
  const handleDeleteUserClick = (userToDelete: User) => {
    setCurrentUserForAction(userToDelete);
    setDeleteUserDialogOpen(true);
  };
  
  /**
   * Confirma y ejecuta la eliminación de un usuario.
   */
  const confirmDeleteUser = async () => {
    if (!currentUserForAction) return;
    try {
        await deleteUser(currentUserForAction.id);
        toast({ title: "Usuario Eliminado" });
        await fetchAllData();
    } catch (error: any) {
        toast({ variant: "destructive", title: "Error al eliminar", description: error.message });
    } finally {
        setDeleteUserDialogOpen(false);
    }
  };

  // --- Renderizado del Componente ---
  if (loading || !userData) {
    return <div>Cargando...</div>;
  }

  return (
    <>
      <h1 className="text-lg font-semibold md:text-2xl mb-4">Panel del Master</h1>
      {/* Sistema de pestañas para organizar las diferentes funciones del master. */}
      <Tabs defaultValue="assignments" className="w-full">
        <TabsList className={`grid w-full ${userData.role === 'master' ? 'grid-cols-5' : 'grid-cols-4'}`}>
          <TabsTrigger value="assignments">Asignaciones</TabsTrigger>
          <TabsTrigger value="requests">Solicitudes</TabsTrigger>
          <TabsTrigger value="users">Gestión de Usuarios</TabsTrigger>
          <TabsTrigger value="history">Historial de Asignaciones</TabsTrigger>
          {/* La pestaña de Gestión de Activos solo es visible para el rol 'master' original. */}
          {userData.role === 'master' && (
            <TabsTrigger value="assets">Gestión de Activos</TabsTrigger>
            )}
        </TabsList>

        {/* Pestaña de Asignaciones */}
        <TabsContent value="assignments">
          {/* ... (código del formulario de asignación múltiple) ... */}
        </TabsContent>

        {/* Pestaña de Solicitudes de Reemplazo */}
        <TabsContent value="requests">
          {/* ... (código de la tabla de solicitudes de reemplazo) ... */}
        </TabsContent>

        {/* Pestaña de Gestión de Usuarios */}
        <TabsContent value="users">
          {/* ... (código de la tabla de gestión de usuarios y diálogo de invitación) ... */}
        </TabsContent>

        {/* Pestaña de Historial de Asignaciones */}
        <TabsContent value="history">
          {/* ... (código de la tabla de historial) ... */}
        </TabsContent>
        
        {/* Pestaña de Gestión de Activos (solo para master) */}
        <TabsContent value="assets">
            {/* ... (contenido futuro) ... */}
        </TabsContent>
        
      </Tabs>

      {/* --- Diálogos (Modales) --- */}

      {/* Diálogo para Editar Usuario */}
      <Dialog open={editUserDialogOpen} onOpenChange={setEditUserDialogOpen}>
          {/* ... (código del diálogo de edición de usuario) ... */}
      </Dialog>
      
      {/* Diálogo de Alerta para Eliminar Usuario */}
       <AlertDialog open={deleteUserDialogOpen} onOpenChange={setDeleteUserDialogOpen}>
          {/* ... (código del diálogo de confirmación de eliminación) ... */}
        </AlertDialog>
        
        {/* Diálogo para Rechazar Solicitudes de Reemplazo */}
        <Dialog open={rejectionDialogOpen} onOpenChange={setRejectionDialogOpen}>
          {/* ... (código del diálogo de rechazo) ... */}
        </Dialog>
    </>
  );
}
