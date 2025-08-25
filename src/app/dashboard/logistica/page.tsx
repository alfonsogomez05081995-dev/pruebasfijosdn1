
'use client';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PackagePlus, Send } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, FormEvent, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { addAsset, getAssignmentRequests, processAssignmentRequest, AssignmentRequest } from "@/lib/services";

export default function LogisticaPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [assignmentRequests, setAssignmentRequests] = useState<AssignmentRequest[]>([]);
  
  useEffect(() => {
    if (!loading && (!user || !['Master', 'Logistica'].includes(user.role))) {
      router.push('/');
    }
  }, [user, loading, router]);

  const fetchRequests = useCallback(async () => {
    try {
        const requests = await getAssignmentRequests();
        setAssignmentRequests(requests);
    } catch (error) {
        console.error("Error fetching requests:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las solicitudes.' });
    }
  }, [toast]);

  useEffect(() => {
    if (user) {
        fetchRequests();
    }
  }, [user, fetchRequests]);

  
  const handleAddAsset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const serial = formData.get('serial') as string;
    const name = formData.get('name') as string;
    const location = formData.get('location') as string;
    const stock = parseInt(formData.get('stock') as string, 10);
    
    if (!name || isNaN(stock) || stock <= 0) {
        toast({ variant: "destructive", title: "Error de Validación", description: "El nombre y una cantidad de stock válida son requeridos." });
        return;
    }

    try {
        await addAsset({ serial, name, location, stock });
        toast({ title: "Activo Agregado", description: `El activo ${name} ha sido agregado al inventario.` });
        form.reset();
        // Maybe refresh some data here if needed
    } catch (error) {
        console.error("Error agregando activo:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo agregar el activo." });
    }
  };

  const handleProcessRequest = async (id: string) => {
    try {
        await processAssignmentRequest(id);
        toast({ title: "Solicitud Procesada", description: `La solicitud ha sido marcada como 'Enviado'.` });
        await fetchRequests();
    } catch (error) {
        console.error("Error procesando solicitud:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo procesar la solicitud." });
    }
  };

  if (loading || !user) {
    return <div>Cargando...</div>;
  }
  
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Panel de Logística</h1>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Ingresar Activos al Sistema</CardTitle>
            <CardDescription>
              Registre nuevos activos en el inventario.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddAsset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="serial">Serial (Opcional)</Label>
                <Input id="serial" name="serial" placeholder="SN12345ABC" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nombre / Descripción</Label>
                <Input id="name" name="name" placeholder="Laptop Dell XPS 15" required/>
              </div>
               <div className="space-y-2">
                <Label htmlFor="stock">Cantidad (Stock)</Label>
                <Input id="stock" name="stock" type="number" placeholder="10" required min="1" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Ubicación</Label>
                <Input id="location" name="location" placeholder="Bodega Central, Estante A-3" />
              </div>
              <Button type="submit" className="w-full">
                <PackagePlus className="mr-2 h-4 w-4" />
                Agregar Activo
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Gestionar Solicitudes de Asignación</CardTitle>
            <CardDescription>
              Procese las solicitudes de asignación y confirme los envíos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Activo</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignmentRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>{request.employeeName}</TableCell>
                    <TableCell>{request.assetName}</TableCell>
                    <TableCell>{request.quantity}</TableCell>
                    <TableCell>
                      <Badge variant={request.status === 'Pendiente de Envío' ? 'default' : request.status === 'Pendiente por Stock' ? 'destructive' : 'secondary'}>
                        {request.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                       {request.status === 'Pendiente de Envío' && (
                         <Button variant="outline" size="sm" className="gap-1" onClick={() => handleProcessRequest(request.id!)}>
                          <Send className="h-4 w-4" />
                          Procesar
                        </Button>
                       )}
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
