
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
import { CheckCircle, RefreshCw, Undo2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const assignedAssets = [
  { id: 'ASSET0123', name: 'Laptop Dell XPS', serial: 'SN12345', assignedDate: '2023-10-15', status: 'Activo' },
  { id: 'ASSET0456', name: 'Monitor LG 27"', serial: 'SN54321', assignedDate: '2023-10-15', status: 'Activo' },
  { id: 'ASSET0789', name: 'Taladro percutor', serial: 'SN67890', assignedDate: '2024-05-15', status: 'Recibido pendiente' },
];


export default function EmpleadoPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== 'Empleado')) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return <div>Cargando...</div>;
  }
  
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Portal del Empleado</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Dialog>
          <DialogTrigger asChild>
            <Card className="cursor-pointer hover:border-primary">
              <CardHeader className="flex-row items-center gap-4">
                <RefreshCw className="h-8 w-8 text-primary" />
                <div>
                  <CardTitle>Solicitar Cambio/Reposición</CardTitle>
                  <CardDescription>
                    Pida un cambio de activo por pérdida, robo o desgaste.
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Solicitar Reposición de Activo</DialogTitle>
              <DialogDescription>
                Complete los detalles de su solicitud. Adjunte una imagen como justificativo.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="asset" className="text-right">Activo</Label>
                <Input id="asset" placeholder="Ej: Laptop SN12345" className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="reason" className="text-right">Motivo</Label>
                <Input id="reason" placeholder="Pérdida, robo, desgaste..." className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="justification" className="text-right">Justificación</Label>
                <Textarea id="justification" placeholder="Describa lo sucedido" className="col-span-3" />
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="picture" className="text-right">Imagen</Label>
                <Input id="picture" type="file" className="col-span-3" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Enviar Solicitud</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <Card>
          <CardHeader className="flex-row items-center gap-4">
            <Undo2 className="h-8 w-8 text-destructive" />
            <div>
              <CardTitle>Devolución de Activos</CardTitle>
              <CardDescription>
                Inicie el proceso de devolución al salir de la empresa.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mis Activos Asignados</CardTitle>
          <CardDescription>
            Confirme la recepción de nuevos equipos y vea su historial.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Activo</TableHead>
                <TableHead>Fecha Asignación</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignedAssets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell>
                    <div className="font-medium">{asset.name}</div>
                    <div className="text-sm text-muted-foreground">{asset.serial}</div>
                  </TableCell>
                  <TableCell>{asset.assignedDate}</TableCell>
                  <TableCell>
                    <Badge variant={asset.status === 'Activo' ? 'default' : 'secondary'}>
                      {asset.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {asset.status === 'Recibido pendiente' && (
                      <Button variant="outline" size="sm" className="gap-1">
                        <CheckCircle className="h-4 w-4" />
                        Confirmar Recibido
                      </Button>
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
