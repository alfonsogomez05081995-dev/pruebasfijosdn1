'use client';
// Importaciones de componentes de UI y de la biblioteca de iconos.
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PackagePlus, Send, CheckCheck, Upload, AlertTriangle, Archive, History } from "lucide-react";
// Importaciones de hooks y contexto de autenticación.
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, FormEvent, useCallback, ChangeEvent } from "react";
import { useToast } from "@/hooks/use-toast";
// Importaciones de funciones de servicio y tipos de datos.
import {
    addAsset,
    addAssetsInBatch,
    getAssignmentRequestsForLogistics,
    getAllAssignmentRequests,
    processAssignmentRequest,
    retryAssignment,
    archiveAssignment,
    getCompletedDevolutionProcesses,
    getAssetHistory,
    AssignmentRequest,
    AssetType,
    NewAssetData,
    DevolutionProcess,
    AssetHistoryEvent,
    Asset,
    getAssetById,
    getAvailableSerials,
    getDevolutionProcesses // Import the function to get pending processes
} from "@/lib/services";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as XLSX from 'xlsx';
import LogisticsDevolutionPanel from "@/components/logistic/LogisticsDevolutionPanel";
import { formatFirebaseTimestamp } from "@/lib/utils";
import { ImagePreviewModal } from "@/components/ui/ImagePreviewModal";

