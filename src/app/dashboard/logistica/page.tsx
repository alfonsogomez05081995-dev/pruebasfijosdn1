
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
import { useEffect } from "react";

const assignmentRequests = [
  { id: 'ASG001', employee: 'Juan Perez', asset: 'Laptop Dell XPS', quantity: 1, date: '2024-05-14', status: 'Pendiente' },
  { id: 'ASG002', employee: 'Maria Rodriguez', asset: 'Taladro percutor', quantity: 1, date: '2024-05-14', status: 'Pendiente' },
  { id: 'ASG003', employee: 'Pedro Gomez', asset: 'Silla de Oficina', quantity: 2, date: '2024-05-13', status: 'Enviado Parcial' },
];

export default function LogisticaPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !['Master', 'Logistica'].includes(user.role))) {
      router.push('/');
    }
  }, [user, loading, router]);

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
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="serial">Serial (Obligatorio para equipos eléctricos)</Label>
              <Input id="serial" placeholder="SN12345ABC" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Input id="description" placeholder="Laptop Dell XPS 15" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Ubicación</Label>
              <Input id="location" placeholder="Bodega Central, Estante A-3" />
            </div>
            <Button className="w-full">
              <PackagePlus className="mr-2 h-4 w-4" />
              Agregar Activo
            </Button>
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
                         <Button variant="outline" size="sm" className="gap-1">
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
