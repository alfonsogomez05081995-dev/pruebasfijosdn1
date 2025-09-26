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
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, FormEvent, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { addAsset, getAssignmentRequests, processAssignmentRequest, AssignmentRequest } from "@/lib/services";

export default function LogisticaPage() {
  const { userData, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [assignmentRequests, setAssignmentRequests] = useState<AssignmentRequest[]>([]);

  // State for Add Asset form
  const [assetSerial, setAssetSerial] = useState('');
  const [assetName, setAssetName] = useState('');
  const [assetLocation, setAssetLocation] = useState('');
  const [assetStock, setAssetStock] = useState('');
  
  useEffect(() => {
    if (!loading && (!userData || !['master', 'logistica'].includes(userData.role))) {
      router.push('/');
    }
  }, [userData, loading, router]);

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
    if (userData) {
        fetchRequests();
    }
  }, [userData, fetchRequests]);

  
  const handleAddAsset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const stockNumber = parseInt(assetStock, 10);
    
    if (!assetName || isNaN(stockNumber) || stockNumber <= 0) {
        toast({ variant: "destructive", title: "Error de Validación", description: "El nombre y una cantidad de stock válida son requeridos." });
        return;
    }

    try {
        await addAsset({ 
            serial: assetSerial,
            name: assetName, 
            location: assetLocation, 
            stock: stockNumber 
        });
        toast({ title: "Activo Agregado", description: `El activo ${assetName} ha sido agregado al inventario.` });
        
        // Reset form
        setAssetName('');
        setAssetSerial('');
        setAssetLocation('');
        setAssetStock('');
    } catch (error: any) {
        console.error("Error agregando activo:", error);
        toast({ variant: "destructive", title: "Error", description: error.message || "No se pudo agregar el activo." });
    }
  };

  const handleProcessRequest = async (id: string) => {
    try {
        await processAssignmentRequest(id);
        toast({ title: "Solicitud Procesada", description: `La solicitud ha sido marcada como 'Enviado'.` });
        await fetchRequests();
    } catch (error: any) {
        console.error("Error procesando solicitud:", error);
        toast({ variant: "destructive", title: "Error", description: error.message || "No se pudo procesar la solicitud." });
    }
  };

  if (loading || !userData) {
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
                <Input id="serial" name="serial" placeholder="SN12345ABC" value={assetSerial} onChange={(e) => setAssetSerial(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nombre / Descripción</Label>
                <Input id="name" name="name" placeholder="Laptop Dell XPS 15" required value={assetName} onChange={(e) => setAssetName(e.target.value)} />
              </div>
               <div className="space-y-2">
                <Label htmlFor="stock">Cantidad (Stock)</Label>
                <Input id="stock" name="stock" type="number" placeholder="10" required min="1" value={assetStock} onChange={(e) => setAssetStock(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Ubicación</Label>
                <Input id="location" name="location" placeholder="Bodega Central, Estante A-3" value={assetLocation} onChange={(e) => setAssetLocation(e.target.value)} />
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
                      <Badge variant={request.status === 'pendiente de envío' ? 'default' : request.status === 'pendiente por stock' ? 'destructive' : 'secondary'}>
                        {request.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                       {request.status === 'pendiente de envío' && (
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