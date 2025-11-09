'use client';
// Importaciones de React, Next.js, y componentes de UI.
import { useEffect, useState, FormEvent, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, RefreshCw, Undo2, AlertTriangle, XCircle, PackageCheck, PackageX } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Importaciones de la lógica de la aplicación (contextos, servicios, tipos).
import { useAuth } from "@/contexts/AuthContext";
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

/**
 * Componente EmpleadoPage.
 * Este es el portal principal para los usuarios con el rol 'empleado'.
 * Les permite ver sus activos asignados, confirmar la recepción de nuevos activos,
 * solicitar reemplazos e iniciar el proceso de devolución.
 */
export default function EmpleadoPage() {
  // --- Hooks y Estados ---
  const { userData, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  // Estados para manejar los datos de la UI.
  const [assignedAssets, setAssignedAssets] = useState<Asset[]>([]); // Lista de todos los activos asignados.
  const [pendingRequests, setPendingRequests] = useState<ReplacementRequest[]>([]); // Solicitudes de reemplazo pendientes.
  
  // Estados para controlar los diálogos (modales).
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [replacementDialogOpen, setReplacementDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

  // Estados para el activo seleccionado en una operación.
  const [assetToActOn, setAssetToActOn] = useState<Asset | null>(null);
  const [assetToReplace, setAssetToReplace] = useState<Asset | null>(null);
  const [historyAsset, setHistoryAsset] = useState<Asset | null>(null);
  const [assetHistory, setAssetHistory] = useState<AssetHistoryEvent[]>([]);

  // Estados para los formularios dentro de los diálogos.
  const [rejectionReason, setRejectionReason] = useState('');
  const [replacementReason, setReplacementReason] = useState('');
  const [replacementJustification, setReplacementJustification] = useState('');
  const [replacementImage, setReplacementImage] = useState<File | null>(null);

  // Efecto para proteger la ruta y asegurar que solo 'empleado' o 'master' puedan acceder.
  useEffect(() => {
    if (!loading && (!userData || !['master', 'empleado'].includes(userData.role))) {
      router.push('/'); // Redirige si no tiene el rol adecuado.
    }
  }, [userData, loading, router]);

  /**
   * Obtiene los datos del empleado (activos asignados y solicitudes pendientes) desde el backend.
   * `useCallback` se usa para memorizar la función y optimizar el rendimiento.
   */
  const fetchAssets = useCallback(async () => {
    if (userData?.id) {
        try {
            // Ejecuta ambas peticiones en paralelo para mayor eficiencia.
            const [assets, requests] = await Promise.all([
              getMyAssignedAssets(userData.id),
              getPendingReplacementRequestsForEmployee(userData.id)
            ]);
            setAssignedAssets(assets);
            setPendingRequests(requests);
        } catch(error) {
            console.error("Error al obtener los datos:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar sus datos.' });
        }
    }
  }, [userData, toast]);

  // Efecto para cargar los datos cuando el componente se monta y el usuario está disponible.
  useEffect(() => {
    if (userData) {
      fetchAssets();
    }
  }, [userData, fetchAssets]);

  // --- Manejadores de Acciones del Empleado ---

  /**
   * Maneja la confirmación de la recepción de un activo.
   * @param {string} id - El ID del activo a confirmar.
   */
  const handleConfirmReceipt = async (id: string) => {
    if (!userData) return;
    try {
      await confirmAssetReceipt(id, { id: userData.id, name: userData.name });
      toast({ title: "Recepción Confirmada", description: "El estado del activo ha sido actualizado a 'activo'." });
      await fetchAssets(); // Refresca los datos.
    } catch (error) {
      console.error("Error confirmando recepción:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo confirmar la recepción." });
    }
  };

  /**
   * Abre el diálogo para que el empleado ingrese el motivo del rechazo.
   * @param {Asset} asset - El activo que se va a rechazar.
   */
  const handleOpenRejectionDialog = (asset: Asset) => {
    setAssetToActOn(asset);
    setRejectionDialogOpen(true);
    setRejectionReason('');
  };

  /**
   * Maneja el envío del formulario de rechazo de un activo.
   * @param {FormEvent<HTMLFormElement>} event - El evento del formulario.
   */
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
      await fetchAssets(); // Refresca los datos.
    } catch (error) {
      console.error("Error rechazando recepción:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo rechazar la recepción." });
    }
  };

  /**
   * Inicia el proceso de devolución de todos los activos del empleado.
   */
  const handleInitiateDevolution = async () => {
    if (!userData) return;
    try {
      await initiateDevolutionProcess(userData.id, userData.name);
      toast({ title: "Proceso de Devolución Iniciado", description: "Tus activos han sido marcados como 'en devolución'. Logística verificará la entrega." });
      await fetchAssets(); // Refresca los datos.
    } catch (error: any) {
      console.error("Error iniciando devolución:", error);
      toast({ variant: "destructive", title: "Error", description: error.message || "No se pudo iniciar el proceso." });
    }
  };

  /**
   * Abre el diálogo para solicitar el reemplazo de un activo.
   * @param {Asset} asset - El activo a reemplazar.
   */
  const handleOpenReplacementDialog = (asset: Asset) => {
    setAssetToReplace(asset);
    setReplacementDialogOpen(true);
    // Resetea los campos del formulario.
    setReplacementReason('');
    setReplacementJustification('');
    setReplacementImage(null);
  };

  /**
   * Maneja el envío del formulario de solicitud de reemplazo.
   * @param {FormEvent<HTMLFormElement>} event - El evento del formulario.
   */
  const handleRequestReplacement = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!assetToReplace || !replacementReason || !replacementJustification || !replacementImage || !userData) {
      toast({ variant: "destructive", title: "Error", description: "Debe proporcionar un motivo, justificación y una imagen." });
      return;
    }
    try {
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
      await fetchAssets(); // Refresca los datos.
    } catch (error: any) {
      console.error("Error solicitando reemplazo:", error);
      toast({ variant: "destructive", title: "Error", description: error.message || "No se pudo enviar la solicitud de reemplazo." });
    }
  };

  /**
   * Muestra el historial de un activo en un diálogo.
   * @param {Asset} asset - El activo cuyo historial se va a mostrar.
   */
  const handleShowHistory = async (asset: Asset) => {
    setHistoryAsset(asset);
    try {
      // Ordena el historial por fecha descendente y formatea la fecha.
      const sortedHistory = (asset.history || [])
        .sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis())
        .map(event => ({
          ...event,
          formattedDate: formatFirebaseTimestamp(event.timestamp),
        }));
      setAssetHistory(sortedHistory);
      setHistoryDialogOpen(true);
    } catch (error) {
      console.error("Error al obtener el historial del activo:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo cargar el historial del activo." });
    }
  };

  // --- Lógica de Renderizado ---

  // Filtra los activos en diferentes categorías para mostrarlos en las pestañas correspondientes.
  const pendingAssets = assignedAssets.filter(asset => asset.status === 'recibido pendiente');
  const myAssets = assignedAssets.filter(asset => asset.status !== 'recibido pendiente');
  const pendingReplacementAssetIds = new Set(pendingRequests.map(req => req.assetId));

  // Muestra un mensaje de carga mientras se obtienen los datos del usuario.
  if (loading || !userData) {
    return <div>Cargando...</div>;
  }
  
  // Renderiza la interfaz de la página del empleado.
  return (
    <>
      <h1 className="text-lg font-semibold md:text-2xl mb-4">Portal del Empleado</h1>
      {/* Sistema de pestañas para organizar el contenido. */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">Activos Pendientes <Badge className="ml-2">{pendingAssets.length}</Badge></TabsTrigger>
          <TabsTrigger value="my-assets">Mis Activos</TabsTrigger>
          <TabsTrigger value="return">Devolución</TabsTrigger>
        </TabsList>

        {/* Pestaña de Activos Pendientes */}
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
            <Card className="mt-6"><CardContent className="pt-6"><p className="text-center">No tiene activos pendientes de recepción.</p></CardContent></Card>
          )}
        </TabsContent>

        {/* Pestaña de Mis Activos */}
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
                    <TableRow><TableCell colSpan={4} className="text-center">No tiene activos asignados.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pestaña de Devolución */}
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

      {/* --- Diálogos (Modales) --- */}

      {/* Diálogo para rechazar un activo */}
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

      {/* Diálogo para solicitar el reemplazo de un activo */}
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

      {/* Diálogo para mostrar el historial de un activo */}
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