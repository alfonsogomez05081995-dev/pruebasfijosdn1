'use client';
// Importaciones de componentes de UI y de la biblioteca de iconos.
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Check, X, UserPlus, FilePenLine, Trash2, AlertTriangle, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// Importaciones de hooks y contexto de autenticación.
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, FormEvent, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
// Importaciones de funciones de servicio y tipos de datos.
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
  getDevolutionProcessesForMaster,
  Asset,
  ReplacementRequest,
  DevolutionProcess,
  AssetHistoryEvent,
  getAssetById,
  getAssetByRequestId,
} from "@/lib/services";
import { formatFirebaseTimestamp } from "@/lib/utils";

import { ImagePreviewModal } from "@/components/ui/ImagePreviewModal";
import Image from 'next/image';

// Define el componente de la página del Master.
export default function MasterPage() {
  // Hooks para manejar el estado de la autenticación, el enrutamiento y las notificaciones.
  const { userData, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  // Estados para almacenar los datos de la página.
  const [replacementRequests, setReplacementRequests] = useState<ReplacementRequest[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [stockAssets, setStockAssets] = useState<Asset[]>([]);
  const [assignmentHistory, setAssignmentHistory] = useState<any[]>([]);
  const [devolutionProcesses, setDevolutionProcesses] = useState<DevolutionProcess[]>([]);
  const [imageToPreview, setImageToPreview] = useState<string | null>(null);

  // Estados para el modal de historial
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyAsset, setHistoryAsset] = useState<Asset | null>(null);
  const [assetHistory, setAssetHistory] = useState<AssetHistoryEvent[]>([]);

  // Estados para los diálogos de rechazo.
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [requestToActOn, setRequestToActOn] = useState<ReplacementRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Estados para los diálogos de gestión de usuarios.
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false);
  const [currentUserForAction, setCurrentUserForAction] = useState<User | null>(null);

  // Estados para el formulario de asignación múltiple.
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [assignmentRows, setAssignmentRows] = useState([{ id: 1, assetId: '', quantity: 1 }]);
  const [justification, setJustification] = useState('');
  const [assignmentType, setAssignmentType] = useState<'primera_vez' | 'reposicion' | ''>('');

  // Estados para el formulario de creación de usuarios.
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<Role | ''| undefined>('');

  // Efecto para redirigir al usuario si no tiene el rol de master.
  useEffect(() => {
    if (!loading && (!userData || !userData.role.startsWith('master'))) {
      router.push('/');
    }
  }, [userData, loading, router]);

  // Función para obtener todos los datos necesarios para la página.
  const fetchAllData = useCallback(async () => {
    if (!userData) return;
    try {
      const isOriginalMaster = userData.role === 'master';

      const [requests, fetchedEmployees, fetchedAssets, allSystemUsers, history, devolutions] = await Promise.all([
        getReplacementRequestsForMaster(userData.id),
        getUsers('empleado', isOriginalMaster ? undefined : userData.id),
        getStockAssets(userData.role),
        getUsers(undefined, isOriginalMaster ? undefined : userData.id),
        getAssignmentRequestsForMaster(userData.id),
        getDevolutionProcessesForMaster(userData.id),
      ]);
  
      setReplacementRequests(requests);
      setEmployees(fetchedEmployees);
      setStockAssets(fetchedAssets);
      setAllUsers(allSystemUsers);
      setAssignmentHistory(history);
      setDevolutionProcesses(devolutions);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'No se pudieron cargar los datos.' });
    }
  }, [userData, toast]);

  // Efecto para cargar los datos cuando el componente se monta y el usuario está autenticado.
  useEffect(() => {
    if (userData) {
      fetchAllData();
    }
  }, [userData, fetchAllData]);

  // Muestra el historial de un activo por su ID.
  const handleShowHistory = async (assetId: string) => {
    try {
      const asset = await getAssetById(assetId);
      if (!asset) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo encontrar el activo." });
        return;
      }
      setHistoryAsset(asset);
      const sortedHistory = (asset.history || [])
        .sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis())
        .map(event => ({
          ...event,
          formattedDate: formatFirebaseTimestamp(event.timestamp),
        }));
      setAssetHistory(sortedHistory);
      setHistoryDialogOpen(true);
    } catch (error) {
      console.error("Error fetching asset history:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo cargar el historial del activo." });
    }
  };

  // Muestra el historial de un activo basado en el ID de la solicitud.
  const handleShowHistoryForRequest = async (requestId: string) => {
    try {
      const asset = await getAssetByRequestId(requestId);
      if (!asset) {
        toast({ variant: "destructive", title: "Error", description: "No se encontró un activo asociado a esta solicitud." });
        return;
      }
      handleShowHistory(asset.id);
    } catch (error) {
      console.error("Error fetching asset by request ID:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo cargar el historial para esta solicitud." });
    }
  };

  // --- Manejadores de Asignación Múltiple ---
  // Añade una nueva fila al formulario de asignación.
  const addAssignmentRow = () => {
    setAssignmentRows([...assignmentRows, { id: Date.now(), assetId: '', quantity: 1 }]);
  };

  // Elimina una fila del formulario de asignación.
  const removeAssignmentRow = (id: number) => {
    setAssignmentRows(assignmentRows.filter(row => row.id !== id));
  };

  // Maneja los cambios en una fila del formulario de asignación.
  const handleAssignmentRowChange = (id: number, field: 'assetId' | 'quantity', value: string | number) => {
    setAssignmentRows(assignmentRows.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  // Maneja el envío del formulario de asignación múltiple.
  const handleBulkAssignmentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const employee = employees.find(e => e.id === selectedEmployee);

    if (!employee) {
      toast({ variant: "destructive", title: "Error", description: "Por favor, seleccione un empleado." });
      return;
    }

    if (!assignmentType || !justification) {
      toast({ variant: "destructive", title: "Error", description: "Debe seleccionar un tipo de asignación y proporcionar una justificación." });
      return;
    }

    const invalidRows = assignmentRows.filter(row => !row.assetId || row.quantity <= 0);
    if (invalidRows.length > 0) {
      toast({ variant: "destructive", title: "Error", description: "Por favor, complete todos los campos de activos y asegúrese que la cantidad sea mayor a 0." });
      return;
    }

    const requests = assignmentRows.map(row => {
      const asset = stockAssets.find(a => a.id === row.assetId);
      return {
        employeeId: employee.id,
        employeeName: employee.name,
        assetId: row.assetId,
        assetName: asset?.name || '',
        quantity: Number(row.quantity),
        justification,
        assignmentType,
        masterId: userData.id,
        masterName: userData.name,
      };
    });

    try {
      await sendBulkAssignmentRequests(requests);
      toast({ title: "Solicitudes Enviadas", description: `${requests.length} solicitudes de asignación han sido creadas para ${employee.name}.` });
      // Reinicia el formulario.
      setSelectedEmployee('');
      setAssignmentRows([{ id: 1, assetId: '', quantity: 1 }]);
      setJustification('');
      setAssignmentType('');
      await fetchAllData();
    } catch (error: any) {
      console.error("Error en asignación múltiple:", error);
      toast({ variant: "destructive", title: "Error al Enviar", description: error.message || 'No se pudieron crear las solicitudes.' });
    }
  };
  // --- Fin de los Manejadores de Asignación Múltiple ---

  // Abre el diálogo para rechazar una solicitud.
  const handleOpenRejectionDialog = (request: ReplacementRequest) => {
    setRequestToActOn(request);
    setRejectionDialogOpen(true);
    setRejectionReason('');
  };
  
  // Maneja el envío del formulario de rechazo.
  const handleRejectSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!requestToActOn || !rejectionReason || !userData) {
      toast({ variant: "destructive", title: "Error", description: "Debe proporcionar un motivo de rechazo y estar autenticado." });
      return;
    }
    try {
      await rejectReplacementRequest(requestToActOn.id, rejectionReason, { id: userData.id, name: userData.name });
      toast({ title: "Solicitud Rechazada" });
      setRejectionDialogOpen(false);
      await fetchAllData();
    } catch (error: any) {
      console.error(`Error rejecting request:`, error);
      toast({ variant: "destructive", title: "Error", description: error.message || "No se pudo rechazar la solicitud." });
    }
  };
  
  // Maneja la aprobación de una solicitud.
  const handleApproveRequest = async (id: string) => {
    if (!userData) return;
    try {
      await approveReplacementRequest(id, { id: userData.id, name: userData.name }); 
      toast({ title: `Solicitud Aprobada` });
      await fetchAllData();
    } catch (error: any) {
      console.error(`Error approving request:`, error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo aprobar la solicitud." });
    }
  };  

  // Maneja el envío del formulario para invitar a un usuario.
  const handleInviteUserSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newUserEmail || !newUserRole) {
      toast({ variant: "destructive", title: "Error", description: "Correo y Rol son requeridos." });
      return;
    }
    try {
      await inviteUser(newUserEmail, newUserRole, userData.id);
      toast({ title: "Usuario Invitado", description: `Se ha enviado una invitación a ${newUserEmail}.` });
      setUserDialogOpen(false);
      setNewUserEmail('');
      setNewUserRole('');
      await fetchAllData();
    } catch (error: any) {
      console.error("Error invitando usuario:", error);
      toast({ variant: "destructive", title: "Error al invitar", description: error.message || "Un error desconocido ocurrió." });
    }
  };

  // Maneja el clic en el botón de editar usuario.
  const handleEditUserClick = (userToEdit: User) => {
    setCurrentUserForAction(userToEdit);
    setNewUserName(userToEdit.name);
    setNewUserEmail(userToEdit.email);
    setNewUserRole(userToEdit.role);
    setEditUserDialogOpen(true);
  }

  // Maneja el envío del formulario para actualizar un usuario.
  const handleUpdateUserSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentUserForAction || !newUserName || !newUserRole) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar el usuario. Faltan datos." });
        return;
    }
    try {
        await updateUser(currentUserForAction.id, { name: newUserName, role: newUserRole });
        toast({ title: "Usuario Actualizado", description: `Los datos de ${newUserName} han sido actualizados.` });
        setEditUserDialogOpen(false);
        setCurrentUserForAction(null);
        await fetchAllData();
    } catch (error: any) {
        console.error("Error actualizando usuario:", error);
        toast({ variant: "destructive", title: "Error al actualizar", description: error.message });
    }
  }

  // Maneja el clic en el botón de eliminar usuario.
  const handleDeleteUserClick = (userToDelete: User) => {
    setCurrentUserForAction(userToDelete);
    setDeleteUserDialogOpen(true);
  };
  
  // Confirma la eliminación de un usuario.
  const confirmDeleteUser = async () => {
    if (!currentUserForAction) return;
    try {
        await deleteUser(currentUserForAction.id);
        toast({ title: "Usuario Eliminado", description: `El usuario ${currentUserForAction.name} ha sido eliminado.` });
        await fetchAllData();
    } catch (error: any) {
        toast({ variant: "destructive", title: "Error al eliminar", description: error.message });
    } finally {
        setDeleteUserDialogOpen(false);
        setCurrentUserForAction(null);
    }
  };

  // Muestra un mensaje de carga mientras se obtienen los datos del usuario.
  if (loading || !userData) {
    return <div>Cargando...</div>;
  }

  // Renderiza la interfaz de la página del Master.
  return (
    <>
      <h1 className="text-lg font-semibold md:text-2xl mb-4">Panel del Master</h1>
      <Tabs defaultValue="assignments" className="w-full">
        <TabsList className={`grid w-full ${userData.role === 'master' ? 'grid-cols-6' : 'grid-cols-5'}`}>
          <TabsTrigger value="assignments">Asignaciones</TabsTrigger>
          <TabsTrigger value="requests" className={replacementRequests.length > 0 ? "text-destructive" : ""}>
            Solicitudes
            {replacementRequests.length > 0 && (
              <Badge variant="destructive" className="ml-2">{replacementRequests.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="devolutions">Devoluciones</TabsTrigger>
          <TabsTrigger value="users">Gestión de Usuarios</TabsTrigger>
          <TabsTrigger value="history">Historial de Asignaciones</TabsTrigger>
          {userData.role === 'master' && (
            <TabsTrigger value="assets">Gestión de Activos</TabsTrigger>
            )}
        </TabsList>

        <TabsContent value="assignments">
          <Card>
            <CardHeader>
              <CardTitle>Crear Nueva Asignación Múltiple</CardTitle>
              <CardDescription>Seleccione un empleado y añada los activos que desea asignar.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBulkAssignmentSubmit}>
                <div className="grid gap-6">
                  <div>
                    <Label htmlFor="employee-select">Seleccionar Empleado</Label>
                    <Select onValueChange={setSelectedEmployee} value={selectedEmployee} required>
                      <SelectTrigger id="employee-select">
                        <SelectValue placeholder="Seleccione un empleado" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map(employee => (
                          <SelectItem key={employee.id} value={employee.id!}>{employee.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="assignmentType">Tipo de Asignación</Label>
                    <Select onValueChange={(value) => setAssignmentType(value as any)} value={assignmentType} required>
                      <SelectTrigger id="assignmentType">
                        <SelectValue placeholder="Seleccione el tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="primera_vez">Asignación por Primera Vez</SelectItem>
                        <SelectItem value="reposicion">Reposición</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="justification">Justificación de la Asignación</Label>
                    <Textarea
                      id="justification"
                      placeholder="Describa por qué se realiza esta asignación..."
                      value={justification}
                      onChange={(e) => setJustification(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid gap-4">
                    <Label>Activos a Asignar</Label>
                    {assignmentRows.map((row, index) => {
                      const selectedAssetInfo = stockAssets.find(a => a.id === row.assetId);
                      const stock = selectedAssetInfo?.stock || 0;
                      const isStockAlert = row.quantity > stock;

                      return (
                        <div key={row.id} className="flex items-center gap-2 p-2 border rounded-lg">
                          <Select onValueChange={(value) => handleAssignmentRowChange(row.id, 'assetId', value)} value={row.assetId}>
                            <SelectTrigger className="flex-grow">
                              <SelectValue placeholder="Seleccione un activo" />
                            </SelectTrigger>
                            <SelectContent>
                              {stockAssets.map(asset => (
                                <SelectItem key={asset.id} value={asset.id!}>{asset.name} (Stock: {asset.stock || 0})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            placeholder="Cant."
                            min="1"
                            value={row.quantity}
                            onChange={(e) => handleAssignmentRowChange(row.id, 'quantity', parseInt(e.target.value, 10) || 1)}
                            className={`w-24 ${isStockAlert ? 'border-destructive' : ''}`}
                          />
                          {isStockAlert && <AlertTriangle className="h-5 w-5 text-destructive" />}
                          <Button variant="ghost" size="icon" onClick={() => removeAssignmentRow(row.id)} disabled={assignmentRows.length <= 1}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-4">
                    <Button type="button" variant="outline" onClick={addAssignmentRow}>Añadir Activo</Button>
                    <Button type="submit">Crear Solicitudes</Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>Autorizar Reposición de Activos</CardTitle>
              <CardDescription>
                Revise y apruebe o rechace las solicitudes de reposición pendientes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Activo</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Justificación (Texto)</TableHead>
                    <TableHead>Imagen</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {replacementRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>{request.employeeName}</TableCell>
                      <TableCell>{request.assetName} ({request.serial})</TableCell>
                      <TableCell>{request.reason}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={request.justification || 'No registrada'}>
                        {request.justification || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {request.imageUrl && (
                          <button onClick={() => setImageToPreview(request.imageUrl || null)} className="w-16 h-16 relative border rounded-md overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={request.imageUrl} alt="Thumbnail de evidencia" className="w-full h-full object-cover" />
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleApproveRequest(request.id!)}>
                            <Check className="h-4 w-4 text-green-500" />
                            <span className="sr-only">Aprobar</span>
                          </Button>
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleOpenRejectionDialog(request)}>
                            <X className="h-4 w-4 text-red-500" />
                            <span className="sr-only">Rechazar</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devolutions">
          <Card>
            <CardHeader>
              <CardTitle>Procesos de Devolución</CardTitle>
              <CardDescription>
                Supervise el estado de los procesos de devolución de sus empleados.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Fecha de Inicio</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Activos en Proceso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devolutionProcesses.length > 0 ? devolutionProcesses.map((process) => (
                    <TableRow key={process.id}>
                      <TableCell>{process.employeeName}</TableCell>
                      <TableCell>{process.formattedDate}</TableCell>
                      <TableCell>
                        <Badge variant={process.status === 'completado' ? 'default' : 'secondary'}>{process.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {process.assets.map(a => (
                            <Button key={a.id} variant="link" className="h-auto p-0 justify-start" onClick={() => handleShowHistory(a.id)}>
                              {a.name} ({a.serial})
                            </Button>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={4} className="text-center">No hay procesos de devolución.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Gestión de Usuarios</CardTitle>
                <CardDescription>
                  Invite y administre los usuarios del sistema.
                </CardDescription>
              </div>
              <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1">
                    <UserPlus className="h-4 w-4" />
                    Invitar Usuario
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleInviteUserSubmit}>
                    <DialogHeader>
                      <DialogTitle>Invitar Nuevo Usuario</DialogTitle>
                      <DialogDescription>
                        Ingrese el correo y asigne un rol para invitar a un nuevo usuario al sistema.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="email" className="text-right">Correo</Label>
                        <Input id="email" name="email" type="email" className="col-span-3" required value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="role" className="text-right">Rol</Label>
                        <Select name="role" required onValueChange={(value) => setNewUserRole(value as Role)} value={newUserRole}>
                          <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Seleccione un rol" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="empleado">Empleado</SelectItem>
                            <SelectItem value="logistica">Logística</SelectItem>
                            <SelectItem value="master">Master</SelectItem>
                            <SelectItem value="master_it">Master IT</SelectItem>
                            <SelectItem value="master_campo">Master Campo</SelectItem>
                            <SelectItem value="master_depot">Master Depot</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit">Invitar Usuario</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Correo</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>{u.name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <Badge variant={u.role.startsWith('master') ? 'default' : 'secondary'}>{u.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.status === 'activo' ? 'default' : 'outline'}>{u.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleEditUserClick(u)}>
                            <FilePenLine className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                          </Button>
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleDeleteUserClick(u)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                            <span className="sr-only">Eliminar</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Asignaciones</CardTitle>
              <CardDescription>
                Aquí puede ver el estado de todas las solicitudes de asignación que ha creado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Activo</TableHead>
                    <TableHead className="hidden md:table-cell">Cantidad</TableHead>
                    <TableHead className="hidden lg:table-cell">Tipo</TableHead>
                    <TableHead>Justificación</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Guía</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignmentHistory.length > 0 ? assignmentHistory.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>{req.date ? new Date(req.date.seconds * 1000).toLocaleDateString() : 'N/A'}</TableCell>
                      <TableCell>{req.employeeName}</TableCell>
                      <TableCell>
                        <Button variant="link" className="h-auto p-0" onClick={() => handleShowHistoryForRequest(req.id)}>
                          {req.assetName}
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{req.quantity}</TableCell>
                      <TableCell className="hidden lg:table-cell">{req.assignmentType === 'primera_vez' ? 'Primera Vez' : req.assignmentType === 'reposicion' ? 'Reposición' : 'N/A'}</TableCell>
                      <TableCell className="max-w-[150px] truncate" title={req.justification || 'No registrada'}>{req.justification || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={
                          req.status === 'recibido a conformidad' ? 'default' :
                          req.status === 'enviado' ? 'secondary' : 
                          req.status === 'rechazado' ? 'destructive' : 'outline'
                        }>{req.status}</Badge>
                      </TableCell>
                      <TableCell>{req.trackingNumber || 'N/A'}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={8} className="text-center">No hay historial de asignaciones.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="assets">
            <Card>
                <CardHeader>
                    <CardTitle>Gestión de Activos y Kits</CardTitle>
                    <CardDescription>
                        Cree, edite, elimine y organice activos y kits de herramientas.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p>Próximamente: Herramientas para la gestión de activos y la creación de kits.</p>
                </CardContent>
            </Card>
        </TabsContent>
        
      </Tabs>

      {imageToPreview && (
        <ImagePreviewModal imageUrl={imageToPreview} onClose={() => setImageToPreview(null)} />
      )}

      {/* Diálogo para Editar Usuario */}
      <Dialog open={editUserDialogOpen} onOpenChange={setEditUserDialogOpen}>
          <DialogContent>
              <form onSubmit={handleUpdateUserSubmit}>
                  <DialogHeader>
                      <DialogTitle>Editar Usuario</DialogTitle>
                      <DialogDescription>
                          Modifique los datos del usuario. El correo no se puede cambiar.
                      </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="email-edit" className="text-right">Correo</Label>
                          <Input id="email-edit" name="email" type="email" className="col-span-3" disabled value={currentUserForAction?.email || ''} />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="name-edit" className="text-right">Nombre</Label>
                          <Input id="name-edit" name="name" className="col-span-3" required value={newUserName} onChange={(e) => setNewUserName(e.target.value)} />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="role-edit" className="text-right">Rol</Label>
                          <Select name="role" required onValueChange={(value) => setNewUserRole(value as Role)} value={newUserRole}>
                              <SelectTrigger className="col-span-3">
                                  <SelectValue placeholder="Seleccione un rol" />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="empleado">Empleado</SelectItem>
                                  <SelectItem value="logistica">Logística</SelectItem>
                                  <SelectItem value="master">Master</SelectItem>
                                  <SelectItem value="master_it">Master IT</SelectItem>
                                  <SelectItem value="master_campo">Master Campo</SelectItem>
                                  <SelectItem value="master_depot">Master Depot</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>
                  </div>
                  <DialogFooter>
                      <Button type="submit">Guardar Cambios</Button>
                  </DialogFooter>
              </form>
          </DialogContent>
      </Dialog>
      
      {/* Diálogo de Alerta para Eliminar Usuario */}
       <AlertDialog open={deleteUserDialogOpen} onOpenChange={setDeleteUserDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle><AlertTriangle className="inline-block mr-2 text-destructive" />¿Está seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará permanentemente al usuario <strong>{currentUserForAction?.name}</strong>.
                 No podrá deshacer esta acción.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setCurrentUserForAction(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteUser}>Eliminar Usuario</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        {/* Diálogo para Rechazar Solicitudes de Reemplazo */}
        <Dialog open={rejectionDialogOpen} onOpenChange={setRejectionDialogOpen}>
          <DialogContent>
            <form onSubmit={handleRejectSubmit}>
              <DialogHeader>
                <DialogTitle>Rechazar Solicitud de Reemplazo</DialogTitle>
                <DialogDescription>
                  Por favor, explique por qué está rechazando esta solicitud para el activo <strong>{requestToActOn?.assetName}</strong>. El empleado será notificado.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <Label htmlFor="rejectionReason">Motivo del Rechazo</Label>
                <Textarea
                  id="rejectionReason"
                  placeholder="Ej: El daño reportado no justifica un reemplazo, el activo aún es funcional..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  required
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setRejectionDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" variant="destructive">Confirmar Rechazo</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

      {/* Diálogo para mostrar el historial de un activo */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Historial del Activo: {historyAsset?.name}</DialogTitle>
            <DialogDescription>
              A continuación se muestra el historial de movimientos para el activo seleccionado.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Descripción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assetHistory.map((event, index) => (
                  <TableRow key={index}>
                    <TableCell>{event.formattedDate}</TableCell>
                    <TableCell>{event.event}</TableCell>
                    <TableCell>{event.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button onClick={() => setHistoryDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        
    </>
  );
}
