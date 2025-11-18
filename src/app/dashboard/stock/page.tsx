'use client';

// Importación de hooks y componentes necesarios de React y Next.js
import { useEffect, useState, useCallback, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
// Importación de contextos y servicios personalizados
import { useAuth } from '@/contexts/AuthContext';
import { getStockAssets, updateAsset, deleteAsset, getAssetById } from '@/lib/services';
import { Asset, AssetHistoryEvent } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
// Importación de componentes de la interfaz de usuario (UI)
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Pencil, Trash2, History } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImagePreviewModal } from "@/components/ui/ImagePreviewModal";
import { formatFirebaseTimestamp } from "@/lib/utils";
// Importación de la librería para manejar archivos Excel
import * as XLSX from 'xlsx';

// Función auxiliar para formatear el tipo de activo para su visualización
const formatAssetType = (type: string) => {
  if (!type) return 'N/A'; // Verificación defensiva para tipos no definidos
  // Reemplaza guiones bajos por espacios y capitaliza la primera letra de cada palabra
  return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

// Componente principal de la página de Stock
export default function StockPage() {
  // Hook para obtener datos de autenticación y estado de carga
  const { userData, loading } = useAuth();
  // Hook para la navegación
  const router = useRouter();
  // Hook para mostrar notificaciones (toasts)
  const { toast } = useToast();
  // Estado para almacenar el inventario de activos
  const [inventory, setInventory] = useState<Asset[]>([]);
  
  // Estados para controlar los modales de edición y eliminación
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  // Estado para el activo seleccionado en los modales
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  // Estado para los datos del formulario de edición
  const [editFormData, setEditFormData] = useState<Partial<Asset>>({});

  // Estados para el historial del activo
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [assetHistory, setAssetHistory] = useState<AssetHistoryEvent[]>([]);
  const [historyAsset, setHistoryAsset] = useState<Asset | null>(null);
  const [imageToPreview, setImageToPreview] = useState<string | null>(null);

  // Función para obtener el inventario desde el backend, usando useCallback para memorizarla
  const fetchInventory = useCallback(async () => {
    if (!userData) return; // No hacer nada si no hay datos del usuario
    try {
      // Llama al servicio para obtener los activos según el rol del usuario
      const assets = await getStockAssets(userData.role);
      setInventory(assets); // Actualiza el estado del inventario
    } catch (error) {
      console.error("Error fetching inventory:", error);
      // Muestra una notificación de error si falla la carga
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar el inventario.' });
    }
  }, [userData, toast]); // Dependencias de la función

  // useEffect para cargar el inventario cuando los datos del usuario están disponibles
  useEffect(() => {
    if (userData) {
      fetchInventory();
    }
  }, [userData, fetchInventory]); // Se ejecuta cuando userData o fetchInventory cambian

  // Manejador para descargar el inventario en formato Excel
  const handleDownloadExcel = () => {
    // Mapea los datos del inventario al formato deseado para la exportación
    const dataToExport = inventory.map(asset => ({
      'Referencia': asset.reference || 'N/A',
      'Descripción': asset.name,
      'Serial': asset.serial || 'N/A',
      'Tipo de Activo': formatAssetType(asset.tipo),
      'Estado': asset.status,
      'Stock': asset.stock || 0,
      'Ubicación': asset.location || 'N/A',
      'Asignado a': asset.employeeName || 'N/A',
    }));

    // Crea una hoja de cálculo y un libro de trabajo con los datos
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario');
    // Descarga el archivo Excel
    XLSX.writeFile(workbook, 'InventarioGeneral.xlsx');
  };

  // --- Manejadores de CRUD (Crear, Leer, Actualizar, Eliminar) ---

  // Abre el modal de edición y carga los datos del activo seleccionado
  const handleOpenEditModal = (asset: Asset) => {
    setSelectedAsset(asset);
    setEditFormData({
      name: asset.name,
      reference: asset.reference,
      serial: asset.serial,
      location: asset.location,
      stock: asset.stock,
      tipo: asset.tipo,
      status: asset.status,
    });
    setIsEditModalOpen(true);
  };

  // Maneja la actualización de un activo
  const handleUpdateAsset = async (e: FormEvent) => {
    e.preventDefault(); // Previene el comportamiento por defecto del formulario
    if (!selectedAsset) return;

    try {
      const updatedData = { ...editFormData };
      // Asegura que el stock sea un número
      if (typeof updatedData.stock === 'string') {
        updatedData.stock = parseInt(updatedData.stock, 10) || 0;
      }

      // Llama al servicio para actualizar el activo en la base de datos
      await updateAsset(selectedAsset.id, updatedData);
      toast({ title: 'Éxito', description: 'Activo actualizado correctamente.' });
      setIsEditModalOpen(false); // Cierra el modal
      fetchInventory(); // Refresca la lista de inventario
    } catch (error: any) {
      console.error("Error updating asset:", error);
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'No se pudo actualizar el activo.' });
    }
  };

  // Abre el modal de confirmación para eliminar un activo
  const handleOpenDeleteModal = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsDeleteModalOpen(true);
  };

  // Maneja la eliminación de un activo
  const handleDeleteAsset = async () => {
    if (!selectedAsset) return;

    try {
      // Llama al servicio para eliminar el activo
      await deleteAsset(selectedAsset.id);
      toast({ title: 'Éxito', description: 'Activo eliminado correctamente.' });
      setIsDeleteModalOpen(false); // Cierra el modal
      fetchInventory(); // Refresca la lista de inventario
    } catch (error: any) {
      console.error("Error deleting asset:", error);
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'No se pudo eliminar el activo.' });
    }
  };
  
  // Maneja los cambios en los campos del formulario de edición
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setEditFormData(prev => ({ ...prev, [id]: value }));
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

  // Muestra un mensaje de carga mientras se obtienen los datos del usuario
  if (loading || !userData) {
    return <div>Cargando...</div>;
  }

  // Muestra un mensaje de acceso no autorizado si el rol no es 'master' o 'logistica'
  if (!userData.role.startsWith('master') && userData.role !== 'logistica') {
    return <div>Acceso no autorizado.</div>;
  }

  // Renderizado del componente
  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Inventario General</CardTitle>
            <CardDescription>Una vista completa de todos los activos en el sistema.</CardDescription>
          </div>
          <Button onClick={handleDownloadExcel} disabled={inventory.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Descargar Excel
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referencia</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Serial</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Asignado a</TableHead>
                {(userData.role.startsWith('master') || userData.role === 'logistica') && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.length > 0 ? (
                // Mapea y renderiza cada activo en una fila de la tabla
                inventory.map(asset => (
                  <TableRow key={asset.id}>
                    <TableCell>{asset.reference || 'N/A'}</TableCell>
                    <TableCell className="font-medium">{asset.name}</TableCell>
                    <TableCell>{formatAssetType(asset.tipo)}</TableCell>
                    <TableCell>{asset.serial || 'N/A'}</TableCell>
                    <TableCell><Badge variant="outline">{asset.status}</Badge></TableCell>
                    <TableCell>{asset.stock || 0}</TableCell>
                    <TableCell>{asset.location || 'N/A'}</TableCell>
                    <TableCell>{asset.employeeName || 'N/A'}</TableCell>
                    {(userData.role.startsWith('master') || userData.role === 'logistica') && (
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleShowHistory(asset.id)}>
                          <History className="h-4 w-4" />
                        </Button>
                        {userData.role.startsWith('master') && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => handleOpenEditModal(asset)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleOpenDeleteModal(asset)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                // Muestra un mensaje si no hay activos en el inventario
                <TableRow>
                  <TableCell colSpan={9} className="text-center">No hay activos en el inventario.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal de Edición */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Activo</DialogTitle>
            <DialogDescription>Modifique los detalles del activo. Haga clic en guardar para aplicar los cambios.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateAsset} className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reference">Referencia</Label>
              <Input id="reference" value={editFormData.reference || ''} onChange={handleFormChange} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Descripción</Label>
              <Input id="name" value={editFormData.name || ''} onChange={handleFormChange} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="serial">Serial</Label>
              <Input id="serial" value={editFormData.serial || ''} onChange={handleFormChange} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">Ubicación</Label>
              <Input id="location" value={editFormData.location || ''} onChange={handleFormChange} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="stock">Stock</Label>
              <Input id="stock" type="number" value={editFormData.stock || 0} onChange={handleFormChange} />
            </div>
            {/* TODO: Añadir campos de selección para 'tipo' y 'status' si deben ser editables */}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button>
              <Button type="submit">Guardar Cambios</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmación de Eliminación */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Está seguro?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. El activo "{selectedAsset?.name}" será eliminado permanentemente de la base de datos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteAsset}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para ver historial de activo */}
      {imageToPreview && (
        <ImagePreviewModal imageUrl={imageToPreview} onClose={() => setImageToPreview(null)} />
      )}
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
                  const imageUrl = parts.length > 1 ? parts[1] : null;

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
    </>
  );
}
