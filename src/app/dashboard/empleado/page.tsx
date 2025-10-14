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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, RefreshCw, Undo2, AlertTriangle, XCircle, PackageCheck, PackageX } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, FormEvent, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { getMyAssignedAssets, confirmAssetReceipt, rejectAssetReceipt, initiateDevolutionProcess, Asset } from "@/lib/services";
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
} from "@/components/ui/alert-dialog";

export default function EmpleadoPage() {
  const { userData, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [assignedAssets, setAssignedAssets] = useState<Asset[]>([]);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [assetToActOn, setAssetToActOn] = useState<Asset | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    if (!loading && (!userData || !['master', 'empleado'].includes(userData.role))) {
      router.push('/');
    }
  }, [userData, loading, router]);

  const fetchAssets = useCallback(async () => {
    if (userData?.id) {
        try {
            const assets = await getMyAssignedAssets(userData.id);
            setAssignedAssets(assets);
        } catch(error) {
            console.error("Error fetching assets:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar sus activos.' });
        }
    }
  }, [userData, toast]);

  useEffect(() => {
    if (userData) {
      fetchAssets();
    }
  }, [userData, fetchAssets]);

  const handleConfirmReceipt = async (id: string) => {
    try {
      await confirmAssetReceipt(id);
      toast({ title: "Recepción Confirmada", description: "El estado del activo ha sido actualizado a 'activo'." });
      await fetchAssets();
    } catch (error) {
      console.error("Error confirmando recepción:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo confirmar la recepción." });
    }
  };

  const handleOpenRejectionDialog = (asset: Asset) => {
    setAssetToActOn(asset);
    setRejectionDialogOpen(true);
    setRejectionReason('');
  };

  const handleRejectReceipt = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!assetToActOn || !rejectionReason) {
      toast({ variant: "destructive", title: "Error", description: "Debe proporcionar un motivo de rechazo." });
      return;
    }
    try {
      await rejectAssetReceipt(assetToActOn.id, rejectionReason);
      toast({ title: "Recepción Rechazada", description: "El activo ha sido marcado como 'en disputa'. Logística será notificada." });
      setRejectionDialogOpen(false);
      await fetchAssets();
    } catch (error) {
      console.error("Error rechazando recepción:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo rechazar la recepción." });
    }
  };

  const handleInitiateDevolution = async () => {
    if (!userData) return;
    try {
      await initiateDevolutionProcess(userData.id, userData.name);
      toast({ title: "Proceso de Devolución Iniciado", description: "Tus activos han sido marcados como 'en devolución'. Logística verificará la entrega." });
      await fetchAssets();
    } catch (error: any) {
      console.error("Error iniciando devolución:", error);
      toast({ variant: "destructive", title: "Error", description: error.message || "No se pudo iniciar el proceso." });
    }
  };

  const pendingAssets = assignedAssets.filter(asset => asset.status === 'recibido pendiente');
  const myAssets = assignedAssets.filter(asset => asset.status !== 'recibido pendiente');

  if (loading || !userData) {
    return <div>Cargando...</div>;
  }
  
  return (
    <>
      <h1 className="text-lg font-semibold md:text-2xl mb-4">Portal del Empleado</h1>
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">Activos Pendientes <Badge className="ml-2">{pendingAssets.length}</Badge></TabsTrigger>
          <TabsTrigger value="my-assets">Mis Activos</TabsTrigger>
          <TabsTrigger value="return">Devolución</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {pendingAssets.length > 0 ? (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Activos Pendientes de Recepción</CardTitle>
                <CardDescription>Confirme o rechace los activos que le han sido enviados.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Activo</TableHead>
                      <TableHead>Serial</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingAssets.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell>{asset.name}</TableCell>
                        <TableCell>{asset.serial || 'N/A'}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" className="mr-2" onClick={() => handleConfirmReceipt(asset.id)}>
                            <PackageCheck className="h-4 w-4 mr-2" />
                            Confirmar
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleOpenRejectionDialog(asset)}>
                            <PackageX className="h-4 w-4 mr-2" />
                            Rechazar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card className="mt-6">
              <CardContent className="pt-6">
                <p className="text-center">No tiene activos pendientes de recepción.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="my-assets">
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Mis Activos</CardTitle>
              <CardDescription>Activos actualmente bajo su custodia.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Activo</TableHead>
                    <TableHead>Serial</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myAssets.length > 0 ? (
                    myAssets.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell>{asset.name}</TableCell>
                        <TableCell>{asset.serial || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant={asset.status === 'activo' ? 'success' : asset.status === 'en devolución' ? 'warning' : 'outline'}>
                            {asset.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {asset.status === 'activo' && (
                            <Button size="sm" variant="outline" disabled>Solicitar Reemplazo</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">No tiene activos asignados.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="return">
          <div className="mt-6">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Card className="cursor-pointer hover:border-destructive">
                    <CardHeader className="flex-row items-center gap-4">
                      <Undo2 className="h-8 w-8 text-destructive" />
                      <div>
                        <CardTitle>Devolución de Activos</CardTitle>
                        <CardDescription>
                          Inicie el proceso de devolución de todos sus activos al finalizar su contrato.
                        </CardDescription>
                      </div>
                    </CardHeader>
                  </Card>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle><AlertTriangle className="inline-block mr-2 text-destructive" />¿Está seguro?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción iniciará el proceso de devolución de TODOS sus activos con estado 'activo'. 
                    Es un paso requerido para generar su paz y salvo. No podrá deshacer esta acción.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleInitiateDevolution}>Continuar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </TabsContent>
      </Tabs>

      {/* Rejection Dialog */}
      <Dialog open={rejectionDialogOpen} onOpenChange={setRejectionDialogOpen}>
        <DialogContent>
          <form onSubmit={handleRejectReceipt}>
            <DialogHeader>
              <DialogTitle>Rechazar Activo</DialogTitle>
              <DialogDescription>
                Por favor, explique por qué está rechazando la recepción de este activo. Sea lo más detallado posible.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Textarea
                placeholder="Ej: El equipo llegó con la pantalla rota..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRejectionDialogOpen(false)}>Cancelar</Button>
              <Button type="submit">Enviar Rechazo</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