// Define el componente de la página de logística.
export default function LogisticaPage() {
  // Hooks para manejar el estado de la autenticación, el enrutamiento y las notificaciones.
  const { userData, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  // Estados para manejar las solicitudes de asignación, los procesos de devolución y el historial.
  const [assignmentRequests, setAssignmentRequests] = useState<AssignmentRequest[]>([]);
  const [requestHistory, setRequestHistory] = useState<AssignmentRequest[]>([]);
  const [completedProcesses, setCompletedProcesses] = useState<DevolutionProcess[]>([]);
  const [pendingDevolutionProcesses, setPendingDevolutionProcesses] = useState<DevolutionProcess[]>([]); // New state for pending devolutions
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [assetHistory, setAssetHistory] = useState<AssetHistoryEvent[]>([]);
  const [historyAsset, setHistoryAsset] = useState<Asset | null>(null);
  const [imageToPreview, setImageToPreview] = useState<string | null>(null);

  // Estados para los formularios de la página.
  const [assetReference, setAssetReference] = useState('');
  const [assetSerial, setAssetSerial] = useState('');
  const [assetName, setAssetName] = useState('');
  const [assetLocation, setAssetLocation] = useState('');
  const [assetStock, setAssetStock] = useState('');
  const [assetType, setAssetType] = useState<AssetType | ''| undefined>('');
  const [bulkFile, setBulkFile] = useState<File | null>(null);

  // Estados para los modales (diálogos).
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AssignmentRequest | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [archiveReason, setArchiveReason] = useState('');
  const [availableSerials, setAvailableSerials] = useState<string[]>([]);

  // Efecto para redirigir al usuario si no tiene el rol adecuado.
  useEffect(() => {
    if (!loading && (!userData || !['master', 'logistica'].includes(userData.role))) {
      router.push('/');
    }
  }, [userData, loading, router]);

  // Función para obtener todos los datos necesarios para la página de logística.
  const fetchAllData = useCallback(async () => {
    try {
        const [assignRequests, allRequests, completedDevolutions, pendingDevolutions] = await Promise.all([
            getAssignmentRequestsForLogistics(),
            getAllAssignmentRequests(100),
            getCompletedDevolutionProcesses(),
            getDevolutionProcesses(), // Fetch pending devolution processes
        ]);
        setAssignmentRequests(assignRequests);
        setRequestHistory(allRequests.requests);
        setCompletedProcesses(completedDevolutions);
        setPendingDevolutionProcesses(pendingDevolutions); // Update the new state
    } catch (error) {
        console.error("Error fetching data:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos.' });
    }
  }, [toast]);

  // Efecto para cargar los datos cuando el componente se monta y el usuario está autenticado.
  useEffect(() => {
    if (userData) {
        fetchAllData();
    }
  }, [userData, fetchAllData]);

  // Maneja la adición de un nuevo activo al inventario.
  const handleAddAsset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!assetName || !assetType || !assetStock || !assetLocation) {
        toast({ variant: "destructive", title: "Error", description: "Por favor complete todos los campos obligatorios." });
        return;
    }
    try {
        await addAsset({
            reference: assetReference,
            name: assetName,
            serial: assetSerial,
            tipo: assetType as AssetType,
            stock: parseInt(assetStock, 10),
            location: assetLocation,
        });
        toast({ title: "Éxito", description: "Activo agregado correctamente." });
        setAssetReference('');
        setAssetName('');
        setAssetSerial('');
        setAssetType('');
        setAssetStock('');
        setAssetLocation('');
        fetchAllData();
    } catch (error: any) {
        console.error("Error adding asset:", error);
        toast({ variant: "destructive", title: "Error", description: error.message || "No se pudo agregar el activo." });
    }
  };

  // Abre el modal para procesar una solicitud de asignación.
  const handleOpenProcessModal = async (request: AssignmentRequest) => {
    setSelectedRequest(request);
    setShowProcessModal(true);
    setTrackingNumber('');
    setCarrier('');
    setSerialNumber('');
    setAvailableSerials([]);

    try {
        const asset = await getAssetById(request.assetId);
        if (asset && asset.reference && (asset.tipo === 'equipo_de_computo' || asset.tipo === 'herramienta_electrica')) {
            const serials = await getAvailableSerials(asset.reference);
            setAvailableSerials(serials);
        }
    } catch (error) {
        console.error("Error fetching serials:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los seriales disponibles.' });
    }
  };

  // Abre el modal para resolver una solicitud rechazada.
  const handleOpenRejectionModal = (request: AssignmentRequest) => {
    setSelectedRequest(request);
setShowRejectionModal(true);
    setArchiveReason('');
  };

    // Maneja el envío del formulario para procesar una solicitud.
    const handleProcessSubmit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!selectedRequest || !trackingNumber || !carrier) {
          toast({ variant: "destructive", title: "Error", description: "La transportadora y el número de guía son obligatorios." });
          return;
      }
      if (!userData) {
          toast({ variant: "destructive", title: "Error", description: "No se pudo verificar la identidad del usuario." });
          return;
      }
      try {
          if (selectedRequest.status === 'rechazado') {
              await retryAssignment(selectedRequest.id, trackingNumber, carrier, { id: userData.id, name: userData.name || userData.email }, serialNumber);
              toast({ title: "Reenvío Procesado", description: "La solicitud ha sido actualizada y marcada como 'enviado' nuevamente." });
          } else {
              await processAssignmentRequest(selectedRequest.id, trackingNumber, carrier, { id: userData.id, name: userData.name || userData.email }, serialNumber);
              toast({ title: "Solicitud Procesada", description: "La solicitud ha sido actualizada y el activo asignado." });
          }
          setShowProcessModal(false);
          fetchAllData();
      } catch (error: any) {
          console.error("Error processing request:", error);
          toast({ variant: "destructive", title: "Error", description: error.message || "No se pudo procesar la solicitud." });
      }
    };
  
  // Maneja el reintento de envío de una solicitud rechazada.
  const handleRetrySubmit = () => {
    if (!selectedRequest) return;
    setShowRejectionModal(false);
    handleOpenProcessModal(selectedRequest);
  };

  // Maneja el archivado de una solicitud.
  const handleArchiveSubmit = async () => {
    if (!selectedRequest || !archiveReason) {
        toast({ variant: "destructive", title: "Error", description: "Debe proporcionar un motivo para archivar." });
        return;
    }
    try {
        await archiveAssignment(selectedRequest.id, archiveReason);
        toast({ title: "Solicitud Archivada", description: "La solicitud ha sido archivada y eliminada de la lista de pendientes." });
        setShowRejectionModal(false);
        fetchAllData();
    } catch (error: any) {
        console.error("Error archiving request:", error);
        toast({ variant: "destructive", title: "Error", description: error.message || "No se pudo archivar la solicitud." });
    }
  };

  // Maneja la selección de un archivo para carga masiva.
  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setBulkFile(event.target.files[0]);
    }
  };

  // Maneja la carga masiva de activos desde un archivo.
  const handleBulkUpload = async () => {
    if (!bulkFile) {
      toast({ variant: "destructive", title: "Error", description: "Por favor, seleccione un archivo." });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const fileContent = e.target?.result;
        if (!fileContent) {
            toast({ variant: "destructive", title: "Error", description: "No se pudo leer el archivo." });
            return;
        }

        let rows: any[][];
        if (bulkFile.type.startsWith("text/") || bulkFile.name.endsWith('.csv') || bulkFile.name.endsWith('.tsv')) {
            const text = new TextDecoder("utf-8").decode(fileContent as ArrayBuffer);
            rows = text.split('\n').map(line => line.trim().split('\t')).filter(row => row.length > 1 || (row.length === 1 && row[0] !== ''));
        } else { 
            const workbook = XLSX.read(fileContent, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
        }

        if (rows.length < 2) {
          toast({ variant: "destructive", title: "Sin Datos", description: "El archivo está vacío o no tiene un formato válido." });
          return;
        }

        const originalHeaders = rows[0];
        const dataRows = rows.slice(1);

        console.log("Headers detectados por el sistema:", originalHeaders);

        const normalizeString = (str: any) => 
          str ? str.toString().trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "") : "";

        const baseRequiredHeaders = ['referencia', 'descripcion', 'serial', 'tipo de activo', 'cantidad', 'ubicacion'];
        const normalizedFoundHeaders = originalHeaders.map(h => normalizeString(h));
        
        const missingHeaders = baseRequiredHeaders.filter(h => !normalizedFoundHeaders.includes(h));

        if (missingHeaders.length > 0) {
          const errorMessage = `Columnas requeridas faltantes: ${missingHeaders.join(', ')}. Las columnas encontradas son: ${originalHeaders.join(', ')}`;
          console.error("Error de Cabecera:", errorMessage);
          toast({ variant: "destructive", title: "Error de Cabecera", description: errorMessage, duration: 9000 });
          return;
        }

        const indexMap: { [key: string]: number } = {};
        normalizedFoundHeaders.forEach((header, index) => {
            indexMap[header] = index;
        });

        const assetsToCreate: NewAssetData[] = [];
        const errors: string[] = [];

        dataRows.forEach((row: any[], index: number) => {
          if (row.every(cell => cell === null || cell === '')) return;

          const tipoDeActivoRaw = row[indexMap['tipo de activo']];
          const tipo = normalizeString(tipoDeActivoRaw).replace(/ /g, '_') as AssetType;
          const serial = row[indexMap.serial] || "";
          const cantidadStr = row[indexMap.cantidad];
          const cantidad = parseInt(cantidadStr, 10);

          if (!['equipo_de_computo', 'herramienta_electrica', 'herramienta_manual'].includes(tipo)) {
            errors.push(`Fila ${index + 2}: 'Tipo de Activo' ('${tipoDeActivoRaw}') inválido.`);
            return;
          }

          if (['equipo_de_computo', 'herramienta_electrica'].includes(tipo) && !serial) {
            errors.push(`Fila ${index + 2}: El serial es obligatorio para 'Equipo de Computo' o 'Herramienta Eléctrica'.`);
            return;
          }
          
          if (serial && cantidad !== 1) {
            errors.push(`Fila ${index + 2}: La cantidad para activos con serial debe ser 1 (encontrado: ${cantidadStr}).`);
            return;
          }

          if (isNaN(cantidad) || cantidad <= 0) {
            errors.push(`Fila ${index + 2}: La cantidad ('${cantidadStr}') debe ser un número mayor a 0.`);
            return;
          }

          assetsToCreate.push({
            reference: row[indexMap.referencia] || "",
            name: row[indexMap.descripcion] || "",
            serial: serial,
            tipo: tipo,
            stock: cantidad,
            location: row[indexMap.ubicacion] || "",
          });
        });

        if (errors.length > 0) {
          toast({ variant: "destructive", title: `Errores de Validación (${errors.length})`, description: errors.slice(0, 3).join(' ') + (errors.length > 3 ? '...' : '') });
          return;
        }

        if (assetsToCreate.length === 0) {
          toast({ variant: "destructive", title: "Sin Datos Válidos", description: "El archivo no contiene filas con datos válidos para cargar." });
          return;
        }

        await addAssetsInBatch(assetsToCreate);
        toast({ title: "Carga Exitosa", description: `${assetsToCreate.length} activos han sido agregados al inventario.` });
        await fetchAllData();

      } catch (error: any) {
        console.error("Error en la carga masiva:", error);
        toast({ variant: "destructive", title: "Error en la Carga", description: error.message || "Ocurrió un error al procesar el archivo." });
      }
    };
    reader.readAsArrayBuffer(bulkFile);
  };

  const handleShowHistory = async (assetId: string) => {
    try {
      const asset = await getAssetById(assetId);
      if (!asset) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo encontrar el activo." });
        return;
      }
      setHistoryAsset(asset);
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

  // Muestra un mensaje de carga mientras se obtienen los datos del usuario.
  if (loading || !userData) {
    return <div>Cargando...</div>;
  }
  
  // Renderiza la interfaz de la página de logística.
  return (
    <>
      <h1 className="text-lg font-semibold md:text-2xl mb-4">Panel de Logística</h1>
      <Tabs defaultValue="add-assets" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="add-assets">Ingreso de Activos</TabsTrigger>
          <TabsTrigger value="assignments">Solicitudes de Asignación <Badge className="ml-2">{assignmentRequests.length}</Badge></TabsTrigger>
          <TabsTrigger value="devolutions" className={pendingDevolutionProcesses.length > 0 ? "text-destructive" : ""}>
            Procesos de Devolución
            {pendingDevolutionProcesses.length > 0 && (
              <Badge variant="destructive" className="ml-2">{pendingDevolutionProcesses.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="add-assets">
          <div className="grid gap-6 mt-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Ingresar Nuevo Activo</CardTitle>
                <CardDescription>Registre un nuevo activo en el inventario de forma manual.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddAsset} className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="asset-reference">Referencia</Label>
                    <Input id="asset-reference" value={assetReference} onChange={(e) => setAssetReference(e.target.value)} placeholder="Ej: PROV-001" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="asset-name">Descripción</Label>
                    <Input id="asset-name" value={assetName} onChange={(e) => setAssetName(e.target.value)} placeholder="Ej: Taladro Percutor" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="asset-serial">Serial (si aplica)</Label>
                    <Input id="asset-serial" value={assetSerial} onChange={(e) => setAssetSerial(e.target.value)} placeholder="Ej: 112233-A" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="asset-type">Tipo de Activo</Label>
                    <Select value={assetType} onValueChange={(value) => setAssetType(value as AssetType)} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="herramienta_manual">Herramienta Manual</SelectItem>
                        <SelectItem value="herramienta_electrica">Herramienta Eléctrica</SelectItem>
                        <SelectItem value="equipo_de_computo">Equipo de Cómputo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="asset-stock">Cantidad</Label>
                    <Input id="asset-stock" type="number" value={assetStock} onChange={(e) => setAssetStock(e.target.value)} placeholder="Ej: 10" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="asset-location">Ubicación</Label>
                    <Input id="asset-location" value={assetLocation} onChange={(e) => setAssetLocation(e.target.value)} placeholder="Ej: Bodega Central" required />
                  </div>
                  <Button type="submit" className="w-full">
                    <PackagePlus className="h-4 w-4 mr-2" />
                    Agregar Activo
                  </Button>
                </form>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Carga Masiva de Activos</CardTitle>
                <CardDescription>Suba un archivo Excel (.xlsx, .xls) o de texto (.tsv, .txt) con los activos.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                  <div className="grid gap-2">
                      <Label htmlFor="bulk-file">Archivo (.xlsx, .xls, .tsv, .txt)</Label>
                      <Input id="bulk-file" type="file" accept=".xlsx,.xls,.tsv,.txt" onChange={handleFileSelect} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                      El archivo debe tener las columnas: Referencia, Descripción, Serial, Tipo de Activo, Cantidad, Ubicación.
                  </p>
                  <Button onClick={handleBulkUpload} className="w-full" disabled={!bulkFile}>
                      <Upload className="h-4 w-4 mr-2" />
                      Cargar Archivo
                  </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="assignments">
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Solicitudes de Asignación</CardTitle>
              <CardDescription>Procese las solicitudes de asignación pendientes y resuelva las rechazadas.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Solicitante</TableHead>
                    <TableHead>Activo</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignmentRequests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>{req.masterName}</TableCell>
                      <TableCell>{req.assetName}</TableCell>
                      <TableCell>{req.quantity}</TableCell>
                      <TableCell>
                        <Badge variant={req.status === 'pendiente de envío' ? 'secondary' : req.status === 'rechazado' ? 'destructive' : 'outline'}>{req.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {req.status === 'pendiente de envío' && (
                          <Button size="sm" onClick={() => handleOpenProcessModal(req)}>
                            <Send className="h-4 w-4 mr-2" /> Procesar Envío
                          </Button>
                        )}
                        {req.status === 'rechazado' && (
                          <Button variant="destructive" size="sm" onClick={() => handleOpenRejectionModal(req)}>
                            <AlertTriangle className="h-4 w-4 mr-2" /> Resolver Rechazo
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devolutions">
          <Tabs defaultValue="ongoing" className="w-full mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="ongoing">En Curso</TabsTrigger>
              <TabsTrigger value="completed">Completados</TabsTrigger>
            </TabsList>
            <TabsContent value="ongoing">
              <LogisticsDevolutionPanel onAssetClick={handleShowHistory} />
            </TabsContent>
            <TabsContent value="completed">
              <Card>
                <CardHeader>
                  <CardTitle>Procesos de Devolución Completados</CardTitle>
                  <CardDescription>Historial de procesos de devolución que han sido finalizados.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Empleado</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Activos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {completedProcesses.map((process) => (
                        <TableRow key={process.id}>
                          <TableCell>{process.employeeName}</TableCell>
                          <TableCell>{process.formattedDate}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              {process.assets.map(asset => (
                                <Button key={asset.id} variant="link" className="p-0 h-auto" onClick={() => handleShowHistory(asset.id)}>
                                  {asset.name}
                                </Button>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="history">
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Historial de Solicitudes</CardTitle>
              <CardDescription>Historial completo de todas las solicitudes de asignación.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Activo</TableHead>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Guía</TableHead>
                    <TableHead>Transportadora</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requestHistory.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>{req.assetName}</TableCell>
                      <TableCell>{req.employeeName}</TableCell>
                      <TableCell>
                        <Badge variant={
                          req.status === 'recibido a conformidad' ? 'default' :
                          req.status === 'enviado' ? 'secondary' :
                          req.status === 'pendiente de envío' ? 'outline' :
                          req.status === 'rechazado' ? 'destructive' : 'outline'
                        }>{req.status}</Badge>
                      </TableCell>
                      <TableCell>{req.trackingNumber || 'N/A'}</TableCell>
                      <TableCell>{req.carrier || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {imageToPreview && (
        <ImagePreviewModal imageUrl={imageToPreview} onClose={() => setImageToPreview(null)} />
      )}

      {/* Modal para ver historial de activo */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="sm:max-w-[725px]">
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
                  <TableHead>Evidencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assetHistory.map((event, index) => {
                  const parts = event.description.split('|EVIDENCE_IMG:');
                  const descriptionText = parts[0];
                  const imageUrl = parts.length > 1 ? parts[1] : null; // Corrected: parts[1] already contains the full data URL

                  return (
                    <TableRow key={index}>
                      <TableCell>{event.formattedDate}</TableCell>
                      <TableCell>{event.event}</TableCell>
                      <TableCell>{descriptionText}</TableCell>
                      <TableCell>
                        {imageUrl && (
                          <button onClick={() => setImageToPreview(imageUrl)} className="w-16 h-16 relative border rounded-md overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={imageUrl} alt="Thumbnail de evidencia" className="w-full h-full object-cover" />
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button onClick={() => setHistoryDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para procesar y reintentar envíos */}
      <Dialog open={showProcessModal} onOpenChange={setShowProcessModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedRequest?.status === 'rechazado' ? 'Reintentar Envío' : 'Procesar Envío de Solicitud'}</DialogTitle>
            <DialogDescription>
              Ingrese los nuevos detalles de envío. El serial es obligatorio para equipos de cómputo y herramientas eléctricas.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleProcessSubmit} className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="carrier" className="text-right">Transportadora</Label>
              <Input id="carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)} className="col-span-3" placeholder="Ej: Servientrega" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="trackingNumber" className="text-right">Número de Guía</Label>
              <Input id="trackingNumber" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} className="col-span-3" placeholder="Ej: 0123456789" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="serialNumber" className="text-right">Serial (si aplica)</Label>
              {availableSerials.length > 0 ? (
                <Select onValueChange={setSerialNumber} value={serialNumber}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Seleccione un serial" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSerials.map(serial => (
                      <SelectItem key={serial} value={serial}>{serial}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input id="serialNumber" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} className="col-span-3" placeholder="Ingrese el serial del equipo" />
              )}
            </div>
            <DialogFooter>
              <Button type="submit">Confirmar Envío</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal para resolver rechazos */}
      <Dialog open={showRejectionModal} onOpenChange={setShowRejectionModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolver Solicitud Rechazada</DialogTitle>
            <DialogDescription>
              El empleado rechazó la entrega de <strong>{selectedRequest?.assetName}</strong>.
              Motivo: <span className="font-semibold">{selectedRequest?.rejectionReason || 'No especificado'}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">Puede reintentar el envío (posiblemente con un activo o serial diferente) o archivar la solicitud si no se puede completar.</p>
          </div>
          <DialogFooter className="sm:justify-between">
            <div className="flex gap-2">
                <Input type="text" placeholder="Motivo para archivar..." value={archiveReason} onChange={(e) => setArchiveReason(e.target.value)} />
                <Button type="button" variant="destructive" onClick={handleArchiveSubmit} disabled={!archiveReason}>
                    <Archive className="h-4 w-4 mr-2" />
                    Archivar
                </Button>
            </div>
            <Button type="button" onClick={handleRetrySubmit}>Reintentar Envío</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
}
