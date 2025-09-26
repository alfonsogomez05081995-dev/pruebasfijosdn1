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
import { PlusCircle, Check, X, UserPlus, FilePenLine, Trash2, AlertTriangle } from "lucide-react";
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
  AlertDialogTrigger,
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
  sendAssignmentRequest, 
  getStockAssets, 
  Asset 
} from "@/lib/services";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// The interfaces for ReplacementRequest should also be in services.ts, but we define it here temporarily
interface ReplacementRequest {
  id?: string;
  employee: string;
  asset: string;
  serial: string;
  reason: string;
  status: string;
}

export default function MasterPage() {
  const { userData, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  // Data state
  const [replacementRequests, setReplacementRequests] = useState<ReplacementRequest[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [stockAssets, setStockAssets] = useState<Asset[]>([]);
  
  // Dialog state
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false);
  
  // User being manipulated
  const [currentUserForAction, setCurrentUserForAction] = useState<User | null>(null);

  // Assignment form state
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedAsset, setSelectedAsset] = useState('');
  const [quantity, setQuantity] = useState('1');

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
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-lg font-semibold md:text-2xl">Panel del Master</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Autorizar Reposición de Activos</CardTitle>
            <CardDescription>
              (Funcionalidad no implementada)
            </CardDescription>
          </CardHeader>
          <CardContent>
          </CardContent>
        </Card>

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
      </div>

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