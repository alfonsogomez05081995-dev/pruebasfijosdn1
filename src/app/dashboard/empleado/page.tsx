
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
import { CheckCircle, RefreshCw, Undo2, AlertTriangle } from "lucide-react";
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
import { useEffect, useState, FormEvent, ChangeEvent, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { getMyAssignedAssets, confirmAssetReceipt, submitReplacementRequest, Asset, getAssetById } from "@/lib/services";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export default function EmpleadoPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [assignedAssets, setAssignedAssets] = useState<Asset[]>([]);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  
  // State for the replacement request form
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [reason, setReason] = useState('');
  const [justification, setJustification] = useState('');
  const [imageFile, setImageFile] = useState<File | undefined>();

  useEffect(() => {
    if (!loading && (!user || !['Master', 'Empleado'].includes(user.role))) {
      router.push('/');
    }
  }, [user, loading, router]);

  const fetchAssets = useCallback(async () => {
    if (user?.id) {
        try {
            const assets = await getMyAssignedAssets(user.id);
            setAssignedAssets(assets);
        } catch(error) {
            console.error("Error fetching assets:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar sus activos.' });
        }
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      fetchAssets();
    }
  }, [user, fetchAssets]);

  const handleConfirmReceipt = async (id: string) => {
    try {
      await confirmAssetReceipt(id);
      toast({ title: "Recepción Confirmada", description: "El estado del activo ha sido actualizado a 'Activo'." });
      await fetchAssets();
    } catch (error) {
      console.error("Error confirmando recepción:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo confirmar la recepción." });
    }
  };
  
  const handleRequestSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!user || !selectedAssetId || !reason || !justification) {
      toast({ variant: "destructive", title: "Error", description: "Por favor, complete todos los campos." });
      return;
    }

    try {
        const asset = await getAssetById(selectedAssetId);
        if (!asset) {
            toast({ variant: "destructive", title: "Error", description: "Activo no encontrado." });
            return;
        }

        await submitReplacementRequest({
            employee: user.name,
            employeeId: user.id,
            asset: asset.name,
            assetId: selectedAssetId,
            serial: asset.serial,
            reason,
            justification,
            imageFile,
        });
        toast({ title: "Solicitud Enviada", description: `Su solicitud de reposición para ${asset.name} ha sido enviada.` });
        setRequestDialogOpen(false);
        // Reset form state
        setSelectedAssetId('');
        setReason('');
        setJustification('');
        setImageFile(undefined);
    } catch(error) {
        console.error("Error enviando solicitud:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo enviar la solicitud." });
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    } else {
      setImageFile(undefined);
    }
  };

  if (loading || !user) {
    return <div>Cargando...</div>;
  }
  
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Portal del Empleado</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
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
            <form onSubmit={handleRequestSubmit}>
              <DialogHeader>
                <DialogTitle>Solicitar Reposición de Activo</DialogTitle>
                <DialogDescription>
                  Complete los detalles de su solicitud. Adjunte una imagen como justificativo.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="asset" className="text-right">Activo</Label>
                    <Select onValueChange={setSelectedAssetId} value={selectedAssetId} required>
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Seleccione un activo" />
                        </SelectTrigger>
                        <SelectContent>
                            {assignedAssets.filter(a => a.status === 'Activo').map(asset => (
                                <SelectItem key={asset.id} value={asset.id!}>{asset.name} ({asset.serial})</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="reason" className="text-right">Motivo</Label>
                  <Input id="reason" name="reason" placeholder="Pérdida, robo, desgaste..." className="col-span-3" required value={reason} onChange={(e) => setReason(e.target.value)} />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="justification" className="text-right">Justificación</Label>
                  <Textarea id="justification" name="justification" placeholder="Describa lo sucedido" className="col-span-3" required value={justification} onChange={(e) => setJustification(e.target.value)} />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="picture" className="text-right">Imagen</Label>
                  <Input id="picture" name="picture" type="file" className="col-span-3" onChange={handleFileChange} />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Enviar Solicitud</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
             <Card className="cursor-pointer hover:border-destructive">
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
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle><AlertTriangle className="inline-block mr-2 text-destructive" />¿Está seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción iniciará el proceso de devolución de TODOS sus activos asignados. 
                Es un paso requerido para generar su paz y salvo. No podrá deshacer esta acción.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => toast({ title: 'Próximamente', description: 'La función de devolución de activos estará disponible pronto.' })}>Continuar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => handleConfirmReceipt(asset.id!)}>
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
