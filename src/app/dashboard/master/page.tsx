
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
import { PlusCircle, Check, X, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, User, Role } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, FormEvent, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { getReplacementRequests, updateReplacementRequestStatus, sendAssignmentRequest, ReplacementRequest, getStockAssets, Asset, getUsers, createUser } from "@/lib/services";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


export default function MasterPage() {
  const { user, loading } = useAuth();
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

  // Assignment form state
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedAsset, setSelectedAsset] = useState('');
  const [quantity, setQuantity] = useState('1');

  // User form state
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<Role | ''>('');


  useEffect(() => {
    if (!loading && (!user || user.role !== 'Master')) {
      router.push('/');
    }
  }, [user, loading, router]);

  const fetchAllData = useCallback(async () => {
    try {
      const [requests, fetchedEmployees, fetchedAssets, allSystemUsers] = await Promise.all([
        getReplacementRequests(),
        getUsers('Empleado'),
        getStockAssets(),
        getUsers()
      ]);
      setReplacementRequests(requests);
      setEmployees(fetchedEmployees);
      setStockAssets(fetchedAssets);
      setAllUsers(allSystemUsers);
    } catch (error) {
        console.error("Error fetching data:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos. Verifique las reglas de Firestore.' });
    }
  }, [toast]);

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user, fetchAllData]);
  
  const handleApprove = async (id: string) => {
    try {
      await updateReplacementRequestStatus(id, 'Aprobado');
      toast({ title: "Solicitud Aprobada", description: `La solicitud ha sido aprobada.` });
      await fetchAllData();
    } catch(error) {
       console.error("Error al aprobar:", error);
       toast({ variant: "destructive", title: "Error", description: "No se pudo aprobar la solicitud." });
    }
  };

  const handleReject = async (id: string) => {
    try {
      await updateReplacementRequestStatus(id, 'Rechazado');
      toast({ variant: "destructive", title: "Solicitud Rechazada", description: `La solicitud ha sido rechazada.` });
      await fetchAllData();
    } catch (error) {
       console.error("Error al rechazar:", error);
       toast({ variant: "destructive", title: "Error", description: "No se pudo rechazar la solicitud." });
    }
  };
  
  const handleAssignmentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const quantityNumber = parseInt(quantity, 10);
    const employee = employees.find(e => e.id === selectedEmployee);
    const asset = stockAssets.find(a => a.id === selectedAsset);

    if (!employee || !asset || isNaN(quantityNumber) || quantityNumber <= 0) {
      toast({ variant: "destructive", title: "Error", description: "Todos los campos son requeridos y la cantidad debe ser válida." });
      return;
    }

    try {
      const result = await sendAssignmentRequest({ 
        employeeId: employee.id,
        employeeName: employee.name, 
        assetId: asset.id!,
        assetName: asset.name, 
        quantity: quantityNumber
      });

      if (result.status === 'Pendiente por Stock') {
        toast({
          variant: 'destructive',
          title: "Stock Insuficiente",
          description: `No hay suficiente stock para ${asset.name}. La solicitud se creó como 'Pendiente por Stock'.`,
        });
      } else {
        toast({ title: "Solicitud Enviada", description: `Se ha solicitado ${quantityNumber} de ${asset.name} para ${employee.name}.` });
      }

      setAssignmentDialogOpen(false);
      setSelectedAsset('');
      setSelectedEmployee('');
      setQuantity('1');
      await fetchAllData(); 
    } catch (error) {
      console.error("Error enviando solicitud:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo enviar la solicitud." });
    }
  };

  const handleUserSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!newUserName || !newUserEmail || !newUserRole) {
      toast({ variant: "destructive", title: "Error", description: "Todos los campos son requeridos." });
      return;
    }

    try {
      await createUser({ name: newUserName, email: newUserEmail, role: newUserRole });
      toast({ title: "Usuario Creado", description: `El usuario ${newUserName} ha sido creado.` });
      setUserDialogOpen(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserRole('');
      await fetchAllData();
    } catch (error: any) {
      console.error("Error creando usuario:", error);
      toast({ variant: "destructive", title: "Error al crear usuario", description: error.message || "Un error desconocido ocurrió." });
    }
  };


  if (loading || !user) {
    return <div>Cargando...</div>;
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-lg font-semibold md:text-2xl">Panel del Master</h1>
        <Dialog open={assignmentDialogOpen} onOpenChange={setAssignmentDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <PlusCircle className="h-4 w-4" />
              Solicitar Asignación
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleAssignmentSubmit}>
              <DialogHeader>
                <DialogTitle>Solicitar Asignación de Activos</DialogTitle>
                <DialogDescription>
                  Asigne nuevos activos a un empleado. El sistema validará el stock disponible.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="employee" className="text-right">Empleado</Label>
                    <Select onValueChange={setSelectedEmployee} value={selectedEmployee} required>
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Seleccione un empleado" />
                        </SelectTrigger>
                        <SelectContent>
                            {employees.map(employee => (
                                <SelectItem key={employee.id} value={employee.id!}>{employee.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="asset" className="text-right">Activo</Label>
                   <Select onValueChange={setSelectedAsset} value={selectedAsset} required>
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Seleccione un activo" />
                        </SelectTrigger>
                        <SelectContent>
                            {stockAssets.map(asset => (
                                <SelectItem key={asset.id} value={asset.id!}>{asset.name} (Stock: {asset.stock || 0})</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="quantity" className="text-right">Cantidad</Label>
                  <Input id="quantity" name="quantity" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} min="1" className="col-span-3" required/>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Enviar Solicitud</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Autorizar Reposición de Activos</CardTitle>
            <CardDescription>
              Revise y apruebe o rechace las solicitudes de reposición.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Activo</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {replacementRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>{request.employee}</TableCell>
                    <TableCell>
                      <div className="font-medium">{request.asset}</div>
                      <div className="text-sm text-muted-foreground">{request.serial}</div>
                    </TableCell>
                    <TableCell>{request.reason}</TableCell>
                    <TableCell>
                      <Badge variant={
                          request.status === 'Pendiente' ? 'secondary' :
                          request.status === 'Aprobado' ? 'default' :
                          'destructive'
                        }>
                          {request.status}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {request.status === 'Pendiente' && (
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleApprove(request.id!)}>
                            <Check className="h-4 w-4 text-green-500" />
                            <span className="sr-only">Aprobar</span>
                          </Button>
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleReject(request.id!)}>
                            <X className="h-4 w-4 text-red-500" />
                            <span className="sr-only">Rechazar</span>
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Gestión de Empleados</CardTitle>
                <CardDescription>
                  Cree y administre los usuarios del sistema.
                </CardDescription>
              </div>
               <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1">
                    <UserPlus className="h-4 w-4" />
                    Crear Usuario
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleUserSubmit}>
                    <DialogHeader>
                      <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                      <DialogDescription>
                        Complete los datos para registrar un nuevo empleado en el sistema.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Nombre</Label>
                        <Input id="name" name="name" className="col-span-3" required value={newUserName} onChange={(e) => setNewUserName(e.target.value)} />
                      </div>
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
                            <SelectItem value="Empleado">Empleado</SelectItem>
                            <SelectItem value="Logistica">Logística</SelectItem>
                            <SelectItem value="Master">Master</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit">Crear Usuario</Button>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>{u.name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <Badge variant={u.role === 'Master' ? 'default' : 'secondary'}>{u.role}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

    