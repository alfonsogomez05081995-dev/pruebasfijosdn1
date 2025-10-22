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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
import { PackagePlus, Send, CheckCheck, Upload, AlertTriangle, Archive } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, FormEvent, useCallback, ChangeEvent } from "react";
import { useToast } from "@/hooks/use-toast";
import {
    addAsset,
    addAssetsInBatch,
    getAssignmentRequestsForLogistics,
    getAllAssignmentRequests,
    processAssignmentRequest,
    getDevolutionProcesses,
    verifyAssetReturn,
    completeDevolutionProcess,
    retryAssignment,
    archiveAssignment,
    AssignmentRequest,
    AssetType,
    DevolutionProcess,
    NewAssetData,
    getAssetById,
    getAvailableSerials
} from "@/lib/services";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as XLSX from 'xlsx';

export default function LogisticaPage() {
  const { userData, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [assignmentRequests, setAssignmentRequests] = useState<AssignmentRequest[]>([]);
  const [devolutionProcesses, setDevolutionProcesses] = useState<DevolutionProcess[]>([]);
  const [requestHistory, setRequestHistory] = useState<AssignmentRequest[]>([]);

  // Form states
  const [assetReference, setAssetReference] = useState('');
  const [assetSerial, setAssetSerial] = useState('');
  const [assetName, setAssetName] = useState('');
  const [assetLocation, setAssetLocation] = useState('');
  const [assetStock, setAssetStock] = useState('');
  const [assetType, setAssetType] = useState<AssetType | ''| undefined>('');
  const [bulkFile, setBulkFile] = useState<File | null>(null);

  // Modal states
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AssignmentRequest | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [archiveReason, setArchiveReason] = useState('');
  const [availableSerials, setAvailableSerials] = useState<string[]>([]);


  useEffect(() => {
    if (!loading && (!userData || !['master', 'logistica'].includes(userData.role))) {
      router.push('/');
    }
  }, [userData, loading, router]);

  const fetchAllData = useCallback(async () => {
    try {
        const [assignRequests, devProcesses, allRequests] = await Promise.all([
            getAssignmentRequestsForLogistics(),
            getDevolutionProcesses(),
            getAllAssignmentRequests(),
        ]);
        setAssignmentRequests(assignRequests);
        setDevolutionProcesses(devProcesses);
        setRequestHistory(allRequests);
    } catch (error) {
        console.error("Error fetching data:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos.' });
    }
  }, [toast]);

  useEffect(() => {
    if (userData) {
        fetchAllData();
    }
  }, [userData, fetchAllData]);

  
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

  const handleOpenRejectionModal = (request: AssignmentRequest) => {
    setSelectedRequest(request);
    setShowRejectionModal(true);
    setArchiveReason('');
  };

  const handleProcessSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedRequest || !trackingNumber || !carrier) {
        toast({ variant: "destructive", title: "Error", description: "La transportadora y el número de guía son obligatorios." });
        return;
    }
    try {
        if (selectedRequest.status === 'rechazado') {
            await retryAssignment(selectedRequest.id, trackingNumber, carrier, serialNumber);
            toast({ title: "Reenvío Procesado", description: "La solicitud ha sido actualizada y marcada como 'enviado' nuevamente." });
        } else {
            await processAssignmentRequest(selectedRequest.id, trackingNumber, carrier, serialNumber);
            toast({ title: "Solicitud Procesada", description: "La solicitud ha sido actualizada y el activo asignado." });
        }
        setShowProcessModal(false);
        fetchAllData();
    } catch (error: any) {
        console.error("Error processing request:", error);
        toast({ variant: "destructive", title: "Error", description: error.message || "No se pudo procesar la solicitud." });
    }
  };

  const handleRetrySubmit = () => {
    if (!selectedRequest) return;
    setShowRejectionModal(false);
    handleOpenProcessModal(selectedRequest);
  };

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


  const handleVerifyReturn = async (processId: string, assetId: string) => {
    try {
        await verifyAssetReturn(processId, assetId);
        toast({ title: "Activo Verificado", description: "El activo ha sido marcado como devuelto y puesto en stock." });
        await fetchAllData();
    } catch (error: any) {
        console.error("Error verificando activo:", error);
        toast({ variant: "destructive", title: "Error", description: error.message || "No se pudo verificar el activo." });
    }
  };

  const handleCompleteProcess = async (processId: string) => {
    try {
        await completeDevolutionProcess(processId);
        toast({ title: "Proceso Completado", description: "El proceso de devolución ha sido finalizado." });
        await fetchAllData();
    } catch (error: any) {
        console.error("Error completando proceso:", error);
        toast({ variant: "destructive", title: "Error", description: error.message || "No se pudo completar el proceso." });
    }
  };

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setBulkFile(event.target.files[0]);
    }
  };

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

  if (loading || !userData) {
    return <div>Cargando...</div>;
  }
  
  return (
    <>
      <h1 className="text-lg font-semibold md:text-2xl mb-4">Panel de Logística</h1>
      <Tabs defaultValue="add-assets" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="add-assets">Ingreso de Activos</TabsTrigger>
          <TabsTrigger value="assignments">Solicitudes de Asignación <Badge className="ml-2">{assignmentRequests.length}</Badge></TabsTrigger>
          <TabsTrigger value="devolutions">Procesos de Devolución <Badge className="ml-2">{devolutionProcesses.length}</Badge></TabsTrigger>
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
          <Card className="mt-6">
              <CardHeader>
                  <CardTitle>Procesos de Devolución en Curso</CardTitle>
                  <CardDescription>Verifique la devolución física de los activos de los empleados que terminan su contrato.</CardDescription>
              </CardHeader>
              <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                  {devolutionProcesses.map(process => (
                      <AccordionItem value={process.id} key={process.id}>
                      <AccordionTrigger>{process.employeeName} - {process.assets.filter(a => !a.verified).length} activos pendientes</AccordionTrigger>
                      <AccordionContent>
                          <Table>
                          <TableHeader>
                              <TableRow>
                              <TableHead>Activo</TableHead>
                              <TableHead>Serial</TableHead>
                              <TableHead>Estado</TableHead>
                              <TableHead className="text-right">Acción</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {process.assets.map(asset => (
                              <TableRow key={asset.id}>
                                  <TableCell>{asset.name}</TableCell>
                                  <TableCell>{asset.serial}</TableCell>
                                  <TableCell>
                                  <Badge variant={asset.verified ? 'default' : 'outline'}>{asset.verified ? 'Verificado' : 'Pendiente'}</Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                  {!asset.verified && (
                                      <Button size="sm" onClick={() => handleVerifyReturn(process.id, asset.id)}>
                                      <CheckCheck className="h-4 w-4 mr-2" /> Verificar
                                      </Button>
                                  )}
                                  </TableCell>
                              </TableRow>
                              ))}
                          </TableBody>
                          </Table>
                          {process.assets.every(a => a.verified) && (
                              <div className="text-right mt-4">
                                  <Button variant="secondary" onClick={() => handleCompleteProcess(process.id)}>Completar Proceso</Button>
                              </div>
                          )}
                      </AccordionContent>
                      </AccordionItem>
                  ))}
                  </Accordion>
              </CardContent>
          </Card>
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
                          req.status === 'enviado' ? 'default' :
                          req.status === 'pendiente de envío' ? 'secondary' : 
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

      {/* Process & Retry Modal */}
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

      {/* Resolve Rejection Modal */}
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