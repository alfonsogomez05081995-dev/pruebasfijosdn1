'use client';
// Importaciones de React, Next.js, y componentes de UI.
import { useEffect, useState, FormEvent, useCallback, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PackagePlus, Send, CheckCheck, Upload, AlertTriangle, Archive } from "lucide-react";
import * as XLSX from 'xlsx';

// Importaciones de la lógica de la aplicación.
import { useAuth } from "@/contexts/AuthContext";
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

/**
 * Componente LogisticaPage.
 * Este es el panel de control para los usuarios con rol 'logistica'.
 * Permite ingresar nuevos activos (manual o masivamente), procesar solicitudes de asignación,
 * y gestionar los procesos de devolución de activos.
 */
export default function LogisticaPage() {
  // --- Hooks y Estados ---
  const { userData, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  // Estados para almacenar los datos principales de la página.
  const [assignmentRequests, setAssignmentRequests] = useState<AssignmentRequest[]>([]);
  const [devolutionProcesses, setDevolutionProcesses] = useState<DevolutionProcess[]>([]);
  const [requestHistory, setRequestHistory] = useState<AssignmentRequest[]>([]);

  // Estados para los formularios de la página (ingreso manual de activos).
  const [assetReference, setAssetReference] = useState('');
  const [assetSerial, setAssetSerial] = useState('');
  const [assetName, setAssetName] = useState('');
  const [assetLocation, setAssetLocation] = useState('');
  const [assetStock, setAssetStock] = useState('');
  const [assetType, setAssetType] = useState<AssetType | ''| undefined>('');
  const [bulkFile, setBulkFile] = useState<File | null>(null); // Archivo para carga masiva.

  // Estados para controlar los diálogos (modales) y sus formularios.
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AssignmentRequest | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [archiveReason, setArchiveReason] = useState('');
  const [availableSerials, setAvailableSerials] = useState<string[]>([]);

  // Efecto para proteger la ruta, permitiendo acceso solo a 'logistica' y 'master'.
  useEffect(() => {
    if (!loading && (!userData || !['master', 'logistica'].includes(userData.role))) {
      router.push('/');
    }
  }, [userData, loading, router]);

  /**
   * Obtiene todos los datos necesarios para el panel de logística.
   * `useCallback` se usa para memorizar la función y optimizar el rendimiento.
   */
  const fetchAllData = useCallback(async () => {
    try {
        // Ejecuta todas las peticiones en paralelo.
        const [assignRequests, devProcesses, allRequests] = await Promise.all([
            getAssignmentRequestsForLogistics(),
            getDevolutionProcesses(),
            getAllAssignmentRequests(100), // Obtiene las últimas 100 para el historial.
        ]);
        setAssignmentRequests(assignRequests);
        setDevolutionProcesses(devProcesses);
        setRequestHistory(allRequests.requests);
    } catch (error) {
        console.error("Error al obtener los datos:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos.' });
    }
  }, [toast]);

  // Efecto para cargar los datos cuando el componente se monta.
  useEffect(() => {
    if (userData) {
        fetchAllData();
    }
  }, [userData, fetchAllData]);

  // --- Manejadores de Acciones ---

  /**
   * Maneja el envío del formulario para agregar un nuevo activo manualmente.
   */
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
        // Limpia el formulario.
        setAssetReference('');
        setAssetName('');
        setAssetSerial('');
        setAssetType('');
        setAssetStock('');
        setAssetLocation('');
        fetchAllData(); // Refresca los datos.
    } catch (error: any) {
        console.error("Error agregando activo:", error);
        toast({ variant: "destructive", title: "Error", description: error.message || "No se pudo agregar el activo." });
    }
  };

  /**
   * Abre el diálogo para procesar una solicitud de asignación.
   * @param {AssignmentRequest} request - La solicitud a procesar.
   */
  const handleOpenProcessModal = async (request: AssignmentRequest) => {
    setSelectedRequest(request);
    setShowProcessModal(true);
    // Limpia los campos del diálogo.
    setTrackingNumber('');
    setCarrier('');
    setSerialNumber('');
    setAvailableSerials([]);

    // Si el activo es serializable, busca los seriales disponibles.
    try {
        const asset = await getAssetById(request.assetId);
        if (asset && asset.reference && (asset.tipo === 'equipo_de_computo' || asset.tipo === 'herramienta_electrica')) {
            const serials = await getAvailableSerials(asset.reference);
            setAvailableSerials(serials);
        }
    } catch (error) {
        console.error("Error obteniendo seriales:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los seriales disponibles.' });
    }
  };

  /**
   * Abre el diálogo para resolver una solicitud que fue rechazada por el empleado.
   * @param {AssignmentRequest} request - La solicitud rechazada.
   */
  const handleOpenRejectionModal = (request: AssignmentRequest) => {
    setSelectedRequest(request);
    setShowRejectionModal(true);
    setArchiveReason('');
  };

  /**
   * Maneja el envío del formulario para procesar o reintentar un envío.
   */
  const handleProcessSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedRequest || !trackingNumber || !carrier || !userData) return;
    
    try {
        // Si la solicitud fue rechazada, se usa la función de reintento.
        if (selectedRequest.status === 'rechazado') {
            await retryAssignment(selectedRequest.id, trackingNumber, carrier, { id: userData.id, name: userData.name || userData.email }, serialNumber);
            toast({ title: "Reenvío Procesado", description: "La solicitud ha sido actualizada y marcada como 'enviado' nuevamente." });
        } else {
            // Si es una solicitud nueva, se procesa normalmente.
            await processAssignmentRequest(selectedRequest.id, trackingNumber, carrier, { id: userData.id, name: userData.name || userData.email }, serialNumber);
            toast({ title: "Solicitud Procesada", description: "La solicitud ha sido actualizada y el activo asignado." });
        }
        setShowProcessModal(false);
        fetchAllData(); // Refresca los datos.
    } catch (error: any) {
        console.error("Error procesando solicitud:", error);
        toast({ variant: "destructive", title: "Error", description: error.message || "No se pudo procesar la solicitud." });
    }
  };
  
  /**
   * Maneja la acción de "Reintentar Envío" desde el diálogo de rechazo.
   */
  const handleRetrySubmit = () => {
    if (!selectedRequest) return;
    setShowRejectionModal(false);
    handleOpenProcessModal(selectedRequest); // Reutiliza el modal de proceso.
  };

  /**
   * Maneja el archivado de una solicitud que no se puede completar.
   */
  const handleArchiveSubmit = async () => {
    if (!selectedRequest || !archiveReason) {
        toast({ variant: "destructive", title: "Error", description: "Debe proporcionar un motivo para archivar." });
        return;
    }
    try {
        await archiveAssignment(selectedRequest.id, archiveReason);
        toast({ title: "Solicitud Archivada", description: "La solicitud ha sido archivada y eliminada de la lista de pendientes." });
        setShowRejectionModal(false);
        fetchAllData(); // Refresca los datos.
    } catch (error: any) {
        console.error("Error archivando solicitud:", error);
        toast({ variant: "destructive", title: "Error", description: error.message || "No se pudo archivar la solicitud." });
    }
  };

  /**
   * Verifica la devolución de un activo y lo regresa al stock.
   * @param {string} processId - ID del proceso de devolución.
   * @param {string} assetId - ID del activo devuelto.
   */
  const handleVerifyReturn = async (processId: string, assetId: string) => {
    try {
        await verifyAssetReturn(processId, assetId);
        toast({ title: "Activo Verificado", description: "El activo ha sido marcado como devuelto y puesto en stock." });
        await fetchAllData(); // Refresca los datos.
    } catch (error: any) {
        console.error("Error verificando activo:", error);
        toast({ variant: "destructive", title: "Error", description: error.message || "No se pudo verificar el activo." });
    }
  };

  /**
   * Marca un proceso de devolución como completado una vez que todos sus activos han sido verificados.
   * @param {string} processId - ID del proceso a completar.
   */
  const handleCompleteProcess = async (processId: string) => {
    try {
        await completeDevolutionProcess(processId);
        toast({ title: "Proceso Completado", description: "El proceso de devolución ha sido finalizado." });
        await fetchAllData(); // Refresca los datos.
    } catch (error: any) {
        console.error("Error completando proceso:", error);
        toast({ variant: "destructive", title: "Error", description: error.message || "No se pudo completar el proceso." });
    }
  };

  /**
   * Maneja la selección de un archivo para la carga masiva.
   */
  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setBulkFile(event.target.files[0]);
    }
  };

  /**
   * Procesa el archivo seleccionado para la carga masiva de activos.
   */
  const handleBulkUpload = async () => {
    if (!bulkFile) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const fileContent = e.target?.result;
        if (!fileContent) return;

        // Lógica para leer diferentes tipos de archivo (Excel, CSV, TSV).
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

        if (rows.length < 2) throw new Error("El archivo está vacío o no tiene un formato válido.");

        // Normaliza y valida las cabeceras del archivo.
        const originalHeaders = rows[0];
        const dataRows = rows.slice(1);
        const normalizeString = (str: any) => str ? str.toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
        const baseRequiredHeaders = ['referencia', 'descripcion', 'serial', 'tipo de activo', 'cantidad', 'ubicacion'];
        const normalizedFoundHeaders = originalHeaders.map(h => normalizeString(h));
        const missingHeaders = baseRequiredHeaders.filter(h => !normalizedFoundHeaders.includes(h));

        if (missingHeaders.length > 0) {
          throw new Error(`Columnas requeridas faltantes: ${missingHeaders.join(', ')}.`);
        }

        // Mapea y valida cada fila del archivo.
        const indexMap: { [key: string]: number } = {};
        normalizedFoundHeaders.forEach((header, index) => { indexMap[header] = index; });
        const assetsToCreate: NewAssetData[] = [];
        const errors: string[] = [];

        dataRows.forEach((row: any[], index: number) => {
          if (row.every(cell => cell === null || cell === '')) return;
          // ... (lógica de validación de cada fila)
          assetsToCreate.push({ /* ... datos del activo ... */ });
        });

        if (errors.length > 0) throw new Error(errors.join(' '));
        if (assetsToCreate.length === 0) throw new Error("El archivo no contiene filas con datos válidos.");

        // Envía los activos validados al servicio para la carga en lote.
        await addAssetsInBatch(assetsToCreate);
        toast({ title: "Carga Exitosa", description: `${assetsToCreate.length} activos han sido agregados.` });
        await fetchAllData();

      } catch (error: any) {
        console.error("Error en la carga masiva:", error);
        toast({ variant: "destructive", title: "Error en la Carga", description: error.message });
      }
    };
    reader.readAsArrayBuffer(bulkFile);
  };

  // --- Renderizado del Componente ---
  if (loading || !userData) {
    return <div>Cargando...</div>;
  }
  
  return (
    <>
      <h1 className="text-lg font-semibold md:text-2xl mb-4">Panel de Logística</h1>
      {/* Sistema de pestañas para organizar las diferentes funciones de logística. */}
      <Tabs defaultValue="add-assets" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="add-assets">Ingreso de Activos</TabsTrigger>
          <TabsTrigger value="assignments">Solicitudes de Asignación <Badge className="ml-2">{assignmentRequests.length}</Badge></TabsTrigger>
          <TabsTrigger value="devolutions">Procesos de Devolución <Badge className="ml-2">{devolutionProcesses.length}</Badge></TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>

        {/* Pestaña para Ingreso de Activos */}
        <TabsContent value="add-assets">
          {/* ... (código del formulario de ingreso manual y carga masiva) ... */}
        </TabsContent>

        {/* Pestaña para Solicitudes de Asignación */}
        <TabsContent value="assignments">
          {/* ... (código de la tabla de solicitudes de asignación) ... */}
        </TabsContent>

        {/* Pestaña para Procesos de Devolución */}
        <TabsContent value="devolutions">
          {/* ... (código del acordeón de procesos de devolución) ... */}
        </TabsContent>

        {/* Pestaña para Historial */}
        <TabsContent value="history">
          {/* ... (código de la tabla de historial de solicitudes) ... */}
        </TabsContent>
      </Tabs>

      {/* --- Diálogos (Modales) --- */}

      {/* Diálogo para procesar o reintentar un envío. */}
      <Dialog open={showProcessModal} onOpenChange={setShowProcessModal}>
        {/* ... (código del diálogo de proceso de envío) ... */}
      </Dialog>

      {/* Diálogo para resolver una solicitud rechazada. */}
      <Dialog open={showRejectionModal} onOpenChange={setShowRejectionModal}>
        {/* ... (código del diálogo de resolución de rechazo) ... */}
      </Dialog>
    </>
  );
}
