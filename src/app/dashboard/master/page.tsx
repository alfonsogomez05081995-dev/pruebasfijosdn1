
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
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";


const initialRequests = [
  { id: 'REQ001', employee: 'Juan Perez', asset: 'Laptop Dell XPS', serial: 'SN12345', reason: 'Robo', date: '2024-05-10', status: 'Pendiente' },
  { id: 'REQ002', employee: 'Maria Rodriguez', asset: 'Taladro percutor', serial: 'SN67890', reason: 'Desgaste', date: '2024-05-12', status: 'Pendiente' },
  { id: 'REQ003', employee: 'Carlos Sanchez', asset: 'Monitor LG 27"', serial: 'SN54321', reason: 'Pérdida', date: '2024-05-13', status: 'Aprobado' },
];

export default function MasterPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [replacementRequests, setReplacementRequests] = useState(initialRequests);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'Master')) {
      router.push('/');
    }
  }, [user, loading, router]);

  const handleApprove = (id: string) => {
    setReplacementRequests(prev => prev.map(req => req.id === id ? { ...req, status: 'Aprobado' } : req));
    toast({ title: "Solicitud Aprobada", description: `La solicitud ${id} ha sido aprobada.` });
  };

  const handleReject = (id: string) => {
    setReplacementRequests(prev => prev.map(req => req.id === id ? { ...req, status: 'Rechazado' } : req));
     toast({ variant: "destructive", title: "Solicitud Rechazada", description: `La solicitud ${id} ha sido rechazada.` });
  };
  
  const handleAssignmentSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const employee = formData.get('employee');
    const asset = formData.get('asset');
    const quantity = formData.get('quantity');

    // Aquí iría la lógica para enviar la solicitud
    console.log({ employee, asset, quantity });

    toast({ title: "Solicitud Enviada", description: `Se ha solicitado ${quantity} ${asset} para ${employee}.` });
    setAssignmentDialogOpen(false);
  };


  if (loading || !user) {
    return <div>Cargando...</div>;
  }

  return (
    <>
      <div className="flex items-center justify-between">
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
                  <Input id="employee" name="employee" placeholder="Nombre del empleado" className="col-span-3" required/>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="asset" className="text-right">Activo</Label>
                  <Input id="asset" name="asset" placeholder="Ej: Laptop, Taladro" className="col-span-3" required/>
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="quantity" className="text-right">Cantidad</Label>
                  <Input id="quantity" name="quantity" type="number" defaultValue="1" className="col-span-3" required/>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Enviar Solicitud</Button>
              </DialogFooter>
            </form>
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
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleApprove(request.id)}>
                          <Check className="h-4 w-4 text-green-500" />
                          <span className="sr-only">Aprobar</span>
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleReject(request.id)}>
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
