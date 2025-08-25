
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
import { useEffect, useState, FormEvent } from "react";
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

  useEffect(() => {
    if (user) {
        fetchRequests();
    }
  }, [user]);

  const fetchRequests = async () => {
    const requests = await getAssignmentRequests();
    setAssignmentRequests(requests);
  };
  
  const handleAddAsset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const serial = formData.get('serial') as string;
    const description = formData.get('description') as string;
    const location = formData.get('location') as string;
    
    if (!description) {
        toast({ variant: "destructive", title: "Error", description: "La descripción es requerida." });
        return;
    }

    try {
        await addAsset({ serial, description, location });
        toast({ title: "Activo Agregado", description: `El activo ${description} ha sido agregado al inventario.` });
        (event.target as HTMLFormElement).reset();
    } catch (error) {
        console.error("Error agregando activo:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo agregar el activo." });
    }
  };

  const handleProcessRequest = async (id: string) => {
    try {
        await processAssignmentRequest(id);
        toast({ title: "Solicitud Procesada", description: `La solicitud de asignación ${id} ha sido marcada como 'Enviado'.` });
        fetchRequests();
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
                <Label htmlFor="serial">Serial (Obligatorio para equipos eléctricos)</Label>
                <Input id="serial" name="serial" placeholder="SN12345ABC" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Input id="description" name="description" placeholder="Laptop Dell XPS 15" required/>
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
                    <TableCell>{request.employee}</TableCell>
                    <TableCell>{request.asset}</TableCell>
                    <TableCell>{request.quantity}</TableCell>
                    <TableCell>
                      <Badge variant={request.status === 'Pendiente' ? 'destructive' : 'secondary'}>
                        {request.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                       {request.status === 'Pendiente' && (
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
