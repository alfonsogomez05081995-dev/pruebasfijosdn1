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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, FormEvent, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  getMyAssignedAssets,
  confirmAssetReceipt,
  rejectAssetReceipt,
  initiateDevolutionProcess,
  submitReplacementRequest,
  getPendingReplacementRequestsForEmployee,
} from "@/lib/services";
import { Asset, ReplacementRequest, AssetHistoryEvent } from "@/lib/types";
import { formatFirebaseTimestamp } from "@/lib/utils";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function EmpleadoPage() {
  const { userData, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [assignedAssets, setAssignedAssets] = useState<Asset[]>([]);
  const [pendingRequests, setPendingRequests] = useState<ReplacementRequest[]>([]);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [assetToActOn, setAssetToActOn] = useState<Asset | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [replacementDialogOpen, setReplacementDialogOpen] = useState(false);
  const [assetToReplace, setAssetToReplace] = useState<Asset | null>(null);
  const [replacementReason, setReplacementReason] = useState(''); // Motivo (daño, robo, etc.)
  const [replacementJustification, setReplacementJustification] = useState(''); // Justificación detallada
  const [replacementImage, setReplacementImage] = useState<File | null>(null); // Archivo de imagen
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyAsset, setHistoryAsset] = useState<Asset | null>(null);
  const [assetHistory, setAssetHistory] = useState<AssetHistoryEvent[]>([]);

  useEffect(() => {
    if (!loading && (!userData || !['master', 'empleado'].includes(userData.role))) {
      router.push('/');
    }
  }, [userData, loading, router]);

  const fetchAssets = useCallback(async () => {
    if (userData?.id) {
        try {
            const [assets, requests] = await Promise.all([
              getMyAssignedAssets(userData.id),
              getPendingReplacementRequestsForEmployee(userData.id)
            ]);
            setAssignedAssets(assets);
            setPendingRequests(requests);
        } catch(error) {
            console.error("Error fetching data:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar sus datos.' });
        }
    }
  }, [userData, toast]);

  useEffect(() => {
    if (userData) {
      fetchAssets();
    }
  }, [userData, fetchAssets]);

  const handleConfirmReceipt = async (id: string) => {
    if (!userData) return;
    try {
      await confirmAssetReceipt(id, { id: userData.id, name: userData.name });
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
    if (!assetToActOn || !rejectionReason || !userData) {
      toast({ variant: "destructive", title: "Error", description: "Debe proporcionar un motivo de rechazo." });
      return;
    }
    try {
      await rejectAssetReceipt(assetToActOn.id, rejectionReason, { id: userData.id, name: userData.name });
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

  const handleOpenReplacementDialog = (asset: Asset) => {
    setAssetToReplace(asset);
    setReplacementDialogOpen(true);
    setReplacementReason('');
    setReplacementJustification('');
    setReplacementImage(null);
  };

  const handleRequestReplacement = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!assetToReplace || !replacementReason || !replacementJustification || !replacementImage || !userData) {
      toast({ variant: "destructive", title: "Error", description: "Debe proporcionar un motivo, justificación y una imagen." });
      return;
    }
    try {
      // Llamar a la función correcta con todos los datos
      await submitReplacementRequest({
        employeeId: userData.id,
        employeeName: userData.name,
        assetId: assetToReplace.id,
        assetName: assetToReplace.name,
        serial: assetToReplace.serial || 'N/A',
        reason: replacementReason,
        justification: replacementJustification,
        imageFile: replacementImage,
      });
      toast({ title: "Solicitud Enviada", description: "Su solicitud de reemplazo ha sido enviada para aprobación del master." });
      setReplacementDialogOpen(false);
      setAssetToReplace(null);
      setReplacementReason('');
      setReplacementJustification('');
      setReplacementImage(null);
      await fetchAssets();
    } catch (error: any) {
      console.error("Error solicitando reemplazo:", error);
      toast({ variant: "destructive", title: "Error", description: error.message || "No se pudo enviar la solicitud de reemplazo." });
    }
  };

  const handleShowHistory = async (asset: Asset) => {
    setHistoryAsset(asset);
    try {
      const sortedHistory = (asset.history || [])
        .sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis())
        .map(event => ({
          ...event,
          formattedDate: formatFirebaseTimestamp(event.timestamp),
        }));
      setAssetHistory(sortedHistory);
      setHistoryDialogOpen(true);
    } catch (error) {
      console.error("Error fetching asset history:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo cargar el historial del activo." });
    }
  };

  const pendingAssets = assignedAssets.filter(asset => asset.status === 'recibido pendiente');
  const myAssets = assignedAssets.filter(asset => asset.status !== 'recibido pendiente');
  const pendingReplacementAssetIds = new Set(pendingRequests.map(req => req.assetId));

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
                          {pendingReplacementAssetIds.has(asset.id) ? (
                            <Badge variant="destructive">Reemplazo Solicitado</Badge>
                          ) : (
                            <Badge variant={asset.status === 'activo' ? 'default' : asset.status === 'en devolución' ? 'secondary' : 'outline'}>
                              {asset.status}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" className="mr-2" onClick={() => handleShowHistory(asset)}>Ver Historial</Button>
                          {asset.status === 'activo' && !pendingReplacementAssetIds.has(asset.id) && (
                            <Button size="sm" variant="outline" onClick={() => handleOpenReplacementDialog(asset)}>Solicitar Reemplazo</Button>
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

      {/* Replacement Dialog */}
      <Dialog open={replacementDialogOpen} onOpenChange={setReplacementDialogOpen}>
        <DialogContent>
          <form onSubmit={handleRequestReplacement}>
            <DialogHeader>
              <DialogTitle>Solicitar Reemplazo de Activo</DialogTitle>
              <DialogDescription>
                Complete todos los campos para solicitar el reemplazo de <strong>{assetToReplace?.name}</strong>.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Select onValueChange={setReplacementReason} value={replacementReason} required>
                <SelectTrigger><SelectValue placeholder="Seleccione un motivo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daño">Daño</SelectItem>
                  <SelectItem value="desgaste">Desgaste por uso</SelectItem>
                  <SelectItem value="perdida">Pérdida</SelectItem>
                  <SelectItem value="robo">Robo</SelectItem>
                </SelectContent>
              </Select>
              <Textarea
                placeholder="Justifique detalladamente su solicitud. Ej: El portátil no enciende, la batería está fallando..."
                value={replacementJustification}
                onChange={(e) => setReplacementJustification(e.target.value)}
                required
              />
              <Label htmlFor="replacement-image">Imagen de Evidencia</Label>
              <Input id="replacement-image" type="file" accept="image/*" onChange={(e) => setReplacementImage(e.target.files ? e.target.files[0] : null)} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReplacementDialogOpen(false)}>Cancelar</Button>
              <Button type="submit">Enviar Solicitud</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Historial del Activo: {historyAsset?.name}</DialogTitle>
            <DialogDescription>
              A continuación se muestra el historial de movimientos para el activo seleccionado.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Descripción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assetHistory.map((event, index) => (
                  <TableRow key={index}>
                    <TableCell>{event.formattedDate}</TableCell>
                    <TableCell>{event.event}</TableCell>
                    <TableCell>{event.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button onClick={() => setHistoryDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
