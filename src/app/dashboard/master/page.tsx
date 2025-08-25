
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
import { PlusCircle, Check, X } from "lucide-react";
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
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const replacementRequests = [
  { id: 'REQ001', employee: 'Juan Perez', asset: 'Laptop Dell XPS', serial: 'SN12345', reason: 'Robo', date: '2024-05-10', status: 'Pendiente' },
  { id: 'REQ002', employee: 'Maria Rodriguez', asset: 'Taladro percutor', serial: 'SN67890', reason: 'Desgaste', date: '2024-05-12', status: 'Pendiente' },
  { id: 'REQ003', employee: 'Carlos Sanchez', asset: 'Monitor LG 27"', serial: 'SN54321', reason: 'Pérdida', date: '2024-05-13', status: 'Aprobado' },
];

export default function MasterPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== 'Master')) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return <div>Cargando...</div>;
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Panel del Master</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <PlusCircle className="h-4 w-4" />
              Solicitar Asignación
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Solicitar Asignación de Activos</DialogTitle>
              <DialogDescription>
                Asigne nuevos activos a un empleado. El sistema validará el stock disponible.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="employee" className="text-right">Empleado</Label>
                <Input id="employee" placeholder="Nombre del empleado" className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="asset" className="text-right">Activo</Label>
                <Input id="asset" placeholder="Ej: Laptop, Taladro" className="col-span-3" />
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="quantity" className="text-right">Cantidad</Label>
                <Input id="quantity" type="number" defaultValue="1" className="col-span-3" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Enviar Solicitud</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Autorizar Reposición de Activos</CardTitle>
          <CardDescription>
            Revise y apruebe o rechace las solicitudes de reposición de activos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead>Activo</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Fecha</TableHead>
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
                  <TableCell>{request.date}</TableCell>
                  <TableCell>
                    <Badge variant={request.status === 'Pendiente' ? 'secondary' : 'default'}>
                      {request.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {request.status === 'Pendiente' && (
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="icon" className="h-8 w-8">
                          <Check className="h-4 w-4 text-green-500" />
                          <span className="sr-only">Aprobar</span>
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8">
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
    </>
  );
}
