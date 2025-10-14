'use client';
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
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, FormEvent, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { 
  User, 
  Role, 
  inviteUser, 
  getUsers, 
  updateUser, 
  deleteUser, 
  getReplacementRequests, 
  updateReplacementRequestStatus, 
  sendBulkAssignmentRequests, 
  getStockAssets, 
  Asset,
  ReplacementRequest,
  ReplacementStatus
} from "@/lib/services";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function MasterPage() {
  const { userData, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  // Data state
  const [replacementRequests, setReplacementRequests] = useState<ReplacementRequest[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [stockAssets, setStockAssets] = useState<Asset[]>([]);
  
  // Dialog state for User Management
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false);
  const [currentUserForAction, setCurrentUserForAction] = useState<User | null>(null);

  // New Multi-Assignment form state
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [assignmentRows, setAssignmentRows] = useState([{ id: 1, assetId: '', quantity: 1 }]);

  // User form state
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<Role | ''| undefined>('');


  useEffect(() => {
    if (!loading && (!userData || userData.role !== 'master')) {
      router.push('/');
    }
  }, [userData, loading, router]);

  const fetchAllData = useCallback(async () => {
    try {
      const [requests, fetchedEmployees, fetchedAssets, allSystemUsers] = await Promise.all([
        getReplacementRequests(),
        getUsers('empleado'), 
        getStockAssets(),
        getUsers()
      ]);
      setReplacementRequests(requests);
      setEmployees(fetchedEmployees);
      setStockAssets(fetchedAssets);
      setAllUsers(allSystemUsers);
    } catch (error: any) {
        console.error("Error fetching data:", error);
        toast({ variant: 'destructive', title: 'Error', description: error.message || 'No se pudieron cargar los datos.' });
    }
  }, [toast]);

  useEffect(() => {
    if (userData) {
      fetchAllData();
    }
  }, [userData, fetchAllData]);

  // --- Multi-Assignment Handlers ---
  const addAssignmentRow = () => {
    setAssignmentRows([...assignmentRows, { id: Date.now(), assetId: '', quantity: 1 }]);
  };

  const removeAssignmentRow = (id: number) => {
    setAssignmentRows(assignmentRows.filter(row => row.id !== id));
  };

  const handleAssignmentRowChange = (id: number, field: 'assetId' | 'quantity', value: string | number) => {
    setAssignmentRows(assignmentRows.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const handleBulkAssignmentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const employee = employees.find(e => e.id === selectedEmployee);

    if (!employee) {
      toast({ variant: "destructive", title: "Error", description: "Por favor, seleccione un empleado." });
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
      };
    });

    try {
      await sendBulkAssignmentRequests(requests);
      toast({ title: "Solicitudes Enviadas", description: `${requests.length} solicitudes de asignación han sido creadas para ${employee.name}.` });
      // Reset form
      setSelectedEmployee('');
      setAssignmentRows([{ id: 1, assetId: '', quantity: 1 }]);
      await fetchAllData();
    } catch (error: any) {
      console.error("Error en asignación múltiple:", error);
      toast({ variant: "destructive", title: "Error al Enviar", description: error.message || 'No se pudieron crear las solicitudes.' });
    }
  };

  // --- End Multi-Assignment Handlers ---

  const handleReplacementApproval = async (id: string, status: ReplacementStatus) => {
    try {
      await updateReplacementRequestStatus(id, status);
      toast({ title: `Solicitud ${status === 'aprobado' ? 'Aprobada' : 'Rechazada'}` });
      await fetchAllData();
    } catch (error: any) {
      console.error(`Error updating status:`, error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar la solicitud." });
    }
  };
  
  const handleInviteUserSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newUserEmail || !newUserRole) {
      toast({ variant: "destructive", title: "Error", description: "Correo y Rol son requeridos." });
      return;
    }
    try {
      await inviteUser(newUserEmail, newUserRole);
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

  const handleEditUserClick = (userToEdit: User) => {
    setCurrentUserForAction(userToEdit);
    setNewUserName(userToEdit.name);
    setNewUserEmail(userToEdit.email);
    setNewUserRole(userToEdit.role);
    setEditUserDialogOpen(true);
  }

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

  const handleDeleteUserClick = (userToDelete: User) => {
    setCurrentUserForAction(userToDelete);
    setDeleteUserDialogOpen(true);
  };
  
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

  if (loading || !userData) {
    return <div>Cargando...</div>;
  }

  return (
    <>
      <h1 className="text-lg font-semibold md:text-2xl mb-4">Panel del Master</h1>
      <Tabs defaultValue="assignments" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="assignments">Asignaciones</TabsTrigger>
          <TabsTrigger value="requests">Solicitudes</TabsTrigger>
          <TabsTrigger value="users">Gestión de Usuarios</TabsTrigger>
          <TabsTrigger value="assets">Gestión de Activos</TabsTrigger>
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
                          {isStockAlert && <AlertTriangle className="h-5 w-5 text-destructive" title={`Stock insuficiente. Disponible: ${stock}`} />}
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
                    <TableHead>Justificación</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {replacementRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>{request.employeeName}</TableCell>
                      <TableCell>{request.assetName} ({request.serial})</TableCell>
                      <TableCell>{request.reason}</TableCell>
                      <TableCell>
                        <a href={request.imageUrl} target="_blank" rel="noopener noreferrer" className="underline flex items-center gap-1">
                          Ver Imagen <ExternalLink className="h-4 w-4" />
                        </a>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleReplacementApproval(request.id!, 'aprobado')}>
                            <Check className="h-4 w-4 text-green-500" />
                            <span className="sr-only">Aprobar</span>
                          </Button>
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleReplacementApproval(request.id!, 'rechazado')}>
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
                        <Badge variant={u.role === 'master' ? 'default' : 'secondary'}>{u.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.status === 'activo' ? 'success' : 'outline'}>{u.status}</Badge>
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


      {/* Edit User Dialog */}
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
      
      {/* Delete User Alert Dialog */}
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

    </>
  );
}